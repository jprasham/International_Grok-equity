import { notFound } from "next/navigation";
import { DlReportView } from "@/components/dl-report/dl-report-view";
import { PageBody } from "@/components/terminal";
import hfcl from "@/fixtures/hfcl-v1.json";
import hfclV11 from "@/fixtures/hfcl-v1.1.json";
import olectra from "@/fixtures/olectra-v1.json";
import xssProbe from "@/fixtures/xss-probe-v1.json";
import { parseDlEquityReport } from "@/lib/dl-equity-report-v1.1";

const FIXTURES: Record<string, unknown> = { olectra, hfcl, "hfcl-v1.1": hfclV11, "xss-probe": xssProbe };

export function generateStaticParams() {
  return Object.keys(FIXTURES).map((fixture) => ({ fixture }));
}

export default async function DlReportFixturePage({ params }: PageProps<"/dev/dl-report/[fixture]">) {
  const { fixture } = await params;
  if (process.env.NODE_ENV === "production" || !Object.hasOwn(FIXTURES, fixture)) notFound();

  const parsed = parseDlEquityReport(FIXTURES[fixture]);
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  return (
    <PageBody>
      <DlReportView report={parsed.data} />
    </PageBody>
  );
}
