import Papa from 'papaparse'
import type { CsvImportPreview, InventoryItem, PurchaseLot } from './types'

type CardLadderRow = {
  'Date Purchased': string
  Quantity: string
  Card: string
  Subject: string
  Year: string
  Set: string
  Variation: string
  Number: string
  Category: string
  Condition: string
  Investment: string
  'Current Value': string
  'Potential Profit': string
  'Graded Cert #': string
  Population: string
  Notes: string
}

const requiredHeaders = [
  'Date Purchased',
  'Quantity',
  'Card',
  'Subject',
  'Year',
  'Set',
  'Number',
  'Condition',
  'Investment',
  'Current Value',
]

export function parseMoney(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const cleaned = value.replace(/[$,]/g, '').trim()
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function clean(value: string | undefined): string {
  return value?.trim() ?? ''
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function inferGame(setName: string, category: string): 'Pokemon' | 'One Piece' | 'Other' {
  const text = `${setName} ${category}`.toLowerCase()
  if (text.includes('one piece')) return 'One Piece'
  if (text.includes('pokemon')) return 'Pokemon'
  return 'Pokemon'
}

function inferProductType(condition: string): 'Raw Single' | 'Slab' | 'Sealed' | 'Bulk' | 'Accessory' {
  const normalized = condition.toLowerCase()
  if (normalized.includes('psa') || normalized.includes('bgs') || normalized.includes('cgc')) return 'Slab'
  return 'Raw Single'
}

function splitGrade(condition: string) {
  const company = condition.match(/\b(PSA|BGS|CGC|SGC)\b/i)?.[1]?.toUpperCase()
  const grade = condition.match(/\b(10|9\.5|9|8\.5|8|7\.5|7)\b/)?.[1]
  return { company, grade }
}

export function parseCardLadderCsv(csvText: string, fileName = 'card-ladder.csv'): CsvImportPreview {
  const result = Papa.parse<CardLadderRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  const fields = result.meta.fields ?? []
  const missingHeaders = requiredHeaders.filter((header) => !fields.includes(header))
  const warnings = result.errors.map((error) => `Row ${error.row ?? '?'}: ${error.message}`)

  for (const header of missingHeaders) {
    warnings.push(`Missing expected Card Ladder column: ${header}`)
  }

  const inventory: InventoryItem[] = []
  const purchases: PurchaseLot[] = []
  const certs = new Set<string>()

  result.data.forEach((row, index) => {
    const quantity = Number.parseInt(clean(row.Quantity), 10) || 1
    const investment = parseMoney(row.Investment)
    const marketValue = parseMoney(row['Current Value'])
    const cert = clean(row['Graded Cert #'])
    const datePurchased = clean(row['Date Purchased']) || new Date().toISOString().slice(0, 10)
    const card = clean(row.Card)
    const setName = clean(row.Set)
    const number = clean(row.Number)
    const condition = clean(row.Condition)
    const { company, grade } = splitGrade(condition)
    const itemId = cert ? `CL-${cert}` : `CL-${slug(`${card}-${setName}-${number}`)}-${index + 1}`
    const lotId = `CL-${datePurchased.replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`

    if (cert && certs.has(cert)) {
      warnings.push(`Duplicate cert in import preview: ${cert}`)
    }
    if (cert) certs.add(cert)

    inventory.push({
      id: `preview-inventory-${index + 1}`,
      item_id: itemId,
      lot_id: lotId,
      game: inferGame(setName, clean(row.Category)),
      product_type: inferProductType(condition),
      name: card,
      subject: clean(row.Subject),
      year: clean(row.Year),
      set_name: setName,
      variation: clean(row.Variation),
      card_number: number,
      condition,
      grading_company: company,
      grade,
      cert_number: cert,
      population: Number.parseInt(clean(row.Population), 10) || undefined,
      qty_acquired: quantity,
      base_unit_cost: quantity === 0 ? 0 : investment / quantity,
      manual_market_value: quantity === 0 ? 0 : marketValue / quantity,
      market_value_date: new Date().toISOString().slice(0, 10),
      status: 'Active',
      notes: clean(row.Notes),
    })

    purchases.push({
      id: `preview-purchase-${index + 1}`,
      lot_id: lotId,
      purchase_date: datePurchased,
      seller: 'Card Ladder Import',
      source: fileName,
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

  return { inventory, purchases, warnings, totals }
}
