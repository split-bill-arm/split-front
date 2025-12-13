import React from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface Props {
  paymentMethod: 'full' | 'split' | 'own' | null
  orderStatus: string | null
  orderId: number | null
  paymentLoading: boolean
  methodLocked: null | 'full' | 'split' | 'own'
  splitNumPeopleStored: number | null
  onSelectFull: () => void
  onSelectSplit: () => void
  onSelectOwn: () => void
  onPay: () => void
}

export function PaymentButtons({ paymentMethod, orderStatus, orderId, paymentLoading, methodLocked, splitNumPeopleStored, onSelectFull, onSelectSplit, onSelectOwn, onPay }: Props) {
  return (
    <>
      <Button onClick={onSelectFull} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base" disabled={orderStatus === 'paid' || !orderId || paymentLoading || (methodLocked !== null && methodLocked !== 'full') || (splitNumPeopleStored !== null && paymentMethod !== 'split')}>
        {paymentLoading ? (
          <div className="flex items-center justify-center gap-2"><Spinner className="h-4 w-4 text-white" /><span>Paying...</span></div>
        ) : (
          'Pay Full'
        )}
      </Button>

      <Button onClick={onSelectSplit} variant="outline" className="w-full py-6 text-base border-2" disabled={orderStatus === 'paid' || !orderId || paymentLoading || (methodLocked !== null && methodLocked !== 'split')}>
        Split Bill
      </Button>

      <Button onClick={onSelectOwn} variant="outline" className="w-full py-6 text-base border-2" disabled={orderStatus === 'paid' || !orderId || paymentLoading || (methodLocked !== null && methodLocked !== 'own') || (splitNumPeopleStored !== null && paymentMethod !== 'split')}>
        Pay Own Items
      </Button>

      <Button onClick={onPay} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base" disabled={paymentLoading}>
        {paymentLoading ? (
          <div className="flex items-center justify-center gap-2"><Spinner className="h-4 w-4 text-white" /><span>Paying...</span></div>
        ) : (
          paymentMethod === 'split' ? 'Pay My Share' : 'Pay'
        )}
      </Button>
    </>
  )
}

export default PaymentButtons
