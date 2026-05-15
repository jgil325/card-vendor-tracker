export type Game = 'Pokemon' | 'One Piece' | 'Other'

export type ProductType = 'Raw Single' | 'Slab' | 'Sealed' | 'Bulk' | 'Accessory'

export type InventoryStatus = 'Active' | 'Sold Out' | 'Grading' | 'Staged'

export type SaleStatus = 'Draft' | 'Paid' | 'Shipped' | 'Delivered' | 'Returned' | 'Cancelled'

export type GradingStatus = 'Preparing' | 'Submitted' | 'Grading' | 'Returned' | 'Complete'

export type ExpenseCategory =
  | 'Supplies'
  | 'Booth Fees'
  | 'Mileage'
  | 'Software'
  | 'Storage'
  | 'Insurance'
  | 'Memberships'
  | 'Other'

export type InventoryItem = {
  id: string
  owner_id?: string
  item_id: string
  lot_id?: string
  game: Game
  product_type: ProductType
  name: string
  subject?: string
  year?: string
  set_name?: string
  variation?: string
  card_number?: string
  condition: string
  grading_company?: string
  grade?: string
  cert_number?: string
  population?: number
  qty_acquired: number
  base_unit_cost: number
  manual_market_value: number
  market_value_date: string
  status: InventoryStatus
  notes?: string
  created_at?: string
  updated_at?: string
}

export type PurchaseLot = {
  id: string
  owner_id?: string
  lot_id: string
  purchase_date: string
  seller: string
  source: string
  total_paid: number
  tax: number
  shipping: number
  allocated_cost: number
  payment_method: string
  notes?: string
  created_at?: string
}

export type SaleRecord = {
  id: string
  owner_id?: string
  sale_date: string
  channel: string
  item_id: string
  quantity: number
  gross_sale: number
  shipping_charged: number
  fee_rate: number
  fee_flat: number
  fees_override?: number | null
  shipping_cost: number
  supplies_cost: number
  status: SaleStatus
  notes?: string
  created_at?: string
}

export type GradingSubmission = {
  id: string
  owner_id?: string
  submission_id: string
  item_id: string
  company: string
  submission_date: string
  returned_date?: string
  grading_fee: number
  shipping_fee: number
  grade_result?: string
  cert_number?: string
  status: GradingStatus
  notes?: string
  created_at?: string
}

export type Expense = {
  id: string
  owner_id?: string
  expense_date: string
  category: ExpenseCategory
  vendor: string
  amount: number
  payment_method: string
  notes?: string
  created_at?: string
}

export type FeePreset = {
  id: string
  owner_id?: string
  channel: string
  fee_rate: number
  fee_flat: number
  notes?: string
}

export type ImportBatch = {
  id: string
  owner_id?: string
  source: string
  file_name: string
  row_count: number
  imported_at: string
  notes?: string
}

export type CardData = {
  inventory: InventoryItem[]
  purchases: PurchaseLot[]
  sales: SaleRecord[]
  grading: GradingSubmission[]
  expenses: Expense[]
  feePresets: FeePreset[]
  importBatches: ImportBatch[]
}

export type NewInventoryInput = Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
export type NewPurchaseInput = Omit<PurchaseLot, 'id' | 'created_at'>
export type NewSaleInput = Omit<SaleRecord, 'id' | 'created_at'>
export type NewExpenseInput = Omit<Expense, 'id' | 'created_at'>
export type NewFeePresetInput = Omit<FeePreset, 'id'>

export type CsvImportPreview = {
  inventory: InventoryItem[]
  purchases: PurchaseLot[]
  warnings: string[]
  totals: {
    cost: number
    marketValue: number
    unrealizedProfit: number
    units: number
  }
}
