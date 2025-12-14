import React from 'react'
import { formatCurrency } from '@/lib/utils'

interface Item {
  id: number
  name: string
  quantity: number
  price: number
  unpaid_quantity?: number
}

interface Props {
  items: Item[]
  selectedItemMap: Map<number, number>
  toggleSelectItem?: (id: number) => void
  unselectItem?: (id: number) => void
  interactive?: boolean
}

export function ItemsList({ items, selectedItemMap, toggleSelectItem, unselectItem, interactive = false }: Props) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-slate-600">No items on this table yet.</div>
      ) : (
        items.map((item) => {
          const selectedQty = selectedItemMap.get(item.id) || 0
          return (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{item.name}</div>
                <div className="text-xs text-slate-500">Unit: {formatCurrency(item.price)} • {item.unpaid_quantity} remaining • Total: {formatCurrency((item.price || 0) * (item.unpaid_quantity || 0))}</div>
              </div>
              {interactive ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => unselectItem?.(item.id)} className="px-2 py-1 bg-slate-200 rounded disabled:opacity-50" disabled={selectedQty <= 0}>
                    -
                  </button>
                  <div className="px-3">{selectedQty}</div>
                  <button onClick={() => toggleSelectItem?.(item.id)} className="px-2 py-1 bg-slate-200 rounded" disabled={selectedQty >= (item.unpaid_quantity || 0)}>
                    +
                  </button>
                </div>
              ) : (
                <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default ItemsList
