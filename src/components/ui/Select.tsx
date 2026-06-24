import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectChangeEvent {
  target: { value: string; name?: string }
}

interface SelectProps {
  label?: string
  error?: string
  options: SelectOption[]
  value?: string | number
  onChange?: (event: SelectChangeEvent) => void
  onBlur?: () => void
  className?: string
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  placeholder?: string
  size?: 'sm' | 'md'
  tone?: 'default' | 'success' | 'warning'
  fullWidth?: boolean
}

const SEARCH_THRESHOLD = 7

const toneClasses = {
  default: 'border-slate-200/80 bg-white/80 hover:border-slate-300 focus:border-brand-400 focus:ring-brand-100/80',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100/80',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 focus:border-amber-400 focus:ring-amber-100/80',
}

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg',
  md: 'px-3.5 py-2.5 text-sm rounded-xl',
}

function stringValue(value: string | number | undefined): string {
  if (value === undefined || value === null) return ''
  return String(value)
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

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label,
    error,
    options,
    value,
    onChange,
    onBlur,
    className = '',
    id,
    name,
    disabled = false,
    required = false,
    searchable,
    searchPlaceholder = 'Search...',
    placeholder,
    size = 'md',
    tone = 'default',
    fullWidth = true,
  },
  ref,
) {
  const generatedId = useId()
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-') || generatedId
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [menuStyle, setMenuStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 280,
  })

  const currentValue = stringValue(value)
  const isSearchable = searchable ?? options.length >= SEARCH_THRESHOLD

  const selectedOption = useMemo(
    () => options.find((opt) => stringValue(opt.value) === currentValue),
    [options, currentValue],
  )

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, query, isSearchable])

  const displayLabel = selectedOption?.label || placeholder || (currentValue ? currentValue : 'Select...')

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const gap = 6
    const viewportPadding = 8
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const preferBelow = spaceBelow >= 120 || spaceBelow >= spaceAbove
    const maxHeight = Math.min(280, preferBelow ? spaceBelow - gap : spaceAbove - gap)

    setMenuStyle({
      top: preferBelow ? rect.bottom + gap : rect.top - gap - Math.max(120, maxHeight),
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, maxHeight),
    })
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHighlightIndex(0)
    onBlur?.()
  }, [onBlur])

  const selectOption = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return
      onChange?.({ target: { value: stringValue(option.value), name } })
      close()
    },
    [onChange, name, close],
  )

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, updateMenuPosition, filteredOptions.length])

  useEffect(() => {
    if (!open) return

    let frame = 0

    function scheduleReposition() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => updateMenuPosition())
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      close()
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    const scrollParents = getScrollParents(triggerRef.current)

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', scheduleReposition)
    window.addEventListener('scroll', scheduleReposition, true)
    scrollParents.forEach((parent) => parent.addEventListener('scroll', scheduleReposition, { passive: true }))
    window.visualViewport?.addEventListener('resize', scheduleReposition)
    window.visualViewport?.addEventListener('scroll', scheduleReposition)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', scheduleReposition)
      window.removeEventListener('scroll', scheduleReposition, true)
      scrollParents.forEach((parent) => parent.removeEventListener('scroll', scheduleReposition))
      window.visualViewport?.removeEventListener('resize', scheduleReposition)
      window.visualViewport?.removeEventListener('scroll', scheduleReposition)
    }
  }, [open, close, updateMenuPosition])

  useEffect(() => {
    if (open && isSearchable) {
      searchRef.current?.focus()
    }
  }, [open, isSearchable])

  useEffect(() => {
    if (!open) return
    const selectedIndex = filteredOptions.findIndex((opt) => stringValue(opt.value) === currentValue)
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [open, filteredOptions, currentValue])

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((i) => {
        let next = i + 1
        while (next < filteredOptions.length && filteredOptions[next]?.disabled) next += 1
        return Math.min(next, filteredOptions.length - 1)
      })
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((i) => {
        let prev = i - 1
        while (prev >= 0 && filteredOptions[prev]?.disabled) prev -= 1
        return Math.max(prev, 0)
      })
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filteredOptions[highlightIndex]
      if (option) selectOption(option)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const menu = open
    ? createPortal(
        <div
          ref={listRef}
          role="listbox"
          id={`${selectId}-listbox`}
          style={{
            position: 'fixed',
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
          onKeyDown={handleListKeyDown}
        >
          {isSearchable && (
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setHighlightIndex(0)
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100/80"
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto p-1" style={{ maxHeight: menuStyle.maxHeight - (isSearchable ? 52 : 0) }}>
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No matches found</p>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = stringValue(option.value)
                const isSelected = optionValue === currentValue
                const isHighlighted = index === highlightIndex

                return (
                  <button
                    key={`${optionValue}-${option.label}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectOption(option)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      option.disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : isHighlighted
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-slate-700 hover:bg-slate-50'
                    } ${isSelected ? 'font-medium' : ''}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={16} className="shrink-0 text-brand-600" />}
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div ref={containerRef} className={`relative space-y-1 ${fullWidth ? '' : 'inline-block'} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <button
        ref={(node) => {
          triggerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${selectId}-listbox`}
        onClick={() => {
          if (disabled) return
          setOpen((prev) => !prev)
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`flex items-center justify-between gap-2 border font-medium outline-none transition-all duration-200 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? 'w-full' : 'w-auto min-w-[4.5rem]'} ${toneClasses[tone]} ${sizeClasses[size]} ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100/80' : ''} ${!selectedOption && placeholder ? 'text-slate-400' : ''}`}
      >
        <span className="truncate text-left">{displayLabel}</span>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          value={currentValue}
          required={required}
          onChange={() => {}}
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {menu}
    </div>
  )
})

Select.displayName = 'Select'
