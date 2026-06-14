import { parseExcelFile } from "@/lib/excel-parser";
import { upsertContracts } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "due_to_close_today";

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const contracts = parseExcelFile(buffer, category);

    if (contracts.length === 0) {
      return Response.json(
        { error: "No valid contracts found in file. Check column headers." },
        { status: 400 }
      );
    }

    const batchId = `upload_${Date.now()}`;
    const result = await upsertContracts(contracts, batchId, file.name, category);

    return Response.json({
      success: true,
      filename: file.name,
      category,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
