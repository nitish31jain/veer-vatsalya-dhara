import Link from "next/link";
import { auth, signOut } from "@/auth";
import { BRAND_NAME } from "@/lib/brand";

export async function Header({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];
  const email = session?.user?.email;

  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <Link href="/dashboard" className="font-semibold text-brand-700">
            🐄 {BRAND_NAME}
          </Link>
          {email && (
            <p className="truncate text-sm text-gray-700">
              Hi {firstName || email}
              <span className="text-xs text-gray-500"> · {email}</span>
            </p>
          )}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="shrink-0 text-sm text-gray-500 hover:text-gray-800">Sign out</button>
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
