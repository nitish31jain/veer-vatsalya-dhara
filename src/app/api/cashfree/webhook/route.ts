import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCashfreeOrderStatus, verifyWebhookSignature } from "@/lib/cashfree";
import { fulfillOrder } from "@/lib/tokens";

// Backup for when the customer closes the browser before returning from checkout.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  if (!verifyWebhookSignature(raw, timestamp, signature)) {
    return new Response("invalid signature", { status: 401 });
  }

  const orderId: string | undefined = JSON.parse(raw)?.data?.order?.order_id;
  if (!orderId) return new Response("ok");

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order || order.status === "PAID") return new Response("ok");

  // Trust Cashfree's API, not the webhook payload, for the final status.
  if ((await getCashfreeOrderStatus(orderId)) === "PAID") {
    await fulfillOrder(orderId);
  }
  return new Response("ok");
}
