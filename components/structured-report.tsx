import type { StructuredReport } from "@/lib/report-schema";

const RATING_TONE: Record<string, string> = {
  buy: "border-live/40 bg-live/12 text-live",
  hold: "border-beta/40 bg-beta/12 text-beta",
  sell: "border-destructive/40 bg-transparent text-destructive",
};

export function StructuredReportView({ report }: { report: StructuredReport }) {
  const ratingKey = report.rating?.toLowerCase() ?? "";
  const ratingClass =
    RATING_TONE[ratingKey] ?? "border-border-soft bg-secondary text-foreground";

  return (
    <div className="overflow-hidden rounded-lg border border-border-soft bg-card">
      <div className="flex flex-wrap items-start gap-4 border-b border-border-soft px-4 py-4 sm:px-5">
        {report.rating && (
          <span
            className={`rounded-sm border px-2 py-1 font-mono text-xs tracking-[0.12em] uppercase ${ratingClass}`}
          >
            {report.rating}
          </span>
        )}
        {report.summary && (
          <p className="min-w-0 flex-1 text-[15px] leading-relaxed font-medium text-balance">
            {report.summary}
          </p>
        )}
      </div>

      {report.metrics && (
        <dl className="grid grid-cols-2 gap-px border-b border-border-soft bg-border-soft sm:grid-cols-4">
          {report.metrics.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className="bg-card px-4 py-3 sm:px-5">
              <dt className="term-label">{metric.label}</dt>
              <dd className="mt-1 font-mono text-sm font-semibold tracking-tight">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {report.sections?.map((section) => (
        <section
          key={section.title}
          className="border-b border-border-soft px-4 py-4 last:border-b-0 sm:px-5"
        >
          <h3 className="text-[15px] font-semibold tracking-[-0.005em]">{section.title}</h3>
          <p className="mt-2 whitespace-pre-wrap text-dim">{section.body}</p>
        </section>
      ))}

      {report.risks && (
        <section className="px-4 py-4 sm:px-5">
          <h3 className="term-label mb-3">Risks</h3>
          <ul className="flex flex-col gap-2">
            {report.risks.map((risk) => (
              <li
                key={risk}
                className="flex gap-2 border-l-2 border-destructive/50 pl-3 text-dim"
              >
                {risk}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
