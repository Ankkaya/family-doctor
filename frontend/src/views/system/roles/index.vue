<template>
  <div class="page-container role-list">
    <PageToolbar>
      <n-button v-if="authStore.hasPermission('system:role:create')" type="primary" @click="handleCreate">新增角色</n-button>
    </PageToolbar>

    <PageTableCard
      v-model:column-setting-value="checkedColumnKeys"
      :column-setting-options="columnOptions"
      export-permission="system:role:export"
      batch-delete-permission="system:role:batch-delete"
      :selected-count="selectedRowKeys.length"
      @reset-columns="resetColumnSettings"
      @export="handleExport"
      @batch-delete="handleBatchDelete"
    >
      <n-data-table
        :columns="columns"
        :data="roles"
        :loading="loading"
        :scroll-x="tableScrollX"
        :row-key="(row: Role) => row.id"
        :checked-row-keys="selectedRowKeys"
        striped
        @update:checked-row-keys="handleSelectedRowKeysUpdate"
      />
    </PageTableCard>

    <!-- 新增/编辑弹窗 -->
    <n-modal
      v-model:show="dialogVisible"
      :title="isEdit ? '编辑角色' : '新增角色'"
      preset="card"
      style="width: 500px"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <n-form-item label="角色名称" path="name">
          <n-input v-model:value="form.name" placeholder="请输入角色名称" />
        </n-form-item>
        <n-form-item label="角色编码" path="code">
          <n-input v-model:value="form.code" placeholder="请输入角色编码" :disabled="isEdit" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入描述" />
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
    </n-modal>

    <!-- 分配权限抽屉 -->
    <n-drawer
      v-model:show="permissionDialogVisible"
      placement="right"
      width="620px"
    >
      <n-drawer-content
        :title="`分配权限${currentRoleName ? ` - ${currentRoleName}` : ''}`"
        closable
      >
        <n-spin :show="permissionLoading">
          <n-tree
            v-if="menuTreeOptions.length > 0"
            block-line
            checkable
            cascade
            default-expand-all
            :data="menuTreeOptions"
            :checked-keys="selectedMenuIds"
            @update:checked-keys="handleMenuCheckedKeysUpdate"
          />
          <n-empty v-else description="暂无可分配菜单" />
        </n-spin>
        <template #footer>
          <n-space justify="end">
            <n-button @click="permissionDialogVisible = false">取消</n-button>
            <n-button type="primary" :loading="permissionSubmitLoading" @click="handleSaveMenus">
              保存
            </n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h, computed, type VNode } from 'vue'
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules, TreeOption } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import { NButton, NSpace } from 'naive-ui'
import dayjs from 'dayjs'
import { getRoles, createRole, updateRole, deleteRole, batchDeleteRoles, getRoleMenus, assignRoleMenus } from '@/api/roles'
import { getMenus } from '@/api/menu'
import type { Role, Menu } from '@/types'
import PageToolbar from '@/components/common/PageToolbar.vue'
import PageTableCard from '@/components/common/PageTableCard.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { autoFitTableColumns, createActionColumn } from '@/utils/table'
import { useAuthStore } from '@/store'
import { exportExcel } from '@/utils/export'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const loading = ref(false)
const submitLoading = ref(false)
const permissionLoading = ref(false)
const permissionSubmitLoading = ref(false)
const dialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const isEdit = ref(false)
const roles = ref<Role[]>([])
const selectedRowKeys = ref<DataTableRowKey[]>([])
const menus = ref<Menu[]>([])
const selectedMenuIds = ref<number[]>([])
const formRef = ref<FormInst>()
const currentRoleId = ref<number>()
const currentRoleName = ref('')

const form = reactive({
  name: '',
  code: '',
  description: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-z0-9_]+$/, message: '只能包含小写字母、数字和下划线', trigger: 'blur' }
  ]
}

const convertToTreeOptions = (list: Menu[]): TreeOption[] => {
  return list.map((menu) => ({
    label: menu.type === 'button' && menu.permission
      ? `${menu.name}（${menu.permission}）`
      : menu.name,
    key: menu.id,
    children: menu.children && menu.children.length > 0
      ? convertToTreeOptions(menu.children)
      : undefined
  }))
}

const menuTreeOptions = computed<TreeOption[]>(() => convertToTreeOptions(menus.value))

// 表格列定义
const createColumns = (): DataTableColumns<Role> => {
  return autoFitTableColumns([
    { type: 'selection', width: 48, fixed: 'left' },
    { title: 'ID', key: 'id' },
    { title: '角色名称', key: 'name' },
    { title: '角色编码', key: 'code' },
    {
      title: '描述',
      key: 'description',
      render: (row) => row.description || '-'
    },
    {
      title: '创建时间',
      key: 'createdAt',
      render: (row) => formatDate(row.createdAt)
    },
    createActionColumn<Role>({
      title: '操作',
      key: 'actions',
      render: (row) => {
        const actions: VNode[] = []
        if (authStore.hasPermission('system:role:assign-menus')) {
          actions.push(h(NButton, {
            text: true,
            type: 'primary',
            onClick: () => handleAssignMenus(row)
          }, { default: () => '分配权限' }))
        }
        if (authStore.hasPermission('system:role:update')) {
          actions.push(h(NButton, {
            text: true,
            type: 'primary',
            onClick: () => handleEdit(row)
          }, { default: () => '编辑' }))
        }
        if (authStore.hasPermission('system:role:delete')) {
          actions.push(h(NButton, {
            text: true,
            type: 'error',
            onClick: () => handleDelete(row)
          }, { default: () => '删除' }))
        }
        if (actions.length === 0) {
          return '-'
        }
        return h(NSpace, null, {
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
} = useTableColumnSettings<Role>('system-roles', baseColumns)

const fetchRoles = async () => {
  loading.value = true
  try {
    const res = await getRoles()
    roles.value = res
    selectedRowKeys.value = []
  } catch (error) {
    message.error('获取角色列表失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const handleSelectedRowKeysUpdate = (keys: DataTableRowKey[]) => {
  selectedRowKeys.value = keys
}

const handleExport = () => {
  exportExcel('角色管理', roles.value, [
    { title: 'ID', value: 'id' },
    { title: '角色名称', value: 'name' },
    { title: '角色编码', value: 'code' },
    { title: '描述', value: row => row.description || '' },
    { title: '创建时间', value: row => formatDate(row.createdAt) },
  ])
}

const handleBatchDelete = () => {
  const ids = selectedRowKeys.value.map(Number)
  if (ids.length === 0) {
    message.warning('请先选择要删除的角色')
    return
  }

  dialog.warning({
    title: '提示',
    content: `确定要删除选中的 ${ids.length} 个角色吗?`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await batchDeleteRoles(ids)
        message.success('批量删除成功')
        await fetchRoles()
      } catch (error: any) {
        message.error(error.message || '批量删除失败')
      }
    }
  })
}

const handleCreate = () => {
  isEdit.value = false
  form.name = ''
  form.code = ''
  form.description = ''
  dialogVisible.value = true
}

const handleEdit = (role: Role) => {
  isEdit.value = true
  currentRoleId.value = role.id
  form.name = role.name
  form.code = role.code
  form.description = role.description || ''
  dialogVisible.value = true
}

const handleAssignMenus = async (role: Role) => {
  currentRoleId.value = role.id
  currentRoleName.value = role.name
  selectedMenuIds.value = []
  permissionDialogVisible.value = true
  permissionLoading.value = true

  try {
    const [allMenus, assignedMenus] = await Promise.all([
      getMenus(),
      getRoleMenus(role.id, 'flat')
    ])
    menus.value = allMenus
    selectedMenuIds.value = assignedMenus.map((menu) => menu.id)
  } catch (error: any) {
    message.error(error.message || '获取权限信息失败')
  } finally {
    permissionLoading.value = false
  }
}

const handleMenuCheckedKeysUpdate = (keys: Array<string | number>) => {
  selectedMenuIds.value = keys.map(Number)
}

const handleSaveMenus = async () => {
  if (!currentRoleId.value) return

  permissionSubmitLoading.value = true
  try {
    await assignRoleMenus(currentRoleId.value, selectedMenuIds.value)
    message.success('权限分配成功')
    permissionDialogVisible.value = false
    fetchRoles()
  } catch (error: any) {
    message.error(error.message || '权限分配失败')
  } finally {
    permissionSubmitLoading.value = false
  }
}

const handleDelete = (role: Role) => {
  dialog.warning({
    title: '提示',
    content: `确定要删除角色「${role.name}」吗?`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteRole(role.id)
        message.success('删除成功')
        fetchRoles()
      } catch (error) {
        message.error('删除失败')
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
        if (isEdit.value) {
          await updateRole(currentRoleId.value!, {
            name: form.name,
            description: form.description
          })
          message.success('更新成功')
        } else {
          await createRole({
            name: form.name,
            code: form.code,
            description: form.description
          })
          message.success('创建成功')
        }
        dialogVisible.value = false
        fetchRoles()
      } catch (error) {
        message.error('操作失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchRoles()
})
</script>
