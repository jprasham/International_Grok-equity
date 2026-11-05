import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHero({
  title,
  sub,
  eyebrow,
  ticker = false,
  children,
}: {
  title: string;
  sub: string;
  eyebrow?: string;
  /** Capitals in display faces are harder to scan, so tickers use the data face. */
  ticker?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="pulse-wash border-b">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-8 sm:pt-9 sm:pb-8 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 font-mono text-xs tracking-[0.16em] text-primary uppercase">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "text-[28px] leading-[1.1] font-bold tracking-[-0.03em] wrap-break-word sm:text-[34px]",
              ticker ? "font-mono font-semibold tracking-[-0.02em]" : "font-display",
            )}
          >
            {title}
          </h1>
          <p className="mt-2 font-mono text-xs tracking-[0.06em] text-muted-foreground">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-7", className)}>
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
