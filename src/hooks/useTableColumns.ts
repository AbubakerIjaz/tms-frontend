import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface TableColumnMeta {
  id: string
  label: string
  required?: boolean
  defaultVisible?: boolean
  align?: 'left' | 'center' | 'right'
  headerClassName?: string
  cellClassName?: string
}

export interface TableColumnDef<T> extends TableColumnMeta {
  cell: (row: T, index: number) => ReactNode
}

const STORAGE_PREFIX = 'tms_table_columns_'

function defaultVisibility(columns: TableColumnMeta[]): Record<string, boolean> {
  return Object.fromEntries(
    columns.map((col) => [col.id, col.defaultVisible !== false]),
  )
}

function loadVisibility(tableId: string, columns: TableColumnMeta[]): Record<string, boolean> {
  const defaults = defaultVisibility(columns)
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`)
    if (!raw) return defaults
    const stored = JSON.parse(raw) as Record<string, boolean>
    const merged = { ...defaults }
    for (const col of columns) {
      if (col.required) {
        merged[col.id] = true
        continue
      }
      if (typeof stored[col.id] === 'boolean') {
        merged[col.id] = stored[col.id]
      }
    }
    return merged
  } catch {
    return defaults
  }
}

function saveVisibility(tableId: string, visibility: Record<string, boolean>) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(visibility))
  } catch {
    // ignore quota errors
  }
}

export function useTableColumns<T>(tableId: string, columns: TableColumnDef<T>[]) {
  const columnMeta = useMemo(
    () => columns.map(({ id, label, required, defaultVisible, align, headerClassName, cellClassName }) => ({
      id,
      label,
      required,
      defaultVisible,
      align,
      headerClassName,
      cellClassName,
    })),
    [columns],
  )

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    loadVisibility(tableId, columnMeta),
  )

  useEffect(() => {
    setVisibility(loadVisibility(tableId, columnMeta))
  }, [tableId, columnMeta])

  const isVisible = useCallback(
    (id: string) => {
      const col = columnMeta.find((c) => c.id === id)
      if (col?.required) return true
      return visibility[id] !== false
    },
    [columnMeta, visibility],
  )

  const visibleColumns = useMemo(
    () => columns.filter((col) => isVisible(col.id)),
    [columns, isVisible],
  )

  const setColumnVisible = useCallback(
    (id: string, visible: boolean) => {
      const col = columnMeta.find((c) => c.id === id)
      if (col?.required) return
      setVisibility((prev) => {
        const next = { ...prev, [id]: visible }
        saveVisibility(tableId, next)
        return next
      })
    },
    [columnMeta, tableId],
  )

  const toggleColumn = useCallback(
    (id: string) => setColumnVisible(id, !isVisible(id)),
    [isVisible, setColumnVisible],
  )

  const resetColumns = useCallback(() => {
    const defaults = defaultVisibility(columnMeta)
    setVisibility(defaults)
    saveVisibility(tableId, defaults)
  }, [columnMeta, tableId])

  const visibleCount = visibleColumns.length
  const totalCount = columns.length

  return {
    columns,
    columnMeta,
    visibility,
    visibleColumns,
    isVisible,
    setColumnVisible,
    toggleColumn,
    resetColumns,
    visibleCount,
    totalCount,
  }
}
