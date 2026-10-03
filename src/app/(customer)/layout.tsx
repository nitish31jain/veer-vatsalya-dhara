import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { isTestMode } from "@/lib/plans";

export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const links = [
    { href: "/dashboard", label: "My Tokens" },
    { href: "/profile", label: "Profile" },
    ...(session?.user?.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return (
    <>
      <Header links={links} />
      {isTestMode() && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          Test mode: all packs are charged at ₹1 per packet
        </div>
      )}
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
