import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCardStore } from './useCardStore'
import { dashboardTotals, quantityOnHand } from '../lib/calculations'

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

async function setup() {
  const hook = renderHook(() => useCardStore(null))
  await act(async () => {
    await Promise.resolve()
  })
  return hook
}

describe('vendor workspace data integrity', () => {
  it('rejects overselling without changing stock or totals', async () => {
    const { result } = await setup()
    const before = dashboardTotals(result.current.data)
    const item = result.current.data.inventory[0]
    await act(async () => {
      await expect(
        result.current.addSale({
          sale_date: '2026-10-22',
          channel: 'Card Show',
          item_id: item.item_id,
          quantity: 999,
          gross_sale: 999,
          shipping_charged: 0,
          fee_rate: 0,
          fee_flat: 0,
          shipping_cost: 0,
          supplies_cost: 0,
          status: 'Paid',
        }),
      ).rejects.toThrow('exceeds')
    })
    expect(dashboardTotals(result.current.data)).toEqual(before)
  })

  it('restores stock for cancelled sales and guards reactivation after stock is sold', async () => {
    const { result } = await setup()
    const sale = result.current.data.sales[0]
    const item = result.current.data.inventory.find(
      (item) => item.item_id === sale.item_id,
    )!
    const originalQty = quantityOnHand(item, result.current.data.sales)
    await act(async () => {
      await result.current.updateSaleStatus(sale.id, 'Cancelled')
    })
    expect(quantityOnHand(item, result.current.data.sales)).toBe(
      originalQty + sale.quantity,
    )
    await act(async () => {
      await result.current.addSale({
        ...sale,
        quantity: originalQty + sale.quantity,
        sale_date: '2026-10-22',
        status: 'Paid',
      })
    })
    await act(async () => {
      await expect(
        result.current.updateSaleStatus(sale.id, 'Paid'),
      ).rejects.toThrow('not enough stock')
    })
    expect(quantityOnHand(item, result.current.data.sales)).toBe(0)
  })

  it('prevents duplicate IDs, certificates, and repeated imports', async () => {
    const { result } = await setup()
    const card = result.current.data.inventory[0]
    await act(async () => {
      await expect(result.current.addInventory(card)).rejects.toThrow(
        'already exists',
      )
    })
    await act(async () => {
      await expect(
        result.current.addInventory({ ...card, item_id: 'NEW-ID' }),
      ).rejects.toThrow('already exists')
    })
    await act(async () => {
      await expect(
        result.current.importCardLadder(
          {
            inventory: [card],
            purchases: [],
            warnings: [],
            totals: { cost: 0, marketValue: 0, unrealizedProfit: 0, units: 1 },
          },
          'duplicate.csv',
        ),
      ).rejects.toThrow('already in your inventory')
    })
    expect(result.current.data.inventory).toHaveLength(8)
  })

  it('persists an editable card and restores it on a new mount', async () => {
    const first = await setup()
    const id = first.result.current.data.inventory[0].id
    await act(async () => {
      await first.result.current.updateInventory(id, {
        manual_market_value: 999,
        market_value_date: '2026-10-22',
        notes: 'Updated',
      })
    })
    first.unmount()
    const second = await setup()
    expect(second.result.current.data.inventory[0].manual_market_value).toBe(
      999,
    )
    expect(
      JSON.parse(window.localStorage.getItem('card-vendor-tracker-demo-data')!)
        .version,
    ).toBe(2)
  })

  it('keeps current data intact when browser storage is full', async () => {
    const { result } = await setup()
    const before = result.current.data.expenses.length
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })
    await act(async () => {
      await expect(
        result.current.addExpense({
          expense_date: '2026-10-22',
          category: 'Supplies',
          vendor: 'Test',
          amount: 5,
          payment_method: 'Cash',
        }),
      ).rejects.toThrow('Storage full')
    })
    expect(result.current.data.expenses).toHaveLength(before)
  })

  it('recovers from malformed browser data without crashing', async () => {
    window.localStorage.setItem(
      'card-vendor-tracker-demo-data',
      '{"inventory":"broken"}',
    )
    const { result } = await setup()
    expect(result.current.data.inventory).toHaveLength(8)
  })
})
