import crypto from "node:crypto";

const API_VERSION = "2023-08-01";

function baseUrl() {
  return process.env.NEXT_PUBLIC_CASHFREE_MODE === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": process.env.CASHFREE_APP_ID!,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
  };
}

export async function createCashfreeOrder(input: {
  orderId: string;
  amountPaise: number;
  customer: { id: string; name: string; email: string; phone: string };
  note: string;
}) {
  const appUrl = process.env.APP_URL!.replace(/\/$/, "");
  const res = await fetch(`${baseUrl()}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amountPaise / 100,
      order_currency: "INR",
      order_note: input.note,
      customer_details: {
        customer_id: input.customer.id,
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
      },
      order_meta: {
        return_url: `${appUrl}/payment/return?order_id={order_id}`,
        // Cashfree only accepts https notify URLs, so skip it on localhost.
        ...(appUrl.startsWith("https://") && { notify_url: `${appUrl}/api/cashfree/webhook` }),
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Cashfree create order failed: ${data.message ?? res.status}`);
  return data.payment_session_id as string;
}

/** Returns Cashfree's order_status: ACTIVE | PAID | EXPIRED | TERMINATED | ... */
export async function getCashfreeOrderStatus(orderId: string) {
  const res = await fetch(`${baseUrl()}/orders/${encodeURIComponent(orderId)}`, {
    headers: headers(),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Cashfree fetch order failed: ${data.message ?? res.status}`);
  return data.order_status as string;
}

export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY!)
    .update(timestamp + rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
