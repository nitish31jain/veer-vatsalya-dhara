"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { DeliveryError, grantTokens, markDelivery, undoDelivery } from "@/lib/tokens";

function backTo(formData: FormData, error?: string) {
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
  if (!isValidDay(day)) backTo(formData, "Invalid date");

  let error: string | undefined;
  try {
    await markDelivery(userId, day, packets, admin.email ?? "admin");
  } catch (e) {
    if (e instanceof DeliveryError) error = e.message;
    else throw e;
  }
  revalidatePath("/admin");
  backTo(formData, error);
}

export async function markAllAction(formData: FormData) {
  const admin = await requireAdmin();
  const day = String(formData.get("date"));
  if (!isValidDay(day)) backTo(formData, "Invalid date");
  const userIds = formData.getAll("userId").map(String);

  const failed: string[] = [];
  for (const userId of userIds) {
    try {
      await markDelivery(userId, day, 1, admin.email ?? "admin");
    } catch (e) {
      if (e instanceof DeliveryError) failed.push(userId);
      else throw e;
    }
  }
  revalidatePath("/admin");
  backTo(formData, failed.length ? `${failed.length} customer(s) could not be marked` : undefined);
}

export async function undoDeliveryAction(formData: FormData) {
  await requireAdmin();
  await undoDelivery(String(formData.get("deliveryId")));
  revalidatePath("/admin");
  backTo(formData);
}

export async function grantTokensAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId"));
  const tokens = Number(formData.get("tokens"));
  const note = String(formData.get("note") ?? "").trim() || "Manual grant";
  if (!Number.isInteger(tokens) || tokens < 1 || tokens > 1000) backTo(formData, "Enter a valid number of tokens");
  await grantTokens(userId, tokens, note);
  revalidatePath("/admin");
  backTo(formData);
}

export async function savePlanAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const tokens = Number(formData.get("tokens"));
  const pricePaise = Math.round(Number(formData.get("priceRupees")) * 100);
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const active = formData.get("active") === "on";

  if (!name || !Number.isInteger(tokens) || tokens < 1 || !(pricePaise >= 100)) {
    backTo(formData, "Plan needs a name, at least 1 token and a price of at least ₹1");
  }

  const values = { name, description, tokens, pricePaise, sortOrder, active };
  if (id) await db.update(schema.plans).set(values).where(eq(schema.plans.id, id));
  else await db.insert(schema.plans).values(values);
  revalidatePath("/", "layout");
  backTo(formData);
}
