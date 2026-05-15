import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import Papa from 'papaparse'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: npm run seed:from-csv -- "/path/to/Collection - Card Ladder.csv"')
  process.exit(1)
}

const csvText = fs.readFileSync(inputPath, 'utf8')
const parsed = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim(),
})

if (parsed.errors.length) {
  for (const error of parsed.errors) {
    console.error(`CSV parse warning on row ${error.row ?? '?'}: ${error.message}`)
  }
}

function clean(value) {
  return String(value ?? '').trim()
}

function money(value) {
  const parsedNumber = Number.parseFloat(clean(value).replace(/[$,]/g, ''))
  return Number.isFinite(parsedNumber) ? parsedNumber : 0
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function splitGrade(condition) {
  return {
    company: condition.match(/\b(PSA|BGS|CGC|SGC)\b/i)?.[1]?.toUpperCase() ?? '',
    grade: condition.match(/\b(10|9\.5|9|8\.5|8|7\.5|7)\b/)?.[1] ?? '',
  }
}

const generatedAt = new Date().toISOString()
const marketDate = generatedAt.slice(0, 10)
const inventory = []
const purchases = []

parsed.data.forEach((row, index) => {
  const quantity = Number.parseInt(clean(row.Quantity), 10) || 1
  const investment = money(row.Investment)
  const currentValue = money(row['Current Value'])
  const cert = clean(row['Graded Cert #'])
  const datePurchased = clean(row['Date Purchased']) || marketDate
  const card = clean(row.Card)
  const setName = clean(row.Set)
  const condition = clean(row.Condition)
  const { company, grade } = splitGrade(condition)
  const itemId = cert ? `CL-${cert}` : `CL-${slug(`${card}-${setName}-${clean(row.Number)}`)}-${index + 1}`
  const lotId = `CL-${datePurchased.replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`

  inventory.push({
    item_id: itemId,
    lot_id: lotId,
    game: clean(row.Category).toLowerCase().includes('one piece') ? 'One Piece' : 'Pokemon',
    product_type: condition.match(/\b(PSA|BGS|CGC|SGC)\b/i) ? 'Slab' : 'Raw Single',
    name: card,
    subject: clean(row.Subject),
    year: clean(row.Year),
    set_name: setName,
    variation: clean(row.Variation),
    card_number: clean(row.Number),
    condition,
    grading_company: company,
    grade,
    cert_number: cert,
    population: Number.parseInt(clean(row.Population), 10) || null,
    qty_acquired: quantity,
    base_unit_cost: quantity === 0 ? 0 : investment / quantity,
    manual_market_value: quantity === 0 ? 0 : currentValue / quantity,
    market_value_date: marketDate,
    status: 'Active',
    notes: clean(row.Notes),
  })

  purchases.push({
    lot_id: lotId,
    purchase_date: datePurchased,
    seller: 'Card Ladder Import',
    source: path.basename(inputPath),
    total_paid: investment,
    tax: 0,
    shipping: 0,
    allocated_cost: investment,
    payment_method: 'Imported',
    notes: cert ? `Imported from Card Ladder cert ${cert}` : 'Imported from Card Ladder',
  })
})

const totals = inventory.reduce(
  (sum, item) => {
    sum.cost += item.qty_acquired * item.base_unit_cost
    sum.marketValue += item.qty_acquired * item.manual_market_value
    sum.units += item.qty_acquired
    return sum
  },
  { cost: 0, marketValue: 0, unrealizedProfit: 0, units: 0 },
)
totals.unrealizedProfit = totals.marketValue - totals.cost

const seed = {
  source: 'Card Ladder',
  sourceFile: inputPath,
  generatedAt,
  acceptanceTotals: {
    cost: Number(totals.cost.toFixed(2)),
    marketValue: Number(totals.marketValue.toFixed(2)),
    unrealizedProfit: Number(totals.unrealizedProfit.toFixed(2)),
    units: totals.units,
  },
  inventory,
  purchases,
}

const outputDir = path.join(process.cwd(), 'data', 'private')
fs.mkdirSync(outputDir, { recursive: true })
const outputPath = path.join(outputDir, 'card-ladder-seed.json')
fs.writeFileSync(outputPath, `${JSON.stringify(seed, null, 2)}\n`)
console.log(`Wrote ignored local seed: ${outputPath}`)
console.log(JSON.stringify(seed.acceptanceTotals, null, 2))
