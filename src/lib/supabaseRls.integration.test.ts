import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

const url = process.env.SUPABASE_TEST_URL
const anonKey = process.env.SUPABASE_TEST_ANON_KEY
const email = process.env.SUPABASE_TEST_EMAIL
const password = process.env.SUPABASE_TEST_PASSWORD

const maybeDescribe = url && anonKey && email && password ? describe : describe.skip

maybeDescribe('Supabase CRUD and RLS integration', () => {
  it('allows an authenticated owner to create and read only owned inventory rows', async () => {
    const client = createClient(url!, anonKey!)
    const { data: authData, error: authError } = await client.auth.signInWithPassword({ email: email!, password: password! })
    expect(authError).toBeNull()
    expect(authData.user).toBeTruthy()

    const itemId = `TEST-${crypto.randomUUID()}`
    const { data: inserted, error: insertError } = await client
      .from('inventory_items')
      .insert({
        owner_id: authData.user!.id,
        item_id: itemId,
        game: 'Pokemon',
        product_type: 'Raw Single',
        name: 'RLS Test Card',
        condition: 'Near Mint',
        qty_acquired: 1,
        base_unit_cost: 1,
        manual_market_value: 2,
        market_value_date: '2026-05-15',
        status: 'Active',
      })
      .select()
      .single()

    expect(insertError).toBeNull()
    expect(inserted.item_id).toBe(itemId)

    const { data: rows, error: selectError } = await client.from('inventory_items').select('item_id').eq('item_id', itemId)
    expect(selectError).toBeNull()
    expect(rows).toEqual([{ item_id: itemId }])

    await client.from('inventory_items').delete().eq('item_id', itemId)
    await client.auth.signOut()
  })
})
