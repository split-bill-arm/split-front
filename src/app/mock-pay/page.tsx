"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiPost } from "@/lib/api";

function MockPayInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const paymentIntentId = sp.get("paymentIntentId");
  const holdId = sp.get("holdId");
  const tableToken = sp.get("tableToken") ?? "table-1";

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function releaseHoldIfPossible() {
    if (!holdId) return;
    try {
      await apiPost(`/public/hold/${holdId}/release/`, {});
    } catch {
      // ignore
    }
  }

  async function confirm(outcome: "paid" | "failed") {
    if (!paymentIntentId) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiPost(`/public/payment_intents/${paymentIntentId}/confirm/`, { outcome });

      if (outcome === "failed") {
        await releaseHoldIfPossible();
      }

      router.push(`/pay/${encodeURIComponent(tableToken)}`);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setMsg(null);
    try {
      await releaseHoldIfPossible();
      router.push(`/pay/${encodeURIComponent(tableToken)}`);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to cancel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Mock Pay</h1>
      <div className="text-sm text-gray-600">paymentIntentId: {paymentIntentId ?? "missing"}</div>
      <div className="text-sm text-gray-600">holdId: {holdId ?? "missing"}</div>

      {msg && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm">{msg}</div>}

      <div className="flex gap-2">
        <button
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={busy || !paymentIntentId}
          onClick={() => confirm("paid")}
        >
          Simulate Success
        </button>

        <button
          className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={busy || !paymentIntentId}
          onClick={() => confirm("failed")}
        >
          Simulate Fail
        </button>

        <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy} onClick={cancel}>
          Cancel
        </button>
      </div>
    </main>
  );
}

export default function MockPay() {
  return (
    <Suspense fallback={<main className="p-6">Loading…</main>}>
      <MockPayInner />
    </Suspense>
  );
}
