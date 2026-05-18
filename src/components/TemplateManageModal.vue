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
import { getMockSkillAuthor } from '../data/mockSkillAuthors';
import { hasTemplatePublishDestination } from '../data/templateCatalog';
import { sendDeepSeekMessage } from '../services/deepseekChat';
import LibraryTypeDropdown from './LibraryTypeDropdown.vue';
import TemplateCreateModal from './TemplateCreateModal.vue';

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'select', template: TemplateAsset): void;
  (event: 'create'): void;
}>();

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
type TemplateSectionId = string;

const selectedTemplate = ref<TemplateAsset | null>(null);
const customTemplateAssets = ref<TemplateAsset[]>([]);
const originalFilesByTemplateId = ref<Record<string, UploadedOriginalTemplate>>({});
const extractionStateByTemplateId = ref<Record<string, ExtractionState>>({});
const extractionMessageByTemplateId = ref<Record<string, string>>({});
const activeSectionId = ref<TemplateSectionId>('section-0');
const statusMessage = ref('');
const searchKeyword = ref('');
const selectedSource = ref<SourceFilter>('personal');
const selectedCategory = ref('全部');
const showCreateModal = ref(false);
const uploadedTemplateFile = ref<File | null>(null);
const extractionState = ref<ExtractionState>('idle');
const extractionError = ref('');
const extractionNote = ref('');
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

const sourceTabsKeys: SourceFilter[] = [
  'personal',
  'group-shared',
  'team-shared',
  'recommended',
];

const templateListPageCopy: Record<SourceFilter, { name: string; emptyTitle: string; emptyDescription: string }> = {
  personal: {
    name: '个人',
    emptyTitle: '暂无个人模板',
    emptyDescription: '创建或上传模板后，会出现在这里。',
  },
  'group-shared': {
    name: '小组',
    emptyTitle: '暂无小组共享模板',
    emptyDescription: '小组内共享的模板会集中展示在这里。',
  },
  'team-shared': {
    name: '团队',
    emptyTitle: '暂无团队共享模板',
    emptyDescription: '团队发布的通用模板会集中展示在这里。',
  },
  'public-hub': {
    name: '推荐',
    emptyTitle: '暂无推荐模板',
    emptyDescription: '推荐模板同步后会展示在这里。',
  },
  recommended: {
    name: '推荐',
    emptyTitle: '暂无推荐模板',
    emptyDescription: '推荐模板会集中展示在这里。',
  },
};

const combinedTemplates = computed(() => [...customTemplateAssets.value, ...templateAssets]);

const getTemplateStaticSourceKind = (template: TemplateAsset): SourceFilter => {
  if (template.source.includes('小组')) return 'group-shared';
  if (template.source.includes('团队')) return 'team-shared';
  if (template.source.includes('公共')) return 'public-hub';
  if (template.source.includes('推荐') || template.source.includes('官方')) return 'recommended';
  return 'personal';
};

const isTemplateVisibleInSource = (template: TemplateAsset, source: SourceFilter) => {
  if (source === 'group-shared') {
    return getTemplateStaticSourceKind(template) === source || hasTemplatePublishDestination(template.id, 'group');
  }
  if (source === 'team-shared') {
    return getTemplateStaticSourceKind(template) === source || hasTemplatePublishDestination(template.id, 'team');
  }
  if (source === 'public-hub') {
    return getTemplateStaticSourceKind(template) === source || hasTemplatePublishDestination(template.id, 'public');
  }
  if (source === 'recommended') {
    const staticSource = getTemplateStaticSourceKind(template);
    return staticSource === 'recommended' || staticSource === 'public-hub' || hasTemplatePublishDestination(template.id, 'public');
  }
  return getTemplateStaticSourceKind(template) === source;
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
    sourceTabsKeys.forEach((source) => {
      if (isTemplateVisibleInSource(template, source)) counts[source] += 1;
    });
  });

  return [
    { key: 'personal' as const, name: templateListPageCopy.personal.name, count: counts.personal },
    { key: 'group-shared' as const, name: templateListPageCopy['group-shared'].name, count: counts['group-shared'] },
    { key: 'team-shared' as const, name: templateListPageCopy['team-shared'].name, count: counts['team-shared'] },
    { key: 'recommended' as const, name: templateListPageCopy.recommended.name, count: counts.recommended },
  ];
});

const activeListCopy = computed(() => templateListPageCopy[selectedSource.value]);
const isPersonalMode = computed(() => selectedSource.value === 'personal');
const shouldShowCategoryFilter = computed(() => selectedSource.value === 'recommended');

const sourceFilteredTemplates = computed(() => {
  return combinedTemplates.value.filter((template) => isTemplateVisibleInSource(template, selectedSource.value));
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

const templateFilePath = (template: TemplateAsset) => {
  const original = originalFilesByTemplateId.value[template.id];
  return original ? `uploaded://${original.fileName}` : `assets/templates/${template.id}.md`;
};
const getTemplateAuthor = (template: TemplateAsset) => getMockSkillAuthor(template.id, 9);
const getTemplateAuthorAvatarStyle = (template: TemplateAsset) => ({
  backgroundImage: `url("${getTemplateAuthor(template).avatarUrl}")`,
});

const getTemplateDisplaySourceLabel = (template: TemplateAsset) => {
  if (selectedSource.value === 'recommended') return '推荐';
  const staticSource = getTemplateStaticSourceKind(template);
  if (staticSource === 'recommended' || staticSource === 'public-hub') return '推荐';
  return template.source;
};

const setSource = (source: SourceFilter) => {
  selectedSource.value = source;
  selectedCategory.value = '全部';
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

const createUploadedFallbackSections = (
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
      '生成期间可先查看已保留的原件信息，完成后会自动展示提取后的模板正文。',
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
  const fallbackSections = createUploadedFallbackSections(file, preview, requiredFields);

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
    selectedSource.value = 'personal';
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
  openCreateModal();
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
        <div class="modal-title-row">
          <h2 id="template-modal-title">模板库</h2>
        </div>

        <div class="modal-command-bar">
          <label class="modal-search-control">
            <Search :size="16" />
            <input v-model="searchKeyword" type="text" placeholder="搜索模板、字段、适用场景" />
          </label>
          <button class="modal-create-btn" type="button" @click="createTemplate">
            <Plus :size="16" />
            创建模板
          </button>
        </div>

        <div class="modal-source-switcher">
          <nav class="modal-tabs" aria-label="模板来源">
            <button
              v-for="tab in sourceTabs"
              :key="tab.key"
              class="modal-tab"
              :class="{ active: selectedSource === tab.key }"
              type="button"
              @click="setSource(tab.key)"
            >
              <span>{{ tab.name }}</span>
              <strong>{{ tab.count }}</strong>
            </button>
          </nav>
        </div>

        <div v-if="!isPersonalMode" class="modal-result-toolbar">
          <div class="modal-result-title">
            <strong>{{ activeListCopy.name }}</strong>
            <span>{{ visibleTemplates.length }} 个模板</span>
          </div>
          <div class="modal-source-actions">
            <LibraryTypeDropdown
              v-if="shouldShowCategoryFilter"
              v-model="selectedCategory"
              :options="categoryTabs"
              label="类型"
            />

            <div v-else class="modal-sort-segment" aria-label="排序">
              <button class="active" type="button">最近更新</button>
              <button type="button">使用量</button>
            </div>
          </div>
        </div>
        <span v-if="statusMessage" class="modal-status">{{ statusMessage }}</span>
      </header>

      <section v-if="!selectedTemplate" class="template-section" aria-label="模板文件列表">
        <div v-if="isPersonalMode && visibleTemplates.length" class="list-section-heading">
          <strong>全部模板</strong>
          <span>{{ visibleTemplates.length }} 个</span>
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
              <div class="tile-author">
                <span class="tile-author-avatar" :style="getTemplateAuthorAvatarStyle(template)" aria-hidden="true"></span>
                <span>{{ getTemplateAuthor(template).name }}</span>
              </div>
              <div class="tile-meta">
                <span>{{ getTemplateDisplaySourceLabel(template) }}</span>
                <span>{{ template.updatedAt }}</span>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <FileText :size="22" />
          <strong>{{ searchKeyword.trim() ? '未找到匹配模板' : activeListCopy.emptyTitle }}</strong>
          <span>{{ searchKeyword.trim() ? '调整分类或关键词后再试。' : activeListCopy.emptyDescription }}</span>
          <button class="reset-btn active" type="button" @click="resetFilters">清空筛选</button>
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
    <TemplateCreateModal
      v-if="showCreateModal"
      :uploaded-file="uploadedTemplateFile"
      :extraction-state="extractionState"
      :extraction-error="extractionError"
      @close="closeCreateModal"
      @upload="analyzeUploadedTemplate"
    />
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

.modal-title-row {
  min-height: 34px;
  display: flex;
  align-items: center;
  padding-right: 48px;
  margin-bottom: 18px;
}

.modal-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0;
}

.modal-command-bar,
.modal-source-switcher,
.modal-result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  padding-right: 48px;
}

.modal-command-bar {
  min-height: 40px;
  padding-right: 0;
  margin-bottom: 22px;
}

.modal-source-switcher {
  justify-content: flex-start;
  margin-bottom: 20px;
  padding-bottom: 0;
  border-bottom: 0;
}

.modal-result-toolbar {
  margin: 0 0 20px;
}

.modal-search-control {
  width: 100%;
  min-width: 0;
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.modal-search-control:focus-within {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.modal-search-control svg {
  flex-shrink: 0;
}

.modal-search-control input {
  width: 100%;
  min-width: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 13.5px;
}

.modal-search-control input::placeholder {
  color: var(--text-muted);
}

.modal-tabs {
  display: inline-flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  overflow-x: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  scrollbar-width: none;
}

.modal-tabs::-webkit-scrollbar {
  display: none;
}

.modal-tab {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.modal-tab span {
  white-space: nowrap;
}

.modal-tab strong {
  min-width: auto;
  height: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 11px;
  font-weight: 700;
}

.modal-tab:hover {
  color: var(--primary-hover);
  background: transparent;
}

.modal-tab.active {
  gap: 8px;
  padding: 0 12px;
  color: var(--text-strong);
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.modal-tab.active strong {
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--text-strong);
  background: var(--card-bg);
}

.modal-result-title {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.modal-result-title strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-result-title span {
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 650;
}

.modal-source-actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.modal-sort-segment {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.modal-sort-segment button {
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 650;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.modal-sort-segment button.active,
.modal-sort-segment button:hover {
  color: var(--text-main);
  background: var(--surface-soft);
}

.modal-status,
.detail-status {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.modal-status {
  display: block;
  margin: 8px 42px 0 0;
}

.modal-create-btn {
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

.modal-create-btn:hover {
  transform: translateY(-1px);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 20%, transparent);
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

.list-section-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
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

.tile-author {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 650;
  line-height: 1.2;
}

.tile-author span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-author-avatar {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--primary-soft);
  background-position: center;
  background-size: cover;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-color) 70%, transparent);
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
.modal-tab:focus-visible,
.reset-btn:focus-visible,
.modal-create-btn:focus-visible,
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

  .modal-command-bar,
  .modal-result-toolbar {
    align-items: flex-start;
    flex-direction: column;
    padding-right: 0;
  }

  .modal-title-row,
  .modal-source-switcher {
    padding-right: 42px;
  }

  .modal-search-control,
  .modal-tabs,
  .modal-source-actions,
  .modal-create-btn {
    width: 100%;
  }

  .modal-source-actions {
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
