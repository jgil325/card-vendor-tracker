import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const seedPath = path.join(process.cwd(), 'data', 'private', 'card-ladder-seed.json')
const expected = {
  cost: 7000,
  marketValue: 8219.66,
  unrealizedProfit: 1219.66,
  units: 4,
}

if (!fs.existsSync(seedPath)) {
  console.error(`Missing ignored private seed at ${seedPath}`)
  process.exit(1)
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
const totals =
  seed.acceptanceTotals ??
  seed.inventory.reduce(
    (sum, item) => {
      sum.cost += item.qty_acquired * item.base_unit_cost
      sum.marketValue += item.qty_acquired * item.manual_market_value
      sum.units += item.qty_acquired
      return sum
    },
    { cost: 0, marketValue: 0, unrealizedProfit: 0, units: 0 },
  )
totals.unrealizedProfit = totals.unrealizedProfit || totals.marketValue - totals.cost

function assertClose(key) {
  const actual = Number(totals[key])
  const target = expected[key]
  if (Math.abs(actual - target) > 0.01) {
    console.error(`Seed ${key} mismatch. Expected ${target}, received ${actual}`)
    process.exit(1)
  }
}

assertClose('cost')
assertClose('marketValue')
assertClose('unrealizedProfit')
assertClose('units')

console.log('Private Card Ladder seed totals verified.')
