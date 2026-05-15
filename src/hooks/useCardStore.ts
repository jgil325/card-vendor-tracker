import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseCardLadderCsv } from '../lib/cardLadder'
import { emptyData, sampleData } from '../lib/sampleData'
import { isSupabaseConfigured, supabase, type AuthSession } from '../lib/supabase'
import type {
  CardData,
  CsvImportPreview,
  FeePreset,
  ImportBatch,
  NewExpenseInput,
  NewInventoryInput,
  NewPurchaseInput,
  NewSaleInput,
} from '../lib/types'

const storageKey = 'card-vendor-tracker-demo-data'

type StoreMode = 'demo' | 'supabase'

type DatabaseTable =
  | 'inventory_items'
  | 'purchase_lots'
  | 'sales'
  | 'grading_submissions'
  | 'expenses'
  | 'fee_presets'
  | 'import_batches'

const tableMap = {
  inventory: 'inventory_items',
  purchases: 'purchase_lots',
  sales: 'sales',
  grading: 'grading_submissions',
  expenses: 'expenses',
  feePresets: 'fee_presets',
  importBatches: 'import_batches',
} as const satisfies Record<keyof CardData, DatabaseTable>

function localInitialData(): CardData {
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return sampleData

  try {
    return JSON.parse(stored) as CardData
  } catch {
    return sampleData
  }
}

function withId<T extends object>(input: T): T & { id: string } {
  return { ...input, id: crypto.randomUUID() }
}

function rekey<T extends { id: string }>(input: T): T {
  return { ...input, id: crypto.randomUUID() }
}

function stripPreviewId<T extends { id: string }>(input: T) {
  const copy = { ...input } as Partial<T>
  delete copy.id
  return copy
}

export function useCardStore(session: AuthSession) {
  const mode: StoreMode = isSupabaseConfigured && session ? 'supabase' : 'demo'
  const [data, setData] = useState<CardData>(() => (isSupabaseConfigured ? emptyData : localInitialData()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const persistLocal = useCallback((updater: (current: CardData) => CardData) => {
    setData((current) => {
      const next = updater(current)
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !session || !supabase) {
      setData(localInitialData())
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [inventory, purchases, sales, grading, expenses, feePresets, importBatches] = await Promise.all([
        supabase.from(tableMap.inventory).select('*').order('created_at', { ascending: false }),
        supabase.from(tableMap.purchases).select('*').order('purchase_date', { ascending: false }),
        supabase.from(tableMap.sales).select('*').order('sale_date', { ascending: false }),
        supabase.from(tableMap.grading).select('*').order('submission_date', { ascending: false }),
        supabase.from(tableMap.expenses).select('*').order('expense_date', { ascending: false }),
        supabase.from(tableMap.feePresets).select('*').order('channel', { ascending: true }),
        supabase.from(tableMap.importBatches).select('*').order('imported_at', { ascending: false }),
      ])

      const failure = [inventory, purchases, sales, grading, expenses, feePresets, importBatches].find(
        (response) => response.error,
      )
      if (failure?.error) throw failure.error

      setData({
        inventory: inventory.data ?? [],
        purchases: purchases.data ?? [],
        sales: sales.data ?? [],
        grading: grading.data ?? [],
        expenses: expenses.data ?? [],
        feePresets: feePresets.data ?? [],
        importBatches: importBatches.data ?? [],
      } as CardData)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load Supabase data.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void refresh()
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  const insertRows = useCallback(
    async <T extends object>(table: DatabaseTable, rows: T[]) => {
      if (mode === 'demo' || !supabase || !session) {
        return rows.map((row) => withId(row))
      }

      const rowsWithOwner = rows.map((row) => ({ ...row, owner_id: session.user.id }))
      const { data: inserted, error: insertError } = await supabase.from(table).insert(rowsWithOwner).select()
      if (insertError) throw insertError
      return inserted ?? []
    },
    [mode, session],
  )

  const addInventory = useCallback(
    async (input: NewInventoryInput) => {
      const [inserted] = await insertRows(tableMap.inventory, [input])
      if (mode === 'demo') {
        persistLocal((current) => ({ ...current, inventory: [inserted as CardData['inventory'][number], ...current.inventory] }))
      } else {
        await refresh()
      }
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const addPurchase = useCallback(
    async (input: NewPurchaseInput) => {
      const [inserted] = await insertRows(tableMap.purchases, [input])
      if (mode === 'demo') {
        persistLocal((current) => ({ ...current, purchases: [inserted as CardData['purchases'][number], ...current.purchases] }))
      } else {
        await refresh()
      }
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const addSale = useCallback(
    async (input: NewSaleInput) => {
      const [inserted] = await insertRows(tableMap.sales, [input])
      if (mode === 'demo') {
        persistLocal((current) => ({ ...current, sales: [inserted as CardData['sales'][number], ...current.sales] }))
      } else {
        await refresh()
      }
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const addExpense = useCallback(
    async (input: NewExpenseInput) => {
      const [inserted] = await insertRows(tableMap.expenses, [input])
      if (mode === 'demo') {
        persistLocal((current) => ({ ...current, expenses: [inserted as CardData['expenses'][number], ...current.expenses] }))
      } else {
        await refresh()
      }
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const saveFeePreset = useCallback(
    async (preset: Omit<FeePreset, 'id'> & { id?: string }) => {
      if (mode === 'demo' || !supabase || !session) {
        const nextPreset = preset.id ? (preset as FeePreset) : withId(preset)
        persistLocal((current) => ({
          ...current,
          feePresets: [
            nextPreset as FeePreset,
            ...current.feePresets.filter((entry) => entry.id !== nextPreset.id && entry.channel !== nextPreset.channel),
          ],
        }))
        return
      }

      const payload = { ...preset, owner_id: session.user.id }
      const { error: upsertError } = await supabase.from(tableMap.feePresets).upsert(payload, { onConflict: 'owner_id,channel' })
      if (upsertError) throw upsertError
      await refresh()
    },
    [mode, persistLocal, refresh, session],
  )

  const importCardLadder = useCallback(
    async (preview: CsvImportPreview, fileName: string) => {
      const batch: Omit<ImportBatch, 'id'> = {
        source: 'Card Ladder',
        file_name: fileName,
        row_count: preview.inventory.length,
        imported_at: new Date().toISOString(),
        notes: `Imported ${preview.inventory.length} rows from Card Ladder CSV.`,
      }

      if (mode === 'demo') {
        const inventoryRows = preview.inventory.map(rekey)
        const purchaseRows = preview.purchases.map(rekey)
        persistLocal((current) => ({
          ...current,
          inventory: [...inventoryRows, ...current.inventory],
          purchases: [...purchaseRows, ...current.purchases],
          importBatches: [withId(batch), ...current.importBatches],
        }))
        return
      }

      await insertRows(tableMap.inventory, preview.inventory.map(stripPreviewId))
      await insertRows(tableMap.purchases, preview.purchases.map(stripPreviewId))
      await insertRows(tableMap.importBatches, [batch])
      await refresh()
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const resetDemoData = useCallback(() => {
    window.localStorage.removeItem(storageKey)
    setData(sampleData)
  }, [])

  const parseCsvText = useMemo(() => parseCardLadderCsv, [])

  return {
    data,
    mode,
    loading,
    error,
    refresh,
    addInventory,
    addPurchase,
    addSale,
    addExpense,
    saveFeePreset,
    importCardLadder,
    resetDemoData,
    parseCsvText,
  }
}
