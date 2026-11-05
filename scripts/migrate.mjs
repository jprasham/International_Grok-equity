import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (env or .env.local).");
  process.exit(1);
}

await neon(process.env.DATABASE_URL).query(`
  CREATE TABLE IF NOT EXISTS reports (
    id uuid PRIMARY KEY,
    ticker text NOT NULL,
    exchange text NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'researching', 'done', 'failed')),
    requested_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    report_url text,
    report_html text,
    report_json jsonb,
    error text
  )
`);
console.log("reports table ready.");
