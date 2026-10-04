import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { getAccess } from "@/lib/access";
import { isTestModeOn } from "@/lib/settings";
import { getT } from "@/i18n/server";

export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const access = await getAccess(session?.user?.email);
  const { t } = await getT();
  const links = [
    { href: "/dashboard", label: t.nav.home },
    { href: "/profile", label: t.nav.profile },
    ...(access.isAdmin
      ? [
          { href: "/deliver", label: t.nav.deliveries },
          { href: "/admin", label: t.nav.admin },
        ]
      : []),
  ];
  return (
    <>
      <Header links={links} />
      {access.isAdmin && (await isTestModeOn()) && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">{t.banner.testModeCustomer}</div>
      )}
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
