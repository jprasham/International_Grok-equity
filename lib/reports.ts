import { get, put } from "@vercel/blob";
import { connection } from "next/server";

export type ReportStatus = "pending" | "researching" | "done" | "failed";

export type Report = {
  id: string;
  ticker: string;
  exchange: string;
  status: ReportStatus;
  requested_at: string;
  completed_at: string | null;
  report_url: string | null;
  report_html: string | null;
  report_json: unknown;
  error: string | null;
};

type Patch = { status: ReportStatus } & Partial<
  Pick<Report, "report_url" | "report_html" | "report_json" | "error">
>;

// Pages and route handlers can load separate copies of this module, so the Map
// lives on globalThis to give them one store per process.
// ponytail: only the last completed report survives across instances (Blob). In-flight
// rows stay per-process; move to a real database if history or shared progress matters.
const globals = globalThis as typeof globalThis & { tickerReports?: Map<string, Report> };
const reports = (globals.tickerReports ??= new Map<string, Report>());

// Bots that never call back would otherwise leak entries forever.
const MAX_TRACKED = 20;
const LAST_REPORT_PATH = "ticker-research/last-report.json";

function newReport(id: string, ticker: string, exchange: string): Report {
  return {
    id,
    ticker,
    exchange,
    status: "pending",
    requested_at: new Date().toISOString(),
    completed_at: null,
    report_url: null,
    report_html: null,
    report_json: null,
    error: null,
  };
}

function track(row: Report) {
  // Only one completed report is kept: a new one replaces the previous one.
  if (row.status === "done") {
    for (const other of reports.values()) {
      if (other.status === "done") reports.delete(other.id);
    }
  }
  reports.set(row.id, row);
  if (reports.size > MAX_TRACKED) {
    // Map iterates oldest first. The last done report is never the one evicted.
    const oldest = [...reports.values()].find((other) => other.status !== "done");
    if (oldest) reports.delete(oldest.id);
  }
}

// A connected store provides one or the other, depending on how it was connected.
const hasBlobStore = () => process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID;

// Without a store or on a read error, reports just stay per-instance.
async function readLastReport(): Promise<Report | null> {
  if (!hasBlobStore()) return null;
  try {
    // useCache false: the pathname is overwritten, so a CDN copy can be stale.
    const blob = await get(LAST_REPORT_PATH, { access: "private", useCache: false });
    return blob?.statusCode === 200 ? await new Response(blob.stream).json() : null;
  } catch (error) {
    console.error("Reading the last report from Blob failed", error);
    return null;
  }
}

async function saveLastReport(report: Report) {
  if (!hasBlobStore()) return;
  await put(LAST_REPORT_PATH, JSON.stringify(report), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// Memory alone can't be trusted: another instance may have finished this report,
// or a newer one, since this instance last touched its copy.
const newer = (a: Report | null | undefined, b: Report | null) =>
  (b?.completed_at ?? "") > (a?.completed_at ?? "") ? b : (a ?? null);

export function createReport(ticker: string, exchange: string) {
  const report = newReport(crypto.randomUUID(), ticker, exchange);
  track(report);
  return report;
}

export async function getReport(id: string): Promise<Report | null> {
  await connection();
  const row = reports.get(id);
  if (row?.status === "done") return row;
  const last = await readLastReport();
  return last?.id === id ? newer(row, last) : (row ?? null);
}

// The last completed report, or the newest request if nothing has completed yet.
export async function getLatestReport(): Promise<Report | null> {
  await connection();
  const rows = [...reports.values()];
  const done = rows.find((row) => row.status === "done");
  return newer(done, await readLastReport()) ?? rows.at(-1) ?? null;
}

// For bot callbacks, which may land on an instance that never saw the request.
// Throws if a done report can't be persisted, so the bot can retry.
export async function upsertReport(
  id: string,
  { ticker, exchange, ...patch }: Patch & { ticker?: string; exchange?: string },
  onlyFrom?: ReportStatus[],
): Promise<Report> {
  const base = (await getReport(id)) ?? newReport(id, "Unknown", "NSE");
  const row = { ...base, ticker: ticker ?? base.ticker, exchange: exchange ?? base.exchange };
  track(row);
  const updated = updateReport(id, patch, onlyFrom) ?? row;
  if (patch.status === "done") await saveLastReport(updated);
  return updated;
}

// Returns the updated row, or null if the id is unknown or the current status
// isn't in onlyFrom. Omitted report fields keep their value; error always resets.
export function updateReport(
  id: string,
  { status, report_url = null, report_html = null, report_json = null, error = null }: Patch,
  onlyFrom?: ReportStatus[],
): Report | null {
  const row = reports.get(id);
  if (!row || (onlyFrom && !onlyFrom.includes(row.status))) return null;
  const updated: Report = {
    ...row,
    status,
    report_url: report_url ?? row.report_url,
    report_html: report_html ?? row.report_html,
    report_json: report_json ?? row.report_json,
    error,
    completed_at: status === "done" || status === "failed" ? new Date().toISOString() : null,
  };
  track(updated);
  return updated;
}
