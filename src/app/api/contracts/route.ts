import { getContracts, getDashboardStats, getUploadHistory } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = {
      category: url.searchParams.get("category") || undefined,
      call_status: url.searchParams.get("call_status") || undefined,
      whatsapp_status: url.searchParams.get("whatsapp_status") || undefined,
      action_taken: url.searchParams.get("action_taken") || undefined,
      search: url.searchParams.get("search") || undefined,
    };

    const [contracts, stats, uploads] = await Promise.all([
      getContracts(filters),
      getDashboardStats(),
      getUploadHistory(),
    ]);

    return Response.json(
      { contracts, stats, uploads },
      { headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch data";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
