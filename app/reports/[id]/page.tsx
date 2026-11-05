import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getReport } from "@/lib/reports";
import { ReportView } from "../report-view";

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
  if (!report) notFound();
  return <ReportView report={report} />;
}
