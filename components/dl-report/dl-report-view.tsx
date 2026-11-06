// React text children only: report strings are bot-supplied, so never dangerouslySetInnerHTML here.
import { Fragment } from "react";
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
      return (
        <div>
          <Label>{block.title}</Label>
          <ol className="overflow-hidden rounded-sm border border-border-soft">
            {block.rungs.map((rung, i) => {
              const current = rung.label === DL_HEADINGS.f10CurrentPrice;
              return (
                <li key={i} className={cn("flex flex-wrap justify-between gap-x-4 border-t border-border-soft px-2.5 py-1.5 first:border-t-0", current && "bg-primary/10 font-semibold text-primary")}>
                  <span>
                    <Marked text={rung.label} />
                  </span>
                  <span className="font-mono">{rung.value}</span>
                </li>
              );
            })}
          </ol>
        </div>
      );
    case "group": {
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
          {block.blocks.map((inner, i) => (
            <Block key={i} block={inner} />
          ))}
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
                {panel.blocks.map((block, b) => (
                  <Block key={b} block={block} />
                ))}
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
