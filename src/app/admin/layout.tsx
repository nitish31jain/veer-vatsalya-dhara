import { requireAdmin } from "@/lib/session";
import { isTestModeOn } from "@/lib/settings";
import { Header } from "@/components/Header";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <>
      <Header
        links={[
          { href: "/dashboard", label: "Home" },
          { href: "/admin", label: "Daily deliveries" },
          { href: "/admin/customers", label: "Customers" },
          { href: "/admin/team", label: "Team" },
          { href: "/admin/plans", label: "Plans & test mode" },
          { href: "/deliver", label: "Delivery app" },
        ]}
      />
      {(await isTestModeOn()) && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          Test mode is on: admins are charged ₹1 per packet.
        </div>
      )}
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
