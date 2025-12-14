import React from 'react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  billTotal: number
  paidTotal: number
  remaining: number
  amountToPay: number
  amountLabel?: string
}

export function BillSummary({ billTotal, paidTotal, remaining, amountToPay, amountLabel = 'Amount to pay' }: Props) {
  return (
    <div className="bg-blue-50 p-4 rounded space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Subtotal</span>
        <span className="font-semibold">{formatCurrency(billTotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Paid</span>
        <span className="font-semibold">{formatCurrency(paidTotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Remaining</span>
        <span className="font-semibold">{formatCurrency(remaining)}</span>
      </div>
      <div className="border-t border-blue-200 pt-2 flex justify-between">
        <span className="font-bold text-slate-900">{amountLabel}</span>
        <span className="text-2xl font-bold text-blue-600">{formatCurrency(amountToPay)}</span>
      </div>
    </div>
  )
}

export default BillSummary
