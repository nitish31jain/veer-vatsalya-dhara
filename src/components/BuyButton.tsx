"use client";

import { useState } from "react";
import { load } from "@cashfreepayments/cashfree-js";
import { startPurchase } from "@/app/(customer)/actions";

export function BuyButton({
  planId,
  label,
  openingText,
  errorText,
}: {
  planId: string;
  label: string;
  openingText: string;
  errorText: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    const res = await startPurchase(planId);
    if (!res.paymentSessionId) {
      setError(res.error ?? errorText);
      setBusy(false);
      return;
    }
    const cashfree = await load({
      mode: process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox",
    });
    // Redirects to Cashfree checkout, then back to /payment/return
    await cashfree.checkout({ paymentSessionId: res.paymentSessionId, redirectTarget: "_self" });
  }

  return (
    <div>
      <button onClick={buy} disabled={busy} className="btn-primary w-full">
        {busy ? openingText : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
