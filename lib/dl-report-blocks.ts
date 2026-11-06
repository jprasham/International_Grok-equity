import { DL_HEADINGS as H, DL_TAB_LABELS, type DlEquityReportV1, type DlSourcesAndGaps, type DlTable } from "./dl-equity-report-v1";

/** One description of each panel, walked by both the React view and the escaped HTML export so they can't drift. */
export type DlBlock =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; label?: string; tone?: "lead" | "note" | "quote" }
  | { kind: "numbered"; items: string[] }
  | { kind: "bullets"; items: string[]; title?: string }
  | { kind: "table"; table: DlTable; hideTitle?: boolean }
  | { kind: "ladder"; title: string; rungs: { label: string; value: string }[] }
  | { kind: "group"; title: string; badge?: string; meta?: string; collapsible?: boolean; blocks: DlBlock[] }
  | { kind: "sources"; value: DlSourcesAndGaps };

export type DlPanel = { id: string; label: string; leadTitle?: string; blocks: DlBlock[] };

const heading = (text: string): DlBlock => ({ kind: "heading", text });
const text = (value: string, label?: string, tone?: "lead" | "note" | "quote"): DlBlock => ({ kind: "text", text: value, label, tone });
const table = (value: DlTable, hideTitle?: boolean): DlBlock => ({ kind: "table", table: value, hideTitle });
const bullets = (items: string[], title?: string): DlBlock => ({ kind: "bullets", items, title });

export function dlPanels({ panels: p }: DlEquityReportV1): DlPanel[] {
  type Base = { leadTitle: string; takeaways: string[]; sourcesAndGaps: DlSourcesAndGaps };
  const panel = (base: Base, blocks: DlBlock[], before: DlBlock[] = []) => ({
    leadTitle: base.leadTitle,
    blocks: [...before, { kind: "numbered", items: base.takeaways } as const, ...blocks, { kind: "sources", value: base.sourcesAndGaps } as const],
  });

  const bodies = [
    panel(p.f1, [bullets(p.f1.topInsights, H.f1TopInsights)]),
    panel(
      p.f2,
      [
        heading(p.f2.stress.headline),
        text(p.f2.stress.why, "Why"),
        text(p.f2.stress.tally, undefined, "note"),
        heading(H.f2CategoryScorecard),
        ...p.f2.categories.map((c): DlBlock => ({
          kind: "group",
          title: c.name,
          meta: `${c.counts.r}R ${c.counts.a}A ${c.counts.g}G ${c.counts.u}U`,
          collapsible: true,
          blocks: [text(c.summary), table(c.checks, true)],
        })),
        table(p.f2.dataGaps),
      ],
      [heading(H.f2Banner), text(p.f2.combinedVerdict), text(p.f2.deduplicationNote, undefined, "note")],
    ),
    panel(p.f3, [table(p.f3.scorecard)]),
    panel(p.f4, [
      table(p.f4.ownership),
      heading(p.f4.managementChange.banner),
      text(p.f4.managementChange.summary),
      table(p.f4.changeLog),
      table(p.f4.signalStrip),
      table(p.f4.cultureStrip),
      bullets(p.f4.literature, H.f4Literature),
    ]),
    panel(p.f5, [
      heading(p.f5.themeBanner),
      text(p.f5.themeMood, "Theme mood", "lead"),
      text(p.f5.plainRead, "Plain read"),
      table(p.f5.themeStrip),
      bullets(p.f5.narratives, H.f5Narratives),
      text(p.f5.methodNote, undefined, "note"),
      table(p.f5.stockMood),
    ]),
    panel(p.f6, [table(p.f6.bottomUp), table(p.f6.orderBook), table(p.f6.structure)]),
    panel(p.f7, [table(p.f7.pl)]),
    panel(p.f8, [table(p.f8.returns)]),
    panel(p.f9, [
      heading(p.f9.guidance.title),
      text(p.f9.keyTakeawaysNote, undefined, "note"),
      table(p.f9.guidance, true),
      heading(H.f9Delta),
      bullets(p.f9.delta.new, H.f9DeltaNew),
      bullets(p.f9.delta.droppedOrGoneQuiet, H.f9DeltaDropped),
      bullets(p.f9.delta.guidanceRaisedCut, H.f9DeltaGuidance),
      heading(H.f9Language),
      text(p.f9.language.confidenceScore, undefined, "lead"),
      text(p.f9.language.confidenceNote),
      text(p.f9.language.hedgingVsCertainty, H.f9Hedging),
      bullets(p.f9.language.evasiveAnswers, H.f9Evasive),
      bullets(p.f9.language.analystPushbackTopics, H.f9Pushback),
      heading(H.f9Scorecard),
      text(p.f9.callLanguageScorecard.reading, undefined, "lead"),
      text(p.f9.callLanguageScorecard.note),
      heading(H.f9Actionable),
      table(p.f9.whatToWatch),
      table(p.f9.thesisImpact),
    ]),
    panel(p.f10, [
      text(p.f10.rewardRisk.strip, undefined, "lead"),
      text(p.f10.rewardRisk.detail, undefined, "note"),
      table(p.f10.scenarios),
      { kind: "ladder", title: H.f10PriceLadder, rungs: p.f10.priceLadder },
      bullets(p.f10.whatWouldNeedToHappen, H.f10WhatWouldNeedToHappen),
      text(p.f10.weightedTarget, undefined, "lead"),
      text(p.f10.methodDetail, H.f10MethodDetail, "note"),
    ]),
    panel(p.f11, [table(p.f11.grid)]),
    panel(p.f12, [table(p.f12.costSplit), table(p.f12.revenueScenarios), table(p.f12.marginShock)]),
    panel(p.f13, [
      heading(H.f13Consensus),
      text(`${p.f13.consensus.wouldBuy} Would buy · ${p.f13.consensus.watchlist} Watchlist · ${p.f13.consensus.pass} Pass`, undefined, "lead"),
      text(p.f13.consensus.note, undefined, "note"),
      text(p.f13.keyDisagreement, "Key disagreement"),
      text(p.f13.tieBreaker, "Tie-breaker"),
      ...p.f13.investors.map((i): DlBlock => ({
        kind: "group",
        title: i.name,
        badge: i.stance,
        blocks: [
          text(i.criteriaLine, undefined, "note"),
          // Headerless: OLECTRA stores no column names for criteria, and none are frozen.
          table({ title: i.name, columns: ["", "", ""], rows: i.criteria.map((c) => [c.mark, c.label, c.evidence]) }, true),
          text(i.quote, undefined, "quote"),
        ],
      })),
      text(p.f13.methodologyNote, undefined, "note"),
    ]),
    panel(p.f14, [
      text(p.f14.state, undefined, "lead"),
      text(p.f14.priceLine, undefined, "note"),
      text(p.f14.todaysAction),
      table(p.f14.extensionMeter),
      table(p.f14.stagedEntry),
      text(p.f14.size, "Size"),
      heading(H.f14Rules),
      ...p.f14.rules.map((r) => text(r.text, r.label)),
      text(p.f14.frameworkNote, undefined, "note"),
    ]),
    panel(p.f15, [
      table(p.f15.consensusStrip),
      table(p.f15.calls),
      table(p.f15.trend),
      table(p.f15.streetVsOurs),
      table(p.f15.whatTheyMayKnow),
      text(p.f15.searchNote, undefined, "note"),
    ]),
    panel(p.f16, [
      heading(p.f16.stripBanner),
      text(p.f16.adjustedMultiple),
      bullets(p.f16.topHiddenRisks, "TOP HIDDEN RISKS"),
      ...p.f16.lenses.map((l): DlBlock => ({
        kind: "group",
        title: l.name,
        badge: l.flag,
        meta: l.multiple,
        blocks: [text(l.who, "Who"), text(l.evidence, "Evidence"), text(l.hiddenRisk, "Hidden risk")],
      })),
      text(p.f16.wantsNote, undefined, "note"),
    ]),
    { blocks: [text("Upload slot. No research has been uploaded.", undefined, "note")] },
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
