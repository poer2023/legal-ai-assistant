<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Check,
  FileText,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-vue-next';
import { templateAssets, type TemplateAsset, type TemplateDocumentSection } from '../data/legalAssets';
import { sendDeepSeekMessage } from '../services/deepseekChat';
import LibraryTypeDropdown from './LibraryTypeDropdown.vue';
import TemplateDetailPanel from './TemplateDetailPanel.vue';

type ExtractionState = 'idle' | 'reading' | 'analyzing' | 'done' | 'error';

type AiExtractedTemplatePayload = {
  name?: unknown;
  docType?: unknown;
  preview?: unknown;
  requiredFields?: unknown;
  tags?: unknown;
  sections?: unknown;
};

type UploadedOriginalTemplate = {
  fileName: string;
  fileSize: number;
  fileType: string;
  originalText: string;
};

type SourceFilter = 'personal' | 'group-shared' | 'team-shared' | 'public-hub' | 'recommended';

const searchKeyword = ref('');
const selectedSource = ref<SourceFilter>('personal');
const selectedCategory = ref('全部');
const selectedTemplate = ref<TemplateAsset | null>(null);
const customTemplateAssets = ref<TemplateAsset[]>([]);
const originalFilesByTemplateId = ref<Record<string, UploadedOriginalTemplate>>({});
const extractionStateByTemplateId = ref<Record<string, ExtractionState>>({});
const extractionMessageByTemplateId = ref<Record<string, string>>({});
const showCreateModal = ref(false);
const uploadedTemplateFile = ref<File | null>(null);
const extractionState = ref<ExtractionState>('idle');
const extractionError = ref('');
const extractionNote = ref('');
const isTemplateDragActive = ref(false);

const combinedTemplates = computed(() => [...customTemplateAssets.value, ...templateAssets]);
const templateFilePath = (template: TemplateAsset) => {
  const original = originalFilesByTemplateId.value[template.id];
  return original ? `uploaded://${original.fileName}` : `assets/templates/${template.id}.md`;
};
const isDetailOpen = computed(() => Boolean(selectedTemplate.value));
const selectedOriginalFile = computed(() =>
  selectedTemplate.value ? originalFilesByTemplateId.value[selectedTemplate.value.id] : undefined
);
const selectedExtractionState = computed<ExtractionState>(() =>
  selectedTemplate.value ? extractionStateByTemplateId.value[selectedTemplate.value.id] ?? 'idle' : 'idle'
);
const selectedExtractionMessage = computed(() =>
  selectedTemplate.value ? extractionMessageByTemplateId.value[selectedTemplate.value.id] ?? '' : ''
);
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

const templateModeCopy: Record<SourceFilter, { name: string; emptyTitle: string; emptyDescription: string }> = {
  personal: {
    name: '我的模板',
    emptyTitle: '暂无我的模板',
    emptyDescription: '上传或创建一个模板后，会出现在这里。',
  },
  'group-shared': {
    name: '小组共享',
    emptyTitle: '暂无小组共享模板',
    emptyDescription: '小组内共享的模板会集中展示在这里。',
  },
  'team-shared': {
    name: '团队共享',
    emptyTitle: '暂无团队共享模板',
    emptyDescription: '团队发布的通用模板会集中展示在这里。',
  },
  'public-hub': {
    name: '公共库',
    emptyTitle: '暂无公共库模板',
    emptyDescription: '公共库模板同步后会展示在这里。',
  },
  recommended: {
    name: '官方推荐',
    emptyTitle: '暂无官方推荐模板',
    emptyDescription: '官方维护的模板会集中展示在这里。',
  },
};

const getTemplateSourceKind = (template: TemplateAsset): SourceFilter => {
  if (template.source.includes('小组')) return 'group-shared';
  if (template.source.includes('团队')) return 'team-shared';
  if (template.source.includes('公共')) return 'public-hub';
  if (template.source.includes('推荐') || template.source.includes('官方')) return 'recommended';
  return 'personal';
};

const sourceTabs = computed(() => {
  const counts: Record<SourceFilter, number> = {
    personal: 0,
    'group-shared': 0,
    'team-shared': 0,
    'public-hub': 0,
    recommended: 0,
  };

  combinedTemplates.value.forEach((template) => {
    counts[getTemplateSourceKind(template)] += 1;
  });

  return [
    { key: 'personal' as const, name: templateModeCopy.personal.name, count: counts.personal },
    { key: 'group-shared' as const, name: templateModeCopy['group-shared'].name, count: counts['group-shared'] },
    { key: 'team-shared' as const, name: templateModeCopy['team-shared'].name, count: counts['team-shared'] },
    { key: 'public-hub' as const, name: templateModeCopy['public-hub'].name, count: counts['public-hub'] },
    { key: 'recommended' as const, name: templateModeCopy.recommended.name, count: counts.recommended },
  ];
});

const activeModeCopy = computed(() => templateModeCopy[selectedSource.value]);
const isPersonalMode = computed(() => selectedSource.value === 'personal');
const shouldShowCategoryFilter = computed(() => selectedSource.value === 'recommended');

const sourceFilteredTemplates = computed(() => {
  return combinedTemplates.value.filter((template) => getTemplateSourceKind(template) === selectedSource.value);
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

const filteredTemplates = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return sourceFilteredTemplates.value.filter((template) => {
    const matchesCategory =
      !shouldShowCategoryFilter.value ||
      selectedCategory.value === '全部' ||
      template.docType === selectedCategory.value;
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

const setSource = (source: SourceFilter) => {
  selectedSource.value = source;
  selectedCategory.value = '全部';
};

const openTemplate = (template: TemplateAsset) => {
  selectedTemplate.value = template;
};

const backToList = () => {
  selectedTemplate.value = null;
};

const resetFilters = () => {
  searchKeyword.value = '';
  selectedCategory.value = '全部';
};

const openCreateModal = () => {
  showCreateModal.value = true;
  extractionState.value = 'idle';
  extractionError.value = '';
  extractionNote.value = '';
  uploadedTemplateFile.value = null;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized || fallback;
};

const normalizeStringList = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? Array.from(new Set(normalized)).slice(0, 8) : fallback;
};

const normalizeDocumentSections = (
  value: unknown,
  fallback: TemplateDocumentSection[],
): TemplateDocumentSection[] => {
  if (!Array.isArray(value)) return fallback;

  const sections = value
    .filter((section): section is Record<string, unknown> => Boolean(section) && typeof section === 'object')
    .map((section) => {
      const title = normalizeText(section.title, '');
      if (!title) return null;

      const paragraphs = normalizeStringList(section.paragraphs, []);
      const items = normalizeStringList(section.items, []);
      const tableSource = section.table;
      const table = tableSource && typeof tableSource === 'object'
        ? tableSource as Record<string, unknown>
        : null;
      const headers = normalizeStringList(table?.headers, []);
      const rows = Array.isArray(table?.rows)
        ? table.rows
            .filter((row): row is unknown[] => Array.isArray(row))
            .map((row) => row.map((cell) => normalizeText(cell, '')).filter(Boolean))
            .filter((row) => row.length)
        : [];

      return {
        title,
        ...(paragraphs.length ? { paragraphs } : {}),
        ...(items.length ? { items } : {}),
        ...(headers.length && rows.length ? { table: { headers, rows } } : {}),
      };
    })
    .filter((section): section is TemplateDocumentSection => Boolean(section));

  return sections.length ? sections : fallback;
};

const inferDocType = (fileName: string, originalText: string) => {
  const source = `${fileName} ${originalText}`.toLowerCase();
  if (/尽调|调查|清单|dd|diligence/.test(source)) return '尽职调查';
  if (/法律意见|意见书|memo|备忘录|咨询/.test(source)) return '咨询意见';
  if (/投资|融资|股权|基金/.test(source)) return '投资交易';
  if (/合规|制度|内控/.test(source)) return '合规日常';
  if (/合同|协议|委托|函|承诺/.test(source)) return '交易文件';
  return '自定义模板';
};

const createFallbackSections = (
  file: File,
  preview: string,
  requiredFields: string[],
): TemplateDocumentSection[] => [
  {
    title: '一、模板定位',
    paragraphs: [preview],
  },
  {
    title: '二、AI 提取字段',
    table: {
      headers: ['字段', '填写内容', '提取说明'],
      rows: requiredFields.map((field) => [field, `【${field}】`, '从原模板结构中识别，使用前建议复核。']),
    },
  },
  {
    title: '三、原件保留',
    items: [
      `原始文件：${file.name}`,
      `文件大小：${formatFileSize(file.size)}`,
      '后续可用原件与提取模板进行比对、校验和版本追溯。',
    ],
  },
  {
    title: '四、使用建议',
    items: [
      '先复核字段是否覆盖业务场景。',
      '确认条款顺序、定义和附件要求是否与原件一致。',
      '生成正式文书前保留待确认事项，不把缺失信息写成确定结论。',
    ],
  },
];

const createGeneratingSections = (file: File): TemplateDocumentSection[] => [
  {
    title: '一、生成状态',
    paragraphs: [
      `正在从“${file.name}”提取模板结构、字段和可复用预览内容。`,
      '生成期间可先切换到原件查看，完成后会自动展示提取后的模板正文。',
    ],
  },
  {
    title: '二、原件保留',
    items: [
      `原始文件：${file.name}`,
      `文件大小：${formatFileSize(file.size)}`,
      '原件会保留在当前模板记录中，便于后续回溯和比对。',
    ],
  },
];

const extractJsonPayload = (content: string): AiExtractedTemplatePayload | null => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? content;
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as AiExtractedTemplatePayload : null;
  } catch {
    return null;
  }
};

const runAiExtraction = async (file: File, originalText: string) => {
  const canSendContent = originalText.trim() && !originalText.startsWith('已保留原始文件：');
  if (!canSendContent) return null;

  const prompt = [
    '请分析用户上传的法律模板原文，提取成模板可预览的结构。',
    '只返回 JSON，不要解释。JSON 字段如下：',
    '{ "name": "模板名称", "docType": "文书分类", "preview": "一句话用途", "requiredFields": ["字段"], "tags": ["标签"], "sections": [{ "title": "章节标题", "paragraphs": ["段落"], "items": ["要点"] }] }',
    '文书分类优先使用：项目启动、尽职调查、咨询意见、交易文件、投资交易、资本市场、并购交易、基金业务、合规日常、自定义模板。',
    `文件名：${file.name}`,
    `原文：\n${originalText.slice(0, 6000)}`,
  ].join('\n\n');

  const result = await sendDeepSeekMessage(prompt, {
    mode: 'consult',
    thinkingMode: 'quick',
    searchModes: [],
  });

  return extractJsonPayload(result.content);
};

const readUploadedTemplateText = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const textLikeExtensions = ['txt', 'md', 'markdown', 'rtf', 'csv', 'json', 'html', 'xml'];
  const isTextLike = file.type.startsWith('text/') || textLikeExtensions.includes(extension);

  if (!isTextLike) {
    return [
      `已保留原始文件：${file.name}`,
      `文件类型：${file.type || extension || '未知'}`,
      `文件大小：${formatFileSize(file.size)}`,
      '',
      '当前浏览器预览不直接展开该格式正文，接入服务端解析后可读取完整原件内容。',
    ].join('\n');
  }

  return (await file.text()).slice(0, 12000);
};

const createUploadedTemplateAsset = (
  file: File,
  originalText: string,
  payload: AiExtractedTemplatePayload | null,
  templateId: string,
  state: 'generating' | 'done' = 'done',
) => {
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || '上传模板';
  const docType = normalizeText(payload?.docType, inferDocType(file.name, originalText));
  const name = normalizeText(payload?.name, baseName);
  const requiredFields = normalizeStringList(payload?.requiredFields, ['文书名称', '适用场景', '主体信息', '关键条款', '待补充材料']);
  const preview = state === 'generating'
    ? `正在从“${file.name}”生成模板，原件已保留。`
    : normalizeText(payload?.preview, `从“${file.name}”智能提取的可复用模板，原件已保留用于回溯。`);
  const tags = normalizeStringList(payload?.tags, ['上传模板', 'AI 提取', '原件保留']);
  const fallbackSections = createFallbackSections(file, preview, requiredFields);

  return {
    id: templateId,
    name,
    docType,
    source: state === 'generating' ? '生成中 · 原件保留' : 'AI 提取 · 原件保留',
    applicableSkills: ['模板提取'],
    agent: '模板提取助手',
    requiredFields,
    preview,
    routeName: 'templates',
    tags,
    updatedAt: new Date().toISOString().slice(0, 10),
    documentSections: state === 'generating'
      ? createGeneratingSections(file)
      : normalizeDocumentSections(payload?.sections, fallbackSections),
  } satisfies TemplateAsset;
};

const analyzeUploadedTemplate = async (file: File) => {
  uploadedTemplateFile.value = file;
  extractionError.value = '';
  extractionNote.value = '';
  extractionState.value = 'reading';

  try {
    const originalText = await readUploadedTemplateText(file);
    const templateId = `uploaded-template-${Date.now()}`;
    const placeholderTemplate = createUploadedTemplateAsset(file, originalText, null, templateId, 'generating');

    customTemplateAssets.value = [
      placeholderTemplate,
      ...customTemplateAssets.value.filter((item) => item.name !== placeholderTemplate.name),
    ];
    originalFilesByTemplateId.value[templateId] = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      originalText,
    };
    extractionStateByTemplateId.value[templateId] = 'analyzing';
    extractionMessageByTemplateId.value[templateId] = '生成模板中...';
    selectedCategory.value = '全部';
    selectedTemplate.value = placeholderTemplate;
    closeCreateModal();

    extractionState.value = 'analyzing';

    let payload: AiExtractedTemplatePayload | null = null;
    try {
      payload = await runAiExtraction(file, originalText);
      extractionNote.value = payload ? '已完成 AI 结构提取，原件已随模板保留。' : '已完成结构化提取，原件已随模板保留。';
    } catch {
      extractionNote.value = 'AI 服务暂不可用，已先使用本地结构化提取并保留原件。';
    }

    const template = createUploadedTemplateAsset(file, originalText, payload, templateId, 'done');
    customTemplateAssets.value = customTemplateAssets.value.map((item) =>
      item.id === templateId ? template : item
    );
    if (selectedTemplate.value?.id === templateId) {
      selectedTemplate.value = template;
    }
    extractionStateByTemplateId.value[templateId] = 'done';
    extractionMessageByTemplateId.value[templateId] = extractionNote.value;
    extractionState.value = 'done';
  } catch (error) {
    extractionError.value = error instanceof Error ? error.message : '模板读取失败，请重新上传。';
    extractionState.value = 'error';
  }
};

const handleUploadedTemplateChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;

  void analyzeUploadedTemplate(file);
};

const handleTemplateDrop = (event: DragEvent) => {
  isTemplateDragActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  void analyzeUploadedTemplate(file);
};
</script>

<template>
  <div class="templates-view" :class="{ 'detail-view': isDetailOpen }">
    <main class="templates-shell" :class="{ 'detail-shell': isDetailOpen }">
      <TemplateDetailPanel
        v-if="selectedTemplate"
        class="template-page-detail"
        :template="selectedTemplate"
        :generation-state="selectedExtractionState"
        :generation-message="selectedExtractionMessage"
        :original-file="selectedOriginalFile"
        layout="page"
        @back="backToList"
      />

      <template v-else>
        <header class="market-topbar">
          <span class="market-kicker">模板市场</span>
          <button class="create-template-btn" type="button" @click="openCreateModal">
            <Plus :size="16" />
            <span>创建模板</span>
          </button>
        </header>

        <section class="market-hero" aria-labelledby="template-market-title">
          <h1 id="template-market-title">沉淀可复用的法律文书模板</h1>
          <p>管理、创建和调用标准模板，让常用文书、字段结构和交付格式保持一致。</p>
        </section>

        <div class="market-controls">
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

          <label class="search-control market-search">
            <Search :size="17" />
            <input v-model="searchKeyword" type="text" placeholder="搜索模板、字段、适用场景" />
          </label>
        </div>

        <div v-if="!isPersonalMode" class="result-toolbar">
          <div class="result-title">
            <strong>{{ activeModeCopy.name }}</strong>
            <span>{{ filteredTemplates.length }} 个模板</span>
          </div>
          <div class="toolbar-actions">
            <LibraryTypeDropdown
              v-if="shouldShowCategoryFilter"
              v-model="selectedCategory"
              :options="categoryTabs"
              label="类型"
            />

            <div v-else class="sort-segment" aria-label="排序">
              <button class="active" type="button">最近更新</button>
              <button type="button">使用量</button>
            </div>
          </div>
        </div>

        <section class="content-section" aria-label="模板管理">
          <section class="template-section" aria-label="模板文件列表">
            <div v-if="isPersonalMode && filteredTemplates.length" class="list-section-heading">
              <strong>全部模板</strong>
              <span>{{ filteredTemplates.length }} 个</span>
            </div>

            <div v-if="filteredTemplates.length" class="template-grid">
              <article
                v-for="template in filteredTemplates"
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
              <strong>{{ searchKeyword.trim() ? '未找到匹配模板' : activeModeCopy.emptyTitle }}</strong>
              <span>{{ searchKeyword.trim() ? '调整分类或关键词后再试。' : activeModeCopy.emptyDescription }}</span>
              <button class="reset-btn active" type="button" @click="resetFilters">清空筛选</button>
            </div>
          </section>
        </section>

        <div v-if="showCreateModal" class="template-create-backdrop" @click.self="closeCreateModal">
          <section class="template-create-modal" role="dialog" aria-modal="true" aria-labelledby="template-create-title">
            <button class="create-close-btn" type="button" aria-label="关闭新建模板" @click="closeCreateModal">
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
                :class="{ active: Boolean(uploadedTemplateFile), dragging: isTemplateDragActive }"
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
                <strong>{{ uploadedTemplateFile?.name || '点击或拖拽上传模板原件' }}</strong>
                <span>
                  {{ uploadedTemplateFile ? `${formatFileSize(uploadedTemplateFile.size)} · 正在进入预览页` : '支持 doc、docx、pdf、txt、md、rtf；上传后立即生成占位模板' }}
                </span>
              </label>

              <p v-if="extractionState === 'reading' || extractionState === 'analyzing'" class="extract-status">
                正在读取原件，随后会自动打开模板预览页。
              </p>
              <p v-else-if="extractionState === 'error'" class="extract-status error">
                {{ extractionError }}
              </p>
            </div>
          </section>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.templates-view {
  flex: 1;
  min-width: 0;
  min-height: 100%;
  overflow: visible;
  padding: 22px 32px 48px;
  background: var(--bg-color);
  color: var(--text-main);
}

.templates-view.detail-view {
  height: 100%;
  overflow: hidden;
  padding-bottom: 8px;
}

.templates-shell {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  transition: max-width 0.18s ease;
}

.templates-shell.detail-shell {
  max-width: 1180px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.template-page-detail {
  flex: 1;
  min-height: 0;
}

.market-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 36px;
  margin-bottom: 46px;
}

.market-kicker {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 750;
  line-height: 1.2;
}

.market-hero {
  max-width: 760px;
  margin: 0 auto 42px;
  text-align: center;
}

.market-hero h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 32px;
  font-weight: 760;
  line-height: 1.22;
  letter-spacing: 0;
}

.market-hero p {
  max-width: 620px;
  margin: 18px auto 0;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.65;
  letter-spacing: 0;
}

.market-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}

.create-template-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 680;
  line-height: 1;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-color) 16%, transparent);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.create-template-btn:hover {
  transform: translateY(-1px);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.content-section {
  min-height: 360px;
}

.search-control {
  width: 100%;
  min-width: 0;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
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

.create-template-btn,
.sort-segment button,
.source-tab {
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.source-tabs {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  min-width: 0;
  overflow-x: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  scrollbar-width: none;
}

.source-tabs::-webkit-scrollbar {
  display: none;
}

.source-tab {
  min-width: 0;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.source-tab span {
  white-space: nowrap;
}

.source-tab strong {
  min-width: auto;
  height: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.source-tab:hover {
  color: var(--primary-hover);
  background: transparent;
}

.source-tab.active {
  gap: 8px;
  padding: 0 12px;
  color: var(--text-strong);
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.source-tab.active strong {
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--text-strong);
  background: var(--card-bg);
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -8px 0 18px;
}

.result-title {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.result-title strong {
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.result-title span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
}

.toolbar-actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.sort-segment {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.sort-segment button {
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 650;
}

.sort-segment button.active,
.sort-segment button:hover {
  color: var(--text-main);
  background: var(--surface-soft);
}

.reset-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.reset-btn {
  border: 1px solid var(--border-color);
  background: var(--surface-muted);
  color: var(--text-main);
}

.reset-btn:not(:disabled):hover,
.reset-btn.active {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-color);
  transform: translateY(-1px);
}

.reset-btn:disabled {
  color: var(--text-muted);
  cursor: default;
  opacity: 0.62;
}

.template-section {
  min-width: 0;
}

.list-section-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 2px 0 12px;
}

.list-section-heading strong {
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.list-section-heading span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
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

.managed-template-card:focus-visible,
.source-tab:focus-visible,
.reset-btn:focus-visible,
.create-template-btn:focus-visible,
.create-close-btn:focus-visible,
.upload-zone-btn:focus-visible,
.preview-result-btn:focus-visible,
.preview-switch button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
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
  background: var(--text-muted);
}

.empty-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  color: var(--text-secondary);
  text-align: center;
}

.empty-state svg {
  color: var(--primary-color);
}

.empty-state strong {
  color: var(--text-strong);
  font-size: 16px;
}

.empty-state span {
  font-size: 13px;
}

.template-create-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
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

.upload-zone-btn,
.preview-result-btn {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid var(--primary-border);
  border-radius: 9px;
  background: var(--card-bg);
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 700;
}

.extract-flow {
  display: grid;
  grid-template-columns: auto minmax(30px, 1fr) auto minmax(30px, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.flow-step {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.flow-step svg {
  color: var(--text-muted);
}

.flow-step.active,
.flow-step.done,
.flow-step.active svg,
.flow-step.done svg {
  color: var(--primary-color);
}

.flow-line {
  height: 1px;
  background: var(--border-soft);
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

.extract-status {
  margin: -4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.35;
}

.extract-status.error {
  color: var(--danger-color, #dc2626);
}

.analysis-result {
  display: grid;
  gap: 14px;
  padding-top: 2px;
}

.result-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--surface-muted);
}

.result-summary span {
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 750;
}

.result-summary h3 {
  margin: 5px 0 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: 0;
}

.result-summary p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.preview-result-btn {
  min-height: 38px;
  background: var(--primary-color);
  color: #fff;
}

.preview-switch {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-muted);
}

.preview-switch button {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.preview-switch button.active {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--text-strong) 8%, transparent);
}

.template-preview-panel {
  max-height: 280px;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
}

.extracted-preview {
  display: grid;
  gap: 16px;
  padding: 18px 20px;
}

.preview-section h4 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 750;
  letter-spacing: 0;
}

.preview-section p,
.preview-section li {
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.65;
}

.preview-section p {
  margin: 0 0 6px;
}

.preview-section ul {
  margin: 0;
  padding-left: 18px;
}

.preview-section table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  font-size: 12px;
}

.preview-section th,
.preview-section td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-soft);
  color: var(--text-main);
  text-align: left;
  vertical-align: top;
}

.preview-section th {
  background: var(--surface-muted);
  color: var(--text-strong);
  font-weight: 700;
}

.preview-section tr:last-child td {
  border-bottom: 0;
}

.original-preview {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.original-file-meta {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  color: var(--primary-color);
}

.original-file-meta strong,
.original-file-meta span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.original-file-meta strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 750;
}

.original-file-meta span {
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 12px;
}

.original-preview pre {
  max-height: 190px;
  margin: 0;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes guide-pulse {
  0%,
  100% {
    transform: translateY(0);
    box-shadow: 0 12px 26px color-mix(in srgb, var(--primary-color) 8%, transparent);
  }

  50% {
    transform: translateY(-2px);
    box-shadow: 0 16px 30px color-mix(in srgb, var(--primary-color) 13%, transparent);
  }
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

@media (max-width: 900px) {
  .templates-view {
    padding: 18px 16px 28px;
  }

  .market-controls {
    grid-template-columns: 1fr;
  }

  .source-tabs {
    width: 100%;
    align-items: flex-start;
  }

  .search-control {
    width: 100%;
    min-width: 0;
  }

  .result-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .market-topbar {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 34px;
  }

  .create-template-btn {
    width: 100%;
    justify-content: center;
  }

  .template-grid {
    grid-template-columns: repeat(auto-fill, minmax(164px, 164px));
    justify-content: space-between;
    gap: 24px 16px;
  }

  .managed-template-card {
    width: 164px;
  }

  .market-hero {
    margin-bottom: 32px;
    text-align: left;
  }

  .market-hero h1 {
    font-size: 26px;
  }

  .market-hero p {
    margin-top: 12px;
  }

  .thumbnail-page {
    width: 100%;
    min-height: 198px;
    padding: 18px 16px;
  }

  .tile-caption {
    width: 100%;
  }

  .template-create-backdrop {
    padding: 12px;
  }

  .create-modal-header {
    grid-template-columns: 1fr;
    padding-right: 58px;
  }

  .create-guide {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .create-guide::before {
    display: none;
  }

  .template-upload-zone {
    min-height: 190px;
  }
}
</style>
