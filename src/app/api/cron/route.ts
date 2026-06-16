import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily 4 AM cron job to scrape Speed ERP data.
 * This endpoint is triggered by Vercel Cron (see vercel.json).
 *
 * Flow:
 * 1. Login to Speed ERP and fetch contract data
 * 2. Parse the response
 * 3. Upsert into Supabase
 *
 * Requires env vars:
 * - SPEED_ERP_URL
 * - SPEED_ERP_EMAIL
 * - SPEED_ERP_PASSWORD
 * - CRON_SECRET (to verify the request is from Vercel Cron)
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const erpUrl = process.env.SPEED_ERP_URL;
  const erpEmail = process.env.SPEED_ERP_EMAIL;
  const erpPassword = process.env.SPEED_ERP_PASSWORD;

  if (!erpUrl || !erpEmail || !erpPassword) {
    return NextResponse.json(
      { error: "Missing Speed ERP credentials in environment variables" },
      { status: 500 }
    );
  }

  try {
    // Step 0: Transition stale categories (yesterday's "due today" → "overdue")
    const { transitionStaleCategories } = await import("@/lib/supabase");
    const transition = await transitionStaleCategories();
    console.log(`[cron] Category transition: ${transition.demoted} → overdue, ${transition.promoted} → due today`);

    // Step 1: Login to Speed ERP
    const loginRes = await fetch(`${erpUrl}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usr: erpEmail, pwd: erpPassword }),
    });

    if (!loginRes.ok) {
      return NextResponse.json(
        { error: `ERP login failed: ${loginRes.status}` },
        { status: 502 }
      );
    }

    const cookies = loginRes.headers.get("set-cookie") || "";

    // Step 2: Fetch "Due To Close Today" contracts
    const dueRes = await fetch(
      `${erpUrl}/api/resource/Rental Agreement?filters=[["status","=","Active"],["expected_end_date","=","Today"]]&fields=["*"]&limit_page_length=500`,
      { headers: { Cookie: cookies } }
    );

    // Step 3: Fetch "Overdue" contracts
    const overdueRes = await fetch(
      `${erpUrl}/api/resource/Rental Agreement?filters=[["status","=","Active"],["expected_end_date","<","Today"]]&fields=["*"]&limit_page_length=500`,
      { headers: { Cookie: cookies } }
    );

    const dueData = dueRes.ok ? await dueRes.json() : { data: [] };
    const overdueData = overdueRes.ok ? await overdueRes.json() : { data: [] };

    const dueContracts = (dueData.data || []).length;
    const overdueContracts = (overdueData.data || []).length;

    // Step 4: Transform and upsert via upload API
    const allContracts = [
      ...(dueData.data || []).map((c: Record<string, unknown>) => ({
        ...c,
        _category: "due_to_close_today",
      })),
      ...(overdueData.data || []).map((c: Record<string, unknown>) => ({
        ...c,
        _category: "over_due_closing",
      })),
    ];

    // Upsert to Supabase
    if (allContracts.length > 0) {
      const { upsertContracts } = await import("@/lib/supabase");
      const mapped = allContracts.map((c: Record<string, unknown>) => ({
        agreement_no: (c.name as string) || "",
        contract_type: (c.rental_type as string) || "",
        vehicle_no: (c.vehicle_no as string) || "",
        make_model: (c.make_model as string) || "",
        customer_name: (c.customer_name as string) || "",
        contact_number: (c.contact_number as string) || "",
        customer_email: (c.customer_email as string) || "",
        sales_person: (c.sales_person as string) || "",
        start_date: (c.start_date as string) || null,
        end_date: (c.expected_end_date as string) || null,
        branch: (c.branch as string) || "",
        daily_rate: Number(c.daily_rate) || 0,
        total_amount: Number(c.total_amount) || 0,
        outstanding_amount: Number(c.outstanding_amount) || 0,
        deposit_amount: Number(c.deposit) || 0,
        category: c._category as string,
      }));
      const batchId = `cron-${new Date().toISOString().slice(0, 10)}`;
      await upsertContracts(mapped, batchId, "speed-erp-cron", "auto_scrape");
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dueToday: dueContracts,
      overdue: overdueContracts,
      totalUpserted: allContracts.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Cron job failed: ${message}` },
      { status: 500 }
    );
  }
}
