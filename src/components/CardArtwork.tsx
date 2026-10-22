import { Layers } from 'lucide-react'
import { useState } from 'react'
import type { InventoryItem } from '../lib/types'
import { cx } from './ui'

const artwork: Record<string, string> = {
  charizard: '/cards/charizard.webp',
  umbreon: '/cards/umbreon.webp',
  pikachu: '/cards/pikachu.webp',
  gengar: '/cards/gengar.webp',
  rayquaza: '/cards/rayquaza.webp',
  lugia: '/cards/lugia.webp',
  luffy: '/cards/luffy.jpg',
  ace: '/cards/ace.jpg',
}

function artworkFor(item: InventoryItem) {
  if (!item.id.startsWith('showcase-')) return undefined
  return artwork[item.id.replace('showcase-', '')]
}

export function CardArtwork({
  item,
  slab = false,
  className = '',
}: {
  item: InventoryItem
  slab?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const source = artworkFor(item)
  return (
    <div className={cx('card-artwork', slab && 'is-slab', className)}>
      {slab && (
        <div className="slab-label">
          <span>
            {item.grading_company || 'PSA'}
            <small>
              {item.year} · {item.set_name}
            </small>
          </span>
          <strong>
            {item.grade || '10'}
            <small>GEM MINT</small>
          </strong>
        </div>
      )}
      {source && !failed ? (
        <img
          src={source}
          alt={`${item.name}, ${item.set_name || item.game} trading card`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="artwork-placeholder">
          <Layers size={32} strokeWidth={1.2} />
          <span>{item.name}</span>
          <small>{item.game === 'Pokemon' ? 'Pokémon' : item.game}</small>
        </div>
      )}
    </div>
  )
}
