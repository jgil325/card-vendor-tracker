import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseCardLadderCsv } from '../lib/cardLadder'
import { emptyData, sampleData } from '../lib/sampleData'
import {
  isSupabaseConfigured,
  supabase,
  type AuthSession,
} from '../lib/supabase'
import type {
  CardData,
  CsvImportPreview,
  FeePreset,
  ImportBatch,
  NewExpenseInput,
  NewInventoryInput,
  NewPurchaseInput,
  NewSaleInput,
  GradingSubmission,
  SaleStatus,
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
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return sampleData
    const parsed = JSON.parse(stored)
    const data = parsed.version === 2 ? parsed.data : parsed
    if (!Object.keys(emptyData).every((key) => Array.isArray(data?.[key])))
      return sampleData
    return data as CardData
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
  const [data, setData] = useState<CardData>(() =>
    session ? emptyData : localInitialData(),
  )
  const dataRef = useRef(data)
  const [loading, setLoading] = useState(Boolean(session))
  const [error, setError] = useState<string | null>(null)

  const setSnapshot = useCallback((next: CardData) => {
    dataRef.current = next
    setData(next)
  }, [])

  const persistLocal = useCallback(
    (updater: (current: CardData) => CardData) => {
      const next = updater(dataRef.current)
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ version: 2, data: next }),
      )
      setSnapshot(next)
    },
    [setSnapshot],
  )

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !session || !supabase) {
      setSnapshot(localInitialData())
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [
        inventory,
        purchases,
        sales,
        grading,
        expenses,
        feePresets,
        importBatches,
      ] = await Promise.all([
        supabase
          .from(tableMap.inventory)
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from(tableMap.purchases)
          .select('*')
          .order('purchase_date', { ascending: false }),
        supabase
          .from(tableMap.sales)
          .select('*')
          .order('sale_date', { ascending: false }),
        supabase
          .from(tableMap.grading)
          .select('*')
          .order('submission_date', { ascending: false }),
        supabase
          .from(tableMap.expenses)
          .select('*')
          .order('expense_date', { ascending: false }),
        supabase
          .from(tableMap.feePresets)
          .select('*')
          .order('channel', { ascending: true }),
        supabase
          .from(tableMap.importBatches)
          .select('*')
          .order('imported_at', { ascending: false }),
      ])

      const failure = [
        inventory,
        purchases,
        sales,
        grading,
        expenses,
        feePresets,
        importBatches,
      ].find((response) => response.error)
      if (failure?.error) throw failure.error

      setSnapshot({
        inventory: inventory.data ?? [],
        purchases: purchases.data ?? [],
        sales: sales.data ?? [],
        grading: grading.data ?? [],
        expenses: expenses.data ?? [],
        feePresets: feePresets.data ?? [],
        importBatches: importBatches.data ?? [],
      } as CardData)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load Supabase data.',
      )
    } finally {
      setLoading(false)
    }
  }, [session, setSnapshot])

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

      const rowsWithOwner = rows.map((row) => ({
        ...row,
        owner_id: session.user.id,
      }))
      const { data: inserted, error: insertError } = await supabase
        .from(table)
        .insert(rowsWithOwner)
        .select()
      if (insertError) throw insertError
      return inserted ?? []
    },
    [mode, session],
  )

  const addInventory = useCallback(
    async (input: NewInventoryInput) => {
      if (
        dataRef.current.inventory.some(
          (item) =>
            item.item_id === input.item_id ||
            (input.cert_number && item.cert_number === input.cert_number),
        )
      ) {
        throw new Error(
          'An item with this ID or certificate already exists. Use a unique ID or edit the existing card.',
        )
      }
      const [inserted] = await insertRows(tableMap.inventory, [input])
      if (mode === 'demo') {
        persistLocal((current) => ({
          ...current,
          inventory: [
            inserted as CardData['inventory'][number],
            ...current.inventory,
          ],
        }))
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
        persistLocal((current) => ({
          ...current,
          purchases: [
            inserted as CardData['purchases'][number],
            ...current.purchases,
          ],
        }))
      } else {
        await refresh()
      }
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const addSale = useCallback(
    async (input: NewSaleInput) => {
      const item = dataRef.current.inventory.find(
        (item) => item.item_id === input.item_id,
      )
      const sold = dataRef.current.sales
        .filter(
          (sale) =>
            sale.item_id === input.item_id &&
            !['Draft', 'Cancelled', 'Returned'].includes(sale.status),
        )
        .reduce((total, sale) => total + sale.quantity, 0)
      if (
        !item ||
        !Number.isInteger(input.quantity) ||
        input.quantity < 1 ||
        input.quantity > item.qty_acquired - sold
      ) {
        throw new Error('The sale quantity exceeds the available inventory.')
      }
      const [inserted] = await insertRows(tableMap.sales, [input])
      if (mode === 'demo') {
        persistLocal((current) => ({
          ...current,
          sales: [inserted as CardData['sales'][number], ...current.sales],
        }))
      } else {
        await refresh()
      }
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const addGrading = useCallback(
    async (input: Omit<GradingSubmission, 'id'>) => {
      const [inserted] = await insertRows(tableMap.grading, [input])
      if (mode === 'demo')
        persistLocal((current) => ({
          ...current,
          grading: [inserted as GradingSubmission, ...current.grading],
        }))
      else await refresh()
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const updateInventory = useCallback(
    async (
      id: string,
      updates: Pick<
        NewInventoryInput,
        'manual_market_value' | 'market_value_date' | 'notes'
      >,
    ) => {
      if (mode === 'demo')
        persistLocal((current) => ({
          ...current,
          inventory: current.inventory.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        }))
      else if (supabase && session) {
        const { error: updateError } = await supabase
          .from(tableMap.inventory)
          .update(updates)
          .eq('id', id)
          .eq('owner_id', session.user.id)
        if (updateError) throw updateError
        await refresh()
      }
    },
    [mode, persistLocal, refresh, session],
  )

  const updateGrading = useCallback(
    async (id: string, updates: Omit<GradingSubmission, 'id'>) => {
      if (mode === 'demo')
        persistLocal((current) => ({
          ...current,
          grading: current.grading.map((row) =>
            row.id === id ? { ...row, ...updates } : row,
          ),
        }))
      else if (supabase && session) {
        const { error: updateError } = await supabase
          .from(tableMap.grading)
          .update(updates)
          .eq('id', id)
          .eq('owner_id', session.user.id)
        if (updateError) throw updateError
        await refresh()
      }
    },
    [mode, persistLocal, refresh, session],
  )

  const updateSaleStatus = useCallback(
    async (id: string, status: SaleStatus) => {
      const sale = dataRef.current.sales.find((row) => row.id === id)
      if (!sale) throw new Error('This sale no longer exists.')
      if (!['Cancelled', 'Returned', 'Draft'].includes(status)) {
        const item = dataRef.current.inventory.find(
          (item) => item.item_id === sale.item_id,
        )
        const sold = dataRef.current.sales
          .filter(
            (row) =>
              row.id !== id &&
              row.item_id === sale.item_id &&
              !['Cancelled', 'Returned', 'Draft'].includes(row.status),
          )
          .reduce((total, row) => total + row.quantity, 0)
        if (!item || sale.quantity > item.qty_acquired - sold)
          throw new Error('There is not enough stock to reactivate this sale.')
      }
      if (mode === 'demo')
        persistLocal((current) => ({
          ...current,
          sales: current.sales.map((row) =>
            row.id === id ? { ...row, status } : row,
          ),
        }))
      else if (supabase && session) {
        const { error: updateError } = await supabase
          .from(tableMap.sales)
          .update({ status })
          .eq('id', id)
          .eq('owner_id', session.user.id)
        if (updateError) throw updateError
        await refresh()
      }
    },
    [mode, persistLocal, refresh, session],
  )

  const addExpense = useCallback(
    async (input: NewExpenseInput) => {
      const [inserted] = await insertRows(tableMap.expenses, [input])
      if (mode === 'demo') {
        persistLocal((current) => ({
          ...current,
          expenses: [
            inserted as CardData['expenses'][number],
            ...current.expenses,
          ],
        }))
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
            ...current.feePresets.filter(
              (entry) =>
                entry.id !== nextPreset.id &&
                entry.channel !== nextPreset.channel,
            ),
          ],
        }))
        return
      }

      const payload = { ...preset, owner_id: session.user.id }
      const { error: upsertError } = await supabase
        .from(tableMap.feePresets)
        .upsert(payload, { onConflict: 'owner_id,channel' })
      if (upsertError) throw upsertError
      await refresh()
    },
    [mode, persistLocal, refresh, session],
  )

  const importCardLadder = useCallback(
    async (preview: CsvImportPreview, fileName: string) => {
      if (!preview.inventory.length || preview.warnings.length)
        throw new Error('Resolve the CSV warnings before importing.')
      const existing = dataRef.current.inventory
      if (
        preview.inventory.some((row) =>
          existing.some(
            (item) =>
              item.item_id === row.item_id ||
              (row.cert_number && row.cert_number === item.cert_number),
          ),
        )
      ) {
        throw new Error(
          'This file contains cards that are already in your inventory. Remove duplicate rows before importing.',
        )
      }
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

      await insertRows(
        tableMap.inventory,
        preview.inventory.map(stripPreviewId),
      )
      await insertRows(
        tableMap.purchases,
        preview.purchases.map(stripPreviewId),
      )
      await insertRows(tableMap.importBatches, [batch])
      await refresh()
    },
    [insertRows, mode, persistLocal, refresh],
  )

  const resetDemoData = useCallback(() => {
    window.localStorage.removeItem(storageKey)
    setSnapshot(sampleData)
  }, [setSnapshot])

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
    addGrading,
    updateInventory,
    updateGrading,
    updateSaleStatus,
    addExpense,
    saveFeePreset,
    importCardLadder,
    resetDemoData,
    parseCsvText,
  }
}
