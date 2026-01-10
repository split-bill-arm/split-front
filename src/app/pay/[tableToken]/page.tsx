"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { Button, Card, Input, Pill } from "@/components/ui";
import { normalizeTableToken } from "@/lib/tableToken";

type CheckItem = {
  id: string;
  name: string;
  qty: number | string; // backend may return "1"
  unitPrice: number;
  totalPrice: number;
};

type SessionResp = {
  session: { id: string; table: { label: string; token: string }; currency: string; status: string };
  check: { total: number; paid: number; currency: string; items: CheckItem[] } | null;
  reservedTotal: number;
  paidTotal?: number;
  remaining: number | null;
  syncing?: boolean;
};

type SplitMode = "amount" | "even" | "items";

type ItemSelection = {
  qtySelected: number;
  sharedEnabled: boolean;
  sharedBetween: number;
};

function modeButtonClass(isActive: boolean) {
  return [
    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
    isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
  ].join(" ");
}

function safeInt(v: string) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
}

function qtyNum(qty: number | string): number {
  const n = typeof qty === "string" ? parseInt(qty, 10) : qty;
  return Number.isFinite(n) ? n : 0;
}

export default function PayPage() {
  const router = useRouter();
  const params = useParams<{ tableToken: string }>();

  const rawToken = params.tableToken;
  const tableToken = normalizeTableToken(rawToken);

  // If user opens /pay/1, normalize to /pay/table-1
  useEffect(() => {
    if (rawToken !== tableToken) {
      router.replace(`/pay/${encodeURIComponent(tableToken)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawToken, tableToken]);

  const [data, setData] = useState<SessionResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<SplitMode>("amount");

  const [amountStr, setAmountStr] = useState<string>("3000");
  const [peopleCountStr, setPeopleCountStr] = useState<string>("2");
  const [itemsSel, setItemsSel] = useState<Record<string, ItemSelection>>({});

  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const res = await apiGet<SessionResp>(`/public/session/?tableToken=${encodeURIComponent(tableToken)}`);
        if (!alive) return;

        setData(res);
        setError(null);

        const items = res.check?.items ?? [];

        setItemsSel((prev) => {
          const next: Record<string, ItemSelection> = { ...prev };

          for (const it of items) {
            const q = qtyNum(it.qty);

            if (!next[it.id]) {
              next[it.id] = { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 };
            } else {
              next[it.id] = {
                ...next[it.id],
                qtySelected: Math.max(0, Math.min(q, next[it.id].qtySelected)),
                sharedBetween: Math.max(2, next[it.id].sharedBetween || 2),
              };
            }
          }

          for (const k of Object.keys(next)) {
            if (!items.find((i) => i.id === k)) delete next[k];
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
  }, [tableToken]);

  const check = data?.check ?? null;
  const items = check?.items ?? [];
  const remaining = data?.remaining; // can be null while loading/syncing
  const currency = data?.session.currency ?? "AMD";

  const { toPay, toPayReason } = useMemo(() => {
    if (!data) return { toPay: 0, toPayReason: "" };
    if (!check) return { toPay: 0, toPayReason: "Loading bill..." };

    if (mode === "amount") {
      const amt = safeInt(amountStr);
      if (!Number.isFinite(amt) || amt <= 0) return { toPay: 0, toPayReason: "Enter an amount" };
      return { toPay: amt, toPayReason: "" };
    }

    if (mode === "even") {
      if (remaining == null) return { toPay: 0, toPayReason: "Loading bill..." };
      const n = safeInt(peopleCountStr);
      if (!Number.isFinite(n) || n <= 0) return { toPay: 0, toPayReason: "Enter people count" };
      const per = Math.ceil(remaining / n);
      if (per <= 0) return { toPay: 0, toPayReason: "Nothing remaining" };
      return { toPay: per, toPayReason: "" };
    }

    // items mode
    let sum = 0;
    for (const it of items) {
      const sel = itemsSel[it.id];
      if (!sel) continue;

      const q = qtyNum(it.qty);
      const qtySel = Math.max(0, Math.min(q, sel.qtySelected));
      if (qtySel <= 0) continue;

      if (q === 1 && sel.sharedEnabled) {
        const n = Math.max(2, sel.sharedBetween || 2);
        sum += Math.ceil(it.totalPrice / n);
      } else {
        sum += it.unitPrice * qtySel;
      }
    }

    if (sum <= 0) return { toPay: 0, toPayReason: "Select items" };
    return { toPay: sum, toPayReason: "" };
  }, [data, check, mode, amountStr, peopleCountStr, itemsSel, remaining, items]);

  async function reserveAndPay(amount: number) {
    if (!check) {
      setError("Bill not loaded yet");
      return;
    }
    if (remaining == null) {
      setError("Bill is syncing, try again in a moment");
      return;
    }
    if (amount <= 0) {
      setError("Invalid amount");
      return;
    }
    if (amount > remaining) {
      setError("Amount exceeds remaining");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const clientHoldKey = crypto.randomUUID();

      const holdResp = await apiPost<{ hold: { id: string } }>(`/public/hold/`, {
        tableToken,
        amount,
        clientHoldKey,
      });

      const piResp = await apiPost<{ paymentIntent: { id: string }; redirectUrl?: string }>(`/public/payment_intents/`, {
        holdId: holdResp.hold.id,
      });

      const base =
        piResp.redirectUrl ??
        `/mock-pay?paymentIntentId=${piResp.paymentIntent.id}&holdId=${holdResp.hold.id}&tableToken=${encodeURIComponent(
          tableToken,
        )}`;

      let finalUrl = base;

      try {
        const u = new URL(base, window.location.origin);
        if (u.pathname.includes("/mock-pay")) {
          u.searchParams.set("paymentIntentId", piResp.paymentIntent.id);
          u.searchParams.set("holdId", holdResp.hold.id);
          u.searchParams.set("tableToken", tableToken);
          finalUrl = u.toString();
        }
      } catch {
        // ignore
      }

      window.location.assign(finalUrl);
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
    if (!check) return;
    const next: Record<string, ItemSelection> = {};
    for (const it of items) {
      next[it.id] = { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 };
    }
    setItemsSel(next);
  }

  const disableControls = busy || !check;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Pill tone="info">Table payment</Pill>
          <h1 className="text-2xl font-semibold text-slate-900">Split your bill</h1>
          <div className="text-sm text-slate-600">
            Table: {data?.session.table.label ?? tableToken}
            {data?.syncing ? <span className="text-xs text-slate-500"> · syncing…</span> : null}
          </div>
          <div className="text-xs text-slate-500">Currency: {currency}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          Status: <span className="font-semibold text-slate-900">{data?.session.status ?? "Loading"}</span>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[0.38fr_0.62fr]">
        <Card className="p-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Bill summary</div>

            {!check ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Loading bill from POS…
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span className="font-medium text-slate-900">
                      {check.total} {currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Paid</span>
                    <span className="font-medium text-slate-900">
                      {(data?.paidTotal ?? check.paid ?? 0)} {currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reserved</span>
                    <span className="font-medium text-slate-900">
                      {(data?.reservedTotal ?? 0)} {currency}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Remaining</div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {remaining == null ? "—" : `${remaining} ${currency}`}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["amount", "even", "items"] as const).map((m) => (
                <button key={m} className={modeButtonClass(mode === m)} onClick={() => setMode(m)} disabled={disableControls}>
                  {m === "amount" ? "By amount" : m === "even" ? "Even split" : "By items"}
                </button>
              ))}
            </div>

            {mode === "amount" && (
              <div className="max-w-xs space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</div>
                <Input
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  inputMode="numeric"
                  className="text-base"
                  disabled={disableControls}
                />
              </div>
            )}

            {mode === "even" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">People</div>
                  <Input
                    className="w-28 text-base"
                    value={peopleCountStr}
                    onChange={(e) => setPeopleCountStr(e.target.value)}
                    inputMode="numeric"
                    disabled={disableControls}
                  />
                </div>
                <div className="text-sm text-slate-600">
                  You pay: <span className="font-semibold text-slate-900">{toPay}</span> {currency}
                </div>
              </div>
            )}

            {mode === "items" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Select items (qty)</span>
                  <Button variant="ghost" className="h-8 px-3 text-xs" onClick={resetSelections} disabled={disableControls}>
                    Reset
                  </Button>
                </div>

                {!check ? (
                  <div className="text-sm text-slate-600">Loading items…</div>
                ) : (
                  <ul className="space-y-3">
                    {items.map((it) => {
                      const sel = itemsSel[it.id] ?? { qtySelected: 0, sharedEnabled: false, sharedBetween: 2 };
                      const q = qtyNum(it.qty);

                      return (
                        <li key={it.id} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{it.name}</div>
                              <div className="text-xs text-slate-500">
                                {q} x {it.unitPrice} = {it.totalPrice}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600"
                                onClick={() => setItemQty(it.id, Math.max(0, sel.qtySelected - 1))}
                                disabled={disableControls || sel.qtySelected <= 0}
                              >
                                -
                              </button>
                              <div className="w-8 text-center text-sm font-semibold text-slate-900">{sel.qtySelected}</div>
                              <button
                                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600"
                                onClick={() => setItemQty(it.id, Math.min(q, sel.qtySelected + 1))}
                                disabled={disableControls || sel.qtySelected >= q}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {q === 1 && sel.qtySelected === 1 && (
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={sel.sharedEnabled}
                                  onChange={(e) => toggleShared(it.id, e.target.checked)}
                                  disabled={disableControls}
                                />
                                Shared
                              </label>

                              <div className={`flex items-center gap-2 ${sel.sharedEnabled ? "" : "opacity-50"}`}>
                                <span className="text-xs">between</span>
                                <Input
                                  className="w-16 px-2 py-1 text-xs"
                                  value={String(sel.sharedBetween ?? 2)}
                                  onChange={(e) => setSharedBetween(it.id, parseInt(e.target.value, 10) || 2)}
                                  inputMode="numeric"
                                  disabled={disableControls || !sel.sharedEnabled}
                                />
                                <span className="text-xs">people</span>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="text-sm text-slate-600">
                  You pay: <span className="font-semibold text-slate-900">{toPay}</span> {currency}
                </div>
                <div className="text-xs text-slate-500">
                  Item sharing is an estimate; the reserved amount confirms the final balance.
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                To pay: <span className="font-semibold text-slate-900">{toPay}</span> {currency}
                {toPayReason ? <span className="text-xs text-slate-500"> · {toPayReason}</span> : null}
              </div>

              <Button
                variant="secondary"
                onClick={() => reserveAndPay(toPay)}
                disabled={busy || !check || remaining == null || toPay <= 0 || toPay > remaining}
                title={remaining != null && toPay > remaining ? "Exceeds remaining" : ""}
              >
                {busy ? "Processing..." : "Reserve & pay"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
