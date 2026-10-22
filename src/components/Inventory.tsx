import {
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpRight,
  LayoutGrid,
  List,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  currency,
  inventoryCostOnHand,
  landedUnitCost,
  marketValueOnHand,
  percent,
  quantityOnHand,
} from '../lib/calculations'
import type { CardData, InventoryItem } from '../lib/types'
import { CardArtwork } from './CardArtwork'
import { cx } from './ui'
import { exportInventory } from '../lib/export'

export function Inventory({
  data,
  onItem,
  onAdd,
  search,
  onSearch,
}: {
  data: CardData
  onItem: (item: InventoryItem) => void
  onAdd: () => void
  search: string
  onSearch: (search: string) => void
}) {
  const [game, setGame] = useState('All cards')
  const [type, setType] = useState('All types')
  const [sort, setSort] = useState('value')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const rows = data.inventory
    .filter(
      (item) =>
        (!search ||
          [
            item.name,
            item.set_name,
            item.item_id,
            item.cert_number,
            item.card_number,
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (game === 'All cards' || item.game === game) &&
        (type === 'All types' || item.product_type === type),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'cost'
          ? landedUnitCost(b, data.grading) - landedUnitCost(a, data.grading)
          : marketValueOnHand(b, data.sales) - marketValueOnHand(a, data.sales),
    )
  return (
    <section className="inventory-workspace">
      <div className="inventory-tabs" aria-label="Filter by game">
        {['All cards', 'Pokemon', 'One Piece', 'Other'].map((label) => (
          <button
            key={label}
            className={cx(game === label && 'active')}
            aria-pressed={game === label}
            onClick={() => setGame(label)}
          >
            {label === 'Pokemon' ? 'Pokémon' : label}
            <span>
              {
                data.inventory.filter(
                  (item) => label === 'All cards' || item.game === label,
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="inventory-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search inventory"
            placeholder="Search cards, sets, or certs…"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
          {search && (
            <button
              aria-label="Clear inventory search"
              onClick={() => onSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="inventory-controls">
          <select
            aria-label="Product type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {[
              'All types',
              'Raw Single',
              'Slab',
              'Sealed',
              'Bulk',
              'Accessory',
            ].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <label className="sort-control">
            <ArrowUpDown size={14} />
            <select
              aria-label="Sort inventory"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="value">Highest value</option>
              <option value="name">Name A–Z</option>
              <option value="cost">Highest cost</option>
            </select>
          </label>
          <div className="view-switch">
            <button
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List size={17} />
            </button>
          </div>
          <button
            className="button button-secondary export-button"
            onClick={() => exportInventory(rows, data)}
          >
            <ArrowDownToLine size={15} />
            Export
          </button>
        </div>
      </div>
      <div className="inventory-results">
        <span>
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </span>
        <span>
          {currency(
            rows.reduce(
              (total, item) => total + marketValueOnHand(item, data.sales),
              0,
            ),
          )}{' '}
          total value
        </span>
      </div>
      {!rows.length ? (
        <div className="empty-inline spacious">
          <Package size={36} strokeWidth={1.3} />
          <h2>
            {search || game !== 'All cards' || type !== 'All types'
              ? 'No cards match your filters'
              : 'Make room for your first find'}
          </h2>
          <p>
            {search || game !== 'All cards' || type !== 'All types'
              ? 'Try a different search or clear your filters.'
              : 'Add a card or import your collection to get started.'}
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              if (search || game !== 'All cards' || type !== 'All types') {
                onSearch('')
                setGame('All cards')
                setType('All types')
              } else onAdd()
            }}
          >
            {search || game !== 'All cards' || type !== 'All types' ? (
              'Clear filters'
            ) : (
              <>
                <Plus size={16} />
                Add inventory
              </>
            )}
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="inventory-card-grid">
          {rows.map((item, index) => {
            const cost = inventoryCostOnHand(item, data.sales, data.grading)
            const value = marketValueOnHand(item, data.sales)
            return (
              <button
                className="inventory-card"
                key={item.id}
                onClick={() => onItem(item)}
              >
                <div className={`inventory-card-image colorway-${index % 4}`}>
                  <span className="card-type">
                    {item.product_type === 'Slab'
                      ? item.condition
                      : item.product_type === 'Raw Single'
                        ? `Raw · ${item.condition}`
                        : item.product_type}
                  </span>
                  <CardArtwork item={item} />
                  <span className="quantity-label">
                    {quantityOnHand(item, data.sales) > 0
                      ? `${quantityOnHand(item, data.sales)} in stock`
                      : 'Sold out'}
                  </span>
                  <span className="card-open">
                    <ArrowUpRight size={17} />
                  </span>
                </div>
                <div className="highlight-info">
                  <div className="inventory-game">
                    {item.game === 'Pokemon' ? 'Pokémon' : item.game}
                    <span>#{item.card_number || '—'}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.set_name || item.item_id}</p>
                  <div>
                    <strong>{currency(item.manual_market_value)}</strong>
                    <span
                      className={cx('return-label', value < cost && 'negative')}
                    >
                      {cost
                        ? `${value >= cost ? '+' : ''}${percent((value - cost) / cost)}`
                        : 'No cost basis'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="surface table-panel">
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Inventory records"
          >
            <table className="data-table inventory-table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Condition</th>
                  <th>Quantity</th>
                  <th>Unit cost</th>
                  <th>Market value</th>
                  <th>Unrealized gain</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const cost = inventoryCostOnHand(
                    item,
                    data.sales,
                    data.grading,
                  )
                  const value = marketValueOnHand(item, data.sales)
                  return (
                    <tr key={item.id}>
                      <td>
                        <button
                          className="table-card-button"
                          onClick={() => onItem(item)}
                        >
                          <CardArtwork item={item} />
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.set_name}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="badge">{item.condition}</span>
                      </td>
                      <td>{quantityOnHand(item, data.sales)}</td>
                      <td>{currency(landedUnitCost(item, data.grading))}</td>
                      <td>{currency(value)}</td>
                      <td className={value >= cost ? 'positive' : 'negative'}>
                        {currency(value - cost)}
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`View ${item.name}`}
                          onClick={() => onItem(item)}
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
