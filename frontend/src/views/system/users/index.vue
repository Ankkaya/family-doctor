<template>
  <div class="page-container user-list">
    <PageToolbar>
      <n-button v-if="authStore.hasPermission('system:user:create')" type="primary" @click="handleCreate">新增用户</n-button>
    </PageToolbar>

    <PageTableCard
      v-model:column-setting-value="checkedColumnKeys"
      :column-setting-options="columnOptions"
      export-permission="system:user:export"
      batch-delete-permission="system:user:batch-delete"
      :selected-count="selectedRowKeys.length"
      @reset-columns="resetColumnSettings"
      @export="handleExport"
      @batch-delete="handleBatchDelete"
    >
      <n-data-table
        :columns="columns"
        :data="users"
        :loading="loading"
        :scroll-x="tableScrollX"
        :row-key="(row: User) => row.id"
        :checked-row-keys="selectedRowKeys"
        striped
        @update:checked-row-keys="handleSelectedRowKeysUpdate"
      />
      <template #footer>
        <PagePagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :item-count="pagination.total"
          @update:page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </template>
    </PageTableCard>

    <!-- 新增/编辑弹窗 -->
    <n-modal
      v-model:show="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      preset="card"
      style="width: 500px"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <n-form-item label="用户头像" path="avatarUrl">
          <div class="avatar-field">
            <button
              type="button"
              class="avatar-picker"
              :class="{ 'avatar-picker--filled': !!formAvatarDisplayUrl }"
              @click="handleAvatarTrigger"
            >
              <img
                v-if="formAvatarDisplayUrl"
                :src="formAvatarDisplayUrl"
                alt="用户头像"
                class="avatar-picker__image"
              >
              <div v-else class="avatar-picker__placeholder">
                <n-icon size="28">
                  <add-outline />
                </n-icon>
              </div>
            </button>
            <div class="avatar-field__actions">
              <p class="avatar-field__hint">支持 JPG、PNG、WEBP、GIF、AVIF</p>
              <n-button
                v-if="formAvatarDisplayUrl"
                text
                type="error"
                size="small"
                @click="handleClearAvatar"
              >
                清空头像
              </n-button>
            </div>
            <input
              ref="avatarInputRef"
              class="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              @change="handleAvatarSelected"
            >
          </div>
        </n-form-item>
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" :disabled="isEdit" autocomplete="username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="form.email" autocomplete="email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item label="密码" path="password" v-if="!isEdit">
          <n-input v-model:value="form.password" type="password" show-password-on="click" autocomplete="new-password" placeholder="请输入密码" />
        </n-form-item>
        <n-form-item label="姓名" path="name">
          <n-input v-model:value="form.name" placeholder="请输入姓名" />
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

    <!-- 分配角色弹窗 -->
    <n-modal
      v-model:show="roleDialogVisible"
      :title="`分配角色${currentUserName ? ` - ${currentUserName}` : ''}`"
      preset="card"
      style="width: 520px"
    >
      <n-spin :show="roleLoading">
        <n-checkbox-group v-model:value="selectedRoleIds">
          <n-space v-if="allRoles.length > 0" vertical>
            <n-checkbox
              v-for="role in allRoles"
              :key="role.id"
              :value="role.id"
              :label="`${role.name}（${role.code}）`"
            />
          </n-space>
          <n-empty v-else description="暂无可分配角色" />
        </n-checkbox-group>
      </n-spin>
      <template #footer>
        <n-space justify="end">
          <n-button @click="roleDialogVisible = false">取消</n-button>
          <n-button type="primary" :loading="roleSubmitLoading" @click="handleSaveRoles">
            保存
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 重置密码弹窗 -->
    <n-modal
      v-model:show="passwordDialogVisible"
      :title="`重置密码${currentUserName ? ` - ${currentUserName}` : ''}`"
      preset="card"
      style="width: 460px"
    >
      <n-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="96px">
        <n-form-item label="新密码" path="password">
          <n-input
            v-model:value="passwordForm.password"
            type="password"
            show-password-on="click"
            autocomplete="new-password"
            placeholder="请输入新密码"
          />
        </n-form-item>
        <n-form-item label="确认密码" path="confirmPassword">
          <n-input
            v-model:value="passwordForm.confirmPassword"
            type="password"
            show-password-on="click"
            autocomplete="new-password"
            placeholder="请再次输入新密码"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="passwordDialogVisible = false">取消</n-button>
          <n-button type="primary" :loading="passwordSubmitLoading" @click="handleSubmitPasswordReset">
            确定
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <UserAvatarEditorModal
      v-model:show="avatarEditorVisible"
      :source-url="avatarEditorSourceUrl"
      @confirm="handleAvatarEditorConfirm"
      @cancel="handleAvatarEditorCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, h, type VNode } from 'vue'
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import { NAvatar, NButton, NIcon, NImage, NSpace } from 'naive-ui'
import dayjs from 'dayjs'
import { AddOutline } from '@vicons/ionicons5'
import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  batchDeleteUsers,
  getUserRoles,
  assignUserRoles,
} from '@/api/user'
import { uploadFile } from '@/api/file'
import { getRoles } from '@/api/roles'
import type { User, Role, CreateUserDto, ResetUserPasswordDto } from '@/types'
import PagePagination from '@/components/common/PagePagination.vue'
import PageToolbar from '@/components/common/PageToolbar.vue'
import PageTableCard from '@/components/common/PageTableCard.vue'
import UserAvatarEditorModal from '@/components/common/UserAvatarEditorModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { autoFitTableColumns, createActionColumn } from '@/utils/table'
import { useAuthStore } from '@/store'
import { resolveFileUrl } from '@/utils/file-url'
import { exportExcel } from '@/utils/export'

const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const loading = ref(false)
const submitLoading = ref(false)
const roleLoading = ref(false)
const roleSubmitLoading = ref(false)
const passwordSubmitLoading = ref(false)
const dialogVisible = ref(false)
const roleDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const avatarEditorVisible = ref(false)
const isEdit = ref(false)
const users = ref<User[]>([])
const selectedRowKeys = ref<DataTableRowKey[]>([])
const allRoles = ref<Role[]>([])
const selectedRoleIds = ref<number[]>([])
const formRef = ref<FormInst>()
const passwordFormRef = ref<FormInst>()
const avatarInputRef = ref<HTMLInputElement | null>(null)
const avatarEditorSourceUrl = ref('')
const avatarPreviewUrl = ref('')
const pendingAvatarBlob = ref<Blob | null>(null)
const currentUserId = ref<number>()
const currentUserName = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive<CreateUserDto & { avatarUrl?: string | null }>({
  username: '',
  email: '',
  password: '',
  name: '',
  avatarUrl: null,
})

const passwordForm = reactive<ResetUserPasswordDto & { confirmPassword: string }>({
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3位', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

const passwordRules: FormRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string) => value === passwordForm.password,
      message: '两次输入的密码不一致',
      trigger: ['blur', 'input'],
    },
  ],
}

const formAvatarDisplayUrl = computed(() => {
  if (avatarPreviewUrl.value) {
    return avatarPreviewUrl.value
  }

  if (form.avatarUrl) {
    return resolveFileUrl(form.avatarUrl)
  }

  return ''
})

// 表格列定义
const createColumns = (): DataTableColumns<User> => {
  return autoFitTableColumns([
    { type: 'selection', width: 48, fixed: 'left' },
    { title: 'ID', key: 'id' },
    {
      title: '头像',
      key: 'avatarUrl',
      render: (row) => {
        if (row.avatarUrl) {
          return h(NImage, {
            src: resolveFileUrl(row.avatarUrl),
            alt: row.name || row.username,
            width: 36,
            height: 36,
            objectFit: 'cover',
            previewDisabled: true,
            imgProps: {
              class: 'user-table-avatar',
            },
          })
        }

        return h(NAvatar, {
          round: true,
          size: 36,
        }, {
          default: () => row.name?.slice(0, 1) || row.username.slice(0, 1) || 'U'
        })
      }
    },
    { title: '用户名', key: 'username' },
    {
      title: '邮箱',
      key: 'email',
      render: (row) => row.email || '-'
    },
    {
      title: '姓名',
      key: 'name',
      render: (row) => row.name || '-'
    },
    {
      title: '创建时间',
      key: 'createdAt',
      render: (row) => formatDate(row.createdAt)
    },
    createActionColumn<User>({
      title: '操作',
      key: 'actions',
      render: (row) => {
        const actions: VNode[] = []
        if (authStore.hasPermission('system:user:assign-roles')) {
          actions.push(h(NButton, {
            text: true,
            type: 'primary',
            onClick: () => handleAssignRoles(row)
          }, { default: () => '分配角色' }))
        }
        if (authStore.hasPermission('system:user:update')) {
          actions.push(h(NButton, {
            text: true,
            type: 'warning',
            onClick: () => handleResetPassword(row)
          }, { default: () => '重置密码' }))
        }
        if (authStore.hasPermission('system:user:update')) {
          actions.push(h(NButton, {
            text: true,
            type: 'primary',
            onClick: () => handleEdit(row)
          }, { default: () => '编辑' }))
        }
        if (authStore.hasPermission('system:user:delete')) {
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
    }, 4)
  ])
}

const baseColumns = createColumns()
const {
  checkedColumnKeys,
  columnOptions,
  columns,
  resetColumnSettings,
  tableScrollX,
} = useTableColumnSettings<User>('system-users', baseColumns)

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getUsers({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    users.value = res.items
    pagination.total = res.total
    selectedRowKeys.value = []
  } catch (error) {
    message.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchUsers()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  fetchUsers()
}

const handleSelectedRowKeysUpdate = (keys: DataTableRowKey[]) => {
  selectedRowKeys.value = keys
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const handleExport = () => {
  exportExcel('用户管理', users.value, [
    { title: 'ID', value: 'id' },
    { title: '用户名', value: 'username' },
    { title: '邮箱', value: row => row.email || '' },
    { title: '姓名', value: row => row.name || '' },
    { title: '创建时间', value: row => formatDate(row.createdAt) },
  ])
}

const handleBatchDelete = () => {
  const ids = selectedRowKeys.value.map(Number)
  if (ids.length === 0) {
    message.warning('请先选择要删除的用户')
    return
  }

  dialog.warning({
    title: '提示',
    content: `确定要删除选中的 ${ids.length} 个用户吗?`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await batchDeleteUsers(ids)
        message.success('批量删除成功')
        await fetchUsers()
      } catch (error: any) {
        message.error(error.message || '批量删除失败')
      }
    }
  })
}

const resetUserForm = () => {
  form.username = ''
  form.email = ''
  form.password = ''
  form.name = ''
  form.avatarUrl = null
  clearAvatarAssets()
}

const handleCreate = () => {
  isEdit.value = false
  resetUserForm()
  dialogVisible.value = true
}

const handleEdit = (user: User) => {
  isEdit.value = true
  currentUserId.value = user.id
  clearAvatarAssets()
  form.username = user.username
  form.email = user.email || ''
  form.name = user.name || ''
  form.password = ''
  form.avatarUrl = user.avatarUrl || null
  dialogVisible.value = true
}

const handleAvatarTrigger = () => {
  avatarInputRef.value?.click()
}

const revokeObjectUrl = (url: string) => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

const clearAvatarAssets = () => {
  avatarEditorSourceUrl.value = ''
  revokeObjectUrl(avatarPreviewUrl.value)
  avatarPreviewUrl.value = ''
  pendingAvatarBlob.value = null
}

const clearAvatarEditorSource = () => {
  avatarEditorSourceUrl.value = ''
}

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result)
      return
    }

    reject(new Error('头像图片读取失败'))
  }
  reader.onerror = () => reject(new Error('头像图片读取失败'))
  reader.readAsDataURL(file)
})

const handleAvatarSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) {
    return
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    message.error('仅支持 JPG、PNG、WEBP、GIF、AVIF 格式图片')
    if (input) input.value = ''
    return
  }

  if (file.size > MAX_AVATAR_SIZE) {
    message.error('头像图片大小不能超过 5MB')
    if (input) input.value = ''
    return
  }

  try {
    avatarEditorSourceUrl.value = await readFileAsDataUrl(file)
    avatarEditorVisible.value = true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '头像图片读取失败')
  }

  if (input) {
    input.value = ''
  }
}

const handleAvatarEditorConfirm = (payload: { blob: Blob; previewUrl: string }) => {
  clearAvatarEditorSource()
  revokeObjectUrl(avatarPreviewUrl.value)
  avatarPreviewUrl.value = payload.previewUrl
  pendingAvatarBlob.value = payload.blob
  form.avatarUrl = null
}

const handleAvatarEditorCancel = () => {
  clearAvatarEditorSource()
}

const handleClearAvatar = () => {
  clearAvatarAssets()
  form.avatarUrl = null
}

const uploadPendingAvatarIfNeeded = async () => {
  if (!pendingAvatarBlob.value) {
    return form.avatarUrl || null
  }

  const avatarFile = new File([pendingAvatarBlob.value], `avatar-${Date.now()}.png`, {
    type: 'image/png',
  })
  const result = await uploadFile(avatarFile, 'users/avatars')
  return result.url
}

const handleAssignRoles = async (user: User) => {
  currentUserId.value = user.id
  currentUserName.value = user.name || user.username
  selectedRoleIds.value = []
  roleDialogVisible.value = true
  roleLoading.value = true

  try {
    const [roles, assignedRoles] = await Promise.all([
      getRoles(),
      getUserRoles(user.id)
    ])
    allRoles.value = roles
    selectedRoleIds.value = assignedRoles.map((role) => role.id)
  } catch (error: any) {
    message.error(error.message || '获取角色信息失败')
  } finally {
    roleLoading.value = false
  }
}

const handleResetPassword = (user: User) => {
  currentUserId.value = user.id
  currentUserName.value = user.name || user.username
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

const handleSaveRoles = async () => {
  if (!currentUserId.value) return

  roleSubmitLoading.value = true
  try {
    await assignUserRoles(currentUserId.value, selectedRoleIds.value)
    message.success('角色分配成功')
    roleDialogVisible.value = false
    fetchUsers()
  } catch (error: any) {
    message.error(error.message || '角色分配失败')
  } finally {
    roleSubmitLoading.value = false
  }
}

const handleDelete = (user: User) => {
  dialog.warning({
    title: '提示',
    content: '确定要删除该用户吗?',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteUser(user.id)
        message.success('删除成功')
        fetchUsers()
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
        const uploadedAvatarUrl = await uploadPendingAvatarIfNeeded()
        if (isEdit.value) {
          await updateUser(currentUserId.value!, {
            email: form.email,
            name: form.name,
            avatarUrl: uploadedAvatarUrl,
          })
          if (currentUserId.value === authStore.user?.id) {
            await authStore.fetchUser()
          }
          message.success('更新成功')
        } else {
          await createUser({
            username: form.username,
            email: form.email,
            password: form.password,
            name: form.name,
            avatarUrl: uploadedAvatarUrl,
          })
          message.success('创建成功')
        }
        dialogVisible.value = false
        clearAvatarAssets()
        fetchUsers()
      } catch (error: any) {
        message.error(error.message || '操作失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const handleSubmitPasswordReset = async () => {
  if (!passwordFormRef.value || !currentUserId.value) return

  await passwordFormRef.value.validate(async (errors) => {
    if (!errors) {
      passwordSubmitLoading.value = true
      try {
        await resetUserPassword(currentUserId.value!, { password: passwordForm.password })
        message.success('密码重置成功')
        passwordDialogVisible.value = false
      } catch (error: any) {
        message.error(error.message || '密码重置失败')
      } finally {
        passwordSubmitLoading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchUsers()
})

onBeforeUnmount(() => {
  clearAvatarAssets()
})
</script>

<style scoped>
.avatar-field {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.avatar-field__actions {
  flex: 1;
  padding-top: 92px;
}

.avatar-field__hint {
  color: var(--n-text-color-3, #64748b);
  font-size: 12px;
  line-height: 1.5;
}

.avatar-picker {
  width: 112px;
  height: 112px;
  border: 1px dashed var(--n-border-color, rgba(148, 163, 184, 0.8));
  border-radius: 22px;
  background: var(--n-color-embedded, #f8fafc);
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar-picker:hover {
  border-color: var(--n-primary-color, #2080f0);
  transform: translateY(-1px);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--n-primary-color, #2080f0) 18%, transparent);
}

.avatar-picker--filled {
  border-style: solid;
  background: var(--n-color-modal, #fff);
}

.avatar-picker__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--n-primary-color, #2080f0);
}

.avatar-picker__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-table-avatar {
  display: block;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  object-fit: cover;
}
</style>
