"use server";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { normalizeIndianMobile } from "@/lib/phone";
import { createCashfreeOrder } from "@/lib/cashfree";

export type FormState = { error?: string; ok?: boolean };

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireUser({ allowIncompleteProfile: true });
  const whatsapp = normalizeIndianMobile(String(formData.get("whatsapp") ?? ""));
  if (!whatsapp) return { error: "Enter a valid 10-digit Indian mobile number" };
  const address = String(formData.get("address") ?? "").trim().slice(0, 500) || null;

  const wasIncomplete = !user.whatsapp;
  await db.update(schema.users).set({ whatsapp, address }).where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  if (wasIncomplete) redirect("/dashboard");
  return { ok: true };
}

export async function startPurchase(planId: string): Promise<{ paymentSessionId?: string; error?: string }> {
  const { user } = await requireUser();
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, planId));
  if (!plan || !plan.active) return { error: "This plan is no longer available" };

  const orderId = `MILK_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  await db.insert(schema.orders).values({
    id: orderId,
    userId: user.id,
    planId: plan.id,
    planName: plan.name,
    tokens: plan.tokens,
    amountPaise: plan.pricePaise,
  });

  try {
    const paymentSessionId = await createCashfreeOrder({
      orderId,
      amountPaise: plan.pricePaise,
      customer: { id: user.id, name: user.name, email: user.email, phone: user.whatsapp! },
      note: `${plan.name} - ${plan.tokens} tokens`,
    });
    await db
      .update(schema.orders)
      .set({ paymentSessionId })
      .where(eq(schema.orders.id, orderId));
    return { paymentSessionId };
  } catch (e) {
    console.error(e);
    await db.update(schema.orders).set({ status: "FAILED" }).where(eq(schema.orders.id, orderId));
    return { error: "Could not start payment. Please try again." };
  }
}
