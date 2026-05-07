<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  ChevronRight,
  Copy,
  FileText,
} from 'lucide-vue-next';
import {
  type TemplateAsset,
  type TemplateDocumentSection,
} from '../data/legalAssets';

const props = withDefaults(
  defineProps<{
    template: TemplateAsset;
    layout?: 'page' | 'modal';
  }>(),
  {
    layout: 'page',
  },
);

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'select', template: TemplateAsset): void;
}>();

type TemplateSectionId = string;

const activeSectionId = ref<TemplateSectionId>('section-0');
const statusMessage = ref('');
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const panelClass = computed(() => `${props.layout}-layout`);

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
  void copyText(templateDocumentText.value, props.template.name);
};

const selectTemplate = () => {
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
  },
  { immediate: true },
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
            <span class="detail-kicker">{{ template.docType }} · {{ template.source }}</span>
            <h2>{{ template.name }}</h2>
          </div>
        </div>
        <div class="detail-actions">
          <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
          <button class="doc-action-btn" type="button" @click="copyTemplateDocument">
            <Copy :size="16" />
            <span>复制正文</span>
          </button>
          <button class="use-template-btn" type="button" @click="selectTemplate">使用模板</button>
        </div>
      </div>
      <p class="detail-summary">{{ template.preview }}</p>
    </header>

    <div class="template-document-shell">
      <aside class="document-outline" aria-label="模板目录">
        <div class="outline-heading">
          <FileText :size="16" />
          <span>目录</span>
        </div>
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
      </aside>

      <main class="document-stage" aria-label="模板文档预览">
        <article class="word-page">
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
  background: #f3f4f6;
}

.template-detail-panel.modal-layout {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
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
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
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
  background: #f8fafc;
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
  color: #475569;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #e2e8f0;
}

.modal-layout .detail-back-btn {
  width: 36px;
  height: 36px;
  margin-top: 1px;
  border-radius: 11px;
}

.detail-back-btn:hover {
  color: #2563eb;
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px #bfdbfe;
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

.detail-kicker {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
}

.modal-layout .detail-kicker {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.detail-title-copy h2 {
  margin: 0;
  overflow: hidden;
  color: #0f172a;
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
  color: #64748b;
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
  color: #2563eb;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
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
  color: #ffffff;
  background: #2563eb;
}

.use-template-btn:hover {
  background: #1d4ed8;
}

.doc-action-btn {
  border: 1px solid #dedede;
  color: #171717;
  background: #ffffff;
}

.doc-action-btn:hover {
  background: #f5f5f5;
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
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.document-outline {
  min-height: 0;
  overflow: auto;
  padding: 20px 16px;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
}

.page-layout .document-outline {
  background: #fbfdff;
}

.outline-heading {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 8px;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.outline-heading svg {
  color: #2563eb;
}

.outline-item {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-left: 2px solid transparent;
  color: #4b5563;
  font-size: 14px;
  text-align: left;
}

.outline-item:hover {
  color: #1d4ed8;
  background: #f8fafc;
}

.outline-item.active {
  border-left-color: #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
  font-weight: 650;
}

.document-stage {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px 40px;
  background: #eef0f3;
}

.modal-layout .document-stage {
  height: 100%;
  padding: 24px 28px 36px;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0) 24px),
    #f3f6fa;
}

.page-layout .document-stage {
  background: #f1f5f9;
}

.word-page {
  width: min(760px, 100%);
  min-height: 980px;
  margin: 0 auto;
  padding: 64px 72px 80px;
  background: #ffffff;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.13);
  color: #111827;
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

.document-section {
  scroll-margin-top: 24px;
}

.document-section + .document-section {
  margin-top: 34px;
}

.doc-kicker {
  margin-bottom: 14px;
  color: #64748b;
  font-family: inherit;
  font-size: 14px;
  text-align: center;
}

.word-page h1 {
  margin: 0 0 28px;
  color: #111827;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.word-page h2 {
  margin: 0 0 14px;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
}

.word-page p,
.doc-list {
  margin: 0;
  color: #1f2937;
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
  border: 1px solid #d1d5db;
}

.doc-meta-grid div {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 12px;
  border-right: 1px solid #d1d5db;
}

.doc-meta-grid div:last-child {
  border-right: 0;
}

.doc-meta-grid span {
  color: #6b7280;
  font-size: 13px;
}

.doc-meta-grid strong {
  color: #111827;
  font-size: 15px;
  line-height: 1.4;
}

.field-table {
  width: 100%;
  border-collapse: collapse;
  color: #111827;
  font-size: 15px;
  line-height: 1.6;
}

.field-table th,
.field-table td {
  padding: 9px 10px;
  border: 1px solid #d1d5db;
  text-align: left;
  vertical-align: top;
}

.field-table th {
  background: #f3f4f6;
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
.outline-item:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
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
    border-bottom: 1px solid #e5e7eb;
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
    border-bottom: 1px solid #d1d5db;
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
