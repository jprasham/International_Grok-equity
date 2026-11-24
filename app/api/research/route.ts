import { EXCHANGES, isExchange, TICKER_PATTERN } from "@/lib/ticker";
import { createReport, getReport, updateReport } from "@/lib/reports";

const TICKER = new RegExp(`^${TICKER_PATTERN}$`);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ticker =
    typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const exchange = body?.exchange;

  if (!TICKER.test(ticker) || !isExchange(exchange)) {
    return Response.json(
      { error: `Expected a valid ticker and an exchange of ${EXCHANGES.join(", ")}.` },
      { status: 400 },
    );
  }

  const { id } = createReport(ticker, exchange);
  const failure = await sendToBot(id, ticker, exchange);

  // onlyFrom pending: a fast bot may already have called back, and that result wins.
  const report =
    updateReport(
      id,
      failure ? { status: "failed", error: failure } : { status: "researching" },
      ["pending"],
    ) ?? (await getReport(id));

  return Response.json(
    { id, status: report?.status, error: report?.error ?? null },
    { status: 201 },
  );
}

// Resolves to an error message, or null once the bot has accepted the job.
async function sendToBot(id: string, ticker: string, exchange: string) {
  const webhookUrl = process.env.RESEARCH_WEBHOOK_URL;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const token = process.env.RESEARCH_WEBHOOK_TOKEN;
  if (!webhookUrl) return "RESEARCH_WEBHOOK_URL is not configured.";
  if (!appUrl) return "APP_URL is not configured.";

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        requestId: id,
        ticker,
        exchange,
        callbackUrl: `${appUrl}/api/reports/${id}`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? null : `Research webhook responded with HTTP ${res.status}.`;
  } catch (error) {
    // The row is publicly readable, so details like internal hosts stay in the server log.
    console.error("Research webhook request failed", error);
    return "Research webhook request failed or timed out.";
  }
}
