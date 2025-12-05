"use client"

import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { translations, type Language } from "@/lib/translations"
import TableOrderInput from "@/components/admin/table-order-input"
import OpenOrdersView from "@/components/admin/open-orders-view"
import type { TableBill } from "@/lib/types"
import { API_BASE } from '@/lib/api'

export default function AdminPanel({ params }: { params: Promise<{ restaurantId: string }> | { restaurantId: string } }) {
  const [language, setLanguage] = useState<Language>("en")
  const [bills, setBills] = useState<TableBill[]>([])
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [tables, setTables] = useState<any[]>([])
  const [menu, setMenu] = useState<any[]>([])

  const t = translations[language]

  // `params` may be a Promise in client components; unwrap with React.use()
  const resolvedParams = (React as any).use ? (React as any).use(params) : params

  const handleAddOrder = (tableId: number, items: any[], total: number) => {
    // after TableOrderInput posts to backend, refresh orders from backend
    fetchOrders()
  }

  const handlePayment = (tableId: number, amount: number) => {
    setBills((prev) =>
      prev
        .map((b) => (b.tableId === tableId ? { ...b, paidAmount: Math.min(b.paidAmount + amount, b.totalAmount) } : b))
        .filter((b) => b.paidAmount < b.totalAmount || b.totalAmount === 0),
    )
  }

  const API = API_BASE

  const fetchOrders = async () => {
    try {
      const [ordersRes, menuRes] = await Promise.all([
        fetch(`${API}/orders/`),
        fetch(`${API}/menu-items/`),
      ])
      const ordersData = await ordersRes.json()
      const menuData = await menuRes.json()
      const menuList = Array.isArray(menuData) ? menuData : menuData.results || []
      setMenu(menuList)

      // find open orders for our selected table (if any)
      const allOrders = Array.isArray(ordersData) ? ordersData : ordersData.results || []
      const table = tables[0]
      if (!table) return

      const openOrders = allOrders.filter((o: any) => o.table === table.id && o.status === "open")

      const billsFromOrders: TableBill[] = openOrders.map((o: any) => {
        const items = (o.items || []).map((it: any) => {
          const menuItem = menuList.find((m: any) => m.id === (it.menu_item || it.menuItem || it.menuId))
          return {
            menuId: it.menu_item || it.menuId || null,
            name: menuItem ? menuItem.name : String(it.menu_item || it.menuId || "Item"),
            quantity: it.quantity || 1,
            price: Number(it.price || 0),
          }
        })
        const total = items.reduce((s: number, it: any) => s + Number(it.price) * it.quantity, 0)
        const paid = Number(o.paid_total || 0)
        return {
          tableId: table.id,
          items,
          totalAmount: total,
          paidAmount: paid,
        }
      })

      setBills(billsFromOrders)
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    // fetch tables and pick the first one only
    const API = API_BASE
    fetch(`${API}/tables/`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || []
        setTables(list)
        if (list.length > 0) {
          setSelectedTable(list[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (tables.length > 0) fetchOrders()
    // poll for updates so admin sees payments made from the pay page
    const id = setInterval(() => {
      if (tables.length > 0) fetchOrders()
    }, 5000)
    return () => clearInterval(id)
  }, [tables])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t.admin}</h1>
            <p className="text-slate-600">Restaurant: {resolvedParams?.restaurantId || (params as any).restaurantId}</p>
          </div>

          <div className="flex gap-2">
            {(["en", "ru", "hy"] as Language[]).map((lang) => (
              <Button
                key={lang}
                variant={language === lang ? "default" : "outline"}
                onClick={() => setLanguage(lang)}
                className="text-sm"
              >
                {lang.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="tables" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tables">{t.tables}</TabsTrigger>
            <TabsTrigger value="orders">{t.openOrders}</TabsTrigger>
          </TabsList>

          <TabsContent value="tables" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.length > 0 ? (
                <Card
                  key={tables[0].id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedTable(tables[0].id)}
                >
                  <h3 className="font-bold text-slate-900">
                    {t.table} {tables[0].number || tables[0].id}
                  </h3>
                  <p className="text-xs text-slate-500 my-2">{tables[0].qr_code || tables[0].qrCode || ''}</p>
                  <Button variant="outline" className="w-full bg-transparent" size="sm">
                    {selectedTable === tables[0].id ? t.addItems : t.addItems}
                  </Button>
                </Card>
              ) : (
                <div className="text-slate-600">No tables configured in backend.</div>
              )}
            </div>

            {selectedTable && (
              <TableOrderInput
                tableId={selectedTable}
                onAddOrder={handleAddOrder}
                onClose={() => setSelectedTable(null)}
                language={language}
              />
            )}
          </TabsContent>

          <TabsContent value="orders">
            <OpenOrdersView bills={bills} language={language} onPayment={handlePayment} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
