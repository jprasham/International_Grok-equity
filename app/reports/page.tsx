import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusChip } from "@/components/status-chip";
import { listReports } from "@/lib/reports";

export const metadata: Metadata = { title: "Reports | Ticker Research" };

export default function ReportsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-8">
      <h1 className="text-4xl font-bold text-primary">/reports</h1>
      <Suspense fallback={<p className="mt-4 text-muted-foreground">Loading reports…</p>}>
        <ReportList />
      </Suspense>
    </main>
  );
}

async function ReportList() {
  const reports = await listReports();
  if (!reports.length) {
    return <p className="mt-4 text-muted-foreground">0 reports found.</p>;
  }
  return (
    <ul className="mt-6 divide-y border">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/reports/${report.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-card"
          >
            <span className="font-bold text-primary">{report.ticker}</span>
            <span className="text-sm text-muted-foreground">{report.exchange}</span>
            <time className="flex-1 text-sm text-muted-foreground">
              {new Date(report.requested_at).toISOString().slice(0, 16).replace("T", " ")} UTC
            </time>
            <StatusChip status={report.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
