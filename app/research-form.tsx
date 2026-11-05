"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TICKER_PATTERN } from "@/lib/ticker";

export function ResearchForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  return (
    <div className="border bg-card">
      <form
        className="p-4 sm:p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setBusy(true);
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
              setOutput(`error: ${data.error}`);
            }
          } catch {
            setOutput("error: request failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="mb-4 flex items-center gap-3 text-sm">
          <legend className="sr-only">Exchange</legend>
          {["NSE", "BSE"].map((exchange) => (
            <label
              key={exchange}
              className="cursor-pointer border px-3 py-1 has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
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
        </fieldset>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label htmlFor="ticker" className="text-muted-foreground">
            research@dalal:~$
          </label>
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
            className="h-11 min-w-40 flex-1 border-0 border-b bg-transparent px-1 text-xl uppercase placeholder:normal-case md:text-xl dark:bg-transparent"
          />
          <Button type="submit" disabled={busy} className="h-11 px-5 font-bold">
            {busy ? "RUNNING…" : "RUN ↵"}
          </Button>
        </div>
      </form>

      <pre
        aria-live="polite"
        className="min-h-24 overflow-x-auto border-t p-4 text-sm whitespace-pre-wrap sm:px-6"
      >
        {output ?? "awaiting input"}
      </pre>
    </div>
  );
}
