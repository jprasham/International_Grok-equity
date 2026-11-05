import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Ticker Research",
  description: "Terminal-style research for NSE and BSE tickers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2 text-sm sm:px-8">
          <Link href="/" className="font-bold text-primary hover:underline">
            TICKER_RESEARCH
          </Link>
          <nav>
            <Link href="/reports" className="hover:text-primary hover:underline">
              /reports
            </Link>
          </nav>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t px-4 py-3 text-sm text-muted-foreground sm:px-8">
          Paper analysis only, not investment advice.
        </footer>
      </body>
    </html>
  );
}
