import Link from "next/link";
import { signOut } from "@/auth";
import { BRAND_NAME } from "@/lib/brand";

export function Header({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/dashboard" className="font-semibold text-brand-700">
          🐄 {BRAND_NAME}
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
        </form>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 pb-2 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="whitespace-nowrap rounded-full px-3 py-1.5 text-gray-700 hover:bg-brand-50"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
