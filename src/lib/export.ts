import Papa from 'papaparse'
import {
  landedUnitCost,
  marketValueOnHand,
  quantityOnHand,
} from './calculations'
import type { InventoryItem, CardData } from './types'

export function exportInventory(items: InventoryItem[], data: CardData) {
  const csv = Papa.unparse(
    items.map((item) => ({
      'Item ID': item.item_id,
      Name: item.name,
      Game: item.game,
      Set: item.set_name,
      Condition: item.condition,
      Quantity: quantityOnHand(item, data.sales),
      'Unit Cost': landedUnitCost(item, data.grading),
      'Market Value': item.manual_market_value,
      'Total Value': marketValueOnHand(item, data.sales),
    })),
    { escapeFormulae: true },
  )
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `stack-inventory-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
