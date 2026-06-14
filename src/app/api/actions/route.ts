import {
  updateCallStatus,
  updateWhatsappStatus,
  updateActionTaken,
  addNote,
  type ContractRow,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractId, action, value } = body;

    if (!contractId || !action) {
      return Response.json(
        { error: "Missing contractId or action" },
        { status: 400 }
      );
    }

    switch (action) {
      case "call_status":
        await updateCallStatus(contractId, value as ContractRow["call_status"]);
        break;
      case "whatsapp_status":
        await updateWhatsappStatus(contractId, value as ContractRow["whatsapp_status"]);
        break;
      case "action_taken":
        await updateActionTaken(contractId, value as ContractRow["action_taken"]);
        break;
      case "note":
        await addNote(contractId, value);
        break;
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json({ success: true, contractId, action, value });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Action failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
