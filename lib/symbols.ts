import type { ListedSymbol } from "./symbol-types";
import raw from "./symbols-data.json";

export type { ListedSymbol } from "./symbol-types";

// Full NSE equity + active BSE equity dump. Rebuild with: npm run symbols:build
export const SYMBOLS = raw as ListedSymbol[];

const MAX_SHOWN = 50;

export function suggestSymbols(query: string, exchange: "NSE" | "BSE"): {
  items: ListedSymbol[];
  total: number;
} {
  const q = query.trim().toUpperCase();
  const pool = SYMBOLS.filter((symbol) => symbol.exchanges.includes(exchange));

  if (!q) {
    return { items: [], total: pool.length };
  }

  const scored = pool
    .map((symbol) => {
      const ticker = symbol.ticker.toUpperCase();
      const name = symbol.name.toUpperCase();
      let score = 0;
      if (ticker === q) score = 100;
      else if (ticker.startsWith(q)) score = 80;
      else if (name.startsWith(q)) score = 55;
      else if (ticker.includes(q)) score = 45;
      else if (name.includes(q)) score = 20;
      else return null;
      return { symbol, score };
    })
    .filter((row): row is { symbol: ListedSymbol; score: number } => row !== null)
    .sort((a, b) => b.score - a.score || a.symbol.ticker.localeCompare(b.symbol.ticker));

  return {
    items: scored.slice(0, MAX_SHOWN).map((row) => row.symbol),
    total: scored.length,
  };
}
