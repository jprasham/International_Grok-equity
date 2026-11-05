import type { Metadata } from "next";
import { ReportLoader } from "../report-loader";

export const metadata: Metadata = { title: "Report | Ticker Research" };

export default function ReportPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-8">
      <ReportLoader />
    </main>
  );
}
