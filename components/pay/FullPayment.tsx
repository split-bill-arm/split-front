"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { translations, type Language } from '@/lib/translations'
import { useToast } from '@/hooks/use-toast'
import { postPayment } from '@/lib/services/payments'

interface Props {
  orderId: number | null
  fetchOrder: () => Promise<any>
  applyOrderToState?: (order: any) => void
  setMethodLocked: (m: null | "full" | "split" | "own") => void
  paymentLoading: boolean
  setPaymentLoading: (b: boolean) => void
  language?: Language
}

export default function FullPayment({ orderId, fetchOrder, applyOrderToState, setMethodLocked, paymentLoading, setPaymentLoading, language = 'en' }: Props) {
  const t = translations[language]
  const { toast } = useToast()

  const handlePayFull = async () => {
    if (!orderId) return
    setPaymentLoading(true)
    try {
      const res = await postPayment({ order: orderId, method: 'full' })
      if (res.error) {
        toast({ title: 'Payment failed', description: res.error.message || 'Please try again' })
      } else {
        const data = res.data as any
        toast({ title: 'Payment successful', description: 'Thank you for your payment' })
        if (data && data.order) {
          if (applyOrderToState) applyOrderToState(data.order)
          setMethodLocked(null)
        } else {
          await fetchOrder()
          setMethodLocked(null)
        }
      }
    } finally {
      setPaymentLoading(false)
    }
  }

  return (
    <Button onClick={handlePayFull} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base" disabled={paymentLoading}>
      {paymentLoading ? (
        <div className="flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4 text-white" />
          <span>Paying...</span>
        </div>
      ) : (
        t.payMyShare
      )}
    </Button>
  )
}
