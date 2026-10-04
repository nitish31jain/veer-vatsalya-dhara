import { requireAdmin } from "@/lib/session";
import { isTestModeOn } from "@/lib/settings";
import { Header } from "@/components/Header";
import { getT } from "@/i18n/server";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const { t } = await getT();
  return (
    <>
      <Header
        links={[
          { href: "/dashboard", label: t.nav.home },
          { href: "/admin", label: t.nav.dailyDeliveries },
          { href: "/admin/customers", label: t.nav.customers },
          { href: "/admin/team", label: t.nav.team },
          { href: "/admin/plans", label: t.nav.plans },
          { href: "/deliver", label: t.nav.deliveryApp },
        ]}
      />
      {(await isTestModeOn()) && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">{t.banner.testModeAdmin}</div>
      )}
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
