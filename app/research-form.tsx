"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TICKER_PATTERN } from "@/lib/ticker";

export function ResearchForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ticker: form.get("ticker"),
                  exchange: form.get("exchange"),
                }),
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
              {["NSE", "BSE"].map((exchange) => (
                <label
                  key={exchange}
                  className="cursor-pointer rounded-full border border-input bg-background px-3 py-1.5 font-mono text-xs tracking-[0.06em] transition-colors hover:bg-accent has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
                >
                  <input
                    type="radio"
                    name="exchange"
                    value={exchange}
                    defaultChecked={exchange === "NSE"}
                    className="sr-only"
                  />
                  {exchange}
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
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
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
                  placeholder="RELIANCE"
                  aria-describedby="ticker-error"
                  className="h-10 pl-9 font-mono uppercase placeholder:normal-case"
                />
              </div>
              <Button type="submit" disabled={busy} className="h-10 px-5">
                {busy ? "Running…" : "Run research"}
              </Button>
            </div>
            {/* Always rendered: a live region has to exist before its text changes. */}
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
