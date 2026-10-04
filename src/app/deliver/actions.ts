"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getUserById } from "@/auth";
import { requireStaff } from "@/lib/session";
import { todayIST } from "@/lib/format";
import { DeliveryError, markDelivery, undoDelivery } from "@/lib/tokens";
import { getT } from "@/i18n/server";
import { deliveryErrorText } from "@/i18n/errors";

function back(formData: FormData, error?: string): never {
  const q = String(formData.get("q") ?? "");
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (error) params.set("error", error);
  redirect(`/deliver${params.size ? `?${params}` : ""}`);
}

export async function staffMarkDeliveryAction(formData: FormData) {
  const staff = await requireStaff();
  const customer = await getUserById(String(formData.get("userId")));
  if (!customer) back(formData, (await getT()).t.errors.customerNotFound);
  const packets = Number(formData.get("packets") ?? 1);

  let error: string | undefined;
  try {
    // The delivery screen only marks today's delivery; admins can back-date from /admin.
    await markDelivery(customer.id, todayIST(), packets, staff.actor);
  } catch (e) {
    if (e instanceof DeliveryError) error = await deliveryErrorText(e);
    else throw e;
  }
  revalidatePath("/deliver");
  back(formData, error);
}

/** Admins only — delivery staff cannot undo deliveries. */
export async function adminUndoTodayAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff.isAdmin) back(formData, (await getT()).t.errors.onlyAdminsUndo);
  const [delivery] = await db
    .select()
    .from(schema.deliveries)
    .where(eq(schema.deliveries.id, String(formData.get("deliveryId"))));
  if (delivery) await undoDelivery(delivery.id, staff.actor);
  revalidatePath("/deliver");
  back(formData);
}
