import type { Metadata } from "next";
import { ReportLoader } from "../report-loader";

export const metadata: Metadata = { title: "Report | Ticker Research" };

export default function ReportPage() {
  return <ReportLoader />;
}
