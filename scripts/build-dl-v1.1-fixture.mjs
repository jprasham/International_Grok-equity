// Regenerates fixtures/hfcl-v1.1.json from the local _reference/hfcl-v1 capture: run node scripts/build-dl-v1.1-fixture.mjs
// Starts from the stored v1 projection and restores the 15 fit gaps from the lossless companion. No text is authored here.
import { readFileSync, writeFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`../_reference/hfcl-v1/${name}`, import.meta.url), "utf8"));
const report = load("report.json");
const lossless = load("lossless-source.json");
const p = report.panels;

const sourceTable = (id) => lossless.tables.find((t) => t.id === id);
const textOf = (node) => (node.kind === "text" ? node.value : (node.children ?? []).map(textOf).join(""));
const elements = (node) => (node.children ?? []).filter((c) => c.kind === "element");
const collapse = (s) => s.replace(/\s+/g, " ").trim();

function find(node, test) {
  if (test(node)) return node;
  for (const child of elements(node)) {
    const hit = find(child, test);
    if (hit) return hit;
  }
}
const panelNode = (id) => find(lossless.ordered_dom, (n) => n.tag === "section" && n.attributes?.id === id);

/** Every <p> under the panel's `.box` headed by this <h3>, in source order. */
function boxParagraphs(panel, title) {
  const box = elements(panelNode(panel)).find((n) => n.attributes?.class?.includes("box") && collapse(textOf(elements(n)[0])) === title);
  if (!box) throw new Error(`${panel}: no box "${title}"`);
  const paragraphs = [];
  const walk = (n) => elements(n).forEach((c) => (c.tag === "p" ? paragraphs.push(collapse(textOf(c))) : walk(c)));
  walk(box);
  return paragraphs;
}

const textExtra = (panel, id, title) => ({ type: "text", id, title, paragraphs: boxParagraphs(panel, title) });
const after = (panel, extra) => ({ layout: [...panel, extra] });

report.schema = "dl-equity-report/v1.1";

// Gap 1: F1 LIVE PRICE SNAPSHOT.
const snapshot = sourceTable("T01");
Object.assign(p.f1, after([{ ref: "takeaways" }, { ref: "topInsights" }], { type: "table", id: "live-price-snapshot", title: snapshot.title, columns: snapshot.columns, rows: snapshot.rows }));

// Gaps 2-6: the original five-cell category tables, U rows included.
["T02", "T03", "T04", "T05", "T06", "T07", "T08"].forEach((id, i) => {
  const original = sourceTable(id);
  p.f2.categories[i].checks = { title: original.title, columns: original.columns, rows: original.rows };
});

// Gaps 7-8: F2 shell prose.
const f2 = panelNode("F2");
const subTabs = elements(f2).find((n) => n.tag === "p" && collapse(textOf(n)).startsWith("SUB-TABS"));
p.f2.subTabsProse = collapse(textOf(subTabs)).replace(/^SUB-TABS\s*·\s*/, "");
[p.f2.categoryScorecardProse] = boxParagraphs("F2", "CATEGORY SCORECARD · TAP A ROW FOR ITS CHECKS");

// Gaps 9-12: headed method blocks, placed after the table they follow in the source.
Object.assign(p.f3, after([{ ref: "takeaways" }, { ref: "scorecard" }], textExtra("F3", "model-inputs-uncertainty", "MODEL INPUTS & UNCERTAINTY")));
Object.assign(p.f7, after([{ ref: "takeaways" }, { ref: "pl" }], textExtra("F7", "periods-definitions-bridge", "PERIODS, DEFINITIONS & EARNINGS BRIDGE")));
Object.assign(p.f11, after([{ ref: "takeaways" }, { ref: "grid" }], textExtra("F11", "franchise-method", "METHOD")));
Object.assign(p.f12, after([{ ref: "takeaways" }, { ref: "costSplit" }, { ref: "revenueScenarios" }, { ref: "marginShock" }], textExtra("F12", "cost-reconciliation", "RECONCILIATION")));

// Gap 13 (F13 CRITERIA APPLIED) is renderer-owned, so it needs no data.

// Gap 14: five-column STAGED ENTRY.
const staged = sourceTable("T38");
p.f14.stagedEntry = { title: staged.title, columns: staged.columns, rows: staged.rows };

// Gap 15: F17 placeholder prose and SOURCES & GAPS. The source's sources paragraph is empty, and a blank is not allowed, so U.
const f17 = panelNode("F17");
const f17Gaps = boxParagraphs("F17", "SOURCES & GAPS").filter(Boolean);
p.f17 = {
  kind: "upload_placeholder",
  leadTitle: collapse(textOf(find(f17, (n) => n.tag === "h2"))),
  takeaways: elements(find(f17, (n) => n.attributes?.class?.includes("takeaways"))).map((n) => collapse(textOf(n)).replace(/^\d+\.\s*/, "")),
  slotTitle: "UPLOAD SLOT · NOT ENABLED",
  prose: boxParagraphs("F17", "UPLOAD SLOT · NOT ENABLED"),
  sourcesAndGaps: { sources: ["U"], estDefinition: p.f16.sourcesAndGaps.estDefinition, gaps: f17Gaps, disclaimer: p.f16.sourcesAndGaps.disclaimer },
};

writeFileSync(new URL("../fixtures/hfcl-v1.1.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
