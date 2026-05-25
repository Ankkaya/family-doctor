<template>
  <div class="page-container">
    <PageSearchCard>
      <QueryForm :model="query" @search="fetchMedicines">
        <n-form-item label="关键词">
          <n-input v-model:value="query.keyword" clearable placeholder="药品名称 / 别名 / 适应症" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" @click="handleSearch">搜索</n-button>
            <n-button @click="handleReset">重置</n-button>
          </n-space>
        </n-form-item>
      </QueryForm>
    </PageSearchCard>

    <PageToolbar>
      <n-button
        v-if="authStore.hasPermission('family-doctor:medicine:create')"
        type="primary"
        @click="handleCreate"
      >
        新增药品
      </n-button>
    </PageToolbar>

    <PageTableCard>
      <n-data-table
        :columns="columns"
        :data="medicines"
        :loading="loading"
        :pagination="false"
        :scroll-x="1250"
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

    <n-drawer v-model:show="drawerVisible" :width="drawerWidth" placement="right">
      <n-drawer-content :title="editingId ? '编辑药品' : '新增药品'" closable>
        <n-form ref="formRef" :model="form" :rules="rules" label-width="96px">
          <n-form-item label="药品名称" path="name">
            <n-input v-model:value="form.name" placeholder="请输入药品名称" />
          </n-form-item>
          <n-form-item label="别名">
            <n-input v-model:value="aliasesText" placeholder="多个别名用逗号分隔" />
          </n-form-item>
          <n-form-item label="分类" path="otc">
            <n-radio-group v-model:value="form.otc">
              <n-radio-button value="OTC">OTC(非处方药)</n-radio-button>
              <n-radio-button value="RX">RX(处方药)</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="适应症" path="indication">
            <n-input
              v-model:value="form.indication"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="请输入适应症"
            />
          </n-form-item>
          <n-form-item label="禁忌人群">
            <n-input v-model:value="form.contraindication" type="textarea" placeholder="请输入禁忌人群" />
          </n-form-item>
          <n-form-item label="不良反应">
            <n-input v-model:value="form.adverseReaction" type="textarea" placeholder="请输入不良反应" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="16" responsive="screen">
            <n-form-item-gi label="条形码">
              <n-input v-model:value="form.barcode" placeholder="可选" />
            </n-form-item-gi>
            <n-form-item-gi label="批准文号">
              <n-input v-model:value="form.approvalNumber" placeholder="可选" />
            </n-form-item-gi>
          </n-grid>
          <n-form-item label="用法用量">
            <n-input v-model:value="form.dosage" placeholder="请按说明书或药师指导使用" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="drawerVisible = false">取消</n-button>
            <n-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, type VNode } from 'vue';
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui';
import { NButton, NSpace, NTag, useDialog, useMessage } from 'naive-ui';
import dayjs from 'dayjs';
import PagePagination from '@/components/common/PagePagination.vue';
import PageSearchCard from '@/components/common/PageSearchCard.vue';
import PageToolbar from '@/components/common/PageToolbar.vue';
import PageTableCard from '@/components/common/PageTableCard.vue';
import QueryForm from '@/components/common/QueryForm.vue';
import { useAuthStore } from '@/store';
import {
  createAdminMedicine,
  deleteAdminMedicine,
  getAdminMedicines,
  updateAdminMedicine,
  type MedicineCatalogItem,
  type MedicineForm,
} from '@/api/family-doctor';

const message = useMessage();
const dialog = useDialog();
const authStore = useAuthStore();
const drawerWidth = 'min(680px, 92vw)';

const loading = ref(false);
const submitLoading = ref(false);
const drawerVisible = ref(false);
const editingId = ref<string>();
const formRef = ref<FormInst>();
const aliasesText = ref('');
const medicines = ref<MedicineCatalogItem[]>([]);

const query = reactive({
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const form = reactive<MedicineForm>({
  name: '',
  aliases: [],
  otc: 'OTC',
  indication: '',
  contraindication: '',
  adverseReaction: '',
  dosage: '',
  barcode: '',
  approvalNumber: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入药品名称', trigger: 'blur' }],
  otc: [{ required: true, message: '请选择分类', trigger: 'change' }],
  indication: [{ required: true, message: '请输入适应症', trigger: 'blur' }],
};

const columns: DataTableColumns<MedicineCatalogItem> = [
  { title: '药品名称', key: 'name', width: 180, fixed: 'left' },
  {
    title: '分类',
    key: 'otc',
    width: 140,
    render: row => h(NTag, { type: row.otc === 'OTC' ? 'success' : 'warning', size: 'small' }, {
      default: () => formatOtcLabel(row.otc),
    }),
  },
  { title: '适应症', key: 'indication', minWidth: 260, ellipsis: { tooltip: true } },
  {
    title: '别名',
    key: 'aliases',
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: row => row.aliases?.join('、') || '-',
  },
  { title: '条形码', key: 'barcode', width: 150, render: row => row.barcode || '-' },
  { title: '更新时间', key: 'updatedAt', width: 180, render: row => formatDate(row.updatedAt) },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render(row) {
      const actions: VNode[] = [];
      if (authStore.hasPermission('family-doctor:medicine:update')) {
        actions.push(h(NButton, { text: true, type: 'primary', onClick: () => handleEdit(row) }, { default: () => '编辑' }));
      }
      if (authStore.hasPermission('family-doctor:medicine:delete')) {
        actions.push(h(NButton, { text: true, type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' }));
      }
      return actions.length ? h(NSpace, null, { default: () => actions }) : '-';
    },
  },
];

function formatDate(value: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatOtcLabel(value: MedicineCatalogItem['otc']) {
  return value === 'OTC' ? 'OTC(非处方药)' : 'RX(处方药)';
}

function normalizeFormPayload(): MedicineForm {
  return {
    ...form,
    aliases: aliasesText.value.split(/[,，]/).map(item => item.trim()).filter(Boolean),
    contraindication: form.contraindication || null,
    adverseReaction: form.adverseReaction || null,
    dosage: form.dosage || null,
    barcode: form.barcode || null,
    approvalNumber: form.approvalNumber || null,
  };
}

function resetForm() {
  editingId.value = undefined;
  aliasesText.value = '';
  form.name = '';
  form.aliases = [];
  form.otc = 'OTC';
  form.indication = '';
  form.contraindication = '';
  form.adverseReaction = '';
  form.dosage = '';
  form.barcode = '';
  form.approvalNumber = '';
}

async function fetchMedicines() {
  loading.value = true;
  try {
    const res = await getAdminMedicines({
      keyword: query.keyword || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    medicines.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    message.error(error?.message || '药品列表加载失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchMedicines();
}

function handleReset() {
  query.keyword = '';
  pagination.page = 1;
  fetchMedicines();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchMedicines();
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  fetchMedicines();
}

function handleCreate() {
  resetForm();
  drawerVisible.value = true;
}

function handleEdit(row: MedicineCatalogItem) {
  editingId.value = row.id;
  form.name = row.name;
  form.aliases = row.aliases ?? [];
  aliasesText.value = form.aliases.join('，');
  form.otc = row.otc;
  form.indication = row.indication;
  form.contraindication = row.contraindication || '';
  form.adverseReaction = row.adverseReaction || '';
  form.dosage = row.dosage || '';
  form.barcode = row.barcode || '';
  form.approvalNumber = row.approvalNumber || '';
  drawerVisible.value = true;
}

function handleDelete(row: MedicineCatalogItem) {
  dialog.warning({
    title: '删除确认',
    content: `确定删除「${row.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteAdminMedicine(row.id);
        message.success('删除成功');
        await fetchMedicines();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
  });
}

async function handleSubmit() {
  if (!formRef.value) return;

  await formRef.value.validate(async (errors) => {
    if (errors) return;
    submitLoading.value = true;
    try {
      const payload = normalizeFormPayload();
      if (editingId.value) {
        await updateAdminMedicine(editingId.value, payload);
        message.success('更新成功');
      } else {
        await createAdminMedicine(payload);
        message.success('创建成功');
      }
      drawerVisible.value = false;
      await fetchMedicines();
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    } finally {
      submitLoading.value = false;
    }
  });
}

onMounted(() => {
  fetchMedicines();
});
</script>
