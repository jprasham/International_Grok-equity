import { DL_HEADINGS, type DlEquityReportV1 } from "./dl-equity-report-v1";
import { dlPanels, type DlBlock } from "./dl-report-blocks";

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Every report string reaches the exported document through this. */
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ENTITIES[c]);

const list = (items: string[], tag: "ul" | "ol") => `<${tag}>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</${tag}>`;
const h = (level: number, value: string) => `<h${level}>${escapeHtml(value)}</h${level}>`;

function blockHtml(block: DlBlock): string {
  switch (block.kind) {
    case "heading":
      return h(3, block.text);
    case "text":
      return `<p>${block.label ? `<b>${escapeHtml(block.label)}:</b> ` : ""}${escapeHtml(block.text)}</p>`;
    case "numbered":
      return list(block.items, "ol");
    case "bullets":
      return (block.title ? h(4, block.title) : "") + list(block.items, "ul");
    case "table": {
      const { title, columns, rows } = block.table;
      const head = columns.some(Boolean) ? `<thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>` : "";
      const body = rows.map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");
      return `${block.hideTitle ? "" : h(4, title)}<table>${head}<tbody>${body}</tbody></table>`;
    }
    case "ladder":
      return h(4, block.title) + `<table><tbody>${block.rungs.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td></tr>`).join("")}</tbody></table>`;
    case "group": {
      const tags = [block.badge, block.meta].filter((t): t is string => Boolean(t)).map(escapeHtml).join(" · ");
      return `<section>${h(4, block.title)}${tags ? `<p><b>${tags}</b></p>` : ""}${block.blocks.map(blockHtml).join("")}</section>`;
    }
    case "sources": {
      const { sources, estDefinition, gaps, disclaimer } = block.value;
      return h(4, DL_HEADINGS.sourcesAndGaps) + list(sources, "ul") + `<p>${escapeHtml(estDefinition)}</p><p><b>Gaps</b></p>` + list(gaps, "ul") + `<p><small>${escapeHtml(disclaimer)}</small></p>`;
    }
  }
}

const STYLE =
  "body{font:13px/1.5 system-ui,sans-serif;color:#111;margin:24px;max-width:1000px}h1{font-size:22px;margin:4px 0}h2{font-size:17px;margin:28px 0 4px;border-top:1px solid #999;padding-top:12px}h3{font-size:13px;margin:16px 0 4px}h4{font-size:12px;margin:12px 0 4px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:3px 6px;text-align:left;vertical-align:top}";

/** A complete, script-free document of all tabs for Download and Print. */
export function dlReportHtml(report: DlEquityReportV1) {
  const { chrome, footer } = report;
  const panels = dlPanels(report)
    .map((p) => `<section>${h(2, p.label)}${p.leadTitle ? `<p><b>${escapeHtml(p.leadTitle)}</b></p>` : ""}${p.blocks.map(blockHtml).join("")}</section>`)
    .join("");
  const foot = [footer.disclaimer, `As of ${footer.asOfIst}`, `Price date ${footer.priceDate}`, footer.sourcesSummary, footer.estUDisclaimer].map(escapeHtml).join(" · ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(chrome.companyLine)}</title><style>${STYLE}</style></head><body><p>${escapeHtml(chrome.kicker)}</p>${h(1, chrome.companyLine)}<p>${escapeHtml(chrome.thesis)}</p><p><b>Rating (paper):</b> ${escapeHtml(chrome.ratingPaper)} · <b>Target:</b> ${escapeHtml(chrome.target)} · <b>Price:</b> ${escapeHtml(chrome.price)}</p>${panels}<footer><p><small>${foot}</small></p></footer></body></html>`;
}
