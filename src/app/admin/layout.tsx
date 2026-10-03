import { requireAdmin } from "@/lib/session";
import { Header } from "@/components/Header";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <>
      <Header
        links={[
          { href: "/admin", label: "Daily deliveries" },
          { href: "/admin/customers", label: "Customers" },
          { href: "/admin/plans", label: "Plans" },
          { href: "/dashboard", label: "My account" },
        ]}
      />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
