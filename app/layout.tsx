import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { ActiveTabs, Tabs } from "@/components/nav-tabs";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: "italic",
  weight: "600",
});

export const metadata: Metadata = {
  title: "Ticker Research",
  description: "Terminal-style research for NSE and BSE tickers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class before paint, so the server's markup can't match it.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <a
            href="#content"
            className="sr-only rounded-lg bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60"
          >
            Skip to content
          </a>
          <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-3 sm:gap-6 sm:px-4 print:hidden">
            <Link
              href="/"
              className="flex h-full items-center gap-2 border-r pr-3 text-[15px] font-bold tracking-[0.01em] focus-visible:-outline-offset-2 sm:pr-5"
            >
              <span aria-hidden className="text-[11px] text-primary">
                ◆
              </span>
              <span>
                Ticker <span className="max-sm:sr-only">Research</span>
              </span>
            </Link>
            {/* The pathname is unknown while prerendering /reports/[id], so it suspends here. */}
            <Suspense fallback={<Tabs />}>
              <ActiveTabs />
            </Suspense>
            <div className="ml-auto flex items-center gap-2 font-mono text-xs tracking-[0.06em] text-muted-foreground sm:gap-4">
              {["NSE", "BSE"].map((exchange) => (
                <span
                  key={exchange}
                  className="hidden rounded-full border bg-background px-2.5 py-1 md:inline"
                >
                  {exchange}
                </span>
              ))}
              <ThemeToggle />
            </div>
          </header>
          <main id="content" className="flex flex-1 flex-col">
            {children}
          </main>
          <footer className="flex flex-col justify-between gap-1 border-t bg-card px-4 py-4 sm:flex-row sm:items-center sm:px-8">
            <span className="font-mono text-xs tracking-[0.06em] text-muted-foreground print:hidden">
              TICKER RESEARCH · NSE · BSE
            </span>
            <span className="text-dim">Paper analysis only, not investment advice.</span>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
