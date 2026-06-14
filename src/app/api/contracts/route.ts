import { getStore, updateStore, ingestSpeedContracts, computeStats, computeReceivables, computeWorkload, resetToSample } from "@/lib/live-store";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const store = getStore();
  const stats = computeStats(store.contracts);
  const receivables = computeReceivables(store.contracts);
  const workload = computeWorkload(store.contracts, store.tasks);

  return Response.json({
    contracts: store.contracts,
    tasks: store.tasks,
    escalations: store.escalations,
    timeline: store.timeline,
    stats,
    receivables,
    workload,
    meta: {
      source: store.source,
      lastScraped: store.lastScraped,
      contractCount: store.contracts.length,
    },
  }, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "reset") {
      resetToSample();
      return Response.json({ success: true, message: "Reset to sample data" }, { headers: corsHeaders });
    }

    if (!body.contracts || !Array.isArray(body.contracts)) {
      return Response.json({ error: "Missing contracts array" }, { status: 400, headers: corsHeaders });
    }

    // Check if contracts are already processed (have camelCase fields like customerName)
    // vs raw Speed ERP data (has snake_case fields like customer_name)
    const first = body.contracts[0] || {};
    const isProcessed = first.customerName !== undefined || first.vehiclePlate !== undefined;
    const contracts = isProcessed ? body.contracts : ingestSpeedContracts(body.contracts);
    const store = updateStore(contracts);
    const stats = computeStats(store.contracts);
    const receivables = computeReceivables(store.contracts);
    const workload = computeWorkload(store.contracts, store.tasks);

    return Response.json({
      success: true,
      ingested: contracts.length,
      contracts: store.contracts,
      tasks: store.tasks,
      escalations: store.escalations,
      timeline: store.timeline,
      stats,
      receivables,
      workload,
      meta: {
        source: store.source,
        lastScraped: store.lastScraped,
        contractCount: store.contracts.length,
      },
    }, { headers: corsHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
