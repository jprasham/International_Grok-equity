export type ReportMetric = { label: string; value: string };

export type ReportSection = { title: string; body: string };

export type StructuredReport = {
  rating?: string;
  summary?: string;
  metrics?: ReportMetric[];
  sections?: ReportSection[];
  risks?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asMetrics(value: unknown): ReportMetric[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const metrics = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const label = asString(item.label);
    const metricValue = asString(item.value);
    return label && metricValue ? [{ label, value: metricValue }] : [];
  });
  return metrics.length ? metrics : undefined;
}

function asSections(value: unknown): ReportSection[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sections = value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const title = asString(item.title);
    const body = asString(item.body);
    return title && body ? [{ title, body }] : [];
  });
  return sections.length ? sections : undefined;
}

function asRisks(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const risks = value.flatMap((item) => {
    const risk = asString(item);
    return risk ? [risk] : [];
  });
  return risks.length ? risks : undefined;
}

/** Returns a structured report when the payload has at least one usable field. */
export function parseStructuredReport(value: unknown): StructuredReport | null {
  if (!isRecord(value)) return null;
  const report: StructuredReport = {
    rating: asString(value.rating),
    summary: asString(value.summary),
    metrics: asMetrics(value.metrics),
    sections: asSections(value.sections),
    risks: asRisks(value.risks),
  };
  if (!report.rating && !report.summary && !report.metrics && !report.sections && !report.risks) {
    return null;
  }
  return report;
}
