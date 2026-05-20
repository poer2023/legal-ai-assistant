<script setup lang="ts">
import { Check, ChevronDown, Info, Upload, X } from 'lucide-vue-next';
import { computed, ref } from 'vue';

type ExtractionState = 'idle' | 'reading' | 'analyzing' | 'done' | 'error';

type CreatedTemplateSummary = {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  extension: string;
  sectionCount: number;
  fieldCount: number;
  placeholderCount: number;
};

const props = withDefaults(defineProps<{
  extractionState: ExtractionState;
  extractionError?: string;
  createdTemplates?: CreatedTemplateSummary[];
}>(), {
  extractionError: '',
  createdTemplates: () => [],
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'analyze', files: File[]): void;
  (event: 'reset'): void;
  (event: 'finish'): void;
}>();

const queuedFiles = ref<File[]>([]);
const isTemplateDragActive = ref(false);

const isProcessing = computed(() => props.extractionState === 'reading' || props.extractionState === 'analyzing');
const isDone = computed(() => props.extractionState === 'done');
const isUploadStep = computed(() => !isProcessing.value && !isDone.value);
const uploadProgress = computed(() => props.extractionState === 'reading' ? 32 : 68);
const createdCount = computed(() => props.createdTemplates.length || queuedFiles.value.length);

const fallbackDoneTemplates = computed<CreatedTemplateSummary[]>(() =>
  queuedFiles.value.map((file, index) => ({
    id: `${file.name}-${file.size}-${index}`,
    name: file.name.replace(/\.[^.]+$/, '') || file.name,
    fileName: file.name,
    fileSize: file.size,
    extension: getFileExtension(file.name),
    sectionCount: 3,
    fieldCount: 8,
    placeholderCount: 6,
  })),
);

const doneTemplates = computed(() => props.createdTemplates.length ? props.createdTemplates : fallbackDoneTemplates.value);

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getFileExtension = (fileName: string) => fileName.split('.').pop()?.toUpperCase() || 'DOC';

const getFileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

const addTemplateFiles = (files: FileList | null) => {
  const nextFiles = Array.from(files || []);
  if (!nextFiles.length || isProcessing.value || isDone.value) return;

  const existingKeys = new Set(queuedFiles.value.map(getFileKey));
  queuedFiles.value = [
    ...queuedFiles.value,
    ...nextFiles.filter((file) => {
      const key = getFileKey(file);
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    }),
  ];
};

const handleUploadedTemplateChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  addTemplateFiles(target.files);
  target.value = '';
};

const handleTemplateDrop = (event: DragEvent) => {
  isTemplateDragActive.value = false;
  addTemplateFiles(event.dataTransfer?.files || null);
};

const removeQueuedFile = (file: File) => {
  if (isProcessing.value || isDone.value) return;
  const key = getFileKey(file);
  queuedFiles.value = queuedFiles.value.filter((item) => getFileKey(item) !== key);
};

const startAnalysis = () => {
  if (!queuedFiles.value.length || isProcessing.value) return;
  emit('analyze', [...queuedFiles.value]);
};

const resetBatch = () => {
  queuedFiles.value = [];
  emit('reset');
};
</script>

<template>
  <div class="template-create-backdrop" @click.self="emit('close')">
    <section
      class="template-create-modal"
      :class="{ 'is-processing': isProcessing, 'is-done': isDone }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-create-title"
    >
      <header class="create-modal-header">
        <div class="create-title-row">
          <h2 id="template-create-title">{{ isDone ? '创建成功' : '创建模板' }}</h2>
          <span v-if="!isDone" class="create-step-copy">
            {{ isProcessing ? '正在解析…' : '上传文件 → AI 解析 → 加入「我的模板」' }}
          </span>
        </div>

        <button class="create-close-btn" type="button" aria-label="关闭创建模板" @click="emit('close')">
          <X :size="17" />
        </button>
      </header>

      <div class="create-modal-body">
        <template v-if="isUploadStep">
          <label
            class="template-upload-zone"
            :class="{ active: queuedFiles.length > 0, dragging: isTemplateDragActive }"
            @dragenter.prevent="isTemplateDragActive = true"
            @dragover.prevent="isTemplateDragActive = true"
            @dragleave.prevent="isTemplateDragActive = false"
            @drop.prevent="handleTemplateDrop"
          >
            <input
              type="file"
              accept=".doc,.docx,.pdf,.txt,.md,.markdown,.rtf,.xls,.xlsx,.ppt,.pptx"
              multiple
              hidden
              @change="handleUploadedTemplateChange"
            />
            <span class="upload-zone-icon" aria-hidden="true">
              <Upload :size="23" :stroke-width="1.7" />
            </span>
            <strong>上传模板文件</strong>
            <span>点击或拖拽。可一次上传多份不同格式的模板文件。</span>
            <em>支持 .docx · .doc · .pdf · .xlsx · .xls · .pptx · .ppt · .md · .txt</em>
          </label>

          <div v-if="queuedFiles.length" class="queued-file-block">
            <p>待上传文件（{{ queuedFiles.length }}）</p>
            <div class="template-file-list">
              <article v-for="file in queuedFiles" :key="getFileKey(file)" class="template-file-row">
                <span class="file-type-badge">{{ getFileExtension(file.name) }}</span>
                <span class="file-copy">
                  <strong>{{ file.name }}</strong>
                  <small>{{ formatFileSize(file.size) }}</small>
                </span>
                <button class="file-remove-btn" type="button" aria-label="移除文件" @click="removeQueuedFile(file)">
                  <X :size="14" />
                </button>
              </article>
            </div>
          </div>

          <div class="create-note">
            <Info :size="15" :stroke-width="1.8" />
            <span>
              AI 会解析每份文件的章节、字段、占位符与变量。<strong>无需在线编辑</strong>，解析完成后即可在「我的模板」查看 / 使用 / 发布。
            </span>
          </div>
        </template>

        <template v-else-if="isProcessing">
          <div class="parsing-hero">
            <span class="parsing-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <h3>AI 正在学习你的模板…</h3>
            <p>识别章节结构 / 抽取字段 / 标记占位符 / 提取变量与默认值</p>
          </div>

          <div class="template-file-list">
            <article
              v-for="file in queuedFiles"
              :key="getFileKey(file)"
              class="template-file-row parsing"
              :style="{ '--parse-progress': `${uploadProgress}%` }"
            >
              <span class="file-progress-bg" aria-hidden="true" />
              <span class="file-type-badge">{{ getFileExtension(file.name) }}</span>
              <span class="file-copy">
                <strong>{{ file.name }}</strong>
                <small>{{ formatFileSize(file.size) }} <b>{{ uploadProgress }}%</b></small>
              </span>
              <span class="row-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </article>
          </div>
        </template>

        <template v-else>
          <div class="success-hero">
            <span class="success-icon" aria-hidden="true">
              <Check :size="28" :stroke-width="2.1" />
            </span>
            <h3>已创建 {{ createdCount }} 个模板</h3>
            <p>
              已加入「我的模板」。在卡片上可以查看模板内容、使用、停用，或点击「⋯」选择发布到小组 / 团队 / 市场。
            </p>
          </div>

          <div class="template-file-list success-list">
            <article v-for="template in doneTemplates" :key="template.id" class="parsed-template-card">
              <span class="parsed-type-badge">{{ template.extension }}</span>
              <span class="file-copy">
                <strong>{{ template.name }}</strong>
                <small>{{ template.sectionCount }} 节 · {{ template.fieldCount }} 字段 · {{ template.placeholderCount }} 占位符</small>
              </span>
              <span class="parsed-status">解析成功</span>
              <ChevronDown :size="15" class="parsed-chevron" />
            </article>
          </div>
        </template>
      </div>

      <footer class="create-modal-footer">
        <template v-if="isUploadStep">
          <span class="footer-hint" :class="{ error: extractionState === 'error' }">
            {{ extractionState === 'error' ? extractionError || '模板读取失败，请重新上传。' : queuedFiles.length ? `${queuedFiles.length} 个文件待解析` : '至少上传 1 个模板文件' }}
          </span>
          <div class="footer-actions">
            <button class="secondary-btn" type="button" @click="emit('close')">取消</button>
            <button class="primary-btn" type="button" :disabled="queuedFiles.length === 0" @click="startAnalysis">开始 AI 解析</button>
          </div>
        </template>

        <template v-else-if="isProcessing">
          <span class="footer-hint">处理过程不可中断，请稍候…</span>
          <button class="secondary-btn" type="button" disabled>处理中</button>
        </template>

        <template v-else>
          <button class="secondary-btn" type="button" @click="resetBatch">再创建一批</button>
          <button class="primary-btn" type="button" @click="emit('finish')">完成 · 查看「我的模板」</button>
        </template>
      </footer>
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
  background: rgba(35, 31, 27, 0.42);
  backdrop-filter: blur(5px);
}

.template-create-modal {
  --create-bg: #fbfaf7;
  --create-panel: #fffefa;
  --create-soft: #f3eee5;
  --create-line: #e3d9c9;
  --create-line-strong: #d3c5b2;
  --create-ink: #191613;
  --create-muted: #81786e;
  --create-faint: #9a9288;
  --create-accent: #c8552e;
  --create-success: #2d6a4f;

  width: min(720px, calc(100vw - 48px));
  max-height: min(86vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background: var(--create-bg);
  color: var(--create-ink);
  box-shadow: 0 24px 70px rgba(28, 24, 20, 0.24);
}

.template-create-modal.is-processing {
  width: min(720px, calc(100vw - 48px));
}

.create-modal-header {
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  border-bottom: 1px solid var(--create-line);
}

.create-title-row {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.create-title-row h2 {
  margin: 0;
  color: var(--create-ink);
  font-size: 21px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0;
}

.create-step-copy {
  color: var(--create-muted);
  font-size: 12.5px;
  line-height: 1.2;
  white-space: nowrap;
}

.create-close-btn {
  width: 32px;
  height: 32px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--create-muted);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.create-close-btn:hover {
  background: var(--create-soft);
  color: var(--create-ink);
}

.create-modal-body {
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
}

.template-upload-zone {
  min-height: 230px;
  display: grid;
  align-content: center;
  justify-items: center;
  padding: 38px 24px;
  border: 1.5px dashed var(--create-line-strong);
  border-radius: 14px;
  background: var(--create-soft);
  color: var(--create-muted);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.template-upload-zone:hover,
.template-upload-zone.active,
.template-upload-zone.dragging {
  border-color: color-mix(in srgb, var(--create-accent) 72%, var(--create-line-strong));
  background: #f6eee4;
}

.upload-zone-icon {
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border-radius: 12px;
  background: var(--create-panel);
  color: var(--create-ink);
  box-shadow: 0 8px 20px rgba(33, 28, 24, 0.08);
}

.template-upload-zone strong {
  color: var(--create-ink);
  font-family: "Songti SC", "Noto Serif SC", Georgia, serif;
  font-size: 19px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: 0;
}

.template-upload-zone span:not(.upload-zone-icon) {
  margin-top: 8px;
  color: var(--create-muted);
  font-size: 13px;
  line-height: 1.6;
}

.template-upload-zone em {
  margin-top: 10px;
  color: var(--create-faint);
  font-size: 12px;
  font-style: normal;
  line-height: 1.4;
}

.queued-file-block {
  margin-top: 16px;
}

.queued-file-block > p {
  margin: 0 0 8px;
  color: var(--create-muted);
  font-size: 12px;
  line-height: 1.2;
}

.template-file-list {
  display: grid;
  gap: 8px;
}

.template-file-row,
.parsed-template-card {
  position: relative;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  padding: 10px 12px;
  border: 1px solid var(--create-line);
  border-radius: 9px;
  background: var(--create-panel);
}

.template-file-row.parsing {
  min-height: 54px;
}

.file-progress-bg {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--parse-progress, 0%);
  background: rgba(200, 85, 46, 0.08);
  transition: width 0.25s linear;
}

.file-type-badge,
.parsed-type-badge {
  position: relative;
  z-index: 1;
  min-width: 30px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 7px;
  border-radius: 4px;
  background: var(--create-soft);
  color: var(--create-muted);
  font-size: 10px;
  font-weight: 750;
  line-height: 1;
}

.parsed-type-badge {
  width: 38px;
  height: 38px;
  border-radius: 9px;
}

.file-copy {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: grid;
  flex: 1;
  gap: 3px;
  line-height: 1.2;
}

.file-copy strong {
  overflow: hidden;
  color: var(--create-ink);
  font-size: 13.5px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-copy small {
  color: var(--create-faint);
  font-size: 11.5px;
  line-height: 1.2;
}

.file-copy small b {
  margin-left: 10px;
  color: var(--create-accent);
  font-weight: 650;
}

.file-remove-btn {
  position: relative;
  z-index: 1;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--create-faint);
  cursor: pointer;
}

.file-remove-btn:hover {
  background: var(--create-soft);
  color: var(--create-accent);
}

.create-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 18px;
  padding: 13px 14px;
  border-radius: 10px;
  background: var(--create-soft);
  color: var(--create-muted);
  font-size: 12px;
  line-height: 1.65;
}

.create-note svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--create-muted);
}

.create-note strong {
  color: var(--create-ink);
  font-weight: 700;
}

.parsing-hero,
.success-hero {
  text-align: center;
}

.parsing-hero {
  margin-bottom: 20px;
  padding-top: 2px;
}

.parsing-dots,
.row-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.parsing-dots {
  margin-bottom: 12px;
}

.parsing-dots i,
.row-dots i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--create-accent);
  animation: template-dot-pulse 1.4s ease-in-out infinite;
}

.parsing-dots i:nth-child(2),
.row-dots i:nth-child(2) {
  animation-delay: 0.2s;
}

.parsing-dots i:nth-child(3),
.row-dots i:nth-child(3) {
  animation-delay: 0.4s;
}

.parsing-hero h3,
.success-hero h3 {
  margin: 0;
  color: var(--create-ink);
  font-family: "Songti SC", "Noto Serif SC", Georgia, serif;
  font-size: 20px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: 0;
}

.parsing-hero p,
.success-hero p {
  margin: 7px auto 0;
  color: var(--create-muted);
  font-size: 13px;
  line-height: 1.6;
}

.row-dots {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.row-dots i {
  width: 5px;
  height: 5px;
}

.success-hero {
  margin-bottom: 22px;
}

.success-icon {
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  border-radius: 14px;
  background: linear-gradient(150deg, var(--create-accent), #a14222);
  color: #ffffff;
  box-shadow: 0 7px 18px rgba(200, 85, 46, 0.24);
}

.success-hero h3 {
  font-size: 22px;
}

.success-hero p {
  max-width: 560px;
}

.success-list {
  gap: 10px;
}

.parsed-template-card {
  min-height: 62px;
  padding: 11px 14px;
  border-radius: 11px;
}

.parsed-status {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(45, 106, 79, 0.12);
  color: var(--create-ink);
  font-size: 11px;
  font-weight: 650;
}

.parsed-chevron {
  flex-shrink: 0;
  color: var(--create-faint);
}

.create-modal-footer {
  min-height: 66px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 24px;
  border-top: 1px solid var(--create-line);
}

.footer-hint {
  color: var(--create-faint);
  font-size: 12px;
  line-height: 1.4;
}

.footer-hint.error {
  color: #b42318;
}

.footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.secondary-btn,
.primary-btn {
  min-width: 62px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.secondary-btn {
  border: 1px solid var(--create-line-strong);
  background: transparent;
  color: var(--create-ink);
}

.secondary-btn:hover:not(:disabled) {
  background: var(--create-soft);
}

.primary-btn {
  border: 1px solid var(--create-ink);
  background: var(--create-ink);
  color: #ffffff;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@keyframes template-dot-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-1px);
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

  .create-modal-header,
  .create-modal-footer {
    padding-right: 18px;
    padding-left: 18px;
  }

  .create-title-row {
    display: grid;
    gap: 5px;
  }

  .create-step-copy {
    white-space: normal;
  }

  .create-modal-body {
    padding: 20px 18px;
  }

  .template-upload-zone {
    min-height: 210px;
    padding: 30px 18px;
  }

  .create-modal-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .footer-actions,
  .secondary-btn,
  .primary-btn {
    width: 100%;
  }
}
</style>
