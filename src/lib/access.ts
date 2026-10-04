import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Owners listed in ADMIN_EMAILS are always admins and can't be removed from the app. */
export function ownerEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type Access = {
  isAdmin: boolean;
  /** Can use the delivery screen. True for every admin. */
  isDelivery: boolean;
  name: string | null;
};

/** Looked up on every request so role changes and removals take effect immediately. */
export async function getAccess(email: string | null | undefined): Promise<Access> {
  if (!email) return { isAdmin: false, isDelivery: false, name: null };
  const normalized = email.toLowerCase();
  if (ownerEmails().includes(normalized)) return { isAdmin: true, isDelivery: true, name: null };
  const [member] = await db
    .select()
    .from(schema.staff)
    .where(and(eq(schema.staff.email, normalized), eq(schema.staff.active, true)));
  if (!member) return { isAdmin: false, isDelivery: false, name: null };
  const isAdmin = member.role === "admin";
  return { isAdmin, isDelivery: true, name: member.name };
}
