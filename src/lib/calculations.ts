import type { CardData, GradingSubmission, InventoryItem, SaleRecord } from './types'

const inactiveSaleStatuses = new Set(['Cancelled', 'Returned'])

export function currency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

export function percent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0)
}

export function activeSales(sales: SaleRecord[]): SaleRecord[] {
  return sales.filter((sale) => !inactiveSaleStatuses.has(sale.status))
}

export function quantitySoldForItem(itemId: string, sales: SaleRecord[]): number {
  return activeSales(sales)
    .filter((sale) => sale.item_id === itemId)
    .reduce((sum, sale) => sum + sale.quantity, 0)
}

export function gradingCostForItem(itemId: string, grading: GradingSubmission[]): number {
  return grading
    .filter((submission) => submission.item_id === itemId)
    .reduce((sum, submission) => sum + submission.grading_fee + submission.shipping_fee, 0)
}

export function landedUnitCost(item: InventoryItem, grading: GradingSubmission[] = []): number {
  const gradingCost = gradingCostForItem(item.item_id, grading)
  return item.base_unit_cost + gradingCost / Math.max(item.qty_acquired, 1)
}

export function quantityOnHand(item: InventoryItem, sales: SaleRecord[]): number {
  return item.qty_acquired - quantitySoldForItem(item.item_id, sales)
}

export function marketValueOnHand(item: InventoryItem, sales: SaleRecord[]): number {
  return quantityOnHand(item, sales) * item.manual_market_value
}

export function inventoryCostOnHand(
  item: InventoryItem,
  sales: SaleRecord[],
  grading: GradingSubmission[] = [],
): number {
  return quantityOnHand(item, sales) * landedUnitCost(item, grading)
}

export function saleFees(sale: SaleRecord): number {
  if (typeof sale.fees_override === 'number') {
    return sale.fees_override
  }

  return sale.gross_sale * sale.fee_rate + sale.fee_flat
}

export function saleNetProceeds(sale: SaleRecord): number {
  return sale.gross_sale + sale.shipping_charged - saleFees(sale) - sale.shipping_cost - sale.supplies_cost
}

export function saleCogs(
  sale: SaleRecord,
  inventory: InventoryItem[],
  grading: GradingSubmission[] = [],
): number {
  const item = inventory.find((entry) => entry.item_id === sale.item_id)
  return item ? sale.quantity * landedUnitCost(item, grading) : 0
}

export function saleProfit(
  sale: SaleRecord,
  inventory: InventoryItem[],
  grading: GradingSubmission[] = [],
): number {
  return saleNetProceeds(sale) - saleCogs(sale, inventory, grading)
}

export function saleMargin(
  sale: SaleRecord,
  inventory: InventoryItem[],
  grading: GradingSubmission[] = [],
): number {
  const net = saleNetProceeds(sale)
  return net === 0 ? 0 : saleProfit(sale, inventory, grading) / net
}

export function saleRoi(
  sale: SaleRecord,
  inventory: InventoryItem[],
  grading: GradingSubmission[] = [],
): number {
  const cogs = saleCogs(sale, inventory, grading)
  return cogs === 0 ? 0 : saleProfit(sale, inventory, grading) / cogs
}

export function isMarketValueStale(marketValueDate: string, today = new Date(), maxAgeDays = 30): boolean {
  const date = new Date(`${marketValueDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return true

  const ageMs = today.getTime() - date.getTime()
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000
}

export function dashboardTotals(data: CardData, today = new Date()) {
  const inventoryCost = data.inventory.reduce(
    (sum, item) => sum + inventoryCostOnHand(item, data.sales, data.grading),
    0,
  )
  const marketValue = data.inventory.reduce((sum, item) => sum + marketValueOnHand(item, data.sales), 0)
  const realizedProfit = activeSales(data.sales).reduce(
    (sum, sale) => sum + saleProfit(sale, data.inventory, data.grading),
    0,
  )
  const grossSales = activeSales(data.sales).reduce((sum, sale) => sum + sale.gross_sale, 0)
  const cogs = activeSales(data.sales).reduce((sum, sale) => sum + saleCogs(sale, data.inventory, data.grading), 0)
  const unitsOnHand = data.inventory.reduce((sum, item) => sum + quantityOnHand(item, data.sales), 0)
  const stalePricing = data.inventory.filter((item) => isMarketValueStale(item.market_value_date, today)).length
  const cashInvested =
    data.purchases.reduce((sum, purchase) => sum + purchase.total_paid + purchase.tax + purchase.shipping, 0) +
    data.grading.reduce((sum, submission) => sum + submission.grading_fee + submission.shipping_fee, 0)

  return {
    inventoryCost,
    marketValue,
    unrealizedProfit: marketValue - inventoryCost,
    realizedProfit,
    margin: grossSales === 0 ? 0 : realizedProfit / grossSales,
    roi: cogs === 0 ? 0 : realizedProfit / cogs,
    cashInvested,
    unitsOnHand,
    stalePricing,
  }
}

export function monthlySales(data: CardData) {
  const buckets = new Map<string, { month: string; sales: number; profit: number }>()

  for (const sale of activeSales(data.sales)) {
    const month = sale.sale_date.slice(0, 7)
    const existing = buckets.get(month) ?? { month, sales: 0, profit: 0 }
    existing.sales += sale.gross_sale
    existing.profit += saleProfit(sale, data.inventory, data.grading)
    buckets.set(month, existing)
  }

  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export function duplicateKeys(items: InventoryItem[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const item of items) {
    const key = item.cert_number ? `cert:${item.cert_number}` : `item:${item.item_id}`
    if (seen.has(key)) duplicates.add(key)
    seen.add(key)
  }

  return [...duplicates]
}
