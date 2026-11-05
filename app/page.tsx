import { GrokAttribution } from "@/components/grok-attribution";
import { PageBody, PageHero, Section } from "@/components/terminal";
import { ResearchForm } from "./research-form";

const SYNTAX = [
  ["RELIANCE", "NSE symbol"],
  ["BAJAJ-AUTO", "hyphens"],
  ["M&M", "ampersands"],
  ["500325", "BSE code"],
];

export default function Home() {
  return (
    <>
      <PageHero
        eyebrow="Market desk"
        title="Find the next signal."
        sub="Indian equities · NSE & BSE"
      >
        <GrokAttribution />
      </PageHero>
      <PageBody className="flex flex-col gap-8">
        <Section code="01" name="New research" desc="Opens the report when you run it">
          <ResearchForm />
        </Section>
        <Section code="02" name="Accepted formats">
          <ul className="flex flex-wrap gap-2">
            {SYNTAX.map(([ticker, note]) => (
              <li
                key={ticker}
                className="flex items-baseline gap-2 rounded-lg border border-border-soft bg-card px-3 py-2"
              >
                <span className="font-mono text-sm font-medium">{ticker}</span>
                <span className="font-mono text-xs tracking-[0.04em] text-muted-foreground">
                  {note}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </PageBody>
    </>
  );
}
