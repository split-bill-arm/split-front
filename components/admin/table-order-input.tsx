"use client"

import { useState } from "react"
import { useToast } from '@/hooks/use-toast'
import { Spinner } from '@/components/ui/spinner'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockMenu } from "@/lib/mock-data"
import { useEffect } from "react"
import { translations, type Language } from "@/lib/translations"
import { getMenuItems } from '@/lib/services/menu'
import { postOrder } from '@/lib/services/orders'
import { sumItems } from '@/lib/utils'

interface MenuItem {
  id: number
  name: string
  quantity: number
}

interface Props {
  tableId: number
  onAddOrder: (tableId: number, items: any[], total: number) => void
  onClose: () => void
  language: Language
}

export default function TableOrderInput({ tableId, onAddOrder, onClose, language }: Props) {
  const [selectedItems, setSelectedItems] = useState<Map<number, number>>(new Map())
  const [menu, setMenu] = useState<typeof mockMenu>(mockMenu)
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const t = translations[language]

  useEffect(() => {
    // Fetch menu items from backend; fallback to mockMenu on error
    getMenuItems()
      .then((data) => {
        console.debug('[TableOrderInput] fetched menu items:', data)
        const list = data || null
        if (list) {
          const normalized = list.map((m: any) => ({ ...m, price: Number(m.price) }))
          setMenu(normalized)
        }
      })
      .catch(() => {
        console.error('[TableOrderInput] failed to fetch menu items, using mock menu')
        // keep mock menu
      })
  }, [])

  const addItem = (menuId: number) => {
    console.debug('[TableOrderInput] addItem', menuId)
    setSelectedItems((prev) => {
      const newMap = new Map(prev)
      newMap.set(menuId, (newMap.get(menuId) || 0) + 1)
      return newMap
    })
  }

  const removeItem = (menuId: number) => {
    console.debug('[TableOrderInput] removeItem', menuId)
    setSelectedItems((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(menuId) || 0
      if (current <= 1) {
        newMap.delete(menuId)
      } else {
        newMap.set(menuId, current - 1)
      }
      return newMap
    })
  }

  const calculateTotal = () => {
    let total = 0
    selectedItems.forEach((qty, menuId) => {
      const item = menu.find((m) => m.id === menuId)
      if (item) total += Number(item.price || 0) * qty
    })
    console.debug('[TableOrderInput] calculateTotal', total)
    return total
  }

  const handleSubmit = () => {
    setIsAdding(true)
    const items = Array.from(selectedItems.entries()).map(([menuId, qty]) => {
      const item = menu.find((m) => m.id === menuId)
      return {
        menuId,
        name: item?.name || "",
        quantity: qty,
        price: Number(item?.price || 0),
      }
    })

    console.debug('[TableOrderInput] handleSubmit, tableId:', tableId, 'items:', items)
    // Send to backend using services
    const payload = items.map((i) => ({ menu_item: i.menuId, quantity: i.quantity }))
    postOrder(tableId, payload)
      .then((res) => {
        console.debug('[TableOrderInput] postOrder response:', res)
        if (res.error) {
          // optimistic fallback
          onAddOrder(tableId, items, calculateTotal())
          toast({ title: 'Order queued', description: 'Order will be created shortly' })
        } else {
          onAddOrder(tableId, items, calculateTotal())
          toast({ title: 'Order added', description: 'Order created for table ' + tableId })
        }

        setSelectedItems(new Map())
        onClose()
      })
      .catch(() => {
        console.error('[TableOrderInput] postOrder failed, queued locally')
        onAddOrder(tableId, items, calculateTotal())
        setSelectedItems(new Map())
        onClose()
        toast({ title: 'Order queued', description: 'Order will be created shortly' })
      })
      .finally(() => setIsAdding(false))
  }

  return (
    <Card className="p-6 mt-6 bg-white border-2 border-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">
        {t.table} {tableId} - {t.menu}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {menu.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded">
            <div>
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="text-sm text-slate-600">${Number(item.price || 0).toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeItem(item.id)}
                disabled={!selectedItems.has(item.id)}
              >
                -
              </Button>
              <span className="w-8 text-center py-2 text-slate-900 font-semibold">
                {selectedItems.get(item.id) || 0}
              </span>
              <Button size="sm" variant="outline" onClick={() => addItem(item.id)}>
                +
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-100 p-4 rounded mb-4">
        <p className="text-sm text-slate-600">{t.total}</p>
        <p className="text-3xl font-bold text-slate-900">${Number(calculateTotal() || 0).toFixed(2)}</p>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700" disabled={isAdding}>
          {isAdding ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4 text-white" />
              <span>Adding...</span>
            </div>
          ) : (
            t.confirm
          )}
        </Button>
        <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent" disabled={isAdding}>
          {t.cancel}
        </Button>
      </div>
    </Card>
  )
}
