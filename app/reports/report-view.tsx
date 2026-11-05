"use client";

// Browser-only: without a DOM, DOMPurify returns its input unsanitized. Render this
// through ReportLoader, never on the server. (jsdom on the server crashes on Vercel.)
import DOMPurify from "dompurify";
import type { SyntheticEvent } from "react";
import { StatusChip } from "@/components/status-chip";
import type { Report } from "@/lib/reports";
import { ReportActions } from "./report-actions";

export function ReportView({ report }: { report: Report }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-4xl font-bold text-primary">{report.ticker}</h1>
        <span className="text-muted-foreground">{report.exchange}</span>
        <StatusChip status={report.status} />
      </div>
      <div className="mt-6">
        <ReportBody report={report} />
      </div>
    </>
  );
}

function ReportBody({ report }: { report: Report }) {
  if (report.status === "pending" || report.status === "researching") {
    return (
      <p role="status" className="text-primary">
        {report.status === "pending" ? "Queued" : "Researching"} {report.ticker}
        <span aria-hidden className="cursor-blink">
          _
        </span>
        <span className="mt-2 block text-sm text-muted-foreground">
          This page checks for the finished report every 10 seconds.
        </span>
      </p>
    );
  }

  if (report.status === "failed") {
    return (
      <p role="alert" className="text-destructive">
        {report.error ?? "Research failed."}
      </p>
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
        <ReportActions
          // The file leaves the app and its footer, so it carries the disclaimer itself.
          html={htmlDocument(title, `${html}<p><small>${DISCLAIMER}</small></p>`)}
          filename={`${report.ticker}-${report.exchange}-${report.completed_at?.slice(0, 10)}.html`}
        />
        {report.report_url && <ReportLink url={report.report_url} />}
        {/* Isolates the report's CSS from the app. Nothing inside can run: no allow-scripts.
            allow-same-origin only lets fitToContent read the height, as the frame can't post it. */}
        <iframe
          srcDoc={htmlDocument(title, html)}
          title={title}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={fitToContent}
          className="w-full bg-white"
        />
      </>
    );
  }

  if (report.report_url) {
    return (
      <>
        <ReportLink url={report.report_url} />
        {/* No allow-same-origin, so framed scripts can't reach this app. */}
        <iframe
          src={report.report_url}
          title={`${report.ticker} research report`}
          sandbox="allow-scripts allow-popups"
          className="h-[75vh] w-full border bg-white"
        />
      </>
    );
  }

  return (
    <pre className="overflow-x-auto border p-4 text-sm">
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
    <p className="mb-4 text-sm print:hidden">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline"
      >
        Open full report ↗
      </a>
    </p>
  );
}
