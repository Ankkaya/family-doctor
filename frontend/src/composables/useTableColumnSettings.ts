import { computed, ref, watch } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import {
  createDefaultColumnVisibility,
  filterVisibleColumns,
  getColumnSettingOptions,
  normalizeColumnVisibility,
  updateColumnVisibility,
  type TableColumnVisibility,
} from '@/utils/table-column-settings'
import { getTableScrollX } from '@/utils/table'

const STORAGE_PREFIX = 'platform:table-columns:'

function getStorageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`
}

function readVisibility(key: string): Partial<TableColumnVisibility> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getStorageKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? parsed as Partial<TableColumnVisibility>
      : null
  } catch {
    return null
  }
}

function writeVisibility(key: string, visibility: TableColumnVisibility) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getStorageKey(key), JSON.stringify(visibility))
}

function removeVisibility(key: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getStorageKey(key))
}

export function useTableColumnSettings<T>(
  tableKey: string,
  sourceColumns: DataTableColumns<T>,
) {
  const columnOptions = computed(() => getColumnSettingOptions(sourceColumns))
  const visibility = ref<TableColumnVisibility>(
    normalizeColumnVisibility(columnOptions.value, readVisibility(tableKey))
  )

  watch(columnOptions, (options) => {
    visibility.value = normalizeColumnVisibility(options, visibility.value)
  })

  const columns = computed(() => filterVisibleColumns(sourceColumns, visibility.value))
  const tableScrollX = computed(() => getTableScrollX(columns.value))

  const checkedColumnKeys = computed<string[]>({
    get: () => columnOptions.value
      .filter(option => visibility.value[option.key] !== false)
      .map(option => option.key),
    set: (keys) => {
      const checkedKeys = new Set(keys)
      visibility.value = normalizeColumnVisibility(
        columnOptions.value,
        columnOptions.value.reduce<TableColumnVisibility>((result, option) => {
          result[option.key] = option.disabled || checkedKeys.has(option.key)
          return result
        }, {}),
      )
      writeVisibility(tableKey, visibility.value)
    },
  })

  function setColumnVisible(key: string, visible: boolean) {
    visibility.value = updateColumnVisibility(columnOptions.value, visibility.value, key, visible)
    writeVisibility(tableKey, visibility.value)
  }

  function resetColumnSettings() {
    visibility.value = createDefaultColumnVisibility(columnOptions.value)
    removeVisibility(tableKey)
  }

  return {
    checkedColumnKeys,
    columnOptions,
    columns,
    resetColumnSettings,
    setColumnVisible,
    tableScrollX,
    visibility,
  }
}
