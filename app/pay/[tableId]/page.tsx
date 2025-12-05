"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { translations, type Language } from "@/lib/translations"
import { useToast } from '@/hooks/use-toast'
import { Spinner } from '@/components/ui/spinner'

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

  // fetch open order for this table from backend
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  const fetchOrder = async () => {
    const tableId = Number(resolvedParams?.tableId)
    try {
      const [ordersRes, menuRes] = await Promise.all([fetch(`${API}/orders/`), fetch(`${API}/menu-items/`)])
      const ordersData = await ordersRes.json()
      const menuData = await menuRes.json()
      const menuList = Array.isArray(menuData) ? menuData : menuData.results || []
      const allOrders = Array.isArray(ordersData) ? ordersData : ordersData.results || []

      // prefer an open order for this table; fall back to latest if none open
      const tableOrders = allOrders.filter((o: any) => o.table === tableId)
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
        return null
      }

      // map items using backend-provided fields (including unpaid_quantity and menu_item_name)
      const mapped = (order.items || []).map((it: any) => {
        const menuName = it.menu_item_name || (menuList.find((m: any) => m.id === (it.menu_item || it.menuId || null)) || {}).name || String(it.menu_item || it.menuId || 'Item')
        return {
          id: it.id,
          name: menuName,
          quantity: it.quantity || 1,
          price: Number(it.price || 0),
          paid_quantity: Number(it.paid_quantity || 0),
          unpaid_quantity: Number(it.unpaid_quantity ?? Math.max(0, (it.quantity || 1) - (it.paid_quantity || 0))),
          unpaid_amount: Number(it.unpaid_amount || 0),
        }
      })

      setItems(mapped)
      const total = Number(order.bill_amount ?? mapped.reduce((s, it) => s + it.price * it.quantity, 0))
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

      if (order.status === 'paid' || rem <= 0) setPaid(true)
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
    const mapped = (order.items || []).map((it: any) => {
      const menuName = it.menu_item_name || ''
      return {
        id: it.id,
        name: menuName,
        quantity: it.quantity || 1,
        price: Number(it.price || 0),
        paid_quantity: Number(it.paid_quantity || 0),
        unpaid_quantity: Number(it.unpaid_quantity ?? Math.max(0, (it.quantity || 1) - (it.paid_quantity || 0))),
        unpaid_amount: Number(it.unpaid_amount || 0),
      }
    })

    setItems(mapped)
    const total = Number(order.bill_amount ?? mapped.reduce((s, it) => s + it.price * it.quantity, 0))
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
    if (order.status === 'paid' || rem <= 0) setPaid(true)
  }

  useEffect(() => {
    if (resolvedParams?.tableId) fetchOrder()
  }, [resolvedParams?.tableId])

  const getTaxAmount = (amount: number) => amount * 0.1
  const getAmountPerPerson = () => {
    if (paymentMethod === "split") {
      // Prefer backend-provided split share if available (computed from immutable bill_amount)
      const shareBase = splitShare !== null ? Number(splitShare) : (Number(billTotal || 0) / Math.max(1, numberOfPeople))
      return shareBase + getTaxAmount(shareBase)
    }
    if (paymentMethod === "own") {
      // compute from selected items
      let subtotal = 0
      selectedItemMap.forEach((qty, orderItemId) => {
        const it = items.find((x) => x.id === orderItemId)
        if (it) subtotal += Number(it.price || 0) * qty
      })
      return subtotal + getTaxAmount(subtotal)
    }
    return Number(billTotal || 0) + getTaxAmount(Number(billTotal || 0))
  }

  const disableOther = (option: string) => paymentMethod !== null && paymentMethod !== option

  const handleSelectSplit = () => {
    // Open split UI and initialize split on backend with current `numberOfPeople`
    setPaymentMethod('split')
    // initialize split on backend for this order with currently selected number
    ;(async () => {
      if (!orderId) return
      try {
        const res = await fetch(`${API}/orders/${orderId}/split/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ people: numberOfPeople || 2, init: true }),
        })
        if (res.ok) {
          const json = await res.json()
          // refresh order and stored split info
          await fetchOrder()
          toast({ title: 'Split initialized', description: `Split for ${numberOfPeople || 2} people` })
        } else {
          const err = await res.json().catch(() => null)
          toast({ title: 'Split init failed', description: err?.detail || 'Could not initialize split' })
        }
      } catch (e) {
        // ignore network errors but notify
        toast({ title: 'Network error', description: 'Could not initialize split' })
      }
    })()
  }

  // When in split mode, if user changes the number of people, re-initialize the split on the backend
  const prevSplitPeopleRef = React.useRef<number | null>(null)
  useEffect(() => {
    if (paymentMethod !== 'split' || !orderId) return
    const prev = prevSplitPeopleRef.current
    if (prev === numberOfPeople) return
    // avoid calling on first mount where prev is null but split may already be initialized
    prevSplitPeopleRef.current = numberOfPeople

    ;(async () => {
      try {
        // If backend already stored a different split_num_people, the endpoint will return an error
        const res = await fetch(`${API}/orders/${orderId}/split/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ people: numberOfPeople, init: true }),
        })
        if (res.ok) {
          await fetchOrder()
          toast({ title: 'Split updated', description: `Split set to ${numberOfPeople} people` })
        } else {
          const err = await res.json().catch(() => null)
          toast({ title: 'Split update failed', description: err?.detail || 'Could not change split' })
        }
      } catch (e) {
        toast({ title: 'Network error', description: 'Could not update split' })
      }
    })()
  }, [numberOfPeople, paymentMethod, orderId])

  const toggleSelectItem = (orderItemId: number) => {
    setSelectedItemMap((prev) => {
      const m = new Map(prev)
      const current = m.get(orderItemId) || 0
      const it = items.find((it) => it.id === orderItemId)
      const max = it ? Number(it.unpaid_quantity || 0) : 0
      if (current >= max) return m
      m.set(orderItemId, (m.get(orderItemId) || 0) + 1)
      return m
    })
  }

  const unselectItem = (orderItemId: number) => {
    setSelectedItemMap((prev) => {
      const m = new Map(prev)
      const current = m.get(orderItemId) || 0
      if (current <= 1) m.delete(orderItemId)
      else m.set(orderItemId, current - 1)
      return m
    })
  }

  const handlePayFull = async () => {
    if (!orderId) return
    setPaymentLoading(true)
    try {
      const res = await fetch(`${API}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderId, method: 'full' }),
      })
          if (res.ok) {
            const json = await res.json().catch(() => null)
            toast({ title: 'Payment successful', description: 'Thank you for your payment' })
            if (json && json.order) {
              applyOrderToState(json.order)
            } else {
              // fallback to full refetch
              await fetchOrder()
            }
      } else {
        const err = await res.json().catch(() => null)
        toast({ title: 'Payment failed', description: err?.detail || 'Please try again' })
      }
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePaySplit = async () => {
    if (!orderId) return
    setPaymentLoading(true)
    try {
      const res = await fetch(`${API}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // do not send num_people here if split was already initialized; backend will use stored share
        body: JSON.stringify({ order: orderId, method: 'split', participant: `p-${Math.random().toString(36).slice(2,8)}` }),
      })
          if (res.ok) {
            const json = await res.json().catch(() => null)
            toast({ title: 'Share paid', description: 'Your split share was recorded' })
            if (json && json.order) {
              applyOrderToState(json.order)
            } else {
              await fetchOrder()
            }
      } else {
        const err = await res.json().catch(() => null)
        toast({ title: 'Payment failed', description: err?.detail || 'Please try again' })
      }
    } finally {
      setPaymentLoading(false)
    }
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
      const res = await fetch(`${API}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderId, method: 'item', items: itemsPayload, participant: `p-${Math.random().toString(36).slice(2,8)}` }),
      })
          if (res.ok) {
            const json = await res.json().catch(() => null)
            toast({ title: 'Payment successful', description: 'Items have been paid' })
            if (json && json.order) {
              applyOrderToState(json.order)
            } else {
              await fetchOrder()
            }
      } else {
        const err = await res.json().catch(() => null)
        toast({ title: 'Payment failed', description: err?.detail || 'Please try again' })
      }
    } finally {
      setPaymentLoading(false)
    }
  }

  if (paid) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-green-700 mb-2">Payment Successful</h1>
          <p className="text-slate-600 mb-6">Thank you for your payment</p>
          <Button
            onClick={() => {
              setPaymentMethod(null)
              setPaid(false)
              setNumberOfPeople(1)
            }}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">Pay Your Bill</h1>
              <div className="flex items-center gap-2">
              <a
                href={`/pay/${resolvedParams?.tableId}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Open link
              </a>
              <button
                onClick={() => {
                  try {
                    const url = typeof window !== 'undefined' ? window.location.href : `/pay/${resolvedParams?.tableId}`
                    navigator.clipboard.writeText(url)
                  } catch (e) {
                    // ignore
                  }
                }}
                className="text-xs text-slate-600 underline"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {(["en", "ru", "hy"] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  language === lang ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
              {!paymentMethod ? (
            <div className="space-y-4">
              <div className="bg-slate-100 p-4 rounded mb-6">
                <p className="text-sm text-slate-600">{t.bill}</p>
                <p className="text-3xl font-bold text-slate-900">${(billTotal || 0).toFixed(2)}</p>
              </div>

              <p className="font-semibold text-slate-900 mb-3">{t.selectPayment}</p>

              <Button
                onClick={() => setPaymentMethod("full")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base"
                disabled={orderStatus === 'paid' || !orderId || paymentLoading}
              >
                {t.payFull}
              </Button>

              <Button
                onClick={handleSelectSplit}
                variant="outline"
                className="w-full py-6 text-base border-2"
                disabled={orderStatus === 'paid' || !orderId || paymentLoading}
              >
                {t.splitBill}
              </Button>

              <Button
                onClick={() => setPaymentMethod("own")}
                variant="outline"
                className="w-full py-6 text-base border-2"
                disabled={orderStatus === 'paid' || !orderId || paymentLoading}
              >
                {t.payOwnItems}
              </Button>

              <div className="text-xs text-slate-500 pt-4 border-t border-slate-200">
                <p className="font-semibold text-slate-700 mb-2">{t.items}:</p>
                {items.length === 0 ? (
                  <div className="text-slate-600">No items on this table yet.</div>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethod === "split" && (
                <>
                  <p className="sr-only">{t.people}</p>
                  {/* quick-picker moved into summary container below for cleaner layout */}
                </>
              )}

              <div className="bg-blue-50 p-4 rounded space-y-3">
                {paymentMethod === 'split' && (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-700 font-medium">{t.people}</div>
                      <div className="text-xs text-slate-500">Choose number of people</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {[2, 3, 4, 5, 6].map((num) => (
                        <Button
                          key={num}
                          variant={numberOfPeople === num ? 'default' : 'outline'}
                          onClick={() => setNumberOfPeople(num)}
                          className="px-3 py-1"
                        >
                          {num}
                        </Button>
                      ))}
                      <div className="flex items-center gap-2 ml-2">
                        <input
                          type="number"
                          min="2"
                          value={numberOfPeople}
                          onChange={(e) => setNumberOfPeople(Math.max(2, Number.parseInt(e.target.value) || 2))}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-center bg-white"
                          aria-label="Custom people count"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t.subtotal}</span>
                  <span className="font-semibold">${Number(billTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t.tax}</span>
                  <span className="font-semibold">${Number(getTaxAmount(Number(billTotal || 0))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Paid</span>
                  <span className="font-semibold">${Number(paidTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Remaining</span>
                  <span className="font-semibold">${Number(remaining || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between">
                  <span className="font-bold text-slate-900">{t.amountToPay}</span>
                  <span className="text-2xl font-bold text-blue-600">${getAmountPerPerson().toFixed(2)}</span>
                </div>
              </div>

              {paymentMethod === 'own' ? (
                <>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="text-slate-600">No items to pay for.</div>
                    ) : (
                      items.map((item) => {
                        const selectedQty = selectedItemMap.get(item.id) || 0
                        return (
                          <div key={item.id} className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{item.name}</div>
                              <div className="text-xs text-slate-500">Unit: ${item.price.toFixed(2)} • {item.unpaid_quantity} remaining • Total: ${ (item.price * item.unpaid_quantity).toFixed(2) }</div>
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
                    )}
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
              ) : (
                <Button
                  onClick={paymentMethod === 'split' ? handlePaySplit : handlePayFull}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base"
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="h-4 w-4 text-white" />
                      <span>Paying...</span>
                    </div>
                  ) : paymentMethod === "split" ? (
                    `${t.payMyShare}`
                  ) : (
                    t.payMyShare
                  )}
                </Button>
              )}

              <Button onClick={() => setPaymentMethod(null)} variant="outline" className="w-full">
                {t.cancel}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
