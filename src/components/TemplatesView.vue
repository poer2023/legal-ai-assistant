<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Component } from 'vue';
import {
  Building2,
  Check,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  User,
  Users,
  UsersRound,
  X,
} from 'lucide-vue-next';
import { templateAssets, type TemplateAsset, type TemplateDocumentSection } from '../data/legalAssets';
import { getMockSkillAuthor } from '../data/mockSkillAuthors';
import {
  customTemplateAssets,
  deleteCustomTemplate,
  extractionMessageByTemplateId,
  extractionStateByTemplateId,
  hasTemplatePublishDestination,
  loadCustomTemplates,
  originalFilesByTemplateId,
  publishTemplateToMarket,
  upsertCustomTemplate,
  type TemplatePublishDestination,
} from '../data/templateCatalog';
import { sendDeepSeekMessage } from '../services/deepseekChat';
import { useToast } from '../stores/toast';
import TemplateCreateModal from './TemplateCreateModal.vue';
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

type SourceFilter = 'personal' | 'group-shared' | 'team-shared' | 'public-hub' | 'recommended';

const searchKeyword = ref('');
const selectedSource = ref<SourceFilter>('personal');
const selectedTemplate = ref<TemplateAsset | null>(null);
const openTemplateMenuId = ref<string | null>(null);
const showCreateModal = ref(false);
const uploadedTemplateFile = ref<File | null>(null);
const extractionState = ref<ExtractionState>('idle');
const extractionError = ref('');
const extractionNote = ref('');
const isTemplateDragActive = ref(false);
const { showToast } = useToast();

const combinedTemplates = computed(() => [...customTemplateAssets.value, ...templateAssets]);
const templateFilePath = (template: TemplateAsset) => {
  const original = originalFilesByTemplateId.value[template.id];
  return original ? `uploaded://${original.fileName}` : `assets/templates/${template.id}.md`;
};
const getTemplateAuthor = (template: TemplateAsset) => getMockSkillAuthor(template.id, 9);
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
const sourceTabsKeys: SourceFilter[] = [
  'personal',
  'group-shared',
  'team-shared',
  'recommended',
];

const templateModeCopy: Record<SourceFilter, { name: string; emptyTitle: string; emptyDescription: string }> = {
  personal: {
    name: '个人',
    emptyTitle: '暂无个人模板',
    emptyDescription: '上传或创建一个模板后，会出现在这里。',
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
    { key: 'personal' as const, name: templateModeCopy.personal.name, count: counts.personal },
    { key: 'group-shared' as const, name: templateModeCopy['group-shared'].name, count: counts['group-shared'] },
    { key: 'team-shared' as const, name: templateModeCopy['team-shared'].name, count: counts['team-shared'] },
    { key: 'recommended' as const, name: templateModeCopy.recommended.name, count: counts.recommended },
  ];
});

const templateAuthorFirms = [
  '汉坤律师事务所',
  '方达律师事务所',
  '天元律师事务所',
  '海问律师事务所',
  '金杜律师事务所',
  '君合律师事务所',
  '中伦律师事务所',
  '通商律师事务所',
];

const sourceChipCopy: Record<SourceFilter, string> = {
  personal: '来自 个人',
  'group-shared': '来自 小组',
  'team-shared': '来自 团队',
  recommended: '来自 推荐',
  'public-hub': '来自 推荐',
};

const getStableHash = (value: string) => {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
};

const getTemplateAuthorFirm = (template: TemplateAsset) =>
  templateAuthorFirms[getStableHash(template.id) % templateAuthorFirms.length]!;

const getTemplateAuthorInitial = (template: TemplateAsset) => getTemplateAuthor(template).name.slice(0, 1);

const getTemplateDisplaySource = (template: TemplateAsset): SourceFilter => {
  if (selectedSource.value === 'group-shared' && hasTemplatePublishDestination(template.id, 'group')) {
    return 'group-shared';
  }
  if (selectedSource.value === 'team-shared' && hasTemplatePublishDestination(template.id, 'team')) {
    return 'team-shared';
  }
  if (selectedSource.value === 'recommended') {
    const staticSource = getTemplateStaticSourceKind(template);
    if (staticSource === 'recommended' || staticSource === 'public-hub' || hasTemplatePublishDestination(template.id, 'public')) {
      return 'recommended';
    }
  }
  return getTemplateStaticSourceKind(template);
};

const handleTemplatePrimaryAction = (template: TemplateAsset) => {
  openTemplateMenuId.value = null;
  openTemplate(template);
};

const filteredTemplates = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return combinedTemplates.value.filter((template) => {
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

    const matchesSource = isTemplateVisibleInSource(template, selectedSource.value);

    return matchesSource && (!keyword || searchable.includes(keyword));
  });
});

const setSource = (source: SourceFilter) => {
  selectedSource.value = source;
  openTemplateMenuId.value = null;
};

const openTemplate = (template: TemplateAsset) => {
  openTemplateMenuId.value = null;
  selectedTemplate.value = template;
};

const backToList = () => {
  selectedTemplate.value = null;
};

const resetFilters = () => {
  searchKeyword.value = '';
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

const toggleTemplateMenu = (templateId: string) => {
  openTemplateMenuId.value = openTemplateMenuId.value === templateId ? null : templateId;
};

const closeTemplateMenuOnOutsideClick = (event: MouseEvent) => {
  if (!openTemplateMenuId.value) return;
  const target = event.target;
  if (target instanceof Element && target.closest('.template-card-action-menu, .template-more-btn')) return;
  openTemplateMenuId.value = null;
};

const publishDialogTemplate = ref<TemplateAsset | null>(null);
const publishDialogDestination = ref<TemplatePublishDestination>('group');
const defaultPublishGroupIds = ['business'];
const publishDialogGroupIds = ref<string[]>([...defaultPublishGroupIds]);
const publishDialogPricing = ref<'free' | 'paid'>('free');
const publishDialogPrice = ref('99');
const publishDialogTags = ref<string[]>([]);

const publishDestinationLabels: Record<TemplatePublishDestination, string> = {
  group: '小组',
  team: '团队',
  public: '市场',
};

const publishDestinationOptions: Array<{
  id: TemplatePublishDestination;
  label: string;
  description: string;
  icon: Component;
}> = [
  { id: 'group', label: '小组', description: '小组成员可在自己的「个人」中订阅使用，免费', icon: User },
  { id: 'team', label: '团队', description: '本律所成员可订阅使用，免费', icon: Building2 },
  { id: 'public', label: '市场', description: '公开发布，全平台律师与企业法务可发现并订阅', icon: Store },
];

const publishGroupOptions = [
  { id: 'business', label: '公司业务组' },
  { id: 'dispute', label: '争议解决组' },
  { id: 'compliance', label: '合规风控组' },
  { id: 'labor', label: '劳动用工组' },
];

const publishMarketTagOptions = [
  '投融资 / 并购',
  '合同审查',
  '尽职调查',
  '合规',
  '数据隐私',
  '劳动用工',
  '知识产权',
  '商事争议',
  '刑事合规',
  '公司治理',
  '税务',
  '跨境',
];

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

const stringifyTemplateSection = (section: TemplateDocumentSection) => {
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

const createTemplateDocumentText = (template: TemplateAsset) => {
  const sections = template.documentSections ?? createFallbackDocumentSections(template);
  return [
    template.name,
    '',
    `文档类型：${template.docType}`,
    `来源：${template.source}`,
    `关联能力：${template.agent}`,
    `更新时间：${template.updatedAt}`,
    ...sections.flatMap((section) => ['', stringifyTemplateSection(section)]),
  ].join('\n');
};

const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`${filename} 已下载`);
};

const editTemplate = (template: TemplateAsset) => {
  openTemplate(template);
};

const downloadTemplate = (template: TemplateAsset) => {
  openTemplateMenuId.value = null;
  downloadText(`${template.name}-template.md`, createTemplateDocumentText(template));
};

const openTemplatePublishDialog = (template: TemplateAsset) => {
  openTemplateMenuId.value = null;
  publishDialogTemplate.value = template;
  publishDialogDestination.value = 'group';
  publishDialogGroupIds.value = [...defaultPublishGroupIds];
  publishDialogPricing.value = 'free';
  publishDialogPrice.value = '99';
  publishDialogTags.value = [];
};

const closeTemplatePublishDialog = () => {
  publishDialogTemplate.value = null;
};

const selectPublishDialogDestination = (destination: TemplatePublishDestination) => {
  publishDialogDestination.value = destination;
  if (destination === 'group' && !publishDialogGroupIds.value.length) {
    publishDialogGroupIds.value = [...defaultPublishGroupIds];
  }
};

const togglePublishDialogGroup = (groupId: string) => {
  publishDialogGroupIds.value = publishDialogGroupIds.value.includes(groupId)
    ? publishDialogGroupIds.value.filter((item) => item !== groupId)
    : [...publishDialogGroupIds.value, groupId];
};

const togglePublishDialogTag = (tag: string) => {
  if (publishDialogTags.value.includes(tag)) {
    publishDialogTags.value = publishDialogTags.value.filter((item) => item !== tag);
    return;
  }
  if (publishDialogTags.value.length >= 3) return;
  publishDialogTags.value = [...publishDialogTags.value, tag];
};

const updatePublishDialogPrice = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  publishDialogPrice.value = (target?.value || '').replace(/\D/g, '');
};

const confirmTemplatePublishDialog = () => {
  const template = publishDialogTemplate.value;
  if (!template) return;
  if (publishDialogDestination.value === 'group' && !publishDialogGroupIds.value.length) {
    showToast('请选择至少一个小组', { tone: 'warning' });
    return;
  }
  if (publishDialogDestination.value === 'public' && publishDialogPricing.value === 'paid' && !publishDialogPrice.value) {
    showToast('请填写市场定价', { tone: 'warning' });
    return;
  }

  const didPublish = publishTemplateToMarket(template.id, {
    destination: publishDialogDestination.value,
    groupIds: publishDialogGroupIds.value,
    pricing: publishDialogPricing.value,
    price: publishDialogPrice.value,
    tags: publishDialogTags.value,
  });
  const label = publishDestinationLabels[publishDialogDestination.value];
  closeTemplatePublishDialog();
  showToast(didPublish ? `${template.name} 已发布到${label}` : `${template.name} 已在${label}中`);
};

const deleteTemplate = (template: TemplateAsset) => {
  const isCustomTemplate = customTemplateAssets.value.some((item) => item.id === template.id);
  openTemplateMenuId.value = null;
  if (!isCustomTemplate) {
    showToast('默认模板不可删除', { tone: 'warning' });
    return;
  }

  if (deleteCustomTemplate(template.id)) {
    showToast(`${template.name} 已删除`);
  }
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

    upsertCustomTemplate(placeholderTemplate, {
      originalFile: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        originalText,
      },
      extractionState: 'analyzing',
      extractionMessage: '生成模板中...',
    });
    originalFilesByTemplateId.value[templateId] = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      originalText,
    };
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
    upsertCustomTemplate(template, {
      originalFile: originalFilesByTemplateId.value[templateId],
      extractionState: 'done',
      extractionMessage: extractionNote.value,
    });
    if (selectedTemplate.value?.id === templateId) {
      selectedTemplate.value = template;
    }
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

onMounted(() => {
  void loadCustomTemplates();
  document.addEventListener('click', closeTemplateMenuOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeTemplateMenuOnOutsideClick);
});
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
        <header class="template-market-header" aria-labelledby="template-market-title">
          <h1 id="template-market-title">法律文书的标准模板，让每一次交付都专业一致</h1>
        </header>

        <div class="template-market-toolbar">
          <label class="template-search-control">
            <Search :size="17" />
            <input v-model="searchKeyword" type="text" placeholder="搜索模板、字段、适用场景" />
          </label>

          <button class="create-template-btn" type="button" @click="openCreateModal">
            <Plus :size="14" />
            <span>创建模板</span>
          </button>
        </div>

        <nav class="template-source-tabs" aria-label="模板来源">
          <button
            v-for="tab in sourceTabs"
            :key="tab.key"
            class="template-source-tab"
            :class="{ active: selectedSource === tab.key }"
            type="button"
            @click="setSource(tab.key)"
          >
            {{ tab.name }}
          </button>
        </nav>

        <section class="content-section" aria-label="模板管理">
          <section class="template-section" aria-label="模板文件列表">
            <div v-if="filteredTemplates.length" class="template-grid">
              <article
                v-for="template in filteredTemplates"
                :key="template.id"
                class="template-market-card"
                :class="{ 'menu-open': openTemplateMenuId === template.id }"
                :title="`${template.name}\n${templateFilePath(template)}`"
                tabindex="0"
                @click="openTemplate(template)"
                @keydown.enter.prevent="openTemplate(template)"
              >
                <div v-if="openTemplateMenuId === template.id" class="template-card-action-menu" @click.stop>
                  <button class="template-menu-action" type="button" @click="editTemplate(template)">
                    <Pencil :size="15" />
                    <span>编辑</span>
                  </button>
                  <button class="template-menu-action" type="button" @click="downloadTemplate(template)">
                    <Download :size="15" />
                    <span>下载</span>
                  </button>
                  <button class="template-menu-action" type="button" @click="openTemplatePublishDialog(template)">
                    <UsersRound :size="15" />
                    <span>发布</span>
                  </button>
                  <button class="template-menu-action danger" type="button" @click="deleteTemplate(template)">
                    <Trash2 :size="15" />
                    <span>删除</span>
                  </button>
                </div>

                <div class="template-card-main">
                  <div class="template-icon-block" aria-hidden="true">
                    <FileText :size="34" />
                  </div>

                  <div class="template-card-copy">
                    <div class="template-title-row">
                      <h2>{{ template.name }}</h2>
                    </div>

                    <p>{{ template.preview }}</p>

                    <div class="template-author-row">
                      <span class="template-author-avatar" aria-hidden="true">
                        {{ getTemplateAuthorInitial(template) }}
                      </span>
                      <strong>{{ getTemplateAuthor(template).name }}</strong>
                      <span class="template-dot">·</span>
                      <span>{{ getTemplateAuthorFirm(template) }}</span>
                    </div>
                  </div>
                </div>

                <div class="template-card-footer">
                  <span class="template-source-chip">
                    <User v-if="getTemplateDisplaySource(template) === 'personal'" :size="11" />
                    <Users v-else-if="getTemplateDisplaySource(template) === 'group-shared'" :size="11" />
                    <Building2 v-else-if="getTemplateDisplaySource(template) === 'team-shared'" :size="11" />
                    <ShieldCheck
                      v-else-if="getTemplateDisplaySource(template) === 'recommended' || getTemplateDisplaySource(template) === 'public-hub'"
                      :size="11"
                    />
                    <Store v-else :size="11" />
                    {{ sourceChipCopy[getTemplateDisplaySource(template)] }}
                  </span>

                  <div class="template-card-actions" @click.stop>
                    <button
                      class="template-primary-action"
                      type="button"
                      @click="handleTemplatePrimaryAction(template)"
                    >
                      使用模板
                    </button>
                    <button
                      class="template-more-btn"
                      type="button"
                      :aria-label="`${template.name} 更多操作`"
                      @click.stop="toggleTemplateMenu(template.id)"
                    >
                      <MoreHorizontal :size="17" />
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div v-else class="empty-state">
              <FileText :size="22" />
              <strong>{{ searchKeyword.trim() ? '未找到匹配模板' : '暂无模板' }}</strong>
              <span>{{ searchKeyword.trim() ? '调整关键词后再试。' : '上传或创建一个模板后，会出现在这里。' }}</span>
              <button class="reset-btn active" type="button" @click="resetFilters">清空筛选</button>
            </div>
          </section>
        </section>

        <div v-if="publishDialogTemplate" class="publish-dialog-backdrop" @click.self="closeTemplatePublishDialog">
          <section class="publish-dialog" role="dialog" aria-modal="true" aria-labelledby="template-publish-dialog-title">
            <header class="publish-dialog-header">
              <div class="publish-dialog-title-row">
                <h2 id="template-publish-dialog-title">发布模板</h2>
                <span>{{ publishDialogTemplate.name }}</span>
              </div>
              <button class="publish-dialog-close" type="button" aria-label="关闭发布弹窗" @click="closeTemplatePublishDialog">
                <X :size="22" />
              </button>
            </header>

            <main class="publish-dialog-body">
              <div class="publish-dialog-section-title">分享目的地</div>
              <div class="publish-dialog-destination-grid" role="radiogroup" aria-label="分享目的地">
                <button
                  v-for="option in publishDestinationOptions"
                  :key="option.id"
                  class="publish-dialog-destination-card"
                  :class="{ active: publishDialogDestination === option.id }"
                  type="button"
                  role="radio"
                  :aria-checked="publishDialogDestination === option.id"
                  @click="selectPublishDialogDestination(option.id)"
                >
                  <span class="publish-dialog-card-title">
                    <span class="publish-dialog-card-icon">
                      <component :is="option.icon" :size="18" />
                    </span>
                    <strong>{{ option.label }}</strong>
                  </span>
                  <p>{{ option.description }}</p>
                </button>
              </div>

              <section v-if="publishDialogDestination === 'group'" class="publish-dialog-groups">
                <div class="publish-dialog-section-title">选择小组（可多选）</div>
                <div class="publish-dialog-chip-list" role="group" aria-label="选择小组">
                  <button
                    v-for="group in publishGroupOptions"
                    :key="group.id"
                    class="publish-dialog-chip"
                    :class="{ active: publishDialogGroupIds.includes(group.id) }"
                    type="button"
                    :aria-pressed="publishDialogGroupIds.includes(group.id)"
                    @click="togglePublishDialogGroup(group.id)"
                  >
                    <Check v-if="publishDialogGroupIds.includes(group.id)" :size="11" />
                    <span>{{ group.label }}</span>
                  </button>
                </div>
              </section>

              <section v-else-if="publishDialogDestination === 'team'" class="publish-dialog-team-card">
                <Building2 :size="18" />
                <div>
                  <strong>金杜律师事务所 ・ 涌见律师演示组织</strong>
                  <span>21 名成员将能在「团队」分类下安装此能力</span>
                </div>
              </section>

              <section v-else class="publish-dialog-market">
                <div class="publish-dialog-market-block">
                  <div class="publish-dialog-section-title">定价</div>
                  <div class="publish-dialog-pricing-row">
                    <button
                      class="publish-dialog-price-option"
                      :class="{ active: publishDialogPricing === 'free' }"
                      type="button"
                      @click="publishDialogPricing = 'free'"
                    >
                      免费
                    </button>
                    <button
                      class="publish-dialog-price-option"
                      :class="{ active: publishDialogPricing === 'paid' }"
                      type="button"
                      @click="publishDialogPricing = 'paid'"
                    >
                      付费
                    </button>
                    <label v-if="publishDialogPricing === 'paid'" class="publish-dialog-price-input">
                      <span>¥</span>
                      <input
                        class="tabular"
                        :value="publishDialogPrice"
                        inputmode="numeric"
                        placeholder="价格"
                        @input="updatePublishDialogPrice"
                      />
                    </label>
                  </div>
                </div>

                <div class="publish-dialog-market-block">
                  <div class="publish-dialog-section-title">分类标签</div>
                  <div class="publish-dialog-chip-list" role="group" aria-label="分类标签">
                    <button
                      v-for="tag in publishMarketTagOptions"
                      :key="tag"
                      class="publish-dialog-chip"
                      :class="{
                        active: publishDialogTags.includes(tag),
                        disabled: publishDialogTags.length >= 3 && !publishDialogTags.includes(tag),
                      }"
                      type="button"
                      :aria-pressed="publishDialogTags.includes(tag)"
                      @click="togglePublishDialogTag(tag)"
                    >
                      <Check v-if="publishDialogTags.includes(tag)" :size="11" />
                      <span>{{ tag }}</span>
                    </button>
                  </div>
                  <p>至多选 3 个，用于市场分类与搜索</p>
                </div>
              </section>
            </main>

            <footer class="publish-dialog-footer">
              <button class="publish-dialog-cancel" type="button" @click="closeTemplatePublishDialog">取消</button>
              <button class="publish-dialog-confirm" type="button" @click="confirmTemplatePublishDialog">确认发布</button>
            </footer>
          </section>
        </div>

        <TemplateCreateModal
          v-if="showCreateModal"
          :uploaded-file="uploadedTemplateFile"
          :extraction-state="extractionState"
          :extraction-error="extractionError"
          @close="closeCreateModal"
          @upload="analyzeUploadedTemplate"
        />
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

/* LawAgents standalone reference replication for the template marketplace. */
.templates-view {
  --tpl-bg: #faf7f1;
  --tpl-panel: #ffffff;
  --tpl-soft: #f3eee3;
  --tpl-line: #e8e1d4;
  --tpl-line-strong: #d6cdbe;
  --tpl-ink-900: #1a1614;
  --tpl-ink-800: #2b2522;
  --tpl-ink-700: #4a423d;
  --tpl-ink-500: #837a72;
  --tpl-ink-400: #a29a91;
  --tpl-accent: #c8552e;
  --tpl-accent-700: #a4441f;
  --tpl-accent-tint: #fbf1e8;
  --tpl-serif: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'SimSun', Georgia, serif;
  --tpl-sans: 'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
  --tpl-shadow-2: 0 2px 4px rgba(26, 22, 20, 0.04), 0 0 0 1px rgba(26, 22, 20, 0.04);
  min-height: 100%;
  padding: 32px 56px 60px;
  overflow: visible;
  background: var(--tpl-bg);
  color: var(--tpl-ink-700);
  font-family: var(--tpl-sans);
  font-size: 14px;
  line-height: 1.55;
}

.templates-view.detail-view {
  height: 100%;
  padding: 22px 32px 8px;
  overflow: hidden;
}

.templates-shell {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.templates-shell.detail-shell {
  max-width: 1180px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.template-market-header {
  margin: 0 0 18px;
}

.template-market-header h1 {
  margin: 0;
  color: var(--tpl-ink-900);
  font-family: var(--tpl-serif);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.35;
}

.template-market-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.template-search-control {
  position: relative;
  flex: 1;
  max-width: 920px;
  min-width: 0;
  height: 44px;
  display: flex;
  align-items: center;
}

.template-search-control svg {
  position: absolute;
  top: 50%;
  left: 14px;
  color: var(--tpl-ink-400);
  transform: translateY(-50%);
  pointer-events: none;
}

.template-search-control input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 38px;
  border: 1px solid var(--tpl-line);
  border-radius: 10px;
  background: var(--tpl-panel);
  color: var(--tpl-ink-900);
  font-family: var(--tpl-sans);
  font-size: 14px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.template-search-control input:hover {
  border-color: var(--tpl-line-strong);
}

.template-search-control input:focus {
  outline: 0;
  border-color: var(--tpl-ink-900);
  box-shadow: 0 0 0 3px rgba(26, 22, 20, 0.08);
}

.template-search-control input::placeholder {
  color: var(--tpl-ink-400);
}

.create-template-btn {
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 18px;
  border: 1px solid var(--tpl-ink-900);
  border-radius: 10px;
  background: var(--tpl-ink-900);
  color: #ffffff;
  font-family: var(--tpl-sans);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  box-shadow: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.create-template-btn:hover {
  background: var(--tpl-ink-800);
  border-color: var(--tpl-ink-800);
  box-shadow: none;
  transform: translateY(-1px);
}

.template-source-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  overflow: visible;
  padding: 0;
  margin-bottom: 18px;
  background: transparent;
  border: 0;
  scrollbar-width: none;
}

.template-source-tabs::-webkit-scrollbar {
  display: none;
}

.template-source-tab {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--tpl-ink-700);
  font-family: var(--tpl-sans);
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.template-source-tab:hover {
  color: var(--tpl-ink-900);
  background: color-mix(in srgb, var(--tpl-soft) 74%, transparent);
}

.template-source-tab.active {
  padding: 0 16px;
  border-color: color-mix(in srgb, var(--tpl-accent) 15%, var(--tpl-line));
  background: var(--tpl-accent-tint);
  color: var(--tpl-accent-700);
  box-shadow: none;
}

.content-section,
.template-section {
  min-width: 0;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  justify-content: stretch;
  gap: 14px;
}

.template-market-card {
  position: relative;
  min-width: 0;
  min-height: 188px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px;
  border: 1px solid var(--tpl-line);
  border-radius: 14px;
  background: var(--tpl-panel);
  color: var(--tpl-ink-700);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.template-market-card:hover {
  border-color: var(--tpl-line-strong);
  box-shadow: var(--tpl-shadow-2);
  transform: translateY(-1px);
}

.template-market-card:focus {
  outline: none;
}

.template-source-tab:focus-visible,
.template-primary-action:focus-visible,
.template-more-btn:focus-visible,
.template-card-action-menu button:focus-visible,
.publish-dialog-close:focus-visible,
.publish-dialog-destination-card:focus-visible,
.publish-dialog-chip:focus-visible,
.publish-dialog-cancel:focus-visible,
.publish-dialog-confirm:focus-visible,
.create-template-btn:focus-visible,
.reset-btn:focus-visible {
  outline: 2px solid var(--tpl-ink-900);
  outline-offset: 2px;
}

.template-card-main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.template-icon-block {
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 64px;
  border-radius: 14px;
  background: var(--tpl-soft);
  color: var(--tpl-ink-700);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.template-card-copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.template-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.template-title-row h2 {
  min-width: 0;
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  color: var(--tpl-ink-900);
  font-family: var(--tpl-sans);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card-copy p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--tpl-ink-500);
  font-size: 12.5px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.template-author-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--tpl-ink-500);
  font-size: 12.5px;
  line-height: 1.2;
}

.template-author-avatar {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 20px;
  border-radius: 999px;
  background: var(--tpl-ink-900);
  color: #ffffff;
  font-family: var(--tpl-serif);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.template-author-row strong {
  color: var(--tpl-ink-900);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.template-author-row span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-dot {
  color: var(--tpl-ink-400);
}

.template-card-footer {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--tpl-line);
}

.template-source-chip {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 1;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--tpl-soft);
  color: var(--tpl-ink-700);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
  white-space: nowrap;
}

.template-source-chip svg {
  flex: 0 0 auto;
}

.template-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.template-primary-action {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  background: var(--tpl-accent);
  color: #ffffff;
  font-family: var(--tpl-sans);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

.template-primary-action:hover {
  filter: brightness(0.94);
}

.template-more-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--tpl-ink-500);
  cursor: pointer;
}

.template-more-btn:hover {
  background: var(--tpl-soft);
  color: var(--tpl-ink-900);
}

.template-card-action-menu {
  position: absolute;
  top: 58px;
  right: 14px;
  z-index: 40;
  min-width: 176px;
  padding: 8px;
  border: 1px solid var(--tpl-line);
  border-radius: 14px;
  background: var(--tpl-panel);
  box-shadow: 0 16px 38px rgba(26, 22, 20, 0.16);
}

.template-card-action-menu button {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 10px;
  color: var(--tpl-ink-700);
  font-size: 13px;
  font-weight: 650;
  text-align: left;
}

.template-card-action-menu button svg {
  flex-shrink: 0;
  color: var(--tpl-ink-500);
}

.template-card-action-menu button:hover {
  background: var(--tpl-soft);
  color: var(--tpl-ink-900);
}

.template-card-action-menu button.danger {
  color: #a33a2a;
}

.template-card-action-menu button.danger svg {
  color: #a33a2a;
}

.template-card-action-menu button.danger:hover {
  background: #fff0ed;
}

.publish-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(26, 22, 20, 0.42);
  backdrop-filter: blur(4px);
}

.publish-dialog {
  width: min(720px, calc(100vw - 48px));
  max-height: min(720px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px;
  background: var(--bg-panel, var(--card-bg));
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.publish-dialog-header {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line, var(--border-color));
}

.publish-dialog-title-row {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.publish-dialog-title-row h2 {
  margin: 0;
  color: var(--ink-900, var(--text-strong));
  font-size: 22px;
  font-weight: 650;
  line-height: 1.2;
}

.publish-dialog-title-row span {
  min-width: 0;
  overflow: hidden;
  color: var(--ink-500, var(--text-secondary));
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-dialog-close {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--ink-700, var(--text-main));
}

.publish-dialog-close:hover {
  background: var(--bg-soft, var(--surface-soft));
}

.publish-dialog-body {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  padding: 28px;
}

.publish-dialog-section-title {
  margin-bottom: 6px;
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
}

.publish-dialog-destination-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.publish-dialog-destination-card {
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 12px;
  color: var(--ink-700, var(--text-main));
  background: var(--bg-panel, var(--card-bg));
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.publish-dialog-destination-card:hover,
.publish-dialog-destination-card.active {
  border-color: var(--accent, var(--primary-border));
  background: var(--accent-tint, var(--primary-soft));
}

.publish-dialog-destination-card.active {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent, var(--primary-border)) 54%, transparent);
}

.publish-dialog-card-title {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--ink-900, var(--text-strong));
}

.publish-dialog-card-icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 6px;
  color: var(--ink-700, var(--text-strong));
  background: var(--bg-soft, var(--surface-muted));
}

.publish-dialog-destination-card.active .publish-dialog-card-icon {
  color: #fff;
  background: var(--accent, var(--primary-color));
}

.publish-dialog-card-title strong {
  color: inherit;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
}

.publish-dialog-destination-card.active .publish-dialog-card-title {
  color: var(--accent-700, var(--primary-hover));
}

.publish-dialog-destination-card p {
  margin: 0;
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
}

.publish-dialog-groups {
  display: grid;
  gap: 0;
  margin-bottom: 22px;
}

.publish-dialog-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.publish-dialog-chip {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  color: var(--ink-700, var(--text-main));
  background: var(--bg-soft, var(--surface-muted));
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
}

.publish-dialog-chip.active {
  color: #fff;
  background: var(--ink-900, var(--text-strong));
}

.publish-dialog-chip.disabled {
  opacity: 0.5;
}

.publish-dialog-team-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  padding: 14px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 14px;
  color: var(--ink-500, var(--text-secondary));
  background: var(--bg, var(--surface-soft));
}

.publish-dialog-team-card div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.publish-dialog-team-card strong {
  color: var(--ink-900, var(--text-strong));
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
}

.publish-dialog-team-card span,
.publish-dialog-market p {
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  line-height: 1.5;
}

.publish-dialog-market {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.publish-dialog-market-block {
  min-width: 0;
}

.publish-dialog-pricing-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.publish-dialog-price-option {
  min-height: 40px;
  padding: 10px 16px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 10px;
  color: var(--ink-700, var(--text-main));
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.publish-dialog-price-option.active {
  border-color: var(--accent, var(--primary-border));
  color: var(--accent-700, var(--primary-hover));
  background: var(--accent-tint, var(--primary-soft));
}

.publish-dialog-price-input {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 10px;
  background: var(--bg-panel, var(--card-bg));
}

.publish-dialog-price-input span {
  color: var(--ink-500, var(--text-secondary));
  font-size: 13px;
}

.publish-dialog-price-input input {
  width: 80px;
  border: 0;
  outline: 0;
  color: var(--ink-900, var(--text-strong));
  background: transparent;
  font: inherit;
  font-size: 14px;
}

.publish-dialog-market p {
  margin: 6px 0 0;
}

.publish-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 28px;
  border-top: 1px solid var(--line, var(--border-color));
  background: var(--bg, var(--card-bg));
}

.publish-dialog-cancel,
.publish-dialog-confirm {
  min-width: 88px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
}

.publish-dialog-cancel {
  border: 1px solid var(--line, var(--border-color));
  color: var(--ink-900, var(--text-strong));
  background: var(--bg-panel, var(--card-bg));
}

.publish-dialog-confirm {
  color: #fff;
  background: var(--ink-900, var(--text-strong));
}

.empty-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  border: 1px solid var(--tpl-line);
  border-radius: 14px;
  background: var(--tpl-panel);
  color: var(--tpl-ink-500);
  text-align: center;
}

.empty-state svg {
  color: var(--tpl-accent);
}

.empty-state strong {
  color: var(--tpl-ink-900);
  font-size: 16px;
  font-weight: 600;
}

.empty-state span {
  font-size: 13px;
}

.reset-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid var(--tpl-line);
  border-radius: 10px;
  background: var(--tpl-soft);
  color: var(--tpl-ink-900);
  font-size: 13px;
  font-weight: 500;
}

.reset-btn:hover,
.reset-btn.active {
  border-color: rgba(200, 85, 46, 0.28);
  background: var(--tpl-accent-tint);
  color: var(--tpl-accent-700);
}

@media (max-width: 980px) {
  .templates-view {
    padding: 26px 28px 44px;
  }

  .template-market-toolbar {
    align-items: stretch;
  }

  .template-search-control {
    max-width: none;
  }
}

@media (max-width: 680px) {
  .templates-view {
    padding: 20px 16px 32px;
  }

  .template-market-header h1 {
    font-size: 24px;
  }

  .template-market-toolbar {
    flex-direction: column;
  }

  .create-template-btn {
    width: 100%;
  }

  .template-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .template-card-main {
    align-items: flex-start;
  }

  .template-card-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .template-card-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
