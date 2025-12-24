"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type CheckItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
};

type SessionResp = {
  session: { id: string; table: { label: string; token: string }; currency: string; status: string };
  check: { total: number; paid: number; currency: string; items: CheckItem[] };
  reservedTotal: number;
  paidTotal?: number;
  remaining: number;
};

type SplitMode = "amount" | "even" | "items";

type ItemSelection = {
  qtySelected: number; // integer 0..item.qty
  sharedEnabled: boolean; // only meaningful for qty=1 (MVP)
  sharedBetween: number; // >=2
};

export default function PayPage() {
  const router = useRouter();
  const params = useParams<{ tableToken: string }>();
  const tableToken = params.tableToken;

  const [data, setData] = useState<SessionResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<SplitMode>("amount");

  // Amount mode input
  const [amountStr, setAmountStr] = useState<string>("3000");

  // Even mode input
  const [peopleCountStr, setPeopleCountStr] = useState<string>("2");

  // Items mode state
  const [itemsSel, setItemsSel] = useState<Record<string, ItemSelection>>({});

  // Poll every 1s
  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const res = await apiGet<SessionResp>(`/public/session/?tableToken=${encodeURIComponent(tableToken)}`);
        if (!alive) return;

        setData(res);
        setError(null);

        // Ensure we have selection state for any new items
        setItemsSel((prev) => {
          const next: Record<string, ItemSelection> = { ...prev };

          // ensure keys exist + clamp qtySelected if item qty changed
          for (const it of res.check.items) {
            if (!next[it.id]) {
              next[it.id] = { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 };
            } else {
              // clamp to valid range just in case
              next[it.id] = {
                ...next[it.id],
                qtySelected: Math.max(0, Math.min(it.qty, next[it.id].qtySelected)),
                sharedBetween: Math.max(2, next[it.id].sharedBetween || 2),
              };
            }
          }

          // optionally remove stale keys
          for (const k of Object.keys(next)) {
            if (!res.check.items.find((i) => i.id === k)) delete next[k];
          }

          return next;
        });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableToken]);

  const remaining = data?.remaining ?? 0;

  const { toPay, toPayReason } = useMemo(() => {
    if (!data) return { toPay: 0, toPayReason: "" };

    if (mode === "amount") {
      const amt = parseInt(amountStr, 10);
      if (!Number.isFinite(amt) || amt <= 0) return { toPay: 0, toPayReason: "Enter an amount" };
      return { toPay: amt, toPayReason: "" };
    }

    if (mode === "even") {
      const n = parseInt(peopleCountStr, 10);
      if (!Number.isFinite(n) || n <= 0) return { toPay: 0, toPayReason: "Enter people count" };
      // MVP: per-person share of current remaining. People can pay in any order.
      const per = Math.ceil(remaining / n);
      if (per <= 0) return { toPay: 0, toPayReason: "Nothing remaining" };
      return { toPay: per, toPayReason: "" };
    }

    // items mode
    let sum = 0;
    for (const it of data.check.items) {
      const sel = itemsSel[it.id];
      if (!sel) continue;

      const qtySel = Math.max(0, Math.min(it.qty, sel.qtySelected));

      if (qtySel <= 0) continue;

      // If qty=1 and shared enabled, split the item's total between N people
      if (it.qty === 1 && sel.sharedEnabled) {
        const n = Math.max(2, sel.sharedBetween || 2);
        // MVP rounding: payer pays ceil(item / n). It can slightly over/under match other payers.
        sum += Math.ceil(it.totalPrice / n);
      } else {
        // normal: pay for qtySel units
        sum += it.unitPrice * qtySel;
      }
    }

    if (sum <= 0) return { toPay: 0, toPayReason: "Select items" };
    return { toPay: sum, toPayReason: "" };
  }, [data, mode, amountStr, peopleCountStr, itemsSel, remaining]);

  async function reserveAndPay(amount: number) {
    setBusy(true);
    setError(null);
    try {
      const clientHoldKey = crypto.randomUUID();

      const holdResp = await apiPost<{ hold: { id: string } }>(`/public/hold/`, {
        tableToken,
        amount,
        clientHoldKey,
      });

      const piResp = await apiPost<{ paymentIntent: { id: string } }>(`/public/payment_intents/`, {
        holdId: holdResp.hold.id,
      });

      router.push(`/mock-pay?paymentIntentId=${piResp.paymentIntent.id}&holdId=${holdResp.hold.id}&tableToken=${encodeURIComponent(tableToken)}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to reserve/pay");
    } finally {
      setBusy(false);
    }
  }

  function setItemQty(itemId: string, nextQty: number) {
    setItemsSel((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 }),
        qtySelected: nextQty,
        // if qty > 1, force shared off (MVP)
        sharedEnabled: nextQty > 0 ? (prev[itemId]?.sharedEnabled ?? false) : false,
      },
    }));
  }

  function toggleShared(itemId: string, enabled: boolean) {
    setItemsSel((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 }), sharedEnabled: enabled },
    }));
  }

  function setSharedBetween(itemId: string, n: number) {
    setItemsSel((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 }), sharedBetween: n },
    }));
  }

  function resetSelections() {
    if (!data) return;
    const next: Record<string, ItemSelection> = {};
    for (const it of data.check.items) {
      next[it.id] = { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 };
    }
    setItemsSel(next);
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

      <div className="rounded border p-4 space-y-3">
        <div className="font-medium">Split mode</div>
        <div className="flex gap-2 text-sm">
          {(["amount", "even", "items"] as const).map((m) => (
            <button
              key={m}
              className={`rounded px-3 py-2 border ${mode === m ? "bg-black text-white" : "bg-white"}`}
              onClick={() => setMode(m)}
              disabled={busy}
            >
              {m === "amount" ? "By amount" : m === "even" ? "Even split" : "By items"}
            </button>
          ))}
        </div>

        {mode === "amount" && (
          <div className="flex items-end gap-2">
            <div>
              <div className="text-xs text-gray-600">Amount</div>
              <input
                className="w-40 rounded border px-3 py-2"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
        )}

        {mode === "even" && (
          <div className="flex items-end gap-2">
            <div>
              <div className="text-xs text-gray-600">People</div>
              <input
                className="w-28 rounded border px-3 py-2"
                value={peopleCountStr}
                onChange={(e) => setPeopleCountStr(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="text-sm text-gray-700">
              You pay: <span className="font-semibold">{toPay}</span>
            </div>
          </div>
        )}

        {mode === "items" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Select items (qty)</div>
              <button className="text-xs underline" onClick={resetSelections} disabled={busy}>Reset</button>
            </div>

            <ul className="space-y-2">
              {(data?.check.items ?? []).map((it) => {
                const sel = itemsSel[it.id] ?? { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 };
                const canShare = it.qty === 1 && sel.qtySelected === 1;

                return (
                  <li key={it.id} className="rounded border p-3">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-gray-600">
                          {it.qty} × {it.unitPrice} = {it.totalPrice}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() => setItemQty(it.id, Math.max(0, sel.qtySelected - 1))}
                          disabled={busy || sel.qtySelected <= 0}
                        >
                          -
                        </button>
                        <div className="w-8 text-center text-sm">{sel.qtySelected}</div>
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() => setItemQty(it.id, Math.min(it.qty, sel.qtySelected + 1))}
                          disabled={busy || sel.qtySelected >= it.qty}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Shared item MVP: only for qty=1 items */}
                    {it.qty === 1 && sel.qtySelected === 1 && (
                      <div className="mt-2 flex items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sel.sharedEnabled}
                            onChange={(e) => toggleShared(it.id, e.target.checked)}
                            disabled={busy}
                          />
                          Shared
                        </label>

                        <div className={`flex items-center gap-2 ${sel.sharedEnabled ? "" : "opacity-50"}`}>
                          <span className="text-xs text-gray-600">between</span>
                          <input
                            className="w-16 rounded border px-2 py-1"
                            value={String(sel.sharedBetween ?? 2)}
                            onChange={(e) => setSharedBetween(it.id, parseInt(e.target.value, 10) || 2)}
                            inputMode="numeric"
                            disabled={busy || !canShare || !sel.sharedEnabled}
                          />
                          <span className="text-xs text-gray-600">people</span>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="text-sm">
              You pay: <span className="font-semibold">{toPay}</span>
            </div>
            <div className="text-xs text-gray-600">
              MVP note: item sharing is an estimate; backend correctness is enforced by holds.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm">
            To pay: <span className="font-semibold">{toPay}</span>
            {toPayReason ? <span className="text-xs text-gray-600"> — {toPayReason}</span> : null}
          </div>

          <button
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            onClick={() => reserveAndPay(toPay)}
            disabled={busy || toPay <= 0 || toPay > remaining}
            title={toPay > remaining ? "Exceeds remaining" : ""}
          >
            {busy ? "..." : "Reserve & Pay (mock)"}
          </button>
        </div>
      </div>
    </main>
  );
}
