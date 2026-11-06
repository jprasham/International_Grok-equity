"use client";

import { useEffect, useRef, useState } from "react";
import { PageBody, PageHero } from "@/components/terminal";
import { Card, CardContent } from "@/components/ui/card";
import type { Report } from "@/lib/reports";
import { ReportView } from "./report-view";

// Fetches in the browser only: the prerendered shell has no dynamic hole to strand, and
// ReportView (DOMPurify needs a real DOM) never renders on the server, as report starts null.
export function ReportLoader({ latest = false }: { latest?: boolean }) {
  const [report, setReport] = useState<Report | null>(null);
  const [checked, setChecked] = useState(false);
  const stopPolling = useRef<(() => void) | null>(null);

  useEffect(() => {
    // ponytail: read from the URL, because useParams would suspend and put a hole back.
    const url = latest ? "/api/reports" : `/api/reports/${location.pathname.split("/").pop()}`;
    let active = true;

    async function load() {
      // A 404 or network error keeps the last status: another instance may hold this report.
      const next: Report | undefined = await fetch(url, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : undefined))
        .then((data) => (latest ? data?.[0] : data))
        .catch(() => undefined);
      if (!active) return;
      if (next) setReport(next);
      setChecked(true);
      if (next?.status === "done" || next?.status === "failed") stop();
    }

    const timer = setInterval(load, 10_000);
    function stop() {
      active = false;
      clearInterval(timer);
      stopPolling.current = null;
    }
    stopPolling.current = stop;
    load();
    return stop;
  }, [latest]);

  function applyReport(next: Report) {
    setReport(next);
    if (next.status === "done" || next.status === "failed") stopPolling.current?.();
  }

  if (report) return <ReportView report={report} onReport={applyReport} />;
  return (
    <>
      <PageHero
        eyebrow="Market desk"
        title={latest ? "Latest report." : "Report."}
        sub="Only the latest completed report is kept"
      />
      <PageBody>
        <Card className="border-border-soft">
          <CardContent className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-live/70 motion-safe:animate-signal-pulse"
            />
            <p role="status" className="text-muted-foreground">
              {!checked
                ? "Loading report…"
                : latest
                  ? "No report yet. This page checks again every 10 seconds."
                  : "Report not available yet. This page checks again every 10 seconds. Only the latest completed report is kept, so an older one won't come back."}
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
