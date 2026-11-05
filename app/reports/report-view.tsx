import DOMPurify from "isomorphic-dompurify";
import { StatusChip } from "@/components/status-chip";
import type { Report } from "@/lib/reports";
import { AutoRefresh } from "./[id]/auto-refresh";
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
        <AutoRefresh />
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
    // <style> and <form> go too: a report must not restyle the app, hide the
    // disclaimer, or collect input. contain-paint stops fixed-position overlays.
    const html = DOMPurify.sanitize(report.report_html, {
      FORBID_TAGS: ["style", "form"],
    });
    // The downloaded file stands alone, so it can keep the report's own <style>.
    const file = `<!doctype html>${DOMPurify.sanitize(report.report_html, {
      WHOLE_DOCUMENT: true,
      FORBID_TAGS: ["form"],
    })}`;
    return (
      <>
        <ReportActions
          html={file}
          filename={`${report.ticker}-${report.exchange}-${report.completed_at?.slice(0, 10)}.html`}
        />
        {report.report_url && <ReportLink url={report.report_url} />}
        <article
          className="report-html overflow-x-auto contain-paint"
          dangerouslySetInnerHTML={{ __html: html }}
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
