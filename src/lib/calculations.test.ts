import { describe, expect, it } from 'vitest'
import {
  dashboardTotals,
  isMarketValueStale,
  quantityOnHand,
  saleFees,
  saleMargin,
  saleNetProceeds,
  saleProfit,
  saleRoi,
} from './calculations'
import type { CardData } from './types'

const data: CardData = {
  inventory: [
    {
      id: 'inv-1',
      item_id: 'TEST-001',
      game: 'Pokemon',
      product_type: 'Slab',
      name: 'Test Foil Dragon',
      condition: 'PSA 10',
      qty_acquired: 2,
      base_unit_cost: 100,
      manual_market_value: 150,
      market_value_date: '2026-05-01',
      status: 'Active',
    },
  ],
  purchases: [
    {
      id: 'lot-1',
      lot_id: 'LOT-001',
      purchase_date: '2026-05-01',
      seller: 'Test Seller',
      source: 'Card Show',
      total_paid: 200,
      tax: 10,
      shipping: 5,
      allocated_cost: 200,
      payment_method: 'Cash',
    },
  ],
  sales: [
    {
      id: 'sale-1',
      sale_date: '2026-05-10',
      channel: 'eBay',
      item_id: 'TEST-001',
      quantity: 1,
      gross_sale: 180,
      shipping_charged: 5,
      fee_rate: 0.1,
      fee_flat: 0.3,
      fees_override: null,
      shipping_cost: 4,
      supplies_cost: 1,
      status: 'Delivered',
    },
  ],
  grading: [
    {
      id: 'grade-1',
      submission_id: 'SUB-001',
      item_id: 'TEST-001',
      company: 'PSA',
      submission_date: '2026-04-01',
      grading_fee: 20,
      shipping_fee: 10,
      status: 'Complete',
    },
  ],
  expenses: [],
  feePresets: [{ id: 'preset-1', channel: 'eBay', fee_rate: 0.1, fee_flat: 0.3 }],
  importBatches: [],
}

describe('vendor calculations', () => {
  it('rolls inventory forward from sales', () => {
    expect(quantityOnHand(data.inventory[0], data.sales)).toBe(1)
  })

  it('calculates sale fees, net proceeds, profit, margin, and ROI', () => {
    const sale = data.sales[0]

    expect(saleFees(sale)).toBeCloseTo(18.3)
    expect(saleNetProceeds(sale)).toBeCloseTo(161.7)
    expect(saleProfit(sale, data.inventory, data.grading)).toBeCloseTo(46.7)
    expect(saleMargin(sale, data.inventory, data.grading)).toBeCloseTo(0.2888, 4)
    expect(saleRoi(sale, data.inventory, data.grading)).toBeCloseTo(0.406, 3)
  })

  it('summarizes dashboard totals', () => {
    const totals = dashboardTotals(data, new Date('2026-05-15T12:00:00Z'))

    expect(totals.inventoryCost).toBeCloseTo(115)
    expect(totals.marketValue).toBeCloseTo(150)
    expect(totals.unrealizedProfit).toBeCloseTo(35)
    expect(totals.realizedProfit).toBeCloseTo(46.7)
    expect(totals.cashInvested).toBeCloseTo(245)
    expect(totals.unitsOnHand).toBe(1)
  })

  it('detects stale market prices', () => {
    expect(isMarketValueStale('2026-04-01', new Date('2026-05-15T12:00:00Z'))).toBe(true)
    expect(isMarketValueStale('2026-05-01', new Date('2026-05-15T12:00:00Z'))).toBe(false)
  })
})
