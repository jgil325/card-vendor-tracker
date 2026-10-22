import { ArrowRight, Check, Gem, Package, Truck } from 'lucide-react'
import { currency } from '../lib/calculations'
import type { CardData, GradingSubmission } from '../lib/types'
import { CardArtwork } from './CardArtwork'
import { cx } from './ui'

const stages = ['Preparing', 'Submitted', 'Grading', 'Complete']

export function Grading({
  data,
  search,
  onEdit,
  onAdd,
}: {
  data: CardData
  search: string
  onEdit: (row: GradingSubmission) => void
  onAdd: () => void
}) {
  const rows = data.grading
    .filter((row) =>
      JSON.stringify({
        ...row,
        name: data.inventory.find((item) => item.item_id === row.item_id)?.name,
      })
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.submission_date.localeCompare(a.submission_date))
  const inProgress = data.grading.filter(
    (row) => !['Complete', 'Returned'].includes(row.status),
  ).length
  return (
    <div className="grading-workspace">
      <div className="grading-summary">
        <div>
          <Gem size={19} />
          <span>In progress</span>
          <strong>{inProgress}</strong>
        </div>
        <div>
          <Package size={19} />
          <span>Returned</span>
          <strong>{data.grading.length - inProgress}</strong>
        </div>
        <div>
          <Truck size={19} />
          <span>Total grading costs</span>
          <strong>
            {currency(
              data.grading.reduce(
                (sum, row) => sum + row.grading_fee + row.shipping_fee,
                0,
              ),
            )}
          </strong>
        </div>
      </div>
      <div className="grading-grid">
        {rows.map((row) => {
          const item = data.inventory.find(
            (item) => item.item_id === row.item_id,
          )
          const step =
            row.status === 'Returned' ? 3 : stages.indexOf(row.status)
          return (
            <article className="surface grading-card" key={row.id}>
              <div className="grading-card-heading">
                <span className="grading-company">{row.company}</span>
                <span
                  className={cx('grading-status', step === 3 && 'is-complete')}
                >
                  {row.status === 'Complete' && <Check size={12} />}
                  {row.status}
                </span>
              </div>
              <div className="grading-card-body">
                {item && <CardArtwork item={item} />}
                <div>
                  <span className="eyebrow">{row.submission_id}</span>
                  <h2>{item?.name || row.item_id}</h2>
                  <p>{item?.set_name || row.item_id}</p>
                  <span className="small muted">
                    Submitted{' '}
                    {new Date(
                      `${row.submission_date}T12:00:00`,
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <div className="grading-progress">
                {stages.map((stage, i) => (
                  <div key={stage} className={cx(i <= step && 'done')}>
                    <span>
                      {i < step || step === 3 ? <Check size={10} /> : i + 1}
                    </span>
                    <small>{stage}</small>
                  </div>
                ))}
              </div>
              <div className="grading-card-footer">
                <div>
                  <span>
                    {row.grade_result ? 'Final grade' : 'Submission cost'}
                  </span>
                  <strong>
                    {row.grade_result
                      ? `${row.company} ${row.grade_result}`
                      : currency(row.grading_fee + row.shipping_fee)}
                  </strong>
                </div>
                <button className="text-button" onClick={() => onEdit(row)}>
                  Update submission
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          )
        })}
      </div>
      {!rows.length && (
        <div className="empty-inline spacious">
          <Gem size={35} strokeWidth={1.3} />
          <h2>
            {search ? 'No matching submissions' : 'The next grade starts here'}
          </h2>
          <p>
            {search
              ? 'Try a different card name or submission number.'
              : 'Track your card’s journey from preparation to its final grade.'}
          </p>
          {!search && (
            <button className="button button-primary" onClick={onAdd}>
              New submission
            </button>
          )}
        </div>
      )}
    </div>
  )
}
