import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { connection } from "next/server";

export type ReportStatus = "pending" | "researching" | "done" | "failed";

export type Report = {
  id: string;
  ticker: string;
  exchange: string;
  status: ReportStatus;
  requested_at: string | Date; // Date from Postgres, ISO string from the file store
  completed_at: string | Date | null;
  report_url: string | null;
  report_html: string | null;
  report_json: unknown;
  error: string | null;
};

type Patch = { status: ReportStatus } & Partial<
  Pick<Report, "report_url" | "report_html" | "report_json" | "error">
>;

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

// ponytail: one JSON file per report so writes to different reports can't clobber
// each other. Dev only: list is O(n) reads, and it fails loudly on Vercel's read-only disk.
const DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), ".data");
const dataFile = (id: string) => path.join(DATA_DIR, `${id}.json`);

// Guards every id lookup: Postgres would throw on a bad uuid, and the file store
// must never build a path from anything else.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readFromFile(id: string): Promise<Report | null> {
  const text = await readFile(dataFile(id), "utf8").catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return text === null ? null : JSON.parse(text);
}

export async function createReport(ticker: string, exchange: string) {
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
  if (sql) {
    await sql.query(
      "INSERT INTO reports (id, ticker, exchange, status, requested_at) VALUES ($1, $2, $3, $4, $5)",
      [report.id, ticker, exchange, report.status, report.requested_at],
    );
  } else {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(dataFile(report.id), JSON.stringify(report));
  }
  return report;
}

export async function getReport(id: string): Promise<Report | null> {
  await connection();
  if (!UUID.test(id)) return null;
  if (!sql) return readFromFile(id);
  const rows = await sql.query("SELECT * FROM reports WHERE id = $1", [id]);
  return (rows[0] as Report | undefined) ?? null;
}

// ponytail: no pagination, add LIMIT/cursor when the table outgrows one response.
export async function listReports(): Promise<Report[]> {
  await connection();
  if (sql) {
    const rows = await sql.query("SELECT * FROM reports ORDER BY requested_at DESC");
    return rows as Report[];
  }
  const names = await readdir(DATA_DIR).catch(() => []);
  const rows = await Promise.all(
    names
      .map((name) => name.replace(/\.json$/, ""))
      .filter((id) => UUID.test(id))
      .map(readFromFile),
  );
  return (rows.filter(Boolean) as Report[]).sort(
    (a, b) => +new Date(b.requested_at) - +new Date(a.requested_at),
  );
}

// Returns the updated row, or null if the id is unknown or the current status
// isn't in onlyFrom. Omitted report fields keep their value; error always resets.
export async function updateReport(
  id: string,
  { status, report_url = null, report_html = null, report_json = null, error = null }: Patch,
  onlyFrom?: ReportStatus[],
): Promise<Report | null> {
  if (!UUID.test(id)) return null;
  const completed_at =
    status === "done" || status === "failed" ? new Date().toISOString() : null;

  if (sql) {
    const rows = await sql.query(
      `UPDATE reports SET
         status = $2,
         report_url = COALESCE($3, report_url),
         report_html = COALESCE($4, report_html),
         report_json = COALESCE($5::jsonb, report_json),
         error = $6,
         completed_at = $7
       WHERE id = $1 AND ($8::text[] IS NULL OR status = ANY($8::text[]))
       RETURNING *`,
      [
        id,
        status,
        report_url,
        report_html,
        report_json === null ? null : JSON.stringify(report_json),
        error,
        completed_at,
        onlyFrom ?? null,
      ],
    );
    return (rows[0] as Report | undefined) ?? null;
  }

  const row = await readFromFile(id);
  if (!row || (onlyFrom && !onlyFrom.includes(row.status))) return null;
  const updated: Report = {
    ...row,
    status,
    report_url: report_url ?? row.report_url,
    report_html: report_html ?? row.report_html,
    report_json: report_json ?? row.report_json,
    error,
    completed_at,
  };
  await writeFile(dataFile(id), JSON.stringify(updated));
  return updated;
}
