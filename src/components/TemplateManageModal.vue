<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import {
  ChevronRight,
  Copy,
  FileText,
  Info,
  MoreHorizontal,
  X,
} from 'lucide-vue-next';
import {
  defaultTemplateAssets,
  officialTemplateAssets,
  type TemplateAsset,
  type TemplateDocumentSection,
} from '../data/legalAssets';

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', template: TemplateAsset): void;
  (event: 'create'): void;
}>();

type TemplateListPage = 'default' | 'official';
type TemplateSectionId = string;

const selectedTemplate = ref<TemplateAsset | null>(null);
const activeListPage = ref<TemplateListPage>('default');
const activeSectionId = ref<TemplateSectionId>('section-0');
const statusMessage = ref('');
const openCardMenuId = ref<string | null>(null);
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const officialTemplates = computed(() => officialTemplateAssets);

const visibleTemplates = computed(() =>
  activeListPage.value === 'official' ? officialTemplates.value : defaultTemplateAssets
);

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

const activeDocumentSections = computed<TemplateDocumentSection[]>(() => {
  if (!selectedTemplate.value) return [];
  return selectedTemplate.value.documentSections ?? createFallbackDocumentSections(selectedTemplate.value);
});

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

const templateDocumentText = computed(() => {
  if (!selectedTemplate.value) return '';

  const template = selectedTemplate.value;
  return [
    template.name,
    '',
    `文档类型：${template.docType}`,
    `来源：${template.source}`,
    `关联能力：${template.agent}`,
    `更新时间：${template.updatedAt}`,
    ...activeDocumentSections.value.flatMap((section) => ['', stringifySection(section)]),
  ].join('\n');
});

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

const openOfficialList = () => {
  activeListPage.value = 'official';
  selectedTemplate.value = null;
  activeSectionId.value = 'section-0';
  openCardMenuId.value = null;
};

const backToDefaultList = () => {
  activeListPage.value = 'default';
  selectedTemplate.value = null;
  activeSectionId.value = 'section-0';
  openCardMenuId.value = null;
};

const closeModal = () => {
  emit('close');
};

const openTemplate = (template: TemplateAsset) => {
  selectedTemplate.value = template;
  activeSectionId.value = 'section-0';
  openCardMenuId.value = null;
};

const backToList = () => {
  selectedTemplate.value = null;
  activeSectionId.value = 'section-0';
  openCardMenuId.value = null;
};

const selectTemplate = (template = selectedTemplate.value) => {
  if (!template) return;
  emit('select', template);
};

const toggleCardMenu = (templateId: string) => {
  openCardMenuId.value = openCardMenuId.value === templateId ? null : templateId;
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

const copyTemplateName = (template: TemplateAsset) => {
  openCardMenuId.value = null;
  void copyText(template.name, template.name);
};

const copyTemplateDocument = () => {
  if (!selectedTemplate.value) return;
  void copyText(templateDocumentText.value, selectedTemplate.value.name);
};

const scrollToSection = (sectionId: TemplateSectionId) => {
  activeSectionId.value = sectionId;
  void nextTick(() => {
    document
      .getElementById(`template-document-${sectionId}`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
};

const createTemplate = () => {
  emit('create');
};

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
});
</script>

<template>
  <div class="template-modal-backdrop" @click.self="closeModal">
    <section
      class="template-modal"
      :class="{ 'detail-mode': selectedTemplate }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <button class="modal-close-btn" type="button" aria-label="关闭模板弹窗" @click="closeModal">
        <X :size="24" :stroke-width="2.2" />
      </button>

      <header v-if="!selectedTemplate" class="modal-header">
        <h2 id="template-modal-title">
          <button v-if="activeListPage === 'official'" class="list-back-btn" type="button" @click="backToDefaultList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>官方模板</span>
          </button>
          <span v-else>模板</span>
        </h2>
        <div class="modal-toolbar">
          <p class="modal-subtitle">
            <span>
              {{
                activeListPage === 'official'
                  ? '选择官方沉淀的文档结构，添加到本次输入上下文'
                  : '将常用文档结构、字段清单和写作约束作为可复用模板'
              }}
            </span>
            <Info :size="17" :stroke-width="2" />
          </p>
          <span v-if="statusMessage" class="modal-status">{{ statusMessage }}</span>
          <div v-if="activeListPage === 'default'" class="modal-tabs" aria-label="模板分类">
            <button class="modal-tab recommend-entry" type="button" @click="openOfficialList">
              官方模板
            </button>
            <button class="modal-tab" type="button" @click="createTemplate">
              新建模版
            </button>
          </div>
        </div>
      </header>

      <div v-if="!selectedTemplate" class="template-card-grid">
        <article
          v-for="template in visibleTemplates"
          :key="template.id"
          class="managed-template-card"
          tabindex="0"
          @click="openTemplate(template)"
          @keydown.enter.prevent="openTemplate(template)"
        >
          <button
            class="card-more-btn"
            type="button"
            :aria-label="`${template.name} 更多操作`"
            @click.stop="toggleCardMenu(template.id)"
          >
            <MoreHorizontal :size="20" />
          </button>

          <div v-if="openCardMenuId === template.id" class="card-action-menu" @click.stop>
            <button type="button" @click="openTemplate(template)">查看文档</button>
            <button type="button" @click="selectTemplate(template)">选择模板</button>
            <button type="button" @click="copyTemplateName(template)">复制名称</button>
          </div>

          <h3>{{ template.name }}</h3>
          <p>{{ template.preview }}</p>
          <span class="template-file-count">{{ template.requiredFields.length }} 个字段</span>
        </article>
      </div>

      <template v-if="selectedTemplate">
        <header class="detail-header">
          <button class="detail-title-btn" type="button" @click="backToList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>{{ selectedTemplate.name }}</span>
          </button>
          <div class="detail-actions">
            <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
            <button class="doc-action-btn" type="button" @click="copyTemplateDocument">
              <Copy :size="16" />
              <span>复制正文</span>
            </button>
            <button class="use-template-btn" type="button" @click="selectTemplate()">选择模板</button>
          </div>
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
                <div class="doc-kicker">{{ selectedTemplate.docType }}</div>
                <h1>{{ selectedTemplate.name }}</h1>
                <div class="doc-meta-grid">
                  <div>
                    <span>来源</span>
                    <strong>{{ selectedTemplate.source }}</strong>
                  </div>
                  <div>
                    <span>关联能力</span>
                    <strong>{{ selectedTemplate.agent }}</strong>
                  </div>
                  <div>
                    <span>更新时间</span>
                    <strong>{{ selectedTemplate.updatedAt }}</strong>
                  </div>
                </div>
              </section>

              <section
                v-for="(section, index) in activeDocumentSections"
                :id="`template-document-section-${index}`"
                :key="`${selectedTemplate.id}-${section.title}`"
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
      </template>
    </section>
  </div>
</template>

<style scoped>
.template-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.48);
}

.template-modal {
  position: relative;
  width: min(820px, calc(100vw - 40px));
  min-height: 412px;
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 24px 32px 28px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.template-modal.detail-mode {
  width: min(1120px, calc(100vw - 40px));
  height: min(860px, calc(100vh - 32px));
  max-height: calc(100vh - 32px);
  padding: 0;
  background: #f3f4f6;
}

.modal-close-btn {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #111827;
}

.modal-close-btn:hover {
  background: #f3f4f6;
}

.detail-mode > .modal-close-btn:hover {
  background: #e5e7eb;
}

.modal-header h2 {
  margin: 0 0 20px;
  color: #141414;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.modal-subtitle {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #171717;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.35;
}

.modal-subtitle svg {
  flex-shrink: 0;
  color: #8c8c8c;
}

.modal-status,
.detail-status {
  color: #2563eb;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.modal-status {
  margin-left: auto;
}

.modal-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.modal-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 10px;
  color: #111827;
  background: #f4f4f4;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.modal-tab:hover {
  background: #e9e9e9;
}

.modal-tab.recommend-entry {
  color: #1d4ed8;
  background: #dbeafe;
}

.modal-tab.recommend-entry:hover {
  background: #bfdbfe;
}

.list-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #111827;
  font: inherit;
}

.list-back-btn:hover {
  color: #2563eb;
}

.template-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.managed-template-card {
  position: relative;
  min-height: 108px;
  padding: 20px 48px 18px 20px;
  border: 1px solid #dedede;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.managed-template-card:hover {
  border-color: #c6d3e6;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.managed-template-card h3 {
  margin: 0 0 14px;
  color: #151515;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: 0;
}

.managed-template-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #707070;
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.card-more-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #707070;
}

.card-more-btn:hover {
  background: #f5f5f5;
}

.card-action-menu {
  position: absolute;
  top: 48px;
  right: 14px;
  z-index: 4;
  width: 112px;
  padding: 6px;
  border: 1px solid #dedede;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.card-action-menu button {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border-radius: 7px;
  color: #333333;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.card-action-menu button:hover {
  background: #f5f5f5;
}

.template-file-count {
  position: absolute;
  right: 18px;
  bottom: 16px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1;
}

.modal-close-btn:focus-visible,
.modal-tab:focus-visible,
.list-back-btn:focus-visible,
.card-more-btn:focus-visible,
.card-action-menu button:focus-visible,
.managed-template-card:focus-visible,
.detail-title-btn:focus-visible,
.use-template-btn:focus-visible,
.doc-action-btn:focus-visible,
.outline-item:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.detail-mode > .modal-close-btn {
  top: 20px;
  right: 20px;
}

.detail-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 58px 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.detail-title-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #171717;
  font-size: 18px;
  font-weight: 650;
  line-height: 1;
}

.detail-title-btn:hover {
  color: #2563eb;
}

.back-chevron {
  transform: rotate(180deg);
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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
  height: calc(100% - 72px);
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow: hidden;
}

.document-outline {
  overflow: auto;
  padding: 20px 16px;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
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
  overflow: auto;
  padding: 28px 32px 40px;
  background: #eef0f3;
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

@media (max-width: 900px) {
  .template-modal {
    width: calc(100vw - 32px);
    padding: 22px;
  }

  .template-card-grid {
    grid-template-columns: 1fr;
  }

  .template-modal.detail-mode {
    height: calc(100vh - 32px);
  }

  .template-document-shell {
    grid-template-columns: 1fr;
    height: calc(100% - 72px);
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
</style>
