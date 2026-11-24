import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportView } from "@/app/reports/report-view";
import { DlReportView } from "@/components/dl-report/dl-report-view";
import { parseDlEquityReportV1 } from "./dl-equity-report-v1";
import { dlSemanticWarnings, parseDlEquityReport, parseDlEquityReportV11, type DlEquityReport } from "./dl-equity-report-v1.1";
import { dlPanels } from "./dl-report-blocks";
import { dlReportHtml, escapeHtml } from "./dl-report-html";
import type { Report } from "./reports";

/* eslint-disable @typescript-eslint/no-explicit-any -- tests mutate raw JSON into invalid shapes */
const raw = (name: string): any => JSON.parse(readFileSync(`fixtures/${name}.json`, "utf8"));
const V11 = "hfcl-v1.1";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

function parsed(input: unknown): DlEquityReport {
  const result = parseDlEquityReport(input);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.data;
}
const view = (report: DlEquityReport) => renderToStaticMarkup(<DlReportView report={report} />);
const fragmentOf = (value: string) => escapeHtml(value).replaceAll("&#39;", "&#x27;");
/** A tab's on-screen text. Tags are dropped, which also rejoins the spans around EST and U and removes the print srcDoc. */
const screenText = (html: string, panel: string) => (html.split('data-panel="').find((chunk) => chunk.startsWith(`${panel}"`)) ?? "").replace(/^[^>]*>/, "").replace(/<[^>]+>/g, "");

describe("legacy v1 is untouched", () => {
  // View hashes re-taken after the reference restyle; export hashes are from before v1.1 existed: [view markup, export document].
  it.each([
    ["olectra-v1", "1aea2699689a3d41fcd75af34a5f6af1e3576447fa83181d6cf566998f8c7792", "fc4f9d9903529d11770393308dd5eec920a4bf53596ef802570e0976b0961704"],
    ["hfcl-v1", "c24d8db569d2b54ab7417c339483c3cb8c3c91b522cec374306c5263317f8185", "a293a217d00c341c2b414c9eeb5335d42d009a2ba1f5e1bf7296746979beba0c"],
    ["xss-probe-v1", "a497de4d4710c10f2943e8ca3858ef6d6c7ccdda5f1963f4c057af605e12e08a", "fb906f14b2eba60b678e2ac4e83be1c6bc4abc66d092bb031a089636a5cc3ac3"],
  ])("%s renders byte-identically on screen and in the export", (name, screen, exported) => {
    const report = parsed(raw(name));
    expect(sha(view(report))).toBe(screen);
    expect(sha(dlReportHtml(report))).toBe(exported);
  });

  it.each(["olectra-v1", "hfcl-v1"])("%s has no semantic warnings", (name) => {
    expect(parseDlEquityReport(raw(name))).toMatchObject({ ok: true, warnings: [] });
  });

  it("keeps the versions apart", () => {
    expect(parseDlEquityReportV1(raw(V11))).toMatchObject({ ok: false });
    expect(parseDlEquityReportV11(raw("hfcl-v1"))).toMatchObject({ ok: false });
    expect(parseDlEquityReport({ ...raw(V11), schema: "dl-equity-report/v2" })).toMatchObject({ ok: false });
    expect(parseDlEquityReport(null)).toMatchObject({ ok: false });
    // v1 strictness did not loosen: a v1.1 field in a v1 payload is still rejected.
    const v1 = raw("hfcl-v1");
    v1.panels.f1.layout = [{ ref: "takeaways" }, { ref: "topInsights" }];
    expect(parseDlEquityReport(v1)).toMatchObject({ ok: false });
  });
});

describe("fixtures/hfcl-v1.1.json closes all 15 fit gaps", () => {
  const report = parsed(raw(V11));
  const html = view(report);
  const exported = dlReportHtml(report);
  const p = raw(V11).panels;
  const uRows = (category: number) => p.f2.categories[category].checks.rows.filter((row: string[]) => row[3] === "U").map((row: string[]) => row[0]);

  it("parses with no warnings", () => {
    expect(parseDlEquityReport(raw(V11))).toMatchObject({ ok: true, warnings: [] });
  });

  // Fragments are retyped from _reference/hfcl-v1/lossless-source.json.
  it.each([
    [1, "f1", "LIVE PRICE SNAPSHOT", "₹34,943.65 cr as displayed; cap/price imply 165.88 cr shares"],
    [2, "f2", ">25% agedA", "CARE un billed 906 cr, security deposits 418 cr"],
    [3, "f2", ">10% NWA", "<10% G"],
    [4, "f2", ">+500 bpA", "Non cash disposal gains A"],
    [5, "f2", "Substantiated adverse action R", "Adverse proceeding R"],
    [6, "f2", "RPT>5% A", "Mismatch A"],
    [7, "f2", "SUB-TABS", "Verified empty UI shell; no invented buttons."],
    [8, "f2", "CATEGORY SCORECARD · TAP A ROW FOR ITS CHECKS", "U checks repeat in data gap index, not double counted."],
    [9, "f3", "MODEL INPUTS & UNCERTAINTY", "LOW for un performed composites"],
    [10, "f7", "PERIODS, DEFINITIONS & EARNINGS BRIDGE", "owner 1,282.50 /170 cr shares=EPS 7.54"],
    [11, "f11", "METHOD", "present value investment I=FV/(R/k−1)"],
    [12, "f12", "RECONCILIATION", "margin table replaces margin and uses 20 x"],
    [13, "f13", "CRITERIA APPLIED", "Criterion"],
    [14, "f14", "Price band", "After share/cash reconciliation"],
    [15, "f17", "UPLOAD SLOT · NOT ENABLED", "No fabricated uploaded analysis or working upload control."],
  ])("gap %i in %s shows on screen and in the export", (_gap, panel, heading, body) => {
    const screen = screenText(html, panel);
    for (const fragment of [heading, body]) {
      expect(screen).toContain(fragmentOf(fragment));
      expect(exported).toContain(escapeHtml(fragment));
    }
  });

  it("gaps 2-6: U rows sit in the five-column grids with their thresholds", () => {
    expect([1, 2, 3, 5, 6].map(uRows)).toEqual([["2.2"], ["4.2", "4.5"], ["6.3", "7.1"], ["7.7", "7.5"], ["7.3", "7.9"]]);
    for (const category of p.f2.categories) expect(category.checks.columns).toEqual(["#", "Check", "Threshold", "Verdict", "Evidence"]);
  });

  it("gap 8: repeated U rows are counted once", () => {
    expect(p.f2.stress.tally).toBe("31 checks: 4 RED · 12 AMBER · 6 GREEN · 9 not checked.");
    expect(p.f2.dataGaps.rows).toHaveLength(9);
    expect(dlSemanticWarnings(report)).toEqual([]);
  });

  it("gap 13: criteria titles are renderer-owned, with one table per investor", () => {
    const panel = dlPanels(report)[12];
    const group = panel.blocks.filter((block) => block.kind === "group");
    expect(group).toHaveLength(7);
    expect(JSON.stringify(p.f13)).not.toContain("CRITERIA APPLIED");
    expect(screenText(html, "f13").match(/CRITERIA APPLIED/g)).toHaveLength(7);
  });

  it("gap 14: STAGED ENTRY keeps the exact five columns", () => {
    expect(p.f14.stagedEntry.columns).toEqual(["Tranche", "Size%", "Price band", "Timing", "Rationale"]);
    expect(p.f14.stagedEntry.rows[0].slice(0, 2)).toEqual(["T1", "0% now (paper)"]);
  });

  it("gap 15: F17 keeps the placeholder, and sources and gaps close all 17 panels", () => {
    expect(p.f17.kind).toBe("upload_placeholder");
    expect(html.match(/>SOURCES &amp; GAPS</g)).toHaveLength(17);
    expect(exported.match(/>SOURCES &amp; GAPS</g)).toHaveLength(17);
    for (const panel of dlPanels(report)) expect(panel.blocks.at(-1)?.kind).toBe("sources");
  });

  // _reference is local-only, so this guards regeneration on the machine that has it.
  it.skipIf(!existsSync("_reference"))("matches the lossless companion, with no invented numbers", () => {
    const lossless = JSON.parse(readFileSync("_reference/hfcl-v1/lossless-source.json", "utf8"));
    const source = (id: string) => lossless.tables.find((t: { id: string }) => t.id === id);
    const pick = ({ columns, rows }: { columns: string[]; rows: string[][] }) => ({ columns, rows });
    ["T02", "T03", "T04", "T05", "T06", "T07", "T08"].forEach((id, i) => expect(pick(p.f2.categories[i].checks)).toEqual(pick(source(id))));
    expect(pick(p.f14.stagedEntry)).toEqual(pick(source("T38")));
    expect(pick(p.f1.layout[2])).toEqual(pick(source("T01")));

    // Commas only group digits, so "2026,15:59" is two numbers. The manifest holds the URLs the projection cites.
    const numbers = (value: string) => value.match(/\d{1,3}(?:,\d{2})*,\d{3}(?:\.\d+)?|\d+(?:\.\d+)?/g) ?? [];
    const known = new Set(numbers(readFileSync("_reference/hfcl-research-sample.html", "utf8") + JSON.stringify(lossless.source_manifest)));
    const invented = new Set<string>();
    const walk = (node: unknown): void => {
      if (typeof node === "string") numbers(node).filter((n) => !known.has(n)).forEach((n) => invented.add(n));
      else if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object") Object.values(node).forEach(walk);
    };
    walk(p);
    expect([...invented]).toEqual([]);
  });
});

describe("layout", () => {
  const withLayout = (panel: string, layout: unknown) => {
    const report = raw(V11);
    report.panels[panel].layout = layout;
    return report;
  };
  const f7 = [{ ref: "takeaways" }, { ref: "pl" }];
  const note = (paragraphs: unknown = ["U"]) => ({ type: "text", id: "note", paragraphs });

  it("defaults to v1 order without a layout", () => {
    const report = raw(V11);
    delete report.panels.f7.layout;
    expect(dlPanels(parsed(report))[6].blocks.map((b) => b.kind)).toEqual(["numbered", "table", "sources"]);
  });

  it("honours the order, and keeps SOURCES & GAPS last", () => {
    const report = parsed(withLayout("f7", [note(), { ref: "pl" }, { ref: "takeaways" }]));
    expect(dlPanels(report)[6].blocks.map((b) => b.kind)).toEqual(["text", "table", "numbered", "sources"]);
  });

  it("renders every extra type", () => {
    const report = parsed(
      withLayout("f7", [
        ...f7,
        { type: "table", id: "t", title: "T TITLE", columns: ["A", "B"], rows: [["a1", "b1"]], rowMeta: [{ note: "row note" }] },
        { type: "keyValue", id: "k", title: "K TITLE", items: [{ label: "key1", value: "value1" }] },
        { type: "text", id: "x", title: "X TITLE", paragraphs: ["para1", "para2"] },
        { type: "bullets", id: "b", title: "B TITLE", items: ["item1"] },
      ]),
    );
    const screen = screenText(view(report), "f7");
    const exported = dlReportHtml(report);
    for (const fragment of ["T TITLE", "a1", "row note", "K TITLE", "key1", "value1", "X TITLE", "para1", "para2", "B TITLE", "item1"]) {
      expect(screen).toContain(fragment);
      expect(exported).toContain(fragment);
    }
  });

  it.each<[string, unknown, string]>([
    ["unknown ref", [...f7, { ref: "nope" }], "panels.f7.layout.2"],
    ["a ref from another panel", [...f7, { ref: "grid" }], "panels.f7.layout.2"],
    ["SOURCES & GAPS as a ref", [...f7, { ref: "sourcesAndGaps" }], "panels.f7.layout.2"],
    ["a duplicated fixed block", [...f7, { ref: "pl" }], 'fixed block "pl" must appear exactly once, found 2'],
    ["a missing fixed block", [{ ref: "takeaways" }], 'fixed block "pl" must appear exactly once, found 0'],
    ["an empty layout", [], 'fixed block "takeaways" must appear exactly once, found 0'],
    ["a non-array layout", { ref: "pl" }, "panels.f7.layout"],
    ["an unknown extra type", [...f7, { type: "html", id: "x", html: "<b>x</b>" }], "panels.f7.layout.2"],
    ["raw HTML on a typed extra", [...f7, { ...note(), html: "<b>x</b>" }], "panels.f7.layout.2"],
    ["both a ref and a type", [...f7, { ...note(), ref: "pl" }], "panels.f7.layout.2"],
    ["a bad extra id", [...f7, { ...note(), id: "Not Kebab" }], "panels.f7.layout.2"],
    ["empty paragraphs", [...f7, note([])], "panels.f7.layout.2"],
    ["a blank paragraph", [...f7, note([" "])], "panels.f7.layout.2"],
    ["a short table row", [...f7, { type: "table", id: "t", title: "T", columns: ["A", "B"], rows: [["a"]] }], "panels.f7.layout.2"],
    ["a blank table cell", [...f7, { type: "table", id: "t", title: "T", columns: ["A"], rows: [[" "]] }], "panels.f7.layout.2"],
    ["rowMeta of the wrong length", [...f7, { type: "table", id: "t", title: "T", columns: ["A"], rows: [["a"]], rowMeta: [] }], "panels.f7.layout.2"],
    ["a duplicate extra id in the panel", [...f7, note(), note()], 'duplicate extra block id "note"'],
  ])("rejects %s", (_name, layout, message) => {
    const result = parseDlEquityReport(withLayout("f7", layout));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toContain(message);
  });

  it("rejects an extra id reused across panels, and a layout on F17", () => {
    const report = withLayout("f7", [...f7, { type: "text", id: "franchise-method", paragraphs: ["U"] }]);
    expect(parseDlEquityReport(report)).toMatchObject({ ok: false });
    expect(parseDlEquityReport(withLayout("f17", []))).toMatchObject({ ok: false });
  });
});

describe("v1.1 panel variants", () => {
  const mutated = (mutate: (panels: any) => void) => {
    const report = raw(V11);
    mutate(report.panels);
    return parseDlEquityReport(report);
  };

  it("F14 takes the v1 headerless shape or the exact five columns, nothing else", () => {
    const v1Shape = raw("hfcl-v1").panels.f14.stagedEntry;
    expect(mutated((p) => (p.f14.stagedEntry = v1Shape))).toMatchObject({ ok: true });
    expect(mutated((p) => (p.f14.stagedEntry.columns[1] = "Size"))).toMatchObject({ ok: false });
    expect(mutated((p) => p.f14.stagedEntry.rows[0].pop())).toMatchObject({ ok: false });
  });

  it("F2 data gaps take an optional Threshold column", () => {
    const result = mutated((p) => {
      p.f2.dataGaps.columns.splice(3, 0, "Threshold");
      for (const row of p.f2.dataGaps.rows) row.splice(3, 0, ">25% agedA");
    });
    expect(result).toMatchObject({ ok: true, warnings: [] });
    expect(mutated((p) => p.f2.dataGaps.columns.splice(3, 0, "Limit"))).toMatchObject({ ok: false });
  });

  it("F2 grids take U but keep the rest of the v1 rules", () => {
    expect(mutated((p) => (p.f2.categories[0].checks.rows[0][3] = "MAYBE"))).toMatchObject({ ok: false });
    expect(mutated((p) => (p.f2.categories[0].checks.rows[0][0] = "99.9"))).toMatchObject({ ok: false });
    expect(mutated((p) => p.f2.categories.reverse())).toMatchObject({ ok: false });
  });

  it("F2 still accepts U rows that only live in DATA GAPS, v1 style", () => {
    const result = mutated((p) => {
      for (const category of p.f2.categories) category.checks.rows = category.checks.rows.filter((row: string[]) => row[3] !== "U");
    });
    expect(result).toMatchObject({ ok: true, warnings: [] });
  });

  it("F17 stays a placeholder: prose yes, research no", () => {
    expect(mutated((p) => (p.f17 = { kind: "upload_placeholder" }))).toMatchObject({ ok: true });
    expect(mutated((p) => (p.f17.research = "forbidden"))).toMatchObject({ ok: false });
    expect(mutated((p) => (p.f17.kind = "research"))).toMatchObject({ ok: false });
    expect(mutated((p) => (p.f17.sourcesAndGaps.disclaimer = "Advice"))).toMatchObject({ ok: false });
  });

  it("still rejects unknown fields", () => {
    expect(mutated((p) => (p.f7.extraTable = { title: "forbidden" }))).toMatchObject({ ok: false });
  });
});

describe.each(["hfcl-v1", V11])("semantic warnings on %s", (name) => {
  // The seven probes from _reference/hfcl-v1/parser-tests.mjs, which frozen v1 accepted silently.
  it.each<[string, (x: any) => void, RegExp]>([
    ["F2 false tally", (x) => (x.panels.f2.stress.tally = "999 checks: 999 RED · 0 AMBER · 0 GREEN · 0 not checked"), /^F2: tally/],
    ["F2 missing check", (x) => x.panels.f2.categories[0].checks.rows.pop(), /^F2: missing checks: 7\.10$/],
    ["F2 duplicate check", (x) => x.panels.f2.categories[0].checks.rows.push(structuredClone(x.panels.f2.categories[0].checks.rows[0])), /^F2: check 1\.1 is duplicated/],
    ["wrong header target", (x) => (x.chrome.target = "₹99999"), /^Header target ₹99999 differs from the F10 weighted target 216\.68$/],
    ["wrong investor consensus", (x) => (x.panels.f13.consensus.wouldBuy = 99), /^F13: consensus says 99 would buy/],
    ["wrong stakeholder cap", (x) => (x.panels.f16.adjustedMultiple = "30 minus17 capped15 equals999x (EST)"), /^F16: base 30x less 15x is 15x/],
    ["reward-risk label vs ratio", (x) => (x.panels.f10.rewardRisk.strip = "Reward : risk 0.47x · ASYMMETRIC FAVOURABLE"), /^F10: reward : risk 0\.47x reads ASYMMETRIC UNFAVOURABLE/],
  ])("warns on, without rejecting: %s", (_probe, mutate, expected) => {
    const report = raw(name);
    mutate(report);
    const result = parseDlEquityReport(report);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings.some((warning) => expected.test(warning))).toBe(true);
  });
});

describe("semantic warnings, other paths", () => {
  const warningsAfter = (mutate: (x: any) => void) => {
    const report = raw(V11);
    mutate(report);
    return dlSemanticWarnings(parsed(report));
  };

  it("flags a check that is scored and also listed as a gap", () => {
    const warnings = warningsAfter((x) => x.panels.f2.dataGaps.rows.push(["1.1", "CFO", "Cash conversion", "U"]));
    expect(warnings.join("\n")).toContain("check 1.1 is both scored RED and listed in DATA GAPS");
  });

  it("flags wrong category counts, a gap title and a lead title", () => {
    expect(warningsAfter((x) => (x.panels.f2.categories[1].counts.u = 5)).join()).toContain("Receivables, WC & inventory counts say 0R 3A 0G 5U but its rows give 0R 3A 0G 1U");
    expect(warningsAfter((x) => (x.panels.f2.dataGaps.title = "DATA GAPS · 4 CHECKS NOT SCORED")).join()).toContain("DATA GAPS title says 4 checks but lists 9");
    expect(warningsAfter((x) => (x.panels.f13.leadTitle = "Investors: 7 would buy / 0 watchlist / 0 pass")).join()).toContain("F13: lead title");
  });

  it("skips targets and ratios that are U", () => {
    expect(warningsAfter((x) => (x.chrome.target = "U"))).toEqual([]);
    expect(warningsAfter((x) => (x.panels.f10.rewardRisk.strip = "Reward : risk U"))).toEqual([]);
  });

  it("uses the stated reward : risk boundaries", () => {
    const strip = (value: string) => warningsAfter((x) => (x.panels.f10.rewardRisk.strip = `Reward : risk ${value}`));
    expect(strip("0.8x · BALANCED")).toEqual([]);
    expect(strip("1.5x · ASYMMETRIC FAVOURABLE")).toEqual([]);
    expect(strip("0.79x · BALANCED")).toHaveLength(1);
  });
});

describe("XSS through v1.1 fields", () => {
  const PAYLOAD = `<script>alert('x')</script><img src=x onerror=alert(1)><b>bold</b>"'&lt;script&gt;`;
  const report = () => {
    const r = raw(V11);
    const p = r.panels;
    p.f1.layout.push(
      { type: "table", id: "xss-t", title: PAYLOAD, columns: [PAYLOAD, "B"], rows: [[PAYLOAD, "b"]], rowMeta: [{ note: PAYLOAD }] },
      { type: "keyValue", id: "xss-k", title: PAYLOAD, items: [{ label: PAYLOAD, value: PAYLOAD }] },
      { type: "text", id: "xss-x", title: PAYLOAD, paragraphs: [PAYLOAD] },
      { type: "bullets", id: "xss-b", title: PAYLOAD, items: [PAYLOAD] },
    );
    p.f2.subTabsProse = PAYLOAD;
    p.f2.categoryScorecardProse = PAYLOAD;
    p.f2.categories[1].checks.rows[1][2] = PAYLOAD;
    p.f14.stagedEntry.rows[0][1] = PAYLOAD;
    p.f17.leadTitle = PAYLOAD;
    p.f17.slotTitle = PAYLOAD;
    p.f17.prose = [PAYLOAD];
    p.f17.takeaways = [PAYLOAD];
    p.f17.sourcesAndGaps.gaps = [PAYLOAD];
    return parsed(r);
  };

  it("stays text in the view, including the srcDoc for Print", () => {
    const html = view(report());
    const withoutIcons = html.replace(/<svg [^>]*class="lucide[^>]*>.*?<\/svg>/g, "");
    expect(withoutIcons).not.toMatch(/<(script|img|svg|b)[\s>]/i);
    expect(html).toContain("&lt;script&gt;");
  });

  it("is escaped in the download document", () => {
    const html = dlReportHtml(report());
    expect(html).not.toMatch(/<(script|img|svg)[\s>]/i);
    expect(html).not.toContain("<b>bold");
    expect(html.match(/&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/g)?.length).toBeGreaterThanOrEqual(13);
    expect(html).toContain("&amp;lt;script&amp;gt;");
  });
});

describe("ReportView priority", () => {
  const render = (patch: Partial<Report>) =>
    renderToStaticMarkup(
      <ReportView
        report={{
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
        }}
      />,
    );
  const url = "https://example.com/r";

  it("renders valid v1.1 ahead of report_url", () => {
    const html = render({ report_json: raw(V11), report_url: url });
    expect(html).toContain('data-panel="f1"');
    expect(html).toContain("LIVE PRICE SNAPSHOT");
    expect(html).toContain("Equity research");
    expect(html).not.toContain(url);
    expect(html).not.toContain("disagree with each other");
  });

  it("names v1.1 in validation errors, then falls back", () => {
    const broken = raw(V11);
    broken.panels.f7.layout = [{ ref: "nope" }];
    const html = render({ report_json: broken, report_url: url });
    expect(html).toContain("This report claims dl-equity-report/v1.1 but failed validation");
    expect(html).not.toContain('data-panel="f1"');
    expect(html).toContain(url);
  });

  it("shows semantic warnings without blocking the report", () => {
    const report = raw(V11);
    report.chrome.target = "₹99999";
    const html = render({ report_json: report });
    expect(html).toContain("disagree with each other in 1 place");
    expect(html).toContain('data-panel="f1"');
  });

  it("still renders v1, and leaves other schemas on the legacy path", () => {
    expect(render({ report_json: raw("hfcl-v1") })).toContain('data-panel="f1"');
    const legacy = render({ report_json: { schema: "dl-equity-report/v2", rating: "Buy", summary: "Legacy summary" }, report_url: url });
    expect(legacy).not.toContain("failed validation");
    expect(legacy).toContain(url);
  });
});
