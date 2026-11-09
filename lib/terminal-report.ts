/**
 * The bot's Equity Terminal page keeps every tab in a JSON script and draws it with JS, which the sandboxed
 * report frame never runs. This unpacks all tabs into the page as stacked <section data-tab> blocks, so the
 * download and print are complete; fitToContent in report-view shows one at a time on screen, with the sub-tab bar.
 * Browser-only (DOMParser). Anything that isn't that page comes back unchanged. The result is sanitized afterwards.
 */
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Tab = { key?: unknown; label?: unknown; html?: unknown; subs?: { label?: unknown; html?: unknown }[] };

export function expandTerminalTabs(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const data = doc.getElementById("tabdata");
  const body = doc.getElementById("tabbody");
  if (!data || !body) return html;

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
