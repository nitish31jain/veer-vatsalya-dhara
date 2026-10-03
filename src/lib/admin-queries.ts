import { and, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** Map of userId -> active token balance, for every user with a balance. */
export async function activeBalances() {
  const rows = await db
    .select({
      userId: schema.tokenBatches.userId,
      balance: sql<number>`sum(${schema.tokenBatches.tokensRemaining})::int`,
    })
    .from(schema.tokenBatches)
    .where(and(gt(schema.tokenBatches.tokensRemaining, 0), gt(schema.tokenBatches.expiresAt, new Date())))
    .groupBy(schema.tokenBatches.userId);
  return new Map(rows.map((r) => [r.userId, r.balance]));
}
