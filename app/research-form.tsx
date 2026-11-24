"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EXCHANGES, TICKER_PATTERN, type Exchange } from "@/lib/ticker";

export function ResearchForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchange, setExchange] = useState<Exchange>("NASDAQ");
  const [ticker, setTicker] = useState("");

  return (
    <Card className="border-border-soft shadow-[0_1px_0_rgba(16,18,20,0.04)]">
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="exchange" className="term-label mb-2 block">
                Exchange
              </label>
              {/* ponytail: native select; swap for a combobox if the list outgrows a dropdown. */}
              <select
                id="exchange"
                name="exchange"
                value={exchange}
                onChange={(event) => setExchange(event.target.value as Exchange)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm tracking-[0.06em] sm:w-40"
              >
                {EXCHANGES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="ticker" className="term-label mb-2 block">
                Ticker
              </label>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="ticker"
                  name="ticker"
                  required
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={20}
                  pattern={TICKER_PATTERN}
                  title="Letters, digits, &, . or -, up to 20 characters"
                  placeholder="AAPL, BRK.B, 7203…"
                  value={ticker}
                  aria-describedby="ticker-error ticker-hint"
                  onChange={(event) => setTicker(event.target.value.toUpperCase())}
                  className="h-11 border-input pl-9 font-mono text-base uppercase placeholder:normal-case"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="h-11 px-6 font-semibold tracking-[0.04em] motion-safe:transition-transform"
            >
              {busy ? "Queuing…" : "Research"}
            </Button>
          </div>
          <p id="ticker-hint" className="-mt-3 font-mono text-xs tracking-[0.04em] text-muted-foreground">
            Type the ticker as the exchange lists it. Format is checked, listing is not.
          </p>
          <p id="ticker-error" aria-live="polite" className="-mt-3 text-destructive empty:hidden">
            {error}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
