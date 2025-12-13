import { apiClient } from '@/lib/apiClient'
import type { Order, Table } from '@/lib/types'

export async function getOrders(): Promise<Order[] | null> {
  const res = await apiClient<Order[]>('/orders/', { method: 'GET', requireAuth: false })
  return (res.data as Order[] | null) ?? null
}

export async function getTables(): Promise<Table[] | null> {
  const res = await apiClient<Table[]>('/tables/', { method: 'GET', requireAuth: false })
  if (Array.isArray(res.data)) return res.data
  // fallback: if res itself is an array (for legacy or direct fetch)
  if (Array.isArray((res as any))) return res as any as Table[]
  return (res.data as Table[] | null) ?? null
}

export type CreateOrderItem = { menu_item: number; quantity: number }

export async function postOrder(tableId: number, items: CreateOrderItem[]) {
  const payload = { table: tableId, items }
  const res = await apiClient('/orders/create-for-table/', { method: 'POST', body: payload, requireAuth: false })
  return res
}

export async function initSplit(orderId: number, people: number, init = true) {
  const payload = { people, init }
  return apiClient(`/orders/${orderId}/split/`, { method: 'POST', body: payload, requireAuth: false })
}

export default { getOrders, getTables }
