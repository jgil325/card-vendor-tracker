import {
  Boxes,
  CreditCard,
  FileDown,
  Inbox,
  DollarSign,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { type FormEvent, type InputHTMLAttributes, useState } from 'react'
import {
  currency,
  percent,
  quantityOnHand,
  saleCogs,
  saleFees,
  saleMargin,
  saleNetProceeds,
  saleProfit,
  saleRoi,
} from '../lib/calculations'
import type {
  CardData,
  CsvImportPreview,
  ExpenseCategory,
  FeePreset,
  Game,
  NewExpenseInput,
  NewInventoryInput,
  NewPurchaseInput,
  NewSaleInput,
  ProductType,
  SaleStatus,
} from '../lib/types'
import {
  cx,
  panelClass,
  tablePanelClass,
  tableClass,
  tableRowClass,
  labelClass,
  fieldClass,
  primaryButtonClass,
  today,
  readText,
  readNumber,
} from './ui'
type IconComponent = typeof Boxes
const games: Game[] = ['Pokemon', 'One Piece', 'Other']
const productTypes: ProductType[] = [
  'Raw Single',
  'Slab',
  'Sealed',
  'Bulk',
  'Accessory',
]
const expenseCategories: ExpenseCategory[] = [
  'Supplies',
  'Booth Fees',
  'Mileage',
  'Software',
  'Storage',
  'Insurance',
  'Memberships',
  'Other',
]

export function Kpi({
  label,
  value,
  tone = 'neutral',
  index = 0,
}: {
  label: string
  value: string
  tone?: 'neutral' | 'green' | 'gold' | 'red'
  index?: number
}) {
  const toneGradient =
    tone === 'green'
      ? 'bg-gradient-to-br from-white to-brand-soft/40'
      : tone === 'gold'
        ? 'bg-gradient-to-br from-white to-gold-soft/50'
        : tone === 'red'
          ? 'bg-gradient-to-br from-white to-danger-soft/50'
          : 'bg-white'
  const TrendIcon =
    tone === 'green' ? TrendingUp : tone === 'red' ? TrendingDown : null
  return (
    <div
      className={cx(
        'min-h-[86px] rounded-xl border border-line-soft p-3.5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop animate-slide-up',
        toneGradient,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="mb-2.5 block text-[0.7rem] font-extrabold uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <strong
          className={cx(
            'block break-words font-display text-xl leading-none tabular',
            tone === 'green' && 'text-brand',
            tone === 'gold' && 'text-gold-2',
            tone === 'red' && 'text-danger',
          )}
        >
          {value}
        </strong>
        {TrendIcon && (
          <TrendIcon
            className={cx(
              'h-3.5 w-3.5 shrink-0',
              tone === 'green' && 'text-brand',
              tone === 'red' && 'text-danger',
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}

export function PanelHeader({
  icon: Icon,
  title,
}: {
  icon: IconComponent
  title: string
}) {
  return (
    <div className="mb-3.5 flex items-center gap-2">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-gold-soft ring-1 ring-gold/30">
        <Icon className="h-[14px] w-[14px] text-gold-2" aria-hidden="true" />
      </div>
      <h2 className="m-0 font-display text-base font-bold tracking-tight">
        {title}
      </h2>
    </div>
  )
}

function TableHeader({ icon, title }: { icon: IconComponent; title: string }) {
  return (
    <div className="border-b border-line-soft bg-canvas-2 px-4 py-3">
      <PanelHeader icon={icon} title={title} />
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: IconComponent
  title: string
  hint?: string
}) {
  return (
    <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-line bg-canvas-2 px-4 py-10 text-center animate-fade-in">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-line-soft">
        <Icon className="h-5 w-5 text-muted" aria-hidden="true" />
      </div>
      <strong className="text-sm text-ink">{title}</strong>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
}

function rowDelay(i: number) {
  return { animationDelay: `${Math.min(i, 12) * 25}ms` }
}

export function PurchasesSection({
  data,
  search,
}: {
  data: CardData
  search: string
}) {
  const rows = data.purchases.filter((purchase) =>
    matchesSearch(purchase, search),
  )

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={ShoppingBag} title="Purchase Lots" />
      <div
        className="overflow-x-auto scrollbar-soft"
        tabIndex={0}
        role="region"
        aria-label="Scrollable records"
      >
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Lot ID</th>
              <th>Seller</th>
              <th>Source</th>
              <th>Total Paid</th>
              <th>Tax</th>
              <th>Shipping</th>
              <th>Allocated</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={ShoppingBag}
                    title="No purchases yet"
                    hint="Log a purchase lot to track your spend."
                  />
                </td>
              </tr>
            )}
            {rows.map((purchase, i) => (
              <tr
                key={purchase.id}
                className={cx(tableRowClass, 'animate-fade-in')}
                style={rowDelay(i)}
              >
                <td>{purchase.purchase_date}</td>
                <td className="font-mono text-xs">{purchase.lot_id}</td>
                <td>{purchase.seller}</td>
                <td>{purchase.source}</td>
                <td>{currency(purchase.total_paid)}</td>
                <td>{currency(purchase.tax)}</td>
                <td>{currency(purchase.shipping)}</td>
                <td>{currency(purchase.allocated_cost)}</td>
                <td>{purchase.payment_method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function SalesSection({
  data,
  search,
  onStatusChange,
}: {
  data: CardData
  search: string
  onStatusChange: (id: string, status: SaleStatus) => Promise<void>
}) {
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const rows = data.sales
    .filter((sale) =>
      matchesSearch(
        {
          ...sale,
          card: data.inventory.find((item) => item.item_id === sale.item_id)
            ?.name,
        },
        search,
      ),
    )
    .sort((a, b) => b.sale_date.localeCompare(a.sale_date))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={DollarSign} title="Sales ledger" />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="overflow-x-auto scrollbar-soft"
        tabIndex={0}
        role="region"
        aria-label="Scrollable records"
      >
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Channel</th>
              <th>Card</th>
              <th>Qty</th>
              <th>Gross</th>
              <th>Fees</th>
              <th>Net</th>
              <th>COGS</th>
              <th>Profit</th>
              <th>Margin</th>
              <th>ROI</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={12}>
                  <EmptyState
                    icon={DollarSign}
                    title="No sales yet"
                    hint="Add a sale to see profit and margin."
                  />
                </td>
              </tr>
            )}
            {rows.map((sale, i) => {
              const profit = saleProfit(sale, data.inventory, data.grading)
              return (
                <tr
                  key={sale.id}
                  className={cx(tableRowClass, 'animate-fade-in')}
                  style={rowDelay(i)}
                >
                  <td>{sale.sale_date}</td>
                  <td>{sale.channel}</td>
                  <td>
                    <strong>
                      {data.inventory.find(
                        (item) => item.item_id === sale.item_id,
                      )?.name || sale.item_id}
                    </strong>
                    <small className="table-subtext">{sale.item_id}</small>
                  </td>
                  <td>{sale.quantity}</td>
                  <td>{currency(sale.gross_sale)}</td>
                  <td>{currency(saleFees(sale))}</td>
                  <td>{currency(saleNetProceeds(sale))}</td>
                  <td>
                    {currency(saleCogs(sale, data.inventory, data.grading))}
                  </td>
                  <td className={profit >= 0 ? 'text-brand' : 'text-danger'}>
                    {currency(profit)}
                  </td>
                  <td>
                    {percent(saleMargin(sale, data.inventory, data.grading))}
                  </td>
                  <td>
                    {percent(saleRoi(sale, data.inventory, data.grading))}
                  </td>
                  <td>
                    <select
                      className="status-select"
                      aria-label={`Status for ${sale.item_id} on ${sale.sale_date}`}
                      value={sale.status}
                      disabled={updating === sale.id}
                      onChange={(event) => {
                        const status = event.target.value as SaleStatus
                        setUpdating(sale.id)
                        setError('')
                        void onStatusChange(sale.id, status)
                          .catch((error) =>
                            setError(
                              error instanceof Error
                                ? error.message
                                : 'Unable to update sale.',
                            ),
                          )
                          .finally(() => setUpdating(null))
                      }}
                    >
                      {[
                        'Paid',
                        'Shipped',
                        'Delivered',
                        'Returned',
                        'Cancelled',
                      ].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function ExpensesSection({
  data,
  search,
}: {
  data: CardData
  search: string
}) {
  const rows = data.expenses.filter((expense) => matchesSearch(expense, search))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={ReceiptText} title="Expense Log" />
      <div
        className="overflow-x-auto scrollbar-soft"
        tabIndex={0}
        role="region"
        aria-label="Scrollable records"
      >
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={ReceiptText}
                    title="No expenses logged"
                    hint="Capture supplies, booth fees, and storage here."
                  />
                </td>
              </tr>
            )}
            {rows.map((expense, i) => (
              <tr
                key={expense.id}
                className={cx(tableRowClass, 'animate-fade-in')}
                style={rowDelay(i)}
              >
                <td>{expense.expense_date}</td>
                <td>{expense.category}</td>
                <td>{expense.vendor}</td>
                <td>{currency(expense.amount)}</td>
                <td>{expense.payment_method}</td>
                <td className="max-w-[280px] whitespace-normal text-muted">
                  {expense.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function ImportSection({
  data,
  parseCsvText,
  onImport,
}: {
  data: CardData
  parseCsvText: (csvText: string, fileName?: string) => CsvImportPreview
  onImport: (preview: CsvImportPreview, fileName: string) => Promise<void>
}) {
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [fileName, setFileName] = useState('')
  const [imported, setImported] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const existingCerts = new Set(
    data.inventory.map((item) => item.cert_number).filter(Boolean),
  )
  const duplicateWarnings =
    preview?.inventory
      .filter((item) => item.cert_number && existingCerts.has(item.cert_number))
      .map((item) => `Already in inventory by cert: ${item.cert_number}`) ?? []

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setImported(false)
    setPreview(null)
    try {
      if (!file.name.toLowerCase().endsWith('.csv'))
        throw new Error('Choose a Card Ladder CSV file.')
      if (file.size > 10 * 1024 * 1024)
        throw new Error('Choose a CSV smaller than 10 MB.')
      setFileName(file.name)
      setPreview(parseCsvText(await file.text(), file.name))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to read this file.',
      )
    }
  }

  return (
    <section className="grid items-start gap-[18px] md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className={panelClass}>
        <PanelHeader icon={FileDown} title="Card Ladder CSV" />
        <p className="import-description">
          Export your collection from Card Ladder, then review every row before
          bringing it in.
        </p>
        <label
          className={cx(
            'grid min-h-[170px] cursor-pointer place-items-center rounded-xl border border-dashed bg-canvas-2 p-6 text-center text-muted transition duration-200',
            dragActive
              ? 'border-brand bg-brand-soft/40 scale-[1.01]'
              : 'border-[#98aaa0] hover:border-brand hover:bg-brand-soft/30',
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragActive(false)
            void handleFile(event.dataTransfer.files?.[0])
          }}
        >
          <Upload
            className={cx(
              'mb-2 h-8 w-8 transition-transform duration-200',
              dragActive ? 'text-brand scale-110' : 'text-brand',
            )}
            aria-hidden="true"
          />
          <strong className="text-ink">Select or drop a CSV</strong>
          <span className="text-xs">Card Ladder export</span>
          {fileName && (
            <span className="mt-2 text-xs font-mono text-muted">
              {fileName}
            </span>
          )}
          <input
            aria-label="Card Ladder CSV file"
            className="sr-only"
            accept=".csv,text/csv"
            type="file"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </label>

        {preview && (
          <div className="my-3.5 grid grid-cols-2 gap-2.5">
            <Kpi
              label="Rows"
              value={String(preview.inventory.length)}
              index={0}
            />
            <Kpi label="Cost" value={currency(preview.totals.cost)} index={1} />
            <Kpi
              label="Market"
              value={currency(preview.totals.marketValue)}
              tone="green"
              index={2}
            />
            <Kpi
              label="Unrealized"
              value={currency(preview.totals.unrealizedProfit)}
              tone="gold"
              index={3}
            />
          </div>
        )}

        {[...(preview?.warnings ?? []), ...duplicateWarnings].map((warning) => (
          <div
            className="mt-3 rounded-lg border border-[#eedba8] bg-gold-soft p-3 text-[#8a5d11] animate-fade-in-fast"
            key={warning}
          >
            {warning}
          </div>
        ))}

        {preview && (
          <button
            className={cx(primaryButtonClass, 'mt-3.5')}
            type="button"
            disabled={
              busy ||
              imported ||
              !preview.inventory.length ||
              !!preview.warnings.length ||
              !!duplicateWarnings.length
            }
            onClick={() => {
              setBusy(true)
              setError('')
              void onImport(preview, fileName)
                .then(() => setImported(true))
                .catch((error) =>
                  setError(
                    error instanceof Error
                      ? error.message
                      : 'Import failed. Please try again.',
                  ),
                )
                .finally(() => setBusy(false))
            }}
          >
            {busy ? 'Importing…' : imported ? 'Imported' : 'Confirm import'}
          </button>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {imported && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#c6e7d5] bg-brand-soft p-3 text-brand animate-fade-in-fast">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Import completed.
          </div>
        )}
      </div>

      <div className={tablePanelClass}>
        <TableHeader icon={Boxes} title="Preview" />
        <div
          className="overflow-x-auto scrollbar-soft"
          tabIndex={0}
          role="region"
          aria-label="Scrollable records"
        >
          <table className={tableClass}>
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Name</th>
                <th>Set</th>
                <th>Condition</th>
                <th>Cert</th>
                <th>Cost</th>
                <th>Market</th>
              </tr>
            </thead>
            <tbody>
              {preview?.inventory.map((item, i) => (
                <tr
                  key={item.item_id}
                  className={cx(tableRowClass, 'animate-fade-in')}
                  style={rowDelay(i)}
                >
                  <td className="font-mono text-xs">{item.item_id}</td>
                  <td>{item.name}</td>
                  <td>{item.set_name}</td>
                  <td>{item.condition}</td>
                  <td className="font-mono text-xs">{item.cert_number}</td>
                  <td>{currency(item.base_unit_cost * item.qty_acquired)}</td>
                  <td>
                    {currency(item.manual_market_value * item.qty_acquired)}
                  </td>
                </tr>
              ))}
              {!preview && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Inbox}
                      title="No file selected"
                      hint="Choose a Card Ladder CSV to preview rows."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function SettingsSection({
  data,
  onSavePreset,
  onResetDemo,
}: {
  data: CardData
  onSavePreset: (
    preset: Omit<FeePreset, 'id'> & { id?: string },
  ) => Promise<void>
  onResetDemo?: () => void
}) {
  return (
    <section className="grid items-start gap-[18px] md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className={panelClass}>
        <PanelHeader icon={CreditCard} title="Fee Presets" />
        <FeePresetForm onSubmit={onSavePreset} />
      </div>

      <div className={tablePanelClass}>
        <TableHeader icon={Settings} title="Channels" />
        <div
          className="overflow-x-auto scrollbar-soft"
          tabIndex={0}
          role="region"
          aria-label="Scrollable records"
        >
          <table className={tableClass}>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Fee Rate</th>
                <th>Flat Fee</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.feePresets.map((preset, i) => (
                <tr
                  key={preset.id}
                  className={cx(tableRowClass, 'animate-fade-in')}
                  style={rowDelay(i)}
                >
                  <td>{preset.channel}</td>
                  <td>{percent(preset.fee_rate)}</td>
                  <td>{currency(preset.fee_flat)}</td>
                  <td className="max-w-[280px] whitespace-normal text-muted">
                    {preset.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {onResetDemo && (
          <button
            className="m-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2.5 text-ink transition-colors duration-150 hover:bg-brand-soft/60"
            type="button"
            onClick={onResetDemo}
          >
            Reset demo data
          </button>
        )}
      </div>
    </section>
  )
}

export function InventoryForm({
  onSubmit,
}: {
  onSubmit: (input: NewInventoryInput) => void
}) {
  const [generatedId] = useState(
    () => `STK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  )
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      item_id: readText(form, 'item_id', `ITEM-${Date.now()}`),
      lot_id: readText(form, 'lot_id'),
      game: readText(form, 'game') as Game,
      product_type: readText(form, 'product_type') as ProductType,
      name: readText(form, 'name'),
      subject: readText(form, 'subject'),
      year: readText(form, 'year'),
      set_name: readText(form, 'set_name'),
      variation: readText(form, 'variation'),
      card_number: readText(form, 'card_number'),
      condition: readText(form, 'condition', 'Near Mint'),
      grading_company: readText(form, 'grading_company'),
      grade: readText(form, 'grade'),
      cert_number: readText(form, 'cert_number'),
      population: readNumber(form, 'population') || undefined,
      qty_acquired: readNumber(form, 'qty_acquired', 1),
      base_unit_cost: readNumber(form, 'base_unit_cost'),
      manual_market_value: readNumber(form, 'manual_market_value'),
      market_value_date: readText(form, 'market_value_date', today()),
      status: 'Active',
      notes: readText(form, 'notes'),
    })
  }

  return (
    <form className="grid gap-3.5" onSubmit={handleSubmit}>
      <Input
        name="item_id"
        label="Item ID"
        defaultValue={generatedId}
        required
      />
      <Input name="name" label="Name" required />
      <div className="grid grid-cols-2 gap-3">
        <Select name="game" label="Game" options={games} />
        <Select name="product_type" label="Type" options={productTypes} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="qty_acquired"
          label="Qty"
          type="number"
          defaultValue="1"
          min="1"
          step="1"
          required
        />
        <Input
          name="base_unit_cost"
          label="Unit Cost"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="manual_market_value"
          label="Market Value"
          type="number"
          min="0"
          step="0.01"
          required
        />
        <Input
          name="market_value_date"
          label="Market Date"
          type="date"
          defaultValue={today()}
          required
        />
      </div>
      <Input name="set_name" label="Set" />
      <div className="grid grid-cols-2 gap-3">
        <Input name="year" label="Year" />
        <Input name="card_number" label="Number" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="condition" label="Condition" defaultValue="Near Mint" />
        <Input name="cert_number" label="Cert" />
      </div>
      <div className="form-columns">
        <Input
          name="grading_company"
          label="Grading company"
          placeholder="PSA, BGS, CGC…"
        />
        <Input name="grade" label="Grade" placeholder="Optional" />
      </div>
      <Input name="lot_id" label="Lot ID" />
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Inventory
      </button>
    </form>
  )
}

export function PurchaseForm({
  onSubmit,
}: {
  onSubmit: (input: NewPurchaseInput) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      lot_id: readText(form, 'lot_id', `LOT-${Date.now()}`),
      purchase_date: readText(form, 'purchase_date', today()),
      seller: readText(form, 'seller'),
      source: readText(form, 'source'),
      total_paid: readNumber(form, 'total_paid'),
      tax: readNumber(form, 'tax'),
      shipping: readNumber(form, 'shipping'),
      allocated_cost: readNumber(form, 'allocated_cost'),
      payment_method: readText(form, 'payment_method'),
      notes: readText(form, 'notes'),
    })
  }

  return (
    <form className="grid gap-3.5" onSubmit={handleSubmit}>
      <Input name="lot_id" label="Lot ID" required />
      <Input
        name="purchase_date"
        label="Date"
        type="date"
        defaultValue={today()}
        required
      />
      <Input name="seller" label="Seller" required />
      <Input name="source" label="Source" required />
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="total_paid"
          label="Total Paid"
          type="number"
          step="0.01"
          min="0"
          required
        />
        <Input
          name="allocated_cost"
          label="Allocated Cost"
          type="number"
          step="0.01"
          min="0"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          name="tax"
          label="Tax"
          type="number"
          step="0.01"
          min="0"
          defaultValue="0"
        />
        <Input
          name="shipping"
          label="Shipping"
          type="number"
          step="0.01"
          min="0"
          defaultValue="0"
        />
      </div>
      <Input name="payment_method" label="Payment Method" defaultValue="Cash" />
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Purchase
      </button>
    </form>
  )
}

export function SaleForm({
  data,
  onSubmit,
}: {
  data: CardData
  onSubmit: (input: NewSaleInput) => void
}) {
  const available = data.inventory.filter(
    (item) => quantityOnHand(item, data.sales) > 0,
  )
  const [itemId, setItemId] = useState(available[0]?.item_id || '')
  const [channel, setChannel] = useState(data.feePresets[0]?.channel || 'Other')
  const [rate, setRate] = useState(
    String((data.feePresets[0]?.fee_rate || 0) * 100),
  )
  const [flat, setFlat] = useState(String(data.feePresets[0]?.fee_flat || 0))
  const item = available.find((item) => item.item_id === itemId)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      sale_date: readText(form, 'sale_date', today()),
      channel,
      item_id: itemId,
      quantity: readNumber(form, 'quantity', 1),
      gross_sale: readNumber(form, 'gross_sale'),
      shipping_charged: readNumber(form, 'shipping_charged'),
      fee_rate: Number(rate) / 100,
      fee_flat: Number(flat),
      fees_override: readText(form, 'fees_override')
        ? readNumber(form, 'fees_override')
        : null,
      shipping_cost: readNumber(form, 'shipping_cost'),
      supplies_cost: readNumber(form, 'supplies_cost'),
      status: 'Paid',
      notes: readText(form, 'notes'),
    })
  }
  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <Input
        name="sale_date"
        label="Date"
        type="date"
        defaultValue={today()}
        required
      />
      <label className={labelClass}>
        Item
        <select
          aria-label="Item"
          className={fieldClass}
          name="item_id"
          value={itemId}
          required
          onChange={(event) => setItemId(event.target.value)}
        >
          {available.map((item) => (
            <option key={item.id} value={item.item_id}>
              {item.name} · {item.item_id}
            </option>
          ))}
        </select>
      </label>
      <p className="stock-note">
        {item
          ? `${quantityOnHand(item, data.sales)} in stock · ${currency(item.base_unit_cost)} base cost per card`
          : 'Add inventory before recording a sale.'}
      </p>
      <label className={labelClass}>
        Channel
        <select
          aria-label="Channel"
          className={fieldClass}
          name="channel"
          value={channel}
          required
          onChange={(event) => {
            const next = event.target.value
            const preset = data.feePresets.find(
              (preset) => preset.channel === next,
            )
            setChannel(next)
            setRate(String((preset?.fee_rate || 0) * 100))
            setFlat(String(preset?.fee_flat || 0))
          }}
        >
          {data.feePresets.map((preset) => (
            <option key={preset.id} value={preset.channel}>
              {preset.channel}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </label>
      <div className="form-columns">
        <Input
          name="quantity"
          label="Qty"
          type="number"
          defaultValue="1"
          min="1"
          max={item ? quantityOnHand(item, data.sales) : 0}
          step="1"
          required
        />
        <Input
          name="gross_sale"
          label="Gross Sale"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </div>
      <div className="form-columns">
        <Input
          name="shipping_charged"
          label="Shipping Charged"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
        />
        <Input
          name="shipping_cost"
          label="Shipping Cost"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
        />
      </div>
      <div className="form-columns">
        <Input
          name="fee_rate"
          label="Fee rate (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          required
        />
        <Input
          name="fee_flat"
          label="Flat fee"
          type="number"
          min="0"
          step="0.01"
          value={flat}
          onChange={(event) => setFlat(event.target.value)}
          required
        />
      </div>
      <div className="form-columns">
        <Input
          name="fees_override"
          label="Manual fee override"
          type="number"
          min="0"
          step="0.01"
        />
        <Input
          name="supplies_cost"
          label="Supplies"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
        />
      </div>
      <Textarea name="notes" label="Notes" />
      <button
        className={primaryButtonClass}
        disabled={!available.length}
        type="submit"
      >
        Save sale
      </button>
    </form>
  )
}

export function ExpenseForm({
  onSubmit,
}: {
  onSubmit: (input: NewExpenseInput) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      expense_date: readText(form, 'expense_date', today()),
      category: readText(form, 'category') as ExpenseCategory,
      vendor: readText(form, 'vendor'),
      amount: readNumber(form, 'amount'),
      payment_method: readText(form, 'payment_method'),
      notes: readText(form, 'notes'),
    })
  }

  return (
    <form className="grid gap-3.5" onSubmit={handleSubmit}>
      <Input
        name="expense_date"
        label="Date"
        type="date"
        defaultValue={today()}
        required
      />
      <Select name="category" label="Category" options={expenseCategories} />
      <Input name="vendor" label="Vendor" required />
      <Input
        name="amount"
        label="Amount"
        type="number"
        min="0"
        step="0.01"
        required
      />
      <Input
        name="payment_method"
        label="Payment Method"
        defaultValue="Credit Card"
      />
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Expense
      </button>
    </form>
  )
}

function FeePresetForm({
  onSubmit,
}: {
  onSubmit: (preset: Omit<FeePreset, 'id'>) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const element = event.currentTarget
    const form = new FormData(element)
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await onSubmit({
        channel: readText(form, 'channel'),
        fee_rate: readNumber(form, 'fee_rate') / 100,
        fee_flat: readNumber(form, 'fee_flat'),
        notes: readText(form, 'notes'),
      })
      element.reset()
      setSaved(true)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to save preset.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
      <p className="small muted">
        Set a channel’s default fees. Saving an existing channel updates its
        preset.
      </p>
      <Input
        name="channel"
        label="Channel"
        placeholder="eBay, Whatnot, Card Show…"
        required
      />
      <div className="form-columns">
        <Input
          name="fee_rate"
          label="Fee rate (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          required
        />
        <Input
          name="fee_flat"
          label="Flat fee ($)"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
        />
      </div>
      <Textarea name="notes" label="Notes" />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="positive small" role="status">
          Fee preset saved.
        </p>
      )}
      <button className={primaryButtonClass} disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Save preset'}
      </button>
    </form>
  )
}

export function Input(
  props: InputHTMLAttributes<HTMLInputElement> & {
    label: string
    name: string
  },
) {
  const { label, ...inputProps } = props
  return (
    <label className={labelClass}>
      {label}
      <input className={fieldClass} {...inputProps} />
    </label>
  )
}

export function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string
  name: string
  options: string[]
  defaultValue?: string
}) {
  return (
    <label className={labelClass}>
      {label}
      <select
        aria-label={label}
        className={fieldClass}
        name={name}
        defaultValue={defaultValue}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className={labelClass}>
      {label}
      <textarea
        className={cx(fieldClass, 'min-h-[74px] resize-y')}
        name={name}
        rows={3}
      />
    </label>
  )
}

function matchesSearch(value: unknown, search: string) {
  if (!search.trim()) return true
  return JSON.stringify(value).toLowerCase().includes(search.toLowerCase())
}
