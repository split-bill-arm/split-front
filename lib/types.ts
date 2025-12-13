export interface OrderItem {
  menuId: number
  name: string
  quantity: number
  price: number
  paidAmount?: number
}

export interface TableBill {
  tableId: number
  items: OrderItem[]
  totalAmount: number
  paidAmount: number
  paymentMethod?: "full" | "split" | "own"
  numberOfPeople?: number
}

export interface CustomerBillState {
  items: OrderItem[]
  total: number
  paymentMethod?: "full" | "split" | "own"
  numberOfPeople: number
  amountPerPerson: number
  customerId: string
}

// Backend (Django) model types
// Note: Django Decimal fields are often serialized as strings in JSON responses.
export type Price = number | string

export interface Restaurant {
  id: number
  name: string
}

export interface Table {
  id: number
  restaurant: number | Restaurant
  number: string
  qr_code?: string
}

export interface MenuItem {
  id: number
  restaurant: number | Restaurant
  name: string
  price: Price
}

export interface OrderItemBackend {
  id: number
  order: number
  menu_item: number | MenuItem | null
  quantity: number
  price: Price
  paid_quantity?: number
  paid_amount?: Price
}

export type OrderStatus = 'open' | 'closed' | 'paid'

export interface Order {
  id: number
  restaurant: number | Restaurant
  table: number | Table | null
  status: OrderStatus
  created_at: string
  bill_amount: Price
  remaining_amount: Price
  split_share_amount?: Price | null
  split_num_people?: number | null
  items?: OrderItemBackend[]
}

export interface Payment {
  id: number
  order: number | Order
  amount: Price
  method?: string
  created_at?: string
  participant?: string | null
}

export interface PaymentItem {
  id: number
  payment: number | Payment
  order_item: number | OrderItemBackend
  quantity: number
  amount: Price
}

// Generic API response shape used by some Django-rest-framework endpoints
export interface APIResponse<T> {
  count?: number
  next?: string | null
  previous?: string | null
  results?: T[]
}
