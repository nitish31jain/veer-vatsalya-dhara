import Link from "next/link";
import { auth, signOut } from "@/auth";
import { BRAND_NAME } from "@/lib/brand";
import { getT } from "@/i18n/server";
import { LanguageSwitch } from "./LanguageSwitch";
import { NavTabs } from "./NavTabs";

export async function Header({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const session = await auth();
  const { t } = await getT();
  const email = session?.user?.email;
  const name = session?.user?.name || email;

  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <Link href="/dashboard" className="font-semibold text-brand-700">
            🐄 {BRAND_NAME}
          </Link>
          {name && (
            <p className="truncate text-sm text-gray-700">
              {t.common.hi(name)}
              <span className="text-xs text-gray-500"> · {email}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <LanguageSwitch />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-sm text-gray-500 hover:text-gray-800">{t.common.signOut}</button>
          </form>
        </div>
      </div>
      <NavTabs links={links} />
    </header>
  );
}
