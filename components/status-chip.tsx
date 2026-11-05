import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/lib/reports";

const STYLES: Record<ReportStatus, string> = {
  pending: "border-border bg-transparent text-muted-foreground",
  researching: "border-live/35 bg-live/10 text-live",
  done: "border-live/35 bg-live/10 text-live",
  // No tint: it would take the dark theme's #e05252 below 4.5:1.
  failed: "border-destructive/40 bg-transparent text-destructive",
};

export function StatusChip({ status }: { status: ReportStatus }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-sm px-1.5 font-mono text-xs tracking-[0.08em] uppercase ${STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}
