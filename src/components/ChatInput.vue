<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Brain,
  ChevronDown,
  File,
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
  Plus,
  Puzzle,
  X,
  Zap,
} from 'lucide-vue-next';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import SkillDropdownContent from './SkillDropdownContent.vue';
import type { SkillDropdownSelection } from './SkillDropdownContent.vue';
import SkillManageModal from './SkillManageModal.vue';
import { availableSkills, isRegisteredSkillName } from '../data/skillCatalog';
import {
  defaultTemplateAssets,
  type TemplateAsset,
} from '../data/legalAssets';

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [value: string];
}>();

const inputValue = ref('');
const showActionMenu = ref(false);
const showSkillMenu = ref(false);
const showTemplateMenu = ref(false);
const showThinkingMenu = ref(false);
const showInlineSkillMenu = ref(false);
const showInlineTemplateMenu = ref(false);
const showSkillManageModal = ref(false);
const skillManageStartsInCreate = ref(false);
const showTemplateManageModal = ref(false);
const showSkillCreatorGuide = ref(false);
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
const inlineShortcutMenuPosition = ref({ left: 16, top: 48 });
const selectedAssetPromptPrefix = '请使用 ';
const skillPromptSuffix = ' 帮我完成以下任务，我的需求如下：';
const skillCreatorPromptSuffix = ' 帮我创建一个可复用的技能，我的需求如下：';
const templatePromptSuffix = ' 帮我按照这个格式模板完成写作，我的需求/源文件如下：';
const templateCreatorPromptSuffix = ' 帮我创建一个可复用的输出格式模板，我的需求/源文件如下：';
const inlineTokenSelector = '.skill-inline-code, .template-inline-code';

type SkillCreatorField = 'scenario' | 'source' | 'output' | 'scope';

type SkillCreatorOption = {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
};

type SkillCreatorStep = {
  field: SkillCreatorField;
  title: string;
  eyebrow: string;
  options: SkillCreatorOption[];
};

const skillCreatorSteps: SkillCreatorStep[] = [
  {
    field: 'scenario',
    eyebrow: '1 / 4',
    title: '这项技能主要服务哪类工作？',
    options: [
      {
        id: 'contract',
        label: '合同 / 交易文件',
        description: '起草、审查、条款改写、交易文件交付。',
      },
      {
        id: 'due-diligence',
        label: '尽职调查',
        description: '资料清单、底稿整理、访谈提纲、风险矩阵。',
      },
      {
        id: 'consulting',
        label: '咨询意见',
        description: '法律备忘录、法律意见、专项分析和回复。',
      },
      {
        id: 'investment-ma',
        label: '投融资 / 并购',
        description: 'Term Sheet、SPA、交割、披露和交易支持。',
      },
      {
        id: 'capital-market',
        label: '资本市场',
        description: 'IPO 核查、申报文件、补充法律意见。',
      },
      {
        id: 'fund-compliance',
        label: '基金 / 合规',
        description: '基金文件、合规审查、日常管理和咨询回复。',
      },
      {
        id: 'other',
        label: '其他法律工作流',
        description: '先生成通用技能草稿，再补充具体场景。',
      },
    ],
  },
  {
    field: 'source',
    eyebrow: '2 / 4',
    title: '技能运行时主要读取什么材料？',
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
        id: 'plain-description',
        label: '纯文字描述规则',
        description: '暂时没有固定资料，用自然语言描述流程和要求。',
      },
    ],
  },
  {
    field: 'output',
    eyebrow: '3 / 4',
    title: '希望这项技能稳定产出什么？',
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
        id: 'draft-only',
        label: '先生成草稿不发布',
        description: '只生成技能草稿，发布范围等确认后再决定。',
      },
    ],
  },
];

const initialSkillCreatorSelections = () =>
  Object.fromEntries(
    skillCreatorSteps.map((step) => [step.field, step.options[0]?.id ?? ''])
  ) as Record<SkillCreatorField, string>;

const initialCustomSkillCreatorInputs = () =>
  Object.fromEntries(skillCreatorSteps.map((step) => [step.field, ''])) as Record<SkillCreatorField, string>;

const skillCreatorSelections = ref<Record<SkillCreatorField, string>>(initialSkillCreatorSelections());
const customSkillCreatorInputs = ref<Record<SkillCreatorField, string>>(initialCustomSkillCreatorInputs());

type SkillSlashMatch = {
  query: string;
  range: Range;
};

type TemplateShortcutMatch = SkillSlashMatch;

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
  showThinkingMenu.value = false;
};

const selectedThinkingModeItem = computed(() =>
  thinkingModes.find((mode) => mode.id === selectedThinkingMode.value) ?? thinkingModes[0]!
);

// Multi-select mode: users can enable multiple search modes
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));

const searchModes = [
  { id: 'legal', label: '法律搜索', icon: Scale },
  { id: 'web', label: '联网搜索', icon: Globe },
  { id: 'academic', label: '学术搜索', icon: GraduationCap },
  { id: 'knowledge', label: '知识库搜索', icon: KnowledgeSearchIcon },
  { id: 'other', label: '其他搜索', icon: MessageCircle },
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

const selectedSearchModes = computed(() =>
  searchModes.filter((mode) => enabledSearchModes.value.has(mode.id))
);

const hasComposerContent = computed(() =>
  inputValue.value.trim().length > 0 || skillTokenCount.value > 0 || templateTokenCount.value > 0
);

const isSkillCreatorSubmission = computed(() => hasSkillCreatorToken.value && hasComposerContent.value);

const activeSkillCreatorStep = computed(() => skillCreatorSteps[skillCreatorGuideStep.value] ?? skillCreatorSteps[0]!);

const selectedSkillCreatorSummary = computed(() =>
  skillCreatorSteps.map((step) => {
    return {
      field: step.field,
      label: selectedSkillCreatorChoice(step).label,
    };
  })
);

const removeSearchMode = (modeId: string) => {
  enabledSearchModes.value.delete(modeId);
};

type UploadActionId = 'image' | 'file' | 'folder';

const uploadActions: Array<{ id: UploadActionId; label: string; icon: typeof Image }> = [
  { id: 'image', label: '添加图片', icon: Image },
  { id: 'file', label: '添加文件', icon: File },
  { id: 'folder', label: '添加文件夹', icon: FolderOpen },
];

const toggleActionMenu = () => {
  showActionMenu.value = !showActionMenu.value;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const toggleSkillMenu = () => {
  showSkillMenu.value = !showSkillMenu.value;
  if (!showSkillMenu.value) {
    showSkillCreatorGuide.value = false;
  }
  showActionMenu.value = false;
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const toggleTemplateMenu = () => {
  showTemplateMenu.value = !showTemplateMenu.value;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const toggleThinkingMenu = () => {
  showThinkingMenu.value = !showThinkingMenu.value;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const triggerUploadAction = (actionId: UploadActionId) => {
  showActionMenu.value = false;

  const inputMap: Record<UploadActionId, HTMLInputElement | null> = {
    image: imageInputRef.value,
    file: fileInputRef.value,
    folder: folderInputRef.value,
  };

  inputMap[actionId]?.click();
};

const handleLocalFileSelection = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;

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

const getEditorText = () => {
  return (editorRef.value?.textContent ?? '').replace(/\u200b/g, '');
};

const syncEditorState = () => {
  const editor = editorRef.value;
  if (!editor) return;

  skillTokenCount.value = editor.querySelectorAll('.skill-inline-code').length;
  hasSkillCreatorToken.value = Boolean(editor.querySelector('.skill-inline-code[data-skill-name="skill-creator"]'));
  templateTokenCount.value = editor.querySelectorAll('.template-inline-code').length;
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
  const token = document.createElement('code');
  token.className = 'skill-inline-code';
  token.contentEditable = 'false';
  token.tabIndex = 0;
  token.dataset.skillName = skillName;
  token.textContent = `/${skillName}`;
  token.setAttribute('aria-label', `已选技能 ${skillName}`);
  return token;
};

const createTemplateToken = (template: TemplateAsset) => {
  const token = document.createElement('code');
  token.className = 'template-inline-code';
  token.contentEditable = 'false';
  token.tabIndex = 0;
  token.dataset.templateId = template.id;
  token.textContent = `格式模板：${template.name}`;
  token.setAttribute('aria-label', `已选格式模板 ${template.name}`);
  return token;
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
  insertPlainTextAtCaret(selectedAssetPromptPrefix);
  insertSkillToken(skillName);
  insertPlainTextAtCaret(skillName === 'skill-creator' ? skillCreatorPromptSuffix : skillPromptSuffix);
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
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showInlineTemplateMenu.value = false;
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
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
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
  skillCreatorGuideStep.value = 0;
  skillCreatorSelections.value = initialSkillCreatorSelections();
  customSkillCreatorInputs.value = initialCustomSkillCreatorInputs();
};

const openSkillCreatorGuide = () => {
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = true;
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  showTemplateManageModal.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineSkillQuery.value = '';
  inlineTemplateQuery.value = '';
  resetSkillCreatorGuide();
};

const closeSkillCreatorGuide = () => {
  showSkillCreatorGuide.value = false;
};

const backToSkillListFromGuide = () => {
  showSkillCreatorGuide.value = false;
  openSkillManageModal();
};

const isFinalSkillCreatorStep = () => skillCreatorGuideStep.value === skillCreatorSteps.length - 1;

const selectSkillCreatorOption = (field: SkillCreatorField, optionId: string) => {
  skillCreatorSelections.value = {
    ...skillCreatorSelections.value,
    [field]: optionId,
  };

  if (field !== activeSkillCreatorStep.value.field) return;

  if (isFinalSkillCreatorStep()) {
    insertGuidedSkillCreatorPrompt();
    return;
  }

  skillCreatorGuideStep.value += 1;
};

const selectedSkillCreatorChoice = (step: SkillCreatorStep) => {
  if (skillCreatorSelections.value[step.field] === 'custom') {
    const customValue = customSkillCreatorInputs.value[step.field].trim();
    if (customValue) {
      return {
        label: customValue,
        description: '用户自行输入的补充需求。',
      };
    }
  }

  return step.options.find((option) => option.id === skillCreatorSelections.value[step.field]) ?? step.options[0]!;
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
  if (!customSkillCreatorInputs.value[field].trim()) return;

  skillCreatorSelections.value = {
    ...skillCreatorSelections.value,
    [field]: 'custom',
  };

  if (field !== activeSkillCreatorStep.value.field) return;

  if (isFinalSkillCreatorStep()) {
    insertGuidedSkillCreatorPrompt();
    return;
  }

  skillCreatorGuideStep.value += 1;
};

const moveSkillCreatorGuideStep = (direction: 'previous' | 'next') => {
  const nextStep = direction === 'next'
    ? Math.min(skillCreatorGuideStep.value + 1, skillCreatorSteps.length - 1)
    : Math.max(skillCreatorGuideStep.value - 1, 0);

  skillCreatorGuideStep.value = nextStep;
};

const createSkillCreatorPromptBody = () => {
  const lines = skillCreatorSteps.map((step) => {
    const option = selectedSkillCreatorChoice(step);
    const fieldLabel: Record<SkillCreatorField, string> = {
      scenario: '工作场景',
      source: '输入来源',
      output: '期望输出',
      scope: '使用范围',
    };

    return `${fieldLabel[step.field]}：${option.label}。${option.description}`;
  });

  return [
    ' 帮我创建一个可复用的技能，我的需求如下：',
    lines.join('\n'),
    '请先生成技能草稿，包括技能名称、触发场景、输入要求、工作步骤、输出格式、质量检查点和边界规则；不要直接发布，生成后让我确认。',
  ].join('\n');
};

const insertGuidedSkillCreatorPrompt = () => {
  showSkillCreatorGuide.value = false;
  showSkillMenu.value = false;
  enabledSearchModes.value = new Set(['other']);
  nextTick(() => {
    insertPlainTextAtCaret(selectedAssetPromptPrefix);
    insertSkillToken('skill-creator');
    insertPlainTextAtCaret(createSkillCreatorPromptBody());
  });
};

const triggerSkillAction = (selection?: SkillDropdownSelection) => {
  if (selection === 'skill-creator') {
    openSkillCreatorGuide();
  } else if (selection) {
    insertSkillPrompt(selection);
  }
  if (selection !== 'skill-creator') {
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
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const triggerTemplateAction = (template: TemplateAsset) => {
  showTemplateManageModal.value = false;
  insertTemplatePrompt(template);
};

const triggerInlineTemplateAction = (template: TemplateAsset) => {
  insertTemplateToken(template, activeTemplateRange.value);
};

const openTemplateLibrary = () => {
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  showTemplateManageModal.value = true;
};

const createTemplateFromDropdown = () => {
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
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
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
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
      openSkillCreatorGuide();
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
  emit('submit', getEditorText().trim());
};

defineExpose({
  createSkillFromModal,
  createTemplateFromDropdown,
});

// Close dropdown when clicking outside
const closeDropdown = () => {
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showSkillCreatorGuide.value = false;
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
  inlineSkillQuery.value = '';
  inlineTemplateQuery.value = '';
};

const focusEditorFromShell = () => {
  closeDropdown();
  focusEditor();
};

onMounted(() => {
  renderEditorPlainText(inputValue.value);
  document.addEventListener('click', closeDropdown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown);
});
</script>

<template>
  <div
    ref="inputContainerRef"
    class="chat-input-container"
    :class="{ 'creator-guide-active': showSkillCreatorGuide }"
    @click.self="focusEditorFromShell"
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
      v-if="showSkillCreatorGuide"
      class="skill-creator-guide"
      role="dialog"
      aria-label="创建技能引导"
      @mousedown.stop
      @click.stop
      @keydown.escape.stop.prevent="closeSkillCreatorGuide"
    >
      <header class="creator-guide-header">
        <div class="creator-guide-title-block">
          <span class="creator-guide-kicker">创建技能</span>
          <h3>{{ activeSkillCreatorStep.title }}</h3>
        </div>

        <div class="creator-guide-nav">
          <button
            class="creator-guide-icon-btn"
            type="button"
            aria-label="上一步"
            :disabled="skillCreatorGuideStep === 0"
            @click="moveSkillCreatorGuideStep('previous')"
          >
            <ArrowLeft :size="17" />
          </button>
          <span>{{ skillCreatorGuideStep + 1 }} of {{ skillCreatorSteps.length }}</span>
          <button
            class="creator-guide-icon-btn"
            type="button"
            aria-label="下一步"
            :disabled="skillCreatorGuideStep === skillCreatorSteps.length - 1"
            @click="moveSkillCreatorGuideStep('next')"
          >
            <ArrowRight :size="17" />
          </button>
          <button
            class="creator-guide-close"
            type="button"
            aria-label="关闭创建技能引导"
            @click="closeSkillCreatorGuide"
          >
            <X :size="16" />
          </button>
        </div>
      </header>

      <div class="creator-guide-progress" aria-hidden="true">
        <span
          v-for="(step, index) in skillCreatorSteps"
          :key="step.field"
          :class="{ active: index <= skillCreatorGuideStep }"
        ></span>
      </div>

      <div class="creator-guide-options">
        <button
          v-for="(option, index) in activeSkillCreatorStep.options"
          :key="option.id"
          class="creator-guide-option"
          :class="{ selected: skillCreatorSelections[activeSkillCreatorStep.field] === option.id }"
          type="button"
          :title="option.description"
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
            :value="customSkillCreatorInputs[activeSkillCreatorStep.field]"
            type="text"
            placeholder="自行输入需求"
            @focus="focusCustomSkillCreatorInput(activeSkillCreatorStep.field)"
            @input="handleCustomSkillCreatorInput(activeSkillCreatorStep.field, $event)"
            @keydown.enter.prevent="commitCustomSkillCreatorInput(activeSkillCreatorStep.field)"
          />
          <button
            v-if="customSkillCreatorInputs[activeSkillCreatorStep.field].trim()"
            class="creator-custom-continue"
            type="button"
            @click="commitCustomSkillCreatorInput(activeSkillCreatorStep.field)"
          >
            继续
          </button>
        </div>
      </div>

      <div class="creator-guide-summary" aria-label="已选择">
        <span
          v-for="item in selectedSkillCreatorSummary"
          :key="item.field"
          class="creator-summary-chip"
          :class="{ current: item.field === activeSkillCreatorStep.field }"
        >
          {{ item.label }}
        </span>
      </div>

      <footer class="creator-guide-footer">
        <button
          class="creator-guide-secondary"
          type="button"
          @click="backToSkillListFromGuide"
        >
          返回技能列表
        </button>
      </footer>
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
            class="plus-btn"
            type="button"
            aria-label="打开更多功能"
            :aria-expanded="showActionMenu"
            @click="toggleActionMenu"
          >
            <Plus :size="18" />
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

            <section class="action-group" aria-label="上传材料">
              <p class="action-group-title">上传材料</p>
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

        <div v-if="isResearchMode" class="skill-menu" @click.stop>
          <button
            class="text-tool-btn"
            type="button"
            aria-label="打开技能管理"
            aria-haspopup="dialog"
            :aria-expanded="showSkillManageModal"
            @click="openSkillManageModal"
          >
            <Puzzle :size="20" class="text-tool-icon" />
            <span>技能</span>
          </button>
        </div>

        <div v-if="isResearchMode" class="selected-option-tags" aria-label="已选检索设置">
          <button
            v-for="mode in selectedSearchModes"
            :key="mode.id"
            class="selected-option-tag"
            type="button"
            :aria-label="`取消${mode.label}`"
            @click.stop="removeSearchMode(mode.id)"
          >
            <span class="option-icon-stack" aria-hidden="true">
              <component :is="mode.icon" :size="15" class="option-icon" />
              <X :size="14" class="option-remove-icon" />
            </span>
            <span>{{ mode.label }}</span>
          </button>
        </div>
      </div>

      <div class="right-actions">
        <div v-if="isResearchMode" class="thinking-select" @click.stop>
          <button
            class="thinking-select-btn"
            type="button"
            aria-label="选择思考模式"
            :aria-expanded="showThinkingMenu"
            @click="toggleThinkingMenu"
          >
            <span>{{ selectedThinkingModeItem?.label ?? '快速' }}</span>
            <ChevronDown :size="14" :stroke-width="2.4" />
          </button>

          <div v-if="showThinkingMenu" class="thinking-select-dropdown" role="menu">
            <button
              v-for="mode in thinkingModes"
              :key="mode.id"
              class="thinking-select-option"
              :class="{ selected: selectedThinkingMode === mode.id }"
              type="button"
              @click="selectThinkingMode(mode.id)"
            >
              <span class="thinking-option-copy">
                <span class="thinking-option-label">{{ mode.label }}</span>
                <span class="thinking-option-desc">{{ mode.description }}</span>
              </span>
              <Check v-if="selectedThinkingMode === mode.id" :size="14" />
            </button>
          </div>
        </div>
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

    <SkillManageModal
      v-if="showSkillManageModal"
      :start-in-create="skillManageStartsInCreate"
      @close="showSkillManageModal = false"
      @create="createSkillFromModal"
      @use="createSkillFromModal"
    />
  </div>
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
  transform: translateY(118px);
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

.chat-editor-row :deep(.skill-inline-code),
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

.chat-editor-row :deep(.template-inline-code) {
  background: var(--diff-added-soft);
  color: var(--diff-added);
}

.chat-editor-row :deep(.skill-inline-code.selected),
.chat-editor-row :deep(.skill-inline-code:focus),
.chat-editor-row :deep(.template-inline-code.selected),
.chat-editor-row :deep(.template-inline-code:focus) {
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

.left-actions {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.action-menu,
.skill-menu,
.template-menu {
  position: relative;
}

.native-file-input {
  display: none;
}

.plus-btn,
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

.plus-btn:hover,
.plus-btn[aria-expanded="true"],
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

.plus-btn,
.plus-btn:hover,
.plus-btn[aria-expanded="true"],
.plus-btn:focus,
.plus-btn:focus-visible,
.plus-btn:active,
.icon-tool-btn,
.icon-tool-btn:hover,
.icon-tool-btn:focus,
.icon-tool-btn:focus-visible,
.icon-tool-btn:active {
  box-shadow: none !important;
  outline: none !important;
  filter: none;
}

.text-tool-btn:focus-visible,
.thinking-select-option:focus-visible,
.send-btn:focus-visible,
.action-menu-item:focus-visible,
.creator-guide-icon-btn:focus-visible,
.creator-guide-close:focus-visible,
.creator-guide-option:focus-visible,
.creator-guide-secondary:focus-visible,
.creator-guide-primary:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.selected-option-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-option-tag {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
  box-shadow: none;
  transition: background-color 0.15s, color 0.15s;
}

.selected-option-tag:hover {
  background: var(--primary-soft-strong);
  color: var(--primary-hover);
  box-shadow: none;
}

.option-icon-stack {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.option-icon,
.option-remove-icon {
  position: absolute;
  color: currentColor;
  transition: opacity 0.12s;
}

.option-remove-icon {
  opacity: 0;
}

.selected-option-tag:hover .option-icon {
  opacity: 0;
}

.selected-option-tag:hover .option-remove-icon {
  opacity: 1;
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

.skill-creator-guide {
  position: absolute;
  right: 0;
  bottom: calc(100% + 14px);
  left: 0;
  z-index: 180;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(360px, calc(100vh - 80px));
  padding: 12px 14px 10px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: none;
  overflow: hidden;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.creator-guide-nav {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

.creator-guide-icon-btn:hover:not(:disabled),
.creator-guide-close:hover {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.creator-guide-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.creator-guide-title-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.creator-guide-kicker {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.creator-guide-title-block h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 780;
  line-height: 1.28;
  letter-spacing: 0;
}

.creator-guide-progress {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}

.creator-guide-progress span {
  height: 3px;
  border-radius: 999px;
  background: var(--border-color);
}

.creator-guide-progress span.active {
  background: var(--primary-color);
}

.creator-guide-options {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: visible;
}

.creator-guide-option {
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
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
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
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

.creator-guide-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 1px;
  max-height: 22px;
  overflow: hidden;
}

.creator-summary-chip {
  max-width: 100%;
  overflow: hidden;
  padding: 3px 6px;
  border-radius: 7px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-summary-chip.current {
  background: var(--primary-soft-strong);
  color: var(--primary-hover);
}

.creator-guide-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 0;
}

.creator-guide-secondary,
.creator-guide-primary {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 760;
  line-height: 1;
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;
}

.creator-guide-secondary {
  min-width: 112px;
  padding: 0 14px;
  color: var(--text-secondary);
  background: transparent;
}

.creator-guide-secondary:hover:not(:disabled) {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.creator-guide-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.creator-guide-primary {
  min-width: 96px;
  padding: 0 14px;
  color: var(--on-primary);
  background: var(--primary-color);
}

.creator-guide-primary:hover {
  background: var(--primary-hover);
}

.creator-guide-primary:disabled {
  cursor: default;
  opacity: 0.58;
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

.thinking-select {
  position: relative;
}

.thinking-select-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.16s, color 0.16s;
}

.thinking-select-btn:hover,
.thinking-select-btn[aria-expanded="true"] {
  background: var(--border-soft);
  color: var(--text-strong);
}

.thinking-select-btn:focus-visible {
  outline: none;
}

.thinking-select-dropdown {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  z-index: 130;
  width: 248px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
  animation: fadeIn 0.15s ease;
}

.thinking-select-option {
  width: 100%;
  min-height: 54px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
}

.thinking-select-option.selected {
  background: var(--primary-soft);
  color: var(--primary-color);
  font-weight: 650;
}

.thinking-select-option:hover,
.thinking-select-option.selected:hover {
  background: var(--surface-soft);
  color: var(--text-main);
}

.thinking-option-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.thinking-option-label {
  color: currentColor;
  font-size: 14px;
  font-weight: 650;
}

.thinking-option-desc {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
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
    transform: none;
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
    position: fixed;
    top: 20px;
    bottom: auto;
    left: 16px;
    right: 16px;
    gap: 8px;
    max-height: min(380px, calc(100vh - 40px));
    padding: 12px;
    border-radius: 14px;
  }

  .creator-guide-header {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .creator-guide-title-block h3 {
    font-size: 18px;
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

  .creator-guide-summary {
    max-height: 54px;
    overflow: hidden;
  }

}
</style>
