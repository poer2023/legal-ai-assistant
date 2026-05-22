<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Brain,
  File,
  FileText,
  FolderOpen,
  Globe,
  Scale,
  Image,
  Info,
  ArrowRight,
  Check,
  ChevronDown,
  BookOpen,
  Plus,
  Search,
  X,
  Zap,
} from 'lucide-vue-next';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import LawAgentsNavIcon from './icons/LawAgentsNavIcon.vue';
import SkillDropdownContent from './SkillDropdownContent.vue';
import type { SkillDropdownSelection } from './SkillDropdownContent.vue';
import TemplateDropdownContent from './TemplateDropdownContent.vue';
import SkillManageModal from './SkillManageModal.vue';
import TemplateManageModal from './TemplateManageModal.vue';
import { availableSkills, getSkillByNameOrId, isRegisteredSkillName, type SkillCatalogItem } from '../data/skillCatalog';
import {
  defaultTemplateAssets,
  type TemplateAsset,
} from '../data/legalAssets';
import {
  getSkillAuthorAvatarStyle,
  getSkillAuthorAvatarText,
  getSkillAuthorName,
  hasSkillAuthorAvatarImage,
  shouldUseProfileIdentity,
} from '../data/profileIdentity';
import { useOrgSession } from '../stores/orgSession';
import { DEFAULT_WORKSPACE_ID, STANDALONE_WORKSPACE_ID, useWorkspaces } from '../stores/workspaces';

const props = withDefaults(defineProps<{
  modelValue?: string;
  showWorkspaceSelector?: boolean;
}>(), {
  showWorkspaceSelector: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [value: string, options: ComposerSubmitOptions];
}>();

const { currentUser } = useOrgSession();
const {
  activeWorkspace,
  activeWorkspaceId,
  createWorkspace,
  setActiveWorkspace,
  workspaces,
} = useWorkspaces();

const inputValue = ref('');
const showWorkspaceMenu = ref(false);
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
const skillTokenCount = ref(0);
const hasSkillCreatorToken = ref(false);
const templateTokenCount = ref(0);
const lastEmittedModelValue = ref<string | undefined>(undefined);
const inputContainerRef = ref<HTMLDivElement | null>(null);
const editorRef = ref<HTMLDivElement | null>(null);
const workspaceInputRef = ref<HTMLInputElement | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const folderInputRef = ref<HTMLInputElement | null>(null);
const activeSkillRange = ref<Range | null>(null);
const activeTemplateRange = ref<Range | null>(null);
const inlineSkillQuery = ref('');
const inlineTemplateQuery = ref('');
const selectedSkillToken = ref<HTMLElement | null>(null);
const selectedComposerSkillNames = ref<string[]>([]);
const firstComposerSkillName = ref('');
const editorFreeText = ref('');
const inlineShortcutMenuPosition = ref({ left: 16, top: 48 });
const selectedAssetPromptPrefix = '请使用 ';
const skillCreatorPromptSuffix = ' 帮我创建一个可复用的技能，我的需求如下：';
const templatePromptSuffix = ' 帮我按照这个格式模板完成写作，我的需求/源文件如下：';
const templateCreatorPromptSuffix = ' 帮我创建一个可复用的输出格式模板，我的需求/源文件如下：';
const inlineTokenSelector = '.skill-inline-code, .template-inline-code, .asset-inline-code';
const shouldShowWorkspaceSelector = computed(() => props.showWorkspaceSelector !== false);

type SkillCreatorReferenceAssetKind = 'local-file' | 'knowledge-file' | 'template';

type SkillCreatorReferenceAsset = {
  id: string;
  kind: SkillCreatorReferenceAssetKind;
  name: string;
  sourceLabel: string;
  templateId?: string;
};

export type ComposerPickedAsset = {
  name: string;
  sourceLabel: string;
  kind: SkillCreatorReferenceAssetKind;
  templateId?: string;
};

export type ComposerWorkspaceSelection = {
  id: string;
  name: string;
  source: 'workspace' | 'local-folder';
  fileCount?: number;
};

export type ComposerSubmitOptions = {
  thinkingMode: string;
  workspaceId: string;
  workspace: ComposerWorkspaceSelection | null;
};

type ComposerAssetPickHandler = (assets: ComposerPickedAsset[]) => void;
type ComposerTemplatePickHandler = (template: TemplateAsset) => void;

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

const placeholderText = () => {
  return '想咨询或研究什么法律问题，快来问问我！Shift+Enter/Ctrl+Enter换行';
};

const selectedWorkspace = computed<ComposerWorkspaceSelection | null>(() => {
  const workspace = activeWorkspace.value;
  if (!workspace || activeWorkspaceId.value === STANDALONE_WORKSPACE_ID) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    source: workspace.source === 'local-folder' ? 'local-folder' : 'workspace',
  };
});
const selectedWorkspaceLabel = computed(() => selectedWorkspace.value?.name ?? '从零开始');

const getWorkspaceDescription = (workspace: { id?: string; description?: string; source?: string }) => {
  if (workspace.id === DEFAULT_WORKSPACE_ID) return '';
  if (workspace.description) return workspace.description;
  return workspace.source === 'local-folder' ? '本地文件夹工作空间' : '会话工作空间';
};

const getWorkspaceRootName = (files: File[]) => {
  const firstFile = files[0] as (File & { webkitRelativePath?: string }) | undefined;
  const rootName = firstFile?.webkitRelativePath?.split('/').find(Boolean);
  return rootName || firstFile?.name || '本地工作区';
};

const toggleWorkspaceMenu = () => {
  showWorkspaceMenu.value = !showWorkspaceMenu.value;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const selectNoWorkspace = () => {
  setActiveWorkspace(STANDALONE_WORKSPACE_ID);
  showWorkspaceMenu.value = false;
};

const selectWorkspace = (workspaceId: string) => {
  setActiveWorkspace(workspaceId);
  showWorkspaceMenu.value = false;
};

const openWorkspaceDirectoryPicker = () => {
  showWorkspaceMenu.value = false;
  workspaceInputRef.value?.click();
};

const openKnowledgeWorkspacePicker = () => {
  showWorkspaceMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  selectedKnowledgeDraftIds.value = [];
  knowledgeDraftSearchKeyword.value = '';
  activeKnowledgeDraftCollection.value = 'team';
  showKnowledgeDraftPicker.value = true;
};

const handleWorkspaceDirectorySelection = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;

  const files = Array.from(input.files ?? []);
  if (files.length) {
    createWorkspace(getWorkspaceRootName(files), {
      description: `${files.length} 个文件`,
      source: 'local-folder',
    });
  }

  input.value = '';
};

const selectedThinkingMode = ref('thinking');
const thinkingModes = [
  { id: 'fast', label: '快速', description: '更快响应', icon: Zap },
  { id: 'thinking', label: '思考', description: '深度推理', icon: Brain },
];

const selectThinkingMode = (modeId: string) => {
  selectedThinkingMode.value = modeId;
};

// Multi-select mode: users can enable multiple search modes
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));

const searchModes = [
  { id: 'legal', label: '法律搜索', icon: Scale },
  { id: 'web', label: '联网搜索', icon: Globe },
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

const showSkillFollowupHint = computed(() =>
  skillTokenCount.value > 0 && editorFreeText.value.trim().length === 0
);

const skillFollowupHintText = computed(() => {
  const skillName = firstComposerSkillName.value ? getSkillDisplayName(firstComposerSkillName.value) : '';
  const prefix = skillName ? `已调用「${skillName}」，` : '';
  const normalizedSkillName = firstComposerSkillName.value?.trim().replace(/^\/+/, '').toLowerCase() ?? '';
  if (normalizedSkillName === 'skill-creator') {
    return `${prefix}请继续说明你想创建的技能类型/适用场景，并补充技能执行流程、预期输出文件结构、需上传或引用的材料、输入要求和验收标准。`;
  }
  return `${prefix}请继续输入本次任务材料，例如案件背景、争议焦点、法规条文、审查对象、输出要求等。`;
});

const activeEditorPlaceholder = computed(() =>
  showSkillFollowupHint.value ? skillFollowupHintText.value : placeholderText()
);

const getSkillDisplayName = (skillName: string) => {
  const skill = getSkillByNameOrId(skillName);
  const displayName = skill?.name || skillName.replace(/^\/+/, '');
  return /类案检索分析报告/.test(displayName) ? '类案分析报告' : displayName;
};

const getSkillOwnerLabel = (skillName: string) => {
  const normalizedName = skillName.trim().replace(/^\/+/, '');
  if (normalizedName === 'skill-creator' || normalizedName === 'template-creator') return '系统';
  const skill = getSkillByNameOrId(skillName);
  return skill ? getSkillAuthorName(skill, currentUser.value) : '';
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

type UploadActionId = 'image' | 'file' | 'folder' | 'knowledge';

const uploadActions: Array<{ id: UploadActionId; label: string; icon: typeof Image }> = [
  { id: 'image', label: '上传图片', icon: Image },
  { id: 'file', label: '上传文件', icon: File },
  { id: 'folder', label: '上传文件夹', icon: FolderOpen },
  { id: 'knowledge', label: '从知识库选择', icon: BookOpen },
];

type KnowledgeDraftCollection = 'personal' | 'team' | 'group';

type KnowledgeDraftAsset = {
  id: string;
  name: string;
  meta: string;
  collection: KnowledgeDraftCollection;
  fileCount: number;
  updatedAt: string;
  kind: 'folder' | 'file';
};

const knowledgeDraftAssets = [
  {
    id: 'team-compliance-checklist',
    name: '类案库',
    meta: '1247 份文件 · 更新于 今天',
    collection: 'team',
    fileCount: 1247,
    updatedAt: '今天',
    kind: 'folder',
  },
  {
    id: 'contract-risk-matrix',
    name: '法律法规库',
    meta: '586 份文件 · 更新于 每日同步',
    collection: 'team',
    fileCount: 586,
    updatedAt: '每日同步',
    kind: 'folder',
  },
  {
    id: 'regulatory-response-pack',
    name: '监管问答库',
    meta: '412 份文件 · 更新于 本周',
    collection: 'team',
    fileCount: 412,
    updatedAt: '本周',
    kind: 'folder',
  },
  {
    id: 'law-firm-rules',
    name: '律所内部规范',
    meta: '32 份文件 · 更新于 本月',
    collection: 'team',
    fileCount: 32,
    updatedAt: '本月',
    kind: 'folder',
  },
  {
    id: 'contract-template-base',
    name: '合同范本库',
    meta: '284 份文件 · 更新于 本周',
    collection: 'team',
    fileCount: 284,
    updatedAt: '本周',
    kind: 'folder',
  },
  {
    id: 'due-diligence-report-base',
    name: '尽调报告库',
    meta: '96 份文件 · 更新于 本周',
    collection: 'team',
    fileCount: 96,
    updatedAt: '本周',
    kind: 'folder',
  },
  {
    id: 'training-materials',
    name: '专业培训资料',
    meta: '168 份文件 · 更新于 本月',
    collection: 'team',
    fileCount: 168,
    updatedAt: '本月',
    kind: 'folder',
  },
  {
    id: 'meeting-minutes-base',
    name: '会议纪要与项目资料',
    meta: '74 份文件 · 更新于 昨天',
    collection: 'team',
    fileCount: 74,
    updatedAt: '昨天',
    kind: 'folder',
  },
  {
    id: 'personal-litigation-evidence-index',
    name: '诉讼证据目录模板.docx',
    meta: '个人知识库 / 文书材料',
    collection: 'personal',
    fileCount: 1,
    updatedAt: '本周',
    kind: 'file',
  },
  {
    id: 'personal-consultation-note',
    name: '常用咨询纪要模板.docx',
    meta: '个人知识库 / 咨询记录',
    collection: 'personal',
    fileCount: 1,
    updatedAt: '昨天',
    kind: 'file',
  },
  {
    id: 'personal-risk-summary',
    name: '个人风险摘录表.xlsx',
    meta: '个人知识库 / 风险摘要',
    collection: 'personal',
    fileCount: 1,
    updatedAt: '本月',
    kind: 'file',
  },
  {
    id: 'group-regulatory-pack',
    name: '小组监管问询底稿包',
    meta: '小组知识库 / 合规项目',
    collection: 'group',
    fileCount: 48,
    updatedAt: '今天',
    kind: 'folder',
  },
  {
    id: 'group-project-documents',
    name: '小组项目底稿',
    meta: '小组知识库 / 项目材料',
    collection: 'group',
    fileCount: 76,
    updatedAt: '本周',
    kind: 'folder',
  },
  {
    id: 'group-transaction-playbook',
    name: '交易条线 Playbook',
    meta: '小组知识库 / 交易文件',
    collection: 'group',
    fileCount: 124,
    updatedAt: '本月',
    kind: 'folder',
  },
  {
    id: 'group-dispute-playbook',
    name: '争议解决底稿库',
    meta: '小组知识库 / 诉讼仲裁',
    collection: 'group',
    fileCount: 92,
    updatedAt: '本周',
    kind: 'folder',
  },
] satisfies KnowledgeDraftAsset[];

const selectedKnowledgeDraftIds = ref<string[]>([]);
const activeKnowledgeDraftCollection = ref<KnowledgeDraftCollection>('team');
const knowledgeDraftSearchKeyword = ref('');
const maxKnowledgeDraftSelection = 50;
const selectedKnowledgeDraftAssets = computed(() =>
  knowledgeDraftAssets.filter((asset) => selectedKnowledgeDraftIds.value.includes(asset.id))
);
const knowledgeDraftCollectionTabs = computed(() => [
  { id: 'personal' as const, label: '个人知识库', count: 3 },
  { id: 'team' as const, label: '团队知识库（XX律所）', count: 8 },
  { id: 'group' as const, label: '小组知识库', count: 12 },
]);
const filteredKnowledgeDraftAssets = computed(() => {
  const keyword = knowledgeDraftSearchKeyword.value.trim().toLowerCase();
  return knowledgeDraftAssets.filter((asset) => {
    const matchesCollection = asset.collection === activeKnowledgeDraftCollection.value;
    const matchesKeyword = !keyword || `${asset.name} ${asset.meta}`.toLowerCase().includes(keyword);
    return matchesCollection && matchesKeyword;
  });
});
const knowledgeDraftPickerTitle = '从知识库选择文件';
const knowledgeDraftPickerConfirmText = '添加为本次底稿';
const knowledgeDraftPickerPickModeText = '确认选择';
let pendingAssetPickHandler: ComposerAssetPickHandler | null = null;
let pendingTemplatePickHandler: ComposerTemplatePickHandler | null = null;
const isExternalAssetPickMode = computed(() => Boolean(pendingAssetPickHandler || pendingTemplatePickHandler));
const knowledgeDraftPickerConfirmLabel = computed(() =>
  pendingAssetPickHandler ? knowledgeDraftPickerPickModeText : knowledgeDraftPickerConfirmText,
);

const makeAssetId = (prefix: string, value: string) =>
  `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42) || Date.now().toString(36)}`;

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return '本地文件';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

const createLocalFileAsset = (file: File): SkillCreatorReferenceAsset => ({
  id: `${makeAssetId('local', file.name)}-${file.lastModified || Date.now()}`,
  kind: 'local-file',
  name: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  sourceLabel: formatFileSize(file.size),
});

const createKnowledgeFileAsset = (asset: (typeof knowledgeDraftAssets)[number]): SkillCreatorReferenceAsset => ({
  id: makeAssetId('knowledge', asset.id),
  kind: 'knowledge-file',
  name: asset.name,
  sourceLabel: asset.meta,
});

const createTemplateReferenceAsset = (template: TemplateAsset): SkillCreatorReferenceAsset => ({
  id: makeAssetId('template', template.id),
  kind: 'template',
  name: template.name,
  sourceLabel: template.source,
  templateId: template.id,
});

const toggleActionMenu = () => {
  showActionMenu.value = !showActionMenu.value;
  showWorkspaceMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const toggleDraftMenu = () => {
  showDraftMenu.value = !showDraftMenu.value;
  showWorkspaceMenu.value = false;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const toggleSkillMenu = () => {
  showSkillMenu.value = !showSkillMenu.value;
  showWorkspaceMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const toggleTemplateMenu = () => {
  showTemplateMenu.value = !showTemplateMenu.value;
  showWorkspaceMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
};

const triggerUploadAction = (actionId: UploadActionId) => {
  showWorkspaceMenu.value = false;
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

const clearExternalPickHandlers = () => {
  pendingAssetPickHandler = null;
  pendingTemplatePickHandler = null;
};

const closeKnowledgeDraftPicker = () => {
  showKnowledgeDraftPicker.value = false;
  selectedKnowledgeDraftIds.value = [];
  activeKnowledgeDraftCollection.value = 'team';
  knowledgeDraftSearchKeyword.value = '';
  pendingAssetPickHandler = null;
};

const toggleKnowledgeDraftAsset = (assetId: string) => {
  if (
    !selectedKnowledgeDraftIds.value.includes(assetId)
    && selectedKnowledgeDraftIds.value.length >= maxKnowledgeDraftSelection
  ) {
    return;
  }
  selectedKnowledgeDraftIds.value = selectedKnowledgeDraftIds.value.includes(assetId)
    ? selectedKnowledgeDraftIds.value.filter((id) => id !== assetId)
    : [...selectedKnowledgeDraftIds.value, assetId];
};

const selectKnowledgeDraftCollection = (collection: KnowledgeDraftCollection) => {
  activeKnowledgeDraftCollection.value = collection;
};

const openKnowledgeDraftFileUpload = () => {
  fileInputRef.value?.click();
};

const toComposerPickedAssets = (assets: SkillCreatorReferenceAsset[]): ComposerPickedAsset[] =>
  assets.map((asset) => ({
    name: asset.name,
    sourceLabel: asset.sourceLabel,
    kind: asset.kind,
    templateId: asset.templateId,
  }));

const confirmKnowledgeDraftSelection = () => {
  if (selectedKnowledgeDraftAssets.value.length === 0) return;

  const selectedAssets = selectedKnowledgeDraftAssets.value.map((asset) => createKnowledgeFileAsset(asset));
  const externalHandler = pendingAssetPickHandler;
  showKnowledgeDraftPicker.value = false;
  selectedKnowledgeDraftIds.value = [];
  activeKnowledgeDraftCollection.value = 'team';
  knowledgeDraftSearchKeyword.value = '';
  pendingAssetPickHandler = null;

  if (externalHandler) {
    externalHandler(toComposerPickedAssets(selectedAssets));
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
  const selectedAssets = files.slice(0, 12).map((file) => createLocalFileAsset(file));
  const externalHandler = pendingAssetPickHandler;
  pendingAssetPickHandler = null;

  if (selectedAssets.length && externalHandler) {
    externalHandler(toComposerPickedAssets(selectedAssets));
    input.value = '';
    return;
  }

  if (selectedAssets.length) {
    nextTick(() => {
      insertReferenceAssetTokens(selectedAssets);
    });
  }

  input.value = '';
};

const pickLocalFiles = (handler: ComposerAssetPickHandler) => {
  clearExternalPickHandlers();
  pendingAssetPickHandler = handler;
  fileInputRef.value?.click();
};

const pickKnowledgeDrafts = (
  handler: ComposerAssetPickHandler,
  options: { collection?: KnowledgeDraftCollection } = {},
) => {
  clearExternalPickHandlers();
  pendingAssetPickHandler = handler;
  if (options.collection) {
    activeKnowledgeDraftCollection.value = options.collection;
  }
  selectedKnowledgeDraftIds.value = [];
  knowledgeDraftSearchKeyword.value = '';
  showKnowledgeDraftPicker.value = true;
};

const pickTemplate = (handler: ComposerTemplatePickHandler) => {
  clearExternalPickHandlers();
  pendingTemplatePickHandler = handler;
  showTemplateManageModal.value = true;
};

function renderEditorPlainText(value: string) {
  nextTick(() => {
    const editor = editorRef.value;
    if (!editor || document.activeElement === editor) return;

    editor.textContent = value;
    syncEditorState();
  });
}

const serializeEditorNode = (node: Node, options: { includeInlineTokens?: boolean } = {}): string => {
  const includeInlineTokens = options.includeInlineTokens ?? true;

  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';

  if (node instanceof HTMLElement) {
    if (!includeInlineTokens && node.matches(inlineTokenSelector)) {
      return '';
    }

    if (node.matches('.skill-inline-code')) {
      const skillName = node.dataset.skillName?.trim();
      return skillName ? `/${skillName}` : '';
    }

    if (node.matches('.asset-inline-code')) {
      const kind = (node.dataset.assetKind ?? 'local-file') as SkillCreatorReferenceAssetKind;
      const rawName = node.dataset.assetName ?? node.textContent ?? '';
      const name = rawName.replace(/[「」]/g, '').trim();
      if (!name) return '';
      const label = kind === 'template' ? '模板' : '底稿';
      return `「${label}：${name}」`;
    }
  }

  return Array.from(node.childNodes).map((child) => serializeEditorNode(child, options)).join('');
};

const getEditorText = () => {
  const editor = editorRef.value;
  return (editor ? serializeEditorNode(editor) : '').replace(/\u200b/g, '');
};

const getEditorFreeText = () => {
  const editor = editorRef.value;
  return (editor ? serializeEditorNode(editor, { includeInlineTokens: false }) : '').replace(/\u200b/g, '');
};

const syncEditorState = () => {
  const editor = editorRef.value;
  if (!editor) return;

  const skillTokens = Array.from(editor.querySelectorAll<HTMLElement>('.skill-inline-code'));
  skillTokenCount.value = skillTokens.length;
  firstComposerSkillName.value = skillTokens[0]?.dataset.skillName?.trim() ?? '';
  hasSkillCreatorToken.value = Boolean(editor.querySelector('.skill-inline-code[data-skill-name="skill-creator"]'));
  selectedComposerSkillNames.value = skillTokens
    .map((token) => token.dataset.skillName?.trim() ?? '')
    .filter((skillName) => skillName && skillName !== 'skill-creator' && skillName !== 'template-creator');
  templateTokenCount.value = editor.querySelectorAll(
    '.template-inline-code, .asset-inline-code[data-asset-kind="template"]',
  ).length;
  inputValue.value = getEditorText();
  editorFreeText.value = getEditorFreeText();
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
  const skill = getSkillByNameOrId(skillName);
  const displayName = getSkillDisplayName(skillName);
  const ownerLabel = getSkillOwnerLabel(skillName);
  const usesProfileIdentity = Boolean(skill && shouldUseProfileIdentity(skill));
  const token = document.createElement('code');
  token.className = 'skill-inline-code';
  token.contentEditable = 'false';
  token.tabIndex = 0;
  token.dataset.skillName = skillName;
  token.dataset.skillDisplayName = displayName;
  if (ownerLabel) {
    token.dataset.skillOwner = ownerLabel;
  }
  token.setAttribute('aria-label', ownerLabel ? `已选技能 ${ownerLabel} ${displayName}` : `已选技能 ${displayName}`);

  const avatar = document.createElement('span');
  avatar.className = 'skill-inline-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  if (skill && hasSkillAuthorAvatarImage(skill, currentUser.value)) {
    avatar.classList.add('custom-icon');
    Object.assign(avatar.style, getSkillAuthorAvatarStyle(skill, currentUser.value));
  } else if (skill && usesProfileIdentity) {
    avatar.textContent = getSkillAuthorAvatarText(skill, currentUser.value);
  } else if (skill?.iconDataUrl) {
    avatar.classList.add('custom-icon');
    avatar.style.backgroundImage = `url("${skill.iconDataUrl}")`;
  } else if (skill && ownerLabel) {
    avatar.textContent = getSkillAuthorAvatarText(skill, currentUser.value);
  } else {
    avatar.textContent = displayName.slice(0, 1).toUpperCase();
  }

  const name = document.createElement('span');
  name.className = 'skill-inline-name';
  name.textContent = displayName;

  if (ownerLabel) {
    const owner = document.createElement('span');
    owner.className = 'skill-inline-owner';
    owner.textContent = ownerLabel;

    const divider = document.createElement('span');
    divider.className = 'skill-inline-divider';
    divider.setAttribute('aria-hidden', 'true');
    divider.textContent = '丨';
    token.append(avatar, owner, divider, name);
  } else {
    token.append(avatar, name);
  }
  return token;
};

const createTemplateToken = (template: TemplateAsset) => {
  const token = createReferenceAssetToken(createTemplateReferenceAsset(template));
  token.dataset.templateId = template.id;
  token.setAttribute('aria-label', `已选格式模板 ${template.name}`);
  return token;
};

const ASSET_KIND_META: Record<SkillCreatorReferenceAssetKind, { label: string; badge: string }> = {
  'local-file': { label: '底稿', badge: '底稿' },
  'knowledge-file': { label: '底稿', badge: '底稿' },
  template: { label: '模板', badge: '模板' },
};

const createReferenceAssetToken = (asset: SkillCreatorReferenceAsset) => {
  const meta = ASSET_KIND_META[asset.kind];
  const token = document.createElement('code');
  token.className = 'asset-inline-code';
  token.contentEditable = 'false';
  token.tabIndex = 0;
  token.dataset.assetKind = asset.kind;
  token.dataset.assetName = asset.name;
  token.title = asset.name;
  token.setAttribute('aria-label', `${meta.label} ${asset.name}`);

  const badge = document.createElement('span');
  badge.className = 'asset-inline-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = meta.badge;

  const name = document.createElement('span');
  name.className = 'asset-inline-name';
  name.textContent = asset.name;

  token.append(badge, name);
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

  showWorkspaceMenu.value = false;
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

  showWorkspaceMenu.value = false;
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

const closeSkillCreatorSurfaces = () => {
  showKnowledgeDraftPicker.value = false;
};

const insertTemplatePrompt = (template: TemplateAsset) => {
  insertTemplateToken(template);
  insertPlainTextAtCaret(' ');
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
  const match = beforeCaret.match(/\/([A-Za-z0-9_-]*)$/);
  if (!match) return null;

  const query = match[1] ?? '';
  const startTextOffset = beforeCaret.length - match[0].length;
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
  const match = beforeCaret.match(/@([^\s@/]*)$/u);
  if (!match) return null;

  const query = match[1] ?? '';
  const startTextOffset = beforeCaret.length - match[0].length;
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
  showWorkspaceMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
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
  showWorkspaceMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeSkillRange.value = null;
  inlineSkillQuery.value = '';
  showInlineTemplateMenu.value = true;
  updateInlineShortcutMenuPosition(match.range);
  return true;
};

const updateInlineShortcutMenus = () => {
  if (updateInlineSkillMenu()) return;
  updateInlineTemplateMenu();
};

const transformCompletedShortcutAtCaret = () => {
  const skillMatch = getActiveSkillMatch();
  if (skillMatch && isRegisteredSkillName(skillMatch.query)) {
    insertSkillToken(skillMatch.query, skillMatch.range);
    return true;
  }

  const templateMatch = getActiveTemplateMatch();
  if (templateMatch) {
    const template = findTemplateByShortcutQuery(templateMatch.query);
    if (template) {
      insertTemplateToken(template, templateMatch.range);
      return true;
    }
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
    showWorkspaceMenu.value = false;
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

const closeTemplateManageModal = () => {
  showTemplateManageModal.value = false;
  pendingTemplatePickHandler = null;
};

const triggerSkillAction = (selection?: SkillDropdownSelection) => {
  closeSkillCreatorSurfaces();
  if (selection) {
    insertSkillPrompt(selection);
  }
  showWorkspaceMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const triggerInlineSkillAction = (selection?: SkillDropdownSelection) => {
  if (selection) {
    insertSkillToken(selection, activeSkillRange.value);
  }
  showWorkspaceMenu.value = false;
  showSkillMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const triggerTemplateAction = (template: TemplateAsset) => {
  const externalHandler = pendingTemplatePickHandler;
  showTemplateManageModal.value = false;
  pendingTemplatePickHandler = null;

  if (externalHandler) {
    externalHandler(template);
    return;
  }

  if (hasSkillCreatorCommand.value) {
    nextTick(() => {
      insertReferenceAssetTokens([createTemplateReferenceAsset(template)]);
    });
    return;
  }

  insertTemplatePrompt(template);
};

const triggerInlineTemplateAction = (template: TemplateAsset) => {
  insertTemplateToken(template, activeTemplateRange.value);
};

const openTemplateLibrary = () => {
  showWorkspaceMenu.value = false;
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  showTemplateManageModal.value = true;
};

const createTemplateFromDropdown = () => {
  showWorkspaceMenu.value = false;
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showKnowledgeDraftPicker.value = false;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  pendingTemplatePickHandler = null;
  showTemplateManageModal.value = false;
  nextTick(() => {
    insertPlainTextAtCaret(selectedAssetPromptPrefix);
    insertSkillToken('template-creator');
    insertPlainTextAtCaret(templateCreatorPromptSuffix);
  });
};

const openSkillManageModal = () => {
  showWorkspaceMenu.value = false;
  showSkillMenu.value = false;
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

const submitSkillCreatorPromptFromModal = (prompt: string) => {
  showSkillManageModal.value = false;
  skillManageStartsInCreate.value = false;
  closeSkillCreatorSurfaces();
  showWorkspaceMenu.value = false;
  showSkillMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  inputValue.value = '';
  renderEditorPlainText('');
  emit('submit', prompt.trim(), {
    thinkingMode: selectedThinkingMode.value,
    workspaceId: activeWorkspaceId.value,
    workspace: selectedWorkspace.value,
  });
};

const createSkillFromModal = (skillName = 'skill-creator') => {
  if (/\/skill-creator\b/i.test(skillName) && skillName.trim().includes('\n')) {
    submitSkillCreatorPromptFromModal(skillName);
    return;
  }

  showSkillManageModal.value = false;
  skillManageStartsInCreate.value = false;
  closeSkillCreatorSurfaces();
  if (skillName === 'skill-creator') {
    nextTick(() => {
      activeSkillRange.value = null;
      showInlineTemplateMenu.value = false;
      activeTemplateRange.value = null;
      inlineTemplateQuery.value = '';
      insertSkillPrompt(skillName);
    });
    return;
  }

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
  const prompt = getEditorText().trim();

  emit('submit', prompt, {
    thinkingMode: selectedThinkingMode.value,
    workspaceId: activeWorkspaceId.value,
    workspace: selectedWorkspace.value,
  });
};

defineExpose({
  createSkillFromModal,
  createTemplateFromDropdown,
  pickLocalFiles,
  pickKnowledgeDrafts,
  pickTemplate,
});

// Close dropdown when clicking outside
const closeDropdown = () => {
  showWorkspaceMenu.value = false;
  showActionMenu.value = false;
  showDraftMenu.value = false;
  showSkillMenu.value = false;
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
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div class="chat-input-shell">
    <div class="chat-input-panel" :class="{ 'without-workspace': !shouldShowWorkspaceSelector }">
      <div v-if="shouldShowWorkspaceSelector" class="composer-workspace-row">
        <div class="workspace-menu" @click.stop>
          <input
            ref="workspaceInputRef"
            class="native-file-input"
            type="file"
            webkitdirectory
            directory
            multiple
            @change="handleWorkspaceDirectorySelection"
          />
          <button
            class="workspace-trigger"
            type="button"
            aria-label="选择工作区"
            :aria-expanded="showWorkspaceMenu"
            aria-haspopup="menu"
            @click="toggleWorkspaceMenu"
          >
            <FolderOpen :size="15" class="workspace-trigger-icon" />
            <span class="workspace-trigger-label">{{ selectedWorkspaceLabel }}</span>
            <ChevronDown :size="14" class="workspace-trigger-chevron" />
          </button>

          <div v-if="showWorkspaceMenu" class="action-dropdown workspace-dropdown" role="menu">
            <section class="action-group workspace-action-group" aria-label="工作区选择">
              <button
                v-for="workspace in workspaces"
                :key="workspace.id"
                class="action-menu-item"
                :class="{
                  selected: activeWorkspaceId === workspace.id,
                  'has-description': getWorkspaceDescription(workspace),
                }"
                type="button"
                @click.stop="selectWorkspace(workspace.id)"
              >
                <FolderOpen :size="15" class="action-icon" />
                <span class="action-item-copy">
                  <span class="action-item-label">{{ workspace.name }}</span>
                  <span v-if="getWorkspaceDescription(workspace)" class="action-item-desc">
                    {{ getWorkspaceDescription(workspace) }}
                  </span>
                </span>
                <Check v-if="activeWorkspaceId === workspace.id" :size="15" class="check-icon" />
              </button>
              <button
                class="action-menu-item has-description"
                :class="{ selected: activeWorkspaceId === STANDALONE_WORKSPACE_ID }"
                type="button"
                @click.stop="selectNoWorkspace"
              >
                <X :size="15" class="action-icon" />
                <span class="action-item-copy">
                  <span class="action-item-label">从零开始</span>
                  <span class="action-item-desc">不使用任何本地或云端文件夹、文件，全部从空白上下文开始</span>
                </span>
                <Check v-if="activeWorkspaceId === STANDALONE_WORKSPACE_ID" :size="15" class="check-icon" />
              </button>
              <button
                class="action-menu-item has-description"
                type="button"
                @click.stop="openWorkspaceDirectoryPicker"
              >
                <FolderOpen :size="15" class="action-icon" />
                <span class="action-item-copy">
                  <span class="action-item-label">使用本地文件夹新建</span>
                  <span class="action-item-desc">选择本地目录作为工作空间</span>
                </span>
              </button>
              <button
                class="action-menu-item has-description"
                type="button"
                @click.stop="openKnowledgeWorkspacePicker"
              >
                <BookOpen :size="15" class="action-icon" />
                <span class="action-item-copy">
                  <span class="action-item-label">从知识库新建</span>
                  <span class="action-item-desc">选择知识库文件作为本次工作空间素材</span>
                </span>
              </button>
            </section>
          </div>
        </div>
      </div>

      <div
        ref="inputContainerRef"
        class="chat-input-container"
        :class="{ 'has-skill-followup': showSkillFollowupHint }"
        @click.self="focusEditorFromShell()"
      >
      <span v-if="!hasComposerContent" class="chat-editor-placeholder" aria-hidden="true">
        {{ placeholderText() }}
      </span>
      <span v-else-if="showSkillFollowupHint" class="chat-editor-placeholder skill-followup-hint" aria-hidden="true">
        {{ skillFollowupHintText }}
      </span>
      <div
        ref="editorRef"
        class="chat-editor-row"
        role="textbox"
        aria-label="输入内容"
        :aria-placeholder="activeEditorPlaceholder"
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
        show-search
        :show-manage="false"
        @select="triggerInlineSkillAction"
      />
    </div>

    <div
      v-if="showInlineTemplateMenu"
      class="inline-template-dropdown"
      role="menu"
      :style="{ left: `${inlineShortcutMenuPosition.left}px`, top: `${inlineShortcutMenuPosition.top}px` }"
      @mousedown.prevent
      @click.stop
    >
      <TemplateDropdownContent
        :inline-query="inlineTemplateQuery"
        show-search
        :show-manage="false"
        :show-create="false"
        @select="triggerInlineTemplateAction"
      />
    </div>

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
            <LawAgentsNavIcon kind="settings" :size="16" />
          </button>

          <div v-if="showActionMenu" class="action-dropdown" role="menu">
            <section class="action-group" aria-label="推理方式">
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

            <section class="action-group" aria-label="检索来源">
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
            <LawAgentsNavIcon kind="attach" :size="16" class="text-tool-icon" />
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
            <LawAgentsNavIcon kind="skills" :size="16" class="text-tool-icon" />
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
            <LawAgentsNavIcon kind="templates" :size="16" class="text-tool-icon" />
            <span>模板</span>
          </button>
        </div>

      </div>

      <div class="right-actions">
        <button class="icon-tool-btn" type="button" aria-label="语音输入">
          <LawAgentsNavIcon kind="mic" :size="16" />
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
          <LawAgentsNavIcon v-else kind="send" :size="14" />
        </button>
      </div>
    </div>
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
            <div class="knowledge-draft-title-row">
              <h2 id="knowledge-draft-title">{{ knowledgeDraftPickerTitle }}</h2>
              <p>选择已沉淀的资料作为本次会话底稿，支持文件夹整夹检索或精确选文件</p>
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

          <section class="knowledge-draft-toolbar" aria-label="浏览知识库">
            <div class="knowledge-draft-toolbar-title">
              <span class="knowledge-draft-toolbar-icon">
                <Info :size="18" />
              </span>
              <strong>浏览知识库</strong>
            </div>
            <label class="knowledge-draft-search">
              <Search :size="17" />
              <input v-model="knowledgeDraftSearchKeyword" type="text" placeholder="搜索文档标题、内容..." />
            </label>
            <button class="knowledge-draft-upload" type="button" @click="openKnowledgeDraftFileUpload">
              <Plus :size="17" />
              <span>上传本地文件</span>
            </button>
          </section>

          <nav class="knowledge-draft-tabs" aria-label="知识库来源">
            <button
              v-for="tab in knowledgeDraftCollectionTabs"
              :key="tab.id"
              class="knowledge-draft-tab"
              :class="{ active: activeKnowledgeDraftCollection === tab.id }"
              type="button"
              @click="selectKnowledgeDraftCollection(tab.id)"
            >
              <span>{{ tab.label }}</span>
              <strong>{{ tab.count }}</strong>
            </button>
          </nav>

          <div class="knowledge-draft-browser">
            <section class="knowledge-draft-main" aria-label="知识库文件列表">
              <h3>{{ knowledgeDraftCollectionTabs.find((tab) => tab.id === activeKnowledgeDraftCollection)?.label }}</h3>
              <div class="knowledge-draft-list" role="listbox" aria-label="知识库底稿列表">
                <button
                  v-for="asset in filteredKnowledgeDraftAssets"
                  :key="asset.id"
                  class="knowledge-draft-item"
                  :class="{ selected: selectedKnowledgeDraftIds.includes(asset.id) }"
                  type="button"
                  role="option"
                  :aria-selected="selectedKnowledgeDraftIds.includes(asset.id)"
                  @click="toggleKnowledgeDraftAsset(asset.id)"
                >
                  <span class="knowledge-draft-add">
                    <Check v-if="selectedKnowledgeDraftIds.includes(asset.id)" :size="16" />
                    <Plus v-else :size="16" />
                  </span>
                  <span class="knowledge-draft-folder-icon">
                    <FolderOpen v-if="asset.kind === 'folder'" :size="23" />
                    <FileText v-else :size="21" />
                  </span>
                  <span class="knowledge-draft-copy">
                    <strong>{{ asset.name }}</strong>
                    <small>{{ asset.meta }}</small>
                  </span>
                  <ArrowRight :size="16" class="knowledge-draft-chevron" />
                </button>

                <p v-if="filteredKnowledgeDraftAssets.length === 0" class="knowledge-draft-empty-list">
                  未找到匹配文件
                </p>
              </div>
            </section>

            <aside class="knowledge-draft-selected" aria-label="已选择文件">
              <header>
                <span>已选择</span>
                <strong>{{ selectedKnowledgeDraftAssets.length }}</strong>
                <span>/{{ maxKnowledgeDraftSelection }}</span>
              </header>

              <div v-if="selectedKnowledgeDraftAssets.length" class="knowledge-draft-selected-list">
                <button
                  v-for="asset in selectedKnowledgeDraftAssets"
                  :key="`selected-${asset.id}`"
                  class="knowledge-draft-selected-item"
                  type="button"
                  @click="toggleKnowledgeDraftAsset(asset.id)"
                >
                  <span>{{ asset.name }}</span>
                  <X :size="14" />
                </button>
              </div>
              <div v-else class="knowledge-draft-empty-state">
                <span class="knowledge-draft-empty-icon">
                  <FolderOpen :size="28" />
                </span>
                <strong>暂未选择</strong>
                <p>点击左侧文件 / 文件夹左边的 + 即可添加</p>
              </div>
            </aside>
          </div>

          <footer class="knowledge-draft-footer">
            <span class="knowledge-draft-tip">
              <Info :size="15" />
              点击行最左侧的 + 即可添加 · 文件夹支持“整夹检索”或下钻选具体文件
            </span>
            <span class="knowledge-draft-selected-count">
              已选 <strong>{{ selectedKnowledgeDraftAssets.length }}</strong> 项
            </span>
            <button
              type="button"
              class="knowledge-draft-primary"
              :disabled="selectedKnowledgeDraftAssets.length === 0"
              @click="confirmKnowledgeDraftSelection"
            >
              {{ knowledgeDraftPickerConfirmLabel }}
            </button>
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

</template>

<style scoped>
.chat-input-shell {
  width: 100%;
}

.chat-input-panel {
  width: 100%;
  min-height: 158px;
  padding: 10px 4px 4px;
  border: 1px solid #eef0f3;
  border-radius: 18px;
  background: #f4f5f7;
  box-shadow: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.chat-input-panel:focus-within {
  border-color: #e2e8f0;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
}

.chat-input-panel.without-workspace {
  padding-top: 10px;
}

.composer-workspace-row {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 4px 8px;
}

.chat-input-container {
  position: relative;
  min-height: 116px;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.015);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.chat-input-container:focus-within {
  border-color: rgba(100, 116, 139, 0.26);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.025);
}

.chat-editor-row {
  flex: 1;
  min-height: 68px;
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
  top: 12px;
  left: 14px;
  right: 14px;
  z-index: 0;
  color: var(--text-muted);
  pointer-events: none;
  user-select: none;
  font-size: 16px;
  line-height: 24px;
  overflow-wrap: anywhere;
}

.skill-followup-hint {
  top: 54px;
  color: color-mix(in srgb, var(--text-muted) 88%, transparent);
  font-size: 14px;
  line-height: 22px;
}

.chat-input-container.has-skill-followup .skill-followup-hint {
  top: 52px;
  left: 20px;
  right: 20px;
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
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 4px;
  padding: 2px 9px 2px 5px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #ffffff;
  color: #111827;
  font-family: inherit;
  font-size: 15px;
  font-weight: 620;
  line-height: 1.2;
  vertical-align: middle;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  white-space: nowrap;
  user-select: all;
}

.chat-editor-row :deep(.skill-inline-avatar) {
  width: 23px;
  height: 23px;
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
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.14);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.chat-editor-row :deep(.skill-inline-avatar.custom-icon) {
  background-position: center;
  background-size: cover;
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
  gap: 6px;
  margin: 0 4px;
  padding: 0 9px 0 4px;
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

.chat-editor-row :deep(.asset-inline-badge) {
  flex: 0 0 auto;
  height: 20px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: #eef1f5;
  color: #334155;
  box-shadow: inset 0 0 0 1px rgba(51, 65, 85, 0.18);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1;
  white-space: nowrap;
}

.chat-editor-row :deep(.asset-inline-code[data-asset-kind="template"]) .asset-inline-badge {
  background: #ece9e2;
  color: #4a4032;
  box-shadow: inset 0 0 0 1px rgba(74, 64, 50, 0.2);
}

.chat-editor-row :deep(.asset-inline-name) {
  min-width: 0;
  max-width: 220px;
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
  gap: 8px;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
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

.workspace-menu {
  position: relative;
  z-index: 5;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 0;
}

.workspace-trigger {
  max-width: min(390px, 100%);
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  transition: border-color 0.16s, background-color 0.16s, color 0.16s;
}

.workspace-trigger:hover,
.workspace-trigger[aria-expanded="true"] {
  border-color: rgba(148, 163, 184, 0.2);
  background: var(--card-bg);
  color: var(--text-main);
}

.workspace-trigger-icon,
.workspace-trigger-chevron {
  flex: 0 0 auto;
  color: currentColor;
}

.workspace-trigger-prefix {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.workspace-trigger-label {
  min-width: 0;
  overflow: hidden;
  color: currentColor;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-trigger-chevron {
  transition: transform 0.16s;
}

.workspace-trigger[aria-expanded="true"] .workspace-trigger-chevron {
  transform: rotate(180deg);
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
.workspace-trigger:focus-visible,
.text-tool-btn:focus-visible,
.send-btn:focus-visible,
.action-menu-item:focus-visible,
.knowledge-draft-close:focus-visible,
.knowledge-draft-tab:focus-visible,
.knowledge-draft-search input:focus-visible,
.knowledge-draft-upload:focus-visible,
.knowledge-draft-item:focus-visible,
.knowledge-draft-selected-item:focus-visible,
.knowledge-draft-primary:focus-visible {
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
  padding: 24px;
  background: rgba(15, 23, 42, 0.36);
}

.knowledge-draft-modal {
  width: min(960px, calc(100vw - 72px));
  height: min(640px, calc(100vh - 72px));
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
  overflow: hidden;
}

.knowledge-draft-header,
.knowledge-draft-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.knowledge-draft-header {
  min-height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-soft);
}

.knowledge-draft-title-row {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.knowledge-draft-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
}

.knowledge-draft-title-row p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.knowledge-draft-close {
  width: 30px;
  height: 30px;
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

.knowledge-draft-toolbar {
  min-height: 62px;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(260px, 330px) auto;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border-soft);
}

.knowledge-draft-toolbar-title {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 800;
}

.knowledge-draft-toolbar-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--primary-color);
  background: var(--primary-soft);
}

.knowledge-draft-search {
  min-width: 0;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-muted);
  background: var(--surface-muted);
}

.knowledge-draft-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: var(--text-main);
  background: transparent;
  font-size: 14px;
}

.knowledge-draft-search input::placeholder {
  color: var(--text-muted);
}

.knowledge-draft-upload,
.knowledge-draft-primary {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.knowledge-draft-upload:hover,
.knowledge-draft-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary-color) 14%, var(--card-bg));
}

.knowledge-draft-tabs {
  min-height: 46px;
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-soft);
}

.knowledge-draft-tab {
  position: relative;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.knowledge-draft-tab strong {
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 11px;
  font-weight: 800;
}

.knowledge-draft-tab.active {
  color: var(--primary-color);
}

.knowledge-draft-tab.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 999px;
  background: var(--primary-color);
}

.knowledge-draft-browser {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 282px;
  background: var(--card-bg);
}

.knowledge-draft-main {
  min-width: 0;
  min-height: 0;
  padding: 14px 10px 14px 12px;
  overflow-y: auto;
}

.knowledge-draft-main h3 {
  margin: 2px 5px 12px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.knowledge-draft-list {
  display: grid;
  gap: 7px;
}

.knowledge-draft-item {
  min-height: 52px;
  display: grid;
  grid-template-columns: 28px 34px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 9px;
  padding: 5px 12px 5px 9px;
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

.knowledge-draft-add {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  color: var(--primary-color);
  background: var(--card-bg);
}

.knowledge-draft-item.selected .knowledge-draft-add {
  color: var(--on-primary);
  background: var(--primary-color);
}

.knowledge-draft-folder-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #475569;
  background: #fff2bd;
}

.knowledge-draft-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.knowledge-draft-copy strong,
.knowledge-draft-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-draft-copy strong {
  font-size: 13px;
  font-weight: 800;
}

.knowledge-draft-copy small {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
}

.knowledge-draft-chevron {
  color: var(--text-muted);
}

.knowledge-draft-empty-list {
  margin: 32px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

.knowledge-draft-selected {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-soft);
  background: var(--surface-muted);
}

.knowledge-draft-selected header {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border-soft);
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 800;
}

.knowledge-draft-selected header strong {
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 12px;
}

.knowledge-draft-selected-list {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
}

.knowledge-draft-selected-item {
  min-height: 38px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  text-align: left;
}

.knowledge-draft-selected-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-draft-selected-item svg {
  color: var(--text-muted);
}

.knowledge-draft-empty-state {
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  color: var(--text-muted);
  text-align: center;
}

.knowledge-draft-empty-icon {
  width: 50px;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--text-muted);
  background: var(--card-bg);
}

.knowledge-draft-empty-state strong {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 800;
}

.knowledge-draft-empty-state p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.knowledge-draft-footer {
  min-height: 44px;
  padding: 0 14px;
  border-top: 1px solid var(--border-soft);
  color: var(--text-muted);
  font-size: 12px;
}

.knowledge-draft-tip,
.knowledge-draft-selected-count {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.knowledge-draft-tip {
  flex: 1;
}

.knowledge-draft-tip svg {
  color: #f59e0b;
}

.knowledge-draft-selected-count strong {
  color: var(--primary-color);
  font-weight: 850;
}

.knowledge-draft-primary {
  min-width: 134px;
  background: var(--card-bg);
}

.knowledge-draft-primary:disabled {
  cursor: default;
  color: var(--text-muted);
  border-color: var(--border-color);
  background: var(--card-bg);
  opacity: 0.68;
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

.workspace-dropdown {
  top: calc(100% + 8px);
  bottom: auto;
  width: max-content;
  min-width: 158px;
  max-width: min(260px, calc(100vw - 24px));
  max-height: none;
  overflow: visible;
}

.workspace-action-group {
  width: max-content;
  min-width: 100%;
  padding: 0;
}

.workspace-menu .action-menu-item {
  position: relative;
  width: max-content;
  min-width: 100%;
  padding-right: 9px;
}

.workspace-menu .action-menu-item.has-description {
  height: 32px;
  min-height: 32px;
}

.workspace-menu .action-item-copy {
  flex: 0 0 auto;
}

.workspace-menu .action-item-desc {
  position: absolute;
  top: 50%;
  left: calc(100% + 12px);
  z-index: 220;
  width: max-content;
  max-width: 320px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--card-bg);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-50%) translateX(-4px);
  pointer-events: none;
  transition:
    opacity 0.14s ease,
    transform 0.14s ease,
    visibility 0.14s ease;
}

.workspace-menu .action-item-desc::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -5px;
  width: 10px;
  height: 10px;
  background: var(--card-bg);
  transform: translateY(-50%) rotate(45deg);
}

.workspace-menu .action-menu-item:hover .action-item-desc,
.workspace-menu .action-menu-item:focus-visible .action-item-desc {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
}

.skill-dropdown,
.template-dropdown {
  width: 300px;
  max-height: min(392px, calc(100vh - 240px));
  overflow: hidden;
  border-color: var(--border-color);
  border-radius: 12px;
}

.inline-skill-dropdown,
.inline-template-dropdown {
  top: auto;
  bottom: auto;
  width: 300px;
  max-height: 320px;
  overflow: hidden;
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
  height: 32px;
  min-height: 32px;
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
  padding: 0 8px;
}

.action-item-copy {
  min-width: 0;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
}

.action-item-label {
  flex: 0 0 auto;
  color: currentColor;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.1;
}

.action-item-desc {
  overflow: hidden;
  min-width: 0;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  .chat-input-panel {
    min-height: auto;
    padding: 8px 4px 4px;
    border-radius: 16px;
  }

  .composer-workspace-row {
    min-height: 26px;
    padding: 0 2px 7px;
  }

  .chat-input-container {
    min-height: 112px;
    border-radius: 13px;
  }

  .workspace-trigger {
    max-width: min(100%, calc(100vw - 52px));
  }

  .chat-editor-row :deep(.skill-inline-code) {
    max-width: min(100%, calc(100vw - 52px));
    min-height: 29px;
    gap: 6px;
    margin: 1px 3px;
    padding: 2px 8px 2px 5px;
    font-size: 14px;
  }

  .chat-editor-row :deep(.skill-inline-avatar) {
    width: 22px;
    height: 22px;
  }

  .chat-editor-row :deep(.skill-inline-name) {
    max-width: 150px;
  }

  .chat-editor-row :deep(.asset-inline-code) {
    max-width: min(100%, calc(100vw - 52px));
    min-height: 29px;
    gap: 6px;
    margin: 1px 3px;
    padding: 2px 9px 2px 4px;
    font-size: 14px;
  }

  .chat-editor-row :deep(.asset-inline-badge) {
    height: 19px;
    padding: 0 6px;
    font-size: 10.5px;
  }

  .chat-editor-row :deep(.asset-inline-name) {
    max-width: 150px;
  }

  .chat-input-container .input-actions {
    flex-wrap: nowrap;
    gap: 6px;
    overflow: hidden;
  }

  .chat-input-container .input-actions .left-actions {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    flex-wrap: nowrap;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .chat-input-container .input-actions .left-actions::-webkit-scrollbar {
    display: none;
  }

  .chat-input-container .input-actions .right-actions {
    flex: 0 0 auto;
    width: auto;
    justify-content: flex-end;
    gap: 6px;
  }

  .config-btn,
  .icon-tool-btn {
    width: 32px;
    height: 32px;
  }

  .text-tool-btn {
    height: 32px;
    padding: 0 6px;
    gap: 4px;
    font-size: 13px;
  }

  .send-btn {
    width: 32px;
    height: 32px;
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

  .workspace-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    bottom: auto;
    left: 0;
    width: min(264px, calc(100vw - 44px));
    max-height: min(220px, calc(100vh - 24px));
  }

  .skill-dropdown,
  .template-dropdown {
    --dropdown-x: -50%;
    left: 50%;
    width: min(300px, calc(100vw - 32px));
  }

  .knowledge-draft-backdrop {
    padding: 0;
  }

  .knowledge-draft-modal {
    width: 100vw;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
  }

  .knowledge-draft-header {
    min-height: auto;
    align-items: flex-start;
    padding: 14px;
  }

  .knowledge-draft-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .knowledge-draft-toolbar {
    grid-template-columns: 1fr;
    padding: 12px 14px;
  }

  .knowledge-draft-tabs {
    gap: 8px;
    overflow-x: auto;
    padding: 0 14px;
  }

  .knowledge-draft-tab {
    flex: 0 0 auto;
  }

  .knowledge-draft-browser {
    grid-template-columns: 1fr;
  }

  .knowledge-draft-selected {
    display: none;
  }

  .knowledge-draft-footer {
    min-height: auto;
    align-items: stretch;
    flex-direction: column;
    padding: 10px 14px;
  }

  .knowledge-draft-primary {
    width: 100%;
  }

}
</style>
