import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth, getUserById } from "@/auth";
import { db, schema } from "@/db";
import type { Actor } from "./tokens";

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
  const actor: Actor = {
    email: session.user.email ?? "admin",
    name: session.user.name ?? "Admin",
    role: "admin",
  };
  return { ...session.user, actor };
}

/** Active delivery-staff record for an email, if any. Checked on every request so removal is immediate. */
export async function getActiveStaff(email: string | null | undefined) {
  if (!email) return undefined;
  const [member] = await db
    .select()
    .from(schema.staff)
    .where(and(eq(schema.staff.email, email.toLowerCase()), eq(schema.staff.active, true)));
  return member;
}

/** For delivery pages: an active delivery person, or an admin (who can deliver to every house). */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.isAdmin) {
    const actor: Actor = { email: session.user.email ?? "admin", name: session.user.name ?? "Admin", role: "admin" };
    return { staffId: null, isAdmin: true, actor };
  }
  const member = await getActiveStaff(session.user.email);
  if (!member) redirect("/dashboard");
  const actor: Actor = { email: member.email, name: member.name, role: "delivery" };
  return { staffId: member.id, isAdmin: false, actor };
}
