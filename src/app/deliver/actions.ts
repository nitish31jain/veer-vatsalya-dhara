"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getUserById } from "@/auth";
import { requireStaff } from "@/lib/session";
import { todayIST } from "@/lib/format";
import { DeliveryError, markDelivery, undoDelivery } from "@/lib/tokens";

function back(formData: FormData, error?: string) {
  const q = String(formData.get("q") ?? "");
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (error) params.set("error", error);
  redirect(`/deliver${params.size ? `?${params}` : ""}`);
}

export async function staffMarkDeliveryAction(formData: FormData) {
  const staff = await requireStaff();
  const customer = await getUserById(String(formData.get("userId")));
  if (!customer) back(formData, "Customer not found");
  if (!staff.isAdmin && customer!.assignedStaffId !== staff.staffId) {
    back(formData, "This house is not assigned to you");
  }
  const packets = Number(formData.get("packets") ?? 1);

  let error: string | undefined;
  try {
    // Delivery staff can only mark today's delivery.
    await markDelivery(customer!.id, todayIST(), packets, staff.actor);
  } catch (e) {
    if (e instanceof DeliveryError) error = e.message;
    else throw e;
  }
  revalidatePath("/deliver");
  back(formData, error);
}

export async function staffUndoDeliveryAction(formData: FormData) {
  const staff = await requireStaff();
  const [delivery] = await db
    .select()
    .from(schema.deliveries)
    .where(eq(schema.deliveries.id, String(formData.get("deliveryId"))));
  if (!delivery) back(formData);
  if (!staff.isAdmin && (delivery.markedBy !== staff.actor.email || delivery.deliveryDate !== todayIST())) {
    back(formData, "You can only undo deliveries you marked today");
  }
  await undoDelivery(delivery.id, staff.actor);
  revalidatePath("/deliver");
  back(formData);
}
