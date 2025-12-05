export const mockMenu = [
  { id: 1, name: "Caesar Salad", price: 12 },
  { id: 2, name: "Grilled Chicken", price: 18 },
  { id: 3, name: "Pasta Carbonara", price: 15 },
  { id: 4, name: "Hamburger", price: 14 },
  { id: 5, name: "Fish & Chips", price: 16 },
  { id: 6, name: "Vegetable Soup", price: 8 },
  { id: 7, name: "Iced Tea", price: 3 },
  { id: 8, name: "Coffee", price: 4 },
]

export const mockTables = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  qrCode: `table-${i + 1}`,
}))
