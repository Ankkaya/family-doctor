<template>
  <div class="page-container dictionary-page">
    <div class="dictionary-layout">
      <section class="dictionary-panel">
        <PageSearchCard>
          <QueryForm :model="typeQuery" class="dictionary-type-query" @search="fetchTypes">
            <n-form-item label="关键词">
              <n-input v-model:value="typeQuery.keyword" clearable placeholder="名称 / 编码" />
            </n-form-item>
            <n-form-item label="状态">
              <n-select
                v-model:value="typeQuery.isEnabled"
                :options="statusOptions"
                clearable
                placeholder="全部"
              />
            </n-form-item>
            <n-form-item>
              <n-space justify="end">
                <n-button type="primary" @click="fetchTypes">搜索</n-button>
                <n-button @click="resetTypeQuery">重置</n-button>
              </n-space>
            </n-form-item>
          </QueryForm>
        </PageSearchCard>

        <PageToolbar>
          <n-button
            v-if="authStore.hasPermission('system:dictionary:create')"
            type="primary"
            @click="handleCreateType"
          >
            新增字典
          </n-button>
        </PageToolbar>

        <PageTableCard
          v-model:column-setting-value="checkedTypeColumnKeys"
          :column-setting-options="typeColumnOptions"
          @reset-columns="resetTypeColumnSettings"
        >
          <n-data-table
            :columns="typeColumns"
            :data="types"
            :loading="typeLoading"
            :row-key="(row: DictionaryType) => row.id"
            :row-props="getTypeRowProps"
            :scroll-x="typeTableScrollX"
            striped
          />
          <template #footer>
            <PagePagination
              :page="typePagination.page"
              :page-size="typePagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :item-count="typePagination.total"
              @update:page="handleTypePageChange"
              @update:pageSize="handleTypePageSizeChange"
            />
          </template>
        </PageTableCard>
      </section>

      <section class="dictionary-panel">
        <PageSearchCard>
          <QueryForm :model="itemQuery" class="dictionary-item-query" @search="fetchItems">
            <n-form-item label="关键词">
              <n-input
                v-model:value="itemQuery.keyword"
                :disabled="!selectedType"
                clearable
                placeholder="标签 / 值"
              />
            </n-form-item>
            <n-form-item label="状态">
              <n-select
                v-model:value="itemQuery.isEnabled"
                :disabled="!selectedType"
                :options="statusOptions"
                clearable
                placeholder="全部"
              />
            </n-form-item>
            <n-form-item>
              <n-space justify="end">
                <n-button type="primary" :disabled="!selectedType" @click="fetchItems">搜索</n-button>
                <n-button :disabled="!selectedType" @click="resetItemQuery">重置</n-button>
              </n-space>
            </n-form-item>
          </QueryForm>
        </PageSearchCard>

        <PageToolbar>
          <n-button
            v-if="selectedType && authStore.hasPermission('system:dictionary:item:create')"
            type="primary"
            @click="handleCreateItem"
          >
            新增字典项
          </n-button>
        </PageToolbar>

        <PageTableCard
          v-model:column-setting-value="checkedItemColumnKeys"
          :column-setting-options="itemColumnOptions"
          @reset-columns="resetItemColumnSettings"
        >
          <n-data-table
            :columns="itemColumns"
            :data="items"
            :loading="itemLoading"
            :scroll-x="itemTableScrollX"
            striped
          />
        </PageTableCard>
      </section>
    </div>

    <n-modal
      v-model:show="typeDialogVisible"
      :title="isTypeEdit ? '编辑字典类型' : '新增字典类型'"
      preset="card"
      style="width: 520px"
    >
      <n-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="90px">
        <n-form-item label="字典名称" path="name">
          <n-input v-model:value="typeForm.name" placeholder="请输入字典名称" />
        </n-form-item>
        <n-form-item label="字典编码" path="code">
          <n-input v-model:value="typeForm.code" placeholder="如: common_status" />
        </n-form-item>
        <n-form-item label="排序" path="sort">
          <n-input-number v-model:value="typeForm.sort" :min="0" :max="9999" class="w-full" />
        </n-form-item>
        <n-form-item label="状态" path="isEnabled">
          <n-switch v-model:value="typeForm.isEnabled" />
        </n-form-item>
        <n-form-item label="说明" path="description">
          <n-input v-model:value="typeForm.description" type="textarea" placeholder="请输入说明" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="typeDialogVisible = false">取消</n-button>
          <n-button type="primary" :loading="typeSubmitLoading" @click="submitType">
            确定
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="itemDialogVisible"
      :title="isItemEdit ? '编辑字典项' : '新增字典项'"
      preset="card"
      style="width: 520px"
    >
      <n-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="90px">
        <n-form-item label="所属字典">
          <n-input :value="selectedType?.name || '-'" disabled />
        </n-form-item>
        <n-form-item label="标签" path="label">
          <n-input v-model:value="itemForm.label" placeholder="请输入显示标签" />
        </n-form-item>
        <n-form-item label="值" path="value">
          <n-input v-model:value="itemForm.value" placeholder="请输入字典项值" />
        </n-form-item>
        <n-form-item label="颜色" path="color">
          <n-color-picker
            v-model:value="itemForm.color"
            :show-alpha="false"
            clearable
          />
        </n-form-item>
        <n-form-item label="排序" path="sort">
          <n-input-number v-model:value="itemForm.sort" :min="0" :max="9999" class="w-full" />
        </n-form-item>
        <n-form-item label="状态" path="isEnabled">
          <n-switch v-model:value="itemForm.isEnabled" />
        </n-form-item>
        <n-form-item label="备注" path="remark">
          <n-input v-model:value="itemForm.remark" type="textarea" placeholder="请输入备注" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="itemDialogVisible = false">取消</n-button>
          <n-button type="primary" :loading="itemSubmitLoading" @click="submitItem">
            确定
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, type VNode } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { NButton, NSpace, NTag, useDialog, useMessage } from 'naive-ui'
import dayjs from 'dayjs'
import PagePagination from '@/components/common/PagePagination.vue'
import PageSearchCard from '@/components/common/PageSearchCard.vue'
import PageToolbar from '@/components/common/PageToolbar.vue'
import PageTableCard from '@/components/common/PageTableCard.vue'
import QueryForm from '@/components/common/QueryForm.vue'
import {
  createDictionaryItem,
  createDictionaryType,
  deleteDictionaryItem,
  deleteDictionaryType,
  getDictionaryItemsByType,
  getDictionaryTypes,
  updateDictionaryItem,
  updateDictionaryType,
} from '@/api/dictionaries'
import { useAuthStore } from '@/store'
import type {
  CreateDictionaryItemDto,
  CreateDictionaryTypeDto,
  DictionaryItem,
  DictionaryType,
} from '@/types'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { autoFitTableColumns, createActionColumn } from '@/utils/table'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

const statusOptions = [
  { label: '启用', value: true },
  { label: '停用', value: false },
]

const typeLoading = ref(false)
const itemLoading = ref(false)
const typeSubmitLoading = ref(false)
const itemSubmitLoading = ref(false)
const typeDialogVisible = ref(false)
const itemDialogVisible = ref(false)
const isTypeEdit = ref(false)
const isItemEdit = ref(false)
const types = ref<DictionaryType[]>([])
const items = ref<DictionaryItem[]>([])
const selectedType = ref<DictionaryType | null>(null)
const currentTypeId = ref<number>()
const currentItemId = ref<number>()
const typeFormRef = ref<FormInst>()
const itemFormRef = ref<FormInst>()

const typeQuery = reactive<{
  keyword: string
  isEnabled: boolean | null
}>({
  keyword: '',
  isEnabled: null,
})

const itemQuery = reactive<{
  keyword: string
  isEnabled: boolean | null
}>({
  keyword: '',
  isEnabled: null,
})

const typePagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const typeForm = reactive<CreateDictionaryTypeDto>({
  name: '',
  code: '',
  description: '',
  isEnabled: true,
  sort: 0,
})

const itemForm = reactive<CreateDictionaryItemDto>({
  typeId: 0,
  label: '',
  value: '',
  color: '',
  isEnabled: true,
  sort: 0,
  remark: '',
})

const typeRules: FormRules = {
  name: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入字典编码', trigger: 'blur' },
    {
      pattern: /^[a-z][a-z0-9_:-]*$/,
      message: '只能包含小写字母、数字、下划线、冒号和短横线，且必须以字母开头',
      trigger: 'blur',
    },
  ],
}

const itemRules: FormRules = {
  label: [{ required: true, message: '请输入标签', trigger: 'blur' }],
  value: [{ required: true, message: '请输入值', trigger: 'blur' }],
}

const queryTypeParams = computed(() => ({
  page: typePagination.page,
  pageSize: typePagination.pageSize,
  keyword: typeQuery.keyword || undefined,
  isEnabled: typeQuery.isEnabled === null ? undefined : typeQuery.isEnabled,
}))

const queryItemParams = computed(() => ({
  keyword: itemQuery.keyword || undefined,
  isEnabled: itemQuery.isEnabled === null ? undefined : itemQuery.isEnabled,
}))

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const renderStatus = (isEnabled: boolean) => {
  return h(NTag, { type: isEnabled ? 'success' : 'error', size: 'small' }, {
    default: () => (isEnabled ? '启用' : '停用'),
  })
}

const baseTypeColumns = autoFitTableColumns<DictionaryType>([
  { title: '名称', key: 'name' },
  { title: '编码', key: 'code' },
  {
    title: '字典项',
    key: 'itemCount',
    align: 'center',
    render: (row) => row.itemCount ?? 0,
  },
  {
    title: '状态',
    key: 'isEnabled',
    align: 'center',
    render: (row) => renderStatus(row.isEnabled),
  },
  { title: '排序', key: 'sort', align: 'center' },
  {
    title: '创建时间',
    key: 'createdAt',
    render: (row) => formatDate(row.createdAt),
  },
  createActionColumn<DictionaryType>({
    title: '操作',
    key: 'actions',
    render: (row) => {
      const actions: VNode[] = []
      if (authStore.hasPermission('system:dictionary:update')) {
        actions.push(h(NButton, {
          text: true,
          type: 'primary',
          onClick: (event: MouseEvent) => handleEditType(row, event),
        }, { default: () => '编辑' }))
      }
      if (authStore.hasPermission('system:dictionary:delete')) {
        actions.push(h(NButton, {
          text: true,
          type: 'error',
          onClick: (event: MouseEvent) => handleDeleteType(row, event),
        }, { default: () => '删除' }))
      }
      if (actions.length === 0) return '-'
      return h(NSpace, null, { default: () => actions })
    },
  }, 2),
])

const baseItemColumns = autoFitTableColumns<DictionaryItem>([
  { title: '标签', key: 'label' },
  { title: '值', key: 'value' },
  {
    title: '颜色',
    key: 'color',
    render: (row) => {
      if (!row.color) return '-'
      return h('div', { class: 'color-cell' }, [
        h('span', { class: 'color-swatch', style: { backgroundColor: row.color } }),
        h('span', row.color),
      ])
    },
  },
  {
    title: '状态',
    key: 'isEnabled',
    align: 'center',
    render: (row) => renderStatus(row.isEnabled),
  },
  { title: '排序', key: 'sort', align: 'center' },
  {
    title: '备注',
    key: 'remark',
    render: (row) => row.remark || '-',
  },
  createActionColumn<DictionaryItem>({
    title: '操作',
    key: 'actions',
    render: (row) => {
      const actions: VNode[] = []
      if (authStore.hasPermission('system:dictionary:item:update')) {
        actions.push(h(NButton, {
          text: true,
          type: 'primary',
          onClick: () => handleEditItem(row),
        }, { default: () => '编辑' }))
      }
      if (authStore.hasPermission('system:dictionary:item:delete')) {
        actions.push(h(NButton, {
          text: true,
          type: 'error',
          onClick: () => handleDeleteItem(row),
        }, { default: () => '删除' }))
      }
      if (actions.length === 0) return '-'
      return h(NSpace, null, { default: () => actions })
    },
  }, 2),
])

const {
  checkedColumnKeys: checkedTypeColumnKeys,
  columnOptions: typeColumnOptions,
  columns: typeColumns,
  resetColumnSettings: resetTypeColumnSettings,
  tableScrollX: typeTableScrollX,
} = useTableColumnSettings<DictionaryType>('system-dictionaries-types', baseTypeColumns)

const {
  checkedColumnKeys: checkedItemColumnKeys,
  columnOptions: itemColumnOptions,
  columns: itemColumns,
  resetColumnSettings: resetItemColumnSettings,
  tableScrollX: itemTableScrollX,
} = useTableColumnSettings<DictionaryItem>('system-dictionaries-items', baseItemColumns)

function getTypeRowProps(row: DictionaryType) {
  return {
    class: selectedType.value?.id === row.id ? 'selected-type-row' : '',
    onClick: () => selectType(row),
  }
}

async function fetchTypes() {
  typeLoading.value = true
  try {
    const res = await getDictionaryTypes(queryTypeParams.value)
    types.value = res.list
    typePagination.total = res.total

    if (types.value.length === 0) {
      selectedType.value = null
      items.value = []
      return
    }

    const nextSelectedType = selectedType.value
      ? types.value.find(type => type.id === selectedType.value?.id)
      : types.value[0]
    await selectType(nextSelectedType || types.value[0])
  } catch (error: any) {
    message.error(error.message || '获取字典类型失败')
  } finally {
    typeLoading.value = false
  }
}

async function fetchItems() {
  if (!selectedType.value) {
    items.value = []
    return
  }

  itemLoading.value = true
  try {
    items.value = await getDictionaryItemsByType(selectedType.value.id, queryItemParams.value)
  } catch (error: any) {
    message.error(error.message || '获取字典项失败')
  } finally {
    itemLoading.value = false
  }
}

async function selectType(type: DictionaryType) {
  selectedType.value = type
  await fetchItems()
}

function handleTypePageSizeChange(pageSize: number) {
  typePagination.pageSize = pageSize
  typePagination.page = 1
  fetchTypes()
}

function handleTypePageChange(page: number) {
  typePagination.page = page
  fetchTypes()
}

function resetTypeQuery() {
  typeQuery.keyword = ''
  typeQuery.isEnabled = null
  typePagination.page = 1
  fetchTypes()
}

function resetItemQuery() {
  itemQuery.keyword = ''
  itemQuery.isEnabled = null
  fetchItems()
}

function resetTypeForm() {
  currentTypeId.value = undefined
  typeForm.name = ''
  typeForm.code = ''
  typeForm.description = ''
  typeForm.isEnabled = true
  typeForm.sort = 0
}

function resetItemForm() {
  currentItemId.value = undefined
  itemForm.typeId = selectedType.value?.id || 0
  itemForm.label = ''
  itemForm.value = ''
  itemForm.color = ''
  itemForm.isEnabled = true
  itemForm.sort = 0
  itemForm.remark = ''
}

function handleCreateType() {
  isTypeEdit.value = false
  resetTypeForm()
  typeDialogVisible.value = true
}

function handleEditType(type: DictionaryType, event?: MouseEvent) {
  event?.stopPropagation()
  isTypeEdit.value = true
  currentTypeId.value = type.id
  typeForm.name = type.name
  typeForm.code = type.code
  typeForm.description = type.description || ''
  typeForm.isEnabled = type.isEnabled
  typeForm.sort = type.sort
  typeDialogVisible.value = true
}

function handleDeleteType(type: DictionaryType, event?: MouseEvent) {
  event?.stopPropagation()
  dialog.warning({
    title: '提示',
    content: `确定要删除字典类型「${type.name}」吗?`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteDictionaryType(type.id)
        message.success('删除成功')
        await fetchTypes()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    },
  })
}

function handleCreateItem() {
  if (!selectedType.value) return
  isItemEdit.value = false
  resetItemForm()
  itemDialogVisible.value = true
}

function handleEditItem(item: DictionaryItem) {
  isItemEdit.value = true
  currentItemId.value = item.id
  itemForm.typeId = item.typeId
  itemForm.label = item.label
  itemForm.value = item.value
  itemForm.color = item.color || ''
  itemForm.isEnabled = item.isEnabled
  itemForm.sort = item.sort
  itemForm.remark = item.remark || ''
  itemDialogVisible.value = true
}

function handleDeleteItem(item: DictionaryItem) {
  dialog.warning({
    title: '提示',
    content: `确定要删除字典项「${item.label}」吗?`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteDictionaryItem(item.id)
        message.success('删除成功')
        await fetchTypes()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    },
  })
}

async function submitType() {
  if (!typeFormRef.value) return

  await typeFormRef.value.validate(async (errors) => {
    if (errors) return

    typeSubmitLoading.value = true
    try {
      if (isTypeEdit.value && currentTypeId.value) {
        await updateDictionaryType(currentTypeId.value, typeForm)
        message.success('更新成功')
      } else {
        await createDictionaryType(typeForm)
        message.success('创建成功')
      }
      typeDialogVisible.value = false
      await fetchTypes()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    } finally {
      typeSubmitLoading.value = false
    }
  })
}

async function submitItem() {
  if (!itemFormRef.value || !selectedType.value) return

  itemForm.typeId = selectedType.value.id
  await itemFormRef.value.validate(async (errors) => {
    if (errors) return

    itemSubmitLoading.value = true
    try {
      if (isItemEdit.value && currentItemId.value) {
        await updateDictionaryItem(currentItemId.value, itemForm)
        message.success('更新成功')
      } else {
        await createDictionaryItem(itemForm)
        message.success('创建成功')
      }
      itemDialogVisible.value = false
      await fetchTypes()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    } finally {
      itemSubmitLoading.value = false
    }
  })
}

onMounted(() => {
  fetchTypes()
})
</script>

<style scoped>
.dictionary-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dictionary-panel {
  min-width: 0;
}

.color-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.selected-type-row td) {
  background-color: rgba(24, 160, 88, 0.08);
}

:deep(.n-data-table-tr) {
  cursor: pointer;
}

:deep(.dictionary-type-query.query-form),
:deep(.dictionary-item-query.query-form) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

:deep(.dictionary-type-query.query-form .n-form-item:last-child),
:deep(.dictionary-item-query.query-form .n-form-item:last-child) {
  grid-column: 3;
}

@media (max-width: 1200px) {
  .dictionary-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  :deep(.dictionary-item-query.query-form) {
    grid-template-columns: minmax(0, 1fr);
  }

  :deep(.dictionary-type-query.query-form .n-form-item:last-child),
  :deep(.dictionary-item-query.query-form .n-form-item:last-child) {
    grid-column: auto;
  }
}
</style>
