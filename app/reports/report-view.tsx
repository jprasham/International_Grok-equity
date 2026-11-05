"use client";

// Browser-only: without a DOM, DOMPurify returns its input unsanitized. Render this
// through ReportLoader, never on the server. (jsdom on the server crashes on Vercel.)
import DOMPurify from "dompurify";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode, SyntheticEvent } from "react";
import { StatusChip } from "@/components/status-chip";
import { PageBody, PageHero, Section } from "@/components/terminal";
import { Card, CardContent } from "@/components/ui/card";
import type { Report } from "@/lib/reports";
import { ReportActions } from "./report-actions";

export function ReportView({ report }: { report: Report }) {
  return (
    <>
      <PageHero ticker title={report.ticker} sub={`${report.exchange} · Research report`}>
        <dl className="flex flex-wrap gap-x-7 gap-y-3">
          <Stat label="Status">
            <StatusChip status={report.status} />
          </Stat>
          <Stat label="Requested">{formatTime(report.requested_at)}</Stat>
          {report.completed_at && <Stat label="Completed">{formatTime(report.completed_at)}</Stat>}
        </dl>
      </PageHero>
      <PageBody>
        <Section code="01" name="Report">
          <ReportBody report={report} />
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

function Progress({ report }: { report: Report }) {
  const current = report.status === "pending" ? 0 : 1;
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p role="status" className="text-[15px] font-semibold">
          {STEPS[current]} {report.ticker}
        </p>
        <ol className="flex flex-col gap-2 font-mono sm:flex-row sm:gap-6">
          {STEPS.map((step, index) => (
            <li
              key={step}
              aria-current={index === current ? "step" : undefined}
              className={`flex items-center gap-2 ${index === current ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${
                  index < current
                    ? "bg-live"
                    : index === current
                      ? "bg-beta motion-safe:animate-pulse"
                      : "bg-input"
                }`}
              />
              {step}
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground">
          This page checks for the finished report every 10 seconds.
        </p>
      </CardContent>
    </Card>
  );
}

function ReportBody({ report }: { report: Report }) {
  if (report.status === "pending" || report.status === "researching") {
    return <Progress report={report} />;
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

  if (report.report_html) {
    // FORCE_BODY: a leading <style> would otherwise parse into <head> and be dropped.
    const html = DOMPurify.sanitize(report.report_html, {
      FORCE_BODY: true,
      FORBID_TAGS: ["form"],
    });
    const title = `${report.ticker} research report`;
    return (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
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
        <div className="overflow-hidden rounded-lg border bg-white">
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

  if (report.report_url) {
    return (
      <>
        <div className="mb-4 print:hidden">
          <ReportLink url={report.report_url} />
        </div>
        {/* No allow-same-origin, so framed scripts can't reach this app. */}
        <div className="overflow-hidden rounded-lg border bg-white">
          <iframe
            src={report.report_url}
            title={`${report.ticker} research report`}
            sandbox="allow-scripts allow-popups"
            className="block h-[75vh] w-full"
          />
        </div>
      </>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-lg border bg-card p-4 font-mono text-xs">
      {JSON.stringify(report.report_json, null, 2)}
    </pre>
  );
}

const DISCLAIMER = "Paper analysis only, not investment advice.";

// title is safe unescaped: tickers are checked against TICKER_PATTERN, which allows no < or >.
// ponytail: base target sends every link to a new tab, so in-page #anchors don't scroll.
function htmlDocument(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank"><title>${title}</title></head><body>${body}</body></html>`;
}

function fitToContent({ currentTarget: frame }: SyntheticEvent<HTMLIFrameElement>) {
  const root = frame.contentDocument?.documentElement;
  if (!root) return;
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
