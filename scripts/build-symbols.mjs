import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nsePath = join(root, "data", "nse-equity.csv");
const bsePath = join(root, "data", "bse-symbols.csv");
const outPath = join(root, "lib", "symbols-data.json");

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

async function readCsv(path) {
  const rows = [];
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  let headers = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line.replace(/^\uFEFF/, ""));
    if (!headers) {
      headers = cells.map((h) => h.trim());
      continue;
    }
    const row = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
    rows.push(row);
  }
  return rows;
}

function cleanName(name) {
  return name
    .replace(/&amp;/g, "&")
    .replace(/\s+-\$?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function upsert(byKey, { ticker, name, exchange, isin }) {
  const key = isin || `${exchange}:${ticker}`;
  const existing = byKey.get(key);
  if (existing) {
    if (!existing.exchanges.includes(exchange)) existing.exchanges.push(exchange);
    if (name.length > existing.name.length) existing.name = name;
    // Prefer alphabetic ticker over numeric when merging via ISIN.
    if (/^\d+$/.test(existing.ticker) && !/^\d+$/.test(ticker)) existing.ticker = ticker;
    return;
  }
  byKey.set(key, { ticker, name, exchanges: [exchange], isin: isin || undefined });
}

const nseRows = await readCsv(nsePath);
const bseRows = await readCsv(bsePath);
const byIsin = new Map();
const extras = [];

for (const row of nseRows) {
  const ticker = (row.SYMBOL || "").trim().toUpperCase();
  const name = cleanName(row["NAME OF COMPANY"] || "");
  const isin = (row["ISIN NUMBER"] || "").trim().toUpperCase();
  if (!ticker || !name) continue;
  upsert(byIsin, { ticker, name, exchange: "NSE", isin });
}

for (const row of bseRows) {
  const status = (row.Status || "").trim();
  const instrument = (row.Instrument || "").trim();
  if (status && status.toLowerCase() !== "active") continue;
  if (instrument && instrument.toLowerCase() !== "equity") continue;

  const ticker = (row["Security Id"] || "").trim().toUpperCase().replace(/\$$/, "");
  const code = (row["Security Code"] || "").trim();
  const name = cleanName(row["Security Name"] || "");
  const isin = (row["ISIN No"] || "").trim().toUpperCase();
  if (!ticker || !name) continue;

  upsert(byIsin, { ticker, name, exchange: "BSE", isin });

  // Numeric BSE codes remain searchable separately.
  if (/^\d{4,6}$/.test(code)) {
    extras.push({
      ticker: code,
      name,
      exchanges: ["BSE"],
    });
  }
}

const merged = [...byIsin.values()].map(({ ticker, name, exchanges }) => ({
  ticker,
  name,
  exchanges: [...new Set(exchanges)].sort(),
}));

// Dedupe numeric codes against merged tickers.
const seen = new Set(merged.map((s) => `${s.exchanges.join(",")}:${s.ticker}`));
for (const extra of extras) {
  const key = `BSE:${extra.ticker}`;
  if (seen.has(key)) continue;
  seen.add(key);
  merged.push(extra);
}

merged.sort((a, b) => a.ticker.localeCompare(b.ticker));

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(merged));
console.log(
  JSON.stringify({
    nseRows: nseRows.length,
    bseRows: bseRows.length,
    symbols: merged.length,
    out: outPath,
  }),
);
