// React text children only: report strings are bot-supplied, so never dangerouslySetInnerHTML here.
import { Fragment } from "react";
import { ReportActions } from "@/app/reports/report-actions";
import { Card, CardContent } from "@/components/ui/card";
import { DL_HEADINGS, type DlTable } from "@/lib/dl-equity-report-v1";
import type { DlEquityReport } from "@/lib/dl-equity-report-v1.1";
import { dlPanels, dlSplitMarkers, dlTone, type DlBlock } from "@/lib/dl-report-blocks";
import { dlReportHtml } from "@/lib/dl-report-html";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  good: "border-live/40 bg-live/10 text-live",
  warn: "border-beta/40 bg-beta/10 text-beta", // no amber token in the theme, so AMBER uses beta and keeps its text label
  bad: "border-destructive/40 text-destructive",
  none: "border-border-soft bg-secondary text-muted-foreground",
};

function Chip({ value }: { value: string }) {
  return (
    <span className={cn("inline-block rounded-sm border px-1.5 py-0.5 font-mono text-xs tracking-[0.08em] whitespace-nowrap", TONE_CLASS[dlTone(value) ?? "none"])}>
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
  return (
    <div>
      {!hideTitle && <Label>{title}</Label>}
      <div className="overflow-x-auto rounded-sm border border-border-soft">
        <table className="w-full border-collapse text-left text-[13px]">
          {columns.some(Boolean) && (
            <thead className="bg-secondary">
              <tr>
                {columns.map((column, i) => (
                  <th key={i} scope="col" className="px-2.5 py-1.5 font-mono text-xs font-medium tracking-[0.04em] whitespace-nowrap text-muted-foreground">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t border-border-soft align-top first:border-t-0">
                {row.map((cell, c) => (
                  <td key={c} className="min-w-16 px-2.5 py-1.5">
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
      return <h3 className="mt-2 border-b border-border-soft pb-1.5 font-mono text-xs font-semibold tracking-[0.08em] text-primary">{block.text}</h3>;
    case "text":
      return (
        <p className={cn(block.tone === "lead" ? "font-semibold" : block.tone === "note" ? "text-xs text-muted-foreground" : block.tone === "quote" ? "border-l-2 border-border pl-3 text-dim italic" : "text-dim")}>
          {block.label && <span className="font-semibold text-foreground">{block.label}: </span>}
          <Marked text={block.text} />
        </p>
      );
    case "numbered":
      return <List items={block.items} ordered />;
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
      const box = "rounded-sm border border-border-soft p-3";
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
        <section className="mt-2 flex flex-col gap-2 rounded-sm border border-border-soft bg-secondary/50 p-3 text-xs">
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
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="border-border-soft">
        <CardContent className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.08em] text-primary">{chrome.kicker}</p>
          <h2 className="text-xl font-bold tracking-tight">{chrome.companyLine}</h2>
          <p className="text-[15px] text-dim">
            <Marked text={chrome.thesis} />
          </p>
          <dl className="flex flex-wrap gap-x-7 gap-y-2">
            {[
              ["Rating (paper)", chrome.ratingPaper],
              ["Target", chrome.target],
              ["Price", chrome.price],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="term-label">{label}</dt>
                <dd className="font-mono font-semibold">{dlTone(value) ? <Chip value={value} /> : value}</dd>
              </div>
            ))}
          </dl>
          <div className="print:hidden">
            <ReportActions html={dlReportHtml(report)} filename={`${ticker.replace(/[^\w-]/g, "_")}-equity-report.html`} />
          </div>
        </CardContent>
      </Card>

      {/* CSS-only tabs (globals.css): native radios give keyboard support without any tab JS. */}
      <div className="dl-tabs">
        {dlPanels(report).map((panel, i) => (
          <Fragment key={panel.id}>
            <input type="radio" name="dl-tab" id={`dl-tab-${panel.id}`} defaultChecked={i === 0} />
            <label htmlFor={`dl-tab-${panel.id}`}>{panel.label}</label>
            <section data-panel={panel.id} aria-label={panel.label} className="rounded-lg border border-border-soft bg-card p-4">
              <div className="flex flex-col gap-3.5">
                {panel.leadTitle && (
                  <h3 className="text-[15px] font-semibold tracking-tight">
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
