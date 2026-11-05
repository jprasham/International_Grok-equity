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
// ponytail: per-process memory, lost on restart and not shared between instances
// (see README). Move to a shared store if callbacks start returning 404.
const globals = globalThis as typeof globalThis & { tickerReports?: Map<string, Report> };
const reports = (globals.tickerReports ??= new Map<string, Report>());

// Bots that never call back would otherwise leak entries forever.
const MAX_TRACKED = 20;

export function createReport(ticker: string, exchange: string) {
  const report: Report = {
    id: crypto.randomUUID(),
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
  reports.set(report.id, report);
  if (reports.size > MAX_TRACKED) {
    // Map iterates oldest first. The last done report is never the one evicted.
    const oldest = [...reports.values()].find((row) => row.status !== "done");
    if (oldest) reports.delete(oldest.id);
  }
  return report;
}

export async function getReport(id: string): Promise<Report | null> {
  await connection();
  return reports.get(id) ?? null;
}

// The last completed report, or the newest request if nothing has completed yet.
export async function getLatestReport(): Promise<Report | null> {
  await connection();
  const rows = [...reports.values()];
  return rows.find((row) => row.status === "done") ?? rows.at(-1) ?? null;
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
  // Only one completed report is kept: a new one replaces the previous one.
  if (status === "done") {
    for (const other of reports.values()) {
      if (other.status === "done") reports.delete(other.id);
    }
  }
  reports.set(id, updated);
  return updated;
}
