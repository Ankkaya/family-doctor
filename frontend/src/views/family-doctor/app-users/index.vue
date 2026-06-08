<template>
  <div class="page-container">
    <PageSearchCard>
      <QueryForm :model="query" @search="fetchUsers">
        <n-form-item label="关键词">
          <n-input v-model:value="query.keyword" clearable placeholder="用户 ID / 用户名 / 昵称 / 手机号 / 家庭" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select
            v-model:value="query.status"
            clearable
            placeholder="全部"
            :options="statusOptions"
            style="width: 140px"
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="handleSearch">搜索</n-button>
            <n-button @click="handleReset">重置</n-button>
          </n-space>
        </n-form-item>
      </QueryForm>
    </PageSearchCard>

    <PageTableCard>
      <n-data-table
        :columns="columns"
        :data="users"
        :loading="loading"
        :pagination="false"
        :scroll-x="1380"
        striped
      />
      <template #footer>
        <PagePagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :item-count="pagination.total"
          @update:page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </template>
    </PageTableCard>

    <n-modal
      v-model:show="householdVisible"
      :title="`家庭关系${currentUserTitle ? ` - ${currentUserTitle}` : ''}`"
      preset="card"
      :style="householdModalStyle"
    >
      <n-spin :show="householdLoading">
        <n-data-table
          :columns="householdColumns"
          :data="households"
          :pagination="false"
          :scroll-x="householdTableScrollX"
          :max-height="householdTableMaxHeight"
          striped
        />
      </n-spin>
    </n-modal>

    <n-modal
      v-model:show="profileVisible"
      :title="`个人信息${currentUserTitle ? ` - ${currentUserTitle}` : ''}`"
      preset="card"
      style="width: min(560px, 94vw)"
    >
      <n-descriptions v-if="currentProfile" :column="1" bordered label-placement="left">
        <n-descriptions-item label="头像">
          <n-avatar
            round
            :size="56"
            :src="currentProfile.avatarUrl || undefined"
            fallback-src=""
          >
            {{ getAvatarText(currentProfile) }}
          </n-avatar>
        </n-descriptions-item>
        <n-descriptions-item label="用户名">
          {{ currentProfile.username || '-' }}
        </n-descriptions-item>
        <n-descriptions-item label="昵称">
          {{ currentProfile.nickname || '-' }}
        </n-descriptions-item>
        <n-descriptions-item label="年龄">
          {{ currentProfile.age ?? '-' }}
        </n-descriptions-item>
        <n-descriptions-item label="性别">
          {{ formatGender(currentProfile.gender) }}
        </n-descriptions-item>
        <n-descriptions-item label="过敏史">
          <span class="profile-text">{{ currentProfile.allergies || '-' }}</span>
        </n-descriptions-item>
        <n-descriptions-item label="基础病">
          <span class="profile-text">{{ currentProfile.chronicDiseases || '-' }}</span>
        </n-descriptions-item>
        <n-descriptions-item label="长期用药">
          <span class="profile-text">{{ currentProfile.medicationHistory || '-' }}</span>
        </n-descriptions-item>
      </n-descriptions>
    </n-modal>

    <n-modal
      v-model:show="passwordVisible"
      :title="`重置密码${currentUserTitle ? ` - ${currentUserTitle}` : ''}`"
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
          <n-button @click="passwordVisible = false">取消</n-button>
          <n-button type="primary" :loading="passwordSubmitLoading" @click="handleSubmitPasswordReset">
            确定
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, type VNode } from 'vue';
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui';
import { NButton, NSpace, NTag, useDialog, useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import PagePagination from '@/components/common/PagePagination.vue';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import { useAuthStore } from '@/store';
import {
  deleteAdminAppUser,
  getAdminAppUserHouseholds,
  getAdminAppUsers,
  resetAdminAppUserPassword,
  updateAdminAppUserStatus,
  type AdminAppUser,
  type AppUserHousehold,
} from '@/api/family-doctor';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();

const loading = ref(false);
const householdLoading = ref(false);
const householdVisible = ref(false);
const profileVisible = ref(false);
const passwordVisible = ref(false);
const passwordSubmitLoading = ref(false);
const users = ref<AdminAppUser[]>([]);
const households = ref<AppUserHousehold[]>([]);
const currentUserId = ref('');
const currentUserName = ref('');
const currentProfile = ref<AdminAppUser | null>(null);
const passwordFormRef = ref<FormInst>();
const householdTableScrollX = 900;
const householdModalStyle = {
  width: 'min(1060px, 94vw)',
  height: 'min(560px, 82vh)',
};
const householdTableMaxHeight = 'min(420px, calc(82vh - 140px))';
const currentUserTitle = computed(() => shortenText(currentUserName.value, 24));

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];

const query = reactive<{
  keyword: string;
  status: 'active' | 'disabled' | null;
}>({
  keyword: '',
  status: null,
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const passwordForm = reactive({
  password: '',
  confirmPassword: '',
});

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
};

const columns: DataTableColumns<AdminAppUser> = [
  {
    title: '用户',
    key: 'nickname',
    minWidth: 210,
    fixed: 'left',
    render: row => renderUser(row),
  },
  {
    title: '联系方式',
    key: 'contact',
    minWidth: 180,
    render: row => renderContact(row),
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: row => renderStatus(row.status),
  },
  {
    title: '默认家庭',
    key: 'defaultHouseholdName',
    minWidth: 170,
    render: row => row.defaultHouseholdName || row.defaultHouseholdCode || '-',
  },
  { title: '家庭数', key: 'householdCount', width: 90, align: 'center' },
  { title: '拥有家庭', key: 'ownedHouseholdCount', width: 100, align: 'center' },
  { title: '药品数', key: 'medicineCount', width: 90, align: 'center' },
  { title: '问诊数', key: 'sessionCount', width: 90, align: 'center' },
  { title: '最近问诊', key: 'lastConsultationAt', width: 180, render: row => formatDate(row.lastConsultationAt) },
  { title: '注册时间', key: 'createdAt', width: 180, render: row => formatDate(row.createdAt) },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    fixed: 'right',
    render: row => renderActions(row),
  },
];

const householdColumns: DataTableColumns<AppUserHousehold> = [
  { title: '家庭名称', key: 'name', minWidth: 180, fixed: 'left', ellipsis: { tooltip: true } },
  { title: '邀请码', key: 'code', width: 110 },
  {
    title: '角色',
    key: 'role',
    width: 110,
    render: row => h(NTag, { size: 'small', type: row.role === 'owner' ? 'success' : 'default' }, {
      default: () => row.role === 'owner' ? '管理员' : '成员',
    }),
  },
  { title: '家庭昵称', key: 'displayName', minWidth: 150, render: row => row.displayName || '-' },
  { title: '成员数', key: 'memberCount', width: 90, align: 'center' },
  { title: '药品数', key: 'medicineCount', width: 90, align: 'center' },
  { title: '问诊数', key: 'sessionCount', width: 90, align: 'center' },
  { title: '加入时间', key: 'joinedAt', width: 180, render: row => formatDate(row.joinedAt) },
];

function renderUser(row: AdminAppUser) {
  const name = row.username || row.nickname || row.phone || row.email || row.id || '未命名用户';
  return h('div', { class: 'user-cell' }, [
    h('span', { class: 'user-cell__name' }, name),
  ]);
}

function renderContact(row: AdminAppUser) {
  const items = [row.phone, row.email].filter((item): item is string => !!item);
  if (items.length === 0) {
    return '-';
  }

  return h('div', { class: 'stacked-text' }, items.map(item => h('span', {}, item)));
}

function renderStatus(status: string) {
  const active = status === 'active';
  return h(NTag, { size: 'small', type: active ? 'success' : 'error' }, {
    default: () => active ? '启用' : '停用',
  });
}

function renderActions(row: AdminAppUser) {
  const actions: VNode[] = [
    h(NButton, { text: true, type: 'primary', onClick: () => openProfile(row) }, { default: () => '详情' }),
    h(NButton, { text: true, type: 'primary', onClick: () => openHouseholds(row) }, { default: () => '家庭' }),
  ];

  if (authStore.hasPermission('family-doctor:app-user:update')) {
    actions.push(h(NButton, {
      text: true,
      type: row.status === 'active' ? 'warning' : 'success',
      onClick: () => handleToggleStatus(row),
    }, { default: () => row.status === 'active' ? '停用' : '启用' }));
  }

  if (authStore.hasPermission('family-doctor:app-user:reset-password')) {
    actions.push(h(NButton, {
      text: true,
      type: 'primary',
      onClick: () => openPasswordDialog(row),
    }, { default: () => '重置密码' }));
  }

  if (authStore.hasPermission('family-doctor:app-user:delete')) {
    actions.push(h(NButton, {
      text: true,
      type: 'error',
      onClick: () => handleDelete(row),
    }, { default: () => '删除' }));
  }

  return h(NSpace, null, { default: () => actions });
}

function getUserDisplayName(row: AdminAppUser) {
  return row.nickname || row.username || row.phone || row.email || row.id;
}

function openProfile(row: AdminAppUser) {
  currentProfile.value = row;
  currentUserId.value = row.id;
  currentUserName.value = getUserDisplayName(row);
  profileVisible.value = true;
}

function getAvatarText(row: AdminAppUser) {
  return getUserDisplayName(row).slice(0, 1).toUpperCase();
}

function formatGender(gender?: string | null) {
  const genderMap: Record<string, string> = {
    male: '男',
    female: '女',
    other: '其他',
    unknown: '未知',
  };
  return gender ? genderMap[gender] || gender : '-';
}

function shortenText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await getAdminAppUsers({
      keyword: query.keyword || undefined,
      status: query.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    users.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    message.error(error?.message || 'App 用户列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function openHouseholds(row: AdminAppUser) {
  currentUserId.value = row.id;
  currentUserName.value = getUserDisplayName(row);
  householdVisible.value = true;
  householdLoading.value = true;
  try {
    households.value = await getAdminAppUserHouseholds(row.id);
  } catch (error: any) {
    message.error(error?.message || '家庭关系加载失败');
  } finally {
    householdLoading.value = false;
  }
}

function handleToggleStatus(row: AdminAppUser) {
  const nextStatus = row.status === 'active' ? 'disabled' : 'active';
  const action = nextStatus === 'active' ? '启用' : '停用';

  dialog.warning({
    title: '提示',
    content: `确定要${action}该 App 用户吗?`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await updateAdminAppUserStatus(row.id, nextStatus);
        message.success(`${action}成功`);
        await fetchUsers();
      } catch (error: any) {
        message.error(error?.message || `${action}失败`);
      }
    },
  });
}

function openPasswordDialog(row: AdminAppUser) {
  currentUserId.value = row.id;
  currentUserName.value = getUserDisplayName(row);
  passwordForm.password = '';
  passwordForm.confirmPassword = '';
  passwordVisible.value = true;
}

function handleDelete(row: AdminAppUser) {
  dialog.warning({
    title: '删除确认',
    content: `确定删除「${getUserDisplayName(row)}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteAdminAppUser(row.id);
        if (currentUserId.value === row.id) {
          householdVisible.value = false;
          passwordVisible.value = false;
        }
        message.success('删除成功');
        await fetchUsers();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
  });
}

async function handleSubmitPasswordReset() {
  if (!passwordFormRef.value || !currentUserId.value) return;

  try {
    await passwordFormRef.value.validate();
  } catch {
    return;
  }

  passwordSubmitLoading.value = true;
  try {
    await resetAdminAppUserPassword(currentUserId.value, passwordForm.password);
    message.success('密码重置成功');
    passwordVisible.value = false;
  } catch (error: any) {
    message.error(error?.message || '密码重置失败');
  } finally {
    passwordSubmitLoading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchUsers();
}

function handleReset() {
  query.keyword = '';
  query.status = null;
  pagination.page = 1;
  fetchUsers();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchUsers();
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  fetchUsers();
}

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.user-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.user-cell__name {
  overflow: hidden;
  font-weight: 600;
  color: var(--n-text-color);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stacked-text {
  display: grid;
  gap: 3px;
  font-size: 13px;
}

.profile-text {
  white-space: pre-wrap;
}
</style>
