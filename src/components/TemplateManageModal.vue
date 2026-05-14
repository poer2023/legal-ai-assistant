<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import {
  ChevronRight,
  Copy,
  FileText,
  Plus,
  Search,
  X,
} from 'lucide-vue-next';
import {
  templateAssets,
  type TemplateAsset,
  type TemplateDocumentSection,
} from '../data/legalAssets';
import LibraryTypeDropdown from './LibraryTypeDropdown.vue';

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', template: TemplateAsset): void;
  (event: 'create'): void;
}>();

type SourceFilter = 'personal' | 'team' | 'recommended';
type TemplateSectionId = string;

const selectedTemplate = ref<TemplateAsset | null>(null);
const activeSectionId = ref<TemplateSectionId>('section-0');
const statusMessage = ref('');
const searchKeyword = ref('');
const selectedSource = ref<SourceFilter>('personal');
const selectedCategory = ref('全部');
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const primaryTemplateCategories = [
  '项目启动',
  '尽职调查',
  '咨询意见',
  '交易文件',
  '投资交易',
  '资本市场',
  '并购交易',
  '基金业务',
  '合规日常',
];

const getTemplateSourceKind = (template: TemplateAsset): SourceFilter => {
  if (template.source.includes('团队')) return 'team';
  if (template.source.includes('推荐') || template.source.includes('官方')) return 'recommended';
  return 'personal';
};

const sourceTabs = computed(() => {
  const counts: Record<SourceFilter, number> = {
    personal: 0,
    team: 0,
    recommended: 0,
  };

  templateAssets.forEach((template) => {
    counts[getTemplateSourceKind(template)] += 1;
  });

  return [
    { key: 'personal' as const, name: '我的模板', count: counts.personal },
    { key: 'team' as const, name: '团队共享', count: counts.team },
    { key: 'recommended' as const, name: '官方推荐', count: counts.recommended },
  ];
});

const sourceFilteredTemplates = computed(() => {
  return templateAssets.filter((template) => getTemplateSourceKind(template) === selectedSource.value);
});

const categoryTabs = computed(() => {
  const counts = new Map<string, number>();
  sourceFilteredTemplates.value.forEach((template) => {
    counts.set(template.docType, (counts.get(template.docType) ?? 0) + 1);
  });

  return [
    { name: '全部', count: sourceFilteredTemplates.value.length },
    ...primaryTemplateCategories
      .map((name) => ({ name, count: counts.get(name) ?? 0 }))
      .filter((tab) => tab.count > 0),
  ];
});

const visibleTemplates = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return sourceFilteredTemplates.value.filter((template) => {
    const matchesCategory = selectedCategory.value === '全部' || template.docType === selectedCategory.value;
    const searchable = [
      template.name,
      template.docType,
      template.source,
      template.agent,
      template.preview,
      ...template.requiredFields,
      ...template.applicableSkills,
      ...template.tags,
    ]
      .join(' ')
      .toLowerCase();

    return matchesCategory && (!keyword || searchable.includes(keyword));
  });
});

const templateFilePath = (template: TemplateAsset) => `assets/templates/${template.id}.md`;

const setSource = (source: SourceFilter) => {
  selectedSource.value = source;
  selectedCategory.value = '全部';
};

const resetFilters = () => {
  searchKeyword.value = '';
  selectedCategory.value = '全部';
};

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

const closeModal = () => {
  emit('close');
};

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeModal();
  }
};

const openTemplate = (template: TemplateAsset) => {
  selectedTemplate.value = template;
  activeSectionId.value = 'section-0';
};

const backToList = () => {
  selectedTemplate.value = null;
  activeSectionId.value = 'section-0';
};

const selectTemplate = (template = selectedTemplate.value) => {
  if (!template) return;
  emit('select', template);
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
  <div class="template-modal-backdrop" @click.stop="handleBackdropClick">
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
        <div class="modal-page-header">
          <h2 id="template-modal-title">模板</h2>
          <label class="search-control page-search">
            <Search :size="17" />
            <input v-model="searchKeyword" type="text" placeholder="搜索模板、字段、适用场景" />
          </label>
        </div>

        <div class="source-toolbar">
          <nav class="source-tabs" aria-label="模板来源">
            <button
              v-for="tab in sourceTabs"
              :key="tab.key"
              class="source-tab"
              :class="{ active: selectedSource === tab.key }"
              type="button"
              @click="setSource(tab.key)"
            >
              <span>{{ tab.name }}</span>
              <strong>{{ tab.count }}</strong>
            </button>
          </nav>

          <div class="source-actions">
            <LibraryTypeDropdown v-model="selectedCategory" :options="categoryTabs" label="类型" />

            <button class="new-template-btn" type="button" @click="createTemplate">
              <Plus :size="17" />
              <span>创建模板</span>
            </button>
          </div>
        </div>
        <span v-if="statusMessage" class="modal-status">{{ statusMessage }}</span>
      </header>

      <section v-if="!selectedTemplate" class="template-section" aria-label="模板文件列表">
        <div class="list-heading">
          <span class="result-count">{{ visibleTemplates.length }} 项</span>
        </div>

        <div v-if="visibleTemplates.length" class="template-grid">
          <article
            v-for="template in visibleTemplates"
            :key="template.id"
            class="managed-template-card"
            :title="`${template.name}\n${templateFilePath(template)}`"
            tabindex="0"
            @click="openTemplate(template)"
            @keydown.enter.prevent="openTemplate(template)"
          >
            <div class="thumbnail-page" aria-hidden="true">
              <div class="thumbnail-topline">
                <FileText :size="12" />
                <span>{{ template.docType }}</span>
              </div>
              <strong>{{ template.name }}</strong>
              <span class="thumb-line wide"></span>
              <span class="thumb-line"></span>
              <span class="thumb-line short"></span>
              <div class="thumbnail-table">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <div class="tile-caption">
              <h2>{{ template.name }}</h2>
              <div class="tile-meta">
                <span>{{ template.source }}</span>
                <span>{{ template.updatedAt }}</span>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <FileText :size="22" />
          <strong>未找到匹配模板</strong>
          <span>调整分类或关键词后再试。</span>
          <button class="reset-btn active" type="button" @click="resetFilters">清空搜索</button>
        </div>
      </section>

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
  padding: 24px;
  background: rgba(0, 0, 0, 0.48);
  overflow: auto;
  overscroll-behavior: contain;
}

.template-modal {
  position: relative;
  width: min(1032px, calc(100vw - 40px));
  min-height: 412px;
  max-height: calc(100dvh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 24px 32px 28px;
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.template-modal.detail-mode {
  width: min(1120px, calc(100vw - 40px));
  height: min(860px, calc(100dvh - 48px));
  max-height: calc(100dvh - 48px);
  padding: 0;
  background: var(--surface-soft);
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
  color: var(--text-strong);
}

.modal-close-btn:hover {
  background: var(--surface-soft);
}

.detail-mode > .modal-close-btn:hover {
  background: var(--border-color);
}

.modal-header {
  flex-shrink: 0;
}

.modal-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
  padding-right: 42px;
}

.modal-page-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0;
}

.search-control {
  width: min(520px, 50%);
  min-width: 320px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.page-search {
  width: min(520px, 52%);
}

.search-control:focus-within {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.search-control svg {
  flex-shrink: 0;
}

.search-control input {
  width: 100%;
  min-width: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
}

.search-control input::placeholder {
  color: var(--text-muted);
}

.source-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.source-tabs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.source-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.source-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 14px;
  border-radius: 10px;
  color: var(--text-strong);
  background: var(--surface-muted);
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.source-tab strong {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
}

.source-tab:hover {
  background: var(--surface-soft);
}

.source-tab.active {
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.source-tab.active strong {
  color: var(--primary-hover);
}

.modal-status,
.detail-status {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.modal-status {
  margin-left: auto;
  margin-top: 10px;
}

.new-template-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 14px;
  border: 1px solid var(--primary-color);
  border-radius: 10px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary-color) 11%, transparent);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.new-template-btn:hover {
  transform: translateY(-1px);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 15%, transparent);
}

.reset-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-muted);
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.reset-btn:not(:disabled):hover,
.reset-btn.active {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-hover);
  transform: translateY(-1px);
}

.template-section {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  margin-top: 20px;
  overflow: auto;
  padding-right: 6px;
  overscroll-behavior: contain;
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 14px;
}

.result-count {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 220px));
  justify-content: space-between;
  gap: 34px 24px;
}

.managed-template-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 220px;
  min-width: 0;
  padding: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease;
}

.managed-template-card:hover {
  transform: translateY(-1px);
}

.managed-template-card:focus {
  outline: none;
}

.thumbnail-page {
  width: 100%;
  min-height: 248px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: flex-start;
  padding: 20px 18px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--text-strong) 10%, transparent);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.managed-template-card:hover .thumbnail-page {
  border-color: var(--primary-border);
  box-shadow: 0 16px 34px color-mix(in srgb, var(--primary-color) 16%, transparent);
}

.thumbnail-topline {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--primary-color);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.thumbnail-topline svg {
  flex-shrink: 0;
}

.thumbnail-topline span,
.thumbnail-page strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thumbnail-page strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.2;
}

.thumb-line {
  width: 82%;
  height: 7px;
  display: block;
  border-radius: 999px;
  background: var(--border-soft);
}

.thumb-line.wide {
  width: 100%;
}

.thumb-line.short {
  width: 58%;
}

.thumbnail-table {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: auto;
}

.thumbnail-table span {
  min-height: 28px;
  border: 1px solid var(--border-soft);
  border-radius: 3px;
  background: var(--surface-muted);
}

.tile-caption {
  width: 100%;
  min-width: 0;
  padding: 0;
}

.tile-caption h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-meta {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.2;
}

.tile-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-meta span + span::before {
  content: '';
  width: 3px;
  height: 3px;
  display: inline-block;
  margin: 0 6px 2px 0;
  border-radius: 50%;
  color: var(--text-muted);
  background: var(--text-muted);
}

.empty-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 12px;
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  text-align: center;
}

.empty-state svg {
  color: var(--primary-color);
}

.empty-state strong {
  color: var(--text-strong);
  font-size: 15px;
}

.empty-state span {
  font-size: 13px;
}

.modal-close-btn:focus-visible,
.source-tab:focus-visible,
.reset-btn:focus-visible,
.new-template-btn:focus-visible,
.managed-template-card:focus-visible,
.detail-title-btn:focus-visible,
.use-template-btn:focus-visible,
.doc-action-btn:focus-visible,
.outline-item:focus-visible {
  outline: 2px solid var(--focus-ring);
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
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.detail-title-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 650;
  line-height: 1;
}

.detail-title-btn:hover {
  color: var(--primary-color);
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
  color: var(--on-primary);
  background: var(--primary-color);
}

.use-template-btn:hover {
  background: var(--primary-hover);
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
  height: calc(100% - 72px);
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow: hidden;
}

.document-outline {
  overflow: auto;
  padding: 20px 16px;
  border-right: 1px solid var(--border-color);
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
  overflow: auto;
  padding: 28px 32px 40px;
  background: var(--border-soft);
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

@media (max-width: 900px) {
  .template-modal {
    width: calc(100vw - 32px);
    max-height: calc(100dvh - 32px);
    padding: 22px;
  }

  .modal-page-header,
  .source-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .modal-page-header {
    padding-right: 42px;
  }

  .search-control,
  .source-tabs,
  .source-actions {
    width: 100%;
  }

  .source-actions {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .template-grid {
    grid-template-columns: repeat(auto-fill, minmax(164px, 164px));
    justify-content: space-between;
    gap: 24px 16px;
  }

  .managed-template-card {
    width: 164px;
  }

  .thumbnail-page {
    min-height: 198px;
    padding: 18px 16px;
  }

  .template-modal.detail-mode {
    height: calc(100dvh - 32px);
  }

  .template-document-shell {
    grid-template-columns: 1fr;
    height: calc(100% - 72px);
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
</style>
