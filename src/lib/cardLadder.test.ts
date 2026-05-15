import { describe, expect, it } from 'vitest'
import { parseCardLadderCsv } from './cardLadder'

const fixture = `Date Purchased,Quantity,Card,Subject,Year,Set,Variation,Number,Category,Condition,Investment,Current Value,Potential Profit,Graded Cert #,Population,Notes
2026-05-01,1,Sample Dragon Alt Art,Dragon,2025,One Piece Sample Set,Alt Art,OP01-001,One Piece,PSA 10,500,650,150,CERT001,12,First copy
2026-05-02,2,Sample Mouse Promo,Mouse,2024,Pokemon Sample Set,Promo,025,Pokemon,Near Mint,40,90,50,,200,Binder copies`

describe('Card Ladder CSV import', () => {
  it('normalizes rows into inventory and purchases', () => {
    const preview = parseCardLadderCsv(fixture, 'sample.csv')

    expect(preview.inventory).toHaveLength(2)
    expect(preview.purchases).toHaveLength(2)
    expect(preview.inventory[0]).toMatchObject({
      item_id: 'CL-CERT001',
      game: 'One Piece',
      product_type: 'Slab',
      grading_company: 'PSA',
      grade: '10',
      qty_acquired: 1,
      base_unit_cost: 500,
      manual_market_value: 650,
    })
    expect(preview.inventory[1]).toMatchObject({
      game: 'Pokemon',
      product_type: 'Raw Single',
      qty_acquired: 2,
      base_unit_cost: 20,
      manual_market_value: 45,
    })
  })

  it('calculates import acceptance totals', () => {
    const preview = parseCardLadderCsv(fixture, 'sample.csv')

    expect(preview.totals.cost).toBe(540)
    expect(preview.totals.marketValue).toBe(740)
    expect(preview.totals.unrealizedProfit).toBe(200)
    expect(preview.totals.units).toBe(3)
  })

  it('flags duplicate cert numbers', () => {
    const duplicate = `${fixture}
2026-05-03,1,Sample Duplicate,Dragon,2025,One Piece Sample Set,Alt Art,OP01-002,One Piece,PSA 10,100,120,20,CERT001,13,Duplicate`

    const preview = parseCardLadderCsv(duplicate, 'duplicate.csv')
    expect(preview.warnings).toContain('Duplicate cert in import preview: CERT001')
  })
})
