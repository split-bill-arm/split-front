"use client"

import React, { useState, useEffect } from "react"
import { API_BASE } from '@/lib/api'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { translations, type Language } from "@/lib/translations"
import { useToast } from '@/hooks/use-toast'
import { Spinner } from '@/components/ui/spinner'
import BillSummary from '@/components/pay/BillSummary'
import ItemsList from '@/components/pay/ItemsList'
import PeoplePicker from '@/components/pay/PeoplePicker'
import PaymentButtons from '@/components/pay/PaymentButtons'
import PaymentHeader from '@/components/pay/PaymentHeader'
import PaymentMethodSelector from '@/components/pay/PaymentMethodSelector'
import OwnPayment from '@/components/pay/OwnPayment'
import { mapOrderItems, computeAmountPerPerson, incrementSelectedItemMap, decrementSelectedItemMap } from '@/lib/utils'
import { postPayment } from '@/lib/services/payments'
import { getOrders } from '@/lib/services/orders'
import { getMenuItems } from '@/lib/services/menu'
import SplitPayment from '@/components/pay/SplitPayment'
import FullPayment from '@/components/pay/FullPayment'

export default function CustomerPayment({ params }: { params: Promise<{ tableId: string }> | { tableId: string } }) {
  const [language, setLanguage] = useState<Language>("en")
  const [paymentMethod, setPaymentMethod] = useState<"full" | "split" | "own" | null>(null)
  const [numberOfPeople, setNumberOfPeople] = useState(1)
  const [paid, setPaid] = useState(false)
  const { toast } = useToast()
  const [paymentLoading, setPaymentLoading] = useState(false)

  const t = translations[language]

  // unwrap params Promise when running as a client component
  const resolvedParams = (React as any).use ? (React as any).use(params) : params
  const [billTotal, setBillTotal] = useState<number | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [orderId, setOrderId] = useState<number | null>(null)
  const [selectedItemMap, setSelectedItemMap] = useState<Map<number, number>>(new Map())
  const [paidTotal, setPaidTotal] = useState<number>(0)
  const [remaining, setRemaining] = useState<number>(0)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)
  const [splitShare, setSplitShare] = useState<number | null>(null)
  const [splitNumPeopleStored, setSplitNumPeopleStored] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [methodLocked, setMethodLocked] = useState<null | "full" | "split" | "own">(null)

  // fetch open order for this table from backend (centralized)
  const API = API_BASE

  const fetchOrder = async () => {
    const tableId = Number(resolvedParams?.tableId)
    try {
      const [allOrders, menuList] = await Promise.all([getOrders(), getMenuItems()])

      const menu = menuList || []
      const orders = allOrders || []

      // prefer an open order for this table; fall back to latest if none open
      const tableOrders = orders.filter((o: any) => o.table === tableId)
      const openOrder = tableOrders.find((o: any) => o.status === 'open')
      tableOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const order = openOrder || (tableOrders.length > 0 ? tableOrders[0] : null)

      if (!order) {
        setItems([])
        setBillTotal(0)
        setOrderId(null)
        setSelectedItemMap(new Map())
        setPaidTotal(0)
        setRemaining(0)
        setSplitShare(null)
        setSplitNumPeopleStored(null)
        setOrderStatus(null)
        setLastUpdated(new Date())
        return null
      }

      // map items using backend-provided fields (including unpaid_quantity and menu_item_name)
      const mapped = mapOrderItems(order, menu)

      setItems(mapped)
      const total = Number(order.bill_amount ?? mapped.reduce((s: number, it: any) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0))
      setBillTotal(total)
      setOrderId(order.id)
      setSelectedItemMap(new Map())
      const paid = Number(order.paid_total || 0)
      const rem = Number(order.remaining_amount ?? order.remaining ?? (total - paid))
      setPaidTotal(paid)
      setRemaining(rem)
      setOrderStatus(order.status)
      const splitInfo = order.payment_summary || {}
      setSplitShare(splitInfo.split_share_amount ? Number(splitInfo.split_share_amount) : null)
      setSplitNumPeopleStored(splitInfo.split_num_people || null)

      // If a split has been initialized on the backend by someone else,
      // lock the payment method to 'split' locally so other options are disabled.
      setMethodLocked((prev) => (prev === null && splitInfo.split_num_people != null ? 'split' : prev))

      if (order.status === 'paid' || rem <= 0) setPaid(true)
      setLastUpdated(new Date())
      return order
    } catch (e) {
      // fallback defaults
      setItems([])
      setBillTotal(0)
      setOrderId(null)
      setPaidTotal(0)
      setRemaining(0)
      setSplitShare(null)
      setSplitNumPeopleStored(null)
      setOrderStatus(null)
      return null
    }
  }

  // apply order object returned by backend directly to local state for immediate UI updates
  const applyOrderToState = (order: any) => {
    const mapped = mapOrderItems(order)

    setItems(mapped)
    const total = Number(order.bill_amount ?? mapped.reduce((s: number, it: any) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0))
    setBillTotal(total)
    setOrderId(order.id)
    setSelectedItemMap(new Map())
    const paid = Number(order.paid_total || 0)
    const rem = Number(order.remaining_amount ?? order.remaining ?? (total - paid))
    setPaidTotal(paid)
    setRemaining(rem)
    setOrderStatus(order.status)
    const splitInfo = order.payment_summary || {}
    setSplitShare(splitInfo.split_share_amount ? Number(splitInfo.split_share_amount) : null)
    setSplitNumPeopleStored(splitInfo.split_num_people || null)
    // If backend indicates a split is active, lock locally so other options stay disabled
    setMethodLocked((prev) => (prev === null && splitInfo.split_num_people != null ? 'split' : prev))
    if (order.status === 'paid' || rem <= 0) setPaid(true)
  }

  useEffect(() => {
    if (resolvedParams?.tableId) fetchOrder()
  }, [resolvedParams?.tableId])

  // Poll for updates every 5 seconds to keep the bill info fresh
  useEffect(() => {
    if (!resolvedParams?.tableId) return
    let mounted = true
    const interval = setInterval(() => {
      if (!mounted) return
      fetchOrder().catch(() => {})
    }, 5000)

    // when the tab becomes visible, fetch immediately
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchOrder().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [resolvedParams?.tableId])

  // Tax removed: no tax calculation or addition to amounts
  const getAmountPerPerson = () =>
    computeAmountPerPerson({
      paymentMethod,
      numberOfPeople,
      splitShare,
      billTotal: Number(billTotal || 0),
      selectedItemMap,
      items,
    })

  const disableOther = (option: string) => paymentMethod !== null && paymentMethod !== option

  // Split selection/init handled in SplitPayment component

  // When in split mode, if user changes the number of people, re-initialize the split on the backend
  // Split initialization and update logic moved to SplitPayment component

  const toggleSelectItem = (orderItemId: number) => {
    setSelectedItemMap((prev) => incrementSelectedItemMap(prev, items, orderItemId))
  }

  const unselectItem = (orderItemId: number) => {
    setSelectedItemMap((prev) => decrementSelectedItemMap(prev, orderItemId))
  }

  // Full payment is handled in the `FullPayment` component

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <PaymentHeader language={language} setLanguage={setLanguage} />

        <div className="p-6">
              {!paymentMethod ? (
            <div className="space-y-4">
              <div className="bg-slate-100 p-4 rounded mb-6">
                <p className="text-sm text-slate-600">{t.bill}</p>
                <p className="text-3xl font-bold text-slate-900">${(billTotal || 0).toFixed(2)}</p>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-slate-600">Remaining</span>
                  <span className="font-semibold">${Number(remaining || 0).toFixed(2)}</span>
                </div>
              </div>

              <p className="font-semibold text-slate-900 mb-3">{t.selectPayment}</p>

              <PaymentMethodSelector
                methodLocked={methodLocked}
                paymentLoading={paymentLoading}
                orderStatus={orderStatus}
                orderId={orderId}
                splitNumPeopleStored={splitNumPeopleStored}
                onSelectFull={() => { if (methodLocked && methodLocked !== 'full') return; setMethodLocked('full'); setPaymentMethod('full') }}
                onSelectSplit={() => { if (methodLocked && methodLocked !== 'split') return; setMethodLocked('split'); setPaymentMethod('split') }}
                onSelectOwn={() => { if (methodLocked && methodLocked !== 'own') return; setMethodLocked('own'); setPaymentMethod('own') }}
                t={t}
              />

              <div className="text-xs text-slate-500 pt-4 border-t border-slate-200">
                <p className="font-semibold text-slate-700 mb-2">{t.items}:</p>
                <ItemsList items={items} selectedItemMap={selectedItemMap} interactive={false} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <BillSummary
                billTotal={Number(billTotal || 0)}
                paidTotal={Number(paidTotal || 0)}
                remaining={Number(remaining || 0)}
                amountToPay={getAmountPerPerson()}
                amountLabel={t.amountToPay}
              />

              {paymentMethod === 'own' ? (
                <OwnPayment
                  orderId={orderId}
                  items={items}
                  fetchOrder={fetchOrder}
                  applyOrderToState={applyOrderToState}
                  setMethodLocked={setMethodLocked}
                  paymentLoading={paymentLoading}
                  setPaymentLoading={setPaymentLoading}
                  language={language}
                  selectedItemMap={selectedItemMap}
                  setSelectedItemMap={setSelectedItemMap}
                />
              ) : paymentMethod === 'split' ? (
                <SplitPayment
                  orderId={orderId}
                  numberOfPeople={numberOfPeople}
                  setNumberOfPeople={setNumberOfPeople}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  setMethodLocked={setMethodLocked}
                  fetchOrder={fetchOrder}
                  applyOrderToState={applyOrderToState}
                  selectedItemMap={selectedItemMap}
                  setSelectedItemMap={setSelectedItemMap}
                  toggleSelectItem={toggleSelectItem}
                  unselectItem={unselectItem}
                  paymentLoading={paymentLoading}
                  setPaymentLoading={setPaymentLoading}
                  language={language}
                />
              ) : (
                <FullPayment
                  orderId={orderId}
                  fetchOrder={fetchOrder}
                  applyOrderToState={applyOrderToState}
                  setMethodLocked={setMethodLocked}
                  paymentLoading={paymentLoading}
                  setPaymentLoading={setPaymentLoading}
                  language={language}
                />
              )}

              <Button onClick={() => { setPaymentMethod(null); setMethodLocked(null) }} variant="outline" className="w-full">
                {t.cancel}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
