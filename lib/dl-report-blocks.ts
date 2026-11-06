import { DL_HEADINGS as H, DL_TAB_LABELS, type DlSourcesAndGaps, type DlTable } from "./dl-equity-report-v1";
import {
  DL_EQUITY_REPORT_SCHEMA_V1_1,
  DL_FIXED_BLOCKS,
  F13_CRITERIA_COLUMNS,
  F13_CRITERIA_TITLE,
  F2_SUB_TABS_LABEL,
  type DlEquityReport,
  type DlEquityReportV11,
  type DlExtraBlock,
  type DlFixedBlocks,
  type DlLayoutPanel,
} from "./dl-equity-report-v1.1";

/** One description of each panel, walked by both the React view and the escaped HTML export so they can't drift. */
export type DlBlock =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; label?: string; tone?: "lead" | "note" | "quote" }
  | { kind: "numbered"; items: string[] }
  | { kind: "bullets"; items: string[]; title?: string }
  | { kind: "table"; table: DlTable; hideTitle?: boolean; rowMeta?: { note?: string }[] }
  | { kind: "ladder"; title: string; rungs: { label: string; value: string }[] }
  | { kind: "group"; title: string; badge?: string; meta?: string; collapsible?: boolean; blocks: DlBlock[] }
  | { kind: "sources"; value: DlSourcesAndGaps };

export type DlPanel = { id: string; label: string; leadTitle?: string; blocks: DlBlock[] };

const heading = (text: string): DlBlock => ({ kind: "heading", text });
const text = (value: string, label?: string, tone?: "lead" | "note" | "quote"): DlBlock => ({ kind: "text", text: value, label, tone });
const table = (value: DlTable, hideTitle?: boolean): DlBlock => ({ kind: "table", table: value, hideTitle });
const bullets = (items: string[], title?: string): DlBlock => ({ kind: "bullets", items, title });

/** Extras reuse the fixed block kinds, so they pass through the same escaping on screen and in the export. */
function extraBlocks(extra: DlExtraBlock): DlBlock[] {
  switch (extra.type) {
    case "table":
      return [{ kind: "table", table: { title: extra.title, columns: extra.columns, rows: extra.rows }, rowMeta: extra.rowMeta }];
    case "keyValue":
      return [table({ title: extra.title, columns: ["", ""], rows: extra.items.map((item) => [item.label, item.value]) })];
    case "text":
      return [...(extra.title ? [heading(extra.title)] : []), ...extra.paragraphs.map((paragraph) => text(paragraph))];
    case "bullets":
      return [bullets(extra.items, extra.title)];
  }
}

export function dlPanels(report: DlEquityReport): DlPanel[] {
  // v1 panels are a structural subset of v1.1: every addition is optional or a wider union.
  const p: DlEquityReportV11["panels"] = report.panels;
  const isV11 = report.schema === DL_EQUITY_REPORT_SCHEMA_V1_1;

  type Base = { leadTitle: string; takeaways: string[]; sourcesAndGaps: DlSourcesAndGaps; layout?: ({ ref: string } | DlExtraBlock)[] };
  const panel = <P extends DlLayoutPanel>(id: P, base: Base, body: Record<Exclude<DlFixedBlocks[P][number], "takeaways">, DlBlock[]>) => {
    const fixed: Record<string, DlBlock[]> = { ...body, takeaways: [{ kind: "numbered", items: base.takeaways }] };
    const layout = base.layout ?? DL_FIXED_BLOCKS[id].map((ref) => ({ ref }));
    return {
      leadTitle: base.leadTitle,
      blocks: [...layout.flatMap((entry) => ("ref" in entry ? fixed[entry.ref] : extraBlocks(entry))), { kind: "sources", value: base.sourcesAndGaps } as const],
    };
  };

  const f17Blocks: DlBlock[] = [
    ...(p.f17.takeaways ? [{ kind: "numbered", items: p.f17.takeaways } as const] : []),
    ...(p.f17.slotTitle ? [heading(p.f17.slotTitle)] : []),
    ...(p.f17.prose ? p.f17.prose.map((paragraph) => text(paragraph)) : [text("Upload slot. No research has been uploaded.", undefined, "note")]),
    ...(p.f17.sourcesAndGaps ? [{ kind: "sources", value: p.f17.sourcesAndGaps } as const] : []),
  ];

  const bodies = [
    panel("f1", p.f1, { topInsights: [bullets(p.f1.topInsights, H.f1TopInsights)] }),
    panel("f2", p.f2, {
      banner: [
        heading(H.f2Banner),
        text(p.f2.combinedVerdict),
        text(p.f2.deduplicationNote, undefined, "note"),
        ...(p.f2.subTabsProse ? [text(p.f2.subTabsProse, F2_SUB_TABS_LABEL, "note")] : []),
      ],
      stress: [heading(p.f2.stress.headline), text(p.f2.stress.why, "Why"), text(p.f2.stress.tally, undefined, "note")],
      categories: [
        heading(H.f2CategoryScorecard),
        ...(p.f2.categoryScorecardProse ? [text(p.f2.categoryScorecardProse, undefined, "note")] : []),
        ...p.f2.categories.map((c): DlBlock => ({
          kind: "group",
          title: c.name,
          meta: `${c.counts.r}R ${c.counts.a}A ${c.counts.g}G ${c.counts.u}U`,
          collapsible: true,
          blocks: [text(c.summary), table(c.checks, true)],
        })),
      ],
      dataGaps: [table(p.f2.dataGaps)],
    }),
    panel("f3", p.f3, { scorecard: [table(p.f3.scorecard)] }),
    panel("f4", p.f4, {
      ownership: [table(p.f4.ownership)],
      managementChange: [heading(p.f4.managementChange.banner), text(p.f4.managementChange.summary)],
      changeLog: [table(p.f4.changeLog)],
      signalStrip: [table(p.f4.signalStrip)],
      cultureStrip: [table(p.f4.cultureStrip)],
      literature: [bullets(p.f4.literature, H.f4Literature)],
    }),
    panel("f5", p.f5, {
      theme: [heading(p.f5.themeBanner), text(p.f5.themeMood, "Theme mood", "lead"), text(p.f5.plainRead, "Plain read")],
      themeStrip: [table(p.f5.themeStrip)],
      narratives: [bullets(p.f5.narratives, H.f5Narratives)],
      methodNote: [text(p.f5.methodNote, undefined, "note")],
      stockMood: [table(p.f5.stockMood)],
    }),
    panel("f6", p.f6, { bottomUp: [table(p.f6.bottomUp)], orderBook: [table(p.f6.orderBook)], structure: [table(p.f6.structure)] }),
    panel("f7", p.f7, { pl: [table(p.f7.pl)] }),
    panel("f8", p.f8, { returns: [table(p.f8.returns)] }),
    panel("f9", p.f9, {
      guidance: [heading(p.f9.guidance.title), text(p.f9.keyTakeawaysNote, undefined, "note"), table(p.f9.guidance, true)],
      delta: [heading(H.f9Delta), bullets(p.f9.delta.new, H.f9DeltaNew), bullets(p.f9.delta.droppedOrGoneQuiet, H.f9DeltaDropped), bullets(p.f9.delta.guidanceRaisedCut, H.f9DeltaGuidance)],
      language: [
        heading(H.f9Language),
        text(p.f9.language.confidenceScore, undefined, "lead"),
        text(p.f9.language.confidenceNote),
        text(p.f9.language.hedgingVsCertainty, H.f9Hedging),
        bullets(p.f9.language.evasiveAnswers, H.f9Evasive),
        bullets(p.f9.language.analystPushbackTopics, H.f9Pushback),
      ],
      callLanguageScorecard: [heading(H.f9Scorecard), text(p.f9.callLanguageScorecard.reading, undefined, "lead"), text(p.f9.callLanguageScorecard.note)],
      whatToWatch: [heading(H.f9Actionable), table(p.f9.whatToWatch)],
      thesisImpact: [table(p.f9.thesisImpact)],
    }),
    panel("f10", p.f10, {
      rewardRisk: [text(p.f10.rewardRisk.strip, undefined, "lead"), text(p.f10.rewardRisk.detail, undefined, "note")],
      scenarios: [table(p.f10.scenarios)],
      priceLadder: [{ kind: "ladder", title: H.f10PriceLadder, rungs: p.f10.priceLadder }],
      whatWouldNeedToHappen: [bullets(p.f10.whatWouldNeedToHappen, H.f10WhatWouldNeedToHappen)],
      weightedTarget: [text(p.f10.weightedTarget, undefined, "lead")],
      methodDetail: [text(p.f10.methodDetail, H.f10MethodDetail, "note")],
    }),
    panel("f11", p.f11, { grid: [table(p.f11.grid)] }),
    panel("f12", p.f12, { costSplit: [table(p.f12.costSplit)], revenueScenarios: [table(p.f12.revenueScenarios)], marginShock: [table(p.f12.marginShock)] }),
    panel("f13", p.f13, {
      consensus: [
        heading(H.f13Consensus),
        text(`${p.f13.consensus.wouldBuy} Would buy · ${p.f13.consensus.watchlist} Watchlist · ${p.f13.consensus.pass} Pass`, undefined, "lead"),
        text(p.f13.consensus.note, undefined, "note"),
        text(p.f13.keyDisagreement, "Key disagreement"),
        text(p.f13.tieBreaker, "Tie-breaker"),
      ],
      investors: p.f13.investors.map((i): DlBlock => {
        const rows = i.criteria.map((c) => [c.mark, c.label, c.evidence]);
        return {
          kind: "group",
          title: i.name,
          badge: i.stance,
          blocks: [
            text(i.criteriaLine, undefined, "note"),
            // v1 is headerless: OLECTRA stores no column names for criteria, and none are frozen. v1.1's are renderer-owned.
            isV11 ? table({ title: F13_CRITERIA_TITLE, columns: F13_CRITERIA_COLUMNS, rows }) : table({ title: i.name, columns: ["", "", ""], rows }, true),
            text(i.quote, undefined, "quote"),
          ],
        };
      }),
      methodologyNote: [text(p.f13.methodologyNote, undefined, "note")],
    }),
    panel("f14", p.f14, {
      status: [text(p.f14.state, undefined, "lead"), text(p.f14.priceLine, undefined, "note"), text(p.f14.todaysAction)],
      extensionMeter: [table(p.f14.extensionMeter)],
      stagedEntry: [table(p.f14.stagedEntry)],
      size: [text(p.f14.size, "Size")],
      rules: [heading(H.f14Rules), ...p.f14.rules.map((r) => text(r.text, r.label))],
      frameworkNote: [text(p.f14.frameworkNote, undefined, "note")],
    }),
    panel("f15", p.f15, {
      consensusStrip: [table(p.f15.consensusStrip)],
      calls: [table(p.f15.calls)],
      trend: [table(p.f15.trend)],
      streetVsOurs: [table(p.f15.streetVsOurs)],
      whatTheyMayKnow: [table(p.f15.whatTheyMayKnow)],
      searchNote: [text(p.f15.searchNote, undefined, "note")],
    }),
    panel("f16", p.f16, {
      strip: [heading(p.f16.stripBanner), text(p.f16.adjustedMultiple)],
      topHiddenRisks: [bullets(p.f16.topHiddenRisks, "TOP HIDDEN RISKS")],
      lenses: p.f16.lenses.map((l): DlBlock => ({
        kind: "group",
        title: l.name,
        badge: l.flag,
        meta: l.multiple,
        blocks: [text(l.who, "Who"), text(l.evidence, "Evidence"), text(l.hiddenRisk, "Hidden risk")],
      })),
      wantsNote: [text(p.f16.wantsNote, undefined, "note")],
    }),
    { leadTitle: p.f17.leadTitle, blocks: f17Blocks },
  ];

  return DL_TAB_LABELS.map((label, i) => ({ id: `f${i + 1}`, label, ...bodies[i] }));
}

const TONES: Record<string, "good" | "warn" | "bad" | "none"> = {
  GREEN: "good",
  BUY: "good",
  AMBER: "warn",
  HOLD: "warn",
  WATCHLIST: "warn",
  RED: "bad",
  REDUCE: "bad",
  PASS: "bad",
  "NO DATA": "none",
  U: "none",
};

/** Exact matches only, so prose that mentions a flag stays prose. */
export const dlTone = (value: string) => (Object.hasOwn(TONES, value) ? TONES[value] : undefined);

/** Splits text around the EST and U markers; odd indexes are markers. `U.S.` and `U-turn` are left alone. */
export const dlSplitMarkers = (value: string) => value.split(/\b(EST|U)\b(?![.'-]\w)/);
