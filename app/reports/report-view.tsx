"use client";

// Browser-only: without a DOM, DOMPurify returns its input unsanitized. Render this
// through ReportLoader, never on the server. (jsdom on the server crashes on Vercel.)
import DOMPurify from "dompurify";
import { ExternalLink, Square } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode, type SyntheticEvent } from "react";
import { GrokAttribution } from "@/components/grok-attribution";
import { StatusChip } from "@/components/status-chip";
import { DlReportView } from "@/components/dl-report/dl-report-view";
import { StructuredReportView } from "@/components/structured-report";
import { PageBody, PageHero, Section } from "@/components/terminal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isDlEquityReportPayload, parseDlEquityReport } from "@/lib/dl-equity-report-v1.1";
import type { Report } from "@/lib/reports";
import { parseStructuredReport } from "@/lib/report-schema";
import { ReportActions } from "./report-actions";

export function ReportView({
  report,
  onReport,
}: {
  report: Report;
  onReport?: (report: Report) => void;
}) {
  const inFlight = report.status === "pending" || report.status === "researching";
  const heroSub =
    report.status === "pending"
      ? `${report.exchange} · ${report.ticker} is queued`
      : report.status === "researching"
        ? `${report.exchange} · Research in process`
        : `${report.exchange} · ${isDlEquityReportPayload(report.report_json) ? "Equity research" : "Market Pulse"}`;

  return (
    <>
      <PageHero eyebrow="Research report" ticker title={report.ticker} sub={heroSub}>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <GrokAttribution tone={inFlight ? "working" : report.status === "done" ? "done" : "inline"} />
          <dl className="flex flex-wrap gap-x-7 gap-y-3">
            <Stat label="Status">
              <StatusChip status={report.status} />
            </Stat>
            <Stat label="Requested">{formatTime(report.requested_at)}</Stat>
            {report.completed_at && <Stat label="Completed">{formatTime(report.completed_at)}</Stat>}
          </dl>
        </div>
      </PageHero>
      <PageBody>
        <Section code="01" name="Report">
          <ReportBody report={report} onReport={onReport} />
        </Section>
      </PageBody>
    </>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    // Reversed so the value sits above its label on screen, but is read after it.
    <div className="flex flex-col-reverse justify-end gap-1">
      <dt className="term-label">{label}</dt>
      <dd className="flex min-h-5 items-center font-mono font-medium">{children}</dd>
    </div>
  );
}

function formatTime(iso: string) {
  const time = new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return <time dateTime={iso}>{time} IST</time>;
}

const STEPS = ["Queued", "Researching", "Report ready"];

function Progress({
  report,
  onReport,
}: {
  report: Report;
  onReport?: (report: Report) => void;
}) {
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const queued = report.status === "pending";
  const current = queued ? 0 : 1;
  const fill = queued ? "18%" : "62%";
  const phaseLabel = queued ? "In queue" : "In process";
  const phaseDetail = queued
    ? `${report.ticker} is queued — waiting for the Grok research bot to pick up the job.`
    : `Research is in process for ${report.ticker} — Grok is working on the deep dive.`;

  async function stopResearch() {
    setStopping(true);
    setStopError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/stop`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStopError(data?.error ?? "Could not stop research.");
        return;
      }
      onReport?.(data as Report);
    } catch {
      setStopError("Could not stop research.");
    } finally {
      setStopping(false);
    }
  }

  return (
    <Card className="overflow-hidden border-border-soft">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-live motion-safe:animate-signal-pulse"
            />
            <div className="min-w-0 flex-1">
              <p className="term-label text-live">{phaseLabel}</p>
              <p role="status" className="mt-1 text-[15px] font-semibold tracking-tight">
                <span className="font-mono text-primary">{report.ticker}</span>
                {queued ? " is queued" : " — research in process"}
              </p>
              <p className="mt-1.5 text-muted-foreground">{phaseDetail}</p>
              <p className="mt-2 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                Step 0{current + 1} / 03 · checks every 10s
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-sm border px-2 py-1 font-mono text-xs tracking-[0.12em] uppercase ${
              queued
                ? "border-beta/40 bg-beta/10 text-beta"
                : "border-live/40 bg-live/10 text-live"
            }`}
          >
            {queued ? "Queued" : "Researching"}
          </span>
        </div>

        <div
          className="relative h-1.5 overflow-hidden rounded-full bg-secondary"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-live/35 transition-[width] duration-700 ease-out"
            style={{ width: fill }}
          />
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-linear-to-r from-transparent via-live to-transparent motion-safe:animate-pulse-bar" />
        </div>

        <ol className="flex flex-col gap-2 font-mono text-xs tracking-[0.06em] sm:flex-row sm:gap-8">
          {STEPS.map((step, index) => (
            <li
              key={step}
              aria-current={index === current ? "step" : undefined}
              className={`flex items-center gap-2 ${
                index === current
                  ? "text-foreground"
                  : index < current
                    ? "text-live"
                    : "text-muted-foreground"
              }`}
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${
                  index < current
                    ? "bg-live"
                    : index === current
                      ? "bg-live motion-safe:animate-pulse"
                      : "bg-input"
                }`}
              />
              {step}
              {index === current && (
                <span className="text-live normal-case tracking-normal">← now</span>
              )}
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Bot stuck? Stop waiting and research another ticker.
          </p>
          <Button
            type="button"
            variant="destructive"
            disabled={stopping}
            onClick={stopResearch}
            className="shrink-0"
          >
            <Square aria-hidden className="size-3.5 fill-current" />
            {stopping ? "Stopping…" : "Stop research"}
          </Button>
        </div>
        <p aria-live="polite" className="text-destructive empty:hidden">
          {stopError}
        </p>
      </CardContent>
    </Card>
  );
}

function ReportBody({
  report,
  onReport,
}: {
  report: Report;
  onReport?: (report: Report) => void;
}) {
  if (report.status === "pending" || report.status === "researching") {
    return <Progress report={report} onReport={onReport} />;
  }

  if (report.status === "failed") {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col gap-2">
          <p role="alert" className="text-destructive">
            {report.error ?? "Research failed."}
          </p>
          <p>
            <Link href="/" className="text-primary underline underline-offset-4">
              Research another ticker
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  const dl = isDlEquityReportPayload(report.report_json) ? parseDlEquityReport(report.report_json) : null;
  if (dl?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <GrokAttribution tone="done" />
        {dl.warnings.length > 0 && <DlSemanticWarnings warnings={dl.warnings} />}
        <DlReportView report={dl.data} />
      </div>
    );
  }

  const structured = parseStructuredReport(report.report_json);

  return (
    <div className="flex flex-col gap-4">
      <GrokAttribution tone="done" />
      {dl && <DlValidationErrors schema={String((report.report_json as { schema: unknown }).schema)} errors={dl.errors} />}
      {structured && <StructuredReportView report={structured} />}

      {report.report_html ? (
        <HtmlReport report={report} />
      ) : report.report_url ? (
        <UrlReport report={report} />
      ) : !structured ? (
        <pre className="overflow-x-auto rounded-lg border border-border-soft bg-card p-4 font-mono text-xs">
          {JSON.stringify(report.report_json, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function DlSemanticWarnings({ warnings }: { warnings: string[] }) {
  return (
    <Card className="border-beta/40 print:hidden">
      <CardContent className="flex flex-col gap-2">
        <p role="status" className="text-beta">
          This report&apos;s figures disagree with each other in {warnings.length} place{warnings.length === 1 ? "" : "s"}. It is shown as delivered.
        </p>
        <ul className="max-h-64 list-disc overflow-y-auto pl-5 font-mono text-xs text-dim">
          {warnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DlValidationErrors({ schema, errors }: { schema: string; errors: string[] }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col gap-2">
        <p role="alert" className="text-destructive">
          This report claims {schema} but failed validation ({errors.length}), so it is not shown as one.
        </p>
        <ul className="max-h-64 list-disc overflow-y-auto pl-5 font-mono text-xs text-dim">
          {errors.map((error, i) => (
            <li key={i}>{error}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function HtmlReport({ report }: { report: Report }) {
  // FORCE_BODY: a leading <style> would otherwise parse into <head> and be dropped.
  // Bots sometimes leave a code fence behind ("```html" or a bare "html") around the document.
  const raw = report.report_html!.replace(/^\s*(?:```+\s*)?html\s*(?=<)/i, "").replace(/```+\s*$/, "");
  const html = DOMPurify.sanitize(raw, {
    FORCE_BODY: true,
    FORBID_TAGS: ["form"],
  });
  const title = `${report.ticker} research report`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
        <ReportActions
          // The file leaves the app and its footer, so it carries the disclaimer itself.
          html={htmlDocument(title, `${html}<p><small>${DISCLAIMER}</small></p>`)}
          filename={`${report.ticker}-${report.exchange}-${report.completed_at?.slice(0, 10)}.html`}
        />
        {report.report_url && <ReportLink url={report.report_url} />}
      </div>
      {/* Isolates the report's CSS from the app. Nothing inside can run: no allow-scripts.
          allow-same-origin only lets fitToContent read the height, as the frame can't post it.
          Stays white in both themes: the report brings its own light styles. */}
      <div className="overflow-hidden rounded-lg border border-border-soft bg-white">
        <iframe
          srcDoc={htmlDocument(title, html)}
          title={title}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={fitToContent}
          className="block w-full"
        />
      </div>
    </>
  );
}

function UrlReport({ report }: { report: Report }) {
  return (
    <>
      <div className="print:hidden">
        <ReportLink url={report.report_url!} />
      </div>
      {/* No allow-same-origin, so framed scripts can't reach this app. */}
      <div className="overflow-hidden rounded-lg border border-border-soft bg-white">
        <iframe
          src={report.report_url!}
          title={`${report.ticker} research report`}
          sandbox="allow-scripts allow-popups"
          className="block h-[75vh] w-full"
        />
      </div>
    </>
  );
}

const DISCLAIMER = "Paper analysis only, not investment advice.";

// title is safe unescaped: tickers are checked against TICKER_PATTERN, which allows no < or >.
// base target sends every link to a new tab; fitToContent handles in-page #anchors itself.
function htmlDocument(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank"><title>${title}</title></head><body>${body}</body></html>`;
}

function fitToContent({ currentTarget: frame }: SyntheticEvent<HTMLIFrameElement>) {
  const root = frame.contentDocument?.documentElement;
  if (!root) return;
  // The frame is as tall as the report, so in-report #links scroll this page. base target would send them to a new tab.
  root.addEventListener("click", (event) => {
    const href = (event.target as Element).closest("a")?.getAttribute("href");
    if (!href?.startsWith("#")) return;
    event.preventDefault();
    const target = frame.contentDocument?.getElementById(decodeURIComponent(href.slice(1)));
    if (target) window.scrollTo({ top: frame.getBoundingClientRect().top + window.scrollY + target.getBoundingClientRect().top - 64, behavior: "smooth" });
  });
  // Keeps fitting as the window narrows or fonts load. Goes away with the frame's document.
  new ResizeObserver(() => {
    // The difference is a horizontal scrollbar's height, if a wide table has one.
    frame.style.height = `${root.offsetHeight + frame.clientHeight - root.clientHeight}px`;
  }).observe(root);
}

function ReportLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4"
    >
      Open full report
      <ExternalLink aria-hidden className="size-3.5" />
    </a>
  );
}
