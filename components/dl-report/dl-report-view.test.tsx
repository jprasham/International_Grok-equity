import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportView } from "@/app/reports/report-view";
import { DL_TAB_LABELS, parseDlEquityReportV1, type DlEquityReportV1 } from "@/lib/dl-equity-report-v1";
import { dlSplitMarkers } from "@/lib/dl-report-blocks";
import { dlReportHtml, escapeHtml } from "@/lib/dl-report-html";
import type { Report } from "@/lib/reports";
import { DlReportView } from "./dl-report-view";

const raw = (name: string) => JSON.parse(readFileSync(`fixtures/${name}-v1.json`, "utf8"));
function fixture(name: string): DlEquityReportV1 {
  const parsed = parseDlEquityReportV1(raw(name));
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  return parsed.data;
}

describe("XSS probe", () => {
  it("renders as text in the view, including the srcDoc for Print", () => {
    const html = renderToStaticMarkup(<DlReportView report={fixture("xss-probe")} />);
    // The Download and Print icons are the view's only own svg, and it emits no <b>, so anything else came from report data.
    const withoutIcons = html.replace(/<svg [^>]*class="lucide[^>]*>.*?<\/svg>/g, "");
    expect(withoutIcons).not.toMatch(/<(script|img|svg|b)[\s>]/i);
    expect(html).toContain("&lt;script&gt;");
  });

  it("is escaped in the download document", () => {
    const html = dlReportHtml(fixture("xss-probe"));
    expect(html).not.toMatch(/<(script|img|svg)[\s>]/i);
    expect(html).toContain("&lt;script&gt;alert(&#39;xss-script&#39;)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    // A source that is already an entity must not decode back into markup.
    expect(html).toContain("&amp;lt;script&amp;gt;");
  });
});

describe("escapeHtml", () => {
  it("escapes all five characters", () => {
    expect(escapeHtml(`<a href="x" id='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; id=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });
});

describe("EST and U markers", () => {
  const markers = (text: string) => dlSplitMarkers(text).filter((_, i) => i % 2);
  it("finds whole-word markers only", () => {
    expect(markers("Safe (EST); exact tenure U.")).toEqual(["EST", "U"]);
    expect(markers("BEST buses, U.S. demand, a U-turn, Ugaps")).toEqual([]);
  });
});

describe.each(["olectra", "hfcl"])("%s", (name) => {
  const report = fixture(name);

  it("gives every tab one radio, one label and one panel, with F1 selected", () => {
    const html = renderToStaticMarkup(<DlReportView report={report} />);
    expect(html.match(/type="radio"/g)).toHaveLength(17);
    expect(html.match(/ checked=""/g)).toHaveLength(1);
    expect(html.match(/data-panel="/g)).toHaveLength(17);
    expect(html.match(/<label for="dl-tab-f\d+">/g)).toHaveLength(DL_TAB_LABELS.length);
  });

  it("shows sources and gaps on all 16 research panels, on screen and in the export", () => {
    expect(renderToStaticMarkup(<DlReportView report={report} />).match(/>SOURCES &amp; GAPS</g)).toHaveLength(16);
    expect(dlReportHtml(report).match(/>SOURCES &amp; GAPS</g)).toHaveLength(16);
  });

  it("exports every table cell, not just the visible tab", () => {
    const html = dlReportHtml(report);
    for (const row of report.panels.f15.calls.rows) for (const cell of row) expect(html).toContain(escapeHtml(cell));
    for (const investor of report.panels.f13.investors) expect(html).toContain(escapeHtml(investor.quote));
  });
});

describe("ReportView priority", () => {
  const render = (patch: Partial<Report>) => {
    const report: Report = {
      id: "1",
      ticker: "TEST",
      exchange: "NSE",
      status: "done",
      requested_at: "2026-11-06T00:00:00.000Z",
      completed_at: "2026-11-06T00:00:00.000Z",
      report_url: null,
      report_html: null,
      report_json: null,
      error: null,
      ...patch,
    };
    return renderToStaticMarkup(<ReportView report={report} />);
  };
  const url = "https://example.com/r";

  it("renders a valid v1 report ahead of a report_url", () => {
    const html = render({ report_json: raw("hfcl"), report_url: url });
    expect(html).toContain('data-panel="f1"');
    expect(html).not.toContain(url);
    expect(html).not.toContain("Market Pulse");
  });

  it("shows validation errors for a broken v1 report, then the legacy fallback", () => {
    const broken = raw("hfcl");
    delete broken.panels.f7;
    const html = render({ report_json: broken, report_url: url });
    expect(html).toContain("failed validation");
    expect(html).toContain("panels.f7");
    expect(html).not.toContain('data-panel="f1"');
    expect(html).toContain(url);
  });

  it("leaves Market Pulse payloads and report_url on the legacy path, with no validation UI", () => {
    const html = render({ report_json: { rating: "Buy", summary: "Legacy summary" }, report_url: url });
    expect(html).toContain("Legacy summary");
    expect(html).toContain(url);
    expect(html).toContain("Market Pulse");
    expect(html).not.toContain("failed validation");
  });

  it.each([null, "text", 7, []])("tolerates non-object report_json %j", (report_json) => {
    expect(render({ report_json, report_url: url })).not.toContain("failed validation");
  });
});
