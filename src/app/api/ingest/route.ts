import { updateStore, ingestSpeedContracts, computeStats, computeReceivables, computeWorkload } from "@/lib/live-store";

export const dynamic = "force-dynamic";

// Simple GET endpoint that accepts data as a query param (for easy cross-origin use)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dataParam = url.searchParams.get("data");

  if (!dataParam) {
    return new Response(`
      <html><body>
        <h2>Speed ERP Data Receiver</h2>
        <p>Waiting for data... Use window.postMessage or the form below.</p>
        <textarea id="input" rows="10" cols="80" placeholder="Paste JSON contracts here"></textarea>
        <br><button onclick="submitData()">Load Data</button>
        <pre id="result"></pre>
        <script>
          // Listen for postMessage from other tabs/windows
          window.addEventListener('message', async (e) => {
            if (e.data && e.data.contracts) {
              const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(e.data)
              });
              const result = await res.json();
              document.getElementById('result').textContent = JSON.stringify(result.meta || result, null, 2);
              document.title = 'LOADED:' + (result.ingested || 0);
            }
          });

          async function submitData() {
            const raw = document.getElementById('input').value;
            try {
              const parsed = JSON.parse(raw);
              const contracts = parsed.contracts || parsed;
              const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contracts: Array.isArray(contracts) ? contracts : [contracts] })
              });
              const result = await res.json();
              document.getElementById('result').textContent = JSON.stringify(result.meta || result, null, 2);
              document.title = 'LOADED:' + (result.ingested || 0);
            } catch(e) {
              document.getElementById('result').textContent = 'Error: ' + e.message;
            }
          }
        </script>
      </body></html>
    `, { headers: { "Content-Type": "text/html", "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(dataParam));
    const contracts = Array.isArray(parsed) ? parsed : parsed.contracts || [parsed];
    const ingested = ingestSpeedContracts(contracts);
    const store = updateStore(ingested);

    return Response.json({
      success: true,
      ingested: ingested.length,
      meta: { source: store.source, lastScraped: store.lastScraped, contractCount: store.contracts.length }
    }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
}
