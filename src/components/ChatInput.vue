<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Brain,
  File,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  Scale,
  Image,
  Info,
  MessageCircle,
  Mic,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Check,
  BookOpen,
  Paperclip,
  Puzzle,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-vue-next';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import SkillDropdownContent from './SkillDropdownContent.vue';
import type { SkillDropdownSelection } from './SkillDropdownContent.vue';
import SkillManageModal from './SkillManageModal.vue';
import TemplateManageModal from './TemplateManageModal.vue';
import { availableSkills, getSkillByNameOrId, isRegisteredSkillName, type SkillCatalogItem } from '../data/skillCatalog';
import {
  defaultTemplateAssets,
  type TemplateAsset,
} from '../data/legalAssets';
import {
  generateSkillCreatorQuestionPlan,
  generateSkillCreatorRootOptions,
  type SkillCreatorGuideAssetSlot as GeneratedSkillCreatorAssetSlot,
  type SkillCreatorGuideField,
  type SkillCreatorGuideOption as GeneratedSkillCreatorOption,
  type SkillCreatorGuideStep as GeneratedSkillCreatorStep,
} from '../services/skillCreatorGuide';

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'skill-guide-active-change': [active: boolean];
  submit: [value: string, options: { thinkingMode: string }];
}>();

const inputValue = ref('');
const showActionMenu = ref(false);
const showDraftMenu = ref(false);
const showSkillMenu = ref(false);
const showTemplateMenu = ref(false);
const showInlineSkillMenu = ref(false);
const showInlineTemplateMenu = ref(false);
const showKnowledgeDraftPicker = ref(false);
const showSkillManageModal = ref(false);
const skillManageStartsInCreate = ref(false);
const showTemplateManageModal = ref(false);
const showSkillCreatorGuide = ref(false);
const showSkillCreatorForm = ref(false);
const skillCreatorGuideStep = ref(0);
const skillTokenCount = ref(0);
const hasSkillCreatorToken = ref(false);
const templateTokenCount = ref(0);
const lastEmittedModelValue = ref<string | undefined>(undefined);
const inputContainerRef = ref<HTMLDivElement | null>(null);
const editorRef = ref<HTMLDivElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const folderInputRef = ref<HTMLInputElement | null>(null);
const activeSkillRange = ref<Range | null>(null);
const activeTemplateRange = ref<Range | null>(null);
const inlineSkillQuery = ref('');
const inlineTemplateQuery = ref('');
const selectedSkillToken = ref<HTMLElement | null>(null);
const selectedComposerSkillNames = ref<string[]>([]);
const inlineShortcutMenuPosition = ref({ left: 16, top: 48 });
const selectedAssetPromptPrefix = '请使用 ';
const skillCreatorPromptSuffix = ' 帮我创建一个可复用的技能，我的需求如下：';
const templatePromptSuffix = ' 帮我按照这个格式模板完成写作，我的需求/源文件如下：';
const templateCreatorPromptSuffix = ' 帮我创建一个可复用的输出格式模板，我的需求/源文件如下：';
const inlineTokenSelector = '.skill-inline-code, .template-inline-code, .asset-inline-code';
// Keep the previous multi-step guide in this file, but route new creation to the fixed form.
const useFixedSkillCreatorForm = true;
const showLegacySkillCreatorGuide = computed(() =>
  showSkillCreatorGuide.value && !useFixedSkillCreatorForm
);
const isSkillCreatorCreationActive = computed(() =>
  showSkillCreatorForm.value || showLegacySkillCreatorGuide.value
);

type SkillCreatorField = SkillCreatorGuideField;

type SkillCreatorOption = GeneratedSkillCreatorOption;

type SkillCreatorAssetSlot = GeneratedSkillCreatorAssetSlot;

type SkillCreatorStep = {
  field: SkillCreatorField;
  title: string;
  eyebrow: string;
  options: SkillCreatorOption[];
  assetSlots?: SkillCreatorAssetSlot[];
};

type SkillCreatorReferenceAssetKind = 'local-file' | 'knowledge-file' | 'template';

type SkillCreatorReferenceAsset = {
  id: string;
  kind: SkillCreatorReferenceAssetKind;
  name: string;
  sourceLabel: string;
  stepField?: SkillCreatorField;
  slotId?: string;
  templateId?: string;
};

type SkillCreatorAssetTarget = {
  stepField: SkillCreatorField;
  slotId: string;
  slotType: SkillCreatorAssetSlot['type'];
} | null;

const rootSkillCreatorStep: SkillCreatorStep = {
  field: 'root-need',
  eyebrow: '1 / 1',
  title: '你想创建什么类型的技能？',
  options: [
    {
      id: 'compliance-review-skill',
      label: '合规审查技能',
      description: '用于规则核查、差距分析、整改建议和风险分级。',
      recommended: true,
    },
    {
      id: 'contract-review-skill',
      label: '合同审查技能',
      description: '用于合同审查、红线修改、谈判清单和风险矩阵。',
    },
    {
      id: 'document-drafting-skill',
      label: '文书起草技能',
      description: '用于生成 Word 文书初稿、结构稿或可复制段落。',
    },
    {
      id: 'case-material-skill',
      label: '案件材料整理技能',
      description: '用于整理事实、证据、时间线、争议焦点和待补材料。',
    },
    {
      id: 'legal-research-skill',
      label: '法律检索研究技能',
      description: '用于法规、案例、监管口径或专题法律问题研究。',
    },
  ],
};

const fallbackFollowupSkillCreatorSteps: SkillCreatorStep[] = [
  {
    field: 'source',
    eyebrow: '2 / 4',
    title: '技能运行时主要读取什么材料？',
    assetSlots: [
      {
        id: 'runtime-drafts',
        type: 'draft',
        title: '建议补充运行底稿',
        description: '上传或选择一份典型材料，帮助技能明确启动时要读取的文件。',
        optional: true,
        allowLocal: true,
        allowKnowledge: true,
      },
      {
        id: 'output-template',
        type: 'template',
        title: '建议选择输出模板',
        description: '选择一个模板作为技能的稳定格式约束；可以跳过。',
        optional: true,
        allowTemplate: true,
      },
    ],
    options: [
      {
        id: 'uploaded-files',
        label: '上传或粘贴项目材料',
        description: '用户每次提供合同、底稿、邮件、访谈记录等材料。',
      },
      {
        id: 'knowledge-base',
        label: '团队知识库',
        description: '自动参考团队沉淀的条款、案例、清单和口径。',
      },
      {
        id: 'existing-template',
        label: '现有模板 / 技能',
        description: '沿用已有模板结构或团队已经验证过的技能写法。',
      },
      {
        id: 'plain-text-rules',
        label: '纯文字描述规则',
        description: '暂时没有固定资料，用自然语言描述流程和要求。',
        recommended: true,
      },
    ],
  },
  {
    field: 'output',
    eyebrow: '3 / 4',
    title: '希望这项技能稳定产出什么？',
    assetSlots: [
      {
        id: 'output-template',
        type: 'template',
        title: '建议选择输出模板',
        description: '如果希望输出格式稳定，可以选择一个模板作为参考。',
        optional: true,
        allowTemplate: true,
      },
    ],
    options: [
      {
        id: 'word-draft',
        label: 'Word 文书初稿',
        description: '生成可继续修改的正式文档或结构稿。',
      },
      {
        id: 'review-list',
        label: '审查清单',
        description: '输出逐项检查点、修改方向和待确认事项。',
      },
      {
        id: 'risk-matrix',
        label: '风险矩阵 / 问题表',
        description: '按风险等级、影响、建议动作组织结果。',
      },
      {
        id: 'workflow-steps',
        label: '工作步骤 / 操作规程',
        description: '沉淀团队可复用的处理流程和复核动作。',
      },
      {
        id: 'template-clause',
        label: '模板 / 条款库',
        description: '生成可复用的模板结构、条款或格式片段。',
      },
    ],
  },
  {
    field: 'scope',
    eyebrow: '4 / 4',
    title: '这项技能先按什么范围设计？',
    options: [
      {
        id: 'personal',
        label: '仅个人使用',
        description: '先服务自己的工作流，后续确认后再共享。',
        recommended: true,
      },
      {
        id: 'group',
        label: '小组共享',
        description: '给当前业务小组复用，需要保留口径说明。',
      },
      {
        id: 'team',
        label: '团队共享',
        description: '面向全团队复用，需要更明确的边界和检查点。',
      },
      {
        id: 'personal-draft',
        label: '个人草稿标准',
        description: '先保存为个人技能，后续根据使用效果再继续调整。',
      },
    ],
  },
];

const withSkillCreatorEyebrows = (steps: SkillCreatorStep[]) =>
  steps.map((step, index) => ({
    ...step,
    eyebrow: `${index + 1} / ${steps.length}`,
  }));

const cloneSkillCreatorSteps = () =>
  withSkillCreatorEyebrows([rootSkillCreatorStep]).map((step) => ({
    ...step,
    options: step.options.map((option) => ({ ...option })),
  }));

const normalizeGeneratedSkillCreatorSteps = (steps: GeneratedSkillCreatorStep[]) =>
  steps.map((step) => ({
    field: step.field,
    title: step.title,
    eyebrow: '',
    options: step.options.map((option) => ({ ...option })),
    assetSlots: step.assetSlots?.map((slot) => ({ ...slot })),
  }));

const skillCreatorSteps = ref<SkillCreatorStep[]>(cloneSkillCreatorSteps());
const skillCreatorGuideLoading = ref(false);
const skillCreatorGuideLoadingText = ref('');
const skillCreatorGuideError = ref('');
const skillCreatorGuideRequestId = ref(0);
const skillCreatorGuidePlanReady = ref(false);

const initialSkillCreatorSelections = () =>
  Object.fromEntries(
    skillCreatorSteps.value.map((step) => [
      step.field,
      step.options.find((option) => option.recommended)?.id ?? step.options[0]?.id ?? '',
    ])
  ) as Record<SkillCreatorField, string>;

const initialCustomSkillCreatorInputs = () =>
  Object.fromEntries(skillCreatorSteps.value.map((step) => [step.field, ''])) as Record<SkillCreatorField, string>;

const skillCreatorSelections = ref<Record<SkillCreatorField, string>>(initialSkillCreatorSelections());
const customSkillCreatorInputs = ref<Record<SkillCreatorField, string>>(initialCustomSkillCreatorInputs());

const getCustomSkillCreatorInput = (field: SkillCreatorField): string =>
  customSkillCreatorInputs.value[field] ?? '';

type SkillSlashMatch = {
  query: string;
  range: Range;
};

type TemplateShortcutMatch = SkillSlashMatch;

type ComposerDeliveryFormat = 'DOCX' | 'XLSX' | 'PDF';

type ComposerDeliveryItem = {
  id: string;
  title: string;
  format: ComposerDeliveryFormat;
};

watch(
  () => props.modelValue,
  (value) => {
    if (value !== undefined && value === lastEmittedModelValue.value) {
      return;
    }

    if (value !== undefined && value !== inputValue.value) {
      inputValue.value = value;
      renderEditorPlainText(value);
    }
  },
  { immediate: true }
);

watch(inputValue, (value) => {
  lastEmittedModelValue.value = value;
  emit('update:modelValue', value);
});

watch(
  isSkillCreatorCreationActive,
  (active) => {
    emit('skill-guide-active-change', active);
  },
  { immediate: true }
);

// Dialog role selector
const selectedRole = ref('research');
const dialogRoles = [
  { id: 'consult', label: '咨询模式', icon: MessageCircle },
  { id: 'research', label: '研究模式', icon: BookOpen },
];

const selectRole = (roleId: string) => {
  selectedRole.value = roleId;
  if (roleId !== 'research') {
    showSkillMenu.value = false;
    showSkillCreatorGuide.value = false;
    showSkillCreatorForm.value = false;
    showTemplateMenu.value = false;
    showInlineSkillMenu.value = false;
    showInlineTemplateMenu.value = false;
  }
};

const isResearchMode = computed(() => selectedRole.value === 'research');

const placeholderText = () => {
  return isResearchMode.value
    ? '想了解什么知识，快来问问我！Shift+Enter/Ctrl+Enter换行'
    : '我是你的AI律师，想咨询什么法律问题，快来问问我！Shift+Enter/Ctrl+Enter换行';
};

const selectedThinkingMode = ref('thinking');
const thinkingModes = [
  { id: 'fast', label: '快速', description: '适合简单问题，优先更快响应', icon: Zap },
  { id: 'thinking', label: '思考', description: '适合复杂问题，进行深度推理', icon: Brain },
];

const selectThinkingMode = (modeId: string) => {
  selectedThinkingMode.value = modeId;
};

// Multi-select mode: users can enable multiple search modes
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));

const searchModes = [
  { id: 'legal', label: '法律搜索', icon: Scale },
  { id: 'web', label: '联网搜索', icon: Globe },
  { id: 'academic', label: '学术搜索', icon: GraduationCap },
  { id: 'knowledge', label: '知识库搜索', icon: KnowledgeSearchIcon },
];

const toggleSearchMode = (modeId: string) => {
  if (enabledSearchModes.value.has(modeId)) {
    enabledSearchModes.value.delete(modeId);
  } else {
    enabledSearchModes.value.add(modeId);
  }
};

const isEnabled = (modeId: string) => {
  return enabledSearchModes.value.has(modeId);
};

const hasComposerContent = computed(() =>
  inputValue.value.trim().length > 0 || skillTokenCount.value > 0 || templateTokenCount.value > 0
);

const hasSkillCreatorCommand = computed(() =>
  hasSkillCreatorToken.value || /\/skill-creator\b/i.test(inputValue.value)
);
const isSkillCreatorSubmission = computed(() => hasSkillCreatorCommand.value && hasComposerContent.value);

const selectedComposerSkills = computed(() => {
  const seen = new Set<string>();
  return selectedComposerSkillNames.value.reduce<SkillCatalogItem[]>((skills, skillName) => {
    const skill = getSkillByNameOrId(skillName);
    if (!skill || seen.has(skill.id)) return skills;
    seen.add(skill.id);
    skills.push(skill);
    return skills;
  }, []);
});

const activeDeliverySkill = computed(() => selectedComposerSkills.value[0] ?? null);

const selectedComposerDeliveryItems = computed(() =>
  activeDeliverySkill.value ? inferDeliveryItems(activeDeliverySkill.value) : []
);

const getSkillDisplayName = (skillName: string) =>
  getSkillByNameOrId(skillName)?.name || skillName.replace(/^\/+/, '');

const getSkillOwnerLabel = (skillName: string) => {
  const skill = getSkillByNameOrId(skillName);
  if (!skill) return '系统';
  return skill.scope === 'team' ? '团队律师' : '李律师';
};

const getCaseAnalysisDeliveryItems = (): ComposerDeliveryItem[] => [
  { id: 'case-analysis-report', title: '类案分析报告', format: 'DOCX' },
  { id: 'case-source-extract', title: '案例依据摘录', format: 'XLSX' },
  { id: 'case-risk-checklist', title: '风险提示清单', format: 'PDF' },
];

const isCaseAnalysisSkill = (skill: SkillCatalogItem) =>
  /类案|案例|case/.test(
    [skill.name, skill.description, skill.category, ...skill.tags]
      .join(' ')
      .toLowerCase(),
  );

const cleanDeliveryTitle = (value: string) =>
  value
    .replace(/^[\s\-*•\d.、]+/, '')
    .replace(/^(输出|生成|形成|返回)[:：\s]*/, '')
    .replace(/[。；;，,]+$/g, '')
    .trim();

const splitDeliveryPhrase = (value: string) =>
  cleanDeliveryTitle(value)
    .split(/、|，|,|和/)
    .map(cleanDeliveryTitle)
    .filter(Boolean);

const extractSkillOutputTitles = (skill: SkillCatalogItem) => {
  const outputSections = skill.files.flatMap((file) => {
    const matches = Array.from(
      file.content.matchAll(/##\s*(?:输出要求|推荐输出结构)\s*\n+([\s\S]*?)(?=\n##\s|\n#\s|$)/g),
    );
    return matches.map((match) => match[1] ?? '');
  });

  const lines = outputSections.flatMap((section) =>
    section
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('|'))
      .flatMap((line) => {
        const bullet = line.match(/^[-*]\s+(.+)$/);
        return splitDeliveryPhrase(bullet?.[1] ?? line);
      })
  );

  return Array.from(new Set(lines)).slice(0, 3);
};

const inferDeliveryFormat = (title: string, index: number): ComposerDeliveryFormat => {
  if (/表|矩阵|清单|台账|字段|摘录|excel|xlsx|csv/i.test(title)) return 'XLSX';
  if (/提示|意见|审批|复核|pdf/i.test(title) && index > 0) return 'PDF';
  if (index === 1) return 'XLSX';
  if (index === 2) return 'PDF';
  return 'DOCX';
};

function inferDeliveryItems(skill: SkillCatalogItem): ComposerDeliveryItem[] {
  if (isCaseAnalysisSkill(skill)) return getCaseAnalysisDeliveryItems();

  const titles = extractSkillOutputTitles(skill);
  const fallbackTitles = titles.length ? titles : [`${skill.name}成果`];

  return fallbackTitles.slice(0, 3).map((title, index) => ({
    id: `${skill.id}-delivery-${index}`,
    title,
    format: inferDeliveryFormat(title, index),
  }));
}

const createSkillUsagePromptSuffix = (skillName: string) => {
  const skill = getSkillByNameOrId(skillName);
  if (skill && isCaseAnalysisSkill(skill)) {
    return ' 生成类案分析报告，重点说明裁判规则和适用风险。';
  }

  const deliveryTitle = skill ? inferDeliveryItems(skill)[0]?.title : '';
  return ` 生成${deliveryTitle || '专业成果'}，重点说明核心结论、依据和适用风险。`;
};

const activeSkillCreatorStep = computed(() =>
  skillCreatorSteps.value[skillCreatorGuideStep.value] ?? skillCreatorSteps.value[0]!
);

const isActiveSkillCreatorStepLoading = computed(() => skillCreatorGuideLoading.value);
const isRootSkillCreatorStage = computed(() =>
  activeSkillCreatorStep.value.field === 'root-need' && !skillCreatorGuidePlanReady.value
);
const followupSkillCreatorSteps = computed(() => skillCreatorSteps.value.slice(1));
const followupSkillCreatorStepCount = computed(() => followupSkillCreatorSteps.value.length);
const followupSkillCreatorStepIndex = computed(() => Math.max(0, skillCreatorGuideStep.value - 1));
const shouldShowSkillCreatorNavigation = computed(() =>
  !isActiveSkillCreatorStepLoading.value && skillCreatorGuidePlanReady.value && followupSkillCreatorStepCount.value > 0
);
const shouldShowSkillCreatorProgress = computed(() => shouldShowSkillCreatorNavigation.value);
const activeSkillCreatorAssetSlots = computed(() =>
  activeSkillCreatorStep.value.assetSlots?.filter((slot) => slot.optional !== false) ?? []
);

const getSkillCreatorAssetsForSlot = (slot: SkillCreatorAssetSlot) =>
  skillCreatorReferenceAssets.value.filter((asset) =>
    asset.stepField === activeSkillCreatorStep.value.field && asset.slotId === slot.id
  );

const removeSkillCreatorReferenceAsset = (asset: SkillCreatorReferenceAsset) => {
  skillCreatorReferenceAssets.value = skillCreatorReferenceAssets.value.filter((item) => item !== asset);
};

type UploadActionId = 'image' | 'file' | 'folder' | 'knowledge';

const uploadActions: Array<{ id: UploadActionId; label: string; icon: typeof Image }> = [
  { id: 'image', label: '上传图片', icon: Image },
  { id: 'file', label: '上传文件', icon: File },
  { id: 'folder', label: '上传文件夹', icon: FolderOpen },
  { id: 'knowledge', label: '从知识库选择', icon: BookOpen },
];

const knowledgeDraftAssets = [
  {
    id: 'team-compliance-checklist',
    name: '团队合规审查底稿清单.docx',
    meta: '团队知识库 / 最近更新',
  },
  {
    id: 'contract-risk-matrix',
    name: '合同风险矩阵样表.xlsx',
    meta: '团队知识库 / 常用底稿',
  },
  {
    id: 'litigation-evidence-index',
    name: '诉讼证据目录模板.docx',
    meta: '个人知识库 / 文书材料',
  },
  {
    id: 'regulatory-response-pack',
    name: '监管问询回复底稿包',
    meta: '小组知识库 / 合规项目',
  },
];

const selectedKnowledgeDraftIds = ref<string[]>([]);
const selectedKnowledgeDraftAssets = computed(() =>
  knowledgeDraftAssets.filter((asset) => selectedKnowledgeDraftIds.value.includes(asset.id))
);
const skillCreatorReferenceAssets = ref<SkillCreatorReferenceAsset[]>([]);
const activeSkillCreatorAssetTarget = ref<SkillCreatorAssetTarget>(null);
const fixedSkillCreatorName = ref('');
const fixedSkillCreatorDescription = ref('');
const fixedSkillCreatorTemplates = ref<SkillCreatorReferenceAsset[]>([]);
const fixedSkillCreatorFiles = ref<SkillCreatorReferenceAsset[]>([]);
const isFixedSkillCreatorTemplatePicker = ref(false);
const isFixedSkillCreatorFilePicker = ref(false);
const isFixedSkillCreatorLocalFilePicker = ref(false);
const isFixedSkillCreatorFormReady = computed(() =>
  fixedSkillCreatorName.value.trim().length > 0
);
const knowledgeDraftPickerTitle = computed(() =>
  isFixedSkillCreatorFilePicker.value ? '选择关联知识库' : '从知识库选择底稿'
);
const knowledgeDraftPickerKicker = computed(() =>
  isFixedSkillCreatorFilePicker.value ? '关联知识库' : '底稿来源'
);
const knowledgeDraftPickerConfirmText = computed(() =>
  isFixedSkillCreatorFilePicker.value ? '添加到关联知识库' : '添加到底稿'
);

const makeAssetId = (prefix: string, value: string) =>
  `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42) || Date.now().toString(36)}`;

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return '本地文件';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

const createLocalFileAsset = (file: File, target = activeSkillCreatorAssetTarget.value): SkillCreatorReferenceAsset => ({
  id: `${makeAssetId('local', file.name)}-${file.lastModified || Date.now()}`,
  kind: 'local-file',
  name: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  sourceLabel: formatFileSize(file.size),
  stepField: target?.stepField,
  slotId: target?.slotId,
});

const createKnowledgeFileAsset = (
  asset: (typeof knowledgeDraftAssets)[number],
  target = activeSkillCreatorAssetTarget.value,
): SkillCreatorReferenceAsset => ({
  id: makeAssetId('knowledge', asset.id),
  kind: 'knowledge-file',
  name: asset.name,
  sourceLabel: asset.meta,
  stepField: target?.stepField,
  slotId: target?.slotId,
});

const createTemplateReferenceAsset = (
  template: TemplateAsset,
  target = activeSkillCreatorAssetTarget.value,
): SkillCreatorReferenceAsset => ({
  id: makeAssetId('template', template.id),
  kind: 'template',
  name: template.name,
  sourceLabel: template.source,
  stepField: target?.stepField,
  slotId: target?.slotId,
  templateId: template.id,
});

const addSkillCreatorReferenceAssets = (assets: SkillCreatorReferenceAsset[]) => {
  if (!assets.length) return;
  const existingKeys = new Set(
    skillCreatorReferenceAssets.value.map((asset) => `${asset.kind}:${asset.id}:${asset.stepField ?? ''}:${asset.slotId ?? ''}`)
  );
  const nextAssets = assets.filter((asset) => {
    const key = `${asset.kind}:${asset.id}:${asset.stepField ?? ''}:${asset.slotId ?? ''}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });
  if (!nextAssets.length) return;
  skillCreatorReferenceAssets.value = [...skillCreatorReferenceAssets.value, ...nextAssets];
};

const mergeFixedSkillCreatorAssets = (
  currentAssets: SkillCreatorReferenceAsset[],
  nextAssets: SkillCreatorReferenceAsset[],
) => {
  const existingKeys = new Set(currentAssets.map((asset) => `${asset.kind}:${asset.id}`));
  return [
    ...currentAssets,
    ...nextAssets.filter((asset) => {
      const key = `${asset.kind}:${asset.id}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    }),
  ];
};

const addFixedSkillCreatorTemplates = (assets: SkillCreatorReferenceAsset[]) => {
  fixedSkillCreatorTemplates.value = mergeFixedSkillCreatorAssets(
    fixedSkillCreatorTemplates.value,
    assets.filter((asset) => asset.kind === 'template'),
  );
};

const addFixedSkillCreatorFiles = (assets: SkillCreatorReferenceAsset[]) => {
  fixedSkillCreatorFiles.value = mergeFixedSkillCreatorAssets(
    fixedSkillCreatorFiles.value,
    assets.filter((asset) => asset.kind !== 'template'),
  );
};

const removeFixedSkillCreatorTemplate = (asset: SkillCreatorReferenceAsset) => {
  fixedSkillCreatorTemplates.value = fixedSkillCreatorTemplates.value.filter((item) => item !== asset);
};

const removeFixedSkillCreatorFile = (asset: SkillCreatorReferenceAsset) => {
  fixedSkillCreatorFiles.value = fixedSkillCreatorFiles.value.filter((item) => item !== asset);
};

const toggleActionMenu = () => {
  showActionMenu.value = !showActionMenu.value;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const toggleDraftMenu = () => {
  showDraftMenu.value = !showDraftMenu.value;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const toggleSkillMenu = () => {
  showSkillMenu.value = !showSkillMenu.value;
  if (!showSkillMenu.value) {
    showSkillCreatorGuide.value = false;
  }
  showSkillCreatorForm.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const toggleTemplateMenu = () => {
  showTemplateMenu.value = !showTemplateMenu.value;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const triggerUploadAction = (actionId: UploadActionId) => {
  showActionMenu.value = false;
  showDraftMenu.value = false;

  if (actionId === 'knowledge') {
    showKnowledgeDraftPicker.value = true;
    return;
  }

  const inputMap: Record<Exclude<UploadActionId, 'knowledge'>, HTMLInputElement | null> = {
    image: imageInputRef.value,
    file: fileInputRef.value,
    folder: folderInputRef.value,
  };

  inputMap[actionId]?.click();
};

const closeKnowledgeDraftPicker = () => {
  showKnowledgeDraftPicker.value = false;
  selectedKnowledgeDraftIds.value = [];
  activeSkillCreatorAssetTarget.value = null;
  isFixedSkillCreatorFilePicker.value = false;
};

const toggleKnowledgeDraftAsset = (assetId: string) => {
  selectedKnowledgeDraftIds.value = selectedKnowledgeDraftIds.value.includes(assetId)
    ? selectedKnowledgeDraftIds.value.filter((id) => id !== assetId)
    : [...selectedKnowledgeDraftIds.value, assetId];
};

const confirmKnowledgeDraftSelection = () => {
  if (selectedKnowledgeDraftAssets.value.length === 0) return;

  const selectedAssets = selectedKnowledgeDraftAssets.value.map((asset) =>
    createKnowledgeFileAsset(asset, activeSkillCreatorAssetTarget.value)
  );
  showKnowledgeDraftPicker.value = false;
  selectedKnowledgeDraftIds.value = [];

  if (isFixedSkillCreatorFilePicker.value) {
    addFixedSkillCreatorFiles(selectedAssets.map((asset) => ({
      ...asset,
      stepField: undefined,
      slotId: undefined,
    })));
    isFixedSkillCreatorFilePicker.value = false;
    return;
  }

  if (activeSkillCreatorAssetTarget.value) {
    addSkillCreatorReferenceAssets(selectedAssets);
    activeSkillCreatorAssetTarget.value = null;
    return;
  }

  nextTick(() => {
    insertReferenceAssetTokens(selectedAssets);
  });
};

const handleLocalFileSelection = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;

  const files = Array.from(input.files ?? []);
  const selectedAssets = files.slice(0, 12).map((file) =>
    createLocalFileAsset(file, activeSkillCreatorAssetTarget.value)
  );

  if (isFixedSkillCreatorLocalFilePicker.value) {
    addFixedSkillCreatorFiles(selectedAssets.map((asset) => ({
      ...asset,
      stepField: undefined,
      slotId: undefined,
    })));
    isFixedSkillCreatorLocalFilePicker.value = false;
    input.value = '';
    return;
  }

  if (activeSkillCreatorAssetTarget.value) {
    addSkillCreatorReferenceAssets(selectedAssets);
    activeSkillCreatorAssetTarget.value = null;
  } else if (selectedAssets.length) {
    nextTick(() => {
      insertReferenceAssetTokens(selectedAssets);
    });
  }

  input.value = '';
};

function renderEditorPlainText(value: string) {
  nextTick(() => {
    const editor = editorRef.value;
    if (!editor || document.activeElement === editor) return;

    editor.textContent = value;
    syncEditorState();
  });
}

const serializeEditorNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';

  if (node instanceof HTMLElement) {
    if (node.matches('.skill-inline-code')) {
      const skillName = node.dataset.skillName?.trim();
      return skillName ? `/${skillName}` : '';
    }

    if (node.matches('.asset-inline-code')) {
      return node.dataset.assetName ?? node.textContent ?? '';
    }
  }

  return Array.from(node.childNodes).map(serializeEditorNode).join('');
};

const getEditorText = () => {
  const editor = editorRef.value;
  return (editor ? serializeEditorNode(editor) : '').replace(/\u200b/g, '');
};

const syncEditorState = () => {
  const editor = editorRef.value;
  if (!editor) return;

  const skillTokens = Array.from(editor.querySelectorAll<HTMLElement>('.skill-inline-code'));
  skillTokenCount.value = skillTokens.length;
  hasSkillCreatorToken.value = Boolean(editor.querySelector('.skill-inline-code[data-skill-name="skill-creator"]'));
  selectedComposerSkillNames.value = skillTokens
    .map((token) => token.dataset.skillName?.trim() ?? '')
    .filter((skillName) => skillName && skillName !== 'skill-creator' && skillName !== 'template-creator');
  templateTokenCount.value = editor.querySelectorAll(
    '.template-inline-code, .asset-inline-code[data-asset-kind="template"]',
  ).length;
  inputValue.value = getEditorText();
};

const getCurrentEditorRange = () => {
  const editor = editorRef.value;
  const selection = window.getSelection();
  if (!editor || !selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;

  return range;
};

const setEditorRange = (range: Range) => {
  const selection = window.getSelection();
  if (!selection) return;

  selection.removeAllRanges();
  selection.addRange(range);
};

const focusEditor = () => {
  const editor = editorRef.value;
  if (!editor) return;

  editor.focus();
  if (getCurrentEditorRange()) return;

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  setEditorRange(range);
};

const clearSelectedSkillToken = () => {
  selectedSkillToken.value?.classList.remove('selected');
  selectedSkillToken.value = null;
};

const selectSkillToken = (token: HTMLElement) => {
  clearSelectedSkillToken();
  selectedSkillToken.value = token;
  token.classList.add('selected');
  token.focus();
};

const createSkillToken = (skillName: string) => {
  const displayName = getSkillDisplayName(skillName);
  const ownerLabel = getSkillOwnerLabel(skillName);
  const token = document.createElement('code');
  token.className = 'skill-inline-code';
  token.contentEditable = 'false';
  token.tabIndex = 0;
  token.dataset.skillName = skillName;
  token.dataset.skillDisplayName = displayName;
  token.dataset.skillOwner = ownerLabel;
  token.setAttribute('aria-label', `已选技能 ${ownerLabel} ${displayName}`);

  const avatar = document.createElement('span');
  avatar.className = 'skill-inline-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = ownerLabel.slice(0, 1).toUpperCase();

  const owner = document.createElement('span');
  owner.className = 'skill-inline-owner';
  owner.textContent = ownerLabel;

  const divider = document.createElement('span');
  divider.className = 'skill-inline-divider';
  divider.setAttribute('aria-hidden', 'true');
  divider.textContent = '丨';

  const name = document.createElement('span');
  name.className = 'skill-inline-name';
  name.textContent = displayName;

  token.append(avatar, owner, divider, name);
  return token;
};

const createTemplateToken = (template: TemplateAsset) => {
  const token = createReferenceAssetToken(createTemplateReferenceAsset(template, null));
  token.dataset.templateId = template.id;
  token.setAttribute('aria-label', `已选格式模板 ${template.name}`);
  return token;
};

const assetBadgeLabel = (kind: SkillCreatorReferenceAssetKind) => {
  if (kind === 'template') return '模';
  if (kind === 'knowledge-file') return '库';
  return '稿';
};

const createReferenceAssetToken = (asset: SkillCreatorReferenceAsset) => {
  const token = document.createElement('code');
  token.className = 'asset-inline-code';
  token.contentEditable = 'false';
  token.tabIndex = 0;
  token.dataset.assetKind = asset.kind;
  token.dataset.assetName = asset.name;
  token.dataset.badge = assetBadgeLabel(asset.kind);
  token.title = asset.name;
  token.setAttribute('aria-label', asset.name);

  const name = document.createElement('span');
  name.className = 'asset-inline-name';
  name.textContent = asset.name;

  token.append(name);
  return token;
};

const insertReferenceAssetTokens = (assets: SkillCreatorReferenceAsset[], targetRange?: Range | null) => {
  const editor = editorRef.value;
  if (!editor || assets.length === 0) return;

  editor.focus();
  const range = targetRange ?? getCurrentEditorRange() ?? getEditorEndRange();
  if (!range) return;

  range.deleteContents();
  assets.forEach((asset) => {
    const token = createReferenceAssetToken(asset);
    range.insertNode(token);
    range.setStartAfter(token);
    range.collapse(true);

    const spacer = document.createTextNode(' ');
    range.insertNode(spacer);
    range.setStartAfter(spacer);
    range.collapse(true);
  });

  setEditorRange(range);
  clearSelectedSkillToken();
  syncEditorState();
};

const placeCaretAfter = (node: Node) => {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  setEditorRange(range);
};

const placeCaretInTextNode = (node: Node, edge: 'start' | 'end') => {
  if (node.nodeType !== Node.TEXT_NODE) return false;

  const range = document.createRange();
  const offset = edge === 'end' ? (node.textContent?.length ?? 0) : 0;
  range.setStart(node, offset);
  range.collapse(true);
  setEditorRange(range);
  return true;
};

const getEditorEndRange = () => {
  const editor = editorRef.value;
  if (!editor) return null;

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
};

const normalizeTextBoundaryCaret = (edgePreference: 'previous' | 'next' = 'previous') => {
  const editor = editorRef.value;
  const range = getCurrentEditorRange();
  if (!editor || !range || !range.collapsed || range.startContainer.nodeType === Node.TEXT_NODE) {
    return false;
  }

  const container = range.startContainer;
  if (!editor.contains(container) || !('childNodes' in container)) return false;

  const previous = container.childNodes[range.startOffset - 1] ?? null;
  const next = container.childNodes[range.startOffset] ?? null;
  const preferredNode = edgePreference === 'next' ? next : previous;
  const fallbackNode = edgePreference === 'next' ? previous : next;

  return Boolean(
    (preferredNode && placeCaretInTextNode(preferredNode, edgePreference === 'next' ? 'start' : 'end')) ||
    (fallbackNode && placeCaretInTextNode(fallbackNode, edgePreference === 'next' ? 'end' : 'start'))
  );
};

const insertSkillToken = (skillName: string, targetRange?: Range | null) => {
  const editor = editorRef.value;
  if (!editor) return;

  editor.focus();

  const range = targetRange ?? activeSkillRange.value ?? getCurrentEditorRange() ?? getEditorEndRange();
  if (!range) return;

  range.deleteContents();
  const token = createSkillToken(skillName);
  range.insertNode(token);
  placeCaretAfter(token);
  clearSelectedSkillToken();

  showSkillMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  syncEditorState();
};

const insertPlainTextAtCaret = (text: string) => {
  const editor = editorRef.value;
  if (!editor) return;

  editor.focus();
  const range = getCurrentEditorRange() ?? getEditorEndRange();
  if (!range) return;

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  placeCaretInTextNode(textNode, 'end');
  syncEditorState();
};

const insertTemplateToken = (template: TemplateAsset, targetRange?: Range | null) => {
  const editor = editorRef.value;
  if (!editor) return;

  editor.focus();

  const range = targetRange ?? activeTemplateRange.value ?? getCurrentEditorRange() ?? getEditorEndRange();
  if (!range) return;

  range.deleteContents();
  const token = createTemplateToken(template);
  range.insertNode(token);
  placeCaretAfter(token);
  clearSelectedSkillToken();

  showTemplateMenu.value = false;
  showInlineTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  syncEditorState();
};

const insertSkillPrompt = (skillName: string) => {
  insertPlainTextAtCaret(skillName === 'skill-creator' ? selectedAssetPromptPrefix : '使用 ');
  insertSkillToken(skillName);
  insertPlainTextAtCaret(skillName === 'skill-creator' ? skillCreatorPromptSuffix : createSkillUsagePromptSuffix(skillName));
};

const insertTemplatePrompt = (template: TemplateAsset) => {
  insertPlainTextAtCaret(selectedAssetPromptPrefix);
  insertTemplateToken(template);
  insertPlainTextAtCaret(templatePromptSuffix);
};

const getTextPositionAtOffset = (root: Node, targetOffset: number) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  let remainingOffset = targetOffset;

  while (current) {
    const textLength = current.textContent?.length ?? 0;
    if (remainingOffset <= textLength) {
      return { node: current, offset: remainingOffset };
    }
    remainingOffset -= textLength;
    current = walker.nextNode();
  }

  return null;
};

const getActiveSkillMatch = (): SkillSlashMatch | null => {
  const editor = editorRef.value;
  const range = getCurrentEditorRange();
  if (!editor || !range || !range.collapsed) return null;

  if (range.startContainer instanceof HTMLElement && range.startContainer.closest(inlineTokenSelector)) {
    return null;
  }

  const parentElement = range.startContainer.parentElement;
  if (parentElement?.closest(inlineTokenSelector)) return null;

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(editor);
  try {
    beforeRange.setEnd(range.startContainer, range.startOffset);
  } catch {
    return null;
  }
  const beforeCaret = beforeRange.toString();
  const match = beforeCaret.match(/(?:^|[\s\n])\/([A-Za-z0-9_-]*)$/);
  if (!match) return null;

  const query = match[1] ?? '';
  const startTextOffset = beforeCaret.length - query.length - 1;
  const startPosition = getTextPositionAtOffset(editor, startTextOffset);
  if (!startPosition) return null;

  const skillRange = document.createRange();
  skillRange.setStart(startPosition.node, startPosition.offset);
  skillRange.setEnd(range.startContainer, range.startOffset);

  return { query, range: skillRange };
};

const getActiveTemplateMatch = (): TemplateShortcutMatch | null => {
  const editor = editorRef.value;
  const range = getCurrentEditorRange();
  if (!editor || !range || !range.collapsed) return null;

  if (range.startContainer instanceof HTMLElement && range.startContainer.closest(inlineTokenSelector)) {
    return null;
  }

  const parentElement = range.startContainer.parentElement;
  if (parentElement?.closest(inlineTokenSelector)) return null;

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(editor);
  try {
    beforeRange.setEnd(range.startContainer, range.startOffset);
  } catch {
    return null;
  }
  const beforeCaret = beforeRange.toString();
  const match = beforeCaret.match(/(?:^|[\s\n])#([^\s#/]+)?$/u);
  if (!match) return null;

  const query = match[1] ?? '';
  const startTextOffset = beforeCaret.length - query.length - 1;
  const startPosition = getTextPositionAtOffset(editor, startTextOffset);
  if (!startPosition) return null;

  const templateRange = document.createRange();
  templateRange.setStart(startPosition.node, startPosition.offset);
  templateRange.setEnd(range.startContainer, range.startOffset);

  return { query, range: templateRange };
};

const findTemplateByShortcutQuery = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  return defaultTemplateAssets.find((template) =>
    template.name.toLowerCase() === normalizedQuery || template.id.toLowerCase() === normalizedQuery
  ) ?? null;
};

const updateInlineShortcutMenuPosition = (range: Range) => {
  const container = inputContainerRef.value;
  const editor = editorRef.value;
  if (!container) return;

  const caretRange = range.cloneRange();
  caretRange.collapse(false);

  const caretRect = caretRange.getClientRects()[0] ?? caretRange.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const editorRect = editor?.getBoundingClientRect();
  const dropdownWidth = 300;
  const left = caretRect.width || caretRect.height
    ? caretRect.left - containerRect.left
    : (editorRect?.left ?? containerRect.left) - containerRect.left;
  const top = caretRect.width || caretRect.height
    ? caretRect.bottom - containerRect.top + 8
    : (editorRect?.top ?? containerRect.top) - containerRect.top + 32;

  inlineShortcutMenuPosition.value = {
    left: Math.max(8, Math.min(left, container.clientWidth - dropdownWidth - 8)),
    top,
  };
};

const updateInlineSkillMenu = () => {
  const match = getActiveSkillMatch();
  if (!match) {
    showInlineSkillMenu.value = false;
    activeSkillRange.value = null;
    inlineSkillQuery.value = '';
    return false;
  }

  activeSkillRange.value = match.range.cloneRange();
  inlineSkillQuery.value = match.query;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeTemplateRange.value = null;
  showInlineSkillMenu.value = true;
  updateInlineShortcutMenuPosition(match.range);
  return true;
};

const updateInlineTemplateMenu = () => {
  const match = getActiveTemplateMatch();
  if (!match) {
    showInlineTemplateMenu.value = false;
    activeTemplateRange.value = null;
    inlineTemplateQuery.value = '';
    return false;
  }

  activeTemplateRange.value = match.range.cloneRange();
  inlineTemplateQuery.value = match.query;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showKnowledgeDraftPicker.value = false;
  activeSkillRange.value = null;
  inlineSkillQuery.value = '';
  showInlineTemplateMenu.value = true;
  updateInlineShortcutMenuPosition(match.range);
  return true;
};

const updateInlineShortcutMenus = () => {
  updateInlineSkillMenu();
};

const transformCompletedShortcutAtCaret = () => {
  const skillMatch = getActiveSkillMatch();
  if (skillMatch && isRegisteredSkillName(skillMatch.query)) {
    insertSkillToken(skillMatch.query, skillMatch.range);
    return true;
  }

  return false;
};

const isInlineTokenNode = (node: Node | null): HTMLElement | null => {
  if (!(node instanceof HTMLElement)) return null;
  return node.matches(inlineTokenSelector)
    ? node
    : null;
};

const deepestChild = (node: Node, direction: 'previous' | 'next') => {
  let current = node;
  while (direction === 'previous' ? current.lastChild : current.firstChild) {
    current = direction === 'previous' ? current.lastChild as Node : current.firstChild as Node;
  }
  return current;
};

const previousNode = (node: Node) => {
  const editor = editorRef.value;
  let current: Node | null = node;

  while (current && current !== editor) {
    if (current.previousSibling) return deepestChild(current.previousSibling, 'previous');
    current = current.parentNode;
  }

  return null;
};

const nextNode = (node: Node) => {
  const editor = editorRef.value;
  let current: Node | null = node;

  while (current && current !== editor) {
    if (current.nextSibling) return deepestChild(current.nextSibling, 'next');
    current = current.parentNode;
  }

  return null;
};

const findAdjacentSkillToken = (key: 'Backspace' | 'Delete') => {
  const editor = editorRef.value;
  const range = getCurrentEditorRange();
  if (!editor || !range || !range.collapsed) return null;

  const container = range.startContainer;
  let candidate: Node | null = null;

  if (container === editor) {
    const childIndex = key === 'Backspace' ? range.startOffset - 1 : range.startOffset;
    candidate = editor.childNodes[childIndex] ?? null;
  } else if (container.nodeType === Node.TEXT_NODE) {
    const textLength = container.textContent?.length ?? 0;
    if (key === 'Backspace' && range.startOffset === 0) {
      candidate = previousNode(container);
    }
    if (key === 'Delete' && range.startOffset === textLength) {
      candidate = nextNode(container);
    }
  } else {
    candidate = isInlineTokenNode(container) ?? null;
  }

  while (candidate?.nodeType === Node.TEXT_NODE && (candidate.textContent ?? '').replace(/\u200b/g, '') === '') {
    candidate = key === 'Backspace' ? previousNode(candidate) : nextNode(candidate);
  }

  return isInlineTokenNode(candidate);
};

const removeSkillToken = (token: HTMLElement, caretPreference: 'previous' | 'next' = 'previous') => {
  const editor = editorRef.value;
  if (!editor) return;

  const previous = previousNode(token);
  const next = nextNode(token);
  token.remove();
  clearSelectedSkillToken();

  const preferredNode = caretPreference === 'next' ? next : previous;
  const fallbackNode = caretPreference === 'next' ? previous : next;

  if (
    (preferredNode && placeCaretInTextNode(preferredNode, caretPreference === 'next' ? 'start' : 'end')) ||
    (fallbackNode && placeCaretInTextNode(fallbackNode, caretPreference === 'next' ? 'end' : 'start'))
  ) {
    syncEditorState();
    updateInlineShortcutMenus();
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  setEditorRange(range);
  syncEditorState();
  updateInlineShortcutMenus();
};

const handleEditorClick = (event: MouseEvent) => {
  const target = event.target;
  if (target instanceof HTMLElement) {
    closeDropdown();

    const token = target.closest(inlineTokenSelector);
    if (token instanceof HTMLElement) {
      selectSkillToken(token);
      showInlineSkillMenu.value = false;
      showInlineTemplateMenu.value = false;
      activeSkillRange.value = null;
      activeTemplateRange.value = null;
      syncEditorState();
      return;
    }
  } else {
    closeDropdown();
  }

  clearSelectedSkillToken();
  handleEditorInteraction();
};

const handleEditorInput = () => {
  clearSelectedSkillToken();
  normalizeTextBoundaryCaret();
  if (transformCompletedShortcutAtCaret()) return;

  syncEditorState();
  updateInlineShortcutMenus();
};

const handleEditorInteraction = () => {
  syncEditorState();
  updateInlineShortcutMenus();
};

const handleEditorKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showSkillCreatorGuide.value = false;
    showSkillCreatorForm.value = false;
    showSkillMenu.value = false;
    showInlineSkillMenu.value = false;
    showInlineTemplateMenu.value = false;
    activeSkillRange.value = null;
    activeTemplateRange.value = null;
    inlineSkillQuery.value = '';
    inlineTemplateQuery.value = '';
    clearSelectedSkillToken();
    return;
  }

  if (event.key !== 'Backspace' && event.key !== 'Delete') return;

  if (selectedSkillToken.value) {
    event.preventDefault();
    removeSkillToken(selectedSkillToken.value);
    return;
  }

  const token = findAdjacentSkillToken(event.key);
  if (!token) {
    normalizeTextBoundaryCaret(event.key === 'Delete' ? 'next' : 'previous');
    return;
  }

  event.preventDefault();
  removeSkillToken(token, event.key === 'Delete' ? 'next' : 'previous');
};

const resetSkillCreatorGuide = () => {
  skillCreatorSteps.value = cloneSkillCreatorSteps();
  skillCreatorGuideStep.value = 0;
  skillCreatorSelections.value = initialSkillCreatorSelections();
  customSkillCreatorInputs.value = initialCustomSkillCreatorInputs();
  skillCreatorReferenceAssets.value = [];
  activeSkillCreatorAssetTarget.value = null;
  skillCreatorGuideError.value = '';
  skillCreatorGuideLoading.value = false;
  skillCreatorGuideLoadingText.value = '';
  skillCreatorGuidePlanReady.value = false;
};

const getSkillCreatorGuideTextContext = () =>
  getEditorText()
    .replace(/\/skill-creator/g, '')
    .replace(skillCreatorPromptSuffix, '')
    .trim();

const setSkillCreatorSteps = (
  steps: SkillCreatorStep[],
  previousSelections = skillCreatorSelections.value,
  previousCustomInputs = customSkillCreatorInputs.value,
) => {
  const nextSteps = withSkillCreatorEyebrows(steps).map((step) => ({
    ...step,
    options: step.options.map((option) => ({ ...option })),
  }));

  skillCreatorSteps.value = nextSteps;
  skillCreatorSelections.value = Object.fromEntries(
    nextSteps.map((step) => {
      const previousSelection = previousSelections[step.field];
      if (previousSelection === 'custom') return [step.field, 'custom'];
      if (step.options.some((option) => option.id === previousSelection)) {
        return [step.field, previousSelection];
      }

      return [
        step.field,
        step.options.find((option) => option.recommended)?.id ?? step.options[0]?.id ?? '',
      ];
    })
  ) as Record<SkillCreatorField, string>;
  customSkillCreatorInputs.value = Object.fromEntries(
    nextSteps.map((step) => [step.field, previousCustomInputs[step.field] ?? ''])
  ) as Record<SkillCreatorField, string>;
};

const loadRootSkillCreatorOptions = async () => {
  const currentText = getSkillCreatorGuideTextContext();
  if (!currentText) return;
  const requestId = skillCreatorGuideRequestId.value + 1;
  skillCreatorGuideRequestId.value = requestId;
  skillCreatorGuideLoading.value = true;
  skillCreatorGuideLoadingText.value = '正在整理适合你的技能方向，请稍候';
  skillCreatorGuideError.value = '';
  setSkillCreatorSteps([{ ...rootSkillCreatorStep, options: [] }]);

  try {
    const result = await generateSkillCreatorRootOptions(currentText);

    if (requestId !== skillCreatorGuideRequestId.value || !showSkillCreatorGuide.value) return;

    setSkillCreatorSteps([{ ...rootSkillCreatorStep, options: result.options }]);
    if (result.fallbackUsed && result.error) {
      skillCreatorGuideError.value = result.error;
    }
  } catch (error) {
    if (requestId === skillCreatorGuideRequestId.value) {
      skillCreatorGuideError.value = error instanceof Error
        ? error.message
        : 'DeepSeek 根需求识别失败，已使用常用需求选项。';
      setSkillCreatorSteps([rootSkillCreatorStep]);
    }
  } finally {
    if (requestId === skillCreatorGuideRequestId.value) {
      skillCreatorGuideLoading.value = false;
      skillCreatorGuideLoadingText.value = '';
    }
  }
};

const buildSkillCreatorQuestionPlan = async () => {
  const rootStep = skillCreatorSteps.value[0];
  if (!rootStep) return;

  const requestId = skillCreatorGuideRequestId.value + 1;
  skillCreatorGuideRequestId.value = requestId;
  skillCreatorGuideLoading.value = true;
  skillCreatorGuideLoadingText.value = '正在整理更贴合的后续引导，请稍等片刻';
  skillCreatorGuideError.value = '';

  try {
    const result = await generateSkillCreatorQuestionPlan({
      currentText: getSkillCreatorGuideTextContext(),
      rootNeed: selectedSkillCreatorChoice(rootStep),
    });

    if (requestId !== skillCreatorGuideRequestId.value || !showSkillCreatorGuide.value) return;

    const generatedSteps = normalizeGeneratedSkillCreatorSteps(result.steps);
    const nextSteps = [rootStep, ...generatedSteps].slice(0, 5);
    setSkillCreatorSteps(nextSteps);
    skillCreatorGuidePlanReady.value = true;
    skillCreatorGuideStep.value = Math.min(1, skillCreatorSteps.value.length - 1);

    if (result.fallbackUsed && result.error) {
      skillCreatorGuideError.value = result.error;
    }
  } catch (error) {
    if (requestId !== skillCreatorGuideRequestId.value) return;

    setSkillCreatorSteps([rootStep, ...fallbackFollowupSkillCreatorSteps].slice(0, 5));
    skillCreatorGuidePlanReady.value = true;
    skillCreatorGuideStep.value = Math.min(1, skillCreatorSteps.value.length - 1);
    skillCreatorGuideError.value = error instanceof Error
      ? error.message
      : 'DeepSeek 后续问题生成失败，已使用常用问题。';
  } finally {
    if (requestId === skillCreatorGuideRequestId.value) {
      skillCreatorGuideLoading.value = false;
      skillCreatorGuideLoadingText.value = '';
    }
  }
};

const openSkillCreatorGuide = () => {
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorForm.value = false;
  showSkillCreatorGuide.value = true;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  showTemplateManageModal.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineSkillQuery.value = '';
  inlineTemplateQuery.value = '';
  resetSkillCreatorGuide();
  void loadRootSkillCreatorOptions();
};

const resetFixedSkillCreatorForm = () => {
  fixedSkillCreatorName.value = '';
  fixedSkillCreatorDescription.value = '';
  fixedSkillCreatorTemplates.value = [];
  fixedSkillCreatorFiles.value = [];
  isFixedSkillCreatorTemplatePicker.value = false;
  isFixedSkillCreatorFilePicker.value = false;
  isFixedSkillCreatorLocalFilePicker.value = false;
};

const openFixedSkillCreatorForm = (shouldReset = true) => {
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  showTemplateManageModal.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineSkillQuery.value = '';
  inlineTemplateQuery.value = '';
  activeSkillCreatorAssetTarget.value = null;
  if (shouldReset) {
    resetFixedSkillCreatorForm();
  }
  showSkillCreatorForm.value = true;
  nextTick(() => {
    inputContainerRef.value?.querySelector<HTMLInputElement>('.fixed-creator-input')?.focus();
  });
};

const closeFixedSkillCreatorForm = () => {
  showSkillCreatorForm.value = false;
  showKnowledgeDraftPicker.value = false;
  showTemplateManageModal.value = false;
  isFixedSkillCreatorTemplatePicker.value = false;
  isFixedSkillCreatorFilePicker.value = false;
  isFixedSkillCreatorLocalFilePicker.value = false;
};

const closeSkillCreatorGuide = () => {
  showSkillCreatorGuide.value = false;
  activeSkillCreatorAssetTarget.value = null;
};

const openFixedSkillCreatorTemplatePicker = () => {
  isFixedSkillCreatorTemplatePicker.value = true;
  isFixedSkillCreatorFilePicker.value = false;
  activeSkillCreatorAssetTarget.value = null;
  showTemplateManageModal.value = true;
};

const openFixedSkillCreatorFilePicker = () => {
  isFixedSkillCreatorFilePicker.value = true;
  isFixedSkillCreatorTemplatePicker.value = false;
  activeSkillCreatorAssetTarget.value = null;
  selectedKnowledgeDraftIds.value = [];
  showKnowledgeDraftPicker.value = true;
};

const openFixedSkillCreatorLocalFilePicker = () => {
  isFixedSkillCreatorLocalFilePicker.value = true;
  isFixedSkillCreatorFilePicker.value = false;
  activeSkillCreatorAssetTarget.value = null;
  fileInputRef.value?.click();
};

const setSkillCreatorAssetTarget = (slot: SkillCreatorAssetSlot) => {
  activeSkillCreatorAssetTarget.value = {
    stepField: activeSkillCreatorStep.value.field,
    slotId: slot.id,
    slotType: slot.type,
  };
};

const openCreatorLocalAssetPicker = (slot: SkillCreatorAssetSlot) => {
  setSkillCreatorAssetTarget(slot);
  fileInputRef.value?.click();
};

const openCreatorKnowledgeAssetPicker = (slot: SkillCreatorAssetSlot) => {
  setSkillCreatorAssetTarget(slot);
  selectedKnowledgeDraftIds.value = [];
  showKnowledgeDraftPicker.value = true;
};

const openCreatorTemplateAssetPicker = (slot: SkillCreatorAssetSlot) => {
  setSkillCreatorAssetTarget(slot);
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showTemplateManageModal.value = true;
};

const closeTemplateManageModal = () => {
  showTemplateManageModal.value = false;
  activeSkillCreatorAssetTarget.value = null;
  isFixedSkillCreatorTemplatePicker.value = false;
};

const isFinalSkillCreatorStep = () => skillCreatorGuideStep.value === skillCreatorSteps.value.length - 1;

const selectSkillCreatorOption = (field: SkillCreatorField, optionId: string) => {
  skillCreatorSelections.value = {
    ...skillCreatorSelections.value,
    [field]: optionId,
  };

  if (field !== activeSkillCreatorStep.value.field) return;

  if (skillCreatorGuideStep.value === 0 && !skillCreatorGuidePlanReady.value) {
    void buildSkillCreatorQuestionPlan();
    return;
  }

  if (isFinalSkillCreatorStep()) {
    insertGuidedSkillCreatorPrompt();
    return;
  }

  skillCreatorGuideStep.value += 1;
};

const selectedSkillCreatorChoice = (step: SkillCreatorStep) => {
  if (skillCreatorSelections.value[step.field] === 'custom') {
    const customValue = getCustomSkillCreatorInput(step.field).trim();
    if (customValue) {
      return {
        label: customValue,
        description: '用户自行输入的补充需求。',
      };
    }
  }

  return step.options.find((option) => option.id === skillCreatorSelections.value[step.field])
    ?? step.options[0]
    ?? { id: '', label: '等待生成', description: '' };
};

const handleCustomSkillCreatorInput = (field: SkillCreatorField, event: Event) => {
  const value = event.target instanceof HTMLInputElement ? event.target.value : '';
  customSkillCreatorInputs.value = {
    ...customSkillCreatorInputs.value,
    [field]: value,
  };

  if (value.trim()) {
    skillCreatorSelections.value = {
      ...skillCreatorSelections.value,
      [field]: 'custom',
    };
  }
};

const focusCustomSkillCreatorInput = (field: SkillCreatorField) => {
  skillCreatorSelections.value = {
    ...skillCreatorSelections.value,
    [field]: 'custom',
  };
};

const commitCustomSkillCreatorInput = (field: SkillCreatorField) => {
  if (!getCustomSkillCreatorInput(field).trim()) return;

  skillCreatorSelections.value = {
    ...skillCreatorSelections.value,
    [field]: 'custom',
  };

  if (field !== activeSkillCreatorStep.value.field) return;

  if (skillCreatorGuideStep.value === 0 && !skillCreatorGuidePlanReady.value) {
    void buildSkillCreatorQuestionPlan();
    return;
  }

  if (isFinalSkillCreatorStep()) {
    insertGuidedSkillCreatorPrompt();
    return;
  }

  skillCreatorGuideStep.value += 1;
};

const moveSkillCreatorGuideStep = (direction: 'previous' | 'next') => {
  if (direction === 'next' && skillCreatorGuideStep.value === 0 && !skillCreatorGuidePlanReady.value) {
    void buildSkillCreatorQuestionPlan();
    return;
  }

  const minStep = skillCreatorGuidePlanReady.value ? 1 : 0;
  const nextStep = direction === 'next'
    ? Math.min(skillCreatorGuideStep.value + 1, skillCreatorSteps.value.length - 1)
    : Math.max(skillCreatorGuideStep.value - 1, minStep);

  skillCreatorGuideStep.value = nextStep;
};

const createSkillCreatorPromptBody = () => {
  const lines = skillCreatorSteps.value.map((step) => {
    const option = selectedSkillCreatorChoice(step);
    const fieldLabel = step.field === 'root-need'
      ? '根本需求'
      : step.title.replace(/[？?]$/, '');

    return `${fieldLabel}：${option.label}。${option.description}`;
  });

  return [
    ' 帮我创建一个可复用的技能，我的需求如下：',
    lines.join('\n'),
    '请按当前 skill-creator 流程生成并保存技能包，创建过程中展示需求分析、实际生成物清单和每个生成物内容；完成系统校验后返回保存位置、查看入口和使用方式。',
  ].join('\n');
};

const serializeSkillCreatorReferenceAssets = () => {
  if (!skillCreatorReferenceAssets.value.length) return '';

  const drafts = skillCreatorReferenceAssets.value.filter((asset) => asset.kind !== 'template');
  const templates = skillCreatorReferenceAssets.value.filter((asset) => asset.kind === 'template');
  const lines = [];

  if (drafts.length) {
    lines.push(`关联底稿：${drafts.map((asset) => `${asset.name}（${asset.sourceLabel}）`).join('、')}`);
  }
  if (templates.length) {
    lines.push(`关联模板：${templates.map((asset) => `${asset.name}（${asset.sourceLabel}）`).join('、')}`);
  }

  return lines.length ? ` ${lines.join('；')} ` : '';
};

const createSkillCreatorReferenceAssetNodes = () => {
  const assets = skillCreatorReferenceAssets.value;
  if (!assets.length) return [] as Node[];

  const nodes: Node[] = [];
  const appendAssets = (label: string, groupAssets: SkillCreatorReferenceAsset[]) => {
    if (!groupAssets.length) return;
    nodes.push(document.createTextNode(` ${label} `));
    groupAssets.forEach((asset, index) => {
      if (index > 0) nodes.push(document.createTextNode('、'));
      nodes.push(createReferenceAssetToken(asset));
    });
  };

  appendAssets('关联底稿', assets.filter((asset) => asset.kind !== 'template'));
  appendAssets('关联模板', assets.filter((asset) => asset.kind === 'template'));
  nodes.push(document.createTextNode(' '));
  return nodes;
};

const serializeFixedSkillCreatorAssets = (assets: SkillCreatorReferenceAsset[]) =>
  assets.map((asset) => `${asset.name}（${asset.sourceLabel}）`).join('、');

const createFixedSkillCreatorPrompt = () => {
  const lines = [
    `${selectedAssetPromptPrefix}/skill-creator 帮我创建一个可复用的技能，我的需求如下：`,
    `技能名称：${fixedSkillCreatorName.value.trim()}`,
  ];

  const description = fixedSkillCreatorDescription.value.trim();
  if (description) {
    lines.push(`技能简介：${description}`);
  }

  if (fixedSkillCreatorTemplates.value.length) {
    lines.push(`关联模板：${serializeFixedSkillCreatorAssets(fixedSkillCreatorTemplates.value)}`);
  }

  if (fixedSkillCreatorFiles.value.length) {
    lines.push(`关联知识库：${serializeFixedSkillCreatorAssets(fixedSkillCreatorFiles.value)}`);
  }

  lines.push(
    '请使用上述技能名称和技能简介作为技能草稿基础；关联模板仅作为输出结构参考，关联知识库仅作为创建时的知识材料参考。',
  );

  return lines.join('\n');
};

const submitFixedSkillCreatorForm = () => {
  if (!isFixedSkillCreatorFormReady.value) return;

  const prompt = createFixedSkillCreatorPrompt();
  enabledSearchModes.value = new Set();
  showSkillCreatorForm.value = false;
  emit('submit', prompt, {
    thinkingMode: selectedThinkingMode.value,
  });
};

const insertGuidedSkillCreatorPrompt = () => {
  showSkillCreatorGuide.value = false;
  showSkillMenu.value = false;
  enabledSearchModes.value = new Set();
  nextTick(() => {
    const editor = editorRef.value;
    const promptBody = createSkillCreatorPromptBody();

    if (!editor) {
      inputValue.value = `${selectedAssetPromptPrefix}/skill-creator${serializeSkillCreatorReferenceAssets()}${promptBody}`;
      return;
    }

    const skillToken = createSkillToken('skill-creator');
    editor.replaceChildren(
      document.createTextNode(selectedAssetPromptPrefix),
      skillToken,
      ...createSkillCreatorReferenceAssetNodes(),
      document.createTextNode(promptBody),
    );
    clearSelectedSkillToken();
    syncEditorState();
    focusEditor();
  });
};

const triggerSkillAction = (selection?: SkillDropdownSelection) => {
  if (selection === 'skill-creator') {
    if (useFixedSkillCreatorForm) {
      openFixedSkillCreatorForm();
    } else {
      openSkillCreatorGuide();
    }
  } else if (selection) {
    insertSkillPrompt(selection);
  }
  if (selection !== 'skill-creator') {
    showDraftMenu.value = false;
    showSkillMenu.value = false;
    showInlineSkillMenu.value = false;
    showInlineTemplateMenu.value = false;
  }
};

const triggerInlineSkillAction = (selection?: SkillDropdownSelection) => {
  if (selection) {
    insertSkillToken(selection, activeSkillRange.value);
  }
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const triggerTemplateAction = (template: TemplateAsset) => {
  if (isFixedSkillCreatorTemplatePicker.value) {
    addFixedSkillCreatorTemplates([createTemplateReferenceAsset(template, null)]);
    showTemplateManageModal.value = false;
    isFixedSkillCreatorTemplatePicker.value = false;
    showSkillCreatorForm.value = true;
    return;
  }

  const target = activeSkillCreatorAssetTarget.value;
  if (target) {
    addSkillCreatorReferenceAssets([createTemplateReferenceAsset(template, target)]);
    showTemplateManageModal.value = false;
    showSkillCreatorGuide.value = true;
    activeSkillCreatorAssetTarget.value = null;
    return;
  }

  showTemplateManageModal.value = false;
  if (hasSkillCreatorCommand.value) {
    nextTick(() => {
      insertReferenceAssetTokens([createTemplateReferenceAsset(template, null)]);
    });
    return;
  }

  insertTemplatePrompt(template);
};

const triggerInlineTemplateAction = (template: TemplateAsset) => {
  insertTemplateToken(template, activeTemplateRange.value);
};

const openTemplateLibrary = () => {
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeSkillCreatorAssetTarget.value = null;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  showTemplateManageModal.value = true;
};

const createTemplateFromDropdown = () => {
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  showTemplateManageModal.value = false;
  nextTick(() => {
    insertPlainTextAtCaret(selectedAssetPromptPrefix);
    insertSkillToken('template-creator');
    insertPlainTextAtCaret(templateCreatorPromptSuffix);
  });
};

const openSkillManageModal = () => {
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showSkillCreatorForm.value = false;
  showTemplateMenu.value = false;
  showDraftMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  showTemplateManageModal.value = false;
  skillManageStartsInCreate.value = false;
  showSkillManageModal.value = true;
};

const createSkillFromModal = (skillName = 'skill-creator') => {
  if (skillName === 'skill-creator') {
    showSkillManageModal.value = false;
    skillManageStartsInCreate.value = false;
    nextTick(() => {
      if (useFixedSkillCreatorForm) {
        openFixedSkillCreatorForm();
      } else {
        openSkillCreatorGuide();
      }
    });
    return;
  }

  showSkillManageModal.value = false;
  nextTick(() => {
    activeSkillRange.value = null;
    showInlineTemplateMenu.value = false;
    activeTemplateRange.value = null;
    inlineTemplateQuery.value = '';
    insertSkillPrompt(skillName);
  });
};

const handleSubmit = () => {
  if (!hasComposerContent.value) return;

  syncEditorState();
  emit('submit', getEditorText().trim(), {
    thinkingMode: selectedThinkingMode.value,
  });
};

defineExpose({
  createSkillFromModal,
  createTemplateFromDropdown,
});

// Close dropdown when clicking outside
const closeDropdown = () => {
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineSkillQuery.value = '';
  inlineTemplateQuery.value = '';
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target;
  if (target instanceof Node && inputContainerRef.value?.contains(target)) {
    return;
  }

  closeDropdown();
};

const focusEditorFromShell = () => {
  closeDropdown();
  focusEditor();
};

onMounted(() => {
  renderEditorPlainText(inputValue.value);
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  emit('skill-guide-active-change', false);
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div
    ref="inputContainerRef"
    class="chat-input-container"
    :class="{ 'creator-guide-active': isSkillCreatorCreationActive }"
    @click.self="!isSkillCreatorCreationActive && focusEditorFromShell()"
  >
    <span v-if="!hasComposerContent" class="chat-editor-placeholder" aria-hidden="true">
      {{ placeholderText() }}
    </span>
    <div
      ref="editorRef"
      class="chat-editor-row"
      role="textbox"
      aria-label="输入内容"
      :aria-placeholder="placeholderText()"
      aria-multiline="true"
      contenteditable="true"
      spellcheck="false"
      @click.stop="handleEditorClick"
      @input="handleEditorInput"
      @keydown="handleEditorKeydown"
      @keyup="handleEditorInteraction"
    ></div>

    <div
      v-if="showInlineSkillMenu"
      class="inline-skill-dropdown"
      role="menu"
      :style="{ left: `${inlineShortcutMenuPosition.left}px`, top: `${inlineShortcutMenuPosition.top}px` }"
      @mousedown.prevent
      @click.stop
    >
      <SkillDropdownContent
        :inline-query="inlineSkillQuery"
        :show-manage="false"
        @select="triggerInlineSkillAction"
      />
    </div>

    <section
      v-if="showSkillCreatorForm"
      class="skill-creator-form"
      role="dialog"
      aria-label="创建技能表单"
      @mousedown.stop
      @click.stop
      @keydown.escape.stop.prevent="closeFixedSkillCreatorForm"
    >
      <header class="fixed-creator-header">
        <h3>创建技能</h3>
        <button
          class="creator-guide-close"
          type="button"
          aria-label="关闭创建技能表单"
          @click="closeFixedSkillCreatorForm"
        >
          <span>退出创建</span>
          <X :size="14" />
        </button>
      </header>

      <div class="fixed-creator-fields">
        <label class="fixed-creator-field">
          <span>
            技能名称
            <em class="fixed-creator-required" aria-label="必填">*</em>
          </span>
          <input
            v-model="fixedSkillCreatorName"
            class="fixed-creator-input"
            type="text"
            placeholder="请输入技能名称"
          />
        </label>

        <label class="fixed-creator-field">
          <span>技能简介</span>
          <textarea
            v-model="fixedSkillCreatorDescription"
            rows="2"
            placeholder="请输入技能简介"
          ></textarea>
        </label>

        <section class="fixed-creator-picker-field" aria-label="关联模板">
          <div class="fixed-creator-picker-head">
            <span>关联模板</span>
          </div>
          <div class="fixed-creator-picker-row" :class="{ populated: fixedSkillCreatorTemplates.length }">
            <div class="fixed-creator-picker-main">
              <span class="fixed-creator-resource-icon" aria-hidden="true">
                <FileText :size="16" />
              </span>
              <div class="fixed-creator-resource-copy">
                <strong v-if="fixedSkillCreatorTemplates.length">
                  已关联 {{ fixedSkillCreatorTemplates.length }} 个模板
                </strong>
                <strong v-else>未关联模板</strong>
                <div class="fixed-creator-chip-list">
                  <button
                    v-for="asset in fixedSkillCreatorTemplates"
                    :key="`${asset.kind}:${asset.id}`"
                    class="creator-selected-asset"
                    type="button"
                    :title="asset.name"
                    @click="removeFixedSkillCreatorTemplate(asset)"
                  >
                    <span class="creator-selected-badge">{{ assetBadgeLabel(asset.kind) }}</span>
                    <span class="creator-selected-name">{{ asset.name }}</span>
                    <X :size="13" />
                  </button>
                  <span v-if="!fixedSkillCreatorTemplates.length" class="fixed-creator-empty">从模板库选择</span>
                </div>
              </div>
            </div>
            <button class="fixed-creator-picker-btn" type="button" @click="openFixedSkillCreatorTemplatePicker">
              <FileText :size="14" />
              <span>选择模板</span>
            </button>
          </div>
        </section>

        <section class="fixed-creator-picker-field" aria-label="关联知识库">
          <div class="fixed-creator-picker-head">
            <span>关联知识库</span>
          </div>
          <div class="fixed-creator-picker-row" :class="{ populated: fixedSkillCreatorFiles.length }">
            <div class="fixed-creator-picker-main">
              <span class="fixed-creator-resource-icon" aria-hidden="true">
                <BookOpen :size="16" />
              </span>
              <div class="fixed-creator-resource-copy">
                <strong v-if="fixedSkillCreatorFiles.length">
                  已关联 {{ fixedSkillCreatorFiles.length }} 个知识库文件
                </strong>
                <strong v-else>未关联知识库</strong>
                <div class="fixed-creator-chip-list">
                  <button
                    v-for="asset in fixedSkillCreatorFiles"
                    :key="`${asset.kind}:${asset.id}`"
                    class="creator-selected-asset"
                    type="button"
                    :title="asset.name"
                    @click="removeFixedSkillCreatorFile(asset)"
                  >
                    <span class="creator-selected-badge">{{ assetBadgeLabel(asset.kind) }}</span>
                    <span class="creator-selected-name">{{ asset.name }}</span>
                    <X :size="13" />
                  </button>
                  <span v-if="!fixedSkillCreatorFiles.length" class="fixed-creator-empty">从知识库选择文件</span>
                </div>
              </div>
            </div>
            <button class="fixed-creator-picker-btn" type="button" @click="openFixedSkillCreatorFilePicker">
              <BookOpen :size="14" />
              <span>选择文件</span>
            </button>
          </div>
        </section>
      </div>

      <footer class="fixed-creator-actions">
        <button
          class="fixed-creator-submit"
          type="button"
          :disabled="!isFixedSkillCreatorFormReady"
          @click="submitFixedSkillCreatorForm"
        >
          创建技能
        </button>
      </footer>
    </section>

    <section
      v-if="showLegacySkillCreatorGuide"
      class="skill-creator-guide"
      :class="{ 'root-stage': isRootSkillCreatorStage, 'with-progress': shouldShowSkillCreatorProgress }"
      role="dialog"
      aria-label="创建技能引导"
      @mousedown.stop
      @click.stop
      @keydown.escape.stop.prevent="closeSkillCreatorGuide"
    >
      <header class="creator-guide-header">
        <div class="creator-guide-title-block">
          <div class="creator-guide-title-row">
            <span
              v-if="shouldShowSkillCreatorNavigation"
              class="creator-guide-step-count"
            >
              {{ followupSkillCreatorStepIndex + 1 }} of {{ followupSkillCreatorStepCount }}
            </span>
            <h3 v-if="!isActiveSkillCreatorStepLoading">{{ activeSkillCreatorStep.title }}</h3>
          </div>
        </div>

        <div class="creator-guide-nav">
          <template v-if="shouldShowSkillCreatorNavigation">
            <button
              class="creator-guide-icon-btn"
              type="button"
              aria-label="上一步"
              :disabled="skillCreatorGuideStep <= 1"
              @click="moveSkillCreatorGuideStep('previous')"
            >
              <ArrowLeft :size="17" />
            </button>
            <button
              class="creator-guide-icon-btn"
              type="button"
              aria-label="下一步"
              :disabled="skillCreatorGuideStep === skillCreatorSteps.length - 1"
              @click="moveSkillCreatorGuideStep('next')"
            >
              <ArrowRight :size="17" />
            </button>
          </template>
          <button
            class="creator-guide-close"
            type="button"
            aria-label="关闭创建技能引导"
            @click="closeSkillCreatorGuide"
          >
            <span>退出创建</span>
            <X :size="14" />
          </button>
        </div>
      </header>

      <div
        v-if="shouldShowSkillCreatorProgress"
        class="creator-guide-progress"
        :style="{ gridTemplateColumns: `repeat(${followupSkillCreatorStepCount}, minmax(0, 1fr))` }"
        aria-hidden="true"
      >
        <span
          v-for="(step, index) in followupSkillCreatorSteps"
          :key="step.field"
          :class="{ active: index <= followupSkillCreatorStepIndex }"
        ></span>
      </div>

      <div
        v-if="isActiveSkillCreatorStepLoading"
        class="creator-guide-loading"
        aria-live="polite"
      >
        <span class="creator-loading-dot" aria-hidden="true"></span>
        <span>{{ skillCreatorGuideLoadingText || '正在整理更贴合的候选项，请稍候' }}</span>
      </div>
      <p
        v-else-if="skillCreatorGuideError"
        class="creator-guide-error"
      >
        {{ skillCreatorGuideError }}
      </p>

      <div
        v-if="!isActiveSkillCreatorStepLoading"
        class="creator-guide-options"
      >
        <button
          v-for="(option, index) in activeSkillCreatorStep.options"
          :key="option.id"
          class="creator-guide-option"
          :class="{ selected: skillCreatorSelections[activeSkillCreatorStep.field] === option.id }"
          type="button"
          :title="option.description"
          :disabled="isActiveSkillCreatorStepLoading"
          @click="selectSkillCreatorOption(activeSkillCreatorStep.field, option.id)"
        >
          <span class="creator-option-index" aria-hidden="true">{{ index + 1 }}.</span>
          <span class="creator-option-copy">
            <span class="creator-option-label">
              {{ option.label }}
              <span v-if="option.recommended" class="creator-option-recommend">推荐</span>
              <span
                class="creator-option-info"
                :title="option.description"
                :aria-label="option.description"
              >
                <Info :size="13" />
              </span>
            </span>
          </span>
          <Check
            v-if="skillCreatorSelections[activeSkillCreatorStep.field] === option.id"
            class="creator-option-check"
            :size="16"
          />
        </button>

        <div class="creator-guide-custom" :class="{ active: skillCreatorSelections[activeSkillCreatorStep.field] === 'custom' }">
          <span class="creator-option-index" aria-hidden="true">{{ activeSkillCreatorStep.options.length + 1 }}.</span>
          <input
            :value="getCustomSkillCreatorInput(activeSkillCreatorStep.field)"
            type="text"
            placeholder="自行输入需求"
            @focus="focusCustomSkillCreatorInput(activeSkillCreatorStep.field)"
            @input="handleCustomSkillCreatorInput(activeSkillCreatorStep.field, $event)"
            @keydown.enter.prevent="commitCustomSkillCreatorInput(activeSkillCreatorStep.field)"
          />
          <button
            v-if="getCustomSkillCreatorInput(activeSkillCreatorStep.field).trim()"
            class="creator-custom-continue"
            type="button"
            :disabled="isActiveSkillCreatorStepLoading"
            @click="commitCustomSkillCreatorInput(activeSkillCreatorStep.field)"
          >
            继续
          </button>
        </div>

        <div v-if="activeSkillCreatorAssetSlots.length" class="creator-asset-slots">
          <section
            v-for="slot in activeSkillCreatorAssetSlots"
            :key="slot.id"
            class="creator-asset-slot"
          >
            <header class="creator-asset-slot-header">
              <span class="creator-asset-title">{{ slot.title }}</span>
              <span class="creator-asset-optional">非必填</span>
            </header>
            <p class="creator-asset-description">{{ slot.description }}</p>
            <div class="creator-asset-actions">
              <button
                v-if="slot.allowLocal"
                type="button"
                class="creator-asset-action"
                @click.stop="openCreatorLocalAssetPicker(slot)"
              >
                <File :size="14" />
                <span>上传文件</span>
              </button>
              <button
                v-if="slot.allowKnowledge"
                type="button"
                class="creator-asset-action"
                @click.stop="openCreatorKnowledgeAssetPicker(slot)"
              >
                <BookOpen :size="14" />
                <span>从知识库选择</span>
              </button>
              <button
                v-if="slot.allowTemplate"
                type="button"
                class="creator-asset-action"
                @click.stop="openCreatorTemplateAssetPicker(slot)"
              >
                <FileText :size="14" />
                <span>选择模板</span>
              </button>
            </div>
            <div
              v-if="getSkillCreatorAssetsForSlot(slot).length"
              class="creator-selected-assets"
            >
              <button
                v-for="asset in getSkillCreatorAssetsForSlot(slot)"
                :key="`${asset.kind}:${asset.id}`"
                type="button"
                class="creator-selected-asset"
                :title="asset.name"
                @click.stop="removeSkillCreatorReferenceAsset(asset)"
              >
                <span class="creator-selected-badge">{{ assetBadgeLabel(asset.kind) }}</span>
                <span class="creator-selected-name">{{ asset.name }}</span>
                <X :size="13" />
              </button>
            </div>
          </section>
        </div>
      </div>

    </section>

    <div class="input-actions">
      <div class="left-actions">
        <div class="action-menu" @click.stop>
          <input
            ref="imageInputRef"
            class="native-file-input"
            type="file"
            accept="image/*"
            multiple
            @change="handleLocalFileSelection"
          />
          <input
            ref="fileInputRef"
            class="native-file-input"
            type="file"
            multiple
            @change="handleLocalFileSelection"
          />
          <input
            ref="folderInputRef"
            class="native-file-input"
            type="file"
            webkitdirectory
            directory
            multiple
            @change="handleLocalFileSelection"
          />

          <button
            class="config-btn"
            type="button"
            aria-label="打开对话配置"
            :aria-expanded="showActionMenu"
            @click="toggleActionMenu"
          >
            <SlidersHorizontal :size="18" :stroke-width="2.2" />
          </button>

          <div v-if="showActionMenu" class="action-dropdown" role="menu">
            <section class="action-group" aria-label="对话设置">
              <p class="action-group-title">对话模式</p>
              <button
                v-for="role in dialogRoles"
                :key="role.id"
                class="action-menu-item"
                :class="{ selected: selectedRole === role.id }"
                type="button"
                @click.stop="selectRole(role.id)"
              >
                <component :is="role.icon" :size="16" class="action-icon" />
                <span>{{ role.label }}</span>
                <Check v-if="selectedRole === role.id" :size="15" class="check-icon" />
              </button>
            </section>

            <section v-if="isResearchMode" class="action-group" aria-label="推理方式">
              <p class="action-group-title">推理方式</p>
              <button
                v-for="mode in thinkingModes"
                :key="mode.id"
                class="action-menu-item has-description"
                :class="{ selected: selectedThinkingMode === mode.id }"
                type="button"
                @click.stop="selectThinkingMode(mode.id)"
              >
                <component :is="mode.icon" :size="16" class="action-icon" />
                <span class="action-item-copy">
                  <span class="action-item-label">{{ mode.label }}</span>
                  <span class="action-item-desc">{{ mode.description }}</span>
                </span>
                <Check v-if="selectedThinkingMode === mode.id" :size="15" class="check-icon" />
              </button>
            </section>

            <section v-if="isResearchMode" class="action-group" aria-label="检索来源">
              <p class="action-group-title">检索来源</p>
              <button
                v-for="mode in searchModes"
                :key="mode.id"
                class="action-menu-item"
                :class="{ selected: isEnabled(mode.id) }"
                type="button"
                @click.stop="toggleSearchMode(mode.id)"
              >
                <component :is="mode.icon" :size="16" class="action-icon" />
                <span>{{ mode.label }}</span>
                <Check v-if="isEnabled(mode.id)" :size="15" class="check-icon" />
              </button>
            </section>
          </div>
        </div>

        <div class="draft-menu" @click.stop>
          <button
            class="text-tool-btn"
            type="button"
            aria-label="打开底稿菜单"
            :aria-expanded="showDraftMenu"
            @click="toggleDraftMenu"
          >
            <Paperclip :size="20" class="text-tool-icon" />
            <span>底稿</span>
          </button>

          <div v-if="showDraftMenu" class="action-dropdown draft-dropdown" role="menu">
            <section class="action-group draft-action-group" aria-label="底稿来源">
              <button
                v-for="action in uploadActions"
                :key="action.id"
                class="action-menu-item"
                type="button"
                @click.stop="triggerUploadAction(action.id)"
              >
                <component :is="action.icon" :size="16" class="action-icon" />
                <span>{{ action.label }}</span>
              </button>
            </section>
          </div>
        </div>

        <div class="skill-menu" @click.stop>
          <button
            class="text-tool-btn"
            type="button"
            aria-label="打开技能弹窗"
            aria-haspopup="dialog"
            :aria-expanded="showSkillManageModal"
            @click="openSkillManageModal"
          >
            <Puzzle :size="20" class="text-tool-icon" />
            <span>技能</span>
          </button>
        </div>

        <div class="template-menu" @click.stop>
          <button
            class="text-tool-btn"
            type="button"
            aria-label="打开模板弹窗"
            aria-haspopup="dialog"
            :aria-expanded="showTemplateManageModal"
            @click="openTemplateLibrary"
          >
            <FileText :size="20" class="text-tool-icon" />
            <span>模板</span>
          </button>
        </div>

      </div>

      <div class="right-actions">
        <button class="icon-tool-btn" type="button" aria-label="语音输入">
          <Mic :size="20" />
        </button>
        <button
          class="send-btn"
          type="button"
          :aria-label="isSkillCreatorSubmission ? '创建技能' : '发送'"
          :class="{ active: hasComposerContent, 'skill-create-submit': isSkillCreatorSubmission }"
          :disabled="!hasComposerContent"
          @click="handleSubmit"
        >
          <span v-if="isSkillCreatorSubmission">创建技能</span>
          <ArrowUp v-else :size="18" :stroke-width="2.4" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showKnowledgeDraftPicker"
        class="knowledge-draft-backdrop"
        @click.self="closeKnowledgeDraftPicker"
      >
        <section
          class="knowledge-draft-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="knowledge-draft-title"
          @click.stop
          @keydown.escape.stop.prevent="closeKnowledgeDraftPicker"
        >
          <header class="knowledge-draft-header">
            <div>
              <p class="knowledge-draft-kicker">{{ knowledgeDraftPickerKicker }}</p>
              <h2 id="knowledge-draft-title">{{ knowledgeDraftPickerTitle }}</h2>
            </div>
            <button
              class="knowledge-draft-close"
              type="button"
              aria-label="关闭知识库底稿选择"
              @click="closeKnowledgeDraftPicker"
            >
              <X :size="17" />
            </button>
          </header>

          <div class="knowledge-draft-list" role="listbox" aria-label="知识库底稿列表">
            <button
              v-for="asset in knowledgeDraftAssets"
              :key="asset.id"
              class="knowledge-draft-item"
              :class="{ selected: selectedKnowledgeDraftIds.includes(asset.id) }"
              type="button"
              role="option"
              :aria-selected="selectedKnowledgeDraftIds.includes(asset.id)"
              @click="toggleKnowledgeDraftAsset(asset.id)"
            >
              <FileText :size="17" class="knowledge-draft-file-icon" />
              <span class="knowledge-draft-copy">
                <strong>{{ asset.name }}</strong>
                <small>{{ asset.meta }}</small>
              </span>
              <Check
                v-if="selectedKnowledgeDraftIds.includes(asset.id)"
                :size="16"
                class="knowledge-draft-check"
              />
            </button>
          </div>

          <footer class="knowledge-draft-footer">
            <span>
              {{ selectedKnowledgeDraftAssets.length }} 个{{ isFixedSkillCreatorFilePicker ? '知识库文件' : '底稿' }}已选
            </span>
            <div class="knowledge-draft-actions">
              <button type="button" class="knowledge-draft-secondary" @click="closeKnowledgeDraftPicker">
                取消
              </button>
              <button
                type="button"
                class="knowledge-draft-primary"
                :disabled="selectedKnowledgeDraftAssets.length === 0"
                @click="confirmKnowledgeDraftSelection"
              >
                {{ knowledgeDraftPickerConfirmText }}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </Teleport>

    <SkillManageModal
      v-if="showSkillManageModal"
      :start-in-create="skillManageStartsInCreate"
      create-behavior="emit"
      @close="showSkillManageModal = false"
      @create="createSkillFromModal"
      @use="createSkillFromModal"
    />
    <Teleport to="body">
      <TemplateManageModal
        v-if="showTemplateManageModal"
        @close="closeTemplateManageModal"
        @create="createTemplateFromDropdown"
        @select="triggerTemplateAction"
      />
    </Teleport>
  </div>

  <section
    v-if="selectedComposerDeliveryItems.length && !isSkillCreatorCreationActive"
    class="composer-delivery-panel"
    aria-label="即将交付内容"
  >
    <header class="composer-delivery-header">
      <h3>即将交付内容</h3>
      <p>系统将按所选技能生成以下文件</p>
    </header>

    <div class="composer-delivery-grid">
      <article
        v-for="item in selectedComposerDeliveryItems"
        :key="item.id"
        class="composer-delivery-card"
      >
        <span class="delivery-file-icon" :class="item.format.toLowerCase()" aria-hidden="true">
          <span>{{ item.format.slice(0, 1) }}</span>
        </span>
        <span class="delivery-file-copy">
          <strong>{{ item.title }}</strong>
          <small>{{ item.format }} 文件</small>
        </span>
      </article>
    </div>

    <p class="composer-delivery-note">
      <Info :size="16" />
      <span>交付物展示在输入框下方，不占用输入内容区域。</span>
    </p>
  </section>
</template>

<style scoped>
.chat-input-container {
  background: var(--card-bg);
  border-radius: 16px;
  border: 1px solid var(--focus-ring);
  padding: 14px;
  box-shadow: 0 4px 20px color-mix(in srgb, var(--primary-color) 5%, transparent);
  position: relative;
  transition: all 0.3s ease;
  min-height: 156px;
  display: flex;
  flex-direction: column;
}

.chat-input-container:focus-within {
  box-shadow: 0 8px 30px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.chat-input-container.creator-guide-active {
  z-index: 20;
  min-height: 0;
  padding: 12px 16px;
  border-color: var(--focus-ring);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--focus-ring) 20%, transparent),
    0 0 22px color-mix(in srgb, var(--focus-ring) 24%, transparent),
    0 12px 36px color-mix(in srgb, var(--primary-color) 10%, transparent);
  overflow: visible;
  transform: translateY(-44px);
}

.chat-input-container.creator-guide-active .chat-editor-placeholder,
.chat-input-container.creator-guide-active .chat-editor-row,
.chat-input-container.creator-guide-active .inline-skill-dropdown,
.chat-input-container.creator-guide-active .input-actions {
  display: none;
}

.chat-editor-row {
  flex: 1;
  min-height: 74px;
  display: block;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 24px;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: text;
}

.chat-editor-placeholder {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 0;
  color: var(--text-muted);
  pointer-events: none;
  user-select: none;
  font-size: 16px;
  line-height: 24px;
  overflow-wrap: anywhere;
}

.chat-editor-row {
  position: relative;
  z-index: 1;
}

.chat-editor-row :deep(.template-inline-code) {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  margin: 0 4px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  vertical-align: baseline;
  user-select: all;
}

.chat-editor-row :deep(.skill-inline-code) {
  max-width: min(430px, 82vw);
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 7px;
  padding: 4px 14px 4px 8px;
  overflow: hidden;
  border: 1px solid #d3dbe8;
  border-radius: 9px;
  background: #ffffff;
  color: #111827;
  font-family: inherit;
  font-size: 16px;
  font-weight: 660;
  line-height: 1;
  vertical-align: middle;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
  white-space: nowrap;
  user-select: all;
}

.chat-editor-row :deep(.skill-inline-avatar) {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 36%, #f8fafc 0 20%, transparent 21%),
    radial-gradient(circle at 50% 72%, #e0e7ff 0 32%, transparent 33%),
    linear-gradient(135deg, #dbeafe, #93c5fd);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.16);
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.chat-editor-row :deep(.skill-inline-owner),
.chat-editor-row :deep(.skill-inline-name) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-editor-row :deep(.skill-inline-owner) {
  flex: 0 0 auto;
}

.chat-editor-row :deep(.skill-inline-name) {
  max-width: 220px;
}

.chat-editor-row :deep(.skill-inline-divider) {
  flex: 0 0 auto;
  color: #94a3b8;
  font-weight: 520;
}

.chat-editor-row :deep(.template-inline-code) {
  max-width: min(280px, 70vw);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-strong);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-editor-row :deep(.asset-inline-code) {
  max-width: min(280px, 70vw);
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 4px;
  padding: 0 8px 0 5px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-strong);
  font-family: inherit;
  font-size: 16px;
  font-weight: 520;
  line-height: 24px;
  vertical-align: baseline;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
  user-select: all;
}

.chat-editor-row :deep(.asset-inline-code)::before {
  content: attr(data-badge);
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 760;
  line-height: 1;
}

.chat-editor-row :deep(.asset-inline-name) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-editor-row :deep(.skill-inline-code.selected),
.chat-editor-row :deep(.skill-inline-code:focus),
.chat-editor-row :deep(.template-inline-code.selected),
.chat-editor-row :deep(.template-inline-code:focus),
.chat-editor-row :deep(.asset-inline-code.selected),
.chat-editor-row :deep(.asset-inline-code:focus) {
  outline: 1px solid var(--primary-border);
  outline-offset: 1px;
}

.input-actions {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.composer-delivery-panel {
  margin-top: 12px;
  padding: 24px 28px 22px;
  border: 1px solid #d7dee9;
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: 0 3px 14px rgba(15, 23, 42, 0.05);
}

.composer-delivery-header {
  display: flex;
  align-items: baseline;
  gap: 20px;
  margin-bottom: 20px;
}

.composer-delivery-header h3 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.composer-delivery-header p {
  margin: 0;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
}

.composer-delivery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.composer-delivery-card {
  min-width: 0;
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 22px;
  border: 1px solid #d7dee9;
  border-radius: 9px;
  background: #ffffff;
}

.delivery-file-icon {
  --file-color: #2563eb;
  position: relative;
  width: 48px;
  height: 54px;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  flex: 0 0 auto;
  padding-bottom: 8px;
  border: 2px solid currentColor;
  border-radius: 5px;
  background: color-mix(in srgb, var(--file-color) 8%, #ffffff);
  color: var(--file-color);
}

.delivery-file-icon::after {
  content: "";
  position: absolute;
  top: -2px;
  right: -2px;
  width: 17px;
  height: 17px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  background: #ffffff;
  clip-path: polygon(0 0, 100% 100%, 0 100%);
}

.delivery-file-icon span {
  position: relative;
  z-index: 1;
  width: 26px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  background: var(--file-color);
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
}

.delivery-file-icon.xlsx {
  --file-color: #238547;
}

.delivery-file-icon.pdf {
  --file-color: #dc2626;
}

.delivery-file-copy {
  min-width: 0;
  display: grid;
  gap: 9px;
}

.delivery-file-copy strong,
.delivery-file-copy small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-file-copy strong {
  color: #111827;
  font-size: 19px;
  font-weight: 800;
  line-height: 1.2;
}

.delivery-file-copy small {
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.2;
}

.composer-delivery-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 22px 0 0;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
}

.composer-delivery-note svg {
  flex: 0 0 auto;
}

.left-actions {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.action-menu,
.draft-menu,
.skill-menu,
.template-menu {
  position: relative;
}

.native-file-input {
  display: none;
}

.config-btn,
.icon-tool-btn {
  appearance: none;
  -webkit-appearance: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  outline: none;
  box-shadow: none !important;
  filter: none;
  transition: all 0.2s;
}

.config-btn:hover,
.config-btn[aria-expanded="true"],
.icon-tool-btn:hover {
  background: var(--surface-soft);
  color: var(--primary-color);
  box-shadow: none !important;
  outline: none;
  filter: none;
}

.text-tool-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.2s, color 0.2s;
}

.text-tool-btn:hover,
.text-tool-btn[aria-expanded="true"] {
  background: var(--border-soft);
  color: var(--text-main);
}

.text-tool-icon {
  flex-shrink: 0;
  color: currentColor;
}

.config-btn,
.config-btn:hover,
.config-btn[aria-expanded="true"],
.config-btn:focus,
.config-btn:focus-visible,
.config-btn:active,
.icon-tool-btn,
.icon-tool-btn:hover,
.icon-tool-btn:focus,
.icon-tool-btn:focus-visible,
.icon-tool-btn:active {
  box-shadow: none !important;
  outline: none !important;
  filter: none;
}

.config-btn:focus-visible,
.text-tool-btn:focus-visible,
.send-btn:focus-visible,
.action-menu-item:focus-visible,
.knowledge-draft-close:focus-visible,
.knowledge-draft-item:focus-visible,
.knowledge-draft-secondary:focus-visible,
.knowledge-draft-primary:focus-visible,
.creator-guide-icon-btn:focus-visible,
.creator-guide-close:focus-visible,
.creator-guide-option:focus-visible,
.creator-asset-action:focus-visible,
.creator-selected-asset:focus-visible,
.fixed-creator-picker-btn:focus-visible,
.fixed-creator-submit:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.knowledge-draft-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.36);
}

.knowledge-draft-modal {
  width: min(520px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
  overflow: auto;
}

.knowledge-draft-header,
.knowledge-draft-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.knowledge-draft-kicker {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.knowledge-draft-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
  line-height: 1.25;
}

.knowledge-draft-close {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
}

.knowledge-draft-close:hover {
  background: var(--surface-soft);
  color: var(--text-main);
}

.knowledge-draft-list {
  display: grid;
  gap: 8px;
}

.knowledge-draft-item {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  text-align: left;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.knowledge-draft-item:hover,
.knowledge-draft-item.selected {
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.knowledge-draft-file-icon,
.knowledge-draft-check {
  flex-shrink: 0;
  color: var(--primary-color);
}

.knowledge-draft-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.knowledge-draft-copy strong,
.knowledge-draft-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-draft-copy strong {
  font-size: 14px;
  font-weight: 700;
}

.knowledge-draft-copy small {
  color: var(--text-muted);
  font-size: 12px;
}

.knowledge-draft-check {
  margin-left: auto;
}

.knowledge-draft-footer {
  padding-top: 2px;
  color: var(--text-muted);
  font-size: 13px;
}

.knowledge-draft-actions {
  display: flex;
  gap: 8px;
}

.knowledge-draft-secondary,
.knowledge-draft-primary {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}

.knowledge-draft-secondary {
  color: var(--text-secondary);
  background: var(--surface-soft);
}

.knowledge-draft-secondary:hover {
  color: var(--text-main);
  background: var(--border-soft);
}

.knowledge-draft-primary {
  color: var(--on-primary);
  background: var(--primary-color);
}

.knowledge-draft-primary:disabled {
  cursor: default;
  opacity: 0.5;
}

.action-dropdown,
.skill-dropdown,
.template-dropdown,
.inline-skill-dropdown,
.inline-template-dropdown {
  --dropdown-x: 0px;
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
  z-index: 120;
  transform: translateX(var(--dropdown-x));
  animation: fadeIn 0.15s ease;
}

.action-dropdown {
  width: 228px;
  max-height: min(360px, calc(100vh - 24px));
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.skill-dropdown,
.template-dropdown {
  width: 300px;
  max-height: min(392px, calc(100vh - 240px));
  overflow: hidden;
  border-color: var(--border-color);
  border-radius: 12px;
}

.skill-dropdown.creator-guide-open {
  width: min(520px, calc(100vw - 32px));
  max-height: min(360px, calc(100vh - 240px));
}

.inline-skill-dropdown,
.inline-template-dropdown {
  top: auto;
  bottom: auto;
  width: 300px;
  max-height: 320px;
  overflow: hidden;
}

.skill-creator-form {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--text-main);
  animation: fadeIn 0.15s ease;
}

.fixed-creator-header {
  position: absolute;
  left: 0;
  right: 0;
  top: -60px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fixed-creator-header h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 820;
  line-height: 1.18;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fixed-creator-fields {
  display: grid;
  gap: 10px;
}

.fixed-creator-field,
.fixed-creator-picker-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fixed-creator-field > span,
.fixed-creator-picker-head {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 760;
  line-height: 1.25;
}

.fixed-creator-required {
  margin-left: 3px;
  color: var(--danger-color, #dc2626);
  font-style: normal;
  font-weight: 820;
}

.fixed-creator-field input,
.fixed-creator-field textarea {
  width: 100%;
  min-height: 39px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  outline: 0;
  background: var(--card-bg);
  color: var(--text-strong);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  box-shadow: none;
}

.fixed-creator-field input {
  height: 39px;
  padding-top: 0;
  padding-bottom: 0;
  line-height: 1;
}

.fixed-creator-field textarea {
  min-height: 66px;
  resize: vertical;
}

.fixed-creator-field input::placeholder,
.fixed-creator-field textarea::placeholder {
  color: var(--text-muted);
}

.fixed-creator-field input:focus,
.fixed-creator-field textarea:focus {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 16%, transparent);
}

.fixed-creator-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.fixed-creator-picker-head small {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.fixed-creator-picker-row {
  min-height: 62px;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: color-mix(in srgb, var(--card-bg) 94%, var(--surface-soft));
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
}

.fixed-creator-picker-row.populated {
  background: var(--card-bg);
}

.fixed-creator-picker-row:hover,
.fixed-creator-picker-row:focus-within {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 12%, transparent);
}

.fixed-creator-picker-main {
  min-width: 0;
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 10px;
}

.fixed-creator-resource-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary-color);
}

.fixed-creator-resource-copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  padding-top: 1px;
}

.fixed-creator-resource-copy strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fixed-creator-chip-list {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.fixed-creator-empty {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
}

.fixed-creator-picker-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 6px;
}

.fixed-creator-picker-btn {
  height: 32px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 9px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 760;
  line-height: 1;
}

.fixed-creator-picker-btn svg {
  flex-shrink: 0;
}

.fixed-creator-picker-btn.secondary {
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--card-bg) 86%, var(--surface-soft));
  color: var(--text-main);
}

.fixed-creator-picker-btn:hover {
  background: var(--primary-hover);
}

.fixed-creator-picker-btn.secondary:hover {
  background: var(--border-soft);
  color: var(--text-strong);
}

.fixed-creator-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.fixed-creator-submit {
  min-width: 104px;
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 760;
  line-height: 1;
  white-space: nowrap;
}

.fixed-creator-submit:hover {
  background: var(--primary-hover);
}

.fixed-creator-submit:disabled {
  cursor: not-allowed;
  background: var(--border-color);
  opacity: 0.62;
}

.skill-creator-guide {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  max-height: min(372px, calc(100vh - 220px));
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
  color: var(--text-main);
  animation: fadeIn 0.15s ease;
}

.skill-creator-guide::-webkit-scrollbar {
  width: 6px;
}

.skill-creator-guide::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--border-color);
}

.creator-guide-header {
  position: absolute;
  left: 0;
  right: 0;
  top: -60px;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.skill-creator-guide.with-progress .creator-guide-header {
  top: -88px;
}

.creator-guide-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 650;
  white-space: nowrap;
}

.creator-guide-icon-btn,
.creator-guide-close {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
  background: transparent;
  transition: background-color 0.15s, color 0.15s;
}

.creator-guide-close {
  width: auto;
  gap: 5px;
  padding: 0 9px 0 10px;
  appearance: none;
  -webkit-appearance: none;
  border: 0 !important;
  outline: 0;
  background: transparent;
  box-shadow: none !important;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 660;
}

.creator-guide-icon-btn:hover:not(:disabled),
.creator-guide-close:hover {
  color: var(--text-strong);
}

.creator-guide-close:hover,
.creator-guide-close:focus,
.creator-guide-close:focus-visible {
  border: 0 !important;
  outline: 0;
  background: transparent;
  box-shadow: none !important;
}

.creator-guide-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.creator-guide-title-block {
  min-width: 0;
  display: block;
}

.creator-guide-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.creator-guide-step-count {
  flex-shrink: 0;
  padding: 4px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-color) 10%, var(--card-bg));
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.creator-guide-title-block h3 {
  min-width: 0;
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 820;
  line-height: 1.18;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-guide-progress {
  position: absolute;
  left: 0;
  right: 0;
  top: -33px;
  z-index: 1;
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 8px;
  padding: 0 2px;
}

.creator-guide-progress span {
  position: relative;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border-color) 70%, var(--card-bg));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-color) 42%, transparent);
}

.creator-guide-progress span.active {
  background: linear-gradient(90deg, var(--primary-hover), var(--focus-ring));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--primary-color) 22%, transparent),
    0 4px 12px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.creator-guide-progress span.active::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
  animation: creatorProgressSweep 1.8s ease-in-out infinite;
}

.creator-guide-loading,
.creator-guide-error {
  min-height: 68px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  margin: 0;
  padding: 14px 16px;
  border: 1px solid var(--primary-soft-strong);
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.creator-guide-loading::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 0%, rgba(37, 99, 235, 0.09) 42%, transparent 70%);
  animation: creatorLoadingSweep 1.65s ease-in-out infinite;
}

.creator-guide-loading > * {
  position: relative;
  z-index: 1;
}

.creator-guide-error {
  min-height: 32px;
  border-color: transparent;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
}

.creator-loading-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--primary-color);
  box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28);
  animation: creatorLoadingPulse 1.25s ease-in-out infinite;
}

.creator-guide-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: visible;
}

.creator-guide-option {
  min-height: 31px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-strong);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.creator-guide-option:hover {
  background: var(--surface-muted);
}

.creator-guide-option:disabled {
  cursor: wait;
  opacity: 0.58;
}

.creator-guide-option.selected {
  border-color: var(--border-soft);
  background: var(--surface-soft);
  color: var(--text-strong);
}

.creator-guide-option > * {
  pointer-events: none;
}

.creator-option-index {
  width: 28px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 520;
  line-height: 1;
}

.creator-option-copy {
  min-width: 0;
  display: block;
  overflow: hidden;
}

.creator-option-label {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: currentColor;
  font-size: 14px;
  font-weight: 760;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-option-recommend {
  flex-shrink: 0;
  margin-left: 2px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--diff-added-soft);
  color: var(--diff-added);
  font-size: 12px;
  font-weight: 760;
  line-height: 1.35;
}

.creator-option-info {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.creator-option-check {
  flex-shrink: 0;
  margin-left: auto;
  color: var(--primary-color);
}

.creator-guide-custom {
  min-height: 31px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 1px;
  padding: 4px 10px;
  border-radius: 8px;
  color: var(--text-muted);
}

.creator-guide-custom.active,
.creator-guide-custom:focus-within {
  background: var(--surface-muted);
  color: var(--text-main);
}

.creator-guide-custom input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 24px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  border-radius: 0;
  outline: 0;
  background: transparent;
  box-shadow: none;
  color: var(--text-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 560;
  line-height: 20px;
}

.creator-guide-custom input::placeholder {
  color: var(--text-muted);
  font-weight: 560;
  opacity: 1;
}

.creator-custom-continue {
  flex-shrink: 0;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 12px;
  font-weight: 760;
  line-height: 1;
}

.creator-custom-continue:disabled {
  cursor: default;
  opacity: 0.42;
}

.creator-custom-continue:not(:disabled):hover {
  background: var(--primary-hover);
}

.creator-asset-slots {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.creator-asset-slot {
  display: grid;
  gap: 7px;
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: color-mix(in srgb, var(--card-bg) 92%, var(--surface-soft));
}

.creator-asset-slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.creator-asset-title {
  min-width: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-asset-optional {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
}

.creator-asset-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
}

.creator-asset-actions,
.creator-selected-assets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.creator-asset-action {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--text-main);
  background: var(--surface-soft);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.creator-asset-action:hover {
  background: var(--border-soft);
  color: var(--text-strong);
}

.creator-asset-action svg {
  flex-shrink: 0;
  color: var(--primary-color);
}

.creator-selected-assets {
  padding-top: 1px;
}

.creator-selected-asset {
  max-width: 100%;
  height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 5px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--card-bg);
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
}

.creator-selected-asset:hover {
  border-color: var(--primary-border);
  background: var(--surface-soft);
}

.creator-selected-badge {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--primary-soft);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 760;
}

.creator-selected-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-selected-asset svg {
  flex-shrink: 0;
  color: var(--text-muted);
}

@keyframes creatorLoadingPulse {
  0% {
    transform: scale(0.85);
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
  }

  100% {
    transform: scale(0.85);
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
  }
}

@keyframes creatorLoadingSweep {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

@keyframes creatorProgressSweep {
  0% {
    transform: translateX(-100%);
  }

  70%,
  100% {
    transform: translateX(100%);
  }
}

.action-group {
  padding: 2px 0 3px;
  border-bottom: 1px solid var(--border-soft);
}

.action-group:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.action-group-title {
  margin: 1px 8px 3px;
  font-size: 11px;
  line-height: 1;
  color: var(--text-muted);
  font-weight: 700;
}

.action-menu-item {
  width: 100%;
  min-height: 29px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border-radius: 7px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
}

.action-menu-item:hover {
  background: var(--surface-muted);
}

.action-menu-item.selected {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.action-menu-item.has-description {
  min-height: 48px;
  align-items: flex-start;
  padding: 7px 8px;
}

.action-menu-item.has-description .action-icon,
.action-menu-item.has-description .check-icon {
  margin-top: 1px;
}

.action-item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.action-item-label {
  color: currentColor;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.1;
}

.action-item-desc {
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.25;
}

.action-icon {
  width: 15px;
  height: 15px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.action-menu-item.selected .action-icon {
  color: var(--primary-color);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(var(--dropdown-x), 4px);
  }
  to {
    opacity: 1;
    transform: translate(var(--dropdown-x), 0);
  }
}

.check-icon {
  width: 14px;
  height: 14px;
  margin-left: auto;
  color: var(--primary-color);
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.send-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--border-color);
  color: var(--on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  transition: background-color 0.16s;
}

.send-btn.skill-create-submit {
  width: auto;
  min-width: 104px;
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 760;
  letter-spacing: 0;
  white-space: nowrap;
}

.send-btn.active {
  color: var(--on-primary);
  background: var(--primary-color);
  cursor: pointer;
}

.send-btn.active:hover {
  background: var(--primary-hover);
}

@media (max-width: 768px) {
  .chat-input-container {
    min-height: 148px;
  }

  .chat-input-container.creator-guide-active {
    min-height: 0;
    transform: translateY(-18px);
  }

  .chat-editor-row :deep(.skill-inline-code) {
    max-width: min(100%, calc(100vw - 52px));
    min-height: 36px;
    gap: 8px;
    margin: 2px 3px;
    padding: 4px 10px 4px 6px;
    font-size: 15px;
  }

  .chat-editor-row :deep(.skill-inline-avatar) {
    width: 28px;
    height: 28px;
  }

  .chat-editor-row :deep(.skill-inline-name) {
    max-width: 150px;
  }

  .composer-delivery-panel {
    margin-top: 10px;
    padding: 18px 16px;
  }

  .composer-delivery-header {
    display: grid;
    gap: 6px;
    margin-bottom: 14px;
  }

  .composer-delivery-header h3 {
    font-size: 18px;
  }

  .composer-delivery-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .composer-delivery-card {
    min-height: 78px;
    gap: 14px;
    padding: 13px 14px;
  }

  .delivery-file-copy strong {
    font-size: 17px;
  }

  .input-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .left-actions,
  .right-actions {
    width: 100%;
  }

  .left-actions {
    flex: 0 0 100%;
  }

  .right-actions {
    justify-content: flex-end;
  }

  .action-dropdown,
  .skill-dropdown,
  .template-dropdown {
    top: calc(100% + 10px);
    bottom: auto;
  }

  .action-dropdown {
    position: fixed;
    top: 12px;
    bottom: auto;
    left: max(12px, calc(50vw - 114px));
    width: min(228px, calc(100vw - 32px));
    max-height: min(332px, calc(100vh - 24px));
    transform: none;
  }

  .skill-dropdown,
  .template-dropdown {
    --dropdown-x: -50%;
    left: 50%;
    width: min(300px, calc(100vw - 32px));
  }

  .skill-dropdown.creator-guide-open {
    --dropdown-x: -50%;
    left: 50%;
    width: min(520px, calc(100vw - 24px));
    max-height: min(520px, calc(100vh - 24px));
  }

  .skill-creator-guide {
    position: relative;
    gap: 8px;
    max-height: min(380px, calc(100vh - 40px));
    padding: 0;
    border-radius: 14px;
  }

  .fixed-creator-header {
    top: -58px;
  }

  .fixed-creator-header h3 {
    font-size: 18px;
  }

  .fixed-creator-picker-row {
    align-items: stretch;
    flex-direction: column;
  }

  .fixed-creator-picker-actions {
    width: 100%;
  }

  .fixed-creator-picker-btn {
    flex: 1;
  }

  .creator-guide-header {
    top: -58px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .skill-creator-guide.with-progress .creator-guide-header {
    top: -90px;
  }

  .creator-guide-title-block h3 {
    font-size: 18px;
  }

  .creator-guide-progress {
    top: -33px;
    gap: 5px;
  }

  .creator-guide-step-count {
    padding: 4px 8px;
    font-size: 12px;
  }

  .creator-guide-close {
    padding: 0 8px;
    font-size: 12px;
  }

  .creator-guide-nav {
    justify-content: flex-end;
  }

  .creator-guide-options {
    overflow: visible;
  }

  .creator-guide-option {
    min-height: 34px;
    padding: 6px 10px;
  }

  .creator-option-index {
    width: 26px;
    font-size: 14px;
  }

  .creator-option-label {
    font-size: 14px;
  }

}
</style>
