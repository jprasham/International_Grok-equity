// React text children only: report strings are bot-supplied, so never dangerouslySetInnerHTML here.
import { Fragment, type ReactNode } from "react";
import { ReportActions } from "@/app/reports/report-actions";
import { DL_HEADINGS, type DlTable } from "@/lib/dl-equity-report-v1";
import type { DlEquityReport } from "@/lib/dl-equity-report-v1.1";
import { dlPanels, dlSplitMarkers, dlTone, type DlBlock } from "@/lib/dl-report-blocks";
import { dlReportHtml } from "@/lib/dl-report-html";
import { cn } from "@/lib/utils";

// Reference palette: solid tinted chips, text label kept so colour is never the only signal.
const TONE_CLASS = {
  good: "border-transparent bg-[#E7F6EC] text-live",
  warn: "border-transparent bg-[#FEF3E2] text-beta",
  bad: "border-transparent bg-[#FDECEA] text-destructive",
  none: "border-transparent bg-secondary text-muted-foreground",
};

function Chip({ value }: { value: string }) {
  return (
    <span className={cn("inline-block rounded-[3px] border px-1.5 py-px font-mono text-[11px] font-bold whitespace-nowrap", TONE_CLASS[dlTone(value) ?? "none"])}>
      {value}
    </span>
  );
}

/** Tags EST and U inside prose, so an estimate or unknown reads as one at a glance. */
function Marked({ text }: { text: string }) {
  return dlSplitMarkers(text).map((part, i) =>
    i % 2 ? (
      <span key={i} className={cn("rounded-sm px-0.5 font-mono text-[0.85em]", part === "EST" ? "bg-beta/10 text-beta" : "bg-secondary text-muted-foreground")}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

const Label = ({ children }: { children: string }) => <h4 className="term-label mb-1.5">{children}</h4>;

function Table({ table, hideTitle, rowMeta }: { table: DlTable; hideTitle?: boolean; rowMeta?: { note?: string }[] }) {
  const { title, columns, rows } = table;
  const grid = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
        {columns.some(Boolean) && (
          <thead>
            <tr>
              {columns.map((column, i) => (
                <th key={i} scope="col" className="border-b border-border-soft bg-secondary px-2 py-1.5 align-top font-mono text-[11px] font-semibold text-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="even:bg-[#FAFBFC]">
              {row.map((cell, c) => (
                <td key={c} className="border-b border-border-soft px-2 py-1.5 align-top">
                  {dlTone(cell) ? <Chip value={cell} /> : <Marked text={cell} />}
                  {c === row.length - 1 && rowMeta?.[r]?.note && (
                    <small className="mt-1 block text-muted-foreground">
                      <Marked text={rowMeta[r].note} />
                    </small>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (hideTitle) return grid;
  return (
    <div className="rounded-md border border-border-soft bg-card">
      <h4 className="border-b-2 border-primary px-3.5 pt-2.5 pb-1.5 text-xs font-bold tracking-[0.05em] text-primary">{title}</h4>
      <div className="p-3.5">{grid}</div>
    </div>
  );
}

function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={cn("flex flex-col gap-1.5 pl-5 text-dim", ordered ? "list-decimal" : "list-disc")}>
      {items.map((item, i) => (
        <li key={i}>
          <Marked text={item} />
        </li>
      ))}
    </Tag>
  );
}

const rupees = (value: string) => {
  const match = value.match(/₹\s*(\d[\d,]*(?:\.\d+)?)/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
};

/** Reference F10: each rung is a bar scaled to the highest price, with a line at the current price. */
function Ladder({ title, rungs }: { title: string; rungs: { label: string; value: string }[] }) {
  const prices = rungs.map((rung) => rupees(rung.value));
  const current = prices[rungs.findIndex((rung) => rung.label === DL_HEADINGS.f10CurrentPrice)];
  const max = Math.max(...prices.map((price) => price ?? 0));
  const barred = prices.every((price) => price !== null) && current != null && max > 0;
  return (
    <div className="rounded-md border border-border-soft bg-card p-3.5">
      <Label>{title}</Label>
      <ol>
        {rungs.map((rung, i) => {
          const price = prices[i];
          const isCurrent = rung.label === DL_HEADINGS.f10CurrentPrice;
          const up = price != null && current != null && price >= current;
          return (
            <li key={i} className={cn("grid items-center gap-2 py-0.5", barred ? "grid-cols-[minmax(140px,32%)_1fr_110px]" : "grid-cols-[1fr_auto]", isCurrent && "font-semibold text-primary")}>
              <span className="text-xs">
                <Marked text={rung.label} />
              </span>
              {barred && price != null && current != null && (
                <div className="relative h-3.5 rounded-[3px] bg-secondary">
                  <div className={cn("h-full rounded-[3px]", isCurrent ? "bg-primary" : up ? "bg-live/70" : "bg-destructive/70")} style={{ width: `${(price / max) * 100}%` }} />
                  <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-primary" style={{ left: `${(current / max) * 100}%` }} />
                </div>
              )}
              <span className={cn("text-right font-mono text-xs", !isCurrent && barred && (up ? "text-live" : "text-destructive"))}>{rung.value}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const STANCE_TOP = { BUY: "border-t-live", WATCHLIST: "border-t-beta", PASS: "border-t-destructive" } as Record<string, string>;
const MARK_TONE = { "✓": "text-live", "◐": "text-beta", "✗": "text-destructive" } as Record<string, string>;
const isInvestor = (block: DlBlock) => block.kind === "group" && block.badge !== undefined && Object.hasOwn(STANCE_TOP, block.badge);

/** Reference F13: one card per investor, coloured by stance, criteria as ruled lines. */
function InvestorCard({ block }: { block: Extract<DlBlock, { kind: "group" }> }) {
  return (
    <section className={cn("rounded-md border border-t-[3px] border-border-soft bg-card p-3 text-[13px] leading-snug", STANCE_TOP[block.badge!])}>
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="text-sm font-bold">{block.title}</span>
        <span className={cn("font-mono text-xs font-bold", STANCE_TOP[block.badge!].replace("border-t-", "text-"))}>{block.badge}</span>
      </div>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {block.blocks.map((inner, i) =>
          inner.kind === "table" && !inner.table.columns.some(Boolean) ? (
            <div key={i}>
              {inner.table.rows.map((row, r) => (
                <div key={r} className="grid grid-cols-[14px_1fr] gap-1.5 border-t border-border-soft py-1 text-xs">
                  <span className={cn("font-mono font-bold", MARK_TONE[row[0]])}>{row[0]}</span>
                  <span>
                    <span className="font-bold">{row[1]}</span>: <Marked text={row[2]} />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Block key={i} block={inner} />
          ),
        )}
      </div>
    </section>
  );
}

/** Reference F2: a ruled row per category: status dot, name, R/A/G/U counts, one-line read, then its checks. */
function CategoryRow({ block }: { block: Extract<DlBlock, { kind: "group" }> }) {
  const [r, a, g, u] = (block.meta?.match(/\d+/g) ?? []).map(Number);
  const dot = r > 0 ? "bg-destructive" : a > 0 ? "bg-beta" : g > 0 ? "bg-live" : "bg-muted-foreground";
  const [summary, ...rest] = block.blocks;
  return (
    <details className="group border-b border-border-soft">
      <summary className="grid cursor-pointer grid-cols-[14px_minmax(150px,1.2fr)_auto_minmax(180px,2fr)_16px] items-center gap-2.5 px-0.5 py-2 max-md:grid-cols-[14px_1fr_auto]">
        <span className={cn("size-3 rounded-full", dot)} />
        <span className="text-[13px] font-bold">{block.title}</span>
        <span className="font-mono text-[11px] whitespace-nowrap">
          <span className="mr-1.5 font-bold text-destructive">{r}R</span>
          <span className="mr-1.5 font-bold text-beta">{a}A</span>
          <span className="mr-1.5 font-bold text-live">{g}G</span>
          <span className="font-bold text-muted-foreground">{u}U</span>
        </span>
        <span className="text-xs text-muted-foreground max-md:hidden">{summary.kind === "text" && <Marked text={summary.text} />}</span>
        <span className="text-primary transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="flex flex-col gap-2.5 pb-2.5 pl-6">
        {summary.kind === "text" && <p className="text-xs text-muted-foreground md:hidden">{summary.text}</p>}
        {rest.map((inner, i) => (
          <Block key={i} block={inner} />
        ))}
      </div>
    </details>
  );
}

/** Investor cards sit side by side; everything else stacks. */
function Blocks({ blocks }: { blocks: DlBlock[] }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (isInvestor(blocks[i])) {
      const run: DlBlock[] = [];
      while (i < blocks.length && isInvestor(blocks[i])) run.push(blocks[i++]);
      i--;
      out.push(
        <div key={i} className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2.5">
          {run.map((card, c) => (
            <InvestorCard key={c} block={card as Extract<DlBlock, { kind: "group" }>} />
          ))}
        </div>,
      );
    } else out.push(<Block key={i} block={blocks[i]} />);
  }
  return out;
}

function Block({ block }: { block: DlBlock }) {
  switch (block.kind) {
    case "heading":
      return <h3 className="mt-2 border-b-2 border-primary pb-1.5 text-xs font-bold tracking-[0.05em] text-primary">{block.text}</h3>;
    case "text":
      return (
        <p className={cn(block.tone === "lead" ? "font-semibold" : block.tone === "note" ? "text-xs text-muted-foreground" : block.tone === "quote" ? "border-l-2 border-border pl-3 text-dim italic" : "text-dim")}>
          {block.label && <span className="font-semibold text-foreground">{block.label}: </span>}
          <Marked text={block.text} />
        </p>
      );
    case "numbered":
      return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-md border border-border-soft bg-card p-3 text-[13px] leading-normal">
              <span className="font-bold text-primary">{i + 1}. </span>
              <Marked text={item} />
            </div>
          ))}
        </div>
      );
    case "bullets":
      return (
        <div>
          {block.title && <Label>{block.title}</Label>}
          <List items={block.items} />
        </div>
      );
    case "table":
      return <Table table={block.table} hideTitle={block.hideTitle} rowMeta={block.rowMeta} />;
    case "ladder":
      return <Ladder title={block.title} rungs={block.rungs} />;
    case "group": {
      if (block.collapsible && block.meta) return <CategoryRow block={block} />;
      const head = (
        <>
          <span className="font-semibold">{block.title}</span>
          {block.badge && <Chip value={block.badge} />}
          {block.meta && (
            <span className="font-mono text-xs text-muted-foreground">
              <Marked text={block.meta} />
            </span>
          )}
        </>
      );
      const body = (
        <div className="mt-2.5 flex flex-col gap-2.5">
          <Blocks blocks={block.blocks} />
        </div>
      );
      const box = "rounded-md border border-border-soft bg-card p-3";
      return block.collapsible ? (
        <details className={box}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">{head}</summary>
          {body}
        </details>
      ) : (
        <section className={box}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{head}</div>
          {body}
        </section>
      );
    }
    case "sources": {
      const { sources, estDefinition, gaps, disclaimer } = block.value;
      return (
        <section className="mt-2 flex flex-col gap-2 rounded-md border border-border-soft bg-secondary/50 p-3 text-xs">
          <h4 className="term-label">{DL_HEADINGS.sourcesAndGaps}</h4>
          <List items={sources} />
          <p className="text-muted-foreground">
            <Marked text={estDefinition} />
          </p>
          <p className="font-semibold">Gaps</p>
          <List items={gaps} />
          <p className="text-muted-foreground">{disclaimer}</p>
        </section>
      );
    }
  }
}

export function DlReportView({ report }: { report: DlEquityReport }) {
  const { chrome, footer } = report;
  const ticker = /\(NSE: ([^\s)]+)\)$/.exec(chrome.companyLine)?.[1] ?? "report";

  return (
    <div className="olx flex min-w-0 flex-col gap-4">
      <div className="rounded-md border-b-[3px] border-[#7399C6] bg-primary px-4.5 py-4 text-primary-foreground">
        <p className="text-[11px] tracking-[0.1em] opacity-80">{chrome.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold">{chrome.companyLine}</h2>
        <p className="mt-1 text-sm opacity-90">
          <Marked text={chrome.thesis} />
        </p>
        <dl className="mt-2.5 flex flex-wrap items-center gap-x-4.5 gap-y-2 text-[13px]">
          {[
            ["Rating (paper)", chrome.ratingPaper],
            ["Target", chrome.target],
            ["Price", chrome.price],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-1.5">
              <dt>{label}</dt>
              <dd className="font-bold">{dlTone(value) ? <Chip value={value} /> : value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="print:hidden">
        <ReportActions html={dlReportHtml(report)} filename={`${ticker.replace(/[^\w-]/g, "_")}-equity-report.html`} />
      </div>

      {/* CSS-only tabs (globals.css): native radios give keyboard support without any tab JS. */}
      <div className="dl-tabs">
        {dlPanels(report).map((panel, i) => (
          <Fragment key={panel.id}>
            <input type="radio" name="dl-tab" id={`dl-tab-${panel.id}`} defaultChecked={i === 0} />
            <label htmlFor={`dl-tab-${panel.id}`}>{panel.label}</label>
            <section data-panel={panel.id} aria-label={panel.label} className="rounded-md bg-background py-1">
              <div className="flex flex-col gap-3.5">
                {panel.leadTitle && (
                  <h3 className="text-xl font-bold text-primary">
                    <Marked text={panel.leadTitle} />
                  </h3>
                )}
                <Blocks blocks={panel.blocks} />
              </div>
            </section>
          </Fragment>
        ))}
      </div>

      <footer className="flex flex-col gap-1 border-t border-border-soft pt-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">{footer.disclaimer}</p>
        <p>
          As of <Marked text={footer.asOfIst} /> · Price date <Marked text={footer.priceDate} />
        </p>
        <p>{footer.sourcesSummary}</p>
        <p>
          <Marked text={footer.estUDisclaimer} />
        </p>
      </footer>
    </div>
  );
}
