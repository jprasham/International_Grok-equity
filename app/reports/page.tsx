import type { Metadata } from "next";
import { Suspense } from "react";
import { getLatestReport } from "@/lib/reports";
import { ReportView } from "./report-view";

export const metadata: Metadata = { title: "Latest report | Ticker Research" };

export default function ReportsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-8">
      <Suspense fallback={<p className="text-muted-foreground">Loading report…</p>}>
        <LatestReport />
      </Suspense>
    </main>
  );
}

async function LatestReport() {
  const report = await getLatestReport();
  if (report) return <ReportView report={report} />;
  return (
    <>
      <h1 className="text-4xl font-bold text-primary">/reports</h1>
      <p className="mt-4 text-muted-foreground">No report yet.</p>
    </>
  );
}
