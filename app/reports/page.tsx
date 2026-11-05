import type { Metadata } from "next";
import { ReportLoader } from "./report-loader";

export const metadata: Metadata = { title: "Latest report | Ticker Research" };

export default function ReportsPage() {
  return <ReportLoader latest />;
}
