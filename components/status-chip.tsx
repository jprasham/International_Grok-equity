import type { ReportStatus } from "@/lib/reports";

const STYLES: Record<ReportStatus, string> = {
  pending: "text-muted-foreground",
  researching: "border-primary text-primary",
  done: "border-primary bg-primary text-primary-foreground",
  failed: "border-destructive text-destructive",
};

export function StatusChip({ status }: { status: ReportStatus }) {
  return (
    <span className={`border px-2 py-0.5 text-xs font-bold uppercase ${STYLES[status]}`}>
      {status}
    </span>
  );
}
