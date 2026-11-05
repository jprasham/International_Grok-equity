"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TICKER_PATTERN } from "@/lib/ticker";
import { suggestSymbols, SYMBOLS, type ListedSymbol } from "@/lib/symbols";

export function ResearchForm() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
  const [ticker, setTicker] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const { items: suggestions, total } = useMemo(
    () => suggestSymbols(ticker, exchange),
    [ticker, exchange],
  );
  const exchangeCount = useMemo(
    () => SYMBOLS.filter((symbol) => symbol.exchanges.includes(exchange)).length,
    [exchange],
  );
  const showList = open && (suggestions.length > 0 || ticker.trim().length > 0);

  function pick(symbol: ListedSymbol) {
    setTicker(symbol.ticker);
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }

  function onTickerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length) {
        setOpen(true);
        setActive(0);
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && suggestions[active]) {
      event.preventDefault();
      pick(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Card className="border-border-soft shadow-[0_1px_0_rgba(16,18,20,0.04)]">
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            setOpen(false);
            try {
              const res = await fetch("/api/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker, exchange }),
              });
              const data = await res.json();
              if (data.id) {
                router.push(`/reports/${data.id}`);
              } else {
                setError(data.error);
              }
            } catch {
              setError("Request failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset>
            <legend className="term-label mb-2">Exchange</legend>
            <div className="flex gap-2">
              {(["NSE", "BSE"] as const).map((value) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-full border border-input bg-background px-3.5 py-1.5 font-mono text-xs tracking-[0.06em] transition-colors hover:bg-accent has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
                >
                  <input
                    type="radio"
                    name="exchange"
                    value={value}
                    checked={exchange === value}
                    onChange={() => {
                      setExchange(value);
                      setActive(0);
                    }}
                    className="sr-only"
                  />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="ticker" className="term-label mb-2 block">
              Ticker
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  ref={inputRef}
                  id="ticker"
                  name="ticker"
                  required
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={20}
                  pattern={TICKER_PATTERN}
                  title="Letters, digits, &, . or -, up to 20 characters"
                  placeholder="Type to search — RELIANCE, TCS, 500325…"
                  value={ticker}
                  role="combobox"
                  aria-expanded={showList}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    showList && suggestions[active] ? `${listId}-${active}` : undefined
                  }
                  aria-describedby="ticker-error ticker-hint"
                  onChange={(event) => {
                    setTicker(event.target.value.toUpperCase());
                    setOpen(true);
                    setActive(0);
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setOpen(false), 120);
                  }}
                  onKeyDown={onTickerKeyDown}
                  className="h-11 border-input pl-9 font-mono text-base uppercase placeholder:normal-case"
                />
                {showList && (
                  <ul
                    id={listId}
                    role="listbox"
                    aria-label="Ticker suggestions"
                    className="absolute top-full right-0 left-0 z-20 mt-1 max-h-80 overflow-auto rounded-lg border border-border-soft bg-popover py-1 shadow-[0_8px_24px_rgba(16,18,20,0.18)]"
                  >
                    {suggestions.length === 0 ? (
                      <li className="px-3 py-2 text-muted-foreground">No matches in {exchange}.</li>
                    ) : (
                      suggestions.map((symbol, index) => (
                        <li key={`${symbol.ticker}-${symbol.name}`} role="presentation">
                          <button
                            type="button"
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === active}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pick(symbol)}
                            onMouseEnter={() => setActive(index)}
                            className={`flex w-full items-baseline gap-3 px-3 py-2 text-left transition-colors ${
                              index === active
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/60"
                            }`}
                          >
                            <span className="shrink-0 font-mono text-sm font-semibold tracking-tight">
                              {symbol.ticker}
                            </span>
                            <span className="truncate text-muted-foreground">{symbol.name}</span>
                          </button>
                        </li>
                      ))
                    )}
                    {total > suggestions.length && (
                      <li className="border-t border-border-soft px-3 py-2 font-mono text-xs tracking-[0.04em] text-muted-foreground">
                        Showing {suggestions.length} of {total.toLocaleString("en-IN")} matches —
                        keep typing to narrow
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-11 px-6 font-semibold tracking-[0.04em] motion-safe:transition-transform"
              >
                {busy ? "Running…" : "Research"}
              </Button>
            </div>
            <p id="ticker-hint" className="mt-2 font-mono text-xs tracking-[0.04em] text-muted-foreground">
              {exchangeCount.toLocaleString("en-IN")} {exchange} symbols loaded — type to search.
              Unlisted tickers still submit.
            </p>
            <p
              id="ticker-error"
              aria-live="polite"
              className="mt-2 text-destructive empty:hidden"
            >
              {error}
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
