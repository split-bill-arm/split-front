"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { translations, type Language } from "@/lib/translations"
import type { TableBill } from "@/lib/types"

interface Props {
  bills: TableBill[]
  language: Language
  onPayment: (tableId: number, amount: number) => void
}

export default function OpenOrdersView({ bills, language, onPayment }: Props) {
  const [paymentAmounts, setPaymentAmounts] = useState<Map<number, number>>(new Map())
  const t = translations[language]

  return (
    <div className="space-y-4">
      {bills.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600">{t.openOrders}: 0</p>
        </Card>
      ) : (
        bills.map((bill) => (
          <Card key={bill.tableId} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {t.table} {bill.tableId}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">{t.total}</p>
                <p className="text-2xl font-bold text-slate-900">${bill.totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded mb-4 max-h-40 overflow-y-auto">
              {bill.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span className="text-slate-700">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-semibold text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-slate-600">{t.total}</p>
                <p className="font-bold text-slate-900">${bill.totalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-slate-600">{t.paid}</p>
                <p className="font-bold text-green-700">${bill.paidAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={t.amountToPay}
                min="0"
                step="0.01"
                value={paymentAmounts.get(bill.tableId) || ""}
                onChange={(e) => {
                  const map = new Map(paymentAmounts)
                  if (e.target.value) {
                    map.set(bill.tableId, Number.parseFloat(e.target.value))
                  } else {
                    map.delete(bill.tableId)
                  }
                  setPaymentAmounts(map)
                }}
              />
              <Button
                onClick={() => {
                  const amount = paymentAmounts.get(bill.tableId)
                  if (amount) {
                    onPayment(bill.tableId, amount)
                    setPaymentAmounts((prev) => {
                      const newMap = new Map(prev)
                      newMap.delete(bill.tableId)
                      return newMap
                    })
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                {t.confirm}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
