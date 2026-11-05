"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Research" },
  { href: "/reports", label: "Reports" },
];

export function Tabs({ pathname }: { pathname?: string }) {
  return (
    <nav aria-label="Primary" className="-ml-2.5 flex h-10 items-stretch sm:ml-0 sm:h-full">
      {TABS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex items-center border-b-2 border-transparent px-2.5 font-medium tracking-[0.02em] text-muted-foreground transition-colors hover:text-dim focus-visible:-outline-offset-2 aria-[current=page]:border-primary aria-[current=page]:text-foreground sm:px-4"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ActiveTabs() {
  return <Tabs pathname={usePathname()} />;
}
