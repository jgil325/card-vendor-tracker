import {
  BarChart3,
  Boxes,
  CreditCard,
  Database,
  DollarSign,
  FileDown,
  Gauge,
  Gem,
  Inbox,
  Layers,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
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

const panelClass =
  'min-w-0 rounded-xl border border-line-soft bg-white p-5 shadow-card transition duration-200 hover:shadow-pop'
const tablePanelClass =
  'min-w-0 overflow-hidden rounded-xl border border-line-soft bg-white shadow-card transition duration-200 hover:shadow-pop'
const tableClass =
  'w-full min-w-[980px] border-collapse text-sm tabular [&_td]:border-b [&_td]:border-line-soft [&_td]:px-3 [&_td]:py-3 [&_td]:align-middle [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-ink [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:text-[0.7rem] [&_th]:font-extrabold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-white/85 [&_th]:border-b [&_th]:border-white/10'
const tableRowClass =
  'relative even:bg-canvas-2/60 transition-colors duration-150 hover:bg-brand-soft/40 ' +
  "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand before:scale-y-0 before:origin-center before:transition-transform before:duration-200 hover:before:scale-y-100"
const labelClass = 'grid gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#34443c]'
const fieldClass =
  'focus-ring min-h-10 w-full rounded-lg border border-[#ccd8d1] bg-canvas-2 px-2.5 py-2.5 text-ink outline-none transition-shadow duration-150 focus:border-brand'
const primaryButtonClass =
  'group inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border-0 bg-brand px-4 font-extrabold text-white shadow-card transition duration-150 hover:bg-brand-2 hover:-translate-y-px hover:shadow-pop active:translate-y-0 active:scale-[.98]'
const ghostButtonClass =
  'inline-flex min-h-10 items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-[#d8e3dc] transition-colors duration-150 hover:bg-white/8 hover:text-white'

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
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-3 p-6 text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-[480px] w-[480px] rounded-full bg-brand/25 blur-3xl animate-blob" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-gold/20 blur-3xl animate-blob [animation-delay:-6s]" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-3 animate-fade-in">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/15 ring-1 ring-gold/30">
            <Layers className="h-6 w-6 text-gold" aria-hidden="true" />
          </div>
          <span className="h-5 w-5 rounded-full border-2 border-brand-soft/30 border-t-brand-soft animate-spin-slow" aria-hidden="true" />
          <p className="text-sm text-white/70">Loading your vendor workspace…</p>
        </div>
      </div>
    )
  }

  if (isSupabaseConfigured && !session) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-3 p-6 text-white">
        <div className="pointer-events-none absolute -left-32 -top-24 h-[560px] w-[560px] rounded-full bg-brand/30 blur-3xl animate-blob" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[520px] w-[520px] rounded-full bg-gold/25 blur-3xl animate-blob [animation-delay:-7s]" aria-hidden="true" />
        <section
          className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-line-soft bg-white p-7 text-ink shadow-pop animate-slide-up
            before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-brand before:via-gold before:to-brand"
        >
          <div className="mb-6 flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold-soft ring-1 ring-gold/30">
              <ShieldCheck className="h-6 w-6 text-gold-2" aria-hidden="true" />
            </div>
            <div>
              <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-gold-2">Private inventory</p>
              <h1 className="font-display text-3xl font-bold tracking-tight">Card Vendor Tracker</h1>
            </div>
          </div>
          <form className="grid gap-3.5" onSubmit={handleAuth}>
            <Input name="email" label="Email" type="email" autoComplete="email" required />
            <Input name="password" label="Password" type="password" autoComplete="current-password" required />
            {authError && (
              <p className="m-0 rounded-lg bg-danger-soft p-3 text-danger animate-fade-in-fast">{authError}</p>
            )}
            <button className={cx(primaryButtonClass, 'mt-1')} type="submit">
              Sign in
              <Sparkles className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)] bg-canvas text-ink max-[920px]:grid-cols-1">
      <aside className="app-sidebar flex flex-col gap-6 p-4 text-[#edf4ef] max-[920px]:sticky max-[920px]:top-0 max-[920px]:z-40 max-[920px]:gap-3.5">
        <div className="flex items-center gap-3 px-1.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 ring-1 ring-gold/30">
            <Layers className="h-5 w-5 text-gold" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <strong className="block font-display text-base tracking-tight">Card Vendor</strong>
            <span className="mt-0.5 block max-w-[180px] truncate text-xs text-[#aebbb4] max-[920px]:hidden">
              {store.mode === 'demo' ? 'Demo workspace' : session?.user.email}
            </span>
          </div>
        </div>

        <nav className="grid gap-1 max-[920px]:grid-cols-4 max-[640px]:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                className={cx(
                  'relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[#d8e3dc] transition-colors duration-200 hover:bg-white/8 hover:text-white max-[920px]:justify-center',
                  "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-gold before:opacity-0 before:transition-opacity before:duration-200 max-[920px]:before:hidden",
                  isActive && 'bg-white/8 text-white before:opacity-100',
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
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-[#d6e0da] ring-1 ring-white/10">
            <Database className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="flex-1 text-sm">{store.mode === 'demo' ? 'Local demo' : 'Supabase'}</span>
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span
                className={cx(
                  'absolute inline-flex h-full w-full rounded-full opacity-70 animate-pulse-soft',
                  store.mode === 'demo' ? 'bg-gold' : 'bg-brand',
                )}
              />
              <span
                className={cx(
                  'relative inline-flex h-2 w-2 rounded-full',
                  store.mode === 'demo' ? 'bg-gold' : 'bg-brand',
                )}
              />
            </span>
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
          <div className="animate-fade-in">
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-gold-2">Pokemon &amp; One Piece operations</p>
            <h1 className="font-display text-[clamp(1.55rem,2vw,2.1rem)] font-bold leading-[1.08] tracking-tight">
              {sections.find((section) => section.id === activeSection)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2.5 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto]">
            <SearchBox value={search} onChange={setSearch} />
            <QuickAction section={activeSection} onOpen={setDrawer} />
          </div>
        </header>

        {store.error && (
          <div className="rounded-lg border border-[#f5c8c4] bg-danger-soft p-3 text-danger animate-fade-in-fast">
            {store.error}
          </div>
        )}
        {store.loading && (
          <div className="flex items-center gap-2.5 rounded-lg border border-[#cddff5] bg-info-soft p-3 text-info animate-fade-in-fast">
            <span className="h-4 w-4 rounded-full border-2 border-info/30 border-t-info animate-spin-slow" aria-hidden="true" />
            Syncing Supabase data…
          </div>
        )}

        <div key={activeSection} className="animate-slide-up">
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
        </div>
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
    <label className="focus-ring flex min-w-[280px] items-center gap-2 rounded-lg border border-line bg-white px-2.5 text-muted shadow-card transition-shadow duration-150 focus-within:border-brand focus-within:shadow-pop max-[920px]:min-w-0 max-[920px]:w-full">
      <Search className="h-[18px] w-[18px]" aria-hidden="true" />
      <input
        className="min-h-10 w-full border-0 bg-transparent p-0 text-ink outline-none placeholder:text-muted/70"
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
      <Plus className="h-[18px] w-[18px] transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
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

  const kpis: Array<{ label: string; value: string; tone?: 'neutral' | 'green' | 'gold' | 'red' }> = [
    { label: 'Inventory Cost', value: currency(totals.inventoryCost) },
    { label: 'Market Value', value: currency(totals.marketValue), tone: 'green' },
    { label: 'Unrealized P/L', value: currency(totals.unrealizedProfit), tone: totals.unrealizedProfit >= 0 ? 'green' : 'red' },
    { label: 'Realized Profit', value: currency(totals.realizedProfit), tone: totals.realizedProfit >= 0 ? 'green' : 'red' },
    { label: 'Margin', value: percent(totals.margin) },
    { label: 'ROI', value: percent(totals.roi) },
    { label: 'Cash Invested', value: currency(totals.cashInvested) },
    { label: 'Units On Hand', value: String(totals.unitsOnHand) },
    { label: 'Stale Pricing', value: String(totals.stalePricing), tone: totals.stalePricing ? 'gold' : 'green' },
  ]

  return (
    <section className="grid items-start gap-[18px] md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="col-span-full grid grid-cols-9 gap-3 max-[1180px]:grid-cols-3 max-[640px]:grid-cols-2">
        {kpis.map((kpi, index) => (
          <Kpi key={kpi.label} label={kpi.label} value={kpi.value} tone={kpi.tone} index={index} />
        ))}
      </div>

      <div className={panelClass}>
        <PanelHeader icon={BarChart3} title="Monthly Sales & Profit" />
        <div className="grid gap-3">
          {sales.length === 0 && <EmptyState icon={BarChart3} title="No sales yet" hint="Log a sale to see your monthly trend." />}
          {sales.map((entry, index) => {
            const salesPct = Math.max((entry.sales / maxMonthly) * 100, 4)
            const profitPct = Math.max((entry.profit / maxMonthly) * 100, 3)
            return (
              <div
                className="grid grid-cols-[72px_minmax(140px,1fr)_92px] items-center gap-2.5 animate-fade-in max-[640px]:grid-cols-1"
                key={entry.month}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="block text-xs font-medium text-muted">{entry.month}</span>
                <div className="relative h-[18px] overflow-hidden rounded-full bg-line-soft">
                  <div
                    className="absolute left-1.5 top-[3px] h-2 origin-left rounded-full bg-gradient-to-r from-gold to-gold/80 animate-bar-grow"
                    style={{ width: `${salesPct}%`, animationDelay: `${index * 50}ms` }}
                  />
                  <div
                    className="absolute bottom-[3px] left-1.5 h-2 origin-left rounded-full bg-gradient-to-r from-brand to-brand/80 animate-bar-grow"
                    style={{ width: `${profitPct}%`, animationDelay: `${index * 50 + 80}ms` }}
                  />
                </div>
                <strong className="text-right tabular">{currency(entry.sales)}</strong>
              </div>
            )
          })}
        </div>
      </div>

      <div className={panelClass}>
        <PanelHeader icon={Boxes} title="Inventory Mix" />
        <div className="grid gap-3">
          {productMix.length === 0 && <EmptyState icon={Boxes} title="No inventory" hint="Add items to see the mix." />}
          {productMix.map((entry, index) => {
            const widthPct = Math.max((entry.value / maxMix) * 100, 5)
            return (
              <div
                className="grid gap-2 animate-fade-in"
                key={entry.label}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-baseline justify-between">
                  <strong>{entry.label}</strong>
                  <span className="block text-xs text-muted tabular">{currency(entry.value)}</span>
                </div>
                <div className="h-[18px] overflow-hidden rounded-full bg-line-soft">
                  <div
                    className="h-full origin-left rounded-full bg-gradient-to-r from-brand to-brand/80 animate-bar-grow"
                    style={{ width: `${widthPct}%`, animationDelay: `${index * 60}ms` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={panelClass}>
        <PanelHeader icon={ShieldCheck} title="Data Checks" />
        <div className="grid gap-3">
          {checks.map((check, index) => (
            <div
              className="flex items-center justify-between rounded-lg border border-line-soft bg-canvas-2 px-3 py-2.5 transition-colors duration-150 hover:bg-canvas animate-fade-in"
              key={check.label}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <strong
                className={cx(
                  'font-display text-lg tabular',
                  check.tone === 'good' && 'text-brand',
                  check.tone === 'warn' && 'text-gold-2',
                  check.tone === 'bad' && 'text-danger',
                )}
              >
                {check.value}
              </strong>
              <span className="text-sm text-ink/80">{check.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Kpi({
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
  const TrendIcon = tone === 'green' ? TrendingUp : tone === 'red' ? TrendingDown : null
  return (
    <div
      className={cx(
        'min-h-[86px] rounded-xl border border-line-soft p-3.5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop animate-slide-up',
        toneGradient,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="mb-2.5 block text-[0.7rem] font-extrabold uppercase tracking-wider text-muted">{label}</span>
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

function PanelHeader({ icon: Icon, title }: { icon: IconComponent; title: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-gold-soft ring-1 ring-gold/30">
        <Icon className="h-[14px] w-[14px] text-gold-2" aria-hidden="true" />
      </div>
      <h2 className="m-0 font-display text-base font-bold tracking-tight">{title}</h2>
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

function EmptyState({ icon: Icon, title, hint }: { icon: IconComponent; title: string; hint?: string }) {
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

function InventorySection({ data, search }: { data: CardData; search: string }) {
  const rows = data.inventory.filter((item) => matchesSearch(item, search))

  return (
    <section className={tablePanelClass}>
      <TableHeader icon={Boxes} title="Inventory Catalog" />
      <div className="overflow-x-auto scrollbar-soft">
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={11}>
                  <EmptyState icon={Boxes} title="No inventory yet" hint="Use the Add button to track your first item." />
                </td>
              </tr>
            )}
            {rows.map((item, i) => {
              const onHand = quantityOnHand(item, data.sales)
              const cost = inventoryCostOnHand(item, data.sales, data.grading)
              const value = marketValueOnHand(item, data.sales)
              const unrealized = value - cost
              return (
                <tr key={item.id} className={cx(tableRowClass, 'animate-fade-in', onHand <= 0 && 'opacity-60')} style={rowDelay(i)}>
                  <td className="font-mono text-xs">{item.item_id}</td>
                  <td>{item.game}</td>
                  <td>
                    <strong>{item.name}</strong>
                    <span className="block text-xs text-muted">{[item.year, item.set_name, item.card_number].filter(Boolean).join(' / ')}</span>
                  </td>
                  <td>{item.product_type}</td>
                  <td>{item.condition}</td>
                  <td className={onHand <= 0 ? 'text-gold-2' : ''}>{onHand}</td>
                  <td>{currency(landedUnitCost(item, data.grading))}</td>
                  <td className={isMarketValueStale(item.market_value_date) ? 'text-gold-2' : ''}>
                    {currency(item.manual_market_value)}
                  </td>
                  <td>{currency(value)}</td>
                  <td className={unrealized >= 0 ? 'text-brand' : 'text-danger'}>{currency(unrealized)}</td>
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
      <div className="overflow-x-auto scrollbar-soft">
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
                  <EmptyState icon={ShoppingBag} title="No purchases yet" hint="Log a purchase lot to track your spend." />
                </td>
              </tr>
            )}
            {rows.map((purchase, i) => (
              <tr key={purchase.id} className={cx(tableRowClass, 'animate-fade-in')} style={rowDelay(i)}>
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
      <div className="overflow-x-auto scrollbar-soft">
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={12}>
                  <EmptyState icon={DollarSign} title="No sales yet" hint="Add a sale to see profit and margin." />
                </td>
              </tr>
            )}
            {rows.map((sale, i) => {
              const profit = saleProfit(sale, data.inventory, data.grading)
              return (
                <tr key={sale.id} className={cx(tableRowClass, 'animate-fade-in')} style={rowDelay(i)}>
                  <td>{sale.sale_date}</td>
                  <td>{sale.channel}</td>
                  <td className="font-mono text-xs">{sale.item_id}</td>
                  <td>{sale.quantity}</td>
                  <td>{currency(sale.gross_sale)}</td>
                  <td>{currency(saleFees(sale))}</td>
                  <td>{currency(saleNetProceeds(sale))}</td>
                  <td>{currency(saleCogs(sale, data.inventory, data.grading))}</td>
                  <td className={profit >= 0 ? 'text-brand' : 'text-danger'}>{currency(profit)}</td>
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
      <div className="overflow-x-auto scrollbar-soft">
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState icon={Gem} title="No submissions" hint="Track grading once you ship a card to PSA/BGS." />
                </td>
              </tr>
            )}
            {rows.map((submission, i) => (
              <tr key={submission.id} className={cx(tableRowClass, 'animate-fade-in')} style={rowDelay(i)}>
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
      <div className="overflow-x-auto scrollbar-soft">
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
                  <EmptyState icon={ReceiptText} title="No expenses logged" hint="Capture supplies, booth fees, and storage here." />
                </td>
              </tr>
            )}
            {rows.map((expense, i) => (
              <tr key={expense.id} className={cx(tableRowClass, 'animate-fade-in')} style={rowDelay(i)}>
                <td>{expense.expense_date}</td>
                <td>{expense.category}</td>
                <td>{expense.vendor}</td>
                <td>{currency(expense.amount)}</td>
                <td>{expense.payment_method}</td>
                <td className="max-w-[280px] whitespace-normal text-muted">{expense.notes}</td>
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
  const [dragActive, setDragActive] = useState(false)
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
        <label
          className={cx(
            'grid min-h-[170px] cursor-pointer place-items-center rounded-xl border border-dashed bg-canvas-2 p-6 text-center text-muted transition duration-200',
            dragActive ? 'border-brand bg-brand-soft/40 scale-[1.01]' : 'border-[#98aaa0] hover:border-brand hover:bg-brand-soft/30',
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
          <Upload className={cx('mb-2 h-8 w-8 transition-transform duration-200', dragActive ? 'text-brand scale-110' : 'text-brand')} aria-hidden="true" />
          <strong className="text-ink">Select or drop a CSV</strong>
          <span className="text-xs">Card Ladder export</span>
          {fileName && <span className="mt-2 text-xs font-mono text-muted">{fileName}</span>}
          <input className="sr-only" accept=".csv,text/csv" type="file" onChange={(event) => void handleFile(event.target.files?.[0])} />
        </label>

        {preview && (
          <div className="my-3.5 grid grid-cols-2 gap-2.5">
            <Kpi label="Rows" value={String(preview.inventory.length)} index={0} />
            <Kpi label="Cost" value={currency(preview.totals.cost)} index={1} />
            <Kpi label="Market" value={currency(preview.totals.marketValue)} tone="green" index={2} />
            <Kpi label="Unrealized" value={currency(preview.totals.unrealizedProfit)} tone="gold" index={3} />
          </div>
        )}

        {[...(preview?.warnings ?? []), ...duplicateWarnings].map((warning) => (
          <div className="mt-3 rounded-lg border border-[#eedba8] bg-gold-soft p-3 text-[#8a5d11] animate-fade-in-fast" key={warning}>
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
        {imported && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#c6e7d5] bg-brand-soft p-3 text-brand animate-fade-in-fast">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Import completed.
          </div>
        )}
      </div>

      <div className={tablePanelClass}>
        <TableHeader icon={Boxes} title="Preview" />
        <div className="overflow-x-auto scrollbar-soft">
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
                <tr key={item.item_id} className={cx(tableRowClass, 'animate-fade-in')} style={rowDelay(i)}>
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
                    <EmptyState icon={Inbox} title="No file selected" hint="Choose a Card Ladder CSV to preview rows." />
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
        <div className="overflow-x-auto scrollbar-soft">
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
                <tr key={preset.id} className={cx(tableRowClass, 'animate-fade-in')} style={rowDelay(i)}>
                  <td>{preset.channel}</td>
                  <td>{percent(preset.fee_rate)}</td>
                  <td>{currency(preset.fee_flat)}</td>
                  <td className="max-w-[280px] whitespace-normal text-muted">{preset.notes}</td>
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

function FormDrawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const [rendered, setRendered] = useState(open)

  useEffect(() => {
    if (open) {
      setRendered(true)
      return
    }
    const timer = setTimeout(() => setRendered(false), 240)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!rendered) return null

  return (
    <div
      className={cx(
        'fixed inset-0 z-50 bg-ink-3/40 backdrop-blur-sm',
        open ? 'animate-fade-in-fast' : 'animate-fade-out',
      )}
      role="presentation"
      onClick={onClose}
    >
      <aside
        className={cx(
          'ml-auto grid h-full w-[min(100vw,460px)] max-w-[460px] gap-4 overflow-y-auto rounded-l-2xl border-l border-line-soft bg-white p-5 shadow-pop scrollbar-soft',
          open ? 'animate-slide-in-right' : 'animate-slide-out-right',
        )}
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-soft pb-3">
          <h2 className="font-display text-base font-bold tracking-tight">{title}</h2>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink transition-colors duration-150 hover:bg-line"
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
          >
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
        'inline-flex min-w-[72px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ring-1',
        isGreen && 'bg-brand-soft text-brand ring-brand/15',
        isRed && 'bg-danger-soft text-danger ring-danger/15',
        isGold && 'bg-gold-soft text-gold-2 ring-gold/20',
        !isGreen && !isRed && !isGold && 'bg-info-soft text-info ring-info/15',
      )}
    >
      {isGold && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-2 animate-pulse-soft" aria-hidden="true" />
      )}
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
