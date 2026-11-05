import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHero({
  title,
  sub,
  ticker = false,
  children,
}: {
  title: string;
  sub: string;
  /** Capitals in the display italic are hard to read, so tickers use the data face. */
  ticker?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="border-b bg-linear-to-b from-card to-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-8 sm:pt-7 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="min-w-0">
          <h1
            className={cn(
              "text-[28px] leading-[1.2] font-semibold tracking-[-0.015em] wrap-break-word",
              ticker ? "font-mono" : "font-display italic",
            )}
          >
            {title}
          </h1>
          <p className="mt-1 font-mono text-xs tracking-[0.06em] text-muted-foreground">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-6", className)}>
      {children}
    </div>
  );
}

export function Section({
  code,
  name,
  desc,
  children,
}: {
  code: string;
  name: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b border-border-soft pb-2.5">
        <span className="font-mono text-xs font-semibold tracking-[0.14em] text-primary">
          {code}
        </span>
        <h2 className="text-[15px] font-semibold tracking-[-0.005em]">{name}</h2>
        {desc && <p className="text-muted-foreground sm:ml-auto">{desc}</p>}
      </div>
      {children}
    </section>
  );
}
