<template>
  <n-modal
    :show="show"
    preset="card"
    title="编辑头像"
    style="width: 1040px"
    @after-enter="handleAfterEnter"
    @after-leave="handleAfterLeave"
    @update:show="handleShowUpdate"
  >
    <div class="avatar-editor">
      <section class="avatar-editor__panel avatar-editor__panel--workspace">
        <div class="avatar-editor__viewport">
          <VueCropper
            v-if="cropperReady && activeSourceUrl"
            :key="cropperKey"
            ref="cropperRef"
            class="avatar-editor__cropper"
            :img="activeSourceUrl"
            mode="contain"
            :output-size="0.92"
            :output-type="'png'"
            :info="false"
            :full="false"
            :can-scale="false"
            :can-move="true"
            :can-move-box="true"
            :fixed-box="false"
            :original="false"
            :auto-crop="true"
            :auto-crop-width="240"
            :auto-crop-height="240"
            :center-box="true"
            :fixed="true"
            :fixed-number="[1, 1]"
            :high="true"
            :enlarge="1"
            @real-time="handleRealTime"
            @img-load="handleImageLoad"
          />
        </div>

        <div class="avatar-editor__toolbar">
          <div class="avatar-editor__control-group">
            <span class="avatar-editor__label">缩放</span>
            <n-slider
              v-model:value="scale"
              :min="0.1"
              :max="3"
              :step="0.01"
              :tooltip="false"
              @update:value="handleScaleChange"
            />
          </div>

          <n-space>
            <n-button @click="zoomOut">缩小</n-button>
            <n-button @click="zoomIn">放大</n-button>
            <n-button @click="rotateLeft">左转 90°</n-button>
            <n-button @click="rotateRight">右转 90°</n-button>
            <n-button @click="refreshCrop">刷新</n-button>
            <n-button quaternary @click="resetEditor">重置</n-button>
          </n-space>
        </div>
      </section>

      <section class="avatar-editor__panel avatar-editor__panel--preview">
        <div class="avatar-editor__preview-header">结果预览</div>
        <div class="avatar-editor__preview-container">
          <div class="avatar-editor__preview-box" :style="previewBoxStyle">
            <img
              v-if="previewDataUrl"
              :src="previewDataUrl"
              alt="头像预览"
              class="avatar-editor__preview-image"
            >
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button :disabled="confirmLoading" @click="handleCancel">取消</n-button>
        <n-button
          type="primary"
          :disabled="!imageLoaded"
          :loading="confirmLoading"
          @click="handleConfirm"
        >
          确定
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { VueCropper } from 'vue-cropper'
import 'vue-cropper/dist/index.css'

const props = defineProps<{
  show: boolean
  sourceUrl: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  confirm: [payload: { blob: Blob; previewUrl: string }]
  cancel: []
}>()

const PREVIEW_SIZE = 320
const message = useMessage()

interface CropperInstance {
  changeScale: (num: number) => void
  rotateLeft: () => void
  rotateRight: () => void
  refresh: () => void
  goAutoCrop: (width?: number, height?: number) => void
  getCropData: (callback: (dataUrl: string) => void) => void
  getCropBlob: (callback: (blob: Blob) => void) => void
}

const cropperRef = ref<CropperInstance | null>(null)

const activeSourceUrl = ref('')
const cropperKey = ref(0)
const cropperReady = ref(false)
const imageLoaded = ref(false)
const confirmLoading = ref(false)
const modalEntered = ref(false)
const scale = ref(1)
const lastScale = ref(1)
let mountVersion = 0

type PreviewStyleRecord = Record<string, string | number>

const previewDataUrl = ref('')
const previewBoxStyle: PreviewStyleRecord = {
  width: `${PREVIEW_SIZE}px`,
  height: `${PREVIEW_SIZE}px`,
  overflow: 'hidden',
  margin: '0 auto',
  borderRadius: '20px',
  border: '1px solid var(--n-border-color, rgba(148, 163, 184, 0.3))',
  background: 'var(--n-color-embedded, #f8fafc)',
}
let previewRafId: number | null = null

function handleRealTime() {
  schedulePreviewUpdate()
}

function handleImageLoad(status?: string) {
  if (status === 'error') {
    imageLoaded.value = false
    message.error('图片加载失败，请重新选择头像')
    return
  }

  imageLoaded.value = true
  void resetCropBoxAfterLayout()
}

function handleScaleChange(value: number) {
  const delta = value - lastScale.value
  lastScale.value = value

  if (Math.abs(delta) < 0.001) {
    return
  }

  cropperRef.value?.changeScale(delta * 10)
}

function zoomOut() {
  applyScaleStep(-0.1)
}

function zoomIn() {
  applyScaleStep(0.1)
}

function applyScaleStep(step: number) {
  const nextScale = Math.min(3, Math.max(0.1, Number((scale.value + step).toFixed(2))))
  scale.value = nextScale
  handleScaleChange(nextScale)
}

function rotateLeft() {
  cropperRef.value?.rotateLeft()
}

function rotateRight() {
  cropperRef.value?.rotateRight()
}

async function refreshCrop() {
  if (!cropperRef.value) {
    return
  }

  cropperRef.value.refresh()
  await resetCropBoxAfterLayout()
}

function resetEditor() {
  resetCropperState()
  void mountCropperAfterLayout()
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function resetCropBoxAfterLayout() {
  await nextTick()
  await nextFrame()
  cropperRef.value?.goAutoCrop(240, 240)
  schedulePreviewUpdate()
}

function schedulePreviewUpdate() {
  if (previewRafId !== null) {
    window.cancelAnimationFrame(previewRafId)
  }

  previewRafId = window.requestAnimationFrame(() => {
    previewRafId = null
    updatePreview()
  })
}

function updatePreview() {
  if (!cropperRef.value || !imageLoaded.value) {
    return
  }

  try {
    cropperRef.value.getCropData((dataUrl: string) => {
      previewDataUrl.value = dataUrl || ''
    })
  } catch {
    previewDataUrl.value = ''
  }
}

async function handleConfirm() {
  if (confirmLoading.value) {
    return
  }

  if (!cropperRef.value || !imageLoaded.value) {
    message.error('头像图片尚未加载完成')
    return
  }

  confirmLoading.value = true

  try {
    cropperRef.value.getCropBlob((blob: Blob) => {
      if (!blob || blob.size === 0) {
        confirmLoading.value = false
        message.error('头像裁剪失败，请重试')
        return
      }

      const previewUrl = URL.createObjectURL(blob)
      emit('confirm', { blob, previewUrl })
      emit('update:show', false)
      confirmLoading.value = false
    })
  } catch {
    confirmLoading.value = false
    message.error('头像裁剪失败，请重试')
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:show', false)
}

function handleShowUpdate(value: boolean) {
  if (!value) {
    handleCancel()
    return
  }

  emit('update:show', value)
}

function handleAfterEnter() {
  modalEntered.value = true
  void mountCropperAfterLayout()
}

function handleAfterLeave() {
  modalEntered.value = false
  resetCropperState()
}

function resetCropperState() {
  mountVersion += 1
  cropperReady.value = false
  activeSourceUrl.value = ''
  previewDataUrl.value = ''
  if (previewRafId !== null) {
    window.cancelAnimationFrame(previewRafId)
    previewRafId = null
  }
  imageLoaded.value = false
  confirmLoading.value = false
  scale.value = 1
  lastScale.value = 1
}

async function mountCropperAfterLayout() {
  if (!props.show || !props.sourceUrl || !modalEntered.value) {
    return
  }

  const currentVersion = ++mountVersion
  cropperReady.value = false
  activeSourceUrl.value = ''
  await nextTick()
  await nextFrame()
  await nextFrame()

  if (currentVersion !== mountVersion || !props.show || !props.sourceUrl || !modalEntered.value) {
    return
  }

  activeSourceUrl.value = props.sourceUrl
  cropperKey.value += 1
  cropperReady.value = true
}

watch(
  () => [props.show, props.sourceUrl] as const,
  async ([visible, sourceUrl]) => {
    resetCropperState()

    if (!visible || !sourceUrl) {
      return
    }

    await mountCropperAfterLayout()
  },
  { immediate: true },
)
</script>

<style scoped>
.avatar-editor {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
  gap: 24px;
  align-items: start;
}

.avatar-editor__panel {
  border: 1px solid var(--n-border-color, rgba(15, 23, 42, 0.08));
  border-radius: 18px;
  background: var(--n-color-modal, #fff);
  padding: 18px;
}

.avatar-editor__viewport {
  position: relative;
  overflow: hidden;
  height: 420px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top, color-mix(in srgb, var(--n-primary-color, #2080f0) 16%, transparent), transparent 55%),
    var(--n-color-embedded, #f8fafc);
  border: 1px solid var(--n-border-color, rgba(148, 163, 184, 0.24));
  user-select: none;
  touch-action: none;
}

.avatar-editor__cropper {
  width: 100%;
  height: 100%;
}

.avatar-editor__toolbar {
  margin-top: 18px;
}

.avatar-editor__control-group {
  margin-bottom: 16px;
}

.avatar-editor__label {
  display: block;
  margin-bottom: 8px;
  color: var(--n-text-color-2, #334155);
  font-size: 14px;
  font-weight: 600;
}

.avatar-editor__preview-header {
  margin-bottom: 12px;
  color: var(--n-text-color, #0f172a);
  font-size: 15px;
  font-weight: 700;
  text-align: center;
}

.avatar-editor__preview-container {
  display: flex;
  justify-content: center;
  min-height: 320px;
  margin-bottom: 16px;
}

.avatar-editor__preview-box {
  flex: none;
  background: var(--n-color-embedded, #f8fafc);
}

.avatar-editor__preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:deep(.vue-cropper) {
  width: 100%;
  height: 100%;
  background: transparent;
}

:deep(.cropper-crop-box),
:deep(.cropper-view-box) {
  outline-color: var(--n-primary-color, #2080f0);
}

:deep(.crop-info) {
  display: none !important;
}

:deep(.cropper-face) {
  cursor: move;
}

@media (max-width: 980px) {
  .avatar-editor {
    grid-template-columns: 1fr;
  }

  .avatar-editor__viewport {
    height: 360px;
  }
}
</style>
