import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

export type ActionMenuItemVariant = 'default' | 'danger' | 'success'

export interface ActionMenuItem {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: ActionMenuItemVariant
  disabled?: boolean
  hidden?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  align?: 'left' | 'right'
  ariaLabel?: string
}

const variantClasses: Record<ActionMenuItemVariant, string> = {
  default: 'text-slate-700 hover:bg-slate-50',
  danger: 'text-red-600 hover:bg-red-50',
  success: 'text-emerald-700 hover:bg-emerald-50',
}

function getScrollParents(element: HTMLElement | null): HTMLElement[] {
  const parents: HTMLElement[] = []
  let parent = element?.parentElement ?? null

  while (parent) {
    const style = window.getComputedStyle(parent)
    const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`
    if (/(auto|scroll|overlay)/.test(overflow)) {
      parents.push(parent)
    }
    parent = parent.parentElement
  }

  return parents
}

export function ActionMenu({ items, align = 'right', ariaLabel = 'Actions' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<{
    top?: number
    bottom?: number
    left: number
    minWidth: number
  }>({ left: 0, minWidth: 176 })

  const visibleItems = items.filter((item) => !item.hidden && !item.disabled)

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const gap = 4
    const menuWidth = 176
    const estimatedHeight = visibleItems.length * 40 + 8
    const viewportPadding = 8
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const preferBelow = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove
    const left = align === 'right'
      ? Math.max(viewportPadding, rect.right - menuWidth)
      : rect.left

    if (preferBelow) {
      setMenuStyle({
        top: rect.bottom + gap,
        left,
        minWidth: menuWidth,
      })
    } else {
      setMenuStyle({
        bottom: window.innerHeight - rect.top + gap,
        left,
        minWidth: menuWidth,
      })
    }
  }, [align, visibleItems.length])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    const scrollParents = getScrollParents(triggerRef.current)
    const reposition = () => updatePosition()

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    scrollParents.forEach((parent) => parent.addEventListener('scroll', reposition, { passive: true }))

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      scrollParents.forEach((parent) => parent.removeEventListener('scroll', reposition))
    }
  }, [open, updatePosition])

  if (visibleItems.length === 0) {
    return <span className="text-xs text-slate-300">—</span>
  }

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: menuStyle.top,
            bottom: menuStyle.bottom,
            left: menuStyle.left,
            minWidth: menuStyle.minWidth,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
        >
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition ${variantClasses[item.variant ?? 'default']}`}
            >
              {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <div className="inline-flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical size={18} />
      </button>
      {menu}
    </div>
  )
}
