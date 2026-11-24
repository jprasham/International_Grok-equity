import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as v1 from "./dl-equity-report-v1";
import { DL_EQUITY_REPORT_SCHEMA, DL_TAB_LABELS, parseDlEquityReportV1 } from "./dl-equity-report-v1";

// Expected values are retyped from the OLECTRA spec/panels on purpose, so a drifting constant fails here.
const EXPECTED_COLUMNS: Record<string, string[]> = {
  F2_CHECK_COLUMNS: ["#", "Check", "Threshold", "Verdict", "Evidence"],
  F2_DATA_GAPS_COLUMNS: ["#", "Check", "Category", "What is missing"],
  F3_SCORECARD_COLUMNS: ["Model", "Score", "Read"],
  F4_OWNERSHIP_COLUMNS: ["Item", "Value"],
  F4_CHANGE_LOG_COLUMNS: ["Date", "Person", "Role", "In/Out", "Stated reason / profile", "AR 0/+1", "AR 20d"],
  F4_SIGNAL_STRIP_COLUMNS: ["Signal", "Reading", "Flag"],
  F4_CULTURE_STRIP_COLUMNS: ["Source", "Reading", "Note"],
  F5_THEME_STRIP_COLUMNS: ["Signal", "Reading", "Read"],
  F5_STOCK_MOOD_COLUMNS: ["Signal", "Reading"],
  F6_BOTTOM_UP_COLUMNS: ["Line", "FY27E", "Basis"],
  F6_ORDER_BOOK_COLUMNS: ["Order", "Size", "Delivered", "Status"],
  F6_STRUCTURE_COLUMNS: ["Entity", "Role"],
  F7_PL_COLUMNS: ["", "FY23", "FY24", "FY25", "FY26", "TTM", "FY27E", "FY28E"],
  F8_RETURNS_COLUMNS: ["Metric", "Value"],
  F9_GUIDANCE_COLUMNS: ["", "What was said", "Number", "Tag", "So what (price ranges)"],
  F9_WATCH_COLUMNS: ["KPI", "Threshold (good / bad)"],
  F9_THESIS_IMPACT_COLUMNS: ["Tab", "Effect", "Why"],
  F10_SCENARIO_COLUMNS: ["Lens", "Scenario", "Price", "vs now", "What it tells you"],
  F11_LEIBOWITZ_COLUMNS: ["k \\\\ R", "R {rates…}", "Today %"],
  F12_COST_SPLIT_COLUMNS: ["Item", "Value", "Method"],
  F12_REVENUE_SCENARIO_COLUMNS: ["Revenue Δ", "Revenue", "EBITDA", "Margin", "EBIT", "PAT", "EPS {cur}", "Value {cur}"],
  F12_MARGIN_SHOCK_COLUMNS: ["EBITDA margin", "EPS", "Value @{Nx}"],
  F14_EXTENSION_METER_COLUMNS: ["", ""],
  F14_STAGED_ENTRY_COLUMNS: ["", "", "", ""],
  F15_CONSENSUS_COLUMNS: ["Metric", "Value", "Note"],
  F15_CALLS_COLUMNS: ["Date", "Broker", "Type", "Rating", "Target", "Upside", "Thesis / estimates", "Status", "Source"],
  F15_TREND_COLUMNS: ["Date", "Rating", "Target", "Move"],
  F15_STREET_VS_OURS_COLUMNS: ["Topic", "Street", "Ours"],
  F15_WHAT_THEY_KNOW_COLUMNS: ["Item", "Why it matters"],
};

const tbl = (title: string, columns: readonly string[], rows: string[][] = []) => ({ title, columns: [...columns], rows });
const U = "U";
const gaps = {
  sources: ["U"],
  estDefinition: "EST = my estimate. U = unknown.",
  gaps: ["All data missing (stub)."],
  disclaimer: "Paper analysis only, not advice.",
};
const base = () => ({ leadTitle: U, takeaways: [U], sourcesAndGaps: gaps });

const F2_CATEGORIES = [
  "Cash conversion",
  "Receivables, WC & inventory",
  "Leverage & debt service",
  "Earnings quality & one-offs",
  "Growth / order-book quality",
  "External watchers",
  "Integrity, capital & related parties",
];
const INVESTORS = ["Buffett & Munger", "Terry Smith", "Greenblatt", "Sleep & Zakaria", "Raamdeo Agrawal", "Fisher", "Druckenmiller"];
const LENSES = [
  "Government / policy",
  "Regulator / safety",
  "Customers",
  "Suppliers",
  "Employees",
  "Lenders / capital",
  "Community & environment",
  "Competitors / entrants",
];

const c = EXPECTED_COLUMNS;

/** Minimal valid report: every section present, every unknown marked U or gap. */
function stub() {
  return {
    schema: "dl-equity-report/v1",
    chrome: {
      kicker: "EQUITY RESEARCH · U · AS OF U · PAPER ANALYSIS ONLY, NOT ADVICE",
      companyLine: "Stub Co (NASDAQ: STUB)",
      thesis: U,
      ratingPaper: U,
      target: U,
      price: U,
      tabs: [
        "F1 Summary",
        "F2 Forensic & BS",
        "F3 Scorecard",
        "F4 Management",
        "F5 Sentiment",
        "F6 Business",
        "F7 Financials",
        "F8 Growth/ROCE",
        "F9 Calls",
        "F10 Price ranges",
        "F11 Franchise",
        "F12 Cost & downside",
        "F13 Investors' lens",
        "F14 Execution",
        "F15 Sell-side",
        "F16 Stakeholders",
        "F17 Your research (uploaded)",
      ],
    },
    footer: {
      disclaimer: "Paper analysis only, not advice.",
      asOfIst: U,
      priceDate: U,
      sourcesSummary: U,
      estUDisclaimer: "EST = estimate; U = unknown.",
    },
    panels: {
      f1: { ...base(), topInsights: [U, U, U] },
      f2: {
        ...base(),
        combinedVerdict: U,
        deduplicationNote: U,
        stress: { headline: U, why: U, tally: "31 checks: 0 RED · 0 AMBER · 0 GREEN · 31 not checked" },
        categories: F2_CATEGORIES.map((name) => ({
          name,
          counts: { r: 0, a: 0, g: 0, u: 0 },
          summary: U,
          checks: tbl("Checks", c.F2_CHECK_COLUMNS),
        })),
        dataGaps: tbl("DATA GAPS · 1 CHECKS NOT SCORED", c.F2_DATA_GAPS_COLUMNS, [["1.1", "3-yr CFO/PAT", "Cash conversion", "gap"]]),
      },
      f3: { ...base(), scorecard: tbl("SCORECARD (EST)", c.F3_SCORECARD_COLUMNS) },
      f4: {
        ...base(),
        ownership: tbl("OWNERSHIP", c.F4_OWNERSHIP_COLUMNS),
        managementChange: { banner: "MANAGEMENT CHANGE & CULTURE · VERDICT: U · public data only, not advice", summary: U },
        changeLog: tbl("KEY-PERSON CHANGE LOG (U)", c.F4_CHANGE_LOG_COLUMNS),
        signalStrip: tbl("SIGNAL STRIP", c.F4_SIGNAL_STRIP_COLUMNS),
        cultureStrip: tbl("CULTURE STRIP (checked U)", c.F4_CULTURE_STRIP_COLUMNS),
        literature: [U],
      },
      f5: {
        ...base(),
        themeBanner: "INDUSTRY / THEME SENTIMENT · U · U",
        themeMood: U,
        plainRead: U,
        themeStrip: tbl("THEME STRIP (EST where marked)", c.F5_THEME_STRIP_COLUMNS),
        narratives: [U, U, U],
        methodNote: U,
        stockMood: tbl("STOCK MOOD (U)", c.F5_STOCK_MOOD_COLUMNS),
      },
      f6: {
        ...base(),
        bottomUp: tbl("FY27E BOTTOM-UP REVENUE ($ mn, EST)", c.F6_BOTTOM_UP_COLUMNS),
        orderBook: tbl("ORDER BOOK (U)", c.F6_ORDER_BOOK_COLUMNS),
        structure: tbl("STUB STRUCTURE", c.F6_STRUCTURE_COLUMNS),
      },
      f7: { ...base(), pl: tbl("P&L ($ mn, consolidated)", c.F7_PL_COLUMNS) },
      f8: { ...base(), returns: tbl("RETURNS", c.F8_RETURNS_COLUMNS) },
      f9: {
        ...base(),
        keyTakeawaysNote: U,
        guidance: tbl("KEY TAKEAWAYS", c.F9_GUIDANCE_COLUMNS),
        delta: { new: [U], droppedOrGoneQuiet: [U], guidanceRaisedCut: [U] },
        language: {
          confidenceScore: U,
          confidenceNote: U,
          hedgingVsCertainty: U,
          evasiveAnswers: [U],
          analystPushbackTopics: [U],
        },
        callLanguageScorecard: { reading: U, note: U },
        whatToWatch: tbl("WHAT TO WATCH NEXT QUARTER", c.F9_WATCH_COLUMNS),
        thesisImpact: tbl("THESIS IMPACT", c.F9_THESIS_IMPACT_COLUMNS),
      },
      f10: {
        ...base(),
        rewardRisk: { strip: "Reward : risk U", detail: U },
        scenarios: tbl("SCENARIOS: one row per independent lens", c.F10_SCENARIO_COLUMNS),
        priceLadder: [{ label: "◆ CURRENT PRICE", value: U }],
        whatWouldNeedToHappen: [U],
        weightedTarget: U,
        methodDetail: U,
      },
      f11: { ...base(), grid: tbl("LEIBOWITZ GRID (U)", ["k \\\\ R", "R U%", "Today %"]) },
      f12: {
        ...base(),
        costSplit: tbl("COST SPLIT (EST)", c.F12_COST_SPLIT_COLUMNS),
        revenueScenarios: tbl("REVENUE SCENARIOS ON TTM COST STRUCTURE ($ mn, EST; value at 30x)", ["Revenue Δ", "Revenue", "EBITDA", "Margin", "EBIT", "PAT", "EPS $", "Value $"]),
        marginShock: tbl("MARGIN SHOCK (revenue held at TTM)", ["EBITDA margin", "EPS", "Value @30x"]),
      },
      f13: {
        ...base(),
        leadTitle: "Investors' lens: 0 would buy / 0 watchlist / 0 pass",
        consensus: { wouldBuy: 0, watchlist: 0, pass: 0, note: U },
        keyDisagreement: U,
        tieBreaker: U,
        investors: INVESTORS.map((name) => ({ name, stance: U, criteriaLine: U, criteria: [], quote: U })),
        methodologyNote: U,
      },
      f14: {
        ...base(),
        state: U,
        priceLine: U,
        todaysAction: U,
        extensionMeter: tbl("EXTENSION METER", c.F14_EXTENSION_METER_COLUMNS),
        stagedEntry: tbl("STAGED ENTRY (3 TRANCHES)", c.F14_STAGED_ENTRY_COLUMNS),
        size: U,
        rules: [{ label: U, text: U }],
        frameworkNote: U,
      },
      f15: {
        ...base(),
        consensusStrip: tbl("CONSENSUS STRIP · HEADLINE-LEVEL, REPORTS NOT READ IN FULL · price U", c.F15_CONSENSUS_COLUMNS),
        calls: tbl("CALLS FOUND (U)", c.F15_CALLS_COLUMNS),
        trend: tbl("TREND (U TARGET HISTORY)", c.F15_TREND_COLUMNS),
        streetVsOurs: tbl("STREET VS OUR VIEW", c.F15_STREET_VS_OURS_COLUMNS),
        whatTheyMayKnow: tbl("WHAT THEY MAY KNOW THAT WE DO NOT", c.F15_WHAT_THEY_KNOW_COLUMNS),
        searchNote: U,
      },
      f16: {
        ...base(),
        stripBanner: "STAKEHOLDER STRIP · base P/E ~Ux · EST, not advice",
        adjustedMultiple: U,
        topHiddenRisks: [U],
        lenses: LENSES.map((name) => ({ name, flag: "NO DATA", multiple: U, who: U, evidence: U, hiddenRisk: U })),
        wantsNote: U,
      },
      f17: { kind: "upload_placeholder" },
    },
  };
}

function expectRejected(mutate: (r: ReturnType<typeof stub>) => void, pathFragment: string) {
  const report = stub();
  mutate(report);
  const result = parseDlEquityReportV1(report);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors.join("\n")).toContain(pathFragment);
}

describe("frozen constants", () => {
  it("exports the schema literal", () => {
    expect(DL_EQUITY_REPORT_SCHEMA).toBe("dl-equity-report/v1");
  });

  it("keeps the F1–F17 tab labels in spec order", () => {
    expect([...DL_TAB_LABELS]).toEqual(stub().chrome.tabs);
  });

  it("keeps F2 categories, F13 roster and F16 lenses in spec order", () => {
    expect([...v1.F2_CATEGORY_NAMES]).toEqual(F2_CATEGORIES);
    expect([...v1.F13_INVESTOR_NAMES]).toEqual(INVESTORS);
    expect([...v1.F16_LENS_NAMES]).toEqual(LENSES);
  });

  it.each(Object.entries(EXPECTED_COLUMNS))("%s matches the source table header", (name, expected) => {
    expect([...(v1 as unknown as Record<string, readonly string[]>)[name]]).toEqual(expected);
  });

  it("freezes all 31 observed F2 check IDs, including the 5 from DATA GAPS", () => {
    expect(v1.F2_CHECK_IDS).toHaveLength(31);
    expect(v1.F2_CHECK_IDS).toEqual(expect.arrayContaining(["1.1", "7.11", "6.2", "7.1", "7.5", "7.6", "7.9"]));
  });
});

describe("parseDlEquityReportV1", () => {
  it("accepts a minimal stub with U/gap placeholders", () => {
    const result = parseDlEquityReportV1(stub());
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok && result.data.panels.f17).toEqual({ kind: "upload_placeholder" });
  });

  it("accepts source-shaped rows, including the OLECTRA F11 and F12 templated headers", () => {
    const report = stub();
    report.panels.f2.categories[0].checks.rows = [["1.1", "3-yr CFO/PAT", "≥0.7x G / <0.5x R", "GREEN", "0.97x"]];
    report.panels.f11.grid = tbl("LEIBOWITZ GRID (E = ₹180 cr)", ["k \\\\ R", "R 15%", "R 21%", "R 26%", "Today %"], [["11%", "G 10.9", "G 3.6", "G 2.7", "21%"]]);
    report.panels.f12.marginShock.columns[2] = "Value @30x";
    report.panels.f4.signalStrip.rows = [["Auditor change", "DATA GAP", "NO DATA"]];
    expect(parseDlEquityReportV1(report)).toMatchObject({ ok: true });
  });

  it("accepts real-format chrome and F16 multiples", () => {
    const report = stub();
    report.chrome.kicker = "EQUITY RESEARCH · EV & E-BUS · AS OF 2 Nov 2026 IST · PAPER ANALYSIS ONLY, NOT ADVICE";
    report.chrome.companyLine = "Olectra Greentech Ltd (NSE: OLECTRA)";
    report.chrome.ratingPaper = "HOLD";
    report.chrome.target = "₹1,123";
    report.chrome.price = "₹951 (30 Oct 2026)";
    report.panels.f16.lenses[0].multiple = "multiple −3x (EST)";
    report.panels.f16.lenses[1].multiple = "multiple 0x (EST)";
    expect(parseDlEquityReportV1(report)).toMatchObject({ ok: true });
  });

  it.each([
    ["Apple Inc (NASDAQ: AAPL)", "$250", "$231.40 (21 Nov 2026)", "$ mn", "$"],
    ["Nestlé SA (SIX: NESN)", "CHF 98", "CHF 85.10 (21 Nov 2026)", "CHF mn", "CHF"],
    ["ASML Holding (EURONEXT: ASML)", "€820", "€701 (21 Nov 2026)", "€ mn", "€"],
    ["Tencent (HKEX: 0700)", "HK$520", "HK$455 (21 Nov 2026)", "HK$ mn", "HK$"],
    ["Toyota Motor (TSE: 7203)", "¥3,100", "¥2,840 (21 Nov 2026)", "¥ bn", "¥"],
  ])("accepts an international report: %s", (companyLine, target, price, unit, cur) => {
    const report = stub();
    Object.assign(report.chrome, { companyLine, target, price });
    report.panels.f6.bottomUp.title = `FY27E BOTTOM-UP REVENUE (${unit}, EST)`;
    report.panels.f7.pl.title = `P&L (${unit}, consolidated)`;
    report.panels.f12.revenueScenarios.title = `REVENUE SCENARIOS ON TTM COST STRUCTURE (${unit}, EST; value at 30x)`;
    report.panels.f12.revenueScenarios.columns.splice(6, 2, `EPS ${cur}`, `Value ${cur}`);
    const result = parseDlEquityReportV1(report);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("rejects malformed chrome and F16 multiples", () => {
    expectRejected((r) => void (r.chrome.kicker = "EQUITY RESEARCH · AS OF today"), "chrome.kicker");
    expectRejected((r) => void (r.chrome.companyLine = "Stub Co"), "chrome.companyLine");
    expectRejected((r) => void (r.chrome.price = "₹951"), "chrome.price");
    expectRejected((r) => void (r.chrome.price = "$951"), "chrome.price");
    expectRejected((r) => void (r.chrome.target = "251"), "chrome.target");
    expectRejected((r) => void (r.panels.f7.pl.title = "P&L (mn, consolidated)"), "panels.f7.pl.title");
    expectRejected((r) => void (r.panels.f12.revenueScenarios.columns[6] = "EPS"), "panels.f12.revenueScenarios.columns");
    expectRejected((r) => void (r.panels.f16.lenses[0].multiple = "−3x"), "panels.f16.lenses.0.multiple");
  });

  it.each([null, "x", 1, [], {}])("rejects non-report input %j with readable errors", (input) => {
    const result = parseDlEquityReportV1(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a wrong schema string", () => {
    expectRejected((r) => void (r.schema = "dl-equity-report/v2"), "schema");
  });

  it("rejects a missing f17", () => {
    expectRejected((r) => void delete (r.panels as Partial<typeof r.panels>).f17, "panels.f17");
  });

  it("rejects fabricated research in f17", () => {
    expectRejected((r) => void ((r.panels.f17 as Record<string, unknown>).body = "invented"), "panels.f17");
  });

  it("rejects unknown fields anywhere, so invented sections cannot slip in", () => {
    expectRejected((r) => void ((r.panels as Record<string, unknown>).f18 = {}), "panels");
    expectRejected((r) => void ((r.panels.f3 as Record<string, unknown>).extra = "x"), "panels.f3");
  });

  it("rejects renamed or reordered tabs", () => {
    expectRejected((r) => void (r.chrome.tabs[0] = "F1 Overview"), "chrome.tabs");
    expectRejected((r) => void r.chrome.tabs.reverse(), "chrome.tabs");
  });

  it("rejects a renamed column", () => {
    expectRejected((r) => void (r.panels.f3.scorecard.columns[0] = "Models"), "panels.f3.scorecard.columns");
  });

  it("rejects a renamed table heading", () => {
    expectRejected((r) => void (r.panels.f3.scorecard.title = "SCORECARD"), "panels.f3.scorecard.title");
  });

  it("rejects bad templated F11 and F12 headers", () => {
    expectRejected((r) => void (r.panels.f11.grid.columns = ["k \\\\ R", "Today %"]), "panels.f11.grid.columns");
    expectRejected((r) => void (r.panels.f12.marginShock.columns[2] = "Value"), "panels.f12.marginShock.columns");
  });

  it("rejects rows that do not fit the columns", () => {
    expectRejected((r) => void (r.panels.f3.scorecard.rows = [["only one cell"]]), "panels.f3.scorecard.rows.0");
  });

  it("rejects blank cells, because missing data must be marked U or gap", () => {
    expectRejected((r) => void (r.panels.f3.scorecard.rows = [["Altman Z", " ", "x"]]), "panels.f3.scorecard.rows.0.1");
  });

  it("rejects an F2 verdict outside GREEN/AMBER/RED", () => {
    expectRejected((r) => void (r.panels.f2.categories[0].checks.rows = [["1.1", "x", "x", "U", "x"]]), "Verdict");
  });

  it("rejects an invented F2 check ID in checks and data gaps", () => {
    expectRejected((r) => void (r.panels.f2.categories[0].checks.rows = [["9.9", "x", "x", "RED", "x"]]), "#");
    expectRejected((r) => void (r.panels.f2.dataGaps.rows = [["9.9", "x", "Cash conversion", "x"]]), "#");
  });

  it("rejects a data gap filed under an unknown F2 category", () => {
    expectRejected((r) => void (r.panels.f2.dataGaps.rows = [["1.1", "x", "Cash", "x"]]), "Category");
  });

  it("rejects F2 categories out of order", () => {
    expectRejected((r) => void r.panels.f2.categories.reverse(), "panels.f2.categories");
  });

  it("rejects a changed F13 roster", () => {
    expectRejected((r) => void (r.panels.f13.investors[0].name = "Peter Lynch"), "panels.f13.investors");
  });

  it("rejects F13 criterion marks other than ✓ ◐ ✗", () => {
    expectRejected(
      (r) => void ((r.panels.f13.investors[0].criteria as unknown[]) = [{ mark: "?", label: "x", evidence: "x" }]),
      "panels.f13.investors.0.criteria.0.mark",
    );
  });

  it("rejects an F16 lens list that is reordered or short", () => {
    expectRejected((r) => void r.panels.f16.lenses.reverse(), "panels.f16.lenses");
    expectRejected((r) => void r.panels.f16.lenses.pop(), "panels.f16.lenses");
  });

  it("rejects a missing or altered disclaimer", () => {
    expectRejected((r) => void (r.footer.disclaimer = "Not advice."), "footer.disclaimer");
    expectRejected((r) => void (r.panels.f1.sourcesAndGaps = { ...gaps, disclaimer: "" }), "panels.f1.sourcesAndGaps.disclaimer");
  });

  it("rejects a reward:risk strip with an unknown label", () => {
    expectRejected((r) => void (r.panels.f10.rewardRisk.strip = "Reward : risk 2x · GREAT"), "panels.f10.rewardRisk.strip");
    const report = stub();
    report.panels.f10.rewardRisk.strip = "Reward : risk 0.76x · ASYMMETRIC UNFAVOURABLE";
    expect(parseDlEquityReportV1(report)).toMatchObject({ ok: true });
  });

  it("rejects a price ladder without the current-price mark", () => {
    expectRejected((r) => void (r.panels.f10.priceLadder = [{ label: "Bull", value: "₹1" }]), "panels.f10.priceLadder");
  });

  it("rejects a rating outside BUY/HOLD/REDUCE/U", () => {
    expectRejected((r) => void (r.chrome.ratingPaper = "STRONG BUY"), "chrome.ratingPaper");
  });
});

const loadFixture = (name: string) => JSON.parse(readFileSync(join("fixtures", `${name}-v1.json`), "utf8"));

describe.each(["olectra", "hfcl", "xss-probe"])("fixtures/%s-v1.json", (name) => {
  it("parses, with F1–F16 present and F17 as the upload slot", () => {
    const result = parseDlEquityReportV1(loadFixture(name));
    expect(result.ok ? [] : result.errors).toEqual([]);
    if (!result.ok) return;
    expect(Object.keys(result.data.panels)).toEqual(DL_TAB_LABELS.map((_, i) => `f${i + 1}`));
    expect(result.data.panels.f17).toEqual({ kind: "upload_placeholder" });
  });

  it("fails when malformed", () => {
    const report = loadFixture(name);
    delete report.panels.f7;
    expect(parseDlEquityReportV1(report)).toMatchObject({ ok: false });
    expect(parseDlEquityReportV1({ ...loadFixture(name), schema: "dl-equity-report/v0" })).toMatchObject({ ok: false });
  });
});

describe("fixture content", () => {
  it.each(["olectra", "hfcl"])("%s keeps the frozen column taxonomy", (name) => {
    const { panels: p } = loadFixture(name);
    expect(p.f7.pl.columns).toEqual(v1.F7_PL_COLUMNS);
    expect(p.f15.calls.columns).toEqual(v1.F15_CALLS_COLUMNS);
    for (const category of p.f2.categories) expect(category.checks.columns).toEqual(v1.F2_CHECK_COLUMNS);
    expect(p.f2.dataGaps.columns).toEqual(v1.F2_DATA_GAPS_COLUMNS);
  });

  it.each(["olectra", "hfcl"])("%s F2 counts agree with its check rows and DATA GAPS", (name) => {
    const { f2 } = loadFixture(name).panels;
    const ids = (rows: string[][]) => rows.map((r) => r[0]);
    let unknown = 0;
    for (const { counts, checks } of f2.categories) {
      const of = (verdict: string) => checks.rows.filter((r: string[]) => r[3] === verdict).length;
      expect([of("RED"), of("AMBER"), of("GREEN")]).toEqual([counts.r, counts.a, counts.g]);
      unknown += counts.u;
    }
    expect(f2.dataGaps.rows).toHaveLength(unknown);
    const scored = f2.categories.flatMap((c: { checks: { rows: string[][] } }) => ids(c.checks.rows));
    expect(new Set([...scored, ...ids(f2.dataGaps.rows)]).size).toBe(31);
  });

  it("stores the OLECTRA reward:risk values as captured and U for the missing chrome", () => {
    const { chrome, footer, panels } = loadFixture("olectra");
    expect(panels.f10.rewardRisk.strip).toBe("Reward : risk 0.76x · ASYMMETRIC UNFAVOURABLE");
    expect(panels.f10.leadTitle).toContain("0.75x");
    expect(chrome.kicker).toBe("EQUITY RESEARCH · U · AS OF U · PAPER ANALYSIS ONLY, NOT ADVICE");
    expect(footer.asOfIst).toBe("U");
  });

  it("keeps the HFCL normalisations visible in the gaps", () => {
    const { f4, f1, f3 } = loadFixture("hfcl").panels;
    expect(f4.signalStrip.rows.map((r: string[]) => r[2])).not.toContain("GREEN (limited)");
    expect(f4.sourcesAndGaps.gaps.join(" ")).toContain("GREEN (limited)");
    expect(f1.sourcesAndGaps.gaps.join(" ")).toContain("LIVE PRICE SNAPSHOT");
    expect(f3.sourcesAndGaps.gaps.join(" ")).toContain("MODEL INPUTS & UNCERTAINTY");
  });

  it("carries the XSS strings through parsing untouched", () => {
    const result = parseDlEquityReportV1(loadFixture("xss-probe"));
    expect(result.ok && result.data.panels.f1.leadTitle).toContain("<script>");
  });

  // _reference is local-only, so this guards regeneration on the machine that has it.
  it.skipIf(!existsSync("_reference"))("invents no numbers: every figure appears in the stored source", () => {
    const numbers = (text: string) => text.match(/\d[\d,.]*\d|\d/g) ?? [];
    const panelsDir = join("_reference", "olectra-panels");
    const olectra = readdirSync(panelsDir).filter((f) => f.endsWith(".txt")).map((f) => readFileSync(join(panelsDir, f), "utf8")).join("\n");
    const sources: Record<string, string> = {
      olectra: olectra + readFileSync(join("_reference", "equity-terminal-olectra-report-spec.md"), "utf8"),
      hfcl: readFileSync(join("_reference", "hfcl-research-sample.html"), "utf8"),
    };
    for (const [name, source] of Object.entries(sources)) {
      const known = new Set(numbers(source));
      // Strings only: the parsed F2/F13 counts are structural and re-checked against the rows above.
      const strings: string[] = [];
      JSON.stringify(loadFixture(name), (_key, value) => (typeof value === "string" && strings.push(value), value));
      expect(strings.flatMap(numbers).filter((n) => !known.has(n))).toEqual([]);
    }
  });
});
