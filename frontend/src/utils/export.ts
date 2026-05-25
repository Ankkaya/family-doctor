import * as XLSX from 'xlsx'

export interface ExportColumn<T> {
  title: string
  value: keyof T | ((row: T) => string | number | boolean | null | undefined)
}

const normalizeCellValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return ''
  }

  return value
}

export function exportExcel<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const data = rows.map((row) => {
    return columns.reduce<Record<string, unknown>>((record, column) => {
      const value = typeof column.value === 'function'
        ? column.value(row)
        : row[column.value]
      record[column.title] = normalizeCellValue(value)
      return record
    }, {})
  })

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: columns.map(column => column.title),
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`, {
    bookType: 'xlsx',
  })
}
