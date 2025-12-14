"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { translations, type Language } from '@/lib/translations'
import { useToast } from '@/hooks/use-toast'
import { postPayment } from '@/lib/services/payments'
import { incrementSelectedItemMap, decrementSelectedItemMap } from '@/lib/utils'

interface Props {
  orderId: number | null
  items: any[]
  fetchOrder: () => Promise<any>
  applyOrderToState?: (order: any) => void
  setMethodLocked: (m: null | "full" | "split" | "own") => void
  paymentLoading: boolean
  setPaymentLoading: (b: boolean) => void
  language?: Language
  selectedItemMap?: Map<number, number>
  setSelectedItemMap?: React.Dispatch<React.SetStateAction<Map<number, number>>>
}

export default function OwnPayment({ orderId, items, fetchOrder, applyOrderToState, setMethodLocked, paymentLoading, setPaymentLoading, language = 'en', selectedItemMap: externalSelectedItemMap, setSelectedItemMap: externalSetSelectedItemMap }: Props) {
  const t = translations[language]
  const { toast } = useToast()
  const [internalSelectedItemMap, internalSetSelectedItemMap] = React.useState<Map<number, number>>(new Map())
  const selectedItemMap = externalSelectedItemMap ?? internalSelectedItemMap
  const setSelectedItemMap = externalSetSelectedItemMap ?? internalSetSelectedItemMap

  const toggleSelectItem = (orderItemId: number) => {
    setSelectedItemMap((prev) => incrementSelectedItemMap(prev, items, orderItemId))
  }

  const unselectItem = (orderItemId: number) => {
    setSelectedItemMap((prev) => decrementSelectedItemMap(prev, orderItemId))
  }

  const handlePayItems = async () => {
    if (!orderId) return
    const itemsPayload: any[] = []
    selectedItemMap.forEach((qty, orderItemId) => {
      itemsPayload.push({ order_item: orderItemId, quantity: qty })
    })
    if (itemsPayload.length === 0) return
    setPaymentLoading(true)
    try {
      const res = await postPayment({ order: orderId, method: 'item', items: itemsPayload, participant: `p-${Math.random().toString(36).slice(2,8)}` })
      if (res.error) {
        toast({ title: 'Payment failed', description: res.error.message || 'Please try again' })
      } else {
        const data = res.data as any
        toast({ title: 'Payment successful', description: 'Items have been paid' })
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
    <>
      <div className="space-y-2">
        {(() => {
          const payableItems = items.filter((item) => {
            const unpaidQty = Number(item.unpaid_quantity || 0)
            const price = Number(item.price || 0)
            return unpaidQty > 0 && price * unpaidQty > 0
          })

          if (payableItems.length === 0) {
            return <div className="text-slate-600">No items to pay for.</div>
          }

          return payableItems.map((item) => {
            const selectedQty = selectedItemMap.get(item.id) || 0
            return (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-xs text-slate-500">Unit: ${item.price.toFixed(2)} • {item.unpaid_quantity} remaining • Total: ${(item.price * item.unpaid_quantity).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => unselectItem(item.id)}
                    className="px-2 py-1 bg-slate-200 rounded disabled:opacity-50"
                    disabled={selectedQty <= 0}
                  >
                    -
                  </button>
                  <div className="px-3">{selectedQty}</div>
                  <button
                    onClick={() => toggleSelectItem(item.id)}
                    className="px-2 py-1 bg-slate-200 rounded"
                    disabled={selectedQty >= item.unpaid_quantity}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })
        })()}
      </div>

      <Button onClick={handlePayItems} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base" disabled={paymentLoading}>
        {paymentLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner className="h-4 w-4 text-white" />
            <span>Paying...</span>
          </div>
        ) : (
          t.payMyShare
        )}
      </Button>
    </>
  )
}
