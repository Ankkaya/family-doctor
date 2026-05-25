<template>
  <div class="page-container">
    <n-card class="bg-container transition-theme">
      <n-tabs type="line" animated>
        <n-tab-pane name="mini-program" tab="小程序配置">
          <n-form :model="miniProgramForm" label-width="120">
            <n-grid :cols="2" :x-gap="16">
              <n-form-item-gi label="微信 AppID">
                <n-input v-model:value="miniProgramForm.wechatAppId" placeholder="请输入微信 AppID" />
              </n-form-item-gi>
              <n-form-item-gi label="微信 AppSecret">
                <n-input v-model:value="miniProgramForm.wechatAppSecret" type="password" show-password-on="click" placeholder="请输入微信 AppSecret" />
              </n-form-item-gi>
            </n-grid>
          </n-form>
          <div v-if="authStore.hasPermission('system:setting:update')" class="mt-4 flex justify-end">
            <n-button type="primary" :loading="savingMiniProgram" @click="saveMiniProgramSetting">
              保存小程序配置
            </n-button>
          </div>
        </n-tab-pane>

        <n-tab-pane name="wechat-pay" tab="微信支付">
          <n-alert type="info" class="mb-4" :show-icon="false">
            支付回调地址需指向后端公开可访问的支付结果通知接口：
            <code>/mall/payments/wechat/notify</code>；
            退款回调地址需指向退款结果通知接口：
            <code>/mall/payments/wechat/refund-notify</code>。
            平台公钥与平台证书路径二选一即可；若填写平台证书路径，需保证后端服务可读取到该证书文件。
          </n-alert>
          <n-form :model="wechatPayForm" label-width="120">
            <n-grid :cols="2" :x-gap="16">
              <n-form-item-gi label="商户号">
                <n-input v-model:value="wechatPayForm.mchId" placeholder="请输入商户号" />
              </n-form-item-gi>
              <n-form-item-gi label="商户证书序列号">
                <n-input v-model:value="wechatPayForm.mchSerialNo" placeholder="请输入证书序列号" />
              </n-form-item-gi>
              <n-form-item-gi label="支付回调地址">
                <n-input v-model:value="wechatPayForm.notifyUrl" placeholder="请输入支付回调地址" />
              </n-form-item-gi>
              <n-form-item-gi label="退款回调地址">
                <n-input v-model:value="wechatPayForm.refundNotifyUrl" placeholder="请输入退款回调地址" />
              </n-form-item-gi>
              <n-form-item-gi span="2" label="APIv3 Key">
                <n-input v-model:value="wechatPayForm.apiV3Key" type="password" show-password-on="click" placeholder="请输入 APIv3 Key" />
              </n-form-item-gi>
              <n-form-item-gi span="2" label="商户私钥">
                <n-input v-model:value="wechatPayForm.privateKey" type="textarea" :autosize="{ minRows: 4, maxRows: 8 }" placeholder="请输入商户私钥内容" />
              </n-form-item-gi>
              <n-form-item-gi span="2" label="平台公钥">
                <n-input
                  v-model:value="wechatPayForm.platformPublicKey"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                  placeholder="请输入微信支付平台公钥内容"
                />
              </n-form-item-gi>
              <n-form-item-gi span="2" label="平台证书路径">
                <n-input v-model:value="wechatPayForm.platformCertPath" placeholder="未填写平台公钥时，如 certs/wechat/platform.pem" />
              </n-form-item-gi>
            </n-grid>
          </n-form>
          <div v-if="authStore.hasPermission('system:setting:update')" class="mt-4 flex justify-end">
            <n-button type="primary" :loading="savingWechatPay" @click="saveWechatPaySetting">
              保存微信支付配置
            </n-button>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { getSystemSettingsByCategory, upsertSystemSetting } from '@/api/system-setting';
import { useAuthStore } from '@/store';

const message = useMessage();
const authStore = useAuthStore();

const savingMiniProgram = ref(false);
const savingWechatPay = ref(false);

const miniProgramForm = reactive({
  wechatAppId: '',
  wechatAppSecret: '',
});

const wechatPayForm = reactive({
  mchId: '',
  mchSerialNo: '',
  apiV3Key: '',
  notifyUrl: '',
  refundNotifyUrl: '',
  privateKey: '',
  platformPublicKey: '',
  platformCertPath: '',
});

async function loadSettings() {
  const [miniProgramSettings, wechatSettings] = await Promise.all([
    getSystemSettingsByCategory('mini-program'),
    getSystemSettingsByCategory('wechat'),
  ]);

  const miniProgramAuth = miniProgramSettings.find(item => item.key === 'mini-program.auth');
  if (miniProgramAuth?.value) {
    Object.assign(miniProgramForm, miniProgramAuth.value);
  }

  const wechatPay = wechatSettings.find(item => item.key === 'wechat.pay');
  if (wechatPay?.value) {
    Object.assign(wechatPayForm, wechatPay.value);
  }
}

async function saveMiniProgramSetting() {
  savingMiniProgram.value = true;
  try {
    await upsertSystemSetting({
      key: 'mini-program.auth',
      category: 'mini-program',
      name: '小程序配置',
      description: '微信小程序服务端配置',
      value: { ...miniProgramForm },
    });
    message.success('小程序配置已保存');
  }
  finally {
    savingMiniProgram.value = false;
  }
}

async function saveWechatPaySetting() {
  savingWechatPay.value = true;
  try {
    await upsertSystemSetting({
      key: 'wechat.pay',
      category: 'wechat',
      name: '微信支付配置',
      description: '微信支付商户参数配置',
      value: { ...wechatPayForm },
    });
    message.success('微信支付配置已保存');
  }
  finally {
    savingWechatPay.value = false;
  }
}

onMounted(async () => {
  try {
    await loadSettings();
  }
  catch (error: any) {
    message.error(error?.message || '系统设置加载失败');
  }
});
</script>

<style scoped>
:deep(.n-tabs-nav) {
  justify-content: flex-start !important;
}
:deep(.n-tabs-tab) {
  flex: 0 0 auto !important;
  padding: 0 16px 12px 16px !important;
}
:deep(.n-tabs-pad) {
  padding-top: 16px !important;
}
</style>
