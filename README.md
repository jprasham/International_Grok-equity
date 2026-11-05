This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Report storage

There is no database. In-flight reports live in an in-memory `Map` (`lib/reports.ts`), one per server instance. On a `done` callback, the report is also written to Vercel Blob at `ticker-research/last-report.json`, replacing the previous one, and every instance can read it from there. Callbacks upsert, so one landing on an instance that never saw the request creates the row instead of failing. Have the bot echo `ticker` and `exchange`, or the row shows `Unknown`/`NSE`.

**One-time setup:** create a free Blob store with **private** access and connect it to this project, so that `BLOB_READ_WRITE_TOKEN` is set, then redeploy. Use Dashboard > Storage > Create > Blob.

**Without the token** the app still runs, but reports stay per-instance: a callback gets a 200, but the report can only be seen on the instance that received it, and only until that instance goes away.

After a report finishes, its page gives the browser a sanitized copy to download as HTML, and that copy doesn't depend on the server once loaded.

See [docs/BOT_CONTRACT.md](docs/BOT_CONTRACT.md) for the webhook flow.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
