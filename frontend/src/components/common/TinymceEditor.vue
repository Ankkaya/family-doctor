<template>
  <div class="tinymce-editor">
    <Editor
      v-model="editorValue"
      :init="editorInit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Editor from '@tinymce/tinymce-vue';
import { useMessage } from 'naive-ui';
import { uploadFile } from '@/api/file';
import { resolveFileUrl } from '@/utils/file-url';
import { normalizeRichTextHtml } from '@/utils/rich-text';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/themes/silver';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/plugins/image';
import 'tinymce/plugins/media';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/ogg,video/quicktime';

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const props = defineProps<{
  modelValue?: string;
}>();

const message = useMessage();

const editorValue = computed({
  get: () => normalizeRichTextHtml(props.modelValue),
  set: (value: string) => {
    emit('update:modelValue', normalizeRichTextHtml(value));
  },
});

const uploadEditorFile = async (file: File, path: string) => {
  const result = await uploadFile(file, path);
  return resolveFileUrl(result.url);
};

const uploadEditorImage = (file: File) => uploadEditorFile(file, 'editor/images');
const uploadEditorVideo = (file: File) => uploadEditorFile(file, 'editor/videos');

const openFilePicker = (
  accept: string,
  uploader: (file: File) => Promise<string>,
  callback: (url: string, meta?: Record<string, string>) => void,
  metaBuilder?: (file: File, url: string) => Record<string, string>,
) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const url = await uploader(file);
      callback(url, metaBuilder?.(file, url));
      message.success('上传成功');
    } catch (error) {
      message.error('文件上传失败');
    }
  };

  input.click();
};

const editorInit = computed(() => ({
  height: 420,
  width: '100%',
  menubar: false,
  statusbar: false,
  branding: false,
  promotion: false,
  resize: true,
  automatic_uploads: true,
  plugins: 'image media',
  toolbar: 'fontfamily fontsize | bold italic underline strikethrough | customImageUpload customMediaUpload',
  font_family_formats:
    '微软雅黑=Microsoft YaHei,Helvetica Neue,PingFang SC,sans-serif;' +
    '苹方=PingFang SC,Microsoft YaHei,sans-serif;' +
    '宋体=SimSun,serif;' +
    '黑体=SimHei,sans-serif;' +
    'Arial=arial,helvetica,sans-serif;' +
    'Times New Roman=times new roman,times,serif',
  font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
  content_style:
    'body { font-family: Microsoft YaHei, Helvetica Neue, PingFang SC, sans-serif; font-size: 14px; line-height: 1.7; padding: 12px; }',
  placeholder: '请输入商品详情',
  images_upload_handler: async (blobInfo: { blob: () => Blob }) => {
    const blob = blobInfo.blob();
    const file = new File([blob], 'image', { type: blob.type || 'image/png' });
    return uploadEditorImage(file);
  },
  setup: (editor: any) => {
    editor.ui.registry.addButton('customImageUpload', {
      text: '图片',
      tooltip: '上传图片',
      onAction: () => {
        openFilePicker(
          IMAGE_ACCEPT,
          uploadEditorImage,
          (url, meta) => {
            editor.insertContent(`<img src="${url}" alt="${meta?.alt || ''}" title="${meta?.title || ''}" />`);
          },
          file => ({ alt: file.name, title: file.name }),
        );
      },
    });

    editor.ui.registry.addButton('customMediaUpload', {
      text: '视频',
      tooltip: '上传视频',
      onAction: () => {
        openFilePicker(
          VIDEO_ACCEPT,
          uploadEditorVideo,
          (url) => {
            editor.insertContent(
              `<video controls style="max-width: 100%;" src="${url}"></video>`,
            );
          },
        );
      },
    });
  },
}));
</script>

<style scoped>
.tinymce-editor {
  width: 100%;
}

.tinymce-editor :deep(.tox),
.tinymce-editor :deep(.tox-tinymce) {
  width: 100% !important;
  max-width: 100%;
}
</style>
