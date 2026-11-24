// Format check only: AAPL, BRK.B, RDS-A, 7203 (Tokyo), 0700 (HKEX). Listing is not checked.
export const TICKER_PATTERN = "[A-Za-z0-9][A-Za-z0-9&.\\-]{0,19}";

// ponytail: fixed list, add an exchange here when the bot covers it.
export const EXCHANGES = [
  "NYSE",
  "NASDAQ",
  "LSE",
  "TSX",
  "XETRA",
  "EURONEXT",
  "SIX",
  "TSE",
  "HKEX",
  "ASX",
  "SGX",
  "KRX",
] as const;

export type Exchange = (typeof EXCHANGES)[number];

export const isExchange = (value: unknown): value is Exchange =>
  EXCHANGES.includes(value as Exchange);
