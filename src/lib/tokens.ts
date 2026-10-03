import { and, asc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { TOKEN_VALIDITY_DAYS, formatDate, istDayStart, rupees } from "./format";

const { tokenBatches, orders, deliveries, deliveryAllocations, auditLog } = schema;

/** Who performed a token change; recorded in the customer's audit log. */
export type Actor = { email: string; name: string; role: "customer" | "admin" | "delivery" | "system" };

export const PAYMENT_ACTOR: Actor = { email: "cashfree", name: "Online payment", role: "system" };

function audit(actor: Actor, entry: { userId: string; action: string; tokensDelta: number; description: string }) {
  return { ...entry, actorEmail: actor.email, actorName: actor.name, actorRole: actor.role };
}

function expiryFrom(start: Date) {
  return new Date(start.getTime() + TOKEN_VALIDITY_DAYS * 86_400_000);
}

/** Active (unexpired) token balance for a user, plus the soonest expiry. */
export async function getBalance(userId: string) {
  const [row] = await db
    .select({
      balance: sql<number>`coalesce(sum(${tokenBatches.tokensRemaining}), 0)::int`,
      nextExpiry: sql<Date | null>`min(${tokenBatches.expiresAt})`,
    })
    .from(tokenBatches)
    .where(
      and(
        eq(tokenBatches.userId, userId),
        gt(tokenBatches.tokensRemaining, 0),
        gt(tokenBatches.expiresAt, new Date()),
      ),
    );
  return { balance: row.balance, nextExpiry: row.nextExpiry ? new Date(row.nextExpiry) : null };
}

/**
 * Marks an order paid and credits its tokens. Safe to call more than once
 * (return URL and webhook both call it) — only the first call credits.
 */
export async function fulfillOrder(orderId: string) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [order] = await tx
      .update(orders)
      .set({ status: "PAID", paidAt: now })
      .where(and(eq(orders.id, orderId), ne(orders.status, "PAID")))
      .returning();
    if (!order) return false;
    await tx.insert(tokenBatches).values({
      userId: order.userId,
      orderId: order.id,
      source: "purchase",
      tokensTotal: order.tokens,
      tokensRemaining: order.tokens,
      purchasedAt: now,
      expiresAt: expiryFrom(now),
    });
    await tx.insert(auditLog).values(
      audit(PAYMENT_ACTOR, {
        userId: order.userId,
        action: "purchase",
        tokensDelta: order.tokens,
        description: `Bought ${order.planName}: ${order.tokens} tokens for ${rupees(order.amountPaise)}`,
      }),
    );
    return true;
  });
}

export async function grantTokens(userId: string, tokens: number, note: string, actor: Actor) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(tokenBatches).values({
      userId,
      source: "manual",
      note,
      tokensTotal: tokens,
      tokensRemaining: tokens,
      purchasedAt: now,
      expiresAt: expiryFrom(now),
    });
    await tx.insert(auditLog).values(
      audit(actor, { userId, action: "grant", tokensDelta: tokens, description: `${tokens} tokens added: ${note}` }),
    );
  });
}

export class DeliveryError extends Error {}

/**
 * Records a delivery for a given IST day and deducts tokens from the batches
 * expiring soonest (that were valid on that day).
 */
export async function markDelivery(userId: string, day: string, packets: number, actor: Actor) {
  if (!Number.isInteger(packets) || packets < 1) throw new DeliveryError("Invalid packet count");
  const dayStart = istDayStart(day);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  await db.transaction(async (tx) => {
    const batches = await tx
      .select()
      .from(tokenBatches)
      .where(
        and(
          eq(tokenBatches.userId, userId),
          gt(tokenBatches.tokensRemaining, 0),
          gt(tokenBatches.expiresAt, dayStart),
          lt(tokenBatches.purchasedAt, dayEnd),
        ),
      )
      .orderBy(asc(tokenBatches.expiresAt))
      .for("update");

    const available = batches.reduce((s, b) => s + b.tokensRemaining, 0);
    if (available < packets) {
      throw new DeliveryError(`Only ${available} token(s) available`);
    }

    const [delivery] = await tx
      .insert(deliveries)
      .values({ userId, deliveryDate: day, packets, markedBy: actor.email })
      .onConflictDoNothing()
      .returning();
    if (!delivery) throw new DeliveryError("Delivery already marked for this day");

    let left = packets;
    for (const b of batches) {
      if (left === 0) break;
      const take = Math.min(left, b.tokensRemaining);
      await tx
        .update(tokenBatches)
        .set({ tokensRemaining: b.tokensRemaining - take })
        .where(eq(tokenBatches.id, b.id));
      await tx.insert(deliveryAllocations).values({ deliveryId: delivery.id, batchId: b.id, tokens: take });
      left -= take;
    }
    await tx.insert(auditLog).values(
      audit(actor, {
        userId,
        action: "delivery",
        tokensDelta: -packets,
        description: `Delivered ${packets} packet${packets > 1 ? "s" : ""} (0.5 L) for ${formatDate(day)}`,
      }),
    );
  });
}

/** Reverses a delivery, returning tokens to the batches they came from. */
export async function undoDelivery(deliveryId: string, actor: Actor) {
  await db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(deliveries).where(eq(deliveries.id, deliveryId)).for("update");
    if (!delivery) return;
    const allocations = await tx
      .select()
      .from(deliveryAllocations)
      .where(eq(deliveryAllocations.deliveryId, deliveryId));
    for (const a of allocations) {
      await tx
        .update(tokenBatches)
        .set({ tokensRemaining: sql`${tokenBatches.tokensRemaining} + ${a.tokens}` })
        .where(eq(tokenBatches.id, a.batchId));
    }
    await tx.delete(deliveries).where(eq(deliveries.id, deliveryId));
    await tx.insert(auditLog).values(
      audit(actor, {
        userId: delivery.userId,
        action: "delivery_undo",
        tokensDelta: delivery.packets,
        description: `Delivery for ${formatDate(delivery.deliveryDate)} cancelled, ${delivery.packets} token${delivery.packets > 1 ? "s" : ""} returned`,
      }),
    );
  });
}
