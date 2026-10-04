import { requireStaff } from "@/lib/session";
import { Header } from "@/components/Header";

export default async function DeliverLayout({ children }: LayoutProps<"/deliver">) {
  const staff = await requireStaff();
  return (
    <>
      <Header
        links={
          staff.isAdmin
            ? [
                { href: "/dashboard", label: "Home" },
                { href: "/deliver", label: "Today's deliveries" },
                { href: "/admin", label: "Admin" },
              ]
            : [{ href: "/deliver", label: "Today's deliveries" }]
        }
      />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
