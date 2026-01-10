"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Pill } from "@/components/ui";
import { normalizeTableToken } from "@/lib/tableToken";

export default function Home() {
  const router = useRouter();

  // User types only the number now
  const [tableInput, setTableInput] = useState("1");

  const canContinue = tableInput.trim().length > 0;

  function handleContinue() {
    if (!canContinue) return;
    const token = normalizeTableToken(tableInput);
    router.push(`/pay/${encodeURIComponent(token)}`);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-8">
          <div className="space-y-6">
            <Pill tone="info">Table pay</Pill>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Pay your share in seconds.
              </h1>
              <p className="max-w-xl text-base text-slate-600">
                Enter your table number, choose how to split, and complete your payment with a simple, clean flow.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Table number (e.g. 12)"
                value={tableInput}
                onChange={(e) => setTableInput(e.target.value)}
                inputMode="numeric"
              />
              <Button onClick={handleContinue} disabled={!canContinue} className="sm:w-40">
                Continue
              </Button>
            </div>

            <div className="text-xs text-slate-500">Ask your server for the table number if you do not have one.</div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">Fast split options</div>
              <p className="text-sm text-slate-600">Pay by amount, split evenly, or select exact items.</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">Secure by design</div>
              <p className="text-sm text-slate-600">Your payment is reserved first so totals stay accurate for everyone.</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">Demo ready</div>
              <p className="text-sm text-slate-600">Run a test payment flow without charging a card.</p>
              <Link href="/mock-pay" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Open demo
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</div>
            <div className="text-sm font-semibold text-slate-900">Enter table number</div>
            <p className="text-sm text-slate-600">Your server shares a short table number that unlocks the bill.</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</div>
            <div className="text-sm font-semibold text-slate-900">Choose a split</div>
            <p className="text-sm text-slate-600">Pick amount, even split, or item-level payments.</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</div>
            <div className="text-sm font-semibold text-slate-900">Confirm & pay</div>
            <p className="text-sm text-slate-600">Payments reserve the balance so the bill stays accurate.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
