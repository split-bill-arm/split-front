import type { MenuItem, Order, Table } from './types'
import type { TableBill } from './types'

export function formatCurrency(value: number | string, locale = 'en-US', currency = 'USD') {
  const n = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)
}

export function sumItems(items: { price: number; quantity: number }[]) {
  return items.reduce((s, it) => s + Number(it.price || 0) * (it.quantity || 0), 0)
}

export function mapOrderToTableBill(order: Order, menuList: MenuItem[], table: Table): TableBill {
  const items = (order.items || []).map((it: any) => {
    const menuItem = menuList.find((m) => m.id === (it.menu_item || it.menuId || it.menuItem))
    return {
      menuId: it.menu_item || it.menuId || null,
      name: menuItem ? menuItem.name : String(it.menu_item || it.menuId || 'Item'),
      quantity: it.quantity || 1,
      price: Number(it.price || 0),
    }
  })

  const total = sumItems(items)
  const paid = Number((order as any).paid_total || 0)

  return {
    tableId: table.id,
    items,
    totalAmount: total,
    paidAmount: paid,
  }
}

export default { formatCurrency, sumItems, mapOrderToTableBill }

// Map backend order.items to frontend-friendly items used on pay page
export function mapOrderItems(order: Order, menuList: MenuItem[] = []) {
  return (order.items || []).map((it: any) => {
    const menuName = it.menu_item_name || (menuList.find((m: any) => m.id === (it.menu_item || it.menuId || null)) || {}).name || String(it.menu_item || it.menuId || 'Item')
    const quantity = Number(it.quantity || 1)
    const price = Number(it.price || 0)
    const paid_quantity = Number(it.paid_quantity || 0)
    const unpaid_quantity = Number(it.unpaid_quantity ?? Math.max(0, quantity - paid_quantity))
    const unpaid_amount = Number(it.unpaid_amount ?? price * unpaid_quantity)
    return {
      id: it.id,
      name: menuName,
      quantity,
      price,
      paid_quantity,
      unpaid_quantity,
      unpaid_amount,
    }
  })
}

// Compute the amount a user should pay depending on method
export function computeAmountPerPerson(opts: {
  paymentMethod: 'full' | 'split' | 'own' | null
  numberOfPeople: number
  splitShare: number | null
  billTotal: number
  selectedItemMap: Map<number, number>
  items: Array<{ id: number; price: number; quantity: number; unpaid_quantity?: number }>
}) {
  const { paymentMethod, numberOfPeople, splitShare, billTotal, selectedItemMap, items } = opts
  if (paymentMethod === 'split') {
    const shareBase = splitShare !== null ? Number(splitShare) : (Number(billTotal || 0) / Math.max(1, numberOfPeople))
    return shareBase
  }
  if (paymentMethod === 'own') {
    let subtotal = 0
    selectedItemMap.forEach((qty, orderItemId) => {
      const it = items.find((x) => x.id === orderItemId)
      if (it) subtotal += Number(it.price || 0) * qty
    })
    return subtotal
  }
  return Number(billTotal || 0)
}
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helpers for manipulating selected-item maps
export function incrementSelectedItemMap(
  prev: Map<number, number>,
  items: Array<{ id: number; unpaid_quantity?: number; price?: number }>,
  orderItemId: number
) {
  const m = new Map(prev)
  const current = m.get(orderItemId) || 0
  const it = items.find((it) => it.id === orderItemId)
  const max = it ? Number(it.unpaid_quantity || 0) : 0
  if (current >= max) return m
  m.set(orderItemId, current + 1)
  return m
}

export function decrementSelectedItemMap(prev: Map<number, number>, orderItemId: number) {
  const m = new Map(prev)
  const current = m.get(orderItemId) || 0
  if (current <= 1) m.delete(orderItemId)
  else m.set(orderItemId, current - 1)
  return m
}
