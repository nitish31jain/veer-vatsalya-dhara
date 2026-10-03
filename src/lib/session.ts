import { redirect } from "next/navigation";
import { auth, getUserById } from "@/auth";

/** For customer pages: signed in, user row exists, and WhatsApp number is set. */
export async function requireUser({ allowIncompleteProfile = false } = {}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const user = await getUserById(session.user.id);
  if (!user) redirect("/");
  if (!allowIncompleteProfile && !user.whatsapp) redirect("/profile?setup=1");
  return { user, isAdmin: session.user.isAdmin };
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.isAdmin) redirect("/dashboard");
  return session.user;
}
