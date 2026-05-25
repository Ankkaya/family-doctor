import { computed, defineComponent, h, useAttrs, useSlots } from 'vue'
import { NDataTable as NaiveDataTable } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getTableScrollX } from '@/utils/table'

export default defineComponent({
  name: 'AppDataTable',
  inheritAttrs: false,
  setup() {
    const attrs = useAttrs()
    const slots = useSlots()

    const mergedProps = computed(() => {
      const props = { ...attrs } as Record<string, unknown>
      const columns = props.columns as DataTableColumns<unknown> | undefined
      const scrollX = props.scrollX
      const className = props.class

      if (scrollX == null && Array.isArray(columns) && columns.length > 0) {
        props.scrollX = getTableScrollX(columns)
      }

      props.class = ['app-data-table', className]

      return props
    })

    return () => h(NaiveDataTable, mergedProps.value, slots)
  },
})
