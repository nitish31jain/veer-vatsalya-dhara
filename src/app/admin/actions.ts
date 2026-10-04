"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { DeliveryError, grantTokens, markDelivery, undoDelivery } from "@/lib/tokens";
import { ownerEmails } from "@/lib/access";
import { setTestMode } from "@/lib/settings";
import { getT } from "@/i18n/server";
import { deliveryErrorText } from "@/i18n/errors";

const text = async () => (await getT()).t.errors;

function backTo(formData: FormData, error?: string): never {
  const url = new URL(String(formData.get("returnTo") || "/admin"), "http://x");
  if (error) url.searchParams.set("error", error);
  else url.searchParams.delete("error");
  redirect(url.pathname + url.search);
}

function isValidDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !isNaN(Date.parse(day));
}

export async function markDeliveryAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const day = String(formData.get("date"));
  const packets = Number(formData.get("packets") ?? 1);
  if (!isValidDay(day)) backTo(formData, (await text()).invalidDate);

  let error: string | undefined;
  try {
    await markDelivery(userId, day, packets, admin.actor);
  } catch (e) {
    if (e instanceof DeliveryError) error = await deliveryErrorText(e);
    else throw e;
  }
  revalidatePath("/admin");
  backTo(formData, error);
}

export async function markAllAction(formData: FormData) {
  const admin = await requireAdmin();
  const day = String(formData.get("date"));
  if (!isValidDay(day)) backTo(formData, (await text()).invalidDate);
  const userIds = formData.getAll("userId").map(String);

  const failed: string[] = [];
  for (const userId of userIds) {
    try {
      await markDelivery(userId, day, 1, admin.actor);
    } catch (e) {
      if (e instanceof DeliveryError) failed.push(userId);
      else throw e;
    }
  }
  revalidatePath("/admin");
  backTo(formData, failed.length ? (await text()).notMarked(failed.length) : undefined);
}

export async function undoDeliveryAction(formData: FormData) {
  const admin = await requireAdmin();
  await undoDelivery(String(formData.get("deliveryId")), admin.actor);
  revalidatePath("/admin");
  backTo(formData);
}

export async function grantTokensAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const tokens = Number(formData.get("tokens"));
  const note = String(formData.get("note") ?? "").trim() || (await getT()).t.admin.defaultGrantNote;
  if (!Number.isInteger(tokens) || tokens < 1 || tokens > 1000) backTo(formData, (await text()).invalidTokens);
  await grantTokens(userId, tokens, note, admin.actor);
  revalidatePath("/admin");
  backTo(formData);
}

export async function savePlanAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const nameHi = String(formData.get("nameHi") ?? "").trim() || null;
  const descriptionHi = String(formData.get("descriptionHi") ?? "").trim() || null;
  const tokens = Number(formData.get("tokens"));
  const pricePaise = Math.round(Number(formData.get("priceRupees")) * 100);
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const active = formData.get("active") === "on";
  const testOnly = formData.get("testOnly") === "on";

  if (!name || !Number.isInteger(tokens) || tokens < 1 || !(pricePaise >= 100)) {
    backTo(formData, (await text()).invalidPlan);
  }

  const values = { name, description, nameHi, descriptionHi, tokens, pricePaise, sortOrder, active, testOnly };
  if (id) await db.update(schema.plans).set(values).where(eq(schema.plans.id, id));
  else await db.insert(schema.plans).values(values);
  revalidatePath("/", "layout");
  backTo(formData);
}

export async function addTeamMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = formData.get("role") === "admin" ? "admin" : "delivery";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
    backTo(formData, (await text()).invalidTeamMember);
  }
  if (ownerEmails().includes(email)) backTo(formData, (await text()).alreadyOwner);
  await db
    .insert(schema.staff)
    .values({ email, name, role, addedBy: admin.actor.email })
    .onConflictDoUpdate({ target: schema.staff.email, set: { name, role, active: true } });
  revalidatePath("/", "layout");
  backTo(formData);
}

export async function updateTeamMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("staffId"));
  const [member] = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
  if (!member) backTo(formData);
  if (member.email === admin.actor.email) backTo(formData, (await text()).cantChangeSelf);

  const change: Partial<typeof schema.staff.$inferInsert> = {};
  if (formData.has("active")) change.active = formData.get("active") === "true";
  if (formData.has("role")) change.role = formData.get("role") === "admin" ? "admin" : "delivery";
  await db.update(schema.staff).set(change).where(eq(schema.staff.id, id));
  revalidatePath("/", "layout");
  backTo(formData);
}

export async function setTestModeAction(formData: FormData) {
  const admin = await requireAdmin();
  await setTestMode(formData.get("on") === "true", admin.actor.email);
  revalidatePath("/", "layout");
  backTo(formData);
}
