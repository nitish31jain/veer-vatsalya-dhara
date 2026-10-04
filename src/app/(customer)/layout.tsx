import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { getAccess } from "@/lib/access";
import { isTestModeOn } from "@/lib/settings";

export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const access = await getAccess(session?.user?.email);
  const links = [
    { href: "/dashboard", label: "Home" },
    { href: "/profile", label: "Profile" },
    ...(access.isAdmin
      ? [
          { href: "/deliver", label: "Deliveries" },
          { href: "/admin", label: "Admin" },
        ]
      : []),
  ];
  return (
    <>
      <Header links={links} />
      {access.isAdmin && (await isTestModeOn()) && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          Test mode is on: you (as admin) are charged ₹1 per packet. Customers pay normal prices.
        </div>
      )}
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
