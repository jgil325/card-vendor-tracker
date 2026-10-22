import { X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  compact = false,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  compact?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog?.open) dialog?.showModal()
    if (!open && dialog?.open) dialog?.close()
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      className={compact ? 'drawer-dialog compact-dialog' : 'drawer-dialog'}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      aria-label={title}
    >
      <div className="drawer-inner">
        <header className="drawer-header">
          <div>
            <span className="eyebrow">STACK WORKSPACE</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={21} />
          </button>
        </header>
        <div className="drawer-content">{open && children}</div>
      </div>
    </dialog>
  )
}
