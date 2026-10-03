import { auth } from "@/auth";
import { Header } from "@/components/Header";

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
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </>
  );
}
