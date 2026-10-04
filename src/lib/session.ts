import { redirect } from "next/navigation";
import { auth, getUserById } from "@/auth";
import { getAccess } from "./access";
import type { Actor } from "./tokens";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const access = await getAccess(session.user.email);
  return { session, access };
}

/**
 * For customer pages: signed in, user row exists, and WhatsApp number is set.
 * Delivery staff (non-admins) only get the delivery screen.
 */
export async function requireUser({ allowIncompleteProfile = false } = {}) {
  const { session, access } = await requireSession();
  if (access.isDelivery && !access.isAdmin) redirect("/deliver");
  const user = await getUserById(session.user.id);
  if (!user) redirect("/");
  if (!allowIncompleteProfile && !user.whatsapp) redirect("/profile?setup=1");
  return { user, access };
}

export async function requireAdmin() {
  const { session, access } = await requireSession();
  if (!access.isAdmin) redirect("/");
  const actor: Actor = {
    email: session.user.email!.toLowerCase(),
    name: access.name ?? session.user.name ?? "Admin",
    role: "admin",
  };
  return { access, actor };
}

/** For the delivery screen: delivery staff and all admins. */
export async function requireStaff() {
  const { session, access } = await requireSession();
  if (!access.isDelivery) redirect("/");
  const actor: Actor = {
    email: session.user.email!.toLowerCase(),
    name: access.name ?? session.user.name ?? "Staff",
    role: access.isAdmin ? "admin" : "delivery",
  };
  return { isAdmin: access.isAdmin, actor };
}
