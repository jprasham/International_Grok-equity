/**
 * The bot's Equity Terminal page keeps every tab in a JSON script and draws it with JS, which the sandboxed
 * report frame never runs. This unpacks all tabs into the page as stacked <section data-tab> blocks, so the
 * download and print are complete; fitToContent in report-view shows one at a time on screen, with the sub-tab bar.
 * A later template does its tabs in CSS (radio inputs, .pn panels, .sp sub-panels). Those work on screen as sent, but
 * print only the selected tab, so printAllPanels adds a print rule and a heading per panel.
 * Browser-only (DOMParser). Anything that isn't that page comes back unchanged. The result is sanitized afterwards.
 */
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Tab = { key?: unknown; label?: unknown; html?: unknown; subs?: { label?: unknown; html?: unknown }[] };

export function expandTerminalTabs(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const data = doc.getElementById("tabdata");
  const body = doc.getElementById("tabbody");
  if (!data || !body) return printAllPanels(doc) ?? html;

  let tabs: Tab[];
  try {
    tabs = JSON.parse(data.textContent ?? "");
  } catch {
    return html;
  }
  if (!Array.isArray(tabs)) return html;

  // Sub-tabs are stacked under their own headings here; fitToContent turns them into a bar on screen.
  body.innerHTML = tabs
    .map((tab) => {
      const content = tab.subs ? tab.subs.map((sub) => `<div data-sub="${escape(String(sub.label ?? ""))}"><h3>${escape(String(sub.label ?? ""))}</h3>${sub.html ?? ""}</div>`).join("") : String(tab.html ?? "");
      return `<section data-tab="${escape(String(tab.key ?? ""))}">${content}</section>`;
    })
    .join("");
  return `<!doctype html>${doc.documentElement.outerHTML}`;
}

const PRINT_CSS =
  ".print-only{display:none}@media print{.print-only{display:block;color:#0B2A4A;margin:14px 0 8px}.pn,.sp{display:block!important}.pn{break-before:page}.pn:first-of-type{break-before:auto}.tabs,.rt{display:none!important}}";

/** For the CSS-tab template: every panel prints, headed by its tab label (label for=t3 belongs to #p3, s1_2 to #sp1_2). */
function printAllPanels(doc: Document): string | null {
  const labels = [...doc.querySelectorAll<HTMLLabelElement>(".tabs label[for]")];
  if (!labels.length || !doc.querySelector(".pn")) return null;
  for (const label of labels) {
    const sub = label.htmlFor.startsWith("s");
    const panel = doc.getElementById(label.htmlFor.replace(/^[ts]/, sub ? "sp" : "p"));
    if (!panel) continue;
    const heading = doc.createElement(sub ? "h3" : "h2");
    heading.className = "print-only";
    heading.textContent = label.textContent;
    panel.prepend(heading);
  }
  const style = doc.createElement("style");
  style.textContent = PRINT_CSS;
  doc.head.append(style);
  return `<!doctype html>${doc.documentElement.outerHTML}`;
}
