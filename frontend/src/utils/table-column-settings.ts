import type { DataTableColumns } from 'naive-ui'

export interface TableColumnSettingOption {
  key: string
  title: string
  disabled: boolean
}

export type TableColumnVisibility = Record<string, boolean>

const ACTION_TITLES = new Set(['操作'])
const ACTION_KEYS = new Set(['actions', 'action', 'operations', 'operation'])

type ColumnLike = {
  key?: unknown
  title?: unknown
  fixed?: unknown
  type?: unknown
}

function getColumnKey(column: ColumnLike): string | null {
  if (typeof column.key === 'string' || typeof column.key === 'number') {
    return String(column.key)
  }
  return null
}

function getColumnTitle(column: ColumnLike, key: string): string {
  return typeof column.title === 'string' && column.title.trim()
    ? column.title.trim()
    : key
}

function isLockedColumn(column: ColumnLike, key: string, lockedKeys: Set<string>): boolean {
  const title = typeof column.title === 'string' ? column.title.trim() : ''
  return lockedKeys.has(key)
    || ACTION_KEYS.has(key)
    || ACTION_TITLES.has(title)
    || column.fixed === 'right'
}

export function getColumnSettingOptions<T>(
  columns: DataTableColumns<T> | ColumnLike[],
  lockedColumnKeys: string[] = [],
): TableColumnSettingOption[] {
  const lockedKeys = new Set(lockedColumnKeys)

  return columns
    .map((column) => {
      const currentColumn = column as ColumnLike
      const key = getColumnKey(currentColumn)
      if (!key || 'type' in currentColumn) {
        return null
      }

      return {
        key,
        title: getColumnTitle(currentColumn, key),
        disabled: isLockedColumn(currentColumn, key, lockedKeys),
      }
    })
    .filter((option): option is TableColumnSettingOption => Boolean(option))
}

export function createDefaultColumnVisibility(
  options: TableColumnSettingOption[],
): TableColumnVisibility {
  return options.reduce<TableColumnVisibility>((result, option) => {
    result[option.key] = true
    return result
  }, {})
}

export function normalizeColumnVisibility(
  options: TableColumnSettingOption[],
  savedVisibility?: Partial<TableColumnVisibility> | null,
): TableColumnVisibility {
  const visibility = createDefaultColumnVisibility(options)

  for (const option of options) {
    if (option.disabled) {
      visibility[option.key] = true
      continue
    }
    if (typeof savedVisibility?.[option.key] === 'boolean') {
      visibility[option.key] = Boolean(savedVisibility[option.key])
    }
  }

  if (!hasOptionalVisibleColumn(options, visibility)) {
    const firstOptionalColumn = options.find(option => !option.disabled)
    if (firstOptionalColumn) {
      visibility[firstOptionalColumn.key] = true
    }
  }

  return visibility
}

export function updateColumnVisibility(
  options: TableColumnSettingOption[],
  currentVisibility: TableColumnVisibility,
  key: string,
  visible: boolean,
): TableColumnVisibility {
  const option = options.find(item => item.key === key)
  if (!option || option.disabled) {
    return normalizeColumnVisibility(options, currentVisibility)
  }

  if (!visible) {
    const remainingVisibleCount = options.filter(item => (
      !item.disabled
      && item.key !== key
      && currentVisibility[item.key] !== false
    )).length

    if (remainingVisibleCount === 0) {
      return normalizeColumnVisibility(options, currentVisibility)
    }
  }

  const nextVisibility = normalizeColumnVisibility(options, {
    ...currentVisibility,
    [key]: visible,
  })

  return nextVisibility
}

export function filterVisibleColumns<T>(
  columns: DataTableColumns<T>,
  visibility: TableColumnVisibility,
): DataTableColumns<T> {
  return columns.filter((column) => {
    const key = getColumnKey(column as ColumnLike)
    return !key || visibility[key] !== false
  })
}

function hasOptionalVisibleColumn(
  options: TableColumnSettingOption[],
  visibility: TableColumnVisibility,
): boolean {
  return options.some(option => !option.disabled && visibility[option.key] !== false)
}
