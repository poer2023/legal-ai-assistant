<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  AlertCircle,
  Brain,
  BookOpen,
  ChevronDown,
  Check,
  Copy,
  FileText,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  LayoutTemplate,
  MessageCircle,
  MessageSquareText,
  Mic,
  Plus,
  Puzzle,
  Scale,
  Send,
  Share2,
  Trash2,
  X,
  Zap,
} from 'lucide-vue-next';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import ChatInput from './ChatInput.vue';
import SkillDropdownContent from './SkillDropdownContent.vue';
import SkillManageModal from './SkillManageModal.vue';
import TemplateDropdownContent from './TemplateDropdownContent.vue';
import TemplateManageModal from './TemplateManageModal.vue';
import { defaultTemplateAssets, type TemplateAsset } from '../data/legalAssets';
import { getSkillByNameOrId, markSkillUsed } from '../data/skillCatalog';
import { docxLegalResearchMock } from '../data/docxLegalResearchMock';
import { streamOpenRouterMessage } from '../services/openrouterChat';
import { useChatHistory } from '../stores/chatHistory';

type SearchMode = {
  id: string;
  label: string;
  icon: Component;
};

type PromptPart = {
  type: 'text' | 'skill' | 'template';
  value: string;
};

type InlineSegment = {
  type: 'text' | 'strong' | 'code' | 'source';
  value: string;
};

type LiveAnswerTextBlock = {
  type: 'heading' | 'paragraph';
  text: string;
  segments: InlineSegment[];
};

type LiveAnswerListBlock = {
  type: 'ordered-list' | 'unordered-list';
  items: Array<{
    text: string;
    segments: InlineSegment[];
  }>;
};

type LiveAnswerBlock = LiveAnswerTextBlock | LiveAnswerListBlock;

const route = useRoute();
const router = useRouter();
const {
  addMockConversation,
  findHistoryItem,
  getCachedConversation,
  loadHistory,
  updateConversationAnswer,
} = useChatHistory();
const inputValue = ref('');
const showActionMenu = ref(false);
const showSkillMenu = ref(false);
const showTemplateMenu = ref(false);
const showSkillManageModal = ref(false);
const showTemplateManageModal = ref(false);
const showSourceNotice = ref(true);
const hasCompletedMock = ref(false);
const isReferenceDrawerOpen = ref(false);
const isDocxPreviewOpen = ref(false);
const isProcessExpanded = ref(false);
const isThinkingExpanded = ref(true);
const activeReferenceId = ref<number | null>(null);
const expandedReferenceIds = ref<Set<number>>(new Set());
const completedQuestion = ref('');
const selectedTemplate = ref<TemplateAsset | null>(null);
const generatedAnswer = ref('');
const answerModel = ref('');
const answerError = ref('');
const answerNotice = ref('');
const isGeneratingAnswer = ref(false);
const isRenderingAnswer = ref(false);
const handledRoutePromptKey = ref('');
const activeHistoryId = ref('');
const selectedDialogMode = ref('research');
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));
const templateCreatorPrompt = '请使用 /template-creator 帮我创建一个可复用的写作模板，我的需求/源文件如下：';
const skillCreatorPrompt = '请使用 /skill-creator 帮我创建一个可复用的技能，我的需求如下：';
const createSkillPrompt = (skillName: string) =>
  `请使用 /${skillName} 帮我完成以下任务，我的需求如下：`;
const createTemplatePrompt = (template: TemplateAsset) =>
  `请使用 模板：${template.name} 帮我按照这个模板完成写作，我的需求/源文件如下：`;
let answerRenderQueue = '';
let answerRenderTimer: ReturnType<typeof window.setInterval> | null = null;
let answerDrainResolver: (() => void) | null = null;

const dialogModes = [
  { id: 'consult', label: '咨询模式', icon: MessageCircle },
  { id: 'research', label: '研究模式', icon: BookOpen },
];

const searchModes: SearchMode[] = [
  { id: 'legal', label: '法律搜索', icon: Scale },
  { id: 'web', label: '联网搜索', icon: Globe },
  { id: 'academic', label: '学术搜索', icon: GraduationCap },
  { id: 'knowledge', label: '知识库搜索', icon: KnowledgeSearchIcon },
];

const uploadActions = [
  { id: 'image', label: '上传图片', icon: ImageIcon },
];

const createInlineSegments = (text: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  const pattern = /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\[(\d+)\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[2]) {
      segments.push({ type: 'strong', value: match[2] });
    } else if (match[3]) {
      segments.push({ type: 'strong', value: match[3] });
    } else if (match[4]) {
      segments.push({ type: 'code', value: match[4] });
    } else if (match[5]) {
      segments.push({ type: 'source', value: match[5] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: 'text', value: text }];
};

const createTextBlock = (type: LiveAnswerTextBlock['type'], text: string): LiveAnswerTextBlock => ({
  type,
  text,
  segments: createInlineSegments(text),
});

const parseLiveAnswerBlocks = (text: string): LiveAnswerBlock[] => {
  const blocks: LiveAnswerBlock[] = [];
  const paragraphLines: string[] = [];
  let activeList: LiveAnswerListBlock | null = null;

  const flushParagraph = () => {
    const paragraph = paragraphLines.join('\n').trim();
    paragraphLines.length = 0;

    if (paragraph) {
      blocks.push(createTextBlock('paragraph', paragraph));
    }
  };

  const flushList = () => {
    if (activeList?.items.length) {
      blocks.push(activeList);
    }

    activeList = null;
  };

  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[1]?.trim();
      if (!headingText) continue;

      flushParagraph();
      flushList();
      blocks.push(createTextBlock('heading', headingText));
      continue;
    }

    const orderedMatch = line.match(/^(\d+)[.)、]\s+(.+)$/);
    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/);
    const listKind = orderedMatch ? 'ordered-list' : unorderedMatch ? 'unordered-list' : null;
    const listText = orderedMatch?.[2] ?? unorderedMatch?.[1];

    if (listKind && listText) {
      flushParagraph();

      if (!activeList || activeList.type !== listKind) {
        flushList();
        activeList = { type: listKind, items: [] };
      }

      activeList.items.push({
        text: listText.trim(),
        segments: createInlineSegments(listText.trim()),
      });
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
};

const extractSelectedSkillsFromPrompt = (prompt: string) => {
  const matches = Array.from(prompt.matchAll(/\/([^\s/，。；,.;:：]+)/g));
  const seen = new Set<string>();

  return matches.reduce<NonNullable<ReturnType<typeof getSkillByNameOrId>>[]>((skills, match) => {
    const skill = getSkillByNameOrId(match[1] ?? '');
    if (!skill || seen.has(skill.id)) return skills;
    seen.add(skill.id);
    skills.push(skill);
    return skills;
  }, []);
};

const getLiveAnswerListItems = (block: LiveAnswerBlock) => {
  return block.type === 'ordered-list' || block.type === 'unordered-list'
    ? block.items
    : [];
};

const stopAnswerRenderer = () => {
  if (answerRenderTimer) {
    window.clearInterval(answerRenderTimer);
  }

  answerRenderTimer = null;
};

const resolveAnswerDrain = () => {
  if (!answerDrainResolver) return;

  const resolve = answerDrainResolver;
  answerDrainResolver = null;
  resolve();
};

const drainAnswerQueue = () => {
  if (!answerRenderQueue) {
    stopAnswerRenderer();

    if (!isGeneratingAnswer.value) {
      isRenderingAnswer.value = false;
      resolveAnswerDrain();
    }

    return;
  }

  const chunkSize = answerRenderQueue.length > 120
    ? 10
    : answerRenderQueue.length > 48
      ? 6
      : 2;
  generatedAnswer.value += answerRenderQueue.slice(0, chunkSize);
  answerRenderQueue = answerRenderQueue.slice(chunkSize);
};

const queueAnswerToken = (token: string) => {
  if (!token) return;

  answerRenderQueue += token;
  isRenderingAnswer.value = true;

  if (!answerRenderTimer) {
    answerRenderTimer = window.setInterval(drainAnswerQueue, 22);
  }
};

const waitForAnswerDrain = () => {
  if (!answerRenderQueue && !answerRenderTimer) {
    isRenderingAnswer.value = false;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    answerDrainResolver = resolve;
    drainAnswerQueue();
  });
};

const isResearchMode = computed(() => selectedDialogMode.value === 'research');
const hasComposerContent = computed(() => inputValue.value.length > 0 || Boolean(selectedTemplate.value));
const reportMock = docxLegalResearchMock;
const hasSidePanel = computed(() => isReferenceDrawerOpen.value || isDocxPreviewOpen.value);
const isLiveConversation = computed(() =>
  isGeneratingAnswer.value
  || Boolean(generatedAnswer.value)
  || Boolean(answerError.value)
  || Boolean(answerNotice.value)
);

const liveHeaderTitle = computed(() => {
  const normalized = completedQuestion.value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '法律咨询';
  return normalized.length > 22 ? `${normalized.slice(0, 22)}...` : normalized;
});
const headerTitle = computed(() => {
  if (!hasCompletedMock.value) return '新提问';
  return isLiveConversation.value ? liveHeaderTitle.value : reportMock.title;
});
const headerTime = computed(() => {
  if (!hasCompletedMock.value) return currentTime.value;
  return isLiveConversation.value ? currentTime.value : reportMock.createdAt;
});
const completedQuestionParts = computed(() => tokenizePromptText(completedQuestion.value));
const liveAnswerBlocks = computed(() => parseLiveAnswerBlocks(generatedAnswer.value));
const processToolCount = computed(() =>
  reportMock.timeline.reduce((count, node) => count + (node.tools?.length ?? 0), 0)
);
const processSummaryText = computed(() =>
  `已完成 ${reportMock.timeline.length} 个处理阶段、${processToolCount.value} 项工具动作，采用 ${reportMock.references.length} 条参考来源。`
);
const answerStatusLabel = computed(() => {
  if ((isGeneratingAnswer.value && generatedAnswer.value) || isRenderingAnswer.value) return '正在流式生成';
  if (isGeneratingAnswer.value) return '正在生成回答';
  if (answerError.value) return '调用异常';
  if (answerNotice.value) return '暂无缓存';
  return '已完成回答';
});

const placeholderText = computed(() => {
  return isResearchMode.value
    ? '想了解什么知识，快来问问我！Shift+Enter/Ctrl+Enter换行'
    : '我是你的AI律师，想咨询什么法律问题，快来问问我！Shift+Enter/Ctrl+Enter换行';
});

const currentTime = computed(() => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date()).replace(/\//g, '-');
});

const toggleSearchMode = (modeId: string) => {
  if (enabledSearchModes.value.has(modeId)) {
    enabledSearchModes.value.delete(modeId);
  } else {
    enabledSearchModes.value.add(modeId);
  }
};

const isEnabled = (modeId: string) => enabledSearchModes.value.has(modeId);

const selectDialogMode = (modeId: string) => {
  selectedDialogMode.value = modeId;
};

const selectedThinkingMode = ref('fast');
const thinkingModes = [
  { id: 'fast', label: '快速', icon: Zap },
  { id: 'thinking', label: '思考', icon: Brain },
];

const selectThinkingMode = (modeId: string) => {
  selectedThinkingMode.value = modeId;
};

const toggleActionMenu = () => {
  showActionMenu.value = !showActionMenu.value;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
};

const toggleSkillMenu = () => {
  showSkillMenu.value = !showSkillMenu.value;
  showActionMenu.value = false;
  showTemplateMenu.value = false;
};

const toggleTemplateMenu = () => {
  showTemplateMenu.value = !showTemplateMenu.value;
  showActionMenu.value = false;
  showSkillMenu.value = false;
};

const triggerUploadAction = () => {
  showActionMenu.value = false;
};

const appendPromptToInput = (prompt: string) => {
  inputValue.value = inputValue.value.trim()
    ? `${inputValue.value.trim()}\n${prompt}`
    : prompt;
};

const triggerSkillAction = (skillName?: string) => {
  if (skillName) {
    appendPromptToInput(skillName === 'skill-creator' ? skillCreatorPrompt : createSkillPrompt(skillName));
  }
  showSkillMenu.value = false;
  showSkillManageModal.value = false;
};

const triggerTemplateAction = (template: TemplateAsset) => {
  selectedTemplate.value = template;
  showTemplateMenu.value = false;
  showTemplateManageModal.value = false;
  appendPromptToInput(createTemplatePrompt(template));
};

const tokenizePromptText = (text: string): PromptPart[] => {
  const parts: PromptPart[] = [];
  const tokenPattern = /(\/[A-Za-z][\w-]*|模板：[^\s，。；;,.、]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const value = match[0];
    parts.push({
      type: value.startsWith('/') ? 'skill' : 'template',
      value,
    });
    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
};

const syncConversationRoute = (historyId: string, prompt: string) => {
  if (route.name !== 'chat') return;

  const normalizedPrompt = prompt.trim();
  if (!historyId || !normalizedPrompt) return;
  if (route.query.historyId === historyId && route.query.prompt === normalizedPrompt) return;

  handledRoutePromptKey.value = `${historyId}:${normalizedPrompt}`;
  void router.replace({
    name: 'chat',
    query: {
      ...route.query,
      prompt: normalizedPrompt,
      historyId,
    },
  });
};

const hydrateCachedConversation = (prompt: string, historyId?: string) => {
  const cached = getCachedConversation(historyId, prompt);
  if (!cached?.answer) return false;

  beginConversation(cached.prompt, false, cached.id, !historyId);
  isDocxPreviewOpen.value = false;
  answerModel.value = cached.answer.model || '';
  generatedAnswer.value = cached.answer.content;
  answerError.value = '';
  answerNotice.value = '';
  isGeneratingAnswer.value = false;
  isRenderingAnswer.value = false;
  return true;
};

const hydrateMissingCachedConversation = (prompt: string, historyId?: string) => {
  if (!historyId) return false;

  const historyItem = findHistoryItem(historyId, prompt);
  const nextPrompt = historyItem?.prompt || prompt;
  beginConversation(nextPrompt, false, historyId);
  isDocxPreviewOpen.value = false;
  generatedAnswer.value = '';
  answerModel.value = '';
  answerError.value = '';
  answerNotice.value = '这条历史暂未保存回答内容。新提问生成成功后会自动缓存，之后点击历史或刷新会直接加载结果。';
  isGeneratingAnswer.value = false;
  isRenderingAnswer.value = false;
  return true;
};

const beginConversation = (
  prompt: string,
  shouldRecord = true,
  historyId?: string,
  shouldSyncRoute = false,
) => {
  stopAnswerRenderer();
  answerRenderQueue = '';
  isRenderingAnswer.value = false;
  resolveAnswerDrain();
  completedQuestion.value = prompt;
  hasCompletedMock.value = true;
  isReferenceDrawerOpen.value = false;
  isProcessExpanded.value = false;
  isThinkingExpanded.value = true;
  activeReferenceId.value = null;
  expandedReferenceIds.value = new Set();
  generatedAnswer.value = '';
  answerModel.value = '';
  answerError.value = '';
  answerNotice.value = '';
  isGeneratingAnswer.value = false;
  inputValue.value = '';
  selectedTemplate.value = null;
  showSourceNotice.value = false;
  closeDropdown();

  const historyItem = shouldRecord || !historyId
    ? addMockConversation(prompt)
    : findHistoryItem(historyId, prompt);

  activeHistoryId.value = historyItem?.id ?? historyId ?? '';

  if (shouldSyncRoute && historyItem) {
    syncConversationRoute(historyItem.id, historyItem.prompt);
  }

  return historyItem;
};

const completeMockConversation = (
  prompt: string,
  shouldRecord = true,
  historyId?: string,
) => {
  beginConversation(prompt, shouldRecord, historyId, shouldRecord || !historyId);
  isDocxPreviewOpen.value = true;
};

const completeLiveConversation = async (
  prompt: string,
  shouldRecord = true,
  historyId?: string,
) => {
  const selectedSkills = extractSelectedSkillsFromPrompt(prompt);
  if (!selectedSkills.length) {
    if (hydrateCachedConversation(prompt, historyId)) return;
    if (hydrateMissingCachedConversation(prompt, historyId)) return;
  }

  const templateName = selectedTemplate.value?.name;
  const historyItem = beginConversation(prompt, shouldRecord, historyId, shouldRecord || !historyId);
  isDocxPreviewOpen.value = false;
  isGeneratingAnswer.value = true;

  try {
    selectedSkills.forEach((skill) => markSkillUsed(skill.id));
    const result = await streamOpenRouterMessage(
      prompt,
      {
        mode: selectedDialogMode.value,
        thinkingMode: selectedThinkingMode.value,
        searchModes: Array.from(enabledSearchModes.value),
        templateName,
        selectedSkills: selectedSkills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          files: skill.files.map((file) => ({
            path: file.path,
            content: file.content,
          })),
        })),
      },
      {
        onMeta(model) {
          answerModel.value = model;
        },
        onToken(_token, fullContent) {
          const renderedLength = generatedAnswer.value.length + answerRenderQueue.length;
          queueAnswerToken(fullContent.slice(renderedLength));
        },
      },
    );

    answerModel.value = result.model || answerModel.value;
    isGeneratingAnswer.value = false;
    await waitForAnswerDrain();

    if (generatedAnswer.value !== result.content) {
      generatedAnswer.value = result.content;
    }

    const cachedItem = updateConversationAnswer(activeHistoryId.value || historyItem?.id, prompt, {
      content: result.content,
      model: answerModel.value || result.model,
      cachedAt: new Date().toISOString(),
    });

    if (cachedItem) {
      activeHistoryId.value = cachedItem.id;
      syncConversationRoute(cachedItem.id, cachedItem.prompt);
    }
  } catch (error) {
    isGeneratingAnswer.value = false;
    await waitForAnswerDrain();
    answerError.value = error instanceof Error ? error.message : 'DeepSeek 调用失败';
  } finally {
    isGeneratingAnswer.value = false;
  }
};

const submitComposer = () => {
  if (!hasComposerContent.value) return;

  void completeLiveConversation(inputValue.value.trim() || reportMock.userPrompt);
};

const submitSharedComposer = (value: string) => {
  const nextValue = value.trim();
  if (!nextValue) return;

  void completeLiveConversation(nextValue);
};

const openDocxMock = (prompt?: string, historyId?: string) => {
  const nextPrompt = prompt?.trim() || reportMock.userPrompt;
  completeMockConversation(nextPrompt, !historyId, historyId);
};

const openRoutePrompt = async () => {
  await loadHistory();

  if (route.query.mock === 'docx') {
    openDocxMock(
      typeof route.query.prompt === 'string' ? route.query.prompt : undefined,
      typeof route.query.historyId === 'string' ? route.query.historyId : undefined,
    );
    return;
  }

  const prompt = typeof route.query.prompt === 'string' ? route.query.prompt.trim() : '';
  if (!prompt) return;

  const historyId = typeof route.query.historyId === 'string' ? route.query.historyId : undefined;
  const routeKey = `${String(historyId ?? '')}:${prompt}`;
  if (handledRoutePromptKey.value === routeKey) return;
  handledRoutePromptKey.value = routeKey;
  void completeLiveConversation(prompt, typeof historyId !== 'string', historyId);
};

const scrollReferenceIntoView = (referenceId: number) => {
  const sourceElement = document.querySelector<HTMLElement>(`[data-source-id="${referenceId}"]`);
  sourceElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

const revealReference = async (referenceId: number) => {
  if (!reportMock.references.some((source) => source.id === referenceId)) return;

  activeReferenceId.value = referenceId;
  expandedReferenceIds.value = new Set([...expandedReferenceIds.value, referenceId]);
  isReferenceDrawerOpen.value = true;
  isDocxPreviewOpen.value = false;

  await nextTick();
  scrollReferenceIntoView(referenceId);
};

const openReferenceFromCitation = (referenceId: string | number) => {
  const numericId = Number(referenceId);
  if (!Number.isFinite(numericId)) return;
  void revealReference(numericId);
};

const isReferenceExpanded = (referenceId: number) => {
  return expandedReferenceIds.value.has(referenceId);
};

const toggleReferenceDetail = (referenceId: number) => {
  activeReferenceId.value = referenceId;
  const nextExpanded = new Set(expandedReferenceIds.value);

  if (nextExpanded.has(referenceId)) {
    nextExpanded.delete(referenceId);
  } else {
    nextExpanded.add(referenceId);
  }

  expandedReferenceIds.value = nextExpanded;
};

const toggleReferenceDrawer = () => {
  isReferenceDrawerOpen.value = !isReferenceDrawerOpen.value;
  if (isReferenceDrawerOpen.value) {
    isDocxPreviewOpen.value = false;
    const referenceId = activeReferenceId.value;
    if (referenceId) {
      void nextTick(() => scrollReferenceIntoView(referenceId));
    }
  }
};

const openDocxPreview = () => {
  isReferenceDrawerOpen.value = false;
  isDocxPreviewOpen.value = true;
};

const closeDocxPreview = () => {
  isDocxPreviewOpen.value = false;
};

const selectTemplateFromShortcut = (template: TemplateAsset) => {
  selectedTemplate.value = template;
  showTemplateMenu.value = false;
  showTemplateManageModal.value = false;
};

const findTemplateByShortcutQuery = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  return defaultTemplateAssets.find((template) =>
    template.name.toLowerCase() === normalizedQuery || template.id.toLowerCase() === normalizedQuery
  ) ?? null;
};

const handleTextareaInput = () => {
  const match = inputValue.value.match(/(^|[\s\n])#([^\s#]+)$/u);
  if (!match) return;

  const template = findTemplateByShortcutQuery(match[2] ?? '');
  if (!template) return;

  const shortcutStart = inputValue.value.length - match[0].length;
  inputValue.value = `${inputValue.value.slice(0, shortcutStart)}${match[1] ?? ''}`;
  selectTemplateFromShortcut(template);
};

const clearSelectedTemplate = () => {
  selectedTemplate.value = null;
};

const openTemplateLibrary = () => {
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showTemplateManageModal.value = true;
};

const createTemplateFromDropdown = () => {
  showTemplateMenu.value = false;
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showTemplateManageModal.value = false;
  selectedTemplate.value = null;
  appendPromptToInput(templateCreatorPrompt);
};

const openSkillManageModal = () => {
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
  showTemplateManageModal.value = false;
  showSkillManageModal.value = true;
};

const closeDropdown = () => {
  showActionMenu.value = false;
  showSkillMenu.value = false;
  showTemplateMenu.value = false;
};

onMounted(() => {
  document.addEventListener('click', closeDropdown);
  void openRoutePrompt();
});

onBeforeUnmount(() => {
  stopAnswerRenderer();
  document.removeEventListener('click', closeDropdown);
  document.body.classList.remove('docx-preview-mode');
});

watch(isDocxPreviewOpen, (isOpen) => {
  document.body.classList.toggle('docx-preview-mode', isOpen);
});

watch(
  () => [route.query.mock, route.query.prompt, route.query.historyId],
  () => {
    void openRoutePrompt();
  },
);
</script>

<template>
  <div class="chat-page" :class="{ 'preview-split': isDocxPreviewOpen }" @click.self="closeDropdown">
    <main class="chat-main">
      <header class="chat-header">
        <div class="header-title-icon">
          <MessageSquareText :size="24" />
        </div>
        <div class="header-meta">
          <h1>{{ headerTitle }}</h1>
          <p>{{ headerTime }}</p>
        </div>
        <button class="share-button" disabled>
          <Share2 :size="14" />
          分享
        </button>
      </header>

      <section v-if="!hasCompletedMock" class="empty-conversation" aria-label="新提问">
        <div class="empty-space"></div>
      </section>

      <section
        v-else
        class="answer-conversation"
        :class="{ 'with-source-drawer': isReferenceDrawerOpen && !isLiveConversation }"
        aria-label="AI 回答结果"
      >
        <div class="answer-scroll">
          <div class="user-message">
            <div class="question-bubble">
              <p class="question-text">
                <template v-for="(part, index) in completedQuestionParts" :key="`${part.type}-${index}-${part.value}`">
                  <code
                    v-if="part.type === 'skill'"
                    class="question-inline-code skill-inline-code"
                  >{{ part.value }}</code>
                  <code
                    v-else-if="part.type === 'template'"
                    class="question-inline-code template-inline-code"
                  >{{ part.value }}</code>
                  <span v-else>{{ part.value }}</span>
                </template>
              </p>
              <div class="question-actions">
                <button type="button"><Copy :size="13" />复制</button>
                <button type="button"><Trash2 :size="13" />删除</button>
              </div>
            </div>
          </div>

          <article class="answer-card">
            <header class="answer-card-header">
              <button class="answer-status-button" type="button">
                {{ answerStatusLabel }}
                <ChevronDown :size="14" />
              </button>
              <button
                v-if="!isLiveConversation"
                class="reference-button"
                :class="{ active: isReferenceDrawerOpen }"
                type="button"
                @click="toggleReferenceDrawer"
              >
                <Share2 :size="14" />
                参考来源
                <span>›</span>
              </button>
            </header>

            <div class="answer-content">
              <section v-if="isLiveConversation" class="live-answer-section" aria-label="DeepSeek 生成结果">
                <p v-if="answerModel" class="live-model">DeepSeek · {{ answerModel }}</p>
                <div v-if="isGeneratingAnswer && !generatedAnswer" class="live-loading">
                  <Brain :size="17" />
                  <span>正在调用 DeepSeek 生成回答...</span>
                </div>
                <div v-if="generatedAnswer" class="live-answer-text">
                  <template v-for="(block, blockIndex) in liveAnswerBlocks" :key="`${block.type}-${blockIndex}`">
                    <h3 v-if="block.type === 'heading'" class="live-answer-heading">
                      <template
                        v-for="(segment, segmentIndex) in block.segments"
                        :key="`${blockIndex}-${segment.type}-${segmentIndex}`"
                      >
                        <strong v-if="segment.type === 'strong'" class="live-answer-strong">{{ segment.value }}</strong>
                        <code v-else-if="segment.type === 'code'" class="live-answer-code">{{ segment.value }}</code>
                        <span v-else-if="segment.type === 'source'" class="live-source-token">[{{ segment.value }}]</span>
                        <span v-else>{{ segment.value }}</span>
                      </template>
                    </h3>

                    <p v-else-if="block.type === 'paragraph'" class="live-answer-paragraph">
                      <template
                        v-for="(segment, segmentIndex) in block.segments"
                        :key="`${blockIndex}-${segment.type}-${segmentIndex}`"
                      >
                        <strong v-if="segment.type === 'strong'" class="live-answer-strong">{{ segment.value }}</strong>
                        <code v-else-if="segment.type === 'code'" class="live-answer-code">{{ segment.value }}</code>
                        <span v-else-if="segment.type === 'source'" class="live-source-token">[{{ segment.value }}]</span>
                        <span v-else>{{ segment.value }}</span>
                      </template>
                    </p>

                    <ol v-else-if="block.type === 'ordered-list'" class="live-answer-list ordered">
                      <li v-for="(item, itemIndex) in getLiveAnswerListItems(block)" :key="`${blockIndex}-item-${itemIndex}`">
                        <template
                          v-for="(segment, segmentIndex) in item.segments"
                          :key="`${blockIndex}-${itemIndex}-${segment.type}-${segmentIndex}`"
                        >
                          <strong v-if="segment.type === 'strong'" class="live-answer-strong">{{ segment.value }}</strong>
                          <code v-else-if="segment.type === 'code'" class="live-answer-code">{{ segment.value }}</code>
                          <span v-else-if="segment.type === 'source'" class="live-source-token">[{{ segment.value }}]</span>
                          <span v-else>{{ segment.value }}</span>
                        </template>
                      </li>
                    </ol>

                    <ul v-else class="live-answer-list">
                      <li v-for="(item, itemIndex) in getLiveAnswerListItems(block)" :key="`${blockIndex}-item-${itemIndex}`">
                        <template
                          v-for="(segment, segmentIndex) in item.segments"
                          :key="`${blockIndex}-${itemIndex}-${segment.type}-${segmentIndex}`"
                        >
                          <strong v-if="segment.type === 'strong'" class="live-answer-strong">{{ segment.value }}</strong>
                          <code v-else-if="segment.type === 'code'" class="live-answer-code">{{ segment.value }}</code>
                          <span v-else-if="segment.type === 'source'" class="live-source-token">[{{ segment.value }}]</span>
                          <span v-else>{{ segment.value }}</span>
                        </template>
                      </li>
                    </ul>
                  </template>
                  <span v-if="isGeneratingAnswer" class="live-answer-cursor" aria-hidden="true"></span>
                </div>
                <p v-if="answerNotice" class="live-notice">{{ answerNotice }}</p>
                <p v-if="answerError" class="live-error">{{ answerError }}</p>
              </section>

              <template v-else>
                <section class="process-summary" aria-label="生成过程与深度思考">
                  <div class="disclosure-block process-disclosure" :class="{ expanded: isProcessExpanded }">
                    <button
                      type="button"
                      class="disclosure-header"
                      :aria-expanded="isProcessExpanded"
                      @click="isProcessExpanded = !isProcessExpanded"
                    >
                      <span class="disclosure-copy">
                        <strong>生成过程</strong>
                        <span>{{ processSummaryText }}</span>
                      </span>
                      <ChevronDown :size="16" class="disclosure-icon" />
                    </button>

                    <div v-if="isProcessExpanded" class="disclosure-body">
                      <div class="reasoning-timeline compact">
                        <div
                          v-for="(node, nodeIndex) in reportMock.timeline"
                          :key="nodeIndex"
                          class="timeline-node"
                          :class="{ last: nodeIndex === reportMock.timeline.length - 1 }"
                        >
                          <p>{{ node.text }}</p>
                          <div v-for="tool in node.tools" :key="`${nodeIndex}-${tool.name}-${tool.query}`" class="tool-step">
                            <strong>{{ tool.name }}</strong>
                            <span>{{ tool.query }}</span>
                            <small>{{ tool.meta }}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="disclosure-block thinking-disclosure" :class="{ expanded: isThinkingExpanded }">
                    <button
                      type="button"
                      class="disclosure-header"
                      :aria-expanded="isThinkingExpanded"
                      @click="isThinkingExpanded = !isThinkingExpanded"
                    >
                      <span class="disclosure-copy">
                        <strong>深度思考</strong>
                        <span>展开查看本次起草的内部分析依据和取舍逻辑。</span>
                      </span>
                      <ChevronDown :size="16" class="disclosure-icon" />
                    </button>

                    <div v-if="isThinkingExpanded" class="disclosure-body">
                      <div class="reasoning-timeline compact">
                        <div class="timeline-node last thinking-node">
                          <p v-for="paragraph in reportMock.thinking" :key="paragraph">{{ paragraph }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="docx-result-summary" aria-label="保密协议生成结果">
                  <p>
                    已按“保密协议 / 保密承诺函”模板生成一份专业保密协议正文，内容覆盖保密信息范围、使用限制、例外披露、保密期限、返还销毁和违约责任。
                  </p>
                  <p>
                    协议已整理为可导出的 `.docx` 文件，右侧默认打开文件预览；需要核对依据时，可再查看本次生成的参考来源。
                  </p>

                  <div
                    class="docx-file-card"
                    role="button"
                    tabindex="0"
                    @click="openDocxPreview"
                    @keydown.enter="openDocxPreview"
                    @keydown.space.prevent="openDocxPreview"
                  >
                    <div class="docx-file-icon">
                      <FileText :size="30" />
                      <span>DOCX</span>
                    </div>
                    <div class="docx-file-main">
                      <div class="docx-file-heading">
                        <div>
                          <p class="docx-file-kicker">保密协议</p>
                          <h2>保密协议（NDA）.docx</h2>
                        </div>
                        <span class="docx-file-status">已生成</span>
                      </div>

                      <p class="docx-file-desc">{{ reportMock.summary }}</p>
                    </div>
                  </div>
                </section>
              </template>
            </div>

            <div class="answer-actions">
              <button type="button"><Copy :size="14" />复制</button>
              <button type="button"><Trash2 :size="14" />删除</button>
              <button type="button"><Share2 :size="14" />分享</button>
              <button type="button"><Zap :size="14" />加入知识库</button>
            </div>
          </article>
        </div>
      </section>

      <footer class="composer-wrap" :class="{ 'with-source-drawer': isReferenceDrawerOpen && !isLiveConversation }">
        <ChatInput v-model="inputValue" @submit="submitSharedComposer" />

        <p class="ai-note">回复的内容由AI生成，非人工编辑；其内容准确性和完整性无法保证，不代表我们的态度和观点。</p>
      </footer>
    </main>

    <SkillManageModal
      v-if="showSkillManageModal"
      @close="showSkillManageModal = false"
      @create="triggerSkillAction('skill-creator')"
      @use="triggerSkillAction"
    />
    <TemplateManageModal
      v-if="showTemplateManageModal"
      @close="showTemplateManageModal = false"
      @create="createTemplateFromDropdown"
      @select="triggerTemplateAction"
    />
    <aside v-if="hasCompletedMock && isReferenceDrawerOpen && !isLiveConversation" class="source-drawer" aria-label="参考来源">
      <header class="source-drawer-header">
        <div>
          <strong>参考来源</strong>
          <span>{{ reportMock.references.length }}篇</span>
        </div>
        <button type="button" aria-label="关闭参考来源" @click="isReferenceDrawerOpen = false">
          <X :size="18" />
        </button>
      </header>

      <div class="source-list">
        <article
          v-for="source in reportMock.references"
          :key="source.id"
          class="source-card"
          :class="{ active: activeReferenceId === source.id, expanded: isReferenceExpanded(source.id) }"
          :data-source-id="source.id"
          role="button"
          tabindex="0"
          @click="toggleReferenceDetail(source.id)"
          @keydown.enter="toggleReferenceDetail(source.id)"
          @keydown.space.prevent="toggleReferenceDetail(source.id)"
        >
          <div class="source-card-title">
            <Share2 :size="16" />
            <strong>{{ source.type }}</strong>
            <span v-if="source.status" class="source-status">{{ source.status }}</span>
            <ChevronDown :size="15" class="source-card-arrow" />
          </div>
          <h4>{{ source.id }}.{{ source.title }}</h4>
          <p class="source-origin">{{ source.source }}</p>
          <p>{{ source.excerpt }}</p>
          <div v-if="isReferenceExpanded(source.id)" class="source-detail" @click.stop>
            <dl>
              <div v-if="source.locator">
                <dt>引用位置</dt>
                <dd>{{ source.locator }}</dd>
              </div>
              <div v-if="source.hitReason">
                <dt>命中理由</dt>
                <dd>{{ source.hitReason }}</dd>
              </div>
            </dl>
            <blockquote v-if="source.quote">{{ source.quote }}</blockquote>
          </div>
          <button type="button" class="source-kb-button" @click.stop>
            <Zap :size="13" />
            加入知识库
          </button>
        </article>
      </div>
    </aside>

    <aside v-if="hasCompletedMock && isDocxPreviewOpen && !isLiveConversation" class="docx-preview-panel" aria-label="DOCX 文件预览">
      <header class="docx-preview-header">
        <div class="docx-preview-title">
          <span class="docx-preview-icon">
            <FileText :size="18" />
          </span>
          <div>
            <strong>保密协议（NDA）.docx</strong>
            <span>DOCX 预览</span>
          </div>
        </div>
        <button type="button" aria-label="关闭文件预览" @click="closeDocxPreview">
          <X :size="18" />
        </button>
      </header>

      <div class="docx-preview-scroll">
        <article class="docx-preview-page">
          <div class="docx-preview-cover">
            <p>保密协议</p>
            <h1>{{ reportMock.title }}</h1>
            <dl>
              <div>
                <dt>文件用途</dt>
                <dd>商务合作 / 尽职调查 / 项目谈判前资料交换</dd>
              </div>
              <div>
                <dt>生成时间</dt>
                <dd>{{ reportMock.createdAt }}</dd>
              </div>
            </dl>
          </div>

          <section v-for="section in reportMock.sections" :key="section.title" class="docx-preview-section">
            <h2>{{ section.title }}</h2>
            <p
              v-for="paragraph in section.paragraphs"
              :key="paragraph"
            >
              <template
                v-for="(segment, segmentIndex) in createInlineSegments(paragraph)"
                :key="`${paragraph}-${segment.type}-${segmentIndex}`"
              >
                <button
                  v-if="segment.type === 'source'"
                  type="button"
                  class="source-index"
                  :class="{ active: Number(segment.value) === activeReferenceId }"
                  :aria-label="`查看参考来源 ${segment.value}`"
                  @click="openReferenceFromCitation(segment.value)"
                >
                  {{ segment.value }}
                </button>
                <strong v-else-if="segment.type === 'strong'">{{ segment.value }}</strong>
                <code v-else-if="segment.type === 'code'">{{ segment.value }}</code>
                <span v-else>{{ segment.value }}</span>
              </template>
            </p>
            <ul v-if="section.bullets">
              <li
                v-for="bullet in section.bullets"
                :key="bullet"
              >
                <template
                  v-for="(segment, segmentIndex) in createInlineSegments(bullet)"
                  :key="`${bullet}-${segment.type}-${segmentIndex}`"
                >
                  <button
                    v-if="segment.type === 'source'"
                    type="button"
                    class="source-index"
                    :class="{ active: Number(segment.value) === activeReferenceId }"
                    :aria-label="`查看参考来源 ${segment.value}`"
                    @click="openReferenceFromCitation(segment.value)"
                  >
                    {{ segment.value }}
                  </button>
                  <strong v-else-if="segment.type === 'strong'">{{ segment.value }}</strong>
                  <code v-else-if="segment.type === 'code'">{{ segment.value }}</code>
                  <span v-else>{{ segment.value }}</span>
                </template>
              </li>
            </ul>
          </section>
        </article>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.chat-page {
  --line: var(--border-color);
  --line-soft: var(--border-soft);
  --paper: var(--card-bg);
  display: flex;
  width: 100%;
  min-height: 100%;
  height: 100%;
  background: var(--card-bg);
  overflow: hidden;
}

.chat-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card-bg);
}

.chat-page.preview-split .chat-main {
  flex: 0 0 50%;
  width: 50%;
  border-right: 1px solid var(--border-color);
}

.chat-page.preview-split .chat-header {
  padding: 0 18px;
}

.chat-page.preview-split .header-meta h1 {
  font-size: clamp(18px, 2vw, 22px);
  line-height: 1.25;
}

.chat-header {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-color) 94%, transparent);
}

.header-title-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-meta {
  min-width: 0;
  flex: 1;
}

.header-meta h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  color: var(--text-main);
}

.header-meta p {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.share-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--text-muted);
  background: var(--surface-soft);
  cursor: not-allowed;
}

.empty-conversation {
  flex: 1;
  min-height: 0;
}

.empty-space {
  height: 100%;
}

.composer-wrap {
  padding: 0 96px 16px;
  flex-shrink: 0;
  transition: margin-right 0.2s ease;
}

.chat-page.preview-split .composer-wrap {
  padding: 0 clamp(16px, 4vw, 54px) 14px;
}

.composer-wrap :deep(.chat-input-container),
.ai-note {
  width: min(850px, 100%);
  margin-left: auto;
  margin-right: auto;
}

.chat-page.preview-split .composer-wrap :deep(.chat-input-container),
.chat-page.preview-split .ai-note {
  width: min(620px, 100%);
}

.chat-page.preview-split .composer-wrap :deep(.chat-input-container) {
  min-height: 132px;
}

.chat-page.preview-split .composer-wrap :deep(.chat-editor-row) {
  min-height: 60px;
}

.composer-wrap.with-source-drawer {
  margin-right: clamp(0px, calc(100vw - 1180px), 560px);
}

.composer {
  position: relative;
  border: 1px solid var(--focus-ring);
  border-radius: 16px;
  background: var(--paper);
  min-height: 172px;
  box-shadow: 0 10px 26px rgba(31, 57, 114, 0.07);
  padding: 16px 16px 12px;
  display: flex;
  flex-direction: column;
}

.composer-textarea {
  min-height: 86px;
  resize: none;
  border: 0;
  outline: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-main);
  background: transparent;
}

.composer-textarea::placeholder {
  color: var(--text-muted);
}

.source-notice-bubble {
  position: absolute;
  left: 16px;
  bottom: 58px;
  max-width: min(620px, calc(100% - 32px));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--warning-soft);
  border: 1px solid var(--warning-border);
  color: var(--warning-color);
  font-size: 13px;
}

.source-notice-copy {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-notice-icon {
  flex-shrink: 0;
}

.source-notice-close {
  color: var(--warning-color);
}

.selected-template-chip {
  align-self: flex-start;
  max-width: min(520px, 100%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  padding: 7px 9px;
  border-radius: 8px;
  color: var(--diff-added);
  background: var(--diff-added-soft);
  font-size: 13px;
  font-weight: 650;
}

.selected-template-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-template-chip button {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--diff-added);
}

.selected-template-chip button:hover {
  background: var(--diff-added-soft);
}

.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-menu,
.skill-menu,
.template-menu {
  position: relative;
}

.plus-button {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--surface-soft);
  transition: all 0.2s;
}

.plus-button:hover,
.plus-button[aria-expanded="true"] {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.text-tool-button {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.2s, color 0.2s;
}

.text-tool-button:hover,
.text-tool-button[aria-expanded="true"] {
  background: var(--border-soft);
  color: var(--text-secondary);
}

.text-tool-icon {
  flex-shrink: 0;
  color: currentColor;
}

.plus-button:focus-visible,
.text-tool-button:focus-visible,
.icon-button:focus-visible,
.send-button:focus-visible,
.action-menu-item:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.action-dropdown,
.skill-dropdown,
.template-dropdown {
  --dropdown-x: 0px;
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  padding: 8px;
  background: white;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.16);
  z-index: 20;
  transform: translateX(var(--dropdown-x));
}

.action-dropdown {
  width: 264px;
}

.skill-dropdown,
.template-dropdown {
  width: 300px;
  border-color: var(--line-soft);
  border-radius: 12px;
}

.action-group {
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--border-soft);
}

.action-group:last-child {
  padding-bottom: 2px;
  border-bottom: none;
}

.action-group-title {
  margin: 4px 8px 6px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
}

.action-menu-item {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  padding: 0 10px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
}

.action-menu-item:hover {
  background: var(--bg-color);
}

.action-menu-item.selected {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.action-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.action-menu-item.selected .action-icon {
  color: var(--primary-color);
}

.check-icon {
  margin-left: auto;
}

.icon-button,
.send-button {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
}

.icon-button:hover {
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.send-button {
  color: white;
  background: var(--border-color);
  cursor: not-allowed;
}

.send-button.ready {
  background: var(--primary-color);
  cursor: pointer;
}

.ai-note {
  margin: 10px auto 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

.answer-conversation {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--card-bg);
}

.answer-conversation.with-source-drawer .answer-scroll {
  padding-right: clamp(96px, calc(100vw - 1060px), 596px);
}

.answer-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 26px 96px 24px;
}

.chat-page.preview-split .answer-scroll {
  padding: 20px clamp(18px, 4vw, 54px) 20px;
}

.chat-page.preview-split .answer-card {
  width: min(100%, 620px);
}

.chat-page.preview-split .user-message {
  width: min(100%, 620px);
}

.chat-page.preview-split .answer-card-header {
  padding: 14px 18px 8px;
}

.chat-page.preview-split .answer-content {
  padding: 2px 20px 18px;
}

.user-message {
  width: min(850px, 100%);
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 12px;
}

.question-bubble {
  max-width: 520px;
  padding: 14px 16px 10px;
  border-radius: 12px 12px 2px 12px;
  background: var(--primary-soft-strong);
  color: var(--text-main);
}

.question-bubble p {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.question-inline-code {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  margin: 0 4px;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  line-height: 24px;
  vertical-align: baseline;
}

.question-inline-code.template-inline-code {
  background: var(--diff-added-soft);
  color: var(--diff-added);
}

.question-actions,
.answer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.question-actions button,
.answer-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.question-actions button:hover,
.answer-actions button:hover {
  color: var(--primary-color);
}

.answer-card {
  width: min(850px, 100%);
  margin: 0 auto;
  border-radius: 12px;
  background: transparent;
  box-shadow: none;
}

.answer-card-header {
  position: sticky;
  top: -26px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 10px;
  border-radius: 12px 12px 0 0;
  background: color-mix(in srgb, var(--card-bg) 96%, transparent);
  backdrop-filter: blur(8px);
}

.answer-status-button,
.reference-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
}

.answer-status-button {
  padding: 0 4px;
}

.reference-button {
  padding: 0 10px;
  background: var(--surface-soft);
}

.reference-button.active,
.reference-button:hover {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.answer-content {
  padding: 4px 32px 22px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.86;
}

.process-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 26px;
}

.disclosure-block {
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-soft) 56%, transparent);
}

.disclosure-block.expanded {
  background: color-mix(in srgb, var(--card-bg) 88%, transparent);
}

.disclosure-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  text-align: left;
  color: var(--text-main);
}

.disclosure-header:hover {
  background: color-mix(in srgb, var(--primary-soft) 42%, transparent);
}

.disclosure-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.disclosure-copy strong {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 850;
}

.disclosure-copy span {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.disclosure-icon {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 0.18s ease;
}

.disclosure-block.expanded .disclosure-icon {
  transform: rotate(180deg);
}

.disclosure-body {
  padding: 0 14px 14px;
}

.disclosure-body .reasoning-timeline {
  margin-top: 2px;
}

.docx-result-summary p {
  margin: 0 0 10px;
  color: var(--text-secondary);
}

.live-answer-section {
  min-height: 180px;
  padding: 4px 0 8px;
  font-family: inherit;
}

.live-model {
  margin: 0 0 14px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.4;
}

.live-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: var(--text-secondary);
  font-size: 14px;
}

.live-loading svg {
  color: var(--primary-color);
}

.live-answer-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  color: var(--text-main);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.86;
}

.live-answer-heading {
  margin: 10px 0 0;
  color: var(--text-strong);
  font-size: 15.5px;
  font-weight: 750;
  line-height: 1.65;
}

.live-answer-heading:first-child {
  margin-top: 0;
}

.live-answer-paragraph {
  margin: 0;
  color: var(--text-main);
  font: inherit;
  white-space: pre-line;
}

.live-answer-list {
  margin: 0;
  padding-left: 1.35em;
  color: var(--text-main);
}

.live-answer-list li {
  margin: 0 0 6px;
  padding-left: 2px;
  line-height: 1.86;
}

.live-answer-list li:last-child {
  margin-bottom: 0;
}

.live-answer-strong {
  color: var(--text-strong);
  font-weight: 750;
}

.live-answer-code {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  margin: 0 2px;
  padding: 0 6px;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.94em;
  font-weight: 600;
  line-height: 22px;
}

.live-source-token {
  color: var(--text-muted);
  font-size: 0.9em;
}

.live-answer-cursor {
  width: 7px;
  height: 1.24em;
  display: inline-block;
  margin-left: 2px;
  border-radius: 999px;
  background: var(--primary-color);
  animation: live-cursor-blink 0.9s steps(2, start) infinite;
}

@keyframes live-cursor-blink {
  0%,
  45% {
    opacity: 1;
  }

  46%,
  100% {
    opacity: 0;
  }
}

.live-notice {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.live-error {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--danger-border, #fecaca);
  border-radius: 8px;
  background: var(--danger-soft, #fef2f2);
  color: var(--danger-text, #b91c1c);
  font-size: 14px;
  line-height: 1.7;
}

.docx-file-card {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 22px;
  margin-top: 18px;
  padding: 22px;
  border: 1px solid var(--primary-border);
  border-radius: 10px;
  background: linear-gradient(180deg, var(--card-bg) 0%, var(--card-bg) 100%);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.docx-file-card:hover {
  border-color: var(--primary-border);
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.08);
}

.docx-file-card:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.docx-file-icon {
  height: 128px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  color: var(--primary-color);
  background: var(--primary-soft);
}

.docx-file-icon span {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.docx-file-main {
  min-width: 0;
}

.docx-file-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.docx-file-kicker {
  margin: 0 0 4px !important;
  color: var(--primary-color) !important;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.35;
}

.docx-file-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 900;
  line-height: 1.35;
}

.docx-file-status {
  flex-shrink: 0;
  height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 999px;
  color: var(--diff-added);
  background: var(--diff-added-soft);
  font-size: 12px;
  font-weight: 850;
}

.docx-file-desc {
  margin: 11px 0 0 !important;
  color: var(--text-secondary) !important;
  font-size: 17px;
  line-height: 1.7;
}

.chat-page.preview-split .docx-file-card {
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}

.chat-page.preview-split .docx-file-icon {
  height: 112px;
}

.chat-page.preview-split .docx-file-heading {
  align-items: flex-start;
  gap: 10px;
}

.chat-page.preview-split .docx-file-heading h2 {
  overflow-wrap: anywhere;
  font-size: clamp(18px, 2.6vw, 22px);
}

.chat-page.preview-split .docx-file-desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  font-size: 14px;
}

@media (max-width: 1280px) {
  .chat-page.preview-split .docx-file-card {
    grid-template-columns: 1fr;
  }

  .chat-page.preview-split .docx-file-icon {
    width: 132px;
    height: 116px;
  }
}

@media (max-width: 1120px) {
  .chat-page.preview-split .docx-file-card {
    padding: 14px;
  }

  .chat-page.preview-split .docx-file-heading {
    flex-direction: column;
  }

  .chat-page.preview-split .docx-file-status {
    align-self: flex-start;
  }
}

.mock-block {
  margin-bottom: 28px;
}

.mock-block h2 {
  margin: 0 0 12px;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 850;
}

.reasoning-timeline {
  position: relative;
  padding-left: 22px;
}

.reasoning-timeline.compact {
  margin-bottom: 18px;
}

.reasoning-timeline::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--border-color);
}

.timeline-node {
  position: relative;
  padding: 0 0 18px;
}

.timeline-node::before {
  content: "";
  position: absolute;
  left: -21px;
  top: 8px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--border-color);
}

.timeline-node.last {
  padding-bottom: 0;
}

.timeline-node p {
  margin: 0 0 10px;
  color: var(--text-secondary);
}

.tool-step {
  display: grid;
  grid-template-columns: minmax(150px, auto) 1fr;
  align-items: center;
  column-gap: 12px;
  row-gap: 3px;
  margin: 8px 0;
  width: fit-content;
  max-width: 100%;
}

.tool-step strong {
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 850;
}

.tool-step span {
  min-width: 0;
  padding: 3px 9px;
  border-radius: 7px;
  color: var(--text-secondary);
  background: var(--surface-muted);
  font-size: 13px;
}

.tool-step small {
  grid-column: 1 / -1;
  color: var(--text-muted);
  font-size: 12px;
}

.thinking-node {
  color: var(--text-secondary);
}

.thinking-title {
  margin-bottom: 2px !important;
  color: var(--text-secondary) !important;
}

.thinking-node p,
.report-body p {
  margin: 0 0 12px;
}

.lead-copy {
  color: var(--text-main);
}

.report-cover {
  margin: 18px 0 26px;
  padding: 22px 24px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.report-label {
  margin: 0 0 8px !important;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 850;
}

.report-cover h2 {
  margin: 0 0 10px;
  color: var(--text-strong);
  font-size: 22px;
  line-height: 1.35;
}

.report-cover dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 0;
}

.report-cover dt {
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.report-cover dd {
  margin: 0;
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.55;
}

.report-section {
  margin: 25px 0 0;
}

.report-section h3 {
  margin: 0 0 12px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 900;
  line-height: 1.45;
}

.report-section ul {
  margin: 0;
  padding-left: 22px;
}

.report-section li {
  margin-bottom: 9px;
}

.source-index {
  display: inline-block;
  margin: 0 2px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  color: var(--primary-color);
  background: transparent;
  font-size: 0.72em;
  font-weight: 800;
  line-height: 1;
  text-indent: 0;
  vertical-align: super;
  cursor: pointer;
}

.source-index:hover,
.source-index:focus-visible,
.source-index.active {
  color: var(--primary-hover);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.closing-copy {
  padding-top: 2px;
}

.ai-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  margin-left: 6px;
  padding: 0 7px;
  border-radius: 6px;
  color: var(--text-muted);
  background: var(--surface-soft);
  font-size: 12px;
  font-weight: 800;
}

.answer-actions {
  padding: 0 32px 20px;
}

.source-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  width: 344px;
  padding: 18px 16px;
  border-left: 1px solid var(--border-color);
  background: var(--bg-color);
  box-shadow: -8px 0 18px rgba(64, 88, 128, 0.08);
  overflow-y: auto;
}

.source-drawer-header {
  position: sticky;
  top: -18px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -18px -16px 18px;
  padding: 18px 16px 12px;
  background: var(--bg-color);
}

.source-drawer-header div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.source-drawer-header strong {
  color: var(--text-main);
  font-size: 16px;
  font-weight: 850;
}

.source-drawer-header span {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 800;
}

.source-drawer-header button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--text-muted);
}

.source-drawer-header button:hover {
  background: var(--border-soft);
  color: var(--text-secondary);
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.source-card {
  padding: 17px 18px 18px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 2px 9px rgba(45, 70, 110, 0.06);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.source-card:hover,
.source-card:focus-visible {
  border-color: var(--primary-border);
  outline: none;
  box-shadow: 0 8px 20px rgba(45, 70, 110, 0.10);
}

.source-card.active {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-soft) 34%, var(--card-bg));
}

.source-card.expanded {
  box-shadow: 0 10px 24px rgba(45, 70, 110, 0.12);
}

.source-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--text-main);
}

.source-card-title svg {
  color: var(--primary-color);
}

.source-card-title strong {
  flex: 1 1 auto;
  font-size: 14px;
  font-weight: 900;
}

.source-status {
  flex: 0 0 auto;
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 7px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 12px;
  font-weight: 800;
}

.source-card-arrow {
  flex: 0 0 auto;
  color: var(--text-muted);
  transition: transform 0.18s ease;
}

.source-card.expanded .source-card-arrow {
  transform: rotate(180deg);
}

.source-card h4 {
  margin: 0 0 8px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 850;
  line-height: 1.45;
}

.source-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.source-origin {
  margin-bottom: 7px !important;
  color: var(--text-muted) !important;
}

.source-detail {
  margin-top: 13px;
  padding: 12px;
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: default;
}

.source-detail dl {
  display: grid;
  gap: 9px;
  margin: 0;
}

.source-detail div {
  display: grid;
  gap: 3px;
}

.source-detail dt {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 850;
}

.source-detail dd {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.source-detail blockquote {
  margin: 10px 0 0;
  padding: 9px 10px;
  border-left: 3px solid var(--primary-color);
  color: var(--text-main);
  background: var(--card-bg);
  font-size: 13px;
  line-height: 1.65;
}

.source-kb-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  margin-top: 14px;
  padding: 0 11px;
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  font-size: 13px;
}

.source-kb-button:hover {
  color: var(--primary-color);
  border-color: var(--primary-border);
}

.docx-preview-panel {
  flex: 0 0 50%;
  width: 50%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  background: var(--bg-color);
}

.docx-preview-header {
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 16px 0 18px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(248, 250, 253, 0.96);
  backdrop-filter: blur(10px);
}

.docx-preview-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.docx-preview-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: var(--primary-color);
  background: var(--primary-soft);
}

.docx-preview-title div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.docx-preview-title strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 850;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docx-preview-title span {
  color: var(--text-secondary);
  font-size: 12px;
}

.docx-preview-header button {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
}

.docx-preview-header button:hover {
  color: var(--text-secondary);
  background: var(--surface-soft);
}

.docx-preview-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
}

.docx-preview-page {
  width: 100%;
  min-height: calc(100vh - 104px);
  padding: 38px 42px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--card-bg);
  box-shadow: 0 16px 34px rgba(31, 57, 114, 0.10);
}

.docx-preview-cover {
  padding-bottom: 18px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}

.docx-preview-cover p {
  margin: 0 0 8px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 850;
}

.docx-preview-cover h1 {
  margin: 0 0 18px;
  color: var(--text-strong);
  font-size: 26px;
  line-height: 1.35;
  font-weight: 900;
}

.docx-preview-cover dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
}

.docx-preview-cover dt {
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.docx-preview-cover dd {
  margin: 0;
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.5;
}

.docx-preview-section {
  margin-top: 22px;
}

.docx-preview-section h2 {
  margin: 0 0 10px;
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.45;
  font-weight: 900;
}

.docx-preview-section p,
.docx-preview-section li {
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.9;
}

.docx-preview-section p {
  margin: 0 0 10px;
  text-indent: 2em;
}

.docx-preview-section ul {
  margin: 0;
  padding-left: 22px;
}

.docx-preview-section li {
  margin-bottom: 8px;
}

:global(body.docx-preview-mode .sidebar) {
  width: 54px;
  padding: 12px 6px;
}

:global(body.docx-preview-mode .sidebar-header) {
  margin-bottom: 24px;
  padding: 0;
}

:global(body.docx-preview-mode .logo-area) {
  justify-content: center;
}

:global(body.docx-preview-mode .logo-icon) {
  width: 36px;
  height: 36px;
}

:global(body.docx-preview-mode .logo-text),
:global(body.docx-preview-mode .nav-label),
:global(body.docx-preview-mode .hot-badge-fire),
:global(body.docx-preview-mode .submenu-arrow),
:global(body.docx-preview-mode .knowledge-submenu) {
  display: none;
}

:global(body.docx-preview-mode .nav-item) {
  justify-content: center;
  padding: 9px 0;
}

:global(body.docx-preview-mode .nav-icon) {
  margin-right: 0;
}

:global(body.docx-preview-mode .sidebar-footer) {
  align-items: center;
}

:global(body.docx-preview-mode .sidebar-collapse) {
  display: none;
}

@media (max-width: 900px) {
  .chat-page.preview-split .chat-main {
    flex: 1 1 auto;
    width: 100%;
    border-right: 0;
  }

  .chat-page.preview-split .answer-scroll {
    padding: 18px 16px 20px;
  }

  .chat-page.preview-split .composer-wrap {
    padding: 0 14px 14px;
  }

  .answer-conversation.with-source-drawer .answer-scroll {
    padding-right: 16px;
  }

  .composer-wrap.with-source-drawer {
    margin-right: 0;
  }

  .source-drawer,
  .docx-preview-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 64px;
    z-index: 40;
    width: auto;
    height: 100%;
  }

  .docx-preview-scroll {
    padding: 14px;
  }

  .docx-preview-page {
    min-height: calc(100vh - 88px);
    padding: 26px 24px;
  }

  .docx-preview-cover h1 {
    font-size: 24px;
    overflow-wrap: anywhere;
  }

  .docx-preview-cover dl {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .chat-header {
    padding: 0 16px;
  }

  .composer-wrap {
    padding: 0 14px 14px;
  }

  .composer-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    flex-wrap: wrap;
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
