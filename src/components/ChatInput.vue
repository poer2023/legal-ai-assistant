<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Brain,
  ChevronDown,
  Globe,
  GraduationCap,
  Scale,
  Image,
  LayoutTemplate,
  MessageCircle,
  Mic,
  ArrowUp,
  Check,
  BookOpen,
  Plus,
  Puzzle,
  X,
  Zap,
} from 'lucide-vue-next';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import SkillDropdownContent from './SkillDropdownContent.vue';
import SkillManageModal from './SkillManageModal.vue';
import TemplateDropdownContent from './TemplateDropdownContent.vue';
import TemplateManageModal from './TemplateManageModal.vue';
import { isRegisteredSkillName } from '../data/skillCatalog';
import { defaultTemplateAssets, type TemplateAsset } from '../data/legalAssets';

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
const showTemplateManageModal = ref(false);
const skillTokenCount = ref(0);
const templateTokenCount = ref(0);
const inputContainerRef = ref<HTMLDivElement | null>(null);
const editorRef = ref<HTMLDivElement | null>(null);
const activeSkillRange = ref<Range | null>(null);
const activeTemplateRange = ref<Range | null>(null);
const inlineTemplateQuery = ref('');
const selectedSkillToken = ref<HTMLElement | null>(null);
const inlineShortcutMenuPosition = ref({ left: 16, top: 48 });
const selectedAssetPromptPrefix = '请使用 ';
const skillPromptSuffix = ' 帮我完成以下任务，我的需求如下：';
const skillCreatorPromptSuffix = ' 帮我创建一个可复用的技能，我的需求如下：';
const templatePromptSuffix = ' 帮我按照这个模板完成写作，我的需求/源文件如下：';
const templateCreatorPromptSuffix = ' 帮我创建一个可复用的写作模板，我的需求/源文件如下：';
const inlineTokenSelector = '.skill-inline-code, .template-inline-code';

type SkillSlashMatch = {
  query: string;
  range: Range;
};

type TemplateShortcutMatch = SkillSlashMatch;

watch(
  () => props.modelValue,
  (value) => {
    if (value !== undefined && value !== inputValue.value) {
      inputValue.value = value;
      renderEditorPlainText(value);
    }
  },
  { immediate: true }
);

watch(inputValue, (value) => {
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

const selectedThinkingMode = ref('fast');
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

const removeSearchMode = (modeId: string) => {
  enabledSearchModes.value.delete(modeId);
};

const uploadActions = [
  { id: 'image', label: '上传图片', icon: Image },
];

const toggleActionMenu = () => {
  showActionMenu.value = !showActionMenu.value;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const toggleSkillMenu = () => {
  showSkillMenu.value = !showSkillMenu.value;
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
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const toggleThinkingMenu = () => {
  showThinkingMenu.value = !showThinkingMenu.value;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const triggerUploadAction = () => {
  showActionMenu.value = false;
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
  token.textContent = `模板：${template.name}`;
  token.setAttribute('aria-label', `已选模板 ${template.name}`);
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
    return false;
  }

  activeSkillRange.value = match.range.cloneRange();
  showActionMenu.value = false;
  showSkillMenu.value = false;
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
  activeSkillRange.value = null;
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
  if (!templateMatch) return false;

  const matchedTemplate = findTemplateByShortcutQuery(templateMatch.query);
  if (!matchedTemplate) return false;

  insertTemplateToken(matchedTemplate, templateMatch.range);
  return true;
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
  closeDropdown();

  const target = event.target;
  if (target instanceof HTMLElement) {
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
    showInlineSkillMenu.value = false;
    showInlineTemplateMenu.value = false;
    activeSkillRange.value = null;
    activeTemplateRange.value = null;
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

const triggerSkillAction = (skillName?: string) => {
  if (skillName) {
    insertSkillPrompt(skillName);
  }
  showSkillMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
};

const triggerInlineSkillAction = (skillName?: string) => {
  if (skillName) {
    insertSkillToken(skillName, activeSkillRange.value);
  }
  showSkillMenu.value = false;
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
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  activeTemplateRange.value = null;
  inlineTemplateQuery.value = '';
  showTemplateManageModal.value = false;
  showSkillManageModal.value = true;
};

const createSkillFromModal = (skillName = 'skill-creator') => {
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
  showTemplateMenu.value = false;
  showThinkingMenu.value = false;
  showInlineSkillMenu.value = false;
  showInlineTemplateMenu.value = false;
  activeSkillRange.value = null;
  activeTemplateRange.value = null;
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
  <div ref="inputContainerRef" class="chat-input-container" @click.self="focusEditorFromShell">
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
      <SkillDropdownContent @select="triggerInlineSkillAction" @manage="openSkillManageModal" />
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
        :show-search="false"
        :show-manage="false"
        @select="triggerInlineTemplateAction"
      />
    </div>

    <div class="input-actions">
      <div class="left-actions">
        <div class="action-menu" @click.stop>
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

            <section v-if="!isResearchMode" class="action-group" aria-label="上传材料">
              <p class="action-group-title">上传材料</p>
              <button
                v-for="action in uploadActions"
                :key="action.id"
                class="action-menu-item"
                type="button"
                @click.stop="triggerUploadAction"
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
            aria-label="打开技能菜单"
            :aria-expanded="showSkillMenu"
            @click="toggleSkillMenu"
          >
            <Puzzle :size="20" class="text-tool-icon" />
            <span>技能</span>
          </button>

          <div v-if="showSkillMenu" class="skill-dropdown" role="menu">
            <SkillDropdownContent @select="triggerSkillAction" @manage="openSkillManageModal" />
          </div>
        </div>

        <div v-if="isResearchMode" class="template-menu" @click.stop>
          <button
            class="text-tool-btn"
            type="button"
            aria-label="打开模板菜单"
            :aria-expanded="showTemplateMenu"
            @click="toggleTemplateMenu"
          >
            <LayoutTemplate :size="20" class="text-tool-icon" />
            <span>模板</span>
          </button>

          <div v-if="showTemplateMenu" class="template-dropdown" role="menu">
            <TemplateDropdownContent
              @select="triggerTemplateAction"
              @create="createTemplateFromDropdown"
              @manage="openTemplateLibrary"
            />
          </div>
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
          aria-label="发送"
          :class="{ active: hasComposerContent }"
          :disabled="!hasComposerContent"
          @click="handleSubmit"
        >
          <ArrowUp :size="18" :stroke-width="2.4" />
        </button>
      </div>
    </div>

    <SkillManageModal
      v-if="showSkillManageModal"
      @close="showSkillManageModal = false"
      @create="createSkillFromModal"
      @use="createSkillFromModal"
    />
    <TemplateManageModal
      v-if="showTemplateManageModal"
      @close="showTemplateManageModal = false"
      @create="createTemplateFromDropdown"
      @select="triggerTemplateAction"
    />
  </div>
</template>

<style scoped>
.chat-input-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #60a5fa;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.05);
  position: relative;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.chat-input-container:focus-within {
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.1);
}

.chat-editor-row {
  flex: 1;
  min-height: 116px;
  display: block;
  color: #111827;
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
  color: #94a3b8;
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
  background: #f2f2f2;
  color: #5f6368;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  vertical-align: baseline;
  user-select: all;
}

.chat-editor-row :deep(.template-inline-code) {
  background: #ecfdf5;
  color: #047857;
}

.chat-editor-row :deep(.skill-inline-code.selected),
.chat-editor-row :deep(.skill-inline-code:focus),
.chat-editor-row :deep(.template-inline-code.selected),
.chat-editor-row :deep(.template-inline-code:focus) {
  outline: 1px solid #93c5fd;
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
  color: #64748b;
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
  background: #f1f5f9;
  color: #2563eb;
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
  color: #5f6368;
  background: transparent;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.2s, color 0.2s;
}

.text-tool-btn:hover,
.text-tool-btn[aria-expanded="true"] {
  background: #eef2f7;
  color: #475569;
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
.action-menu-item:focus-visible {
  outline: 2px solid #60a5fa;
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
  background: #eff6ff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
  box-shadow: none;
  transition: background-color 0.15s, color 0.15s;
}

.selected-option-tag:hover {
  background: #dbeafe;
  color: #1d4ed8;
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
  border: 1px solid #dbe4f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
  z-index: 120;
  transform: translateX(var(--dropdown-x));
  animation: fadeIn 0.15s ease;
}

.action-dropdown {
  width: 264px;
}

.skill-dropdown,
.template-dropdown {
  width: 300px;
  border-color: #dbe4f0;
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
  padding: 4px 0 8px;
  border-bottom: 1px solid #eef2f7;
}

.action-group:last-child {
  padding-bottom: 2px;
  border-bottom: none;
}

.action-group-title {
  margin: 4px 8px 6px;
  font-size: 12px;
  line-height: 1;
  color: #94a3b8;
  font-weight: 700;
}

.action-menu-item {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
}

.action-menu-item:hover {
  background: #f8fafc;
}

.action-menu-item.selected {
  background: #eff6ff;
  color: #2563eb;
}

.action-icon {
  color: #64748b;
  flex-shrink: 0;
}

.action-menu-item.selected .action-icon {
  color: #2563eb;
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
  margin-left: auto;
  color: #2563eb;
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
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.16s, color 0.16s;
}

.thinking-select-btn:hover,
.thinking-select-btn[aria-expanded="true"] {
  background: #eef2f7;
  color: #111827;
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
  border: 1px solid #dbe4f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
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
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.2;
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
}

.thinking-select-option.selected {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 650;
}

.thinking-select-option:hover,
.thinking-select-option.selected:hover {
  background: #f3f4f6;
  color: #334155;
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
  color: #94a3b8;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
}

.send-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: #cbd5e1;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  transition: background-color 0.16s;
}

.send-btn.active {
  color: #ffffff;
  background: #2563eb;
  cursor: pointer;
}

.send-btn.active:hover {
  background: #1d4ed8;
}

@media (max-width: 768px) {
  .chat-input-container {
    min-height: 180px;
  }

  .action-dropdown,
  .skill-dropdown,
  .template-dropdown {
    top: calc(100% + 10px);
    bottom: auto;
  }

  .action-dropdown {
    width: min(264px, calc(100vw - 64px));
  }

  .skill-dropdown,
  .template-dropdown {
    --dropdown-x: -50%;
    left: 50%;
    width: min(300px, calc(100vw - 32px));
  }
}
</style>
