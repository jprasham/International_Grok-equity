/**
 * Contract for `dl-equity-report/v1`, taken from the OLECTRA reference
 * (_reference/equity-terminal-olectra-report-spec.md and _reference/olectra-panels).
 * International edition: money fields take any currency (see CURRENCY) and the
 * company line takes any exchange. Taxonomy changes need a v2 schema.
 *
 * Conventions: cells are plain strings. Estimates carry `EST` in the text and
 * unknowns are `U` or a gap note, never a blank.
 */
import { z } from "zod";

const SYMBOL = String.raw`[A-Z]{0,3}[$€£¥₹₩]`; // $, US$, HK$, €, £, ¥, ₹, ₩
const CODE = "[A-Z]{3}"; // CHF, EUR, USD
/** A currency on its own, as in column headers: `$`, `HK$`, `CHF`. */
const CURRENCY_TOKEN = `(?:${SYMBOL}|${CODE})`;
/** A currency before an amount: `$1,234`, `HK$98`, `CHF 85`. Codes need the space. */
export const CURRENCY = `(?:${SYMBOL}|${CODE} )`;
/** A money table unit such as `$ mn`, `€ mn`, `CHF mn` or `₹ cr`. The bot contract asks for `mn`. */
const UNIT = `${CURRENCY_TOKEN} [a-z]+`;

/** The first amount after a currency prefix, as a number: `$1,234.5` → 1234.5. */
export function parseAmount(value: string): number | null {
  const match = value.match(new RegExp(String.raw`${CURRENCY}\s*(\d[\d,]*(?:\.\d+)?)`));
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

export const DL_EQUITY_REPORT_SCHEMA = "dl-equity-report/v1" as const;
export const DL_DISCLAIMER = "Paper analysis only, not advice." as const;

export const DL_TAB_LABELS = [
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
] as const;

export const F2_CATEGORY_NAMES = [
  "Cash conversion",
  "Receivables, WC & inventory",
  "Leverage & debt service",
  "Earnings quality & one-offs",
  "Growth / order-book quality",
  "External watchers",
  "Integrity, capital & related parties",
] as const;

/** Spec's 26 scored IDs plus the 5 that only appear in the panel's DATA GAPS table (6.2, 7.1, 7.5, 7.6, 7.9). */
export const F2_CHECK_IDS = [
  "1.1", "1.2", "1.3", "7.10",
  "2.1", "2.2", "2.3", "3.1",
  "4.1", "4.2", "4.3", "4.4", "4.5", "7.2",
  "6.1", "6.3", "6.5", "6.2", "7.1",
  "6.4",
  "5.1", "5.2", "7.4", "7.7", "7.5", "7.6",
  "5.3", "7.3", "7.8", "7.11", "7.9",
] as const;

export const F13_INVESTOR_NAMES = [
  "Buffett & Munger",
  "Terry Smith",
  "Greenblatt",
  "Sleep & Zakaria",
  "Raamdeo Agrawal",
  "Fisher",
  "Druckenmiller",
] as const;

export const F16_LENS_NAMES = [
  "Government / policy",
  "Regulator / safety",
  "Customers",
  "Suppliers",
  "Employees",
  "Lenders / capital",
  "Community & environment",
  "Competitors / entrants",
] as const;

export const F2_VERDICTS = ["GREEN", "AMBER", "RED"] as const;
export const DL_FLAGS = ["GREEN", "AMBER", "RED", "NO DATA"] as const;
export const DL_RATINGS = ["BUY", "HOLD", "REDUCE", "U"] as const;
export const F13_STANCES = ["BUY", "WATCHLIST", "PASS", "U"] as const;
export const F13_MARKS = ["✓", "◐", "✗"] as const;

/** Fixed headings for prose sections. Table headings live in each table's `title`. */
export const DL_HEADINGS = {
  sourcesAndGaps: "SOURCES & GAPS",
  f1TopInsights: "TOP 3 INSIGHTS",
  f2Banner: "FORENSIC & BALANCE SHEET · COMBINED VERDICT",
  f2SubTabs: "SUB-TABS", // label only: the source grid is empty, so no button names exist to freeze
  f2CategoryScorecard: "CATEGORY SCORECARD · TAP A ROW FOR ITS CHECKS",
  f4Literature: "WHAT THE LITERATURE SAYS",
  f5Narratives: "3 NARRATIVES ON X AND IN THE NEWS",
  f9Delta: "(A) DELTA VS LAST CALL",
  f9DeltaNew: "NEW",
  f9DeltaDropped: "DROPPED / GONE QUIET",
  f9DeltaGuidance: "GUIDANCE RAISED / CUT",
  f9Language: "(B) LANGUAGE SIGNALS",
  f9Hedging: "HEDGING VS CERTAINTY",
  f9Evasive: "EVASIVE ANSWERS",
  f9Pushback: "ANALYST PUSHBACK TOPICS",
  f9Scorecard: "CALL LANGUAGE SCORECARD",
  f9Actionable: "(C) ACTIONABLE",
  f10PriceLadder: "PRICE LADDER",
  f10CurrentPrice: "◆ CURRENT PRICE",
  f10WhatWouldNeedToHappen: "WHAT WOULD NEED TO HAPPEN",
  f10MethodDetail: "Method detail",
  f13Consensus: "CONSENSUS",
  f13Legend: "✓ pass · ◐ partial · ✗ fail",
  f14Rules: "RULES (ART OF EXECUTION)",
} as const;

export const F2_CHECK_COLUMNS = ["#", "Check", "Threshold", "Verdict", "Evidence"] as const;
export const F2_DATA_GAPS_COLUMNS = ["#", "Check", "Category", "What is missing"] as const;
export const F3_SCORECARD_COLUMNS = ["Model", "Score", "Read"] as const;
export const F4_OWNERSHIP_COLUMNS = ["Item", "Value"] as const;
export const F4_CHANGE_LOG_COLUMNS = ["Date", "Person", "Role", "In/Out", "Stated reason / profile", "AR 0/+1", "AR 20d"] as const;
export const F4_SIGNAL_STRIP_COLUMNS = ["Signal", "Reading", "Flag"] as const;
export const F4_CULTURE_STRIP_COLUMNS = ["Source", "Reading", "Note"] as const;
export const F5_THEME_STRIP_COLUMNS = ["Signal", "Reading", "Read"] as const;
export const F5_STOCK_MOOD_COLUMNS = ["Signal", "Reading"] as const;
// ponytail: FY labels are frozen as captured; FY-roll breaks validation, so bump to v2 when FY28 reports start.
export const F6_BOTTOM_UP_COLUMNS = ["Line", "FY27E", "Basis"] as const;
export const F6_ORDER_BOOK_COLUMNS = ["Order", "Size", "Delivered", "Status"] as const;
export const F6_STRUCTURE_COLUMNS = ["Entity", "Role"] as const;
/** First header is blank in the source (metric names). */
export const F7_PL_COLUMNS = ["", "FY23", "FY24", "FY25", "FY26", "TTM", "FY27E", "FY28E"] as const;
export const F8_RETURNS_COLUMNS = ["Metric", "Value"] as const;
/** First header is blank in the source (direction arrow). */
export const F9_GUIDANCE_COLUMNS = ["", "What was said", "Number", "Tag", "So what (price ranges)"] as const;
export const F9_WATCH_COLUMNS = ["KPI", "Threshold (good / bad)"] as const;
export const F9_THESIS_IMPACT_COLUMNS = ["Tab", "Effect", "Why"] as const;
export const F10_SCENARIO_COLUMNS = ["Lens", "Scenario", "Price", "vs now", "What it tells you"] as const;
/** Template: `R {rates…}` is one or more issuer-specific columns such as `R 21%`. The double backslash is in the source. */
export const F11_LEIBOWITZ_COLUMNS = ["k \\\\ R", "R {rates…}", "Today %"] as const;
export const F12_COST_SPLIT_COLUMNS = ["Item", "Value", "Method"] as const;
/** Template: `{cur}` is the report currency, such as `EPS $` / `Value $`. */
export const F12_REVENUE_SCENARIO_COLUMNS = ["Revenue Δ", "Revenue", "EBITDA", "Margin", "EBIT", "PAT", "EPS {cur}", "Value {cur}"] as const;
/** Template: `{Nx}` is the issuer-specific multiple, such as `Value @30x`. */
export const F12_MARGIN_SHOCK_COLUMNS = ["EBITDA margin", "EPS", "Value @{Nx}"] as const;
/** Headerless in the source, so no names are invented. Positions: metric, reading. */
export const F14_EXTENSION_METER_COLUMNS = ["", ""] as const;
/** Headerless in the source, so no names are invented. Positions: tranche + size%, price band, timing, rationale. */
export const F14_STAGED_ENTRY_COLUMNS = ["", "", "", ""] as const;
export const F15_CONSENSUS_COLUMNS = ["Metric", "Value", "Note"] as const;
export const F15_CALLS_COLUMNS = ["Date", "Broker", "Type", "Rating", "Target", "Upside", "Thesis / estimates", "Status", "Source"] as const;
export const F15_TREND_COLUMNS = ["Date", "Rating", "Target", "Move"] as const;
export const F15_STREET_VS_OURS_COLUMNS = ["Topic", "Street", "Ours"] as const;
export const F15_WHAT_THEY_KNOW_COLUMNS = ["Item", "Why it matters"] as const;

const text = z.string().refine((s) => s.trim() !== "", { error: "must not be blank; use U or a gap note" });
const textList = z.array(text).min(1);

const sameStrings = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((s, i) => s === b[i]);

const exactStrings = (expected: readonly string[]) =>
  z
    .array(z.string())
    .refine((actual) => sameStrings(actual, expected), { error: `must be exactly, in order: ${expected.join(" | ")}` })
    .readonly();

/** Items whose `name` values must match the frozen roster exactly, in order. */
const namedInOrder = <T extends { name: string }>(item: z.ZodType<T>, names: readonly string[]) =>
  z.array(item).refine((items) => sameStrings(items.map((i) => i.name), names), {
    error: `names must be exactly, in order: ${names.join(" | ")}`,
  });

function table(title: string | RegExp, columns: z.ZodType<readonly string[]>, allowedCells: Record<string, readonly string[]> = {}) {
  return z
    .strictObject({
      title: typeof title === "string" ? z.literal(title) : z.string().regex(title),
      columns,
      rows: z.array(z.array(text)),
    })
    .superRefine((value, ctx) => {
      value.rows.forEach((row, r) => {
        if (row.length !== value.columns.length) {
          ctx.addIssue({ code: "custom", path: ["rows", r], message: `expected ${value.columns.length} cells, got ${row.length}` });
        }
        for (const [column, allowed] of Object.entries(allowedCells)) {
          const c = value.columns.indexOf(column);
          if (c >= 0 && row[c] !== undefined && !allowed.includes(row[c])) {
            ctx.addIssue({ code: "custom", path: ["rows", r, c], message: `${column} must be one of: ${allowed.join(", ")}` });
          }
        }
      });
    });
}

export const SourcesAndGapsSchema = z.strictObject({
  sources: textList,
  estDefinition: text,
  gaps: textList,
  disclaimer: z.literal(DL_DISCLAIMER),
});

export const ChromeSchema = z.strictObject({
  kicker: z.string().regex(/^EQUITY RESEARCH · .+ · AS OF .+ · PAPER ANALYSIS ONLY, NOT ADVICE$/),
  companyLine: z.string().regex(/^.+ \([A-Z][A-Z0-9 ]*: [^\s)]+\)$/),
  thesis: text,
  ratingPaper: z.enum(DL_RATINGS),
  target: z.string().regex(new RegExp(`^(${CURRENCY}.+|U)$`)),
  price: z.string().regex(new RegExp(`^(${CURRENCY}.+ \\(.+\\)|U)$`)),
  tabs: exactStrings(DL_TAB_LABELS),
});

export const FooterSchema = z.strictObject({
  disclaimer: z.literal(DL_DISCLAIMER),
  asOfIst: text,
  priceDate: text,
  sourcesSummary: text,
  estUDisclaimer: text,
});

/** Every F1–F16 source panel opens with a lead title and numbered takeaways, and ends with SOURCES & GAPS. */
const panelBase = { leadTitle: text, takeaways: textList, sourcesAndGaps: SourcesAndGapsSchema };

export const F1Schema = z.strictObject({ ...panelBase, topInsights: z.array(text).length(3) });

export const F2Schema = z.strictObject({
  ...panelBase,
  combinedVerdict: text,
  deduplicationNote: text,
  stress: z.strictObject({
    headline: text,
    why: text,
    tally: z.string().regex(/^\d+ checks: \d+ RED · \d+ AMBER · \d+ GREEN · \d+ not checked/),
  }),
  categories: namedInOrder(
    z.strictObject({
      name: text,
      counts: z.strictObject({ r: z.number().int().min(0), a: z.number().int().min(0), g: z.number().int().min(0), u: z.number().int().min(0) }),
      summary: text,
      // Unscored checks belong in dataGaps, so a check row's Verdict is never U.
      checks: table(/\S/, exactStrings(F2_CHECK_COLUMNS), { "#": F2_CHECK_IDS, Verdict: F2_VERDICTS }),
    }),
    F2_CATEGORY_NAMES,
  ),
  dataGaps: table(/^DATA GAPS · \d+ CHECKS NOT SCORED$/, exactStrings(F2_DATA_GAPS_COLUMNS), {
    "#": F2_CHECK_IDS,
    Category: F2_CATEGORY_NAMES,
  }),
});

export const F3Schema = z.strictObject({ ...panelBase, scorecard: table("SCORECARD (EST)", exactStrings(F3_SCORECARD_COLUMNS)) });

export const F4Schema = z.strictObject({
  ...panelBase,
  ownership: table("OWNERSHIP", exactStrings(F4_OWNERSHIP_COLUMNS)),
  managementChange: z.strictObject({
    banner: z.string().regex(/^MANAGEMENT CHANGE & CULTURE · VERDICT: .+ · public data only, not advice$/),
    summary: text,
  }),
  changeLog: table(/^KEY-PERSON CHANGE LOG \(.+\)$/, exactStrings(F4_CHANGE_LOG_COLUMNS)),
  signalStrip: table("SIGNAL STRIP", exactStrings(F4_SIGNAL_STRIP_COLUMNS), { Flag: DL_FLAGS }),
  cultureStrip: table(/^CULTURE STRIP \(checked .+\)$/, exactStrings(F4_CULTURE_STRIP_COLUMNS)),
  literature: textList,
});

export const F5Schema = z.strictObject({
  ...panelBase,
  themeBanner: z.string().regex(/^INDUSTRY \/ THEME SENTIMENT · .+ · .+$/),
  themeMood: text,
  plainRead: text,
  themeStrip: table("THEME STRIP (EST where marked)", exactStrings(F5_THEME_STRIP_COLUMNS)),
  narratives: z.array(text).length(3),
  methodNote: text,
  stockMood: table(/^STOCK MOOD \(.+\)$/, exactStrings(F5_STOCK_MOOD_COLUMNS)),
});

export const F6Schema = z.strictObject({
  ...panelBase,
  bottomUp: table(new RegExp(`^FY27E BOTTOM-UP REVENUE \\(${UNIT}, EST\\)$`), exactStrings(F6_BOTTOM_UP_COLUMNS)),
  orderBook: table(/^ORDER BOOK \(.+\)$/, exactStrings(F6_ORDER_BOOK_COLUMNS)),
  structure: table(/^.+ STRUCTURE$/, exactStrings(F6_STRUCTURE_COLUMNS)), // spec: `EVEY / MEIL STRUCTURE` or issuer-specific
});

export const F7Schema = z.strictObject({ ...panelBase, pl: table(new RegExp(`^P&L \\(${UNIT}, consolidated\\)$`), exactStrings(F7_PL_COLUMNS)) });

export const F8Schema = z.strictObject({ ...panelBase, returns: table("RETURNS", exactStrings(F8_RETURNS_COLUMNS)) });

export const F9Schema = z.strictObject({
  ...panelBase,
  keyTakeawaysNote: text,
  guidance: table("KEY TAKEAWAYS", exactStrings(F9_GUIDANCE_COLUMNS)), // the guidance table has no title of its own in the source
  delta: z.strictObject({ new: textList, droppedOrGoneQuiet: textList, guidanceRaisedCut: textList }),
  language: z.strictObject({
    confidenceScore: text,
    confidenceNote: text,
    hedgingVsCertainty: text,
    evasiveAnswers: textList,
    analystPushbackTopics: textList,
  }),
  callLanguageScorecard: z.strictObject({ reading: text, note: text }),
  whatToWatch: table("WHAT TO WATCH NEXT QUARTER", exactStrings(F9_WATCH_COLUMNS)),
  thesisImpact: table("THESIS IMPACT", exactStrings(F9_THESIS_IMPACT_COLUMNS)),
});

export const F10Schema = z.strictObject({
  ...panelBase,
  rewardRisk: z.strictObject({
    strip: z.string().regex(/^Reward : risk (\d+(\.\d+)?x · (ASYMMETRIC FAVOURABLE|BALANCED|ASYMMETRIC UNFAVOURABLE)|U)$/),
    detail: text,
  }),
  scenarios: table("SCENARIOS: one row per independent lens", exactStrings(F10_SCENARIO_COLUMNS)),
  priceLadder: z
    .array(z.strictObject({ label: text, value: text }))
    .refine((rungs) => rungs.some((r) => r.label === DL_HEADINGS.f10CurrentPrice), { error: `must mark ${DL_HEADINGS.f10CurrentPrice}` }),
  whatWouldNeedToHappen: textList,
  weightedTarget: text,
  methodDetail: text,
});

export const F11Schema = z.strictObject({
  ...panelBase,
  grid: table(
    /^LEIBOWITZ GRID \(.+\)$/,
    z
      .array(z.string())
      .refine(
        (c) => c.length >= 3 && c[0] === F11_LEIBOWITZ_COLUMNS[0] && c.at(-1) === F11_LEIBOWITZ_COLUMNS[2] && c.slice(1, -1).every((h) => /^R .+%$/.test(h)),
        { error: `must be: ${F11_LEIBOWITZ_COLUMNS.join(" | ")}` },
      )
      .readonly(),
  ),
});

export const F12Schema = z.strictObject({
  ...panelBase,
  costSplit: table("COST SPLIT (EST)", exactStrings(F12_COST_SPLIT_COLUMNS)),
  revenueScenarios: table(
    new RegExp(`^REVENUE SCENARIOS ON TTM COST STRUCTURE \\(${UNIT}, EST; value at .+x\\)$`),
    z
      .array(z.string())
      .refine(
        (c) =>
          c.length === 8 &&
          sameStrings(c.slice(0, 6), F12_REVENUE_SCENARIO_COLUMNS.slice(0, 6)) &&
          new RegExp(`^EPS ${CURRENCY_TOKEN}$`).test(c[6]) &&
          new RegExp(`^Value ${CURRENCY_TOKEN}$`).test(c[7]),
        { error: `must be: ${F12_REVENUE_SCENARIO_COLUMNS.join(" | ")}` },
      )
      .readonly(),
  ),
  marginShock: table(
    "MARGIN SHOCK (revenue held at TTM)",
    z
      .array(z.string())
      .refine((c) => c.length === 3 && c[0] === F12_MARGIN_SHOCK_COLUMNS[0] && c[1] === F12_MARGIN_SHOCK_COLUMNS[1] && /^Value @.+x$/.test(c[2]), {
        error: `must be: ${F12_MARGIN_SHOCK_COLUMNS.join(" | ")}`,
      })
      .readonly(),
  ),
});

export const F13Schema = z.strictObject({
  ...panelBase,
  leadTitle: z.string().regex(/\d+ would buy \/ \d+ watchlist \/ \d+ pass/),
  consensus: z.strictObject({ wouldBuy: z.number().int().min(0), watchlist: z.number().int().min(0), pass: z.number().int().min(0), note: text }),
  keyDisagreement: text,
  tieBreaker: text,
  investors: namedInOrder(
    z.strictObject({
      name: text,
      stance: z.enum(F13_STANCES),
      criteriaLine: text,
      criteria: z.array(z.strictObject({ mark: z.enum(F13_MARKS), label: text, evidence: text })),
      quote: text,
    }),
    F13_INVESTOR_NAMES,
  ),
  methodologyNote: text,
});

export const F14Schema = z.strictObject({
  ...panelBase,
  state: text,
  priceLine: text,
  todaysAction: text,
  extensionMeter: table("EXTENSION METER", exactStrings(F14_EXTENSION_METER_COLUMNS)),
  stagedEntry: table("STAGED ENTRY (3 TRANCHES)", exactStrings(F14_STAGED_ENTRY_COLUMNS)),
  size: text,
  rules: z.array(z.strictObject({ label: text, text })).min(1),
  frameworkNote: text,
});

export const F15Schema = z.strictObject({
  ...panelBase,
  consensusStrip: table(/^CONSENSUS STRIP · HEADLINE-LEVEL, REPORTS NOT READ IN FULL · price .+$/, exactStrings(F15_CONSENSUS_COLUMNS)),
  calls: table(/^CALLS FOUND \(.+\)$/, exactStrings(F15_CALLS_COLUMNS)),
  trend: table(/^TREND \(.+ TARGET HISTORY\)$/, exactStrings(F15_TREND_COLUMNS)),
  streetVsOurs: table("STREET VS OUR VIEW", exactStrings(F15_STREET_VS_OURS_COLUMNS)),
  whatTheyMayKnow: table("WHAT THEY MAY KNOW THAT WE DO NOT", exactStrings(F15_WHAT_THEY_KNOW_COLUMNS)),
  searchNote: text,
});

export const F16Schema = z.strictObject({
  ...panelBase,
  stripBanner: z.string().regex(/^STAKEHOLDER STRIP · base P\/E ~.+x · EST, not advice$/),
  adjustedMultiple: text, // must disclose the raw sum and any cap
  topHiddenRisks: textList,
  lenses: namedInOrder(
    z.strictObject({
      name: text,
      flag: z.enum(DL_FLAGS),
      multiple: z.string().regex(/^(multiple [−-]?\d+(\.\d+)?x \(EST\)|U)$/),
      who: text,
      evidence: text,
      hiddenRisk: text,
    }),
    F16_LENS_NAMES,
  ),
  wantsNote: text,
});

/** Upload slot only: the source has no F17 body, so any research field here is rejected. */
export const F17Schema = z.strictObject({ kind: z.literal("upload_placeholder") });

export const DlEquityReportV1Schema = z.strictObject({
  schema: z.literal(DL_EQUITY_REPORT_SCHEMA),
  chrome: ChromeSchema,
  footer: FooterSchema,
  panels: z.strictObject({
    f1: F1Schema,
    f2: F2Schema,
    f3: F3Schema,
    f4: F4Schema,
    f5: F5Schema,
    f6: F6Schema,
    f7: F7Schema,
    f8: F8Schema,
    f9: F9Schema,
    f10: F10Schema,
    f11: F11Schema,
    f12: F12Schema,
    f13: F13Schema,
    f14: F14Schema,
    f15: F15Schema,
    f16: F16Schema,
    f17: F17Schema,
  }),
});

export type DlEquityReportV1 = z.infer<typeof DlEquityReportV1Schema>;
export type DlChrome = z.infer<typeof ChromeSchema>;
export type DlFooter = z.infer<typeof FooterSchema>;
export type DlSourcesAndGaps = z.infer<typeof SourcesAndGapsSchema>;
export type DlTable = DlEquityReportV1["panels"]["f3"]["scorecard"];
export type DlPanels = DlEquityReportV1["panels"];

export type DlParseResult = { ok: true; data: DlEquityReportV1 } | { ok: false; errors: string[] };

export function parseDlEquityReportV1(input: unknown): DlParseResult {
  const result = DlEquityReportV1Schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`) };
}
