import { getReport, updateReport } from "@/lib/reports";

const NOT_FOUND = () => Response.json({ error: "Report not found." }, { status: 404 });

// Public stop for the report page: UUIDs are already world-readable via GET.
// Only pending/researching rows can be stopped; finished reports are left alone.
export async function POST(_request: Request, ctx: RouteContext<"/api/reports/[id]/stop">) {
  const { id } = await ctx.params;
  const existing = await getReport(id);
  if (!existing) return NOT_FOUND();

  const stopped = updateReport(
    id,
    { status: "failed", error: "Stopped by user." },
    ["pending", "researching"],
  );

  if (stopped) await cancelBot(stopped.id, stopped.ticker, stopped.exchange);

  // Already finished (or on another instance): return the current row.
  return Response.json(stopped ?? existing);
}

// Best effort: the report is already stopped here, so a bot that can't be reached changes nothing.
// ponytail: one attempt, no retry. Without RESEARCH_CANCEL_URL the bot isn't told; it can poll GET callbackUrl instead.
async function cancelBot(requestId: string, ticker: string, exchange: string) {
  const url = process.env.RESEARCH_CANCEL_URL;
  const token = process.env.RESEARCH_WEBHOOK_TOKEN;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify({ action: "cancel", requestId, ticker, exchange }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error("Research cancel request failed", error);
  }
}
