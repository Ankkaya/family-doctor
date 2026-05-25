import type {
  DataTableBaseColumn,
  DataTableColumns,
} from 'naive-ui'

type TableColumn<T> = DataTableColumns<T>[number]

const ACTION_TITLES = new Set(['操作'])
const ACTION_KEYS = new Set(['actions', 'action', 'operations', 'operation'])

export function getActionColumnWidth(buttonCount: number, extraWidth = 0) {
  const count = Math.max(buttonCount, 1)
  return count * 68 + 8 + extraWidth
}

export function createActionColumn<T>(
  column: DataTableBaseColumn<T>,
  buttonCount: number,
  extraWidth = 0
): DataTableBaseColumn<T> {
  return {
    ...column,
    fixed: column.fixed ?? 'right',
    width: getActionColumnWidth(buttonCount, extraWidth),
  }
}

function isActionColumn<T>(column: TableColumn<T>) {
  const currentColumn = column as {
    type?: unknown
    children?: unknown
    title?: unknown
    key?: unknown
  }

  if ('type' in currentColumn || 'children' in currentColumn) return false

  const title = typeof currentColumn.title === 'string' ? currentColumn.title.trim() : ''
  const key = typeof currentColumn.key === 'string' ? currentColumn.key : ''

  return ACTION_TITLES.has(title) || ACTION_KEYS.has(key)
}

export function autoFitTableColumns<T>(columns: DataTableColumns<T>): DataTableColumns<T> {
  return columns.map((column) => {
    const currentColumn = column as {
      type?: unknown
      children?: unknown
    }

    if ('type' in currentColumn || 'children' in currentColumn || isActionColumn(column)) {
      return column
    }

    const nextColumn = { ...column } as DataTableBaseColumn<T> & {
      minWidth?: number
      maxWidth?: number
    }

    delete nextColumn.width
    delete nextColumn.minWidth
    delete nextColumn.maxWidth

    return nextColumn
  })
}

export function getTableScrollX<T>(columns: DataTableColumns<T>, defaultColumnWidth = 160): number {
  return columns.reduce((totalWidth, column) => {
    const currentColumn = column as {
      type?: unknown
      children?: DataTableColumns<T>
      width?: unknown
      minWidth?: unknown
    }

    if (Array.isArray(currentColumn.children)) {
      return totalWidth + getTableScrollX(currentColumn.children, defaultColumnWidth)
    }

    if ('type' in currentColumn) {
      return totalWidth + 60
    }

    if (typeof currentColumn.width === 'number') {
      return totalWidth + currentColumn.width
    }

    if (typeof currentColumn.minWidth === 'number') {
      return totalWidth + currentColumn.minWidth
    }

    return totalWidth + defaultColumnWidth
  }, 0)
}
