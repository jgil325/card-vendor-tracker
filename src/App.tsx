import {
  BarChart3,
  Boxes,
  CreditCard,
  Database,
  DollarSign,
  FileDown,
  Gauge,
  Gem,
  Layers,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Upload,
  X,
} from 'lucide-react'
import { type FormEvent, type InputHTMLAttributes, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useCardStore } from './hooks/useCardStore'
import {
  currency,
  dashboardTotals,
  duplicateKeys,
  inventoryCostOnHand,
  isMarketValueStale,
  landedUnitCost,
  marketValueOnHand,
  monthlySales,
  percent,
  quantityOnHand,
  saleCogs,
  saleFees,
  saleMargin,
  saleNetProceeds,
  saleProfit,
  saleRoi,
} from './lib/calculations'
import { isSupabaseConfigured, supabase, type AuthSession } from './lib/supabase'
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
} from './lib/types'

type Section = 'dashboard' | 'inventory' | 'purchases' | 'sales' | 'grading' | 'expenses' | 'import' | 'settings'
type Drawer = null | 'inventory' | 'purchase' | 'sale' | 'expense'
type IconComponent = typeof Gauge

const sections: Array<{ id: Section; label: string; icon: IconComponent }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'grading', label: 'Grading', icon: Gem },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'import', label: 'CSV Import', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const games: Game[] = ['Pokemon', 'One Piece', 'Other']
const productTypes: ProductType[] = ['Raw Single', 'Slab', 'Sealed', 'Bulk', 'Accessory']
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

const panelClass = 'min-w-0 rounded-lg border border-[#dce4df] bg-white p-4 shadow-[0_10px_30px_rgba(22,34,28,0.06)]'
const tablePanelClass =
  'min-w-0 overflow-hidden rounded-lg border border-[#dce4df] bg-white shadow-[0_10px_30px_rgba(22,34,28,0.06)]'
const tableClass =
  'w-full min-w-[980px] border-collapse text-sm [&_td]:border-b [&_td]:border-[#dce4df] [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-[#17211d] [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:text-[0.72rem] [&_th]:font-extrabold [&_th]:uppercase [&_th]:text-[#edf4ef]'
const tableRowClass = 'even:bg-[#fbfdfb] hover:bg-[#f0f6f2]'
const labelClass = 'grid gap-1.5 text-xs font-extrabold text-[#34443c]'
const fieldClass =
  'min-h-10 w-full rounded-lg border border-[#ccd8d1] bg-[#f8fbf9] px-2.5 py-2.5 text-[#17211d] outline-none focus:border-[#459b6b] focus:ring-4 focus:ring-[#127a45]/10'
const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-0 bg-[#127a45] px-4 font-extrabold text-white hover:bg-[#0d6538]'
const ghostButtonClass =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-[#d8e3dc] hover:bg-[#223229] hover:text-white'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function readText(form: FormData, key: string, fallback = '') {
  return String(form.get(key) ?? fallback).trim()
}

function readNumber(form: FormData, key: string, fallback = 0) {
  const value = Number.parseFloat(String(form.get(key) ?? ''))
  return Number.isFinite(value) ? value : fallback
}

function App() {
  const [session, setSession] = useState<AuthSession>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('dashboard')
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const store = useCardStore(session)
  const totals = useMemo(() => dashboardTotals(store.data), [store.data])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setAuthError(null)
    const form = new FormData(event.currentTarget)
    const email = readText(form, 'email')
    const password = readText(form, 'password')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#111915] p-6 text-white">Loading your vendor workspace...</div>
  }

  if (isSupabaseConfigured && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111915] p-6 text-white">
        <section className="w-full max-w-[430px] rounded-lg border border-[#dce4df] bg-white p-7 text-[#17211d] shadow-[0_18px_60px_rgba(22,34,28,0.12)]">
          <div className="mb-6 flex items-center gap-3.5">
            <ShieldCheck className="h-8 w-8 text-[#d8a236]" aria-hidden="true" />
            <div>
              <p className="mb-1 text-xs font-extrabold uppercase text-[#b17a16]">Private inventory</p>
              <h1 className="text-3xl font-extrabold tracking-normal">Card Vendor Tracker</h1>
            </div>
          </div>
          <form className="grid gap-3.5" onSubmit={handleAuth}>
            <Input name="email" label="Email" type="email" autoComplete="email" required />
            <Input name="password" label="Password" type="password" autoComplete="current-password" required />
            {authError && <p className="m-0 rounded-lg bg-[#fde8e6] p-3 text-[#b6403a]">{authError}</p>}
            <button className={primaryButtonClass} type="submit">
              Sign in
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)] bg-[#eef2ef] text-[#17211d] max-[920px]:grid-cols-1">
      <aside className="flex flex-col gap-6 bg-[#17211d] p-4 text-[#edf4ef] max-[920px]:sticky max-[920px]:top-0 max-[920px]:z-40 max-[920px]:gap-3.5">
        <div className="flex items-center gap-3 px-1.5">
          <Layers className="h-8 w-8 text-[#d8a236]" aria-hidden="true" />
          <div>
            <strong className="block text-base">Card Vendor</strong>
            <span className="mt-0.5 block max-w-[180px] truncate text-xs text-[#aebbb4] max-[920px]:hidden">
              {store.mode === 'demo' ? 'Demo workspace' : session?.user.email}
            </span>
          </div>
        </div>

        <nav className="grid gap-1 max-[920px]:grid-cols-4 max-[640px]:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                className={cx(
                  'flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[#d8e3dc] hover:bg-[#223229] hover:text-white max-[920px]:justify-center',
                  activeSection === section.id && 'bg-[#223229] text-white',
                )}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                <Icon className="h-[18px] w-[18px] max-[920px]:hidden" aria-hidden="true" />
                {section.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 max-[920px]:hidden">
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-[#d6e0da]">
            <Database className="h-[18px] w-[18px]" aria-hidden="true" />
            {store.mode === 'demo' ? 'Local demo' : 'Supabase'}
          </div>
          {supabase && (
            <button className={ghostButtonClass} type="button" onClick={() => void supabase?.auth.signOut()}>
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>
      </aside>

      <main className="grid min-w-0 content-start gap-[18px] p-6 max-[640px]:p-4">
        <header className="flex items-center justify-between gap-4 max-[920px]:flex-col max-[920px]:items-stretch">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase text-[#b17a16]">Pokemon & One Piece operations</p>
            <h1 className="text-[clamp(1.55rem,2vw,2.1rem)] font-extrabold leading-[1.08] tracking-normal">
              {sections.find((section) => section.id === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2.5 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto]">
            <SearchBox value={search} onChange={setSearch} />
            <QuickAction section={activeSection} onOpen={setDrawer} />
          </div>
        </header>

        {store.error && <div className="rounded-lg border border-[#f5c8c4] bg-[#fde8e6] p-3 text-[#b6403a]">{store.error}</div>}
        {store.loading && <div className="rounded-lg border border-[#cddff5] bg-[#e9f2ff] p-3 text-[#255f9f]">Syncing Supabase data...</div>}

        {activeSection === 'dashboard' && <Dashboard data={store.data} totals={totals} />}
        {activeSection === 'inventory' && <InventorySection data={store.data} search={search} />}
        {activeSection === 'purchases' && <PurchasesSection data={store.data} search={search} />}
        {activeSection === 'sales' && <SalesSection data={store.data} search={search} />}
        {activeSection === 'grading' && <GradingSection data={store.data} search={search} />}
        {activeSection === 'expenses' && <ExpensesSection data={store.data} search={search} />}
        {activeSection === 'import' && (
          <ImportSection data={store.data} parseCsvText={store.parseCsvText} onImport={store.importCardLadder} />
        )}
        {activeSection === 'settings' && (
          <SettingsSection
            data={store.data}
            onSavePreset={store.saveFeePreset}
            onResetDemo={store.mode === 'demo' ? store.resetDemoData : undefined}
          />
        )}
      </main>

      <FormDrawer title={drawerTitle(drawer)} open={drawer !== null} onClose={() => setDrawer(null)}>
        {drawer === 'inventory' && (
          <InventoryForm
            onSubmit={(input) => {
              void store.addInventory(input)
              setDrawer(null)
            }}
          />
        )}
        {drawer === 'purchase' && (
          <PurchaseForm
            onSubmit={(input) => {
              void store.addPurchase(input)
              setDrawer(null)
            }}
          />
        )}
        {drawer === 'sale' && (
          <SaleForm
            data={store.data}
            onSubmit={(input) => {
              void store.addSale(input)
              setDrawer(null)
            }}
          />
        )}
        {drawer === 'expense' && (
          <ExpenseForm
            onSubmit={(input) => {
              void store.addExpense(input)
              setDrawer(null)
            }}
          />
        )}
      </FormDrawer>
    </div>
  )
}

function drawerTitle(drawer: Drawer) {
  if (drawer === 'inventory') return 'Add Inventory'
  if (drawer === 'purchase') return 'Add Purchase'
  if (drawer === 'sale') return 'Add Sale'
  if (drawer === 'expense') return 'Add Expense'
  return ''
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-w-[280px] items-center gap-2 rounded-lg border border-[#dce4df] bg-white px-2.5 text-[#66736d] max-[920px]:min-w-0 max-[920px]:w-full">
      <Search className="h-[18px] w-[18px]" aria-hidden="true" />
      <input
        className="min-h-10 w-full border-0 bg-transparent p-0 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tables"
      />
    </label>
  )
}

function QuickAction({ section, onOpen }: { section: Section; onOpen: (drawer: Drawer) => void }) {
  const actionBySection: Partial<Record<Section, Drawer>> = {
    inventory: 'inventory',
    purchases: 'purchase',
    sales: 'sale',
    expenses: 'expense',
    dashboard: 'inventory',
  }
  const action = actionBySection[section]
  if (!action) return null

  return (
    <button className={primaryButtonClass} type="button" onClick={() => onOpen(action)}>
      <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
      Add
    </button>
  )
}

function Dashboard({ data, totals }: { data: CardData; totals: ReturnType<typeof dashboardTotals> }) {
  const sales = monthlySales(data)
  const checks = buildChecks(data)
  const productMix = productValueMix(data)
  const maxMonthly = Math.max(...sales.map((entry) => entry.sales), 1)
  const maxMix = Math.max(...productMix.map((entry) => entry.value), 1)

  return (
    <section className="grid items-start gap-[18px] md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="col-span-full grid grid-cols-9 gap-3 max-[1180px]:grid-cols-3 max-[640px]:grid-cols-2">
        <Kpi label="Inventory Cost" value={currency(totals.inventoryCost)} />
        <Kpi label="Market Value" value={currency(totals.marketValue)} tone="green" />
        <Kpi label="Unrealized P/L" value={currency(totals.unrealizedProfit)} tone={totals.unrealizedProfit >= 0 ? 'green' : 'red'} />
        <Kpi label="Realized Profit" value={currency(totals.realizedProfit)} tone={totals.realizedProfit >= 0 ? 'green' : 'red'} />
        <Kpi label="Margin" value={percent(totals.margin)} />
        <Kpi label="ROI" value={percent(totals.roi)} />
        <Kpi label="Cash Invested" value={currency(totals.cashInvested)} />
        <Kpi label="Units On Hand" value={String(totals.unitsOnHand)} />
        <Kpi label="Stale Pricing" value={String(totals.stalePricing)} tone={totals.stalePricing ? 'gold' : 'green'} />
      </div>

      <div className={panelClass}>
        <PanelHeader icon={BarChart3} title="Monthly Sales & Profit" />
        <div className="grid gap-3">
          {sales.length === 0 && <div className="p-5 text-center text-[#66736d]">No sales yet.</div>}
          {sales.map((entry) => (
            <div className="grid grid-cols-[72px_minmax(140px,1fr)_92px] items-center gap-2.5 max-[640px]:grid-cols-1" key={entry.month}>
              <span className="block text-xs text-[#66736d]">{entry.month}</span>
              <div className="relative h-[18px] overflow-hidden rounded-full bg-[#edf3ef]">
                <div
                  className="absolute left-1.5 top-[3px] h-2 rounded-full bg-[#d6a13b]"
                  style={{ width: `${Math.max((entry.sales / maxMonthly) * 100, 4)}%` }}
                />
                <div
                  className="absolute bottom-[3px] left-1.5 h-2 rounded-full bg-[#127a45]"
                  style={{ width: `${Math.max((entry.profit / maxMonthly) * 100, 3)}%` }}
                />
              </div>
              <strong>{currency(entry.sales)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className={panelClass}>
        <PanelHeader icon={Boxes} title="Inventory Mix" />
        <div className="grid gap-3">
          {productMix.map((entry) => (
            <div className="grid gap-2" key={entry.label}>
              <div className="flex items-baseline justify-between">
                <strong>{entry.label}</strong>
                <span className="block text-xs text-[#66736d]">{currency(entry.value)}</span>
              </div>
              <div className="h-[18px] overflow-hidden rounded-full bg-[#edf3ef]">
                <div className="h-full rounded-full bg-[#127a45]" style={{ width: `${Math.max((entry.value / maxMix) * 100, 5)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={panelClass}>
        <PanelHeader icon={ShieldCheck} title="Data Checks" />
        <div className="grid gap-3">
          {checks.map((check) => (
            <div className="flex items-center justify-between rounded-lg border border-[#dce4df] bg-[#f7faf8] px-3 py-2.5" key={check.label}>
              <strong
                className={cx(
                  'text-lg',
                  check.tone === 'good' && 'text-[#127a45]',
                  check.tone === 'warn' && 'text-[#b17a16]',
                  check.tone === 'bad' && 'text-[#b6403a]',
                )}
              >
                {check.value}
              </strong>
              <span>{check.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Kpi({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'green' | 'gold' | 'red' }) {
  return (
    <div className="min-h-[86px] rounded-lg border border-[#dce4df] bg-white p-3.5 shadow-[0_10px_30px_rgba(22,34,28,0.06)]">
      <span className="mb-2.5 block text-[0.73rem] font-extrabold uppercase text-[#66736d]">{label}</span>
      <strong
        className={cx(
          'block break-words text-xl leading-none',
          tone === 'green' && 'text-[#127a45]',
          tone === 'gold' && 'text-[#b17a16]',
          tone === 'red' && 'text-[#b6403a]',
        )}
      >
        {value}
      </strong>
    </div>
  )
}

function PanelHeader({ icon: Icon, title }: { icon: IconComponent; title: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2">
      <Icon className="h-[18px] w-[18px] text-[#b17a16]" aria-hidden="true" />
      <h2 className="m-0 text-base font-extrabold tracking-normal">{title}</h2>
    </div>
  )
}

function TableHeader({ icon, title }: { icon: IconComponent; title: string }) {
  return (
    <div className="border-b border-[#dce4df] bg-[#f8fbf9] px-4 py-3">
      <PanelHeader icon={icon} title={title} />
    </div>
  )
}

function InventorySection({ data, search }: { data: CardData; search: string }) {
  const rows = data.inventory.filter((item) => matchesSearch(item, search))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={Boxes} title="Inventory Catalog" />
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Game</th>
              <th>Name</th>
              <th>Type</th>
              <th>Condition</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Market</th>
              <th>Value</th>
              <th>Unrealized</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const onHand = quantityOnHand(item, data.sales)
              const cost = inventoryCostOnHand(item, data.sales, data.grading)
              const value = marketValueOnHand(item, data.sales)
              const unrealized = value - cost
              return (
                <tr key={item.id} className={cx(tableRowClass, onHand <= 0 && 'opacity-60')}>
                  <td className="font-mono text-xs">{item.item_id}</td>
                  <td>{item.game}</td>
                  <td>
                    <strong>{item.name}</strong>
                    <span className="block text-xs text-[#66736d]">{[item.year, item.set_name, item.card_number].filter(Boolean).join(' / ')}</span>
                  </td>
                  <td>{item.product_type}</td>
                  <td>{item.condition}</td>
                  <td className={onHand <= 0 ? 'text-[#b17a16]' : ''}>{onHand}</td>
                  <td>{currency(landedUnitCost(item, data.grading))}</td>
                  <td className={isMarketValueStale(item.market_value_date) ? 'text-[#b17a16]' : ''}>
                    {currency(item.manual_market_value)}
                  </td>
                  <td>{currency(value)}</td>
                  <td className={unrealized >= 0 ? 'text-[#127a45]' : 'text-[#b6403a]'}>{currency(unrealized)}</td>
                  <td>
                    <StatusPill status={onHand <= 0 ? 'Sold Out' : item.status} />
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

function PurchasesSection({ data, search }: { data: CardData; search: string }) {
  const rows = data.purchases.filter((purchase) => matchesSearch(purchase, search))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={ShoppingBag} title="Purchase Lots" />
      <div className="overflow-x-auto">
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
            {rows.map((purchase) => (
              <tr key={purchase.id} className={tableRowClass}>
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

function SalesSection({ data, search }: { data: CardData; search: string }) {
  const rows = data.sales.filter((sale) => matchesSearch(sale, search))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={DollarSign} title="Sales Ledger" />
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Channel</th>
              <th>Item ID</th>
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
            {rows.map((sale) => {
              const profit = saleProfit(sale, data.inventory, data.grading)
              return (
                <tr key={sale.id} className={tableRowClass}>
                  <td>{sale.sale_date}</td>
                  <td>{sale.channel}</td>
                  <td className="font-mono text-xs">{sale.item_id}</td>
                  <td>{sale.quantity}</td>
                  <td>{currency(sale.gross_sale)}</td>
                  <td>{currency(saleFees(sale))}</td>
                  <td>{currency(saleNetProceeds(sale))}</td>
                  <td>{currency(saleCogs(sale, data.inventory, data.grading))}</td>
                  <td className={profit >= 0 ? 'text-[#127a45]' : 'text-[#b6403a]'}>{currency(profit)}</td>
                  <td>{percent(saleMargin(sale, data.inventory, data.grading))}</td>
                  <td>{percent(saleRoi(sale, data.inventory, data.grading))}</td>
                  <td>
                    <StatusPill status={sale.status} />
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

function GradingSection({ data, search }: { data: CardData; search: string }) {
  const rows = data.grading.filter((submission) => matchesSearch(submission, search))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={Gem} title="Grading Submissions" />
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Submission</th>
              <th>Item ID</th>
              <th>Company</th>
              <th>Submitted</th>
              <th>Returned</th>
              <th>Costs</th>
              <th>Grade</th>
              <th>Cert</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((submission) => (
              <tr key={submission.id} className={tableRowClass}>
                <td className="font-mono text-xs">{submission.submission_id}</td>
                <td className="font-mono text-xs">{submission.item_id}</td>
                <td>{submission.company}</td>
                <td>{submission.submission_date}</td>
                <td>{submission.returned_date || '-'}</td>
                <td>{currency(submission.grading_fee + submission.shipping_fee)}</td>
                <td>{submission.grade_result || '-'}</td>
                <td className="font-mono text-xs">{submission.cert_number || '-'}</td>
                <td>
                  <StatusPill status={submission.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ExpensesSection({ data, search }: { data: CardData; search: string }) {
  const rows = data.expenses.filter((expense) => matchesSearch(expense, search))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={ReceiptText} title="Expense Log" />
      <div className="overflow-x-auto">
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
            {rows.map((expense) => (
              <tr key={expense.id} className={tableRowClass}>
                <td>{expense.expense_date}</td>
                <td>{expense.category}</td>
                <td>{expense.vendor}</td>
                <td>{currency(expense.amount)}</td>
                <td>{expense.payment_method}</td>
                <td className="max-w-[280px] whitespace-normal text-[#66736d]">{expense.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ImportSection({
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
  const existingCerts = new Set(data.inventory.map((item) => item.cert_number).filter(Boolean))
  const duplicateWarnings =
    preview?.inventory
      .filter((item) => item.cert_number && existingCerts.has(item.cert_number))
      .map((item) => `Already in inventory by cert: ${item.cert_number}`) ?? []

  async function handleFile(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    setFileName(file.name)
    setPreview(parseCsvText(text, file.name))
    setImported(false)
  }

  return (
    <section className="grid items-start gap-[18px] md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className={panelClass}>
        <PanelHeader icon={FileDown} title="Card Ladder CSV" />
        <label className="grid min-h-[170px] cursor-pointer place-items-center rounded-lg border border-dashed border-[#98aaa0] bg-[#f8fbf9] p-6 text-center text-[#66736d]">
          <Upload className="mb-1 h-8 w-8 text-[#127a45]" aria-hidden="true" />
          <strong>Select CSV</strong>
          <span>Card Ladder export</span>
          <input className="sr-only" accept=".csv,text/csv" type="file" onChange={(event) => void handleFile(event.target.files?.[0])} />
        </label>

        {preview && (
          <div className="my-3.5 grid grid-cols-2 gap-2.5">
            <Kpi label="Rows" value={String(preview.inventory.length)} />
            <Kpi label="Cost" value={currency(preview.totals.cost)} />
            <Kpi label="Market" value={currency(preview.totals.marketValue)} tone="green" />
            <Kpi label="Unrealized" value={currency(preview.totals.unrealizedProfit)} tone="gold" />
          </div>
        )}

        {[...(preview?.warnings ?? []), ...duplicateWarnings].map((warning) => (
          <div className="mt-3 rounded-lg border border-[#eedba8] bg-[#fff4d7] p-3 text-[#8a5d11]" key={warning}>
            {warning}
          </div>
        ))}

        {preview && (
          <button
            className={cx(primaryButtonClass, 'mt-3.5')}
            type="button"
            onClick={() => {
              void onImport(preview, fileName).then(() => setImported(true))
            }}
          >
            Confirm Import
          </button>
        )}
        {imported && <div className="mt-3 rounded-lg border border-[#c6e7d5] bg-[#e4f5ec] p-3 text-[#127a45]">Import completed.</div>}
      </div>

      <div className={tablePanelClass}>
        <TableHeader icon={Boxes} title="Preview" />
        <div className="overflow-x-auto">
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
              {preview?.inventory.map((item) => (
                <tr key={item.item_id} className={tableRowClass}>
                  <td className="font-mono text-xs">{item.item_id}</td>
                  <td>{item.name}</td>
                  <td>{item.set_name}</td>
                  <td>{item.condition}</td>
                  <td className="font-mono text-xs">{item.cert_number}</td>
                  <td>{currency(item.base_unit_cost * item.qty_acquired)}</td>
                  <td>{currency(item.manual_market_value * item.qty_acquired)}</td>
                </tr>
              ))}
              {!preview && (
                <tr>
                  <td colSpan={7}>
                    <div className="p-5 text-center text-[#66736d]">No file selected.</div>
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

function SettingsSection({
  data,
  onSavePreset,
  onResetDemo,
}: {
  data: CardData
  onSavePreset: (preset: Omit<FeePreset, 'id'> & { id?: string }) => Promise<void>
  onResetDemo?: () => void
}) {
  return (
    <section className="grid items-start gap-[18px] md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className={panelClass}>
        <PanelHeader icon={CreditCard} title="Fee Presets" />
        <FeePresetForm onSubmit={(preset) => void onSavePreset(preset)} />
      </div>

      <div className={tablePanelClass}>
        <TableHeader icon={Settings} title="Channels" />
        <div className="overflow-x-auto">
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
              {data.feePresets.map((preset) => (
                <tr key={preset.id} className={tableRowClass}>
                  <td>{preset.channel}</td>
                  <td>{percent(preset.fee_rate)}</td>
                  <td>{currency(preset.fee_flat)}</td>
                  <td className="max-w-[280px] whitespace-normal text-[#66736d]">{preset.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {onResetDemo && (
          <button className="m-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2.5 text-[#17211d] hover:bg-[#f0f6f2]" type="button" onClick={onResetDemo}>
            Reset demo data
          </button>
        )}
      </div>
    </section>
  )
}

function FormDrawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1713]/30" role="presentation">
      <aside className="ml-auto grid h-full w-[min(100vw,460px)] max-w-[460px] gap-4 overflow-y-auto border-l border-[#dce4df] bg-white p-5 shadow-[0_18px_60px_rgba(22,34,28,0.12)]" aria-label={title}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold">{title}</h2>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff3f1] text-[#17211d]" type="button" onClick={onClose} aria-label="Close drawer">
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}

function InventoryForm({ onSubmit }: { onSubmit: (input: NewInventoryInput) => void }) {
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
      <Input name="item_id" label="Item ID" required />
      <Input name="name" label="Name" required />
      <div className="grid grid-cols-2 gap-3">
        <Select name="game" label="Game" options={games} />
        <Select name="product_type" label="Type" options={productTypes} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="qty_acquired" label="Qty" type="number" defaultValue="1" min="0" step="1" required />
        <Input name="base_unit_cost" label="Unit Cost" type="number" min="0" step="0.01" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="manual_market_value" label="Market Value" type="number" min="0" step="0.01" required />
        <Input name="market_value_date" label="Market Date" type="date" defaultValue={today()} required />
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
      <Input name="lot_id" label="Lot ID" />
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Inventory
      </button>
    </form>
  )
}

function PurchaseForm({ onSubmit }: { onSubmit: (input: NewPurchaseInput) => void }) {
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
      <Input name="purchase_date" label="Date" type="date" defaultValue={today()} required />
      <Input name="seller" label="Seller" required />
      <Input name="source" label="Source" required />
      <div className="grid grid-cols-2 gap-3">
        <Input name="total_paid" label="Total Paid" type="number" step="0.01" min="0" required />
        <Input name="allocated_cost" label="Allocated Cost" type="number" step="0.01" min="0" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="tax" label="Tax" type="number" step="0.01" min="0" defaultValue="0" />
        <Input name="shipping" label="Shipping" type="number" step="0.01" min="0" defaultValue="0" />
      </div>
      <Input name="payment_method" label="Payment Method" defaultValue="Cash" />
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Purchase
      </button>
    </form>
  )
}

function SaleForm({ data, onSubmit }: { data: CardData; onSubmit: (input: NewSaleInput) => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const channel = readText(form, 'channel')
    const preset = data.feePresets.find((entry) => entry.channel === channel)
    onSubmit({
      sale_date: readText(form, 'sale_date', today()),
      channel,
      item_id: readText(form, 'item_id'),
      quantity: readNumber(form, 'quantity', 1),
      gross_sale: readNumber(form, 'gross_sale'),
      shipping_charged: readNumber(form, 'shipping_charged'),
      fee_rate: readNumber(form, 'fee_rate', preset?.fee_rate ?? 0),
      fee_flat: readNumber(form, 'fee_flat', preset?.fee_flat ?? 0),
      fees_override: readText(form, 'fees_override') ? readNumber(form, 'fees_override') : null,
      shipping_cost: readNumber(form, 'shipping_cost'),
      supplies_cost: readNumber(form, 'supplies_cost'),
      status: 'Paid',
      notes: readText(form, 'notes'),
    })
  }

  return (
    <form className="grid gap-3.5" onSubmit={handleSubmit}>
      <Input name="sale_date" label="Date" type="date" defaultValue={today()} required />
      <label className={labelClass}>
        Item
        <select className={fieldClass} name="item_id" required>
          {data.inventory.map((item) => (
            <option key={item.id} value={item.item_id}>
              {item.item_id} - {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Channel
        <select className={fieldClass} name="channel" required>
          {data.feePresets.map((preset) => (
            <option key={preset.id} value={preset.channel}>
              {preset.channel}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Input name="quantity" label="Qty" type="number" defaultValue="1" min="1" step="1" required />
        <Input name="gross_sale" label="Gross Sale" type="number" min="0" step="0.01" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="shipping_charged" label="Shipping Charged" type="number" min="0" step="0.01" defaultValue="0" />
        <Input name="shipping_cost" label="Shipping Cost" type="number" min="0" step="0.01" defaultValue="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="fee_rate" label="Fee Rate" type="number" min="0" step="0.0001" defaultValue="0.1325" />
        <Input name="fee_flat" label="Flat Fee" type="number" min="0" step="0.01" defaultValue="0.40" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="fees_override" label="Manual Fees" type="number" min="0" step="0.01" />
        <Input name="supplies_cost" label="Supplies" type="number" min="0" step="0.01" defaultValue="0" />
      </div>
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Sale
      </button>
    </form>
  )
}

function ExpenseForm({ onSubmit }: { onSubmit: (input: NewExpenseInput) => void }) {
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
      <Input name="expense_date" label="Date" type="date" defaultValue={today()} required />
      <Select name="category" label="Category" options={expenseCategories} />
      <Input name="vendor" label="Vendor" required />
      <Input name="amount" label="Amount" type="number" min="0" step="0.01" required />
      <Input name="payment_method" label="Payment Method" defaultValue="Credit Card" />
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Expense
      </button>
    </form>
  )
}

function FeePresetForm({ onSubmit }: { onSubmit: (preset: Omit<FeePreset, 'id'>) => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      channel: readText(form, 'channel'),
      fee_rate: readNumber(form, 'fee_rate'),
      fee_flat: readNumber(form, 'fee_flat'),
      notes: readText(form, 'notes'),
    })
    event.currentTarget.reset()
  }

  return (
    <form className="grid gap-3.5" onSubmit={handleSubmit}>
      <Input name="channel" label="Channel" required />
      <div className="grid grid-cols-2 gap-3">
        <Input name="fee_rate" label="Rate" type="number" min="0" step="0.0001" required />
        <Input name="fee_flat" label="Flat" type="number" min="0" step="0.01" defaultValue="0" />
      </div>
      <Textarea name="notes" label="Notes" />
      <button className={primaryButtonClass} type="submit">
        Save Preset
      </button>
    </form>
  )
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...inputProps } = props
  return (
    <label className={labelClass}>
      {label}
      <input className={fieldClass} {...inputProps} />
    </label>
  )
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className={labelClass}>
      {label}
      <select className={fieldClass} name={name}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className={labelClass}>
      {label}
      <textarea className={cx(fieldClass, 'min-h-[74px] resize-y')} name={name} rows={3} />
    </label>
  )
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const isGreen = ['active', 'delivered', 'complete', 'paid', 'shipped'].some((entry) => normalized.includes(entry))
  const isRed = ['sold out', 'cancelled', 'returned'].some((entry) => normalized.includes(entry))
  const isGold = ['grading', 'submitted', 'preparing'].some((entry) => normalized.includes(entry))

  return (
    <span
      className={cx(
        'inline-flex min-w-[72px] justify-center whitespace-nowrap rounded-full px-2 py-1 text-xs font-extrabold',
        isGreen && 'bg-[#e4f5ec] text-[#127a45]',
        isRed && 'bg-[#fde8e6] text-[#b6403a]',
        isGold && 'bg-[#fff4d7] text-[#b17a16]',
        !isGreen && !isRed && !isGold && 'bg-[#e9f2ff] text-[#255f9f]',
      )}
    >
      {status}
    </span>
  )
}

function matchesSearch(value: unknown, search: string) {
  if (!search.trim()) return true
  return JSON.stringify(value).toLowerCase().includes(search.toLowerCase())
}

function productValueMix(data: CardData) {
  const buckets = new Map<string, number>()
  for (const item of data.inventory) {
    buckets.set(item.product_type, (buckets.get(item.product_type) ?? 0) + marketValueOnHand(item, data.sales))
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function buildChecks(data: CardData) {
  const duplicateCount = duplicateKeys(data.inventory).length
  const negativeInventory = data.inventory.filter((item) => quantityOnHand(item, data.sales) < 0).length
  const missingCost = data.inventory.filter((item) => item.base_unit_cost <= 0).length
  const stalePricing = data.inventory.filter((item) => isMarketValueStale(item.market_value_date)).length
  const knownChannels = new Set(data.feePresets.map((preset) => preset.channel))
  const unknownChannels = data.sales.filter((sale) => !knownChannels.has(sale.channel)).length

  return [
    { label: 'Duplicate item/cert keys', value: duplicateCount, tone: duplicateCount ? 'bad' : 'good' },
    { label: 'Negative inventory rows', value: negativeInventory, tone: negativeInventory ? 'bad' : 'good' },
    { label: 'Missing costs', value: missingCost, tone: missingCost ? 'warn' : 'good' },
    { label: 'Stale market values', value: stalePricing, tone: stalePricing ? 'warn' : 'good' },
    { label: 'Unknown sale channels', value: unknownChannels, tone: unknownChannels ? 'warn' : 'good' },
  ]
}

export default App
