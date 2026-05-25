import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultColumnVisibility,
  filterVisibleColumns,
  getColumnSettingOptions,
  normalizeColumnVisibility,
  updateColumnVisibility,
} from './table-column-settings.ts'

const columns = [
  { title: 'ID', key: 'id' },
  { title: '名称', key: 'name' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions', fixed: 'right' },
]

test('creates options from table columns and locks action columns', () => {
  const options = getColumnSettingOptions(columns)

  assert.deepEqual(options, [
    { key: 'id', title: 'ID', disabled: false },
    { key: 'name', title: '名称', disabled: false },
    { key: 'status', title: '状态', disabled: false },
    { key: 'actions', title: '操作', disabled: true },
  ])
})

test('normalizes saved visibility and keeps unknown keys out', () => {
  const options = getColumnSettingOptions(columns)
  const visibility = normalizeColumnVisibility(options, {
    id: false,
    name: true,
    missing: false,
    actions: false,
  })

  assert.deepEqual(visibility, {
    id: false,
    name: true,
    status: true,
    actions: true,
  })
})

test('prevents hiding the last optional visible column and disabled columns', () => {
  const options = getColumnSettingOptions(columns)
  let visibility = createDefaultColumnVisibility(options)

  visibility = updateColumnVisibility(options, visibility, 'id', false)
  visibility = updateColumnVisibility(options, visibility, 'name', false)
  visibility = updateColumnVisibility(options, visibility, 'status', false)
  visibility = updateColumnVisibility(options, visibility, 'actions', false)

  assert.deepEqual(visibility, {
    id: false,
    name: false,
    status: true,
    actions: true,
  })
})

test('filters hidden columns while keeping locked columns visible', () => {
  const options = getColumnSettingOptions(columns)
  const visibility = normalizeColumnVisibility(options, {
    id: false,
    name: true,
    status: false,
    actions: true,
  })

  const visibleColumns = filterVisibleColumns(columns, visibility)

  assert.deepEqual(visibleColumns.map(column => column.key), ['name', 'actions'])
})
