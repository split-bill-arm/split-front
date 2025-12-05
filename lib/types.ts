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
