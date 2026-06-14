import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractId, phone, customerName, templateName } = body;

    if (!contractId || !phone || !customerName) {
      return Response.json(
        { error: "Missing required fields: contractId, phone, customerName" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GALLABOX_API_KEY;
    const apiSecret = process.env.GALLABOX_API_SECRET;
    const channelId = process.env.GALLABOX_CHANNEL_ID;

    if (!apiKey || !apiSecret || !channelId) {
      return Response.json(
        { error: "GallaBox API credentials not configured" },
        { status: 500 }
      );
    }

    // Clean phone number: remove spaces, ensure country code
    let cleanPhone = phone.replace(/[\s\-()]/g, "");
    if (!cleanPhone.startsWith("+")) {
      // Default to UAE country code if no prefix
      cleanPhone = cleanPhone.startsWith("971")
        ? `+${cleanPhone}`
        : `+971${cleanPhone}`;
    }

    const template = templateName || "contract_reminder";

    const gallaboxResponse = await fetch(
      "https://server.gallabox.com/devapi/messages/whatsapp",
      {
        method: "POST",
        headers: {
          apiKey,
          apiSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId,
          channelType: "whatsapp",
          recipient: {
            name: customerName,
            phone: cleanPhone,
          },
          whatsapp: {
            type: "template",
            template: {
              templateName: template,
              bodyValues: {
                name: customerName,
              },
            },
          },
        }),
      }
    );

    if (!gallaboxResponse.ok) {
      const errorText = await gallaboxResponse.text();
      console.error("GallaBox API error:", errorText);
      return Response.json(
        { error: `GallaBox API error: ${gallaboxResponse.status}` },
        { status: 502 }
      );
    }

    // Update contract whatsapp_status to "sent"
    const { data: current } = await supabase
      .from("contracts")
      .select("whatsapp_status, agreement_no")
      .eq("id", contractId)
      .single();

    await supabase
      .from("contracts")
      .update({
        whatsapp_status: "sent",
        last_updated: new Date().toISOString(),
      })
      .eq("id", contractId);

    // Log the action
    await supabase.from("action_log").insert({
      contract_id: contractId,
      agreement_no: current?.agreement_no,
      action_type: "whatsapp_sent",
      old_value: current?.whatsapp_status,
      new_value: "sent",
    });

    return Response.json({
      success: true,
      contractId,
      phone: cleanPhone,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "WhatsApp send failed";
    console.error("WhatsApp send error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
