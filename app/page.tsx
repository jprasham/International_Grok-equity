import { ResearchForm } from "./research-form";

const SYNTAX = [
  ["RELIANCE", "NSE symbol"],
  ["BAJAJ-AUTO", "hyphens are valid"],
  ["M&M", "so are ampersands"],
  ["500325", "BSE scrip code"],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-8">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          {"// indian equities desk"}
        </p>
        <h1 className="text-5xl leading-none font-bold tracking-tight text-primary sm:text-7xl">
          Name a ticker
          <span aria-hidden className="cursor-blink">
            _
          </span>
        </h1>
      </div>

      <ResearchForm />

      <section aria-labelledby="syntax-heading" className="text-sm">
        <h2 id="syntax-heading" className="mb-2 text-muted-foreground">
          --help
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-1">
          {SYNTAX.map(([ticker, note]) => (
            <div key={ticker} className="contents">
              <dt className="text-primary">{ticker}</dt>
              <dd className="text-muted-foreground">{note}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
