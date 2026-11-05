import type { Metadata } from "next";
import { Suspense } from "react";
import { getReport } from "@/lib/reports";
import { ReportView } from "../report-view";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "Report | Ticker Research" };

export default function ReportPage({ params }: PageProps<"/reports/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-8">
      <Suspense fallback={<p className="text-muted-foreground">Loading report…</p>}>
        <ReportById params={params} />
      </Suspense>
    </main>
  );
}

async function ReportById({ params }: { params: Promise<{ id: string }> }) {
  const report = await getReport((await params).id);
  if (report) return <ReportView report={report} />;
  // This request may have reached an instance that doesn't hold the in-flight report,
  // so keep polling until the finished one shows up in shared storage.
  return (
    <p role="status" className="text-muted-foreground">
      Report not available yet. This page checks again every 10 seconds. Only the latest
      completed report is kept, so an older one won&apos;t come back.
      <AutoRefresh />
    </p>
  );
}
