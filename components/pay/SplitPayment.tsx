"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from '@/components/ui/spinner'
import { translations, type Language } from "@/lib/translations"
import { useToast } from '@/hooks/use-toast'
import { initSplit } from '@/lib/services/orders'
import { postPayment } from '@/lib/services/payments'
import PeoplePicker from './PeoplePicker'

interface Props {
  orderId: number | null
  numberOfPeople: number
  setNumberOfPeople: (n: number) => void
  paymentMethod: null | "full" | "split" | "own"
  setPaymentMethod: (m: null | "full" | "split" | "own") => void
  setMethodLocked: (m: null | "full" | "split" | "own") => void
  fetchOrder: () => Promise<any>
  applyOrderToState?: (order: any) => void
  paymentLoading: boolean
  setPaymentLoading: (b: boolean) => void
  language?: Language
  selectedItemMap?: Map<number, number>
  setSelectedItemMap?: React.Dispatch<React.SetStateAction<Map<number, number>>>
  toggleSelectItem?: (orderItemId: number) => void
  unselectItem?: (orderItemId: number) => void
}

export default function SplitPayment({
  orderId,
  numberOfPeople,
  setNumberOfPeople,
  paymentMethod,
  setPaymentMethod,
  setMethodLocked,
  fetchOrder,
  applyOrderToState,
  paymentLoading,
  setPaymentLoading,
  language = 'en',
}: Props) {
  const t = translations[language]
  const { toast } = useToast()
  const prevSplitPeopleRef = React.useRef<number | null>(null)

  // initialize split when component mounts (user chose split)
  React.useEffect(() => {
    ;(async () => {
      if (!orderId) return
      try {
        const res = await initSplit(orderId, numberOfPeople || 2, true)
        if (res.error) {
          toast({ title: 'Split init failed', description: res.error.message || 'Could not initialize split' })
        } else {
          await fetchOrder()
          toast({ title: 'Split initialized', description: `Split for ${numberOfPeople || 2} people` })
        }
      } catch (e) {
        toast({ title: 'Network error', description: 'Could not initialize split' })
      }
    })()
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When in split mode, if user changes the number of people, re-initialize the split on the backend
  React.useEffect(() => {
    if (paymentMethod !== 'split' || !orderId) return
    const prev = prevSplitPeopleRef.current
    if (prev === numberOfPeople) return
    prevSplitPeopleRef.current = numberOfPeople

    ;(async () => {
      try {
        const res = await initSplit(orderId, numberOfPeople, true)
        if (res.error) {
          toast({ title: 'Split update failed', description: res.error.message || 'Could not change split' })
        } else {
          await fetchOrder()
          toast({ title: 'Split updated', description: `Split set to ${numberOfPeople} people` })
        }
      } catch (e) {
        toast({ title: 'Network error', description: 'Could not update split' })
      }
    })()
  }, [numberOfPeople, paymentMethod, orderId])

  const handlePaySplit = async () => {
    if (!orderId) return
    setPaymentLoading(true)
    try {
      const res = await postPayment({ order: orderId, method: 'split', participant: `p-${Math.random().toString(36).slice(2,8)}` })
      if (res.error) {
        toast({ title: 'Payment failed', description: res.error.message || 'Please try again' })
      } else {
        const data = res.data as any
        toast({ title: 'Share paid', description: 'Your split share was recorded' })
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
    <div>
      <PeoplePicker numberOfPeople={numberOfPeople} setNumberOfPeople={setNumberOfPeople} />

      <div className="mt-4">
        <Button onClick={handlePaySplit} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base" disabled={paymentLoading}>
          {paymentLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4 text-white" />
              <span>Paying...</span>
            </div>
          ) : (
            t.payMyShare
          )}
        </Button>
      </div>
    </div>
  )
}
