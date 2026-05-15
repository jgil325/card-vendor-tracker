import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      }),
  )
}

const privateEnv = readEnvFile(path.join(process.cwd(), 'data', 'private', 'supabase-admin.env'))
const appEnv = readEnvFile(path.join(process.cwd(), '.env.local'))
const supabaseUrl = process.env.SUPABASE_URL || appEnv.VITE_SUPABASE_URL || privateEnv.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || privateEnv.SUPABASE_SERVICE_ROLE_KEY
const ownerEmail = process.env.SUPABASE_OWNER_EMAIL || privateEnv.SUPABASE_OWNER_EMAIL
const ownerPassword = process.env.SUPABASE_OWNER_PASSWORD || privateEnv.SUPABASE_OWNER_PASSWORD
const seedPath = path.join(process.cwd(), 'data', 'private', 'card-ladder-seed.json')

for (const [name, value] of Object.entries({ supabaseUrl, serviceRoleKey, ownerEmail, ownerPassword })) {
  if (!value) {
    console.error(`Missing required setup value: ${name}`)
    process.exit(1)
  }
}

if (!fs.existsSync(seedPath)) {
  console.error(`Missing private seed file: ${seedPath}`)
  process.exit(1)
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function getOrCreateOwner() {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: {
      app: 'card-vendor-tracker',
      role: 'single-owner',
    },
  })

  if (!createError && created.user) return created.user

  const alreadyExists = /already registered|already been registered|already exists/i.test(createError?.message ?? '')
  if (!alreadyExists) throw createError

  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw listError

  const existing = users.users.find((user) => user.email?.toLowerCase() === ownerEmail.toLowerCase())
  if (!existing) throw createError

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: ownerPassword,
    email_confirm: true,
    user_metadata: {
      app: 'card-vendor-tracker',
      role: 'single-owner',
    },
  })
  if (updateError) throw updateError

  return updated.user
}

function withOwner(rows, ownerId) {
  return rows.map((row) => ({
    ...row,
    owner_id: ownerId,
  }))
}

function chunk(rows, size = 100) {
  const chunks = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks
}

async function upsertRows(table, rows, onConflict) {
  for (const rowsChunk of chunk(rows)) {
    const { error } = await admin.from(table).upsert(rowsChunk, { onConflict })
    if (error) throw error
  }
}

const owner = await getOrCreateOwner()
const inventory = withOwner(seed.inventory, owner.id)
const purchases = withOwner(seed.purchases, owner.id)

await admin.from('profiles').upsert({
  id: owner.id,
  email: owner.email,
  full_name: 'Card Vendor Owner',
})

await upsertRows('fee_presets', withOwner([
  { channel: 'eBay', fee_rate: 0.1325, fee_flat: 0.4, notes: 'Default trading card estimate.' },
  { channel: 'Whatnot', fee_rate: 0.11, fee_flat: 0.3, notes: 'Marketplace and payment estimate.' },
  { channel: 'Card Show', fee_rate: 0, fee_flat: 0, notes: 'Cash sale preset.' },
], owner.id), 'owner_id,channel')

await upsertRows('inventory_items', inventory, 'owner_id,item_id')
await upsertRows('purchase_lots', purchases, 'owner_id,lot_id')
await admin.from('import_batches').insert({
  owner_id: owner.id,
  source: seed.source ?? 'Card Ladder',
  file_name: path.basename(seed.sourceFile ?? 'card-ladder-seed.json'),
  row_count: inventory.length,
  imported_at: new Date().toISOString(),
  notes: `Seeded ${inventory.length} private Card Ladder rows.`,
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

console.log(
  JSON.stringify(
    {
      ownerEmail,
      ownerId: owner.id,
      seeded: {
        inventory: inventory.length,
        purchases: purchases.length,
      },
      totals: {
        cost: Number(totals.cost.toFixed(2)),
        marketValue: Number(totals.marketValue.toFixed(2)),
        unrealizedProfit: Number(totals.unrealizedProfit.toFixed(2)),
        units: totals.units,
      },
    },
    null,
    2,
  ),
)
