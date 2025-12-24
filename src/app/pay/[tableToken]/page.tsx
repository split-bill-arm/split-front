"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type SessionResp = {
  session: { id: string; table: { label: string; token: string }; currency: string; status: string };
  check: { total: number; paid: number; currency: string; items: Array<{ id: string; name: string; qty: number; unitPrice: number; totalPrice: number }> };
  reservedTotal: number;
  paidTotal?: number;
  remaining: number;
};

export default function PayPage() {
  const router = useRouter();
  const params = useParams<{ tableToken: string }>();
  const tableToken = params.tableToken;

  const [data, setData] = useState<SessionResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("3000");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const res = await apiGet<SessionResp>(`/public/session/?tableToken=${encodeURIComponent(tableToken)}`);
        if (alive) {
          setData(res);
          setError(null);
        }
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load session");
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tableToken]);

  const remaining = data?.remaining ?? 0;

  async function onReserveAndPay() {
    setBusy(true);
    try {
      const amt = parseInt(amount, 10);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");

      const clientHoldKey = crypto.randomUUID();
      const holdResp = await apiPost<{ hold: { id: string } }>(`/public/hold/`, {
        tableToken,
        amount: amt,
        clientHoldKey,
      });

      const piResp = await apiPost<{ paymentIntent: { id: string } }>(`/public/payment_intents/`, {
        holdId: holdResp.hold.id,
      });

      router.push(`/mock-pay?paymentIntentId=${piResp.paymentIntent.id}&tableToken=${encodeURIComponent(tableToken)}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to reserve/pay");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">SPLIT</h1>
        <div className="text-sm text-gray-600">Table: {data?.session.table.label ?? tableToken}</div>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm">{error}</div>}

      <div className="rounded border p-4 space-y-2">
        <div className="flex justify-between text-sm"><span>Total</span><span>{data?.check.total ?? "—"}</span></div>
        <div className="flex justify-between text-sm"><span>Paid</span><span>{data?.paidTotal ?? data?.check.paid ?? 0}</span></div>
        <div className="flex justify-between text-sm"><span>Reserved</span><span>{data?.reservedTotal ?? 0}</span></div>
        <div className="flex justify-between font-semibold"><span>Remaining</span><span>{remaining}</span></div>
      </div>

      <div className="rounded border p-4 space-y-2">
        <div className="font-medium">Items</div>
        <ul className="text-sm space-y-1">
          {(data?.check.items ?? []).map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>{it.name} × {it.qty}</span>
              <span>{it.totalPrice}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded border p-4 space-y-3">
        <div className="font-medium">Pay an amount</div>
        <div className="flex gap-2">
          <input
            className="w-40 rounded border px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
          />
          <button
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            onClick={onReserveAndPay}
            disabled={busy || remaining <= 0}
          >
            {busy ? "..." : "Reserve & Pay (mock)"}
          </button>
        </div>
        <div className="text-xs text-gray-600">Uses backend holds to prevent double-pay.</div>
      </div>
    </main>
  );
}
