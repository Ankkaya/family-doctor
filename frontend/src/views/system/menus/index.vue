<template>
  <div class="page-container menu-list">
    <PageToolbar>
      <n-button v-if="authStore.hasPermission('system:menu:create')" type="primary" @click="handleCreate(null)">新增菜单</n-button>
    </PageToolbar>

    <PageTableCard
      v-model:column-setting-value="checkedColumnKeys"
      :column-setting-options="columnOptions"
      export-permission="system:menu:export"
      batch-delete-permission="system:menu:batch-delete"
      :selected-count="selectedRowKeys.length"
      @reset-columns="resetColumnSettings"
      @export="handleExport"
      @batch-delete="handleBatchDelete"
    >
      <n-data-table
        :columns="columns"
        :data="menus"
        :loading="loading"
        :scroll-x="tableScrollX"
        striped
        :row-key="(row: Menu) => row.id"
        :checked-row-keys="selectedRowKeys"
        default-expand-all
        @update:checked-row-keys="handleSelectedRowKeysUpdate"
      />
    </PageTableCard>

    <!-- 新增/编辑弹窗 -->
    <SmartFormContainer
      v-model:show="dialogVisible"
      :title="isEdit ? '编辑菜单' : '新增菜单'"
      :form-item-count="9"
      modal-width="600px"
      :drawer-width="760"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <n-form-item label="菜单类型" path="type">
          <n-radio-group v-model:value="form.type">
            <n-radio value="menu">菜单</n-radio>
            <n-radio value="button">按钮</n-radio>
            <n-radio value="iframe">iframe</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="菜单名称" path="name">
          <n-input v-model:value="form.name" placeholder="请输入菜单名称" />
        </n-form-item>
        <n-form-item label="路由路径" path="path" v-if="form.type !== 'button'">
          <n-input v-model:value="form.path" placeholder="如: /system" />
        </n-form-item>
        <n-form-item label="组件路径" path="component" v-if="form.type === 'menu'">
          <n-input v-model:value="form.component" placeholder="如: layout/System/index" />
        </n-form-item>
        <n-form-item label="图标" path="icon" v-if="form.type !== 'button'">
          <n-space vertical style="width: 100%">
            <div class="flex items-start gap-3">
              <n-input
                v-model:value="form.icon"
                placeholder="可直接输入 Iconify ID，或点击右侧选择图标"
              />
              <n-button @click="iconPickerVisible = true">选择图标</n-button>
            </div>
            <div v-if="form.icon" class="flex items-center gap-2 text-sm text-gray-500">
              <span class="inline-flex items-center justify-center rounded-md border border-gray-200 p-1">
                <AppIcon
                  :icon="form.icon"
                  :icon-url="currentIconUrl"
                  size="18"
                  :alt="form.icon"
                  :color="menuIconColor"
                  use-mask
                />
              </span>
              <span>{{ form.icon }}</span>
            </div>
            <div v-else class="text-xs text-gray-500">
              统一保存菜单图标标识；左侧导航和菜单列表将使用同一套图标解析逻辑。
            </div>
          </n-space>
        </n-form-item>
        <n-form-item label="重定向" path="redirect" v-if="form.type === 'menu'">
          <n-input v-model:value="form.redirect" placeholder="重定向路径" />
        </n-form-item>
        <n-form-item label="权限标识" path="permission">
          <n-input v-model:value="form.permission" placeholder="如: system:user:view" />
        </n-form-item>
        <n-form-item label="父级菜单" path="parentId">
          <n-tree-select
            v-model:value="form.parentId"
            :options="menuOptions"
            check-strategy="parent"
            clearable
            placeholder="请选择父级菜单"
            class="w-full"
          />
        </n-form-item>
        <n-form-item label="排序" path="order">
          <n-input-number v-model:value="form.order" :min="0" :max="999" class="w-full" />
        </n-form-item>
        <n-form-item label="是否隐藏" path="hidden">
          <n-switch v-model:value="form.hidden" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="dialogVisible = false">取消</n-button>
          <n-button type="primary" :loading="submitLoading" @click="handleSubmit">
            确定
          </n-button>
        </n-space>
      </template>
    </SmartFormContainer>

    <n-modal
      v-model:show="iconPickerVisible"
      preset="card"
      title="选择菜单图标"
      style="width: 720px"
      :mask-closable="true"
    >
      <IconPicker :model-value="form.icon" @update:model-value="handleIconSelect" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, h, type VNode } from 'vue'
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules, TreeSelectOption } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import { NButton, NSpace, NTag } from 'naive-ui'
import SmartFormContainer from '@/components/common/SmartFormContainer.vue'
import { getMenus, createMenu, updateMenu, deleteMenu, batchDeleteMenus } from '@/api/menu'
import AppIcon from '@/components/common/AppIcon.vue'
import IconPicker from '@/components/common/IconPicker.vue'
import PageToolbar from '@/components/common/PageToolbar.vue'
import PageTableCard from '@/components/common/PageTableCard.vue'
import { useThemeStore } from '@/store/modules/theme'
import type { Menu, CreateMenuDto } from '@/types'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { autoFitTableColumns, createActionColumn } from '@/utils/table'
import { useAuthStore } from '@/store'
import { exportExcel } from '@/utils/export'

const message = useMessage()
const dialog = useDialog()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const iconPickerVisible = ref(false)
const isEdit = ref(false)
const menus = ref<Menu[]>([])
const selectedRowKeys = ref<DataTableRowKey[]>([])
const currentIconUrl = ref('')
const formRef = ref<FormInst>()
const currentMenuId = ref<number>()

const form = reactive<CreateMenuDto>({
  name: '',
  path: '',
  icon: '',
  component: '',
  redirect: '',
  permission: '',
  parentId: undefined,
  order: 0,
  hidden: false,
  type: 'menu'
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }]
}

// 将菜单数据转换为树形选择选项
const convertToTreeOptions = (list: Menu[], level = 0): TreeSelectOption[] => {
  return list.filter(menu => menu.type !== 'button').map((menu) => {
    const prefix = '　'.repeat(level)
    const option: TreeSelectOption = {
      label: `${prefix}${menu.name}`,
      key: menu.id,
      children: menu.children && menu.children.length > 0
        ? convertToTreeOptions(menu.children, level + 1)
        : undefined
    }
    return option
  })
}

// 菜单选项（用于父级菜单选择）
const menuOptions = computed<TreeSelectOption[]>(() => {
  return convertToTreeOptions(menus.value)
})
const menuIconColor = computed(() => (
  themeStore.darkMode ? themeStore.themeColors.primary : undefined
))

// 获取类型标签
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    menu: '菜单',
    button: '按钮',
    iframe: 'iframe'
  }
  return labels[type] || type
}

// 获取类型标签类型
const getTypeTagType = (type: string): 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning' => {
  const types: Record<string, 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning'> = {
    menu: 'success',
    button: 'warning',
    iframe: 'info'
  }
  return types[type] || 'default'
}

// 表格列定义
const createColumns = (): DataTableColumns<Menu> => {
  return autoFitTableColumns([
    { type: 'selection', width: 48, fixed: 'left' },
    { title: '菜单名称', key: 'name' },
    {
      title: '路由路径',
      key: 'path',
      render: (row) => row.path || '-'
    },
    {
      title: '图标',
      key: 'icon',
      render: (row) => {
        if (!row.icon) return '-'
        return h('div', { class: 'flex items-center gap-2' }, [
          h(AppIcon, {
            icon: row.icon,
            iconUrl: row.iconUrl,
            size: 16,
            alt: row.icon,
            color: menuIconColor.value,
            useMask: true,
          }),
          h('span', row.icon),
        ])
      }
    },
    {
      title: '权限标识',
      key: 'permission',
      render: (row) => row.permission || '-'
    },
    { title: '排序', key: 'order', align: 'center' },
    {
      title: '类型',
      key: 'type',
      align: 'center',
      render: (row) => h(NTag, { type: getTypeTagType(row.type) }, { default: () => getTypeLabel(row.type) })
    },
    {
      title: '隐藏',
      key: 'hidden',
      align: 'center',
      render: (row) => h(NTag, { type: row.hidden ? 'error' : 'success', size: 'small' }, { default: () => row.hidden ? '是' : '否' })
    },
    createActionColumn<Menu>({
      title: '操作',
      key: 'actions',
      align: 'center',
      render: (row) => {
        const actions: VNode[] = []
        if (authStore.hasPermission('system:menu:create')) {
          actions.push(h(NButton, {
            text: true,
            type: 'primary',
            onClick: () => handleCreate(row)
          }, { default: () => '新增子菜单' }))
        }
        if (authStore.hasPermission('system:menu:update')) {
          actions.push(h(NButton, {
            text: true,
            type: 'primary',
            onClick: () => handleEdit(row)
          }, { default: () => '编辑' }))
        }
        if (authStore.hasPermission('system:menu:delete')) {
          actions.push(h(NButton, {
            text: true,
            type: 'error',
            onClick: () => handleDelete(row)
          }, { default: () => '删除' }))
        }
        if (actions.length === 0) {
          return '-'
        }
        return h(NSpace, { justify: 'center' }, {
          default: () => actions
        })
      }
    }, 3)
  ])
}

const baseColumns = createColumns()
const {
  checkedColumnKeys,
  columnOptions,
  columns,
  resetColumnSettings,
  tableScrollX,
} = useTableColumnSettings<Menu>('system-menus', baseColumns)

const fetchMenus = async () => {
  loading.value = true
  try {
    const res = await getMenus()
    menus.value = res
    selectedRowKeys.value = []
  } catch (error) {
    message.error('获取菜单列表失败')
  } finally {
    loading.value = false
  }
}

const flattenMenus = (list: Menu[]): Menu[] => {
  return list.flatMap(menu => [
    menu,
    ...(menu.children?.length ? flattenMenus(menu.children) : []),
  ])
}

const handleSelectedRowKeysUpdate = (keys: DataTableRowKey[]) => {
  selectedRowKeys.value = keys
}

const handleExport = () => {
  exportExcel('菜单管理', flattenMenus(menus.value), [
    { title: 'ID', value: 'id' },
    { title: '菜单名称', value: 'name' },
    { title: '路由路径', value: row => row.path || '' },
    { title: '权限标识', value: row => row.permission || '' },
    { title: '类型', value: row => getTypeLabel(row.type) },
    { title: '排序', value: 'order' },
  ])
}

const handleBatchDelete = () => {
  const ids = selectedRowKeys.value.map(Number)
  if (ids.length === 0) {
    message.warning('请先选择要删除的菜单')
    return
  }

  dialog.warning({
    title: '提示',
    content: `确定要删除选中的 ${ids.length} 个菜单吗?`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await batchDeleteMenus(ids)
        message.success('批量删除成功')
        await fetchMenus()
      } catch (error: any) {
        message.error(error.response?.data?.message || error.message || '批量删除失败')
      }
    }
  })
}

const handleCreate = (row: Menu | null) => {
  isEdit.value = false
  form.name = ''
  form.path = ''
  form.icon = ''
  form.component = ''
  form.redirect = ''
  form.permission = ''
  form.parentId = row?.id
  form.order = 0
  form.hidden = false
  form.type = 'menu'
  currentIconUrl.value = ''
  iconPickerVisible.value = false
  dialogVisible.value = true
}

const handleEdit = (menu: Menu) => {
  isEdit.value = true
  currentMenuId.value = menu.id
  form.name = menu.name
  form.path = menu.path || ''
  form.icon = menu.icon || ''
  form.component = menu.component || ''
  form.redirect = menu.redirect || ''
  form.permission = menu.permission || ''
  form.parentId = menu.parentId
  form.order = menu.order
  form.hidden = menu.hidden
  form.type = menu.type as 'menu' | 'button' | 'iframe'
  currentIconUrl.value = menu.iconUrl || ''
  iconPickerVisible.value = false
  dialogVisible.value = true
}

const handleIconSelect = (value: string) => {
  form.icon = value
  currentIconUrl.value = ''
  iconPickerVisible.value = false
}

const handleDelete = (menu: Menu) => {
  if (menu.children && menu.children.length > 0) {
    message.warning('该菜单存在子菜单，无法删除')
    return
  }

  dialog.warning({
    title: '提示',
    content: '确定要删除该菜单吗?',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteMenu(menu.id)
        message.success('删除成功')
        fetchMenus()
      } catch (error: any) {
        message.error(error.response?.data?.message || '删除失败')
      }
    }
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (errors) => {
    if (!errors) {
      submitLoading.value = true
      try {
        if (isEdit.value && currentMenuId.value) {
          await updateMenu(currentMenuId.value, form)
          message.success('更新成功')
        } else {
          await createMenu(form)
          message.success('创建成功')
        }
        dialogVisible.value = false
        fetchMenus()
      } catch (error: any) {
        message.error(error.response?.data?.message || '操作失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchMenus()
})
</script>
