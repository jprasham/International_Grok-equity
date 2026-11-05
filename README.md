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

There is no database. In-flight reports and the last completed report live in an in-memory `Map` (`lib/reports.ts`). A newly completed report replaces the previous one, and up to 20 entries are tracked. After a report finishes, its page gives the browser a sanitized copy to download as HTML, and that copy doesn't depend on the server once loaded.

**Multi-instance caveat:** the `Map` belongs to one server process. On Vercel or any other multi-instance host, a restart, a cold start, or a request routed to a different instance won't see the report. The bot's callback then gets a 404 and the report is lost, and a browser polling the report page sees a 404. Research that runs for minutes is the most exposed. Run a single long-lived instance, or add a shared store, if this matters.

See [docs/BOT_CONTRACT.md](docs/BOT_CONTRACT.md) for the webhook flow.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
