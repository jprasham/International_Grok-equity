import { createHash, timingSafeEqual } from "node:crypto";
import { getReport, updateReport } from "@/lib/reports";

const NOT_FOUND = () => Response.json({ error: "Report not found." }, { status: 404 });
const sha256 = (text: string) => createHash("sha256").update(text).digest();
const isOptionalString = (value: unknown) => value == null || typeof value === "string";

// Hashing gives equal-length buffers, which timingSafeEqual requires, and hides the
// secret's length. No configured secret means every callback is refused.
function isAuthorized(request: Request) {
  const secret = process.env.REPORT_CALLBACK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`));
}

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const report = await getReport((await ctx.params).id);
  return report ? Response.json(report) : NOT_FOUND();
}

export async function POST(request: Request, ctx: RouteContext<"/api/reports/[id]">) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const invalid = (error: string) => Response.json({ error }, { status: 400 });
  const { status, report_url, report_html, report_json, error } = body ?? {};

  if (status !== "researching" && status !== "done" && status !== "failed") {
    return invalid("status must be researching, done or failed.");
  }
  if (![report_url, report_html, error].every(isOptionalString)) {
    return invalid("report_url, report_html and error must be strings.");
  }
  // The URL ends up in an href and iframe src, so javascript: and friends stop here.
  if (report_url && !isHttpUrl(report_url)) {
    return invalid("report_url must be an http(s) URL.");
  }
  if (status === "done" && !report_url && !report_html && report_json == null) {
    return invalid("status done needs report_url, report_html or report_json.");
  }

  const { id } = await ctx.params;
  const report =
    (await updateReport(
      id,
      {
        status,
        report_url: report_url || null,
        report_html: report_html || null,
        report_json: report_json ?? null,
        error: error || null,
      },
      // A late or retried progress ping must not reopen a finished report.
      status === "researching" ? ["pending", "researching"] : undefined,
    )) ?? (await getReport(id));

  return report ? Response.json(report) : NOT_FOUND();
}
