/**
 * Additive contract `dl-equity-report/v1.1`: everything v1 has, plus what the HFCL fit audit could not place.
 * `dl-equity-report-v1.ts` stays byte-identical and keeps validating v1, so its private helpers are repeated here.
 */
import { z } from "zod";
import {
  ChromeSchema,
  F1Schema,
  F2_CATEGORY_NAMES,
  F2_CHECK_COLUMNS,
  F2_CHECK_IDS,
  F2_DATA_GAPS_COLUMNS,
  F2Schema,
  F3Schema,
  F4Schema,
  F5Schema,
  F6Schema,
  F7Schema,
  F8Schema,
  F9Schema,
  F10Schema,
  F11Schema,
  F12Schema,
  F13Schema,
  F14_STAGED_ENTRY_COLUMNS,
  F14Schema,
  F15Schema,
  F16Schema,
  FooterSchema,
  parseAmount,
  parseDlEquityReportV1,
  SourcesAndGapsSchema,
  type DlEquityReportV1,
} from "./dl-equity-report-v1";

export const DL_EQUITY_REPORT_SCHEMA_V1_1 = "dl-equity-report/v1.1" as const;

/** Renderer-owned, so reports carry no column titles for F13 criteria. */
export const F13_CRITERIA_TITLE = "CRITERIA APPLIED" as const;
export const F13_CRITERIA_COLUMNS = ["Mark", "Criterion", "Evidence"] as const;
export const F2_SUB_TABS_LABEL = "SUB-TABS" as const;

export const F2_CHECK_VERDICTS_V1_1 = ["GREEN", "AMBER", "RED", "U"] as const;
export const F2_DATA_GAPS_THRESHOLD_COLUMNS = ["#", "Check", "Category", "Threshold", "What is missing"] as const;
export const F14_STAGED_ENTRY_NAMED_COLUMNS = ["Tranche", "Size%", "Price band", "Timing", "Rationale"] as const;

/**
 * Each panel's fixed blocks, in default (v1) order. SOURCES & GAPS is not listed: it is always rendered last,
 * so a layout can neither move it nor put anything after it.
 */
export const DL_FIXED_BLOCKS = {
  f1: ["takeaways", "topInsights"],
  f2: ["banner", "takeaways", "stress", "categories", "dataGaps"],
  f3: ["takeaways", "scorecard"],
  f4: ["takeaways", "ownership", "managementChange", "changeLog", "signalStrip", "cultureStrip", "literature"],
  f5: ["takeaways", "theme", "themeStrip", "narratives", "methodNote", "stockMood"],
  f6: ["takeaways", "bottomUp", "orderBook", "structure"],
  f7: ["takeaways", "pl"],
  f8: ["takeaways", "returns"],
  f9: ["takeaways", "guidance", "delta", "language", "callLanguageScorecard", "whatToWatch", "thesisImpact"],
  f10: ["takeaways", "rewardRisk", "scenarios", "priceLadder", "whatWouldNeedToHappen", "weightedTarget", "methodDetail"],
  f11: ["takeaways", "grid"],
  f12: ["takeaways", "costSplit", "revenueScenarios", "marginShock"],
  f13: ["takeaways", "consensus", "investors", "methodologyNote"],
  f14: ["takeaways", "status", "extensionMeter", "stagedEntry", "size", "rules", "frameworkNote"],
  f15: ["takeaways", "consensusStrip", "calls", "trend", "streetVsOurs", "whatTheyMayKnow", "searchNote"],
  f16: ["takeaways", "strip", "topHiddenRisks", "lenses", "wantsNote"],
} as const;

export type DlFixedBlocks = typeof DL_FIXED_BLOCKS;
export type DlLayoutPanel = keyof DlFixedBlocks;

const text = z.string().refine((s) => s.trim() !== "", { error: "must not be blank; use U or a gap note" });
const textList = z.array(text).min(1);
const sameStrings = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((s, i) => s === b[i]);
const exactStrings = (expected: readonly string[]) =>
  z
    .array(z.string())
    .refine((actual) => sameStrings(actual, expected), { error: `must be exactly, in order: ${expected.join(" | ")}` })
    .readonly();

function table(title: string | RegExp, columns: z.ZodType<readonly string[]>, allowedCells: Record<string, readonly string[]> = {}) {
  return z
    .strictObject({
      title: typeof title === "string" ? z.literal(title) : z.string().regex(title),
      columns,
      rows: z.array(z.array(text)),
    })
    .superRefine((value, ctx) => {
      value.rows.forEach((row, r) => {
        if (row.length !== value.columns.length) ctx.addIssue({ code: "custom", path: ["rows", r], message: `expected ${value.columns.length} cells, got ${row.length}` });
        for (const [column, allowed] of Object.entries(allowedCells)) {
          const c = value.columns.indexOf(column);
          if (c >= 0 && row[c] !== undefined && !allowed.includes(row[c])) ctx.addIssue({ code: "custom", path: ["rows", r, c], message: `${column} must be one of: ${allowed.join(", ")}` });
        }
      });
    });
}

// ---------------------------------------------------------------- Typed extras: never raw HTML

// ponytail: a Cell is a non-blank string as in v1; add links or tones only when a report needs them.
const extraId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, { error: "must be lowercase kebab-case" });

const ExtraTable = z
  .strictObject({
    type: z.literal("table"),
    id: extraId,
    title: text,
    columns: z.array(z.string()).min(1),
    rows: z.array(z.array(text)),
    rowMeta: z.array(z.strictObject({ note: text.optional() })).optional(),
  })
  .superRefine((value, ctx) => {
    value.rows.forEach((row, r) => {
      if (row.length !== value.columns.length) ctx.addIssue({ code: "custom", path: ["rows", r], message: `expected ${value.columns.length} cells, got ${row.length}` });
    });
    if (value.rowMeta && value.rowMeta.length !== value.rows.length) ctx.addIssue({ code: "custom", path: ["rowMeta"], message: `expected ${value.rows.length} entries, got ${value.rowMeta.length}` });
  });
const ExtraKeyValue = z.strictObject({ type: z.literal("keyValue"), id: extraId, title: text, items: z.array(z.strictObject({ label: text, value: text })).min(1) });
const ExtraText = z.strictObject({ type: z.literal("text"), id: extraId, title: text.optional(), paragraphs: textList });
const ExtraBullets = z.strictObject({ type: z.literal("bullets"), id: extraId, title: text.optional(), items: textList });
const ExtraBlock = z.discriminatedUnion("type", [ExtraTable, ExtraKeyValue, ExtraText, ExtraBullets]);
export type DlExtraBlock = z.infer<typeof ExtraBlock>;

function layoutOf<P extends DlLayoutPanel>(panel: P) {
  const keys = DL_FIXED_BLOCKS[panel];
  const item = z.union([z.strictObject({ ref: z.enum(keys as unknown as [DlFixedBlocks[P][number], ...DlFixedBlocks[P][number][]]) }), ExtraBlock]);
  return z
    .array(item)
    .superRefine((layout, ctx) => {
      for (const key of keys) {
        const count = layout.filter((entry) => "ref" in entry && entry.ref === key).length;
        if (count !== 1) ctx.addIssue({ code: "custom", message: `fixed block "${key}" must appear exactly once, found ${count}` });
      }
    })
    .optional();
}

// ---------------------------------------------------------------- Panels

const V11F2Category = z.strictObject({
  name: text,
  counts: z.strictObject({ r: z.number().int().min(0), a: z.number().int().min(0), g: z.number().int().min(0), u: z.number().int().min(0) }),
  summary: text,
  checks: table(/\S/, exactStrings(F2_CHECK_COLUMNS), { "#": F2_CHECK_IDS, Verdict: F2_CHECK_VERDICTS_V1_1 }),
});

const V11F2 = F2Schema.extend({
  layout: layoutOf("f2"),
  subTabsProse: text.optional(),
  categoryScorecardProse: text.optional(),
  categories: z.array(V11F2Category).refine((items) => sameStrings(items.map((i) => i.name), F2_CATEGORY_NAMES), {
    error: `names must be exactly, in order: ${F2_CATEGORY_NAMES.join(" | ")}`,
  }),
  dataGaps: table(/^DATA GAPS · \d+ CHECKS NOT SCORED$/, z.union([exactStrings(F2_DATA_GAPS_COLUMNS), exactStrings(F2_DATA_GAPS_THRESHOLD_COLUMNS)]), {
    "#": F2_CHECK_IDS,
    Category: F2_CATEGORY_NAMES,
  }),
});

const V11F14 = F14Schema.extend({
  layout: layoutOf("f14"),
  stagedEntry: table("STAGED ENTRY (3 TRANCHES)", z.union([exactStrings(F14_STAGED_ENTRY_COLUMNS), exactStrings(F14_STAGED_ENTRY_NAMED_COLUMNS)])),
});

/** Still an upload slot: prose about the placeholder is allowed, uploaded research is not. */
const V11F17 = z.strictObject({
  kind: z.literal("upload_placeholder"),
  leadTitle: text.optional(),
  takeaways: textList.optional(),
  slotTitle: text.optional(),
  prose: textList.optional(),
  sourcesAndGaps: SourcesAndGapsSchema.optional(),
});

export const DlEquityReportV11Schema = z
  .strictObject({
    schema: z.literal(DL_EQUITY_REPORT_SCHEMA_V1_1),
    chrome: ChromeSchema,
    footer: FooterSchema,
    panels: z.strictObject({
      f1: F1Schema.extend({ layout: layoutOf("f1") }),
      f2: V11F2,
      f3: F3Schema.extend({ layout: layoutOf("f3") }),
      f4: F4Schema.extend({ layout: layoutOf("f4") }),
      f5: F5Schema.extend({ layout: layoutOf("f5") }),
      f6: F6Schema.extend({ layout: layoutOf("f6") }),
      f7: F7Schema.extend({ layout: layoutOf("f7") }),
      f8: F8Schema.extend({ layout: layoutOf("f8") }),
      f9: F9Schema.extend({ layout: layoutOf("f9") }),
      f10: F10Schema.extend({ layout: layoutOf("f10") }),
      f11: F11Schema.extend({ layout: layoutOf("f11") }),
      f12: F12Schema.extend({ layout: layoutOf("f12") }),
      f13: F13Schema.extend({ layout: layoutOf("f13") }),
      f14: V11F14,
      f15: F15Schema.extend({ layout: layoutOf("f15") }),
      f16: F16Schema.extend({ layout: layoutOf("f16") }),
      f17: V11F17,
    }),
  })
  .superRefine((report, ctx) => {
    const seen = new Set<string>();
    for (const [panel, value] of Object.entries(report.panels)) {
      const layout = "layout" in value ? (value.layout ?? []) : [];
      layout.forEach((entry, i) => {
        if (!("id" in entry)) return;
        if (seen.has(entry.id)) ctx.addIssue({ code: "custom", path: ["panels", panel, "layout", i, "id"], message: `duplicate extra block id "${entry.id}"` });
        seen.add(entry.id);
      });
    }
  });

export type DlEquityReportV11 = z.infer<typeof DlEquityReportV11Schema>;
export type DlEquityReport = DlEquityReportV1 | DlEquityReportV11;
export type DlParseResultV11 = { ok: true; data: DlEquityReportV11 } | { ok: false; errors: string[] };
export type DlReportParseResult = { ok: true; data: DlEquityReport; warnings: string[] } | { ok: false; errors: string[] };

export const isDlEquityReportPayload = (json: unknown) => {
  const schema = (json as { schema?: unknown } | null)?.schema;
  return schema === DL_EQUITY_REPORT_SCHEMA_V1_1 || schema === "dl-equity-report/v1";
};

export function parseDlEquityReportV11(input: unknown): DlParseResultV11 {
  const result = DlEquityReportV11Schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`) };
}

/** Public entry: routes by `schema`. Anything unrecognised gets v1's rejection, which names the schema it expected. */
export function parseDlEquityReport(input: unknown): DlReportParseResult {
  const parsed = (input as { schema?: unknown } | null)?.schema === DL_EQUITY_REPORT_SCHEMA_V1_1 ? parseDlEquityReportV11(input) : parseDlEquityReportV1(input);
  return parsed.ok ? { ok: true, data: parsed.data, warnings: dlSemanticWarnings(parsed.data) } : parsed;
}

// ---------------------------------------------------------------- Semantic validators: warnings, never rejects

const F2_ALL_IDS: readonly string[] = F2_CHECK_IDS;

function f2Warnings({ stress, categories, dataGaps }: DlEquityReport["panels"]["f2"]): string[] {
  const warnings: string[] = [];
  const gapRows = dataGaps.rows.map((row) => ({ id: row[0], category: row[2] }));
  const gapIds = new Set<string>();
  for (const { id } of gapRows) {
    if (gapIds.has(id)) warnings.push(`F2: check ${id} appears twice in DATA GAPS`);
    gapIds.add(id);
  }

  const verdicts = new Map<string, string>();
  const totals = { r: 0, a: 0, g: 0 };
  const unscored = new Set(gapIds);
  categories.forEach(({ name, counts, checks }) => {
    const found = { r: 0, a: 0, g: 0 };
    const unknown = new Set(gapRows.filter((gap) => gap.category === name).map((gap) => gap.id));
    for (const [id, , , verdict] of checks.rows) {
      if (verdicts.has(id)) warnings.push(`F2: check ${id} is duplicated in the category tables`);
      else verdicts.set(id, verdict);
      if (verdict === "U") {
        // The same check in a grid and in DATA GAPS is one check: the source says U rows "repeat ... not double counted".
        unknown.add(id);
        unscored.add(id);
      } else {
        if (gapIds.has(id)) warnings.push(`F2: check ${id} is both scored ${verdict} and listed in DATA GAPS`);
        if (verdict === "RED") found.r++;
        else if (verdict === "AMBER") found.a++;
        else if (verdict === "GREEN") found.g++;
      }
    }
    totals.r += found.r;
    totals.a += found.a;
    totals.g += found.g;
    if (found.r !== counts.r || found.a !== counts.a || found.g !== counts.g || unknown.size !== counts.u) {
      warnings.push(`F2: ${name} counts say ${counts.r}R ${counts.a}A ${counts.g}G ${counts.u}U but its rows give ${found.r}R ${found.a}A ${found.g}G ${unknown.size}U`);
    }
  });

  const missing = F2_ALL_IDS.filter((id) => !verdicts.has(id) && !gapIds.has(id));
  if (missing.length) warnings.push(`F2: missing checks: ${missing.join(", ")}`);

  const total = totals.r + totals.a + totals.g + unscored.size;
  const tally = stress.tally.match(/^(\d+) checks: (\d+) RED · (\d+) AMBER · (\d+) GREEN · (\d+) not checked/)?.slice(1).map(Number);
  const expected = [total, totals.r, totals.a, totals.g, unscored.size];
  if (tally?.some((value, i) => value !== expected[i])) {
    warnings.push(`F2: tally "${stress.tally}" does not match the rows: ${total} checks, ${totals.r} RED, ${totals.a} AMBER, ${totals.g} GREEN, ${unscored.size} not checked`);
  }
  const titled = Number(dataGaps.title.match(/\d+/)?.[0]);
  if (titled !== gapIds.size) warnings.push(`F2: DATA GAPS title says ${titled} checks but lists ${gapIds.size}`);
  return warnings;
}

function targetWarnings({ chrome, panels }: DlEquityReport): string[] {
  const header = parseAmount(chrome.target);
  const weighted = parseAmount(panels.f10.weightedTarget);
  return header !== null && weighted !== null && header !== weighted ? [`Header target ${chrome.target} differs from the F10 weighted target ${weighted}`] : [];
}

function consensusWarnings({ consensus, investors, leadTitle }: DlEquityReport["panels"]["f13"]): string[] {
  const count = (stance: string) => investors.filter((investor) => investor.stance === stance).length;
  const actual = [count("BUY"), count("WATCHLIST"), count("PASS")];
  const summary = `${actual[0]} would buy / ${actual[1]} watchlist / ${actual[2]} pass`;
  const warnings: string[] = [];
  if (consensus.wouldBuy !== actual[0] || consensus.watchlist !== actual[1] || consensus.pass !== actual[2]) {
    warnings.push(`F13: consensus says ${consensus.wouldBuy} would buy / ${consensus.watchlist} watchlist / ${consensus.pass} pass but the stances give ${summary}`);
  }
  if (!leadTitle.includes(summary)) warnings.push(`F13: lead title "${leadTitle}" does not match the stances: ${summary}`);
  return warnings;
}

function stakeholderWarnings({ lenses, stripBanner, adjustedMultiple }: DlEquityReport["panels"]["f16"]): string[] {
  const raw = lenses.reduce((sum, lens) => sum + Number(lens.multiple.match(/\d+(?:\.\d+)?/)?.[0] ?? 0), 0);
  const base = Number(stripBanner.match(/~\s*(\d+(?:\.\d+)?)/)?.[1]);
  const cap = Number(adjustedMultiple.match(/cap(?:ped)?(?:\s+at)?\s*[−-]?\s*(\d+(?:\.\d+)?)/i)?.[1] ?? Infinity);
  const adjusted = base - Math.min(raw, cap);
  const multiples = [...adjustedMultiple.matchAll(/(\d+(?:\.\d+)?)\s*x\b/g)].map((match) => Number(match[1]));
  const warnings: string[] = [];
  if (!multiples.includes(raw)) warnings.push(`F16: lens impacts sum to ${raw}x, which the adjusted multiple does not disclose`);
  if (!Number.isNaN(adjusted) && !multiples.includes(adjusted)) warnings.push(`F16: base ${base}x less ${Math.min(raw, cap)}x is ${adjusted}x, which the adjusted multiple does not state`);
  return warnings;
}

function rewardRiskWarnings({ rewardRisk }: DlEquityReport["panels"]["f10"]): string[] {
  const match = rewardRisk.strip.match(/(\d+(?:\.\d+)?)x · (.+)$/);
  if (!match) return [];
  const ratio = Number(match[1]);
  const expected = ratio >= 1.5 ? "ASYMMETRIC FAVOURABLE" : ratio >= 0.8 ? "BALANCED" : "ASYMMETRIC UNFAVOURABLE";
  return match[2] === expected ? [] : [`F10: reward : risk ${ratio}x reads ${expected}, not ${match[2]}`];
}

/** Cross-field arithmetic the schemas can't see. Works on both versions. */
export function dlSemanticWarnings(report: DlEquityReport): string[] {
  const { f2, f10, f13, f16 } = report.panels;
  return [...f2Warnings(f2), ...targetWarnings(report), ...consensusWarnings(f13), ...stakeholderWarnings(f16), ...rewardRiskWarnings(f10)];
}
