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
const supabaseUrl = process.env.VITE_SUPABASE_URL || appEnv.VITE_SUPABASE_URL || privateEnv.SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || appEnv.VITE_SUPABASE_PUBLISHABLE_KEY
const ownerEmail = process.env.SUPABASE_OWNER_EMAIL || privateEnv.SUPABASE_OWNER_EMAIL
const ownerPassword = process.env.SUPABASE_OWNER_PASSWORD || privateEnv.SUPABASE_OWNER_PASSWORD

for (const [name, value] of Object.entries({ supabaseUrl, publishableKey, ownerEmail, ownerPassword })) {
  if (!value) {
    console.error(`Missing required verification value: ${name}`)
    process.exit(1)
  }
}

const expected = {
  cost: 7000,
  marketValue: 8219.66,
  unrealizedProfit: 1219.66,
  units: 4,
}

const client = createClient(supabaseUrl, publishableKey)
const { error: authError } = await client.auth.signInWithPassword({
  email: ownerEmail,
  password: ownerPassword,
})
if (authError) throw authError

const { data: rows, error: rowsError } = await client
  .from('inventory_rollup')
  .select('qty_on_hand,inventory_cost_on_hand,market_value_on_hand,unrealized_pl')
if (rowsError) throw rowsError

const totals = rows.reduce(
  (sum, row) => {
    sum.cost += Number(row.inventory_cost_on_hand)
    sum.marketValue += Number(row.market_value_on_hand)
    sum.unrealizedProfit += Number(row.unrealized_pl)
    sum.units += Number(row.qty_on_hand)
    return sum
  },
  { cost: 0, marketValue: 0, unrealizedProfit: 0, units: 0 },
)

for (const [key, expectedValue] of Object.entries(expected)) {
  if (Math.abs(totals[key] - expectedValue) > 0.01) {
    throw new Error(`Supabase ${key} mismatch. Expected ${expectedValue}, received ${totals[key]}`)
  }
}

const { data: hiddenRows, error: signedOutError } = await client.auth.signOut().then(async () => {
  return client.from('inventory_items').select('id')
})
if (signedOutError) throw signedOutError
if ((hiddenRows?.length ?? 0) !== 0) {
  throw new Error('RLS verification failed: signed-out client can read inventory rows.')
}

console.log(
  JSON.stringify(
    {
      inventoryRows: rows.length,
      totals: {
        cost: Number(totals.cost.toFixed(2)),
        marketValue: Number(totals.marketValue.toFixed(2)),
        unrealizedProfit: Number(totals.unrealizedProfit.toFixed(2)),
        units: totals.units,
      },
      rls: 'signed-out reads blocked',
    },
    null,
    2,
  ),
)
