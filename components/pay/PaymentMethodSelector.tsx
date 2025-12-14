"use client"

import React from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  methodLocked: null | 'full' | 'split' | 'own'
  paymentLoading: boolean
  orderStatus: string | null
  orderId: number | null
  splitNumPeopleStored: number | null
  onSelectFull: () => void
  onSelectSplit: () => void
  onSelectOwn: () => void
  t: any
}

export default function PaymentMethodSelector({ methodLocked, paymentLoading, orderStatus, orderId, splitNumPeopleStored, onSelectFull, onSelectSplit, onSelectOwn, t }: Props) {
  return (
    <>
      <Button
        onClick={onSelectFull}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base"
        disabled={orderStatus === 'paid' || !orderId || paymentLoading || (methodLocked !== null && methodLocked !== 'full') || (splitNumPeopleStored !== null && false)}
      >
        {t.payFull}
      </Button>

      <Button
        onClick={onSelectSplit}
        variant="outline"
        className="w-full py-6 text-base border-2"
        disabled={orderStatus === 'paid' || !orderId || paymentLoading || (methodLocked !== null && methodLocked !== 'split')}
      >
        {t.splitBill}
      </Button>

      <Button
        onClick={onSelectOwn}
        variant="outline"
        className="w-full py-6 text-base border-2"
        disabled={orderStatus === 'paid' || !orderId || paymentLoading || (methodLocked !== null && methodLocked !== 'own') || (splitNumPeopleStored !== null && false)}
      >
        {t.payOwnItems}
      </Button>
    </>
  )
}
