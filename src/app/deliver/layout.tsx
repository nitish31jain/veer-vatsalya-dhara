import { requireStaff } from "@/lib/session";
import { Header } from "@/components/Header";
import { getT } from "@/i18n/server";

export default async function DeliverLayout({ children }: LayoutProps<"/deliver">) {
  const staff = await requireStaff();
  const { t } = await getT();
  return (
    <>
      <Header
        links={
          staff.isAdmin
            ? [
                { href: "/dashboard", label: t.nav.home },
                { href: "/deliver", label: t.nav.todaysDeliveries },
                { href: "/admin", label: t.nav.admin },
              ]
            : [{ href: "/deliver", label: t.nav.todaysDeliveries }]
        }
      />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
