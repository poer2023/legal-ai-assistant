<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  ChevronRight,
  Copy,
  FileText,
  Loader2,
} from 'lucide-vue-next';
import {
  type TemplateAsset,
  type TemplateDocumentSection,
} from '../data/legalAssets';

type TemplateSectionId = string;
type DetailPreviewMode = 'template' | 'original';
type TemplateGenerationState = 'idle' | 'reading' | 'analyzing' | 'done' | 'error';
type OriginalTemplateFile = {
  fileName: string;
  fileSize: number;
  fileType: string;
  originalText: string;
};

const props = withDefaults(
  defineProps<{
    template: TemplateAsset;
    layout?: 'page' | 'modal';
    generationState?: TemplateGenerationState;
    generationMessage?: string;
    originalFile?: OriginalTemplateFile;
  }>(),
  {
    layout: 'page',
    generationState: 'idle',
    generationMessage: '',
    originalFile: undefined,
  },
);

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'select', template: TemplateAsset): void;
}>();

const activeSectionId = ref<TemplateSectionId>('section-0');
const activePreviewMode = ref<DetailPreviewMode>('template');
const statusMessage = ref('');
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const panelClass = computed(() => `${props.layout}-layout`);
const hasOriginalFile = computed(() => Boolean(props.originalFile));
const isGenerating = computed(() =>
  props.generationState === 'reading' || props.generationState === 'analyzing'
);
const detailSummary = computed(() => {
  if (activePreviewMode.value === 'original' && props.originalFile) {
    return `原件已保留：${props.originalFile.fileName}。`;
  }

  if (isGenerating.value) {
    return props.generationMessage || '生成模板中，可先切换到原文件查看。';
  }

  return props.template.preview;
});
const originalTextPreview = computed(() => {
  const text = props.originalFile?.originalText.trim();
  return text || '原件已保留，当前格式暂无可读文本预览。';
});
const originalFileSizeLabel = computed(() => {
  const size = props.originalFile?.fileSize ?? 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
});

const createFallbackDocumentSections = (template: TemplateAsset): TemplateDocumentSection[] => [
  {
    title: '模板说明',
    paragraphs: [template.preview],
  },
  {
    title: '填写字段',
    table: {
      headers: ['序号', '字段名称', '填写状态'],
      rows: template.requiredFields.map((field, index) => [
        `${index + 1}`,
        field,
        '待填写',
      ]),
    },
  },
  {
    title: '适用能力',
    items: template.applicableSkills,
  },
  {
    title: '标签约束',
    items: template.tags,
  },
];

const activeDocumentSections = computed<TemplateDocumentSection[]>(() =>
  props.template.documentSections ?? createFallbackDocumentSections(props.template)
);

const documentSections = computed<Array<{ id: TemplateSectionId; title: string }>>(() =>
  activeDocumentSections.value.map((section, index) => ({
    id: `section-${index}`,
    title: section.title,
  }))
);

const stringifySection = (section: TemplateDocumentSection) => {
  const tableRows = section.table
    ? [
        section.table.headers.join(' | '),
        ...section.table.rows.map((row) => row.join(' | ')),
      ]
    : [];

  return [
    section.title,
    ...(section.paragraphs ?? []),
    ...(section.items ?? []).map((item) => `- ${item}`),
    ...tableRows,
  ].join('\n');
};

const templateDocumentText = computed(() => [
  props.template.name,
  '',
  `文档类型：${props.template.docType}`,
  `来源：${props.template.source}`,
  `关联能力：${props.template.agent}`,
  `更新时间：${props.template.updatedAt}`,
  ...activeDocumentSections.value.flatMap((section) => ['', stringifySection(section)]),
].join('\n'));

const sectionElementId = (sectionId: TemplateSectionId) =>
  `template-document-${props.template.id}-${sectionId}`;

const setStatus = (message: string) => {
  statusMessage.value = message;
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  statusTimer = setTimeout(() => {
    statusMessage.value = '';
    statusTimer = null;
  }, 1800);
};

const copyText = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  setStatus(`${label}已复制`);
};

const copyTemplateDocument = () => {
  if (activePreviewMode.value === 'original' && props.originalFile) {
    void copyText(originalTextPreview.value, props.originalFile.fileName);
    return;
  }

  void copyText(templateDocumentText.value, props.template.name);
};

const selectTemplate = () => {
  if (isGenerating.value) {
    setStatus('模板生成中，完成后可使用');
    return;
  }

  emit('select', props.template);
  setStatus(`${props.template.name} 已选择`);
};

const scrollToSection = (sectionId: TemplateSectionId) => {
  activeSectionId.value = sectionId;
  void nextTick(() => {
    document
      .getElementById(sectionElementId(sectionId))
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
};

watch(
  () => props.template,
  () => {
    activeSectionId.value = 'section-0';
    activePreviewMode.value = 'template';
  },
  { immediate: true },
);

watch(
  hasOriginalFile,
  (value) => {
    if (!value) activePreviewMode.value = 'template';
  },
);

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
});
</script>

<template>
  <section class="template-detail-panel" :class="panelClass">
    <header class="detail-header">
      <div class="detail-heading-row">
        <div class="detail-title-area">
          <button class="detail-back-btn" type="button" aria-label="返回模板列表" @click="emit('back')">
            <ChevronRight :size="17" class="back-chevron" />
          </button>
          <div class="detail-title-copy">
            <h2>{{ template.name }}</h2>
          </div>
        </div>
        <div class="detail-actions">
          <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
          <div v-if="hasOriginalFile" class="detail-view-switch" aria-label="预览模式">
            <button
              type="button"
              :class="{ active: activePreviewMode === 'template' }"
              @click="activePreviewMode = 'template'"
            >
              模板
            </button>
            <button
              type="button"
              :class="{ active: activePreviewMode === 'original' }"
              @click="activePreviewMode = 'original'"
            >
              原件
            </button>
          </div>
          <button class="doc-action-btn" type="button" @click="copyTemplateDocument">
            <Copy :size="16" />
            <span>{{ activePreviewMode === 'original' ? '复制原件' : '复制正文' }}</span>
          </button>
          <button class="use-template-btn" type="button" :disabled="isGenerating" @click="selectTemplate">
            {{ isGenerating ? '生成中' : '使用模板' }}
          </button>
        </div>
      </div>
      <p class="detail-summary">{{ detailSummary }}</p>
    </header>

    <div class="template-document-shell">
      <aside class="document-outline" aria-label="模板目录">
        <div class="outline-heading">
          <FileText :size="16" />
          <span>{{ activePreviewMode === 'original' ? '原件' : '目录' }}</span>
        </div>
        <template v-if="activePreviewMode === 'template'">
          <button
            v-for="section in documentSections"
            :key="section.id"
            class="outline-item"
            :class="{ active: activeSectionId === section.id }"
            type="button"
            @click="scrollToSection(section.id)"
          >
            <span>{{ section.title }}</span>
          </button>
        </template>
        <button v-else class="outline-item active" type="button">
          <span>原文件查看</span>
        </button>
      </aside>

      <main class="document-stage" aria-label="模板文档预览">
        <article v-if="activePreviewMode === 'template' && isGenerating" class="word-page generation-page">
          <section class="generation-state">
            <Loader2 :size="28" class="generation-spinner" />
            <span>生成模板中</span>
            <h1>{{ template.name }}</h1>
            <p>{{ generationMessage || 'AI 正在分析原件结构、字段和可复用正文。你可以先切换到原件查看。' }}</p>
          </section>
          <section class="document-section generation-skeleton" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <div></div>
            <div></div>
          </section>
        </article>

        <article v-else-if="activePreviewMode === 'original'" class="word-page original-word-page">
          <section class="document-section">
            <div class="doc-kicker">原件保留</div>
            <h1>{{ originalFile?.fileName || template.name }}</h1>
            <div class="doc-meta-grid original-meta-grid">
              <div>
                <span>文件名</span>
                <strong>{{ originalFile?.fileName || '-' }}</strong>
              </div>
              <div>
                <span>文件类型</span>
                <strong>{{ originalFile?.fileType || '未知' }}</strong>
              </div>
              <div>
                <span>文件大小</span>
                <strong>{{ originalFileSizeLabel }}</strong>
              </div>
            </div>
          </section>
          <section class="document-section">
            <h2>原文件内容</h2>
            <pre class="original-text">{{ originalTextPreview }}</pre>
          </section>
        </article>

        <article v-else class="word-page">
          <section class="document-section">
            <div class="doc-kicker">{{ template.docType }}</div>
            <h1>{{ template.name }}</h1>
            <div class="doc-meta-grid">
              <div>
                <span>来源</span>
                <strong>{{ template.source }}</strong>
              </div>
              <div>
                <span>关联能力</span>
                <strong>{{ template.agent }}</strong>
              </div>
              <div>
                <span>更新时间</span>
                <strong>{{ template.updatedAt }}</strong>
              </div>
            </div>
          </section>

          <section
            v-for="(section, index) in activeDocumentSections"
            :id="sectionElementId(`section-${index}`)"
            :key="`${template.id}-${section.title}`"
            class="document-section"
          >
            <h2>{{ section.title }}</h2>
            <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <ul v-if="section.items?.length" class="doc-list">
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
            <table v-if="section.table" class="field-table">
              <thead>
                <tr>
                  <th v-for="header in section.table.headers" :key="header">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in section.table.rows" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>
      </main>
    </div>
  </section>
</template>

<style scoped>
.template-detail-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-soft);
}

.template-detail-panel.modal-layout {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--card-bg);
}

.template-detail-panel.page-layout {
  flex: 1;
  min-height: 0;
  gap: 12px;
  background: transparent;
}

.detail-header {
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.modal-layout .detail-header {
  min-height: 128px;
  justify-content: center;
  gap: 12px;
  padding: 24px 28px 22px 24px;
}

.page-layout .detail-header {
  min-height: 72px;
  justify-content: flex-start;
  padding: 2px 0 4px;
  background: var(--bg-color);
  border-bottom: 0;
}

.detail-heading-row {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.detail-title-area {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.modal-layout .detail-title-area {
  flex: 1;
  align-items: flex-start;
  gap: 20px;
}

.detail-back-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 5px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--card-bg);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.modal-layout .detail-back-btn {
  width: 36px;
  height: 36px;
  margin-top: 1px;
  border-radius: 11px;
}

.detail-back-btn:hover {
  color: var(--primary-color);
  background: var(--primary-soft);
  box-shadow: inset 0 0 0 1px var(--primary-border);
}

.back-chevron {
  flex-shrink: 0;
  transform: rotate(180deg);
}

.detail-title-copy {
  min-width: 0;
}

.modal-layout .detail-title-copy {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.detail-title-copy h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-layout .detail-title-copy h2 {
  font-size: 22px;
  line-height: 1.16;
}

.detail-summary {
  max-width: 680px;
  margin: 0;
  padding-left: 42px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-layout .detail-summary {
  max-width: 780px;
  padding-left: 56px;
  font-size: 13.5px;
  line-height: 1.45;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 5px;
}

.modal-layout .detail-actions {
  align-self: center;
  padding-top: 0;
}

.detail-status {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.detail-view-switch {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-muted);
}

.detail-view-switch button {
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.detail-view-switch button.active {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--text-strong) 7%, transparent);
}

.use-template-btn,
.doc-action-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 650;
}

.use-template-btn {
  color: var(--on-primary);
  background: var(--primary-color);
}

.use-template-btn:hover {
  background: var(--primary-hover);
}

.use-template-btn:disabled {
  cursor: default;
  opacity: 0.72;
}

.doc-action-btn {
  border: 1px solid var(--border-color);
  color: var(--text-strong);
  background: var(--card-bg);
}

.doc-action-btn:hover {
  background: var(--surface-soft);
}

.template-document-shell {
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow: hidden;
}

.modal-layout .template-document-shell {
  flex: 1;
  height: auto;
  min-height: 0;
  grid-template-columns: 210px minmax(0, 1fr);
}

.page-layout .template-document-shell {
  flex: 1;
  height: auto;
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.document-outline {
  min-height: 0;
  overflow: auto;
  padding: 20px 16px;
  border-right: 1px solid var(--border-color);
  background: var(--card-bg);
}

.page-layout .document-outline {
  background: var(--card-bg);
}

.outline-heading {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 8px;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.outline-heading svg {
  color: var(--primary-color);
}

.outline-item {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-left: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: left;
}

.outline-item:hover {
  color: var(--primary-hover);
  background: var(--bg-color);
}

.outline-item.active {
  border-left-color: var(--primary-color);
  color: var(--primary-hover);
  background: var(--primary-soft);
  font-weight: 650;
}

.document-stage {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px 40px;
  background: var(--border-soft);
}

.modal-layout .document-stage {
  height: 100%;
  padding: 24px 28px 36px;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0) 24px),
    var(--surface-muted);
}

.page-layout .document-stage {
  background: var(--surface-soft);
}

.word-page {
  width: min(760px, 100%);
  min-height: 980px;
  margin: 0 auto;
  padding: 64px 72px 80px;
  background: var(--card-bg);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.13);
  color: var(--text-strong);
  font-family: "Times New Roman", "Songti SC", "SimSun", serif;
}

.modal-layout .word-page {
  width: min(720px, 100%);
  min-height: 860px;
  padding: 52px 64px 72px;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);
}

.page-layout .word-page {
  width: min(720px, 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08), 0 18px 40px rgba(15, 23, 42, 0.08);
}

.generation-page {
  display: grid;
  align-content: start;
  gap: 44px;
}

.generation-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 48px 0 18px;
  text-align: center;
}

.generation-state span {
  color: var(--primary-color);
  font-family: var(--font-sans, inherit);
  font-size: 14px;
  font-weight: 750;
}

.generation-state p {
  max-width: 460px;
  color: var(--text-secondary);
  font-family: var(--font-sans, inherit);
  font-size: 14px;
  line-height: 1.7;
}

.generation-spinner {
  color: var(--primary-color);
  animation: spin 0.9s linear infinite;
}

.generation-skeleton {
  display: grid;
  gap: 12px;
}

.generation-skeleton span,
.generation-skeleton div {
  display: block;
  border-radius: 999px;
  background: var(--border-soft);
}

.generation-skeleton span {
  height: 12px;
}

.generation-skeleton span:nth-child(1) {
  width: 72%;
}

.generation-skeleton span:nth-child(2) {
  width: 58%;
}

.generation-skeleton span:nth-child(3) {
  width: 66%;
}

.generation-skeleton div {
  height: 86px;
  border-radius: 8px;
  background: var(--surface-muted);
}

.original-word-page {
  font-family: "Times New Roman", "Songti SC", "SimSun", serif;
}

.original-meta-grid strong {
  overflow-wrap: anywhere;
}

.original-text {
  max-height: 560px;
  margin: 0;
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.document-section {
  scroll-margin-top: 24px;
}

.document-section + .document-section {
  margin-top: 34px;
}

.doc-kicker {
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 14px;
  text-align: center;
}

.word-page h1 {
  margin: 0 0 28px;
  color: var(--text-strong);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.word-page h2 {
  margin: 0 0 14px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
}

.word-page p,
.doc-list {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.9;
}

.word-page p + p,
.word-page p + .field-table,
.doc-list + .field-table {
  margin-top: 10px;
}

.doc-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--border-color);
}

.doc-meta-grid div {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 12px;
  border-right: 1px solid var(--border-color);
}

.doc-meta-grid div:last-child {
  border-right: 0;
}

.doc-meta-grid span {
  color: var(--text-secondary);
  font-size: 13px;
}

.doc-meta-grid strong {
  color: var(--text-strong);
  font-size: 15px;
  line-height: 1.4;
}

.field-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text-strong);
  font-size: 15px;
  line-height: 1.6;
}

.field-table th,
.field-table td {
  padding: 9px 10px;
  border: 1px solid var(--border-color);
  text-align: left;
  vertical-align: top;
}

.field-table th {
  background: var(--surface-soft);
  font-weight: 700;
}

.field-table td:first-child,
.field-table th:first-child {
  width: 64px;
  text-align: center;
}

.field-table td:last-child,
.field-table th:last-child {
  width: 96px;
}

.doc-list {
  padding-left: 22px;
}

.doc-list li + li {
  margin-top: 4px;
}

.detail-back-btn:focus-visible,
.use-template-btn:focus-visible,
.doc-action-btn:focus-visible,
.detail-view-switch button:focus-visible,
.outline-item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .template-document-shell,
  .page-layout .template-document-shell {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .document-outline {
    max-height: 176px;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .document-stage {
    padding: 18px 14px 28px;
  }

  .word-page {
    min-height: 780px;
    padding: 42px 28px 54px;
  }

  .doc-meta-grid {
    grid-template-columns: 1fr;
  }

  .doc-meta-grid div {
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .doc-meta-grid div:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 640px) {
  .detail-header,
  .page-layout .detail-header {
    gap: 12px;
  }

  .detail-heading-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .detail-title-copy h2 {
    white-space: normal;
  }

  .detail-summary,
  .modal-layout .detail-summary {
    padding-left: 0;
    white-space: normal;
  }

  .detail-actions {
    flex-wrap: wrap;
    padding-top: 0;
  }
}
</style>
