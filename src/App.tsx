import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Gem,
  LayoutDashboard,
  Layers,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Upload,
  X,
} from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useCardStore } from './hooks/useCardStore'
import {
  currency,
  inventoryCostOnHand,
  isMarketValueStale,
  landedUnitCost,
  marketValueOnHand,
  quantityOnHand,
} from './lib/calculations'
import {
  isSupabaseConfigured,
  supabase,
  type AuthSession,
} from './lib/supabase'
import type { GradingSubmission, InventoryItem } from './lib/types'
import { CardArtwork } from './components/CardArtwork'
import { Dashboard } from './components/Dashboard'
import { Grading } from './components/Grading'
import { Drawer } from './components/Drawer'
import { Inventory } from './components/Inventory'
import { exportInventory } from './lib/export'
import {
  ExpenseForm,
  ExpensesSection,
  ImportSection,
  Input,
  InventoryForm,
  PurchaseForm,
  PurchasesSection,
  SaleForm,
  SalesSection,
  Select,
  SettingsSection,
} from './components/Operations'
import { cx, readNumber, readText, today } from './components/ui'

type Section =
  | 'dashboard'
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'grading'
  | 'expenses'
  | 'import'
  | 'settings'
type FormKind = 'inventory' | 'purchase' | 'sale' | 'expense' | 'grading'
const sections = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Your collection, performance, and everyday business.',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Layers,
    description: 'Browse your cards, check stock, and keep values current.',
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: CreditCard,
    description: 'Your sales, fees, and the profit you actually keep.',
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: ShoppingBag,
    description: 'Track where your inventory comes from and what it costs.',
  },
  {
    id: 'grading',
    label: 'Grading',
    icon: Gem,
    description: 'From submission to the final grade.',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: ReceiptText,
    description: 'The everyday costs of running your card business.',
  },
  {
    id: 'import',
    label: 'Import data',
    icon: Upload,
    description: 'Bring your Card Ladder collection into Stack.',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Make this workspace work for you.',
  },
] as const

function initialSection(): Section {
  const hash = window.location.hash.slice(1)
  return sections.some((section) => section.id === hash)
    ? (hash as Section)
    : 'dashboard'
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={cx('brand', small && 'brand-small')}>
      <span className="brand-symbol">
        <i />
        <i />
      </span>
      <span>
        stack<span className="brand-period">.</span>
      </span>
    </span>
  )
}

export default function App() {
  const [session, setSession] = useState<AuthSession>(null)
  const [privateMode, setPrivateMode] = useState(
    new URLSearchParams(window.location.search).get('workspace') === 'private',
  )
  const [loginOpen, setLoginOpen] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.unsubscribe()
  }, [])
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    try {
      const form = new FormData(event.currentTarget)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: readText(form, 'email'),
        password: readText(form, 'password'),
      })
      if (error) throw error
      setSession(data.session)
      setPrivateMode(true)
      setLoginOpen(false)
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setAuthBusy(false)
    }
  }
  return (
    <>
      <Workspace
        key={privateMode && session ? session.user.id : 'demo'}
        session={privateMode ? session : null}
        onSignIn={() => {
          if (session) setPrivateMode(true)
          else setLoginOpen(true)
        }}
        onDemo={() => setPrivateMode(false)}
        onSignOut={() => {
          void supabase?.auth.signOut()
          setPrivateMode(false)
        }}
      />
      <Drawer
        open={loginOpen || (privateMode && !session && isSupabaseConfigured)}
        title="Your collection is waiting."
        subtitle="Sign in to your private vendor workspace."
        onClose={() => {
          setLoginOpen(false)
          setPrivateMode(false)
        }}
        compact
      >
        {isSupabaseConfigured ? (
          <form className="form-stack" onSubmit={(event) => void signIn(event)}>
            <Input
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {authError && (
              <p className="form-error" role="alert">
                {authError}
              </p>
            )}
            <button
              className="button button-primary"
              disabled={authBusy}
              type="submit"
            >
              {authBusy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <LogIn size={16} />
              )}
              Sign in
            </button>
            <p className="muted small">
              Your private data stays in your account. The public demo uses a
              separate sample collection.
            </p>
          </form>
        ) : (
          <div className="guide-content">
            <ShieldCheck size={32} />
            <p>
              This preview runs locally. Configure your Supabase project to
              connect a private workspace.
            </p>
            <button
              className="button button-primary"
              onClick={() => setLoginOpen(false)}
            >
              Explore the demo <ArrowRight size={16} />
            </button>
          </div>
        )}
      </Drawer>
    </>
  )
}

function Workspace({
  session,
  onSignIn,
  onDemo,
  onSignOut,
}: {
  session: AuthSession
  onSignIn: () => void
  onDemo: () => void
  onSignOut: () => void
}) {
  const store = useCardStore(session)
  const [active, setActive] = useState<Section>(initialSection)
  const [mobileNav, setMobileNav] = useState(false)
  const [form, setForm] = useState<FormKind | null>(null)
  const [gradingEdit, setGradingEdit] = useState<GradingSubmission | null>(null)
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toast, setToast] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const current = sections.find((section) => section.id === active)!
  const stale = store.data.inventory.filter(
    (item) =>
      isMarketValueStale(item.market_value_date) &&
      quantityOnHand(item, store.data.sales) > 0,
  )
  const pending = store.data.sales.filter((sale) => sale.status === 'Paid')
  const action: Partial<Record<Section, { kind: FormKind; label: string }>> = {
    dashboard: { kind: 'inventory', label: 'Add inventory' },
    inventory: { kind: 'inventory', label: 'Add inventory' },
    purchases: { kind: 'purchase', label: 'Add purchase' },
    sales: { kind: 'sale', label: 'Record sale' },
    grading: { kind: 'grading', label: 'New submission' },
    expenses: { kind: 'expense', label: 'Add expense' },
  }
  function navigate(section: Section) {
    setActive(section)
    setTableSearch('')
    setMobileNav(false)
    window.history.pushState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${section}`,
    )
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function openForm(kind: FormKind) {
    setForm(kind)
    setSaveError('')
    setSelected(null)
    setGradingEdit(null)
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
      if (event.key === 'Escape') setMobileNav(false)
    }
    function hashchange() {
      const hash = window.location.hash.slice(1)
      if (hash && !sections.some((section) => section.id === hash)) return
      setActive(initialSection())
      setTableSearch('')
      setMobileNav(false)
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('hashchange', hashchange)
    window.addEventListener('popstate', hashchange)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('hashchange', hashchange)
      window.removeEventListener('popstate', hashchange)
    }
  }, [])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(id)
  }, [toast])
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])
  async function save(action: () => Promise<void>, message: string) {
    setSaving(true)
    setSaveError('')
    try {
      await action()
      setForm(null)
      setSelected(null)
      setToast(message)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'We couldn’t save this record. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }
  const results = store.data.inventory
    .filter((item) =>
      [item.name, item.set_name, item.cert_number, item.item_id]
        .join(' ')
        .toLowerCase()
        .includes(globalSearch.toLowerCase()),
    )
    .slice(0, 7)
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobileNav && (
        <button
          className="nav-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={cx('sidebar', mobileNav && 'is-open')}>
        <button
          className="brand-button"
          aria-label="Stack overview"
          onClick={() => navigate('dashboard')}
        >
          <Brand />
        </button>
        <div className="workspace-select">
          <div className="workspace-avatar">S</div>
          <div>
            <strong>My workspace</strong>
            <span>
              {store.mode === 'demo' ? 'Demo collection' : 'Private collection'}
            </span>
          </div>
          <ChevronDown size={15} />
          <select
            aria-label="Switch workspace"
            value={store.mode}
            onChange={(event) =>
              event.target.value === 'demo' ? onDemo() : onSignIn()
            }
          >
            <option value="demo">Demo collection</option>
            <option value="supabase">Private collection</option>
          </select>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {sections.slice(0, 5).map((section) => (
            <button
              key={section.id}
              aria-current={active === section.id ? 'page' : undefined}
              className={cx('nav-item', active === section.id && 'active')}
              onClick={() => navigate(section.id)}
            >
              <section.icon size={18} strokeWidth={1.65} />
              <span>{section.label}</span>
              {section.id === 'inventory' && (
                <span className="nav-count">{store.data.inventory.length}</span>
              )}
              {active === section.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <span className="nav-label tools-label">MANAGE</span>
        <nav aria-label="Management">
          {sections.slice(5).map((section) => (
            <button
              key={section.id}
              aria-current={active === section.id ? 'page' : undefined}
              className={cx('nav-item', active === section.id && 'active')}
              onClick={() => navigate(section.id)}
            >
              <section.icon size={18} strokeWidth={1.65} />
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-symbol">✳</span>
            <strong>
              A good collection
              <br />
              deserves a good system.
            </strong>
            <p>
              Less spreadsheet.
              <br />
              More collecting.
            </p>
            <button
              onClick={() => {
                navigate('import')
              }}
            >
              Bring your cards over <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setGuideOpen(true)}>
            <CircleHelp size={18} strokeWidth={1.65} />
            <span>Help & getting started</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-profile">
            <div className="profile-avatar">
              {session ? session.user.email?.slice(0, 1).toUpperCase() : 'S'}
            </div>
            <div>
              <strong>
                {session ? session.user.email?.split('@')[0] : 'The collector'}
              </strong>
              <span>
                {store.mode === 'demo' ? 'Demo workspace' : 'Private workspace'}
              </span>
            </div>
            <button
              className="icon-button"
              aria-label={session ? 'Sign out' : 'Sign in to private workspace'}
              onClick={session ? onSignOut : onSignIn}
            >
              {session ? <LogOut size={16} /> : <LogIn size={16} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav((open) => !open)}
              aria-label="Open navigation"
              aria-expanded={mobileNav}
            >
              <Menu size={21} />
            </button>
            <span className="mobile-wordmark">
              <Brand small />
            </span>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{current.label}</strong>
          </div>
          <div className="topbar-actions">
            <button
              aria-label="Search anything"
              className="global-search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="notification-button"
              aria-label="Workspace updates"
              onClick={() => setNotificationsOpen(true)}
            >
              <span className="notification-icon">
                <ReceiptText size={18} />
              </span>
              {(stale.length > 0 || pending.length > 0) && <i />}
            </button>
            <button
              className="topbar-avatar"
              onClick={() => navigate('settings')}
              aria-label="Workspace settings"
            >
              {session ? session.user.email?.slice(0, 1).toUpperCase() : 'S'}
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                YOUR VENDOR WORKSPACE <span />
              </div>
              <h1>
                {current.label}
                <span className="heading-dot">.</span>
              </h1>
              <p>{current.description}</p>
            </div>
            <div className="page-actions">
              {active === 'dashboard' && (
                <button
                  className="button button-secondary"
                  onClick={() =>
                    exportInventory(store.data.inventory, store.data)
                  }
                >
                  <ArrowDownToLine size={15} />
                  Export inventory
                </button>
              )}
              {action[active] && (
                <button
                  className="button button-primary"
                  onClick={() => openForm(action[active]!.kind)}
                >
                  <Plus size={17} />
                  {action[active]!.label}
                </button>
              )}
            </div>
          </div>
          {store.mode === 'demo' && (
            <div className="demo-banner">
              <span>
                <span className="demo-dot" />
                You’re exploring a demo collection.
                <span className="demo-banner-detail">
                  {' '}
                  Make it yours—changes save in this browser.
                </span>
              </span>
              <button onClick={() => setGuideOpen(true)}>
                Take a look around <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {store.error && (
            <div role="alert" className="form-error">
              {store.error}
              <button
                className="text-button"
                onClick={() => void store.refresh()}
              >
                Try again
              </button>
            </div>
          )}
          {store.loading ? (
            <div className="loading-workspace" aria-label="Loading workspace">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : (
            <div key={active} className="page-enter">
              {active === 'dashboard' && (
                <Dashboard
                  data={store.data}
                  onInventory={() => navigate('inventory')}
                  onSales={() => navigate('sales')}
                  onItem={(item) => {
                    setSaveError('')
                    setSelected(item)
                  }}
                  onAdd={() => openForm('inventory')}
                />
              )}
              {active === 'inventory' && (
                <Inventory
                  data={store.data}
                  onItem={(item) => {
                    setSaveError('')
                    setSelected(item)
                  }}
                  onAdd={() => openForm('inventory')}
                  search={tableSearch}
                  onSearch={setTableSearch}
                />
              )}
              {['purchases', 'sales', 'grading', 'expenses'].includes(
                active,
              ) && (
                <div className="operation-search">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      aria-label={`Search ${current.label.toLowerCase()}`}
                      placeholder={`Search ${current.label.toLowerCase()}…`}
                      value={tableSearch}
                      onChange={(event) => setTableSearch(event.target.value)}
                    />
                  </label>
                  <span>
                    {active === 'sales'
                      ? store.data.sales.length
                      : active === 'purchases'
                        ? store.data.purchases.length
                        : active === 'grading'
                          ? store.data.grading.length
                          : store.data.expenses.length}{' '}
                    records
                  </span>
                </div>
              )}
              {active === 'purchases' && (
                <PurchasesSection data={store.data} search={tableSearch} />
              )}
              {active === 'sales' && (
                <SalesSection
                  data={store.data}
                  search={tableSearch}
                  onStatusChange={async (id, status) => {
                    await store.updateSaleStatus(id, status)
                    setToast('Sale status updated.')
                  }}
                />
              )}
              {active === 'grading' && (
                <Grading
                  data={store.data}
                  search={tableSearch}
                  onAdd={() => openForm('grading')}
                  onEdit={(row) => {
                    setGradingEdit(row)
                    setSaveError('')
                    setForm('grading')
                  }}
                />
              )}
              {active === 'expenses' && (
                <ExpensesSection data={store.data} search={tableSearch} />
              )}
              {active === 'import' && (
                <ImportSection
                  data={store.data}
                  parseCsvText={store.parseCsvText}
                  onImport={store.importCardLadder}
                />
              )}
              {active === 'settings' && (
                <SettingsSection
                  data={store.data}
                  onSavePreset={store.saveFeePreset}
                  onResetDemo={
                    store.mode === 'demo'
                      ? () => {
                          store.resetDemoData()
                          setToast('Demo collection restored.')
                        }
                      : undefined
                  }
                />
              )}
            </div>
          )}
          <footer className="workspace-footer">
            <span>
              <span className="status-dot" />
              {store.mode === 'demo'
                ? 'Saved in this browser'
                : 'Private workspace'}
              <span className="footer-separator">/</span> USD
            </span>
            <span>
              Made for the love of the hobby.
              <span className="footer-brand">stack.</span>
            </span>
          </footer>
        </main>
      </div>
      <Drawer
        open={form !== null}
        title={
          form === 'inventory'
            ? 'A new addition.'
            : form === 'purchase'
              ? 'Record a purchase.'
              : form === 'sale'
                ? 'Make it a sale.'
                : form === 'grading'
                  ? gradingEdit
                    ? 'Update a submission.'
                    : 'Off to the grader.'
                  : 'Track an expense.'
        }
        subtitle="The details now. A clearer picture later."
        onClose={() => {
          if (!saving) setForm(null)
        }}
      >
        {saveError && (
          <p role="alert" className="form-error">
            {saveError}
          </p>
        )}
        <fieldset className="form-fieldset" disabled={saving}>
          {form === 'inventory' && (
            <InventoryForm
              onSubmit={(input) =>
                void save(
                  () => store.addInventory(input),
                  'Card added to your inventory.',
                )
              }
            />
          )}
          {form === 'purchase' && (
            <PurchaseForm
              onSubmit={(input) =>
                void save(() => store.addPurchase(input), 'Purchase recorded.')
              }
            />
          )}
          {form === 'sale' && (
            <SaleForm
              data={store.data}
              onSubmit={(input) =>
                void save(
                  () => store.addSale(input),
                  'Sale recorded. Inventory updated.',
                )
              }
            />
          )}
          {form === 'expense' && (
            <ExpenseForm
              onSubmit={(input) =>
                void save(() => store.addExpense(input), 'Expense recorded.')
              }
            />
          )}
          {form === 'grading' && (
            <GradingForm
              key={gradingEdit?.id || 'new'}
              data={store.data.inventory}
              initial={gradingEdit}
              onSubmit={(input) =>
                void save(
                  () =>
                    gradingEdit
                      ? store.updateGrading(gradingEdit.id, input)
                      : store.addGrading(input),
                  gradingEdit
                    ? 'Submission updated.'
                    : 'Grading submission recorded.',
                )
              }
            />
          )}
        </fieldset>
        {saving && (
          <p className="saving-message" role="status">
            <LoaderCircle size={16} className="spin" /> Saving your record…
          </p>
        )}
      </Drawer>
      <Drawer
        open={selected !== null}
        title={selected?.name || 'Card details'}
        subtitle={selected?.set_name}
        onClose={() => {
          if (!saving) {
            setSelected(null)
            setSaveError('')
          }
        }}
      >
        {selected && (
          <>
            <div className="detail-art colorway-0">
              <CardArtwork
                item={selected}
                slab={selected.product_type === 'Slab'}
              />
            </div>
            <div className="detail-tags">
              <span className="badge">
                {selected.game === 'Pokemon' ? 'Pokémon' : selected.game}
              </span>
              <span className="badge">{selected.condition}</span>
              <span className="badge">
                {selected.card_number || selected.item_id}
              </span>
            </div>
            <div className="detail-stats">
              <div>
                <span>Market / card</span>
                <strong>{currency(selected.manual_market_value)}</strong>
              </div>
              <div>
                <span>Cost / card</span>
                <strong>
                  {currency(landedUnitCost(selected, store.data.grading))}
                </strong>
              </div>
              <div>
                <span>On hand</span>
                <strong>
                  {quantityOnHand(selected, store.data.sales)} cards
                </strong>
              </div>
              <div>
                <span>Unrealized gain</span>
                <strong
                  className={
                    marketValueOnHand(selected, store.data.sales) >=
                    inventoryCostOnHand(
                      selected,
                      store.data.sales,
                      store.data.grading,
                    )
                      ? 'positive'
                      : 'negative'
                  }
                >
                  {currency(
                    marketValueOnHand(selected, store.data.sales) -
                      inventoryCostOnHand(
                        selected,
                        store.data.sales,
                        store.data.grading,
                      ),
                  )}
                </strong>
              </div>
            </div>
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault()
                const entry = new FormData(event.currentTarget)
                void save(
                  () =>
                    store.updateInventory(selected.id, {
                      manual_market_value: readNumber(entry, 'value'),
                      market_value_date: today(),
                      notes: readText(entry, 'notes'),
                    }),
                  'Card details updated.',
                )
              }}
            >
              <h3 className="detail-form-title">
                Keep your collection current
              </h3>
              <Input
                label="Market value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                defaultValue={selected.manual_market_value}
                required
              />
              <label className="field-label">
                Notes
                <textarea
                  name="notes"
                  className="field-input"
                  defaultValue={selected.notes}
                  rows={3}
                />
              </label>
              {saveError && (
                <p className="form-error" role="alert">
                  {saveError}
                </p>
              )}
              <button
                className="button button-primary"
                disabled={saving}
                type="submit"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
            <p className="small muted detail-meta">
              Valued {selected.market_value_date}
              {selected.cert_number && ` · Cert ${selected.cert_number}`}
            </p>
          </>
        )}
      </Drawer>
      <Drawer
        open={searchOpen}
        title="Find something in your stack."
        onClose={() => setSearchOpen(false)}
        compact
      >
        <label className="search-field command-search">
          <Search size={19} />
          <input
            ref={searchRef}
            aria-label="Search workspace"
            placeholder="Search a card, set, or certificate…"
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
          />
        </label>
        <div className="command-results">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelected(item)
                setSaveError('')
                setSearchOpen(false)
              }}
            >
              <CardArtwork item={item} />
              <span>
                <strong>{item.name}</strong>
                <small>{item.set_name}</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          ))}
          {!results.length && (
            <p className="empty-text muted">
              No cards found. Try another name or set.
            </p>
          )}
        </div>
        <span className="eyebrow command-nav-label">GO TO</span>
        <div className="command-navigation">
          {sections
            .filter((section) =>
              section.label.toLowerCase().includes(globalSearch.toLowerCase()),
            )
            .map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  navigate(section.id)
                  setSearchOpen(false)
                }}
              >
                <section.icon size={16} />
                {section.label}
                <ArrowRight size={14} />
              </button>
            ))}
        </div>
      </Drawer>
      <Drawer
        open={guideOpen}
        title="Welcome to your workspace."
        subtitle="A small guide to a better-organized collection."
        onClose={() => setGuideOpen(false)}
        compact
      >
        <div className="guide-content">
          {[
            [
              Boxes,
              'Build your inventory',
              'Add cards individually or bring in a Card Ladder CSV. Keep purchase costs and market values together.',
            ],
            [
              CreditCard,
              'Know your real profit',
              'Record a sale and your stock updates automatically. Fees, shipping, and card costs are included in profit.',
            ],
            [
              Gem,
              'Follow the whole journey',
              'Log grading submissions and track expenses alongside your inventory.',
            ],
          ].map(([Icon, title, description]) => {
            const GuideIcon = Icon as typeof Boxes
            return (
              <div className="guide-step" key={String(title)}>
                <GuideIcon size={22} />
                <div>
                  <h3>{String(title)}</h3>
                  <p>{String(description)}</p>
                </div>
              </div>
            )
          })}
          <div className="guide-note">
            <ShieldCheck size={18} />
            <p>
              {store.mode === 'demo'
                ? 'This demo uses fictional records and illustrative prices. Your changes stay in this browser. Sign in to use your private collection.'
                : 'Your collection is protected by your account. Market values are entered manually or imported; this workspace does not provide a live price feed.'}
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => {
              setGuideOpen(false)
              navigate('inventory')
            }}
          >
            Explore your inventory <ArrowRight size={16} />
          </button>
        </div>
      </Drawer>
      <Drawer
        open={notificationsOpen}
        title="A few things to check."
        onClose={() => setNotificationsOpen(false)}
        compact
      >
        <div className="guide-content">
          <div className="update-item">
            <span className="update-dot" />
            <div>
              <h3>
                {stale.length}{' '}
                {stale.length === 1 ? 'card needs' : 'cards need'} a price
                refresh
              </h3>
              <p>These market values are over 30 days old.</p>
              {stale.map((item) => (
                <button
                  className="text-button"
                  key={item.id}
                  onClick={() => {
                    setSelected(item)
                    setNotificationsOpen(false)
                  }}
                >
                  {item.name}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
          <div className="update-item">
            <span className="status-dot" />
            <div>
              <h3>
                {pending.length} paid {pending.length === 1 ? 'sale' : 'sales'}
              </h3>
              <p>Review paid orders in your sales records.</p>
              <button
                className="text-button"
                onClick={() => {
                  navigate('sales')
                  setNotificationsOpen(false)
                }}
              >
                Open sales
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </Drawer>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

function GradingForm({
  data,
  initial,
  onSubmit,
}: {
  data: InventoryItem[]
  initial: GradingSubmission | null
  onSubmit: (input: Omit<GradingSubmission, 'id'>) => void
}) {
  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        onSubmit({
          submission_id: readText(form, 'submission_id'),
          item_id: readText(form, 'item_id'),
          company: readText(form, 'company'),
          submission_date: readText(form, 'date'),
          grading_fee: readNumber(form, 'fee'),
          shipping_fee: readNumber(form, 'shipping'),
          status: readText(form, 'status') as GradingSubmission['status'],
          notes: readText(form, 'notes'),
          grade_result: readText(form, 'grade'),
          cert_number: readText(form, 'cert'),
          returned_date: readText(form, 'returned') || undefined,
        })
      }}
    >
      <Input
        label="Submission ID"
        name="submission_id"
        defaultValue={initial?.submission_id}
        required
      />
      <label className="field-label">
        Card
        <select
          aria-label="Card"
          className="field-input"
          name="item_id"
          defaultValue={initial?.item_id}
          required
        >
          {data.map((item) => (
            <option key={item.id} value={item.item_id}>
              {item.name} · {item.item_id}
            </option>
          ))}
        </select>
      </label>
      <Select
        label="Grading company"
        name="company"
        options={['PSA', 'BGS', 'CGC', 'SGC', 'Other']}
        defaultValue={initial?.company}
      />
      <Input
        label="Submission date"
        name="date"
        type="date"
        defaultValue={initial?.submission_date || today()}
        required
      />
      <Select
        label="Status"
        name="status"
        options={['Preparing', 'Submitted', 'Grading', 'Returned', 'Complete']}
        defaultValue={initial?.status}
      />
      <div className="form-columns">
        <Input
          label="Grading fee"
          name="fee"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initial?.grading_fee}
          required
        />
        <Input
          label="Shipping fee"
          name="shipping"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initial?.shipping_fee || '0'}
        />
      </div>
      <div className="form-columns">
        <Input
          label="Final grade"
          name="grade"
          defaultValue={initial?.grade_result}
        />
        <Input
          label="Returned date"
          name="returned"
          type="date"
          defaultValue={initial?.returned_date}
        />
      </div>
      <Input
        label="Certificate number"
        name="cert"
        defaultValue={initial?.cert_number}
      />
      <label className="field-label">
        Notes
        <textarea
          name="notes"
          className="field-input"
          defaultValue={initial?.notes}
          rows={3}
        />
      </label>
      <button
        className="button button-primary"
        type="submit"
        disabled={!data.length}
      >
        Save submission
      </button>
      {!data.length && (
        <p className="muted small">
          Add inventory before creating a submission.
        </p>
      )}
    </form>
  )
}
