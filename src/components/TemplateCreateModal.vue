<script setup lang="ts">
import { Check, FileText, Sparkles, Upload, X } from 'lucide-vue-next';
import { ref } from 'vue';

type ExtractionState = 'idle' | 'reading' | 'analyzing' | 'done' | 'error';

defineProps<{
  uploadedFile: File | null;
  extractionState: ExtractionState;
  extractionError?: string;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'upload', file: File): void;
}>();

const isTemplateDragActive = ref(false);

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const handleUploadedTemplateChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  emit('upload', file);
};

const handleTemplateDrop = (event: DragEvent) => {
  isTemplateDragActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  emit('upload', file);
};
</script>

<template>
  <div class="template-create-backdrop" @click.self="emit('close')">
    <section class="template-create-modal" role="dialog" aria-modal="true" aria-labelledby="template-create-title">
      <button class="create-close-btn" type="button" aria-label="关闭新建模板" @click="emit('close')">
        <X :size="18" />
      </button>

      <header class="create-modal-header">
        <span class="create-modal-icon" aria-hidden="true">
          <Sparkles :size="20" />
        </span>
        <div>
          <h2 id="template-create-title">新建模板</h2>
          <p>上传已有模板，AI 提取字段、结构和预览内容，原件会随模板保留。</p>
        </div>
      </header>

      <div class="create-modal-body">
        <div class="create-guide">
          <div>
            <Check :size="15" />
            <span>上传原件</span>
          </div>
          <div>
            <Sparkles :size="15" />
            <span>生成模板壳</span>
          </div>
          <div>
            <FileText :size="15" />
            <span>预览页查看</span>
          </div>
        </div>

        <label
          class="template-upload-zone"
          :class="{ active: Boolean(uploadedFile), dragging: isTemplateDragActive }"
          @dragenter.prevent="isTemplateDragActive = true"
          @dragover.prevent="isTemplateDragActive = true"
          @dragleave.prevent="isTemplateDragActive = false"
          @drop.prevent="handleTemplateDrop"
        >
          <input
            type="file"
            accept=".doc,.docx,.pdf,.txt,.md,.markdown,.rtf"
            hidden
            @change="handleUploadedTemplateChange"
          />
          <span class="upload-zone-icon" aria-hidden="true">
            <Upload :size="24" />
          </span>
          <strong>{{ uploadedFile?.name || '点击或拖拽上传模板原件' }}</strong>
          <span>
            {{ uploadedFile ? `${formatFileSize(uploadedFile.size)} · 正在进入预览页` : '支持 doc、docx、pdf、txt、md、rtf；上传后立即生成占位模板' }}
          </span>
        </label>

        <p v-if="extractionState === 'reading' || extractionState === 'analyzing'" class="extract-status">
          正在读取原件，随后会自动打开模板预览页。
        </p>
        <p v-else-if="extractionState === 'error'" class="extract-status error">
          {{ extractionError || '模板读取失败，请重新上传。' }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.template-create-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--text-strong) 28%, transparent);
  backdrop-filter: blur(8px);
}

.template-create-modal {
  position: relative;
  width: min(960px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 28px 80px color-mix(in srgb, var(--text-strong) 22%, transparent);
}

.create-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, color 0.16s ease, background-color 0.16s ease;
}

.create-close-btn:hover {
  border-color: var(--primary-border);
  color: var(--primary-color);
  background: var(--primary-soft);
}

.create-modal-header {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  padding: 24px 58px 18px 24px;
  border-bottom: 1px solid var(--border-soft);
}

.create-modal-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--primary-border);
  border-radius: 11px;
  background: var(--primary-soft);
  color: var(--primary-color);
}

.create-modal-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0;
}

.create-modal-header p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.create-modal-body {
  min-height: 0;
  display: grid;
  gap: 16px;
  overflow-y: auto;
  padding: 22px 24px 26px;
}

.create-guide {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.create-guide::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 15%;
  right: 15%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--primary-color) 30%, transparent),
    transparent
  );
  transform: translateY(-50%);
  pointer-events: none;
}

.create-guide div {
  position: relative;
  z-index: 1;
  min-height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--primary-border) 58%, var(--border-soft));
  border-radius: 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--primary-soft) 58%, var(--card-bg)), var(--card-bg));
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
  box-shadow: 0 12px 26px color-mix(in srgb, var(--primary-color) 8%, transparent);
  animation: guide-pulse 2.8s ease-in-out infinite;
}

.create-guide div:nth-child(2) {
  animation-delay: 0.22s;
}

.create-guide div:nth-child(3) {
  animation-delay: 0.44s;
}

.create-guide svg {
  color: var(--primary-color);
  flex-shrink: 0;
}

.template-upload-zone {
  min-height: 220px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 12px;
  padding: 34px 24px;
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  background:
    radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--primary-soft) 62%, transparent), transparent 42%),
    var(--surface-muted);
  color: var(--text-secondary);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.template-upload-zone:hover,
.template-upload-zone.active,
.template-upload-zone.dragging {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 12%, transparent);
  transform: translateY(-1px);
}

.upload-zone-icon {
  width: 58px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 14px 32px color-mix(in srgb, var(--primary-color) 15%, transparent);
  animation: upload-float 2.4s ease-in-out infinite;
}

.template-upload-zone strong {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 750;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-upload-zone span:not(.upload-zone-icon) {
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.35;
}

.extract-status {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
}

.extract-status.error {
  color: #dc2626;
}

@keyframes upload-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
}

@keyframes guide-pulse {
  0%,
  100% {
    box-shadow: 0 12px 26px color-mix(in srgb, var(--primary-color) 8%, transparent);
  }

  50% {
    box-shadow: 0 14px 32px color-mix(in srgb, var(--primary-color) 14%, transparent);
  }
}

@media (max-width: 760px) {
  .template-create-backdrop {
    align-items: stretch;
    padding: 12px;
  }

  .template-create-modal {
    width: 100%;
    max-height: calc(100vh - 24px);
  }

  .create-guide {
    grid-template-columns: 1fr;
  }

  .create-guide::before {
    display: none;
  }

  .template-upload-zone {
    min-height: 180px;
    padding: 28px 18px;
  }
}
</style>
