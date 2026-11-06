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

  // Already finished (or on another instance): return the current row.
  return Response.json(stopped ?? existing);
}
