import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleDollarSign,
  Gem,
  Layers,
  Package,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import {
  activeSales,
  currency,
  dashboardTotals,
  inventoryCostOnHand,
  marketValueOnHand,
  percent,
  quantityOnHand,
  saleProfit,
} from '../lib/calculations'
import type { CardData, InventoryItem } from '../lib/types'
import { CardArtwork } from './CardArtwork'
import { cx } from './ui'

export function Dashboard({
  data,
  onInventory,
  onSales,
  onItem,
  onAdd,
}: {
  data: CardData
  onInventory: () => void
  onSales: () => void
  onItem: (item: InventoryItem) => void
  onAdd: () => void
}) {
  const totals = dashboardTotals(data)
  const topItems = [...data.inventory]
    .filter((item) => quantityOnHand(item, data.sales) > 0)
    .sort(
      (a, b) =>
        marketValueOnHand(b, data.sales) - marketValueOnHand(a, data.sales),
    )
  const featured =
    data.inventory.find((item) => item.id === 'showcase-charizard') ??
    topItems[0]
  const recentSales = [...activeSales(data.sales)]
    .sort((a, b) => b.sale_date.localeCompare(a.sale_date))
    .slice(0, 4)
  const submitted = data.grading.filter(
    (item) => !['Complete', 'Returned'].includes(item.status),
  ).length
  const expenses = data.expenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  )

  return (
    <div className="overview-layout">
      <section className="portfolio-summary" aria-label="Collection summary">
        <div className="portfolio-total">
          <span className="eyebrow">
            <span className="live-dot" /> Total collection value
          </span>
          <div className="big-number">
            {currency(totals.marketValue).split('.')[0]}
            <span>.{currency(totals.marketValue).split('.')[1]}</span>
          </div>
          <div
            className={cx(
              'gain-line',
              totals.unrealizedProfit < 0 && 'negative',
            )}
          >
            <TrendingUp size={15} />
            <strong>
              {totals.unrealizedProfit >= 0 ? '+' : ''}
              {currency(totals.unrealizedProfit)}
            </strong>
            <span>
              (
              {percent(
                totals.inventoryCost
                  ? totals.unrealizedProfit / totals.inventoryCost
                  : 0,
              )}
              ) on cost
            </span>
          </div>
        </div>
        <div className="summary-stat">
          <div>
            <Package size={16} />
            <span>Items on hand</span>
          </div>
          <strong>
            {totals.unitsOnHand}
            <small> cards</small>
          </strong>
          <span>Across {data.inventory.length} unique items</span>
        </div>
        <div className="summary-stat">
          <div>
            <CircleDollarSign size={16} />
            <span>Realized profit</span>
          </div>
          <strong>{currency(totals.realizedProfit)}</strong>
          <span>After fees & card costs</span>
        </div>
        <div className="summary-stat">
          <div>
            <Gem size={16} />
            <span>At the grader</span>
          </div>
          <strong>
            {submitted}
            <small> {submitted === 1 ? 'submission' : 'submissions'}</small>
          </strong>
          <span>
            {submitted
              ? 'Follow progress in Grading'
              : 'All submissions returned'}
          </span>
        </div>
      </section>

      <div className="overview-middle">
        <SalesChart data={data} />
        {featured ? (
          <section className="spotlight">
            <div className="spotlight-top">
              <span>
                <span className="sparkle-mark">✦</span> In the spotlight
              </span>
              <span className="spotlight-tag">
                {featured.game === 'Pokemon' ? 'Pokémon' : featured.game}
              </span>
            </div>
            <button
              className="spotlight-art"
              onClick={() => onItem(featured)}
              aria-label={`View ${featured.name}`}
            >
              <span className="spotlight-circle" />
              <CardArtwork
                item={featured}
                slab={featured.product_type === 'Slab'}
              />
            </button>
            <div className="spotlight-bottom">
              <div>
                <h2>{featured.name}</h2>
                <p>
                  {featured.set_name} · #{featured.card_number?.split('/')[0]}
                </p>
                <strong>
                  {currency(featured.manual_market_value)}
                  <span> market value</span>
                </strong>
              </div>
              <button
                className="round-arrow"
                onClick={() => onItem(featured)}
                aria-label={`Open ${featured.name} details`}
              >
                <ArrowUpRight size={21} />
              </button>
            </div>
          </section>
        ) : (
          <section className="spotlight empty-spotlight">
            <Layers size={42} strokeWidth={1} />
            <h2>Your next great find starts here.</h2>
            <button className="button button-light" onClick={onAdd}>
              Add your first card <ArrowRight size={16} />
            </button>
          </section>
        )}
      </div>

      <section className="collection-section">
        <div className="section-heading">
          <div>
            <h2>
              Collection highlights <span>{data.inventory.length}</span>
            </h2>
            <p>A closer look at what’s in your stack.</p>
          </div>
          <button className="text-button" onClick={onInventory}>
            View inventory <ArrowRight size={16} />
          </button>
        </div>
        {topItems.length ? (
          <div className="highlight-grid">
            {topItems.slice(0, 4).map((item, index) => {
              const cost = inventoryCostOnHand(item, data.sales, data.grading)
              const value = marketValueOnHand(item, data.sales)
              const gain = cost ? (value - cost) / cost : 0
              return (
                <button
                  className="highlight-card"
                  key={item.id}
                  onClick={() => onItem(item)}
                >
                  <div className={`highlight-image colorway-${index}`}>
                    <span className="card-type">
                      {item.product_type === 'Slab'
                        ? item.condition
                        : item.product_type === 'Raw Single'
                          ? `Raw · ${item.condition}`
                          : item.product_type}
                    </span>
                    <CardArtwork item={item} />
                    <span className="card-open">
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                  <div className="highlight-info">
                    <h3>{item.name}</h3>
                    <p>{item.set_name}</p>
                    <div>
                      <strong>{currency(item.manual_market_value)}</strong>
                      <span
                        className={cx('return-label', gain < 0 && 'negative')}
                      >
                        <ArrowUpRight size={12} />
                        {percent(gain)}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="empty-inline">
            <Package size={26} />
            <p>Add inventory to see your collection here.</p>
            <button className="button button-primary" onClick={onAdd}>
              Add inventory
            </button>
          </div>
        )}
      </section>

      <div className="overview-bottom">
        <section className="surface recent-sales">
          <div className="section-heading">
            <h2>Recent sales</h2>
            <button className="text-button" onClick={onSales}>
              View all <ArrowRight size={15} />
            </button>
          </div>
          {recentSales.length ? (
            recentSales.map((sale) => {
              const item = data.inventory.find(
                (item) => item.item_id === sale.item_id,
              )
              return (
                <div className="sale-activity" key={sale.id}>
                  <div className="activity-icon">
                    <ArrowUpRight size={17} />
                  </div>
                  <div>
                    <strong>{item?.name ?? sale.item_id}</strong>
                    <span>
                      {sale.channel} ·{' '}
                      {new Date(
                        `${sale.sale_date}T12:00:00`,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="activity-value">
                    <strong>{currency(sale.gross_sale)}</strong>
                    <span>
                      {currency(saleProfit(sale, data.inventory, data.grading))}{' '}
                      profit
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="muted empty-text">
              Your sales will appear here once you record one.
            </p>
          )}
        </section>
        <section className="surface allocation-panel">
          <div className="section-heading">
            <h2>Collection breakdown</h2>
            <Layers size={17} className="muted" />
          </div>
          {['Pokemon', 'One Piece', 'Other'].map((game, i) => {
            const items = data.inventory.filter((item) => item.game === game)
            const value = items.reduce(
              (total, item) => total + marketValueOnHand(item, data.sales),
              0,
            )
            if (!items.length) return null
            return (
              <div className="allocation-row" key={game}>
                <div>
                  <span className={`allocation-dot allocation-${i}`} />
                  <strong>{game === 'Pokemon' ? 'Pokémon' : game}</strong>
                  <span>
                    {percent(
                      totals.marketValue ? value / totals.marketValue : 0,
                    )}
                  </span>
                </div>
                <div className="allocation-track">
                  <span
                    className={`allocation-${i}`}
                    style={{
                      width: `${totals.marketValue ? (value / totals.marketValue) * 100 : 0}%`,
                    }}
                  />
                </div>
                <small>
                  {currency(value)} ·{' '}
                  {items.reduce(
                    (total, item) => total + quantityOnHand(item, data.sales),
                    0,
                  )}{' '}
                  cards
                </small>
              </div>
            )
          })}
          <div className="expense-note">
            <ShoppingBag size={15} />
            <span>Operating expenses</span>
            <strong>{currency(expenses)}</strong>
          </div>
        </section>
      </div>
    </div>
  )
}

export function SalesChart({ data }: { data: CardData }) {
  const [period, setPeriod] = useState(90)
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales')
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId()
  const chart = useMemo(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const all = activeSales(data.sales)
    const firstDate = [...all].sort((a, b) =>
      a.sale_date.localeCompare(b.sale_date),
    )[0]?.sale_date
    const days =
      period ||
      Math.max(
        30,
        firstDate
          ? Math.ceil(
              (end.getTime() - new Date(`${firstDate}T00:00:00`).getTime()) /
                86400000,
            )
          : 30,
      )
    const start = new Date(end)
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)
    const entries = all.filter(
      (sale) =>
        sale.sale_date >= localDate(start) && sale.sale_date <= localDate(end),
    )
    const points = Array.from({ length: 31 }, (_, i) => {
      const until = new Date(
        start.getTime() + ((end.getTime() - start.getTime()) * i) / 30,
      )
      const sales = entries.filter((sale) => sale.sale_date <= localDate(until))
      return {
        date: until,
        value: sales.reduce(
          (sum, sale) =>
            sum +
            (metric === 'sales'
              ? sale.gross_sale
              : saleProfit(sale, data.inventory, data.grading)),
          0,
        ),
      }
    })
    return {
      points,
      count: entries.length,
      total: points.at(-1)?.value ?? 0,
      start,
      end,
    }
  }, [data, period, metric])
  const max = Math.max(...chart.points.map((point) => point.value), 1)
  const min = Math.min(...chart.points.map((point) => point.value), 0)
  const coords = chart.points.map((point, i) => [
    (i * 710) / 30,
    142 - ((point.value - min) / (max - min)) * 124,
  ])
  const path = coords
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const selected = hover === null ? null : chart.points[hover]
  return (
    <section
      className="surface chart-panel"
      aria-label="Sales performance chart"
    >
      <div className="chart-heading">
        <h2>Sales performance</h2>
        <div className="period-switch" aria-label="Chart period">
          {[
            [30, '1M'],
            [90, '3M'],
            [180, '6M'],
            [365, '1Y'],
            [0, 'All'],
          ].map(([days, label]) => (
            <button
              key={days}
              aria-pressed={period === days}
              className={cx(period === days && 'active')}
              onClick={() => {
                setPeriod(Number(days))
                setHover(null)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-total">
        <strong>{currency(selected?.value ?? chart.total)}</strong>
        <span>
          {selected
            ? selected.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : `${chart.count} sales in this period`}
        </span>
        <button
          className="chart-metric"
          onClick={() =>
            setMetric((current) => (current === 'sales' ? 'profit' : 'sales'))
          }
        >
          {metric === 'sales' ? 'Gross revenue' : 'Net card profit'}
          <ChevronDown size={13} />
        </button>
      </div>
      <div className="chart-canvas">
        <div className="chart-y-labels">
          {[1, 0.66, 0.33, 0].map((scale) => (
            <span key={scale}>{compactMoney(min + (max - min) * scale)}</span>
          ))}
        </div>
        <svg
          viewBox="0 0 710 155"
          role="img"
          aria-label={`Cumulative ${metric === 'sales' ? 'gross sales' : 'card profit'}: ${currency(chart.total)} from ${chart.count} sales`}
          preserveAspectRatio="none"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setHover(
              Math.max(
                0,
                Math.min(
                  30,
                  Math.round(((event.clientX - rect.left) / rect.width) * 30),
                ),
              ),
            )
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8dab91" stopOpacity=".18" />
              <stop offset="100%" stopColor="#8dab91" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[18, 59, 100, 142].map((y) => (
            <line
              key={y}
              x1="0"
              x2="710"
              y1={y}
              y2={y}
              stroke="#ebede8"
              strokeDasharray="3 5"
            />
          ))}
          <path d={`${path} L710,155 L0,155 Z`} fill={`url(#${gradientId})`} />
          <path
            d={path}
            fill="none"
            stroke="#6c8d74"
            strokeWidth="2.3"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {hover !== null && (
            <g>
              <line
                x1={coords[hover][0]}
                x2={coords[hover][0]}
                y1="0"
                y2="155"
                stroke="#9aad9e"
                strokeDasharray="4 4"
              />
              <circle
                cx={coords[hover][0]}
                cy={coords[hover][1]}
                r="4"
                fill="#6c8d74"
                stroke="white"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>
      <div className="chart-x-labels">
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((fraction) => (
          <span key={fraction}>
            {new Date(
              chart.start.getTime() +
                (chart.end.getTime() - chart.start.getTime()) * fraction,
            ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
      <div className="chart-footer">
        <span>
          <i />
          {metric === 'sales'
            ? 'Gross sales'
            : 'Profit after fees & card costs'}
        </span>
        <span>
          <ArrowDownLeft size={12} /> Based on recorded transactions
        </span>
      </div>
    </section>
  )
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function compactMoney(value: number) {
  return value >= 1000
    ? `$${(value / 1000).toFixed(1)}k`
    : `$${Math.round(value)}`
}
