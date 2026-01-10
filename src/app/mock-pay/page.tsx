"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiPost } from "@/lib/api";
import { Button, Card, Pill } from "@/components/ui";
import { normalizeTableToken } from "@/lib/tableToken";

function MockPayInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const paymentIntentId = sp.get("paymentIntentId");
  const holdId = sp.get("holdId");

  const rawTable = sp.get("tableToken") ?? "1";
  const tableToken = normalizeTableToken(rawTable);

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
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-3">
          <Pill tone="neutral">Mock payment</Pill>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Simulate a payment</h1>
            <p className="text-sm text-slate-600">Use this screen to complete or cancel a test payment.</p>
          </div>
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              paymentIntentId: <span className="font-mono text-slate-800">{paymentIntentId ?? "missing"}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              holdId: <span className="font-mono text-slate-800">{holdId ?? "missing"}</span>
            </div>
          </div>
        </div>
      </Card>

      {msg && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{msg}</div>}

      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
            disabled={busy || !paymentIntentId}
            onClick={() => confirm("paid")}
          >
            Simulate success
          </Button>

          <Button
            className="flex-1 bg-rose-600 hover:bg-rose-700 focus:ring-rose-200"
            disabled={busy || !paymentIntentId}
            onClick={() => confirm("failed")}
          >
            Simulate fail
          </Button>

          <Button variant="ghost" className="flex-1" disabled={busy} onClick={cancel}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function MockPay() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading...</div>}>
      <MockPayInner />
    </Suspense>
  );
}
