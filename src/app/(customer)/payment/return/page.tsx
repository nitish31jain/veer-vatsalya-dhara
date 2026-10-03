import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { getCashfreeOrderStatus } from "@/lib/cashfree";
import { fulfillOrder } from "@/lib/tokens";
import { rupees } from "@/lib/format";

export default async function PaymentReturn({ searchParams }: PageProps<"/payment/return">) {
  const { user } = await requireUser();
  const { order_id } = await searchParams;
  const orderId = typeof order_id === "string" ? order_id : "";

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, user.id)));

  if (!order) {
    return <Result emoji="❓" title="Order not found" />;
  }

  let status = order.status;
  if (status === "PENDING") {
    const cfStatus = await getCashfreeOrderStatus(order.id).catch(() => null);
    if (cfStatus === "PAID") {
      await fulfillOrder(order.id);
      status = "PAID";
    } else if (cfStatus === "EXPIRED" || cfStatus === "TERMINATED") {
      await db.update(schema.orders).set({ status: "FAILED" }).where(eq(schema.orders.id, order.id));
      status = "FAILED";
    }
  }

  if (status === "PAID") {
    return (
      <Result
        emoji="✅"
        title="Payment successful"
        body={`${order.tokens} tokens (${order.planName}, ${rupees(order.amountPaise)}) have been added to your account.`}
      />
    );
  }
  if (status === "FAILED") {
    return <Result emoji="❌" title="Payment failed" body="No money was taken for this order. Please try again." />;
  }
  return (
    <Result
      emoji="⏳"
      title="Payment not completed yet"
      body="If you completed the payment, it can take a minute to confirm. Check again shortly, or try buying again if you cancelled."
      retry={`/payment/return?order_id=${order.id}`}
    />
  );
}

function Result({ emoji, title, body, retry }: { emoji: string; title: string; body?: string; retry?: string }) {
  return (
    <section className="card space-y-3 py-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <h1 className="text-xl font-semibold">{title}</h1>
      {body && <p className="text-sm text-gray-600">{body}</p>}
      <div className="flex flex-col gap-2 pt-2">
        {retry && (
          <Link href={retry} className="btn-secondary">
            Check again
          </Link>
        )}
        <Link href="/dashboard" className="btn-primary">
          Go to my tokens
        </Link>
      </div>
    </section>
  );
}
