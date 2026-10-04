import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { getCashfreeOrderStatus } from "@/lib/cashfree";
import { fulfillOrder } from "@/lib/tokens";
import { rupees } from "@/lib/format";
import { getT, planText } from "@/i18n/server";

export default async function PaymentReturn({ searchParams }: PageProps<"/payment/return">) {
  const { user } = await requireUser();
  const { order_id } = await searchParams;
  const orderId = typeof order_id === "string" ? order_id : "";
  const { t, locale } = await getT();
  const labels = { checkAgain: t.payment.checkAgain, goToTokens: t.payment.goToTokens };

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, user.id)));

  if (!order) {
    return <Result emoji="❓" title={t.payment.notFound} labels={labels} />;
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
    const [plan] = order.planId
      ? await db.select().from(schema.plans).where(eq(schema.plans.id, order.planId))
      : [];
    const planName = plan ? planText(plan, locale).name : order.planName;
    return (
      <Result
        emoji="✅"
        title={t.payment.successTitle}
        body={t.payment.successBody(order.tokens, planName, rupees(order.amountPaise))}
        labels={labels}
      />
    );
  }
  if (status === "FAILED") {
    return <Result emoji="❌" title={t.payment.failedTitle} body={t.payment.failedBody} labels={labels} />;
  }
  return (
    <Result
      emoji="⏳"
      title={t.payment.pendingTitle}
      body={t.payment.pendingBody}
      retry={`/payment/return?order_id=${order.id}`}
      labels={labels}
    />
  );
}

function Result({
  emoji,
  title,
  body,
  retry,
  labels,
}: {
  emoji: string;
  title: string;
  body?: string;
  retry?: string;
  labels: { checkAgain: string; goToTokens: string };
}) {
  return (
    <section className="card space-y-3 py-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <h1 className="text-xl font-semibold">{title}</h1>
      {body && <p className="text-sm text-gray-600">{body}</p>}
      <div className="flex flex-col gap-2 pt-2">
        {retry && (
          <Link href={retry} className="btn-secondary">
            {labels.checkAgain}
          </Link>
        )}
        <Link href="/dashboard" className="btn-primary">
          {labels.goToTokens}
        </Link>
      </div>
    </section>
  );
}
