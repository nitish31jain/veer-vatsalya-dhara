"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Highlights the tab whose path best matches the current page (longest prefix wins). */
export function NavTabs({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 pb-2 text-sm">
      {links.map((l) => {
        const isActive = l.href === active;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 ${
              isActive ? "bg-brand-600 font-medium text-white" : "text-gray-700 hover:bg-brand-50"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
