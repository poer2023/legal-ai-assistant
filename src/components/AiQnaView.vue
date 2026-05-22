<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronDown,
  Check,
  CornerDownLeft,
  Copy,
  FileText,
  History,
  Image as ImageIcon,
  Mic,
  Pencil,
  Plus,
  Puzzle,
  Send,
  Share2,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-vue-next';
import ChatInput from './ChatInput.vue';
import type { ComposerPickedAsset, ComposerSubmitOptions } from './ChatInput.vue';
import SkillDropdownContent from './SkillDropdownContent.vue';
import SkillManageModal from './SkillManageModal.vue';
import TemplateDropdownContent from './TemplateDropdownContent.vue';
import TemplateManageModal from './TemplateManageModal.vue';
import { defaultTemplateAssets, type TemplateAsset } from '../data/legalAssets';
import { getAnySkillByNameOrId, getSkillByNameOrId, isSkillEnabled, markSkillUsed, persistCustomSkillNow, setSkillEnabled, upsertCustomSkill, type SkillCatalogItem, type SkillFile } from '../data/skillCatalog';
import { docxLegalResearchMock } from '../data/docxLegalResearchMock';
import { streamSkillWithSkillCreator, type SkillCreatorAnswers } from '../services/skillCreator';
import {
  evaluateSkillCreatorIntake,
  type SkillCreatorGuideAnswer,
  type SkillCreatorGuideAssetSlot,
  type SkillCreatorGuideOption,
  type SkillCreatorGuideStep,
  type SkillCreatorIntakeEvaluationResult,
} from '../services/skillCreatorGuide';
import { generateDeepSeekConversationTitle, streamDeepSeekMessage } from '../services/deepseekChat';
import { useChatHistory } from '../stores/chatHistory';
import { useWorkspaces } from '../stores/workspaces';

type PromptPart = {
  type: 'text' | 'skill' | 'template' | 'asset';
  value: string;
  assetKind?: 'template' | 'knowledge-file' | 'local-file';
  sourceLabel?: string;
};

type SkillCreatorMaterialKind = 'local-file' | 'knowledge-file' | 'template' | 'history-output' | 'example-output' | 'team-rule';

type SkillCreatorMaterialOption = {
  id: string;
  label: string;
  description: string;
  name: string;
  sourceLabel: string;
  kind: SkillCreatorMaterialKind;
  slotId?: string;
  slotTitle?: string;
};

type SkillCreatorCompletionAction = 'enable-and-use' | 'inspect-skill' | 'edit-references' | 'publish-settings';

type SkillCreatorCompletionOption = {
  id: SkillCreatorCompletionAction;
  label: string;
  description: string;
  recommended?: boolean;
};

type InlineSegment = {
  type: 'text' | 'strong' | 'code' | 'source';
  value: string;
};

type ChatArtifact = {
  id: string;
  title: string;
  kind: 'document' | 'code' | 'html';
  language: string;
  content: string;
  summary: string;
  sourceStart: number;
  sourceEnd: number;
};

type SkillPublishVisibility = 'personal' | 'group' | 'team';
type ShareablePublishVisibility = Exclude<SkillPublishVisibility, 'personal'>;

const deprecatedMockHistoryIds = new Set(['mock-docx-nda', 'mock-nda-default']);

type SkillPublishPermissionSettings = {
  allowCopy: boolean;
  allowRemix: boolean;
  showPublisherName: boolean;
  publisherName: string;
};

type SkillPublishSettings = {
  iconDataUrl: string;
  name: string;
  description: string;
  visibility: SkillPublishVisibility;
  scopePermissions: Record<ShareablePublishVisibility, SkillPublishPermissionSettings>;
};

const defaultPublisherName = '涌见AI';
const skillPublishSettingsStorageKey = 'legal-version-skill-publish-settings';

const createDefaultPublishPermission = (): SkillPublishPermissionSettings => ({
  allowCopy: false,
  allowRemix: false,
  showPublisherName: true,
  publisherName: defaultPublisherName,
});

const publishVisibilityOptions: Array<{
  id: SkillPublishVisibility;
  label: string;
  description: string;
  permissionSubject?: string;
}> = [
  { id: 'personal', label: '仅自己', description: '只保存在个人技能区，可随时继续调整。' },
  { id: 'group', label: '小组', description: '小组成员可以在技能库中查看和调用。', permissionSubject: '小组成员' },
  { id: 'team', label: '本团队', description: '本团队成员可以在技能库中查看和调用。', permissionSubject: '本团队成员' },
];
const defaultPublishVisibilityOption = publishVisibilityOptions[0]!;

const route = useRoute();
const router = useRouter();
const {
  addMockConversation,
  applyGeneratedConversationTitle,
  deleteConversation,
  findHistoryItem,
  getCachedConversation,
  loadHistory,
  recentHistory,
  updateConversationAnswer,
  upsertSpecialConversation,
} = useChatHistory();
const { setActiveWorkspace } = useWorkspaces();
const inputValue = ref('');
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null);
const showActionMenu = ref(false);
const showSkillMenu = ref(false);
const showTemplateMenu = ref(false);
const showSkillManageModal = ref(false);
const showTemplateManageModal = ref(false);
const showSourceNotice = ref(true);
const hasCompletedMock = ref(false);
const isReferenceDrawerOpen = ref(false);
const isDocxPreviewOpen = ref(false);
const isArtifactPreviewOpen = ref(false);
const isProcessExpanded = ref(false);
const isThinkingExpanded = ref(true);
const activeReferenceId = ref<number | null>(null);
const activeArtifactId = ref('');
const expandedReferenceIds = ref<Set<number>>(new Set());
const completedQuestion = ref('');
const selectedTemplate = ref<TemplateAsset | null>(null);
const generatedAnswer = ref('');
const answerModel = ref('');
const answerError = ref('');
const answerNotice = ref('');
const isGeneratingAnswer = ref(false);
const handledRoutePromptKey = ref('');
const activeHistoryId = ref('');
const toastMessage = ref('');
const liveThinkingContent = ref('');
const isLiveThinkingExpanded = ref(false);
const skillValidationStatus = ref<'idle' | 'checking' | 'complete' | 'error'>('idle');
const skillValidationMessage = ref('');
const createdSkillResult = ref<SkillCatalogItem | null>(null);
const activeCreatedSkillId = ref('');
const lastAutoOpenedArtifactId = ref('');
const pendingSkillCreatorPrompt = ref('');
const isSkillCreatorFlowActive = ref(false);
const pendingSkillCreatorStep = ref<SkillCreatorGuideStep | null>(null);
const pendingSkillCreatorMaterialStep = ref<SkillCreatorGuideStep | null>(null);
const pendingSkillCreatorMaterialPrompt = ref('');
const skillCreatorIntakeAnswers = ref<SkillCreatorGuideAnswer[]>([]);
const isSkillCreatorOtherOpen = ref(false);
const skillCreatorOtherInput = ref('');
const isSkillCreatorSelectorDismissed = ref(false);
const isSkillCreatorCompletionSelectorDismissed = ref(false);
const skillCreatorOtherInputRef = ref<HTMLInputElement | null>(null);
const answerScrollRef = ref<HTMLElement | null>(null);
const artifactPreviewScrollRef = ref<HTMLElement | null>(null);
const chatPageRef = ref<HTMLElement | null>(null);
const isArtifactEditing = ref(false);
const isSavingArtifactEdit = ref(false);
const artifactEditContent = ref('');
const artifactEditorRef = ref<HTMLTextAreaElement | null>(null);
const artifactPanelMode = ref<'preview' | 'publish'>('preview');
const activePublishSkillId = ref('');
const publishSettings = ref<SkillPublishSettings>({
  iconDataUrl: '',
  name: '',
  description: '',
  visibility: 'personal',
  scopePermissions: {
    group: createDefaultPublishPermission(),
    team: createDefaultPublishPermission(),
  },
});
const publishIconInputRef = ref<HTMLInputElement | null>(null);
let toastTimer: number | undefined;
let liveAutoScrollFrame: number | undefined;
const previewPanelRatio = ref(0.5);
const isPreviewResizing = ref(false);
const chatMainMinWidth = 420;
const previewPanelMinWidth = 420;
const pendingAutoScrollTargets = new Set<'answer' | 'artifact'>();
const selectedDialogMode = ref('research');
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));
const templateCreatorPrompt = '请使用 /template-creator 帮我创建一个可复用的写作模板，我的需求/源文件如下：';
const skillCreatorPrompt = '请使用 /skill-creator 帮我创建一个可复用的技能，我的需求如下：';
const createSkillPrompt = (skillName: string) =>
  `请使用 /${skillName} 帮我完成以下任务，我的需求如下：`;
const createTemplatePrompt = (template: TemplateAsset) =>
  `请使用 模板：${template.name} 帮我按照这个模板完成写作，我的需求/源文件如下：`;

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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string): string => escapeHtml(value).replace(/`/g, '&#96;');

const isSafeLink = (value: string): boolean => /^(https?:\/\/|mailto:)/i.test(value);

const renderInlineMarkdown = (text: string): string => {
  const pattern = /(`([^`]+)`|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|\[([^\]]+)\]\(([^)\s]+)\)|\[(\d+)\])/g;
  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      html += `<code class="live-answer-code">${escapeHtml(match[2])}</code>`;
    } else if (match[3]) {
      html += `<strong class="live-answer-strong">${renderInlineMarkdown(match[3])}</strong>`;
    } else if (match[4]) {
      html += `<strong class="live-answer-strong">${renderInlineMarkdown(match[4])}</strong>`;
    } else if (match[5] && match[6]) {
      const href = match[6].trim();
      html += isSafeLink(href)
        ? `<a class="live-answer-link" href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${renderInlineMarkdown(match[5])}</a>`
        : escapeHtml(match[0]);
    } else if (match[7]) {
      html += `<span class="live-source-token">[${escapeHtml(match[7])}]</span>`;
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    html += escapeHtml(text.slice(lastIndex));
  }

  return html;
};

const renderMarkdownTable = (rows: string[]): string => {
  const splitRow = (row: string): string[] => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  const header = splitRow(rows[0] || '');
  const bodyRows = rows.slice(2).map(splitRow).filter((cells) => cells.some(Boolean));

  return [
    '<div class="live-answer-table-wrap"><table class="live-answer-table">',
    '<thead><tr>',
    ...header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`),
    '</tr></thead>',
    bodyRows.length ? '<tbody>' : '',
    ...bodyRows.map((cells) => [
      '<tr>',
      ...header.map((_, index) => `<td>${renderInlineMarkdown(cells[index] || '')}</td>`),
      '</tr>',
    ].join('')),
    bodyRows.length ? '</tbody>' : '',
    '</table></div>',
  ].join('');
};

const renderSelectionNoticeHtml = (text: string): string =>
  text
    .split('\n')
    .map((line) => {
      const match = line.match(/^(.*?)(\s*已选择\s+)(.+?)([。.]?)$/);
      if (!match) return renderInlineMarkdown(line);
      return [
        `<span class="live-selection-question">${renderInlineMarkdown((match[1] || '').trimEnd())}</span>`,
        `<span class="live-selection-action">${escapeHtml(match[2] || '')}</span>`,
        `<span class="live-selection-choice">${renderInlineMarkdown(match[3] || '')}</span>`,
        escapeHtml(match[4] || ''),
      ].join('');
    })
    .join('<br>');

const hideSkillCreatorArtifactList = (content: string) => {
  const listHeadingPattern = /^##\s*2\.\s*生成物清单\s*$/im;
  const listMatch = listHeadingPattern.exec(content);
  if (!listMatch || listMatch.index === undefined) {
    return content.replace(/^##\s*3\.\s*逐个生成生成物\s*$/im, '## 2. 生成技能');
  }

  const listStart = listMatch.index;
  const listBodyStart = listStart + listMatch[0].length;
  const afterList = content.slice(listBodyStart);
  const nextStepMatch = afterList.match(/\n##\s*3\.\s*逐个生成生成物\s*$/im);
  const listEnd = nextStepMatch?.index === undefined
    ? content.length
    : listBodyStart + nextStepMatch.index;
  const rest = nextStepMatch?.index === undefined
    ? ''
    : content.slice(listEnd).replace(/\n##\s*3\.\s*逐个生成生成物\s*$/im, '\n## 2. 生成技能');

  return `${content.slice(0, listStart).trimEnd()}\n\n${rest.trimStart()}`;
};

const stripSkillCreatorRuntimeMarkers = (content: string): string => {
  let text = content.replace(/\r\n/g, '\n');

  text = text.replace(/\n*\[\[skill-completion-selector-dismissed\]\]\s*$/g, '');
  text = text.replace(/\n+技能已经创建完成[^\n]*(?:\n+\[\[skill-package:[^\n]*\]\])?\s*$/g, '');
  text = text.replace(/\n+\[\[skill-package:[^\n]*\]\]\s*$/g, '');
  text = text.replace(/\n+已生成技能草稿：[\s\S]*?等待系统解析 skill_json、写入技能库并完成读回校验。\s*$/g, '');
  text = text.replace(/\n+系统校验：[\s\S]*$/g, '');

  return text.replace(/\s+$/g, '');
};

const formatSkillCreatorProcessContent = (content: string): string => {
  let text = normalizeGeneratedArtifactBoundaries(content.replace(/\r\n/g, '\n'));
  const generationStart = text.search(/<generation_markdown>/i);
  if (generationStart >= 0) {
    text = text.slice(generationStart).replace(/^<generation_markdown>/i, '');
  }

  text = text
    .replace(/<\/generation_markdown>/ig, '')
    .replace(/\n*##\s*4\.\s*待系统解析[\s\S]*?(?=<skill_json>|$)/i, '');

  while (true) {
    const jsonStart = text.search(/<skill_json>/i);
    if (jsonStart < 0) break;

    const beforeJson = text.slice(0, jsonStart);
    const rest = text.slice(jsonStart);
    const endMatch = rest.match(/<\/skill_json>/i);
    if (!endMatch) {
      text = beforeJson;
      break;
    }

    text = beforeJson + rest.slice((endMatch.index ?? 0) + endMatch[0].length);
  }

  return hideSkillCreatorArtifactList(stripSkillCreatorRuntimeMarkers(text).trimStart());
};

const formatSkillCreatorDisplayContent = (content: string): string => {
  let text = normalizeGeneratedArtifactBoundaries(content.replace(/\r\n/g, '\n'))
    .split(skillCompletionDismissedMarker).join('');
  const trimmed = text.trimStart().toLowerCase();

  if (!text.match(/<generation_markdown>/i) && '<generation_markdown>'.startsWith(trimmed)) {
    return '';
  }

  const partialGenerationEnd = text.match(/\s*<\/[^>\n]*$/i);
  if (partialGenerationEnd && '</generation_markdown>'.startsWith(partialGenerationEnd[0].trim().toLowerCase())) {
    text = text.slice(0, partialGenerationEnd.index);
  }

  while (true) {
    const generationStart = text.search(/<generation_markdown>/i);
    if (generationStart < 0) break;

    const beforeGeneration = text.slice(0, generationStart);
    const rest = text.slice(generationStart);
    const endMatch = rest.match(/<\/generation_markdown>/i);
    if (!endMatch) {
      text = beforeGeneration;
      break;
    }

    text = beforeGeneration + rest.slice((endMatch.index ?? 0) + endMatch[0].length);
  }

  const partialSkillJsonStart = text.match(/\s*<[^>\n]*$/i);
  if (partialSkillJsonStart && '<skill_json>'.startsWith(partialSkillJsonStart[0].trim().toLowerCase())) {
    text = text.slice(0, partialSkillJsonStart.index);
  }

  const partialGenerationStart = text.match(/\s*<[^>\n]*$/i);
  if (partialGenerationStart && '<generation_markdown>'.startsWith(partialGenerationStart[0].trim().toLowerCase())) {
    text = text.slice(0, partialGenerationStart.index);
  }

  while (true) {
    const jsonStart = text.search(/<skill_json>/i);
    if (jsonStart < 0) break;

    const beforeJson = text.slice(0, jsonStart);
    const rest = text.slice(jsonStart);
    const endMatch = rest.match(/<\/skill_json>/i);
    if (!endMatch) {
      text = beforeJson;
      break;
    }

    text = beforeJson + rest.slice((endMatch.index ?? 0) + endMatch[0].length);
  }

  return hideSkillCreatorArtifactList(text.trimStart()).trimStart();
};

const extractCreatedSkillIdFromContent = (content: string): string => {
  const explicitMatch = content.match(/技能\s*ID\s*[:：]\s*([^\s\n]+)/);
  if (explicitMatch?.[1]) return explicitMatch[1].trim();

  const taggedJson = content.match(/<skill_json>\s*([\s\S]*?)\s*<\/skill_json>/i);
  const jsonBody = taggedJson?.[1]?.trim();
  if (jsonBody) {
    try {
      const parsed = JSON.parse(jsonBody.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, ''));
      if (typeof parsed?.id === 'string' && parsed.id.trim()) return parsed.id.trim();
    } catch {
      const idMatch = jsonBody.match(/"id"\s*:\s*"([^"]+)"/);
      if (idMatch?.[1]) return idMatch[1].trim();
    }
  }

  return '';
};

const normalizeArtifactTitle = (value: string, fallback: string) => {
  const title = value
    .replace(/^文件名\s*[:：]\s*/i, '')
    .replace(/^filename\s*[:：]\s*/i, '')
    .replace(/^file\s*[:：]\s*/i, '')
    .replace(/^path\s*[:：]\s*/i, '')
    .replace(/^`|`$/g, '')
    .trim();

  return title || fallback;
};

const getArtifactExtension = (title: string, language: string) => {
  const extensionMatch = title.match(/\.([A-Za-z0-9_-]+)$/);
  if (extensionMatch?.[1]) return extensionMatch[1].toLowerCase();
  return language.toLowerCase();
};

const getArtifactKind = (title: string, language: string): ChatArtifact['kind'] => {
  const extension = getArtifactExtension(title, language);
  if (['html', 'htm'].includes(extension)) return 'html';
  if (['js', 'jsx', 'ts', 'tsx', 'vue', 'css', 'json', 'sql', 'py', 'java', 'go', 'rs', 'sh', 'yaml', 'yml'].includes(extension)) {
    return 'code';
  }
  return 'document';
};

const getArtifactSummary = (content: string) => {
  return content
    .replace(/[#*_`>|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 92);
};

const artifactFormatMeta: Record<string, { label: string; name: string; className: string }> = {
  md: { label: 'MD', name: 'Markdown', className: 'format-md' },
  markdown: { label: 'MD', name: 'Markdown', className: 'format-md' },
  json: { label: 'JSON', name: 'JSON', className: 'format-json' },
  yaml: { label: 'YML', name: 'YAML', className: 'format-yaml' },
  yml: { label: 'YML', name: 'YAML', className: 'format-yaml' },
  ts: { label: 'TS', name: 'TypeScript', className: 'format-code' },
  tsx: { label: 'TSX', name: 'TSX', className: 'format-code' },
  js: { label: 'JS', name: 'JavaScript', className: 'format-code' },
  jsx: { label: 'JSX', name: 'JSX', className: 'format-code' },
  vue: { label: 'VUE', name: 'Vue', className: 'format-code' },
  html: { label: 'HTML', name: 'HTML', className: 'format-html' },
  htm: { label: 'HTML', name: 'HTML', className: 'format-html' },
  css: { label: 'CSS', name: 'CSS', className: 'format-code' },
  sql: { label: 'SQL', name: 'SQL', className: 'format-code' },
  doc: { label: 'DOC', name: 'Word', className: 'format-doc' },
  docx: { label: 'DOCX', name: 'Word', className: 'format-doc' },
};

const getArtifactFileMeta = (artifact: ChatArtifact) => {
  const extension = getArtifactExtension(artifact.title, artifact.language);
  return artifactFormatMeta[extension] ?? {
    label: extension.slice(0, 4).toUpperCase() || 'FILE',
    name: extension.toUpperCase() || '文件',
    className: 'format-file',
  };
};

const generatedArtifactHeadingPattern = /^#{1,6}\s*(?:系统确认生成物|生成物)\s*\d+(?:\s*\/\s*\d+)?\s*[:：]\s*(.+)$/;
const generatedArtifactHeadingGlobalPattern = /^#{1,6}\s*(?:系统确认生成物|生成物)\s*\d+(?:\s*\/\s*\d+)?\s*[:：]\s*(.+)$/gm;

const findArtifactTitleBeforeFence = (text: string) => {
  const previousLines = text.split('\n').map((line) => line.trim()).filter(Boolean).slice(-4).reverse();
  const titleLine = previousLines.find((line) =>
    generatedArtifactHeadingPattern.test(line)
    || /^(文件名|filename|file|path)\s*[:：]/i.test(line)
    || /^[\w./\-\u4e00-\u9fa5\s（）()]+?\.[A-Za-z0-9_-]{1,8}$/.test(line.replace(/^[-*]\s*/, ''))
  );

  if (!titleLine) return '';

  const generatedMatch = titleLine.match(generatedArtifactHeadingPattern);
  return normalizeArtifactTitle((generatedMatch?.[1] || titleLine).replace(/^[-*]\s*/, ''), '');
};

const findGeneratedArtifactHeadingBeforeFence = (content: string, fenceStart: number) => {
  let end = fenceStart;
  while (end > 0 && /\s/.test(content[end - 1] || '')) {
    end -= 1;
  }

  const start = content.lastIndexOf('\n', end - 1) + 1;
  const line = content.slice(start, end).trim();
  const match = line.match(generatedArtifactHeadingPattern);
  if (!match?.[1]) return null;

  return {
    start,
    title: normalizeArtifactTitle(match[1], ''),
  };
};

const createArtifactId = (title: string) => {
  const slug = title
    .replace(/[^\w\u4e00-\u9fa5.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `artifact-${slug || 'file'}`;
};

const createArtifactFromSkillFile = (file: SkillFile, index: number): ChatArtifact => {
  const language = file.type || getArtifactExtension(file.path || file.name, 'markdown');
  const title = file.path || file.name || `生成文件 ${index + 1}`;
  const content = stripSkillCreatorRuntimeMarkers(file.content || '');
  return {
    id: createArtifactId(title),
    title,
    kind: getArtifactKind(title, language),
    language,
    content,
    summary: getArtifactSummary(content),
    sourceStart: -1,
    sourceEnd: -1,
  };
};

const createArtifactsFromSkill = (skill: SkillCatalogItem | null | undefined): ChatArtifact[] =>
  (skill?.files || []).map((file, index) => createArtifactFromSkillFile(file, index));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeGeneratedArtifactBoundaries = (content: string) =>
  content.replace(/(`{3,})(?=#{1,6}\s*(?:系统确认生成物|生成物)\s*\d)/g, '$1\n\n');

type GeneratedArtifactSection = {
  start: number;
  end: number;
  title: string;
  language: string;
  content: string;
};

const extractGeneratedArtifactSections = (content: string): GeneratedArtifactSection[] => {
  content = normalizeGeneratedArtifactBoundaries(content);
  const headings: Array<{ start: number; end: number; title: string }> = [];
  let match: RegExpExecArray | null;
  generatedArtifactHeadingGlobalPattern.lastIndex = 0;

  while ((match = generatedArtifactHeadingGlobalPattern.exec(content)) !== null) {
    headings.push({
      start: match.index,
      end: generatedArtifactHeadingGlobalPattern.lastIndex,
      title: normalizeArtifactTitle(match[1] || '', ''),
    });
  }

  return headings.map((heading, index) => {
    const nextGeneratedHeadingStart = headings[index + 1]?.start ?? content.length;
    const trailingContent = content.slice(heading.end, nextGeneratedHeadingStart);
    const stopMatch = trailingContent.match(/\n(?=<\/generation_markdown>|<skill_json>|技能已经创建完成|已整理成一个可预览的技能包|\[\[skill-package:|\[\[skill-completion-selector-dismissed\]\]|系统校验[:：]|技能创建完成[:：]|系统创建完成[:：]|系统保存流程[:：]|系统保存结果[:：]|文件结构[:：]|可在「技能|##\s*系统解析)/i);
    const sectionEnd = stopMatch?.index === undefined
      ? nextGeneratedHeadingStart
      : heading.end + stopMatch.index;
    const sectionBody = content.slice(heading.end, sectionEnd);
    const fenceMatch = sectionBody.match(/(`{3,})([^\n`]*)\n?/);

    if (!fenceMatch || fenceMatch.index === undefined) {
      return {
        start: heading.start,
        end: sectionEnd,
        title: heading.title,
        language: 'markdown',
        content: '',
      };
    }

    const contentStart = heading.end + fenceMatch.index + fenceMatch[0].length;
    const fenceMarker = fenceMatch[1] || '```';
    const artifactBody = content.slice(contentStart, sectionEnd);
    const closingFencePattern = new RegExp(`\\n?${escapeRegExp(fenceMarker)}\\s*$`);
    const artifactContent = stripSkillCreatorRuntimeMarkers(
      artifactBody.replace(closingFencePattern, '').replace(/\s+$/, ''),
    );

    return {
      start: heading.start,
      end: sectionEnd,
      title: heading.title,
      language: (fenceMatch[2] || 'markdown').trim() || 'markdown',
      content: artifactContent,
    };
  });
};

const extractGeneratedArtifactRanges = (content: string) =>
  extractGeneratedArtifactSections(content).map((section) => ({
    start: section.start,
    end: section.end,
  }));

const extractArtifactsFromAnswer = (content: string, options: { generatedOnly?: boolean } = {}): ChatArtifact[] => {
  if (options.generatedOnly) {
    const generatedArtifactMap = new Map<string, ChatArtifact>();
    extractGeneratedArtifactSections(content).forEach((section, index) => {
      const title = normalizeArtifactTitle(section.title, `生成文件 ${index + 1}.md`);
      const language = section.language || 'markdown';
      const artifactContent = stripSkillCreatorRuntimeMarkers(section.content);
      const artifact: ChatArtifact = {
        id: createArtifactId(title),
        title,
        kind: getArtifactKind(title, language),
        language,
        content: artifactContent,
        summary: artifactContent ? getArtifactSummary(artifactContent) : '正在生成文件内容...',
        sourceStart: section.start,
        sourceEnd: section.end,
      };
      const existingArtifact = generatedArtifactMap.get(title);
      generatedArtifactMap.set(title, existingArtifact
        ? {
            ...artifact,
            id: existingArtifact.id,
            sourceStart: existingArtifact.sourceStart,
            sourceEnd: existingArtifact.sourceEnd,
          }
        : artifact);
    });

    return [...generatedArtifactMap.values()].sort((left, right) => left.sourceStart - right.sourceStart);
  }

  const artifacts: ChatArtifact[] = [];
  const fencePattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(content)) !== null) {
    const rawInfo = (match[1] || '').trim();
    const artifactContent = stripSkillCreatorRuntimeMarkers((match[2] || '').trim());
    if (artifactContent.length < 24) continue;
    const heading = findGeneratedArtifactHeadingBeforeFence(content, match.index);
    if (options.generatedOnly && !heading) continue;

    const infoTokens = rawInfo.split(/\s+/).filter(Boolean);
    const fileToken = infoTokens.find((token) => /[/.\\]|\.([A-Za-z0-9_-]{1,8})$/.test(token));
    const language = (fileToken ? infoTokens.find((token) => token !== fileToken) : infoTokens[0]) || 'markdown';
    const title = normalizeArtifactTitle(
      heading?.title || fileToken || findArtifactTitleBeforeFence(content.slice(0, match.index)),
      `生成文件 ${artifacts.length + 1}.${language === 'markdown' ? 'md' : language}`,
    );
    const artifact: ChatArtifact = {
      id: createArtifactId(title),
      title,
      kind: getArtifactKind(title, language),
      language,
      content: artifactContent,
      summary: getArtifactSummary(artifactContent),
      sourceStart: heading?.start ?? match.index,
      sourceEnd: fencePattern.lastIndex,
    };

    artifacts.push(artifact);
  }

  return artifacts;
};

const renderArtifactCardHtml = (artifact: ChatArtifact): string => {
  const fileMeta = getArtifactFileMeta(artifact);
  return [
    `<button type="button" class="artifact-card inline-artifact-card" data-artifact-id="${escapeAttribute(artifact.id)}">`,
    `<span class="artifact-file-icon ${escapeAttribute(fileMeta.className)}" aria-hidden="true"><span>${escapeHtml(fileMeta.label)}</span></span>`,
    '<span class="artifact-card-main">',
    `<strong>${escapeHtml(artifact.title)}</strong>`,
    `<span>${escapeHtml(artifact.summary || '已生成可预览文件')}</span>`,
    '</span>',
    '<span class="artifact-card-kind">预览</span>',
    '</button>',
  ].join('');
};

const skillCreatorThinkingAnchor = '[[skill-creator-thinking-anchor]]';
const skillCompletionDismissedMarker = '[[skill-completion-selector-dismissed]]';
const skillPackageMarkerPattern = /^\[\[skill-package:([^|\]]+)\|([^|\]]*)\|(\d+)\]\]$/;
const hasSkillCompletionSelectorDismissed = (content: string) =>
  content.includes(skillCompletionDismissedMarker);
const hasSkillCreatorCompletionMarker = (content: string) =>
  /技能已经创建完成|\[\[skill-package:|<skill_json>|技能完整度校验通过|已保存为个人草稿|已整理成一个可预览的技能包/i.test(content);

const createSkillPackageMarker = (skill: SkillCatalogItem, fileCount: number) =>
  `[[skill-package:${encodeURIComponent(skill.id)}|${encodeURIComponent(skill.name)}|${fileCount}]]`;

const renderSkillPackageCardHtml = (id: string, encodedName: string, fileCount: string) => {
  const decodedName = (() => {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return encodedName;
    }
  })();
  const decodedId = (() => {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  })();
  const count = Number(fileCount) || 0;

  return [
    `<div class="skill-package-card" data-skill-package="${escapeAttribute(decodedId)}" data-skill-package-name="${escapeAttribute(decodedName)}">`,
    '<span class="skill-package-icon" aria-hidden="true"><span>SK</span></span>',
    '<span class="skill-package-main">',
    `<strong>${escapeHtml(decodedName || '技能包')}</strong>`,
    `<small>${escapeHtml(decodedId)} · ${count || 1} 个技能文件</small>`,
    '</span>',
    '<span class="skill-package-actions">',
    `<button type="button" class="skill-package-action secondary" data-skill-package-download="${escapeAttribute(decodedId)}">下载</button>`,
    `<button type="button" class="skill-package-action primary" data-skill-package-save="${escapeAttribute(decodedId)}">保存</button>`,
    '</span>',
    '</div>',
  ].join('');
};

const isOutputArtifact = (artifact: ChatArtifact) =>
  /(^|[/_.-])(output|outputs|pattern|patterns|template|report|draft|document)([/_.-]|$)/i.test(artifact.title);

const isReferenceArtifact = (artifact: ChatArtifact) =>
  /(^|[/_.-])(reference|references|checklist|rules|guardrails|intake|schema|prompt|prompts)([/_.-]|$)/i.test(artifact.title)
  || /^SKILL\.md$/i.test(artifact.title) === false && /说明|规则|清单|约束|输入/.test(artifact.summary);

const getSkillArtifactTypeMeta = (artifact: ChatArtifact) => {
  if (/^SKILL\.md$/i.test(artifact.title)) {
    return { label: '主入口', className: 'main', description: '技能说明与调用规则', presentation: 'plain' };
  }
  if (isOutputArtifact(artifact)) {
    return { label: '模板类', className: 'template', description: '定义最终交付物结构', presentation: 'card' };
  }
  if (isReferenceArtifact(artifact)) {
    return { label: '规则类', className: 'rule', description: '补充输入、检查或边界规则', presentation: 'plain' };
  }
  return { label: '支持文件', className: 'support', description: '技能运行所需的辅助内容', presentation: 'plain' };
};

type MarkdownRenderOptions = {
  renderMarkdownCodeBlocks?: boolean;
};

const isMarkdownLanguage = (language: string): boolean =>
  ['md', 'markdown'].includes(language.trim().toLowerCase());

const renderMarkdownBlocks = (text: string, options: MarkdownRenderOptions = {}): string => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  const paragraphLines: string[] = [];
  let listType: 'ol' | 'ul' | null = null;
  let listItems: string[] = [];
  let index = 0;

  const flushParagraph = (): void => {
    const paragraph = paragraphLines.join('\n').trim();
    paragraphLines.length = 0;
    if (paragraph) {
      html.push(`<p class="live-answer-paragraph">${renderInlineMarkdown(paragraph).replace(/\n/g, '<br>')}</p>`);
    }
  };

  const flushList = (): void => {
    if (!listType || !listItems.length) return;
    html.push(`<${listType} class="live-answer-list${listType === 'ol' ? ' ordered' : ''}">`);
    listItems.forEach((item) => {
      html.push(`<li>${renderInlineMarkdown(item)}</li>`);
    });
    html.push(`</${listType}>`);
    listType = null;
    listItems = [];
  };

  const collectTable = (): string[] => {
    const rows: string[] = [];
    while (index < lines.length && /\|/.test(lines[index] || '')) {
      rows.push(lines[index] || '');
      index += 1;
    }
    return rows;
  };

  while (index < lines.length) {
    const rawLine = lines[index] || '';
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      index += 1;
      continue;
    }

    if (line === skillCreatorThinkingAnchor) {
      flushParagraph();
      flushList();
      index += 1;
      continue;
    }

    const skillPackageMatch = line.match(skillPackageMarkerPattern);
    if (skillPackageMatch) {
      flushParagraph();
      flushList();
      html.push(renderSkillPackageCardHtml(
        skillPackageMatch[1] || '',
        skillPackageMatch[2] || '',
        skillPackageMatch[3] || '1',
      ));
      index += 1;
      continue;
    }

    const collapseMatch = line.match(/^:::collapse\s+(.+)$/);
    if (collapseMatch) {
      flushParagraph();
      flushList();
      index += 1;
      const collapseLines: string[] = [];
      while (index < lines.length && (lines[index] || '').trim() !== ':::') {
        collapseLines.push(lines[index] || '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      html.push([
        '<details class="live-answer-collapse">',
        `<summary>${renderInlineMarkdown((collapseMatch[1] || '').trim())}</summary>`,
        '<div class="live-answer-collapse-body">',
        renderMarkdownBlocks(collapseLines.join('\n'), options),
        '</div>',
        '</details>',
      ].join(''));
      continue;
    }

    const fenceMatch = line.match(/^(`{3,})\s*([A-Za-z0-9_-]+)?\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      index += 1;
      const fenceMarker = fenceMatch[1] || '```';
      const codeLines: string[] = [];
      const closingFencePattern = new RegExp(`^${escapeRegExp(fenceMarker)}\\s*$`);
      while (index < lines.length && !closingFencePattern.test((lines[index] || '').trim())) {
        codeLines.push(lines[index] || '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      const languageValue = fenceMatch[2] || '';

      if (options.renderMarkdownCodeBlocks && isMarkdownLanguage(languageValue)) {
        html.push(`<div class="live-answer-rendered-codeblock">${renderMarkdownBlocks(codeLines.join('\n'), options)}</div>`);
        continue;
      }

      const language = languageValue ? `<span>${escapeHtml(languageValue)}</span>` : '';
      html.push(`<pre class="live-answer-codeblock">${language}<code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(4, headingMatch[1]?.length || 3);
      html.push(`<h${level} class="live-answer-heading level-${level}">${renderInlineMarkdown((headingMatch[2] || '').trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      flushParagraph();
      flushList();
      html.push('<hr class="live-answer-rule">');
      index += 1;
      continue;
    }

    if (/^\|?.+\|.+$/.test(line) && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test((lines[index + 1] || '').trim())) {
      flushParagraph();
      flushList();
      html.push(renderMarkdownTable(collectTable()));
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      const quoteLines = [quoteMatch[1] || ''];
      index += 1;
      while (index < lines.length) {
        const nextQuote = (lines[index] || '').trim().match(/^>\s?(.+)$/);
        if (!nextQuote) break;
        quoteLines.push(nextQuote[1] || '');
        index += 1;
      }
      const quoteText = quoteLines.join('\n');
      const quoteClass = /^“.+”\s*已(?:选择|补充|跳过)/.test(quoteText.trim())
        ? ' live-selection-notice'
        : '';
      const quoteHtml = quoteClass
        ? renderSelectionNoticeHtml(quoteText)
        : renderInlineMarkdown(quoteText).replace(/\n/g, '<br>');
      html.push(`<blockquote class="live-answer-quote${quoteClass}">${quoteHtml}</blockquote>`);
      continue;
    }

    const orderedMatch = line.match(/^(\d+)[.)、]\s+(.+)$/);
    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/);
    const checkboxMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    const nextListType = orderedMatch ? 'ol' : unorderedMatch || checkboxMatch ? 'ul' : null;
    const listText = checkboxMatch
      ? `${checkboxMatch[1]?.trim() ? '☑' : '☐'} ${checkboxMatch[2] || ''}`
      : orderedMatch?.[2] ?? unorderedMatch?.[1];

    if (nextListType && listText) {
      flushParagraph();
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(listText.trim());
      index += 1;
      continue;
    }

    flushList();
    paragraphLines.push(line);
    index += 1;
  }

  flushParagraph();
  flushList();

  return html.join('');
};

const renderLiveAnswerMarkdown = (text: string, inlineArtifacts: ChatArtifact[] = []): string => {
  if (!inlineArtifacts.length) return renderMarkdownBlocks(text);

  const artifactByRange = new Map(
    inlineArtifacts.map((artifact) => [`${artifact.sourceStart}:${artifact.sourceEnd}`, artifact]),
  );
  const ranges = extractGeneratedArtifactRanges(text).sort((left, right) => left.start - right.start);
  let html = '';
  let cursor = 0;

  ranges.forEach((range) => {
    if (range.start < cursor) return;
    html += renderMarkdownBlocks(text.slice(cursor, range.start));
    const artifact = artifactByRange.get(`${range.start}:${range.end}`);
    if (artifact) {
      html += renderArtifactCardHtml(artifact);
    }
    cursor = range.end;
  });

  html += renderMarkdownBlocks(text.slice(cursor));
  return html;
};

const unwrapWholeMarkdownFence = (content: string): string => {
  const text = content.replace(/\r\n/g, '\n').trim();
  const match = text.match(/^(`{3,})\s*(?:markdown|md)\s*\n([\s\S]*?)\n\1\s*$/i);
  return match?.[2]?.trim() || content;
};

const isMarkdownArtifact = (artifact: ChatArtifact): boolean =>
  isMarkdownLanguage(getArtifactExtension(artifact.title, artifact.language))
  || isMarkdownLanguage(artifact.language);

const renderArtifactDocumentPreview = (artifact: ChatArtifact): string => {
  const shouldRenderMarkdownCodeBlocks = isMarkdownArtifact(artifact);
  const content = shouldRenderMarkdownCodeBlocks
    ? unwrapWholeMarkdownFence(stripSkillCreatorRuntimeMarkers(artifact.content))
    : stripSkillCreatorRuntimeMarkers(artifact.content);

  return renderMarkdownBlocks(content, {
    renderMarkdownCodeBlocks: shouldRenderMarkdownCodeBlocks,
  });
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

const extractSkillCreatorBrief = (prompt: string) => {
  const withoutCommand = prompt
    .replace(/\/skill-creator\b/gi, ' ')
    .replace(/请使用\s+/g, ' ')
    .replace(/帮我创建一个可复用的技能[，,]?\s*我的需求如下[:：]?/g, ' ')
    .replace(/帮我创建一个/g, '创建')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutCommand || '创建一个可复用的法律工作流技能';
};

const extractInitialSkillCreatorBrief = (prompt: string) =>
  extractSkillCreatorBrief(prompt.split(/\n\n用户补充：/)[0] ?? prompt);

const inferSkillCreatorAnswers = (prompt: string): SkillCreatorAnswers => {
  const normalized = prompt.toLowerCase();

  const scenario = /合同|协议|条款|红线|交易/.test(prompt)
    ? '合同 / 交易文件'
    : /尽调|调查|底稿/.test(prompt)
      ? '尽职调查'
      : /投融资|融资|并购|spa|term sheet/i.test(prompt)
        ? '投融资 / 并购'
        : /基金|合规|备案|监管/.test(prompt)
          ? '基金 / 合规'
          : '咨询意见';

  const output = /矩阵|问题表|风险表/.test(prompt)
    ? '风险矩阵 / 问题表'
    : /清单|checklist/i.test(prompt)
      ? '审查清单'
      : /流程|规程|步骤/.test(prompt)
        ? '工作步骤 / 操作规程'
        : /模板|条款库/.test(prompt)
          ? '模板 / 条款库'
          : 'Word 文书初稿';

  const source = /知识库|playbook|团队/.test(prompt)
    ? '团队知识库'
    : /模板|现有技能/.test(prompt)
      ? '现有模板 / 技能'
      : /纯文字|规则/.test(prompt) || normalized.length < 60
        ? '纯文字描述规则'
        : '上传或粘贴项目材料';

  return {
    scenario,
    source,
    output,
    scope: /团队|共享|全员/.test(prompt) ? '团队共享' : '仅个人使用',
  };
};

const buildSkillCreatorGenerationAnswers = (
  prompt: string,
  answers: SkillCreatorGuideAnswer[],
): SkillCreatorAnswers => {
  const inferred = inferSkillCreatorAnswers(prompt);
  const intakeSummary = answers.map((answer) => {
    const assetText = answer.assets?.length
      ? `；参考材料：${answer.assets.map((asset) => `${asset.sourceLabel} - ${asset.name}`).join('、')}`
      : '';
    return `${answer.title}：${answer.label}${answer.description ? `（${answer.description}）` : ''}${assetText}`;
  });
  const materials = answers.flatMap((answer) =>
    answer.assets?.map((asset) => `${asset.sourceLabel} - ${asset.name}（${asset.kind}）`) ?? []
  );
  const outputHints = answers
    .flatMap((answer) => answer.assets ?? [])
    .filter((asset) => /template|example|history/i.test(asset.kind))
    .map((asset) => `${asset.sourceLabel} - ${asset.name}`);

  return {
    ...inferred,
    source: Array.from(new Set([inferred.source, ...materials])).filter(Boolean).join('；'),
    output: Array.from(new Set([inferred.output, ...outputHints])).filter(Boolean).join('；'),
    intakeSummary,
    materials,
    outputHints,
  };
};

const getSkillCreatorIntakeClosingLine = (roundIndex: number, hasMaterialSuggestion: boolean) => {
  if (hasMaterialSuggestion) {
    return '先回答这个问题；如果需要补参考材料，我会在下一步单独给材料入口。';
  }

  if (roundIndex <= 0) return '请选择最接近的一项；如果都不合适，可以用“其他补充”。';
  if (roundIndex === 1) return '继续选一个最贴近实际工作的选项即可。';
  if (roundIndex === 2) return '这一轮只确认最常见的处理方式，特殊情况可以写在“其他补充”。';
  return '直接补这一项即可，提交后我会再次判断是否已经可以创建。';
};

const getSkillCreatorIntakeLeadLine = (roundIndex: number, focusText: string, currentText: string) => {
  const brief = trimSkillCreatorNoticeText(currentText, 30);
  if (roundIndex <= 0) {
    return brief
      ? `我已经收到「${brief}」这个技能创建需求。先确认${focusText}，避免后面生成的触发条件和目标跑偏。`
      : `我已经收到你的技能创建需求。先确认${focusText}，避免后面生成的触发条件和目标跑偏。`;
  }

  if (roundIndex === 1) {
    return `刚才的选择已经记录。接下来确认${focusText}，这样技能才能知道运行时该参考什么、按什么依据判断。`;
  }

  if (roundIndex === 2) {
    return `前面的场景和依据已经基本清楚了。现在补${focusText}，主要是为了把工作流和交付标准写实。`;
  }

  return `还差${focusText}这一块。补完后如果信息已经够，我会直接进入技能文件生成。`;
};

const renderSkillCreatorIntakeReply = (
  result: SkillCreatorIntakeEvaluationResult,
  context: {
    currentText: string;
    answers: SkillCreatorGuideAnswer[];
  },
) => {
  const question = result.nextStep;
  const focusItems = [
    ...(result.missing.length ? result.missing : []),
    question?.title,
  ]
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item
      .replace(/[？?。.\s]+$/g, '')
      .replace(/\//g, '和')
      .trim())
    .filter(Boolean);
  const focusText = Array.from(new Set(focusItems)).slice(0, 2).join('、') || '使用场景和输出要求';
  const roundIndex = context.answers.length;

  return [
    getSkillCreatorIntakeLeadLine(roundIndex, focusText, context.currentText),
    '',
    getSkillCreatorIntakeClosingLine(roundIndex, Boolean(question?.assetSlots?.length)),
  ].join('\n');
};

const renderCreatedSkillAnswer = (skill: SkillCatalogItem) => [
  `技能草稿已生成：${skill.name}`,
  `当前保存范围：${skill.scope === 'team' ? '本团队' : '仅自己'}。右侧仅展示生成文件内容；启用技能后可输入 \`/${skill.id}\` 调用。`,
  `技能 ID：${skill.id}`,
].join('\n');

const renderSkillCreatorReadyToGenerateReply = () =>
  '信息已经收集完整，已经足够开始创建这个技能。接下来我会生成技能文件，并完成必要的结构校验。';

const renderSkillCreatorCompletionReply = (skill: SkillCatalogItem) => [
  `技能已经创建完成，已整理成一个可预览的技能包。`,
  '',
  createSkillPackageMarker(skill, skill.files?.length || generatedArtifacts.value.length || 1),
].join('\n');

const formatSkillCreatorOptionAnswer = (option: SkillCreatorGuideOption) =>
  option.description ? `${option.label}：${option.description}` : option.label;

const skillCreatorMaterialAnswerPrefix = '材料补充：';

const formatSkillCreatorMaterialAnswer = (option: SkillCreatorMaterialOption) =>
  `${skillCreatorMaterialAnswerPrefix}${JSON.stringify({
    label: option.label,
    description: option.description,
    name: option.name,
    sourceLabel: option.sourceLabel,
    kind: option.kind,
    slotId: option.slotId,
    slotTitle: option.slotTitle,
  })}`;

const formatSkillCreatorCombinedMaterialAnswer = (
  basePrompt: string,
  option: SkillCreatorMaterialOption,
) => [
  basePrompt.trim(),
  formatSkillCreatorMaterialAnswer(option),
].filter(Boolean).join('\n');

const parseSkillCreatorMaterialAnswer = (prompt: string) => {
  const prefixIndex = prompt.indexOf(skillCreatorMaterialAnswerPrefix);
  if (prefixIndex < 0) return null;
  const rawPayload = prompt.slice(prefixIndex + skillCreatorMaterialAnswerPrefix.length).trim();
  if (!rawPayload) return null;

  try {
    const payload = JSON.parse(rawPayload) as Partial<SkillCreatorMaterialOption>;
    const name = typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : typeof payload.label === 'string' ? payload.label.trim() : '';
    const sourceLabel = typeof payload.sourceLabel === 'string' && payload.sourceLabel.trim()
      ? payload.sourceLabel.trim()
      : '补充材料';
    const kind = typeof payload.kind === 'string' && payload.kind.trim()
      ? payload.kind.trim()
      : 'local-file';
    if (!name) return null;

    return {
      label: typeof payload.label === 'string' && payload.label.trim() ? payload.label.trim() : name,
      description: typeof payload.description === 'string' && payload.description.trim()
        ? payload.description.trim()
        : `${sourceLabel}：${name}`,
      asset: {
        name,
        sourceLabel,
        kind,
      },
    };
  } catch {
    return null;
  }
};

const createSkillCreatorAnswerFromPrompt = (
  prompt: string,
  step: SkillCreatorGuideStep | null,
): SkillCreatorGuideAnswer | null => {
  if (!step) return null;

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) return null;
  const materialAnswer = parseSkillCreatorMaterialAnswer(normalizedPrompt);
  const promptWithoutMaterial = materialAnswer
    ? normalizedPrompt.slice(0, normalizedPrompt.indexOf(skillCreatorMaterialAnswerPrefix)).trim()
    : normalizedPrompt;
  if (materialAnswer && !promptWithoutMaterial) {
    return {
      field: step.field,
      title: step.title,
      label: materialAnswer.label,
      description: materialAnswer.description,
      assets: [materialAnswer.asset],
    };
  }

  const customAnswerPrefix = '自定义补充：';
  if (promptWithoutMaterial.startsWith(customAnswerPrefix)) {
    const customLabel = promptWithoutMaterial.slice(customAnswerPrefix.length).trim();
    if (!customLabel) return null;

    return {
      field: step.field,
      title: step.title,
      label: customLabel,
      description: materialAnswer
        ? `用户在其他补充中直接填写；参考材料：${materialAnswer.description}`
        : '用户在其他补充中直接填写。',
      assets: materialAnswer ? [materialAnswer.asset] : undefined,
    };
  }

  const matchedOption = step.options.find((option) =>
    promptWithoutMaterial.includes(option.label)
    || (option.description && promptWithoutMaterial.includes(option.description))
  );

  return {
    field: step.field,
    title: step.title,
    label: matchedOption?.label || promptWithoutMaterial || materialAnswer?.label || normalizedPrompt,
    description: [
      matchedOption?.description || (matchedOption ? undefined : '用户直接输入的补充信息。'),
      materialAnswer ? `参考材料：${materialAnswer.description}` : '',
    ].filter(Boolean).join('；') || undefined,
    assets: materialAnswer ? [materialAnswer.asset] : undefined,
  };
};

const inferRestoredSkillCreatorField = (title: string, index: number) => {
  if (/触发|场景|目标|根本/.test(title)) return 'trigger-scenario';
  if (/合同类型|审查范围|文书类型|技能类型|范围/.test(title)) return 'scope';
  if (/依据|材料|读取|上传|参考|知识库|底稿|规则/.test(title)) return 'runtime-materials';
  if (/输出|标准|格式|交付|成果/.test(title)) return 'output-quality';
  if (/流程|步骤|工作流|处理方式/.test(title)) return 'workflow';
  if (/边界|复核|验收|红线|失败|质量/.test(title)) return 'quality-boundaries';
  return `restored-${index + 1}`;
};

const parseSkillCreatorSelectionAnswers = (content: string): SkillCreatorGuideAnswer[] => {
  const answers: SkillCreatorGuideAnswer[] = [];
  const selectionPattern = /^>\s*[“"]([^”"]+)[”"]\s*已(?:选择|补充|跳过)\s*(?:\*\*)?(.+?)(?:\*\*)?[。.]?\s*$/gm;
  const seen = new Set<string>();

  for (const match of content.matchAll(selectionPattern)) {
    const title = (match[1] || '').trim();
    const label = (match[2] || '').replace(/\*\*/g, '').trim();
    if (!title || !label) continue;

    const key = `${title}::${label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    answers.push({
      field: inferRestoredSkillCreatorField(title, answers.length),
      title,
      label,
      description: '从历史对话中的选择记录恢复。',
    });
  }

  return answers;
};

const hasPendingSkillCreatorMaterialSelector = computed(() =>
  Boolean(pendingSkillCreatorMaterialStep.value && pendingSkillCreatorMaterialPrompt.value.trim())
);

const isSkillCreatorGenerationFinalized = computed(() =>
  isSkillCreatorConversation.value
  && (
    skillValidationStatus.value === 'complete'
    || Boolean(createdSkillResult.value)
    || hasSkillCreatorCompletionMarker(generatedAnswer.value)
  )
);

const shouldShowSkillCreatorSelector = computed(() =>
  Boolean(pendingSkillCreatorStep.value)
  && isSkillCreatorConversation.value
  && !isGeneratingAnswer.value
  && !isSkillCreatorGenerationFinalized.value
  && !createdSkillResult.value
  && !isSkillCreatorSelectorDismissed.value
  && !hasPendingSkillCreatorMaterialSelector.value
);

const shouldOfferDraftMaterials = (slot: SkillCreatorGuideAssetSlot) =>
  slot.type !== 'template' && (slot.allowLocal || slot.allowKnowledge || slot.type === 'draft' || slot.type === 'knowledge' || slot.type === 'rule');

const shouldOfferTemplateMaterials = (slot: SkillCreatorGuideAssetSlot) =>
  slot.allowTemplate || slot.type === 'template' || slot.type === 'example' || slot.type === 'history';

const createMaterialOption = (
  option: Omit<SkillCreatorMaterialOption, 'slotId' | 'slotTitle'>,
  slot: SkillCreatorGuideAssetSlot,
): SkillCreatorMaterialOption => ({
  ...option,
  id: `${slot.id}-${option.id}`,
  slotId: slot.id,
  slotTitle: slot.title,
});

const createSkillCreatorMaterialOptions = (step: SkillCreatorGuideStep | null) => {
  const slots = step?.assetSlots ?? [];
  if (!step || !slots.length) return [];

  const options: SkillCreatorMaterialOption[] = [];
  slots.forEach((slot) => {
    if (shouldOfferDraftMaterials(slot)) {
      options.push(
        createMaterialOption({
          id: 'local-draft',
          label: '本地底稿',
          description: '按典型合同、事实说明或证据材料抽象输入要求。',
          name: '待上传本地底稿',
          sourceLabel: '本地底稿',
          kind: 'local-file',
        }, slot),
        createMaterialOption({
          id: 'team-rules',
          label: '团队规则',
          description: '把内部规范、审批口径或条线 Playbook 写成判断依据。',
          name: '律所内部规范 / 条线 Playbook',
          sourceLabel: '团队规则',
          kind: 'team-rule',
        }, slot),
        createMaterialOption({
          id: 'knowledge-base',
          label: '知识库引用',
          description: '把案例库、法规库、合同范本库等转成检索和引用规则。',
          name: '团队知识库资料',
          sourceLabel: '知识库',
          kind: 'knowledge-file',
        }, slot),
      );
    }

    if (shouldOfferTemplateMaterials(slot)) {
      defaultTemplateAssets.slice(0, 2).forEach((template) => {
        options.push(createMaterialOption({
          id: `template-${template.id}`,
          label: template.name,
          description: `使用「${template.source}」中的模板结构作为输出约束。`,
          name: template.name,
          sourceLabel: template.source,
          kind: 'template',
        }, slot));
      });

      const historyItem = recentHistory.value.find((item) =>
        item.answer?.content?.trim()
        && item.id !== activeHistoryId.value
      );
      if (historyItem) {
        options.push(createMaterialOption({
          id: `history-${historyItem.id}`,
          label: '历史输出',
          description: `引用「${historyItem.title}」作为示例成果或格式参考。`,
          name: historyItem.title,
          sourceLabel: '历史会话',
          kind: 'history-output',
        }, slot));
      }

        options.push(createMaterialOption({
          id: 'example-output',
          label: '示例成果',
          description: '由我按当前需求拟定示例输入和示例输出，约束交付质量。',
          name: '待补充示例成果',
          sourceLabel: '示例输出',
          kind: 'example-output',
      }, slot));
    }
  });

  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.kind}:${option.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
};

const getSkillCreatorMaterialOptionsForStep = (step: SkillCreatorGuideStep | null) =>
  createSkillCreatorMaterialOptions(step);

const skillCreatorMaterialOptions = computed(() =>
  createSkillCreatorMaterialOptions(pendingSkillCreatorMaterialStep.value)
);

const skillCreatorMaterialDecisionText = computed(() => {
  const text = pendingSkillCreatorMaterialPrompt.value
    .replace(/^自定义补充：/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
});

const trimSkillCreatorNoticeText = (value: string, maxLength = 44) => {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const appendSkillCreatorSelectionNotice = (title: string, label: string) => {
  const question = trimSkillCreatorNoticeText(title.replace(/[?？。.\s]+$/g, ''), 54);
  const selection = trimSkillCreatorNoticeText(label || '跳过', 54);
  if (!question || !selection) return;

  const notice = `> “${question}” 已选择 **${selection}**。`;
  const baseContent = generatedAnswer.value.trimEnd();
  const nextContent = baseContent ? `${baseContent}\n\n${notice}` : notice;
  syncAnswerContent(nextContent);
  scheduleLiveOutputScroll('answer');

  updateConversationAnswer(activeHistoryId.value, completedQuestion.value, {
    content: nextContent,
    model: answerModel.value,
    cachedAt: new Date().toISOString(),
    thinkingContent: liveThinkingContent.value,
  });
};

const shouldShowSkillCreatorMaterials = computed(() =>
  hasPendingSkillCreatorMaterialSelector.value
  && isSkillCreatorConversation.value
  && !isGeneratingAnswer.value
  && !isSkillCreatorGenerationFinalized.value
  && !createdSkillResult.value
  && skillCreatorMaterialOptions.value.length > 0
);

const shouldAskForSkillCreatorMaterial = (step: SkillCreatorGuideStep | null) =>
  getSkillCreatorMaterialOptionsForStep(step).length > 0;

type PendingSkillCreatorAssetPick = {
  basePrompt: string;
  option: SkillCreatorMaterialOption;
  notice?: { title: string; label: string };
  combineMaterial: boolean;
};

const pendingSkillCreatorAssetPick = ref<PendingSkillCreatorAssetPick | null>(null);

const inferUploadKindFromText = (label: string, description = ''): SkillCreatorMaterialKind | null => {
  const text = `${label} ${description}`;
  if (/本地|上传|电脑文件|本地文件|本地底稿/.test(text)) return 'local-file';
  if (/知识库|案例库|法规库|监管问答|合同范本|playbook/i.test(text)) return 'knowledge-file';
  if (/团队规则|内部规范|保密制度|制度或政策|团队共享/.test(text)) return 'team-rule';
  if (/模板|范本|标准格式|标准模板|公司标准/.test(text)) return 'template';
  return null;
};

const requiresMaterialAssetPicker = (kind: SkillCreatorMaterialKind) =>
  kind === 'local-file' || kind === 'knowledge-file' || kind === 'template' || kind === 'team-rule';

const guideOptionToMaterialOption = (option: SkillCreatorGuideOption): SkillCreatorMaterialOption => ({
  id: `guide-${option.id}`,
  label: option.label,
  description: option.description,
  name: option.label,
  sourceLabel: option.label,
  kind: inferUploadKindFromText(option.label, option.description) ?? 'local-file',
  slotId: pendingSkillCreatorStep.value?.assetSlots?.[0]?.id,
  slotTitle: pendingSkillCreatorStep.value?.assetSlots?.[0]?.title,
});

const buildMaterialOptionFromPickedAssets = (
  base: SkillCreatorMaterialOption,
  assets: ComposerPickedAsset[],
): SkillCreatorMaterialOption => {
  const first = assets[0];
  if (!first) return base;

  return {
    ...base,
    name: assets.map((asset) => asset.name).join('、'),
    sourceLabel: first.sourceLabel,
    kind: first.kind === 'template' ? 'template' : base.kind,
    description: assets.length > 1
      ? `已选择 ${assets.length} 份${first.sourceLabel}`
      : `${first.sourceLabel}：${first.name}`,
  };
};

const finalizeSkillCreatorAssetPick = (assets: ComposerPickedAsset[]) => {
  const pending = pendingSkillCreatorAssetPick.value;
  pendingSkillCreatorAssetPick.value = null;
  if (!pending || assets.length === 0) return;

  const resolvedOption = buildMaterialOptionFromPickedAssets(pending.option, assets);
  const answerPrompt = pending.combineMaterial
    ? formatSkillCreatorCombinedMaterialAnswer(pending.basePrompt, resolvedOption)
    : [pending.basePrompt.trim(), formatSkillCreatorMaterialAnswer(resolvedOption)].filter(Boolean).join('\n');

  pendingSkillCreatorMaterialStep.value = null;
  pendingSkillCreatorMaterialPrompt.value = '';
  isSkillCreatorOtherOpen.value = false;
  skillCreatorOtherInput.value = '';
  isSkillCreatorSelectorDismissed.value = false;
  submitSkillCreatorAnswerPrompt(answerPrompt, pending.notice);
};

const beginSkillCreatorAssetPick = (
  kind: SkillCreatorMaterialKind,
  option: SkillCreatorMaterialOption,
  basePrompt: string,
  notice?: { title: string; label: string },
  combineMaterial = false,
) => {
  const resolvedKind = kind === 'team-rule' ? 'knowledge-file' : kind;

  if (!requiresMaterialAssetPicker(kind)) {
    if (combineMaterial) {
      submitSkillCreatorAnswerPrompt(formatSkillCreatorCombinedMaterialAnswer(basePrompt, option), notice);
    } else {
      submitSkillCreatorAnswerPrompt(basePrompt, notice);
    }
    return;
  }

  if (!chatInputRef.value) {
    if (combineMaterial) {
      submitSkillCreatorAnswerPrompt(formatSkillCreatorCombinedMaterialAnswer(basePrompt, option), notice);
    } else {
      submitSkillCreatorAnswerPrompt(basePrompt, notice);
    }
    return;
  }

  pendingSkillCreatorAssetPick.value = {
    basePrompt,
    option,
    notice,
    combineMaterial,
  };

  if (resolvedKind === 'local-file') {
    chatInputRef.value.pickLocalFiles((assets) => finalizeSkillCreatorAssetPick(assets));
    return;
  }

  if (resolvedKind === 'knowledge-file') {
    chatInputRef.value.pickKnowledgeDrafts(
      (assets) => finalizeSkillCreatorAssetPick(assets),
      { collection: kind === 'team-rule' ? 'team' : 'team' },
    );
    return;
  }

  chatInputRef.value.pickTemplate((template) => {
    finalizeSkillCreatorAssetPick([{
      name: template.name,
      sourceLabel: template.source,
      kind: 'template',
      templateId: template.id,
    }]);
  });
};

const queueSkillCreatorMaterialSelector = (
  answerPrompt: string,
  notice?: { title: string; label: string },
) => {
  if (!pendingSkillCreatorStep.value || !shouldAskForSkillCreatorMaterial(pendingSkillCreatorStep.value)) return false;
  if (notice) appendSkillCreatorSelectionNotice(notice.title, notice.label);
  pendingSkillCreatorMaterialStep.value = pendingSkillCreatorStep.value;
  pendingSkillCreatorMaterialPrompt.value = answerPrompt.trim();
  isSkillCreatorOtherOpen.value = false;
  skillCreatorOtherInput.value = '';
  isSkillCreatorSelectorDismissed.value = false;
  return true;
};

const submitSkillCreatorAnswerPrompt = (
  answerPrompt: string,
  notice?: { title: string; label: string },
) => {
  if (notice) appendSkillCreatorSelectionNotice(notice.title, notice.label);
  pendingSkillCreatorMaterialStep.value = null;
  pendingSkillCreatorMaterialPrompt.value = '';
  isSkillCreatorOtherOpen.value = false;
  skillCreatorOtherInput.value = '';
  isSkillCreatorSelectorDismissed.value = false;
  void completeLiveConversation(answerPrompt, false, activeHistoryId.value || undefined);
};

const submitSkillCreatorSelectorOption = (option: SkillCreatorGuideOption) => {
  if (!pendingSkillCreatorStep.value || isGeneratingAnswer.value) return;
  const answerPrompt = formatSkillCreatorOptionAnswer(option);
  const notice = { title: pendingSkillCreatorStep.value.title, label: option.label };
  const uploadKind = inferUploadKindFromText(option.label, option.description);
  if (uploadKind) {
    beginSkillCreatorAssetPick(uploadKind, guideOptionToMaterialOption(option), answerPrompt, notice, false);
    return;
  }
  if (queueSkillCreatorMaterialSelector(answerPrompt, notice)) return;
  submitSkillCreatorAnswerPrompt(answerPrompt, notice);
};

const skillCreatorMaterialActionHint = (material: SkillCreatorMaterialOption) => {
  if (material.kind === 'local-file') return '点击打开本地文件管理器';
  if (material.kind === 'knowledge-file' || material.kind === 'team-rule') return '点击从知识库选择文件';
  if (material.kind === 'template') return '点击打开模板库';
  return '';
};

const submitSkillCreatorMaterialOption = (option: SkillCreatorMaterialOption) => {
  if (!pendingSkillCreatorStep.value || isGeneratingAnswer.value || !pendingSkillCreatorMaterialPrompt.value.trim()) return;
  const notice = { title: '是否补充一份参考材料？', label: option.label };
  if (requiresMaterialAssetPicker(option.kind)) {
    beginSkillCreatorAssetPick(option.kind, option, pendingSkillCreatorMaterialPrompt.value, notice, true);
    return;
  }
  submitSkillCreatorAnswerPrompt(formatSkillCreatorCombinedMaterialAnswer(
    pendingSkillCreatorMaterialPrompt.value,
    option,
  ), notice);
};

const createCustomSkillCreatorMaterialOption = (value: string): SkillCreatorMaterialOption => ({
  id: 'custom-material',
  label: '其他材料',
  description: value,
  name: value,
  sourceLabel: '用户补充',
  kind: 'local-file',
  slotId: pendingSkillCreatorMaterialStep.value?.assetSlots?.[0]?.id,
  slotTitle: pendingSkillCreatorMaterialStep.value?.assetSlots?.[0]?.title,
});

const submitSkillCreatorMaterialText = (value: string) => {
  if (!pendingSkillCreatorStep.value || isGeneratingAnswer.value || !pendingSkillCreatorMaterialPrompt.value.trim()) return;
  submitSkillCreatorAnswerPrompt(formatSkillCreatorCombinedMaterialAnswer(
    pendingSkillCreatorMaterialPrompt.value,
    createCustomSkillCreatorMaterialOption(value),
  ), { title: '是否补充一份参考材料？', label: value });
};

const openSkillCreatorOtherInput = () => {
  if (isGeneratingAnswer.value) return;
  isSkillCreatorOtherOpen.value = true;
  void nextTick(() => {
    skillCreatorOtherInputRef.value?.focus();
  });
};

const dismissSkillCreatorSelector = () => {
  isSkillCreatorOtherOpen.value = false;
  skillCreatorOtherInput.value = '';
  isSkillCreatorSelectorDismissed.value = true;
};

const submitSkillCreatorOtherInput = () => {
  if (!pendingSkillCreatorStep.value || isGeneratingAnswer.value) return;
  const value = skillCreatorOtherInput.value.trim();
  if (!value) {
    openSkillCreatorOtherInput();
    return;
  }
  const answerPrompt = `自定义补充：${value}`;
  if (hasPendingSkillCreatorMaterialSelector.value) {
    submitSkillCreatorMaterialText(value);
    return;
  }
  const notice = { title: pendingSkillCreatorStep.value.title, label: value };
  if (queueSkillCreatorMaterialSelector(answerPrompt, notice)) return;
  submitSkillCreatorAnswerPrompt(answerPrompt, notice);
};

const submitSkillCreatorSkip = () => {
  if (!pendingSkillCreatorStep.value || isGeneratingAnswer.value) return;
  submitSkillCreatorAnswerPrompt('暂时跳过这个问题，请按默认判断继续。', {
    title: pendingSkillCreatorStep.value.title,
    label: '跳过',
  });
};

const submitSkillCreatorMaterialSkip = () => {
  if (!pendingSkillCreatorStep.value || isGeneratingAnswer.value || !pendingSkillCreatorMaterialPrompt.value.trim()) return;
  submitSkillCreatorAnswerPrompt(pendingSkillCreatorMaterialPrompt.value, {
    title: '是否补充一份参考材料？',
    label: '跳过',
  });
};

type StoredPublishSettings = Partial<Omit<SkillPublishSettings, 'visibility' | 'scopePermissions'>> & {
  visibility?: SkillPublishVisibility | 'public';
  scopePermissions?: Partial<Record<ShareablePublishVisibility, Partial<SkillPublishPermissionSettings>>>;
} & Partial<SkillPublishPermissionSettings>;

const isShareablePublishVisibility = (value: unknown): value is ShareablePublishVisibility =>
  value === 'group' || value === 'team';

const isPublishVisibility = (value: unknown): value is SkillPublishVisibility =>
  value === 'personal' || isShareablePublishVisibility(value);

const normalizeStoredPublishVisibility = (value: unknown): SkillPublishVisibility | '' => {
  if (value === 'public') return 'group';
  return isPublishVisibility(value) ? value : '';
};

const hasLegacyPublishPermission = (settings: StoredPublishSettings) =>
  'allowCopy' in settings
  || 'allowRemix' in settings
  || 'showPublisherName' in settings
  || 'publisherName' in settings;

const normalizePublishPermission = (
  permission: Partial<SkillPublishPermissionSettings> | undefined,
): SkillPublishPermissionSettings => {
  const allowCopy = Boolean(permission?.allowCopy);
  const publisherName = typeof permission?.publisherName === 'string' && permission.publisherName.trim()
    ? permission.publisherName.trim()
    : defaultPublisherName;

  return {
    allowCopy,
    allowRemix: allowCopy && Boolean(permission?.allowRemix),
    showPublisherName: typeof permission?.showPublisherName === 'boolean'
      ? permission.showPublisherName
      : true,
    publisherName,
  };
};

const readStoredPublishSettings = (): Record<string, StoredPublishSettings> => {
  if (typeof window === 'undefined') return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(skillPublishSettingsStorageKey) || '{}');
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, StoredPublishSettings>
      : {};
  } catch {
    return {};
  }
};

const writeStoredPublishSettings = (
  skillId: string,
  settings: SkillPublishSettings,
) => {
  if (typeof window === 'undefined' || !skillId) return;
  const stored = readStoredPublishSettings();
  stored[skillId] = settings;
  window.localStorage.setItem(skillPublishSettingsStorageKey, JSON.stringify(stored));
};

const createPublishSettingsForSkill = (skill: SkillCatalogItem): SkillPublishSettings => {
  const stored = readStoredPublishSettings()[skill.id] ?? {};
  const storedVisibility = normalizeStoredPublishVisibility(stored.visibility);
  const visibility = storedVisibility || 'personal';
  const storedScopePermissions = stored.scopePermissions && typeof stored.scopePermissions === 'object'
    ? stored.scopePermissions
    : {};
  const legacyPermission = normalizePublishPermission(stored);
  const createPermissionForVisibility = (option: ShareablePublishVisibility) => {
    const scopedPermission = storedScopePermissions[option];
    if (scopedPermission && typeof scopedPermission === 'object') {
      return normalizePublishPermission(scopedPermission);
    }
    if (storedVisibility === option && hasLegacyPublishPermission(stored)) {
      return legacyPermission;
    }
    return createDefaultPublishPermission();
  };

  return {
    iconDataUrl: typeof stored.iconDataUrl === 'string' ? stored.iconDataUrl : '',
    name: typeof stored.name === 'string' && stored.name.trim() ? stored.name : skill.name,
    description: typeof stored.description === 'string' && stored.description.trim()
      ? stored.description
      : skill.description,
    visibility,
    scopePermissions: {
      group: createPermissionForVisibility('group'),
      team: createPermissionForVisibility('team'),
    },
  };
};

const syncPublishSettingsFromSkill = (skill: SkillCatalogItem | null) => {
  if (!skill) {
    activePublishSkillId.value = '';
    publishSettings.value = createPublishSettingsForSkill({
      id: 'draft',
      name: '',
      description: '',
      category: '自建技能',
      routeName: 'chat',
      tags: [],
      files: [],
      source: 'custom',
      scope: 'personal',
      status: 'draft',
    });
    return;
  }

  if (activePublishSkillId.value === skill.id) return;
  activePublishSkillId.value = skill.id;
  publishSettings.value = createPublishSettingsForSkill(skill);
};

const appendAnswerToken = (token: string) => {
  if (!token) return;
  generatedAnswer.value += token;
};

const scrollElementToBottom = (element: HTMLElement | null) => {
  if (!element) return;
  element.scrollTop = element.scrollHeight;
};

const scheduleLiveOutputScroll = (...targets: Array<'answer' | 'artifact'>) => {
  if (typeof window === 'undefined' || !targets.length) return;
  targets.forEach((target) => pendingAutoScrollTargets.add(target));

  void nextTick(() => {
    if (liveAutoScrollFrame !== undefined) return;

    liveAutoScrollFrame = window.requestAnimationFrame(() => {
      const shouldScrollAnswer = pendingAutoScrollTargets.has('answer');
      const shouldScrollArtifact = pendingAutoScrollTargets.has('artifact');
      pendingAutoScrollTargets.clear();
      liveAutoScrollFrame = undefined;

      if (shouldScrollAnswer) {
        scrollElementToBottom(answerScrollRef.value);
      }

      if (
        shouldScrollArtifact
        && artifactPanelMode.value === 'preview'
        && !isArtifactEditing.value
      ) {
        scrollElementToBottom(artifactPreviewScrollRef.value);
      }
    });
  });
};

const syncAnswerContent = (content: string) => {
  if (!content || generatedAnswer.value === content) return;
  if (content.startsWith(generatedAnswer.value)) {
    appendAnswerToken(content.slice(generatedAnswer.value.length));
    return;
  }

  generatedAnswer.value = content;
};

const mergeSkillCreatorGeneratedContent = (existingContent: string, generatedContent: string) => {
  const existing = existingContent.trimEnd();
  const generated = generatedContent.trim();
  if (!generated) return existing;
  if (!existing || generated.startsWith(existing)) return generated;
  return `${existing}\n\n${generated}`;
};

const hasComposerContent = computed(() => inputValue.value.length > 0 || Boolean(selectedTemplate.value));
const reportMock = docxLegalResearchMock;
const isLiveConversation = computed(() =>
  isGeneratingAnswer.value
  || Boolean(generatedAnswer.value)
  || Boolean(answerError.value)
  || Boolean(answerNotice.value)
);
const isSkillCreatorConversation = computed(() =>
  isSkillCreatorFlowActive.value || /\/skill-creator\b/i.test(completedQuestion.value)
);
const renderableAnswerContent = computed(() =>
  isSkillCreatorConversation.value
    ? formatSkillCreatorDisplayContent(generatedAnswer.value)
    : generatedAnswer.value
);
const generatedArtifacts = computed(() => {
  if (!isLiveConversation.value) return [];

  const artifactSource = isSkillCreatorConversation.value
    ? formatSkillCreatorProcessContent(generatedAnswer.value)
    : renderableAnswerContent.value;

  const extractedArtifacts = extractArtifactsFromAnswer(artifactSource, {
    generatedOnly: isSkillCreatorConversation.value,
  });

  if (extractedArtifacts.length || !isSkillCreatorConversation.value) {
    return extractedArtifacts;
  }

  const skillId = activeCreatedSkillId.value || extractCreatedSkillIdFromContent(generatedAnswer.value);
  const skill = createdSkillResult.value ?? (skillId ? getAnySkillByNameOrId(skillId) : null);
  return createArtifactsFromSkill(skill);
});
const extractSkillCreatorPostThinkingVisible = (content: string): string => {
  const markerIndex = content.lastIndexOf('[[skill-package:');
  if (markerIndex < 0) return '';

  const markerEnd = content.indexOf('\n', markerIndex);
  const markerLine = content.slice(markerIndex, markerEnd < 0 ? content.length : markerEnd).trim();
  if (!skillPackageMarkerPattern.test(markerLine)) return '';

  const beforeMarker = content.slice(0, markerIndex).trimEnd();
  const completionParagraph = beforeMarker
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .reverse()
    .find((paragraph) => /技能已经创建完成|可预览的技能包/.test(paragraph))
    || '技能已经创建完成，已整理成一个可预览的技能包。';

  return `${completionParagraph}\n\n${markerLine}`;
};
const liveAnswerParts = computed(() => {
  const text = renderableAnswerContent.value;
  const anchorIndex = text.indexOf(skillCreatorThinkingAnchor);
  if (anchorIndex < 0) {
    return { before: text, after: '' };
  }

  const postThinkingContent = text.slice(anchorIndex + skillCreatorThinkingAnchor.length).trimStart();

  return {
    before: text.slice(0, anchorIndex).trimEnd(),
    after: isSkillCreatorConversation.value
      ? extractSkillCreatorPostThinkingVisible(postThinkingContent)
      : postThinkingContent,
  };
});
const liveAnswerBeforeThinkingHtml = computed(() =>
  renderLiveAnswerMarkdown(liveAnswerParts.value.before),
);
const liveAnswerAfterThinkingHtml = computed(() =>
  renderLiveAnswerMarkdown(liveAnswerParts.value.after),
);
const shouldShowSkillCreatorThinking = computed(() =>
  isSkillCreatorConversation.value
  && isGeneratingAnswer.value
);
const hasLiveThinking = computed(() =>
  Boolean(liveThinkingContent.value.trim()) || shouldShowSkillCreatorThinking.value
);
const isLiveThinkingStreaming = computed(() =>
  hasLiveThinking.value
  && isGeneratingAnswer.value
  && (isSkillCreatorConversation.value || !generatedAnswer.value.trim())
  && skillValidationStatus.value === 'idle'
);
const canToggleLiveThinking = computed(() =>
  hasLiveThinking.value
);
const shouldShowLiveThinkingBody = computed(() =>
  hasLiveThinking.value && isLiveThinkingExpanded.value
);
const shouldShowSkillGenerationStatus = computed(() =>
  false
);
const liveThinkingLabel = computed(() =>
  isGeneratingAnswer.value ? '正在思考' : '思考过程'
);
const liveThinkingHint = computed(() => {
  const processName = '思考过程';
  if (isLiveThinkingExpanded.value) return `收起${processName}`;
  if (isGeneratingAnswer.value) return `点击展开查看实时${processName}`;
  if (liveThinkingContent.value.trim()) return `点击展开查看完整${processName}`;
  return `本次历史暂未保存${processName}`;
});
const liveThinkingBodyHtml = computed(() =>
  renderLiveAnswerMarkdown(
    liveThinkingContent.value.trim()
      ? liveThinkingContent.value
      : isSkillCreatorConversation.value && generatedAnswer.value.trim()
        ? formatSkillCreatorProcessContent(generatedAnswer.value)
      : isGeneratingAnswer.value
        ? '正在等待模型返回思考内容...'
        : '这条历史没有保存到思考过程；后续生成会自动保留。',
  )
);

const toggleLiveThinking = () => {
  if (!canToggleLiveThinking.value) return;
  isLiveThinkingExpanded.value = !isLiveThinkingExpanded.value;
};

const createdSkillIdFromAnswer = computed(() => {
  const idFromContent = extractCreatedSkillIdFromContent(generatedAnswer.value);
  if (idFromContent) return idFromContent;

  const skillMarkdown = generatedArtifacts.value.find((artifact) => artifact.title === 'SKILL.md')?.content || '';
  const frontmatterName = skillMarkdown.match(/^name\s*:\s*['"]?([^'"\n]+)['"]?/m);
  return frontmatterName?.[1]?.trim() || '';
});
const skillCompletionSkill = computed(() =>
  createdSkillResult.value
  ?? (
    activeCreatedSkillId.value || createdSkillIdFromAnswer.value
      ? getAnySkillByNameOrId(activeCreatedSkillId.value || createdSkillIdFromAnswer.value)
      : null
  )
);
const skillCompletionIsEnabled = computed(() =>
  skillCompletionSkill.value ? isSkillEnabled(skillCompletionSkill.value) : false
);
const canShowSkillPublishSettings = computed(() =>
  false
);
const currentPublishVisibility = computed(() =>
  publishVisibilityOptions.find((option) => option.id === publishSettings.value.visibility)
    ?? defaultPublishVisibilityOption
);

const activePublishPermission = computed(() => {
  const { visibility, scopePermissions } = publishSettings.value;
  return isShareablePublishVisibility(visibility) ? scopePermissions[visibility] : null;
});

const publishSettingsSummary = computed(() => {
  const permissionSettings = activePublishPermission.value;
  if (!permissionSettings) return '仅保存在个人技能区，无需设置范围内权限';

  const permission = permissionSettings.allowCopy
    ? permissionSettings.allowRemix ? '允许查看详情和自行编辑' : '允许查看详情'
    : '不允许查看详情';
  const publisher = permissionSettings.showPublisherName
    ? `显示发布者：${permissionSettings.publisherName || defaultPublisherName}`
    : '隐藏发布者';
  return `${currentPublishVisibility.value.label} · ${permission} · ${publisher}`;
});
const publishIconFallback = computed(() =>
  (publishSettings.value.name || skillCompletionSkill.value?.name || '技').trim().slice(0, 1).toUpperCase()
);
const canSavePublishSettings = computed(() =>
  Boolean(skillCompletionSkill.value && publishSettings.value.name.trim() && publishSettings.value.description.trim())
);
const shouldShowSkillValidation = computed(() =>
  false
);
const shouldShowSkillCompletion = computed(() =>
  isSkillCreatorConversation.value
  && skillValidationStatus.value === 'complete'
  && Boolean(skillCompletionSkill.value)
);
const skillCreatorCompletionOptions: SkillCreatorCompletionOption[] = [
  {
    id: 'enable-and-use',
    label: '启用后马上使用',
    description: '启用这个技能，并回到对话输入框中通过技能名调用。',
    recommended: true,
  },
  {
    id: 'inspect-skill',
    label: '查看 SKILL.md',
    description: '先检查主入口说明、触发条件、工作流和边界规则。',
  },
  {
    id: 'edit-references',
    label: '调整 references',
    description: '打开参考文件，继续改输入规则、检查清单或输出格式。',
  },
  {
    id: 'publish-settings',
    label: '发布或共享',
    description: '进入发布设置，决定先保留个人草稿还是共享给小组或团队。',
  },
];
const shouldShowSkillCreatorCompletionSelector = computed(() => false);
const activeArtifact = computed(() =>
  generatedArtifacts.value.find((artifact) => artifact.id === activeArtifactId.value)
    ?? generatedArtifacts.value[0]
    ?? null
);
const isSkillArtifactWorkspace = computed(() =>
  isSkillCreatorConversation.value && generatedArtifacts.value.length > 0
);
const hasPreviewPanel = computed(() => isDocxPreviewOpen.value || (isArtifactPreviewOpen.value && Boolean(activeArtifact.value)));
const previewSplitStyle = computed(() =>
  hasPreviewPanel.value
    ? `--preview-panel-width: ${(previewPanelRatio.value * 100).toFixed(2)}%;`
    : ''
);
const isSkillCreatorAwaitingMoreInput = computed(() =>
  isSkillCreatorConversation.value
  && !createdSkillResult.value
  && (
    Boolean(pendingSkillCreatorStep.value)
    || Boolean(pendingSkillCreatorMaterialStep.value)
    || skillValidationStatus.value === 'checking'
  )
);
const shouldShowAnswerActions = computed(() =>
  !isGeneratingAnswer.value
  && !isSkillCreatorAwaitingMoreInput.value
  && (Boolean(generatedAnswer.value) || Boolean(answerError.value) || Boolean(answerNotice.value) || !isLiveConversation.value)
);

const activeHistoryItem = computed(() => findHistoryItem(activeHistoryId.value, completedQuestion.value));
const liveHeaderTitle = computed(() => activeHistoryItem.value?.title || '新会话');
const headerTitle = computed(() => {
  if (!hasCompletedMock.value) return '新提问';
  return isLiveConversation.value ? liveHeaderTitle.value : reportMock.title;
});
const completedQuestionParts = computed(() => tokenizePromptText(completedQuestion.value));
const formatHeaderTime = (value: string) => {
  const fallback = value.trim();
  const timestamp = Date.parse(fallback.includes('T') ? fallback : fallback.replace(' ', 'T'));
  if (Number.isNaN(timestamp)) return fallback;

  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const time = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  if (startOfDate === startOfToday) return `今天 ${time}`;
  if (startOfDate === startOfToday - 24 * 60 * 60 * 1000) return `昨天 ${time}`;
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day} ${time}`;
};
const headerCreatedAt = computed(() => {
  if (!hasCompletedMock.value) return new Date().toISOString();
  if (!isLiveConversation.value) return reportMock.createdAt;
  return activeHistoryItem.value?.createdAt || new Date().toISOString();
});
const headerTime = computed(() => formatHeaderTime(headerCreatedAt.value));
const formatHeaderSkillName = (value: string) => {
  if (/^skill-creator$/i.test(value)) return '技能创建';
  return getAnySkillByNameOrId(value)?.name || value;
};
const headerSubtitle = computed(() => {
  const metaItems: string[] = [];

  if (hasCompletedMock.value) {
    if (isLiveConversation.value) {
      const assetParts = completedQuestionParts.value.filter((part) => part.type === 'asset');
      const draftCount = assetParts.filter((part) => part.assetKind === 'local-file').length;
      const knowledgeCount = assetParts.filter((part) => part.assetKind === 'knowledge-file').length;
      const templateNames = Array.from(new Set(
        assetParts
          .filter((part) => part.assetKind === 'template')
          .map((part) => part.value.trim())
          .filter(Boolean),
      ));
      const skillNames = Array.from(new Set(
        completedQuestionParts.value
          .filter((part) => part.type === 'skill')
          .map((part) => {
            const value = part.value.replace(/^\//, '').trim();
            return formatHeaderSkillName(value);
          })
          .filter(Boolean),
      ));

      if (draftCount) metaItems.push(`底稿 ${draftCount} 份`);
      if (knowledgeCount) metaItems.push(`知识库 ${knowledgeCount} 份`);
      if (skillNames.length) metaItems.push(`技能 ${skillNames.slice(0, 2).join('、')}`);
      if (templateNames.length) metaItems.push(`模板 ${templateNames.slice(0, 2).join('、')}`);
    } else {
      metaItems.push('模板 保密协议 / 保密承诺函');
    }
  }

  metaItems.push(headerTime.value);
  return metaItems.join(' · ');
});
const processToolCount = computed(() =>
  reportMock.timeline.reduce((count, node) => count + (node.tools?.length ?? 0), 0)
);
const processSummaryText = computed(() =>
  `已完成 ${reportMock.timeline.length} 个处理阶段、${processToolCount.value} 项工具动作，采用 ${reportMock.references.length} 条参考来源。`
);
const answerStatusLabel = computed(() => {
  if (shouldShowSkillValidation.value) return '正在校验技能';
  if (isSkillCreatorConversation.value && isGeneratingAnswer.value) return '正在创建技能';
  if (isGeneratingAnswer.value && generatedAnswer.value) return '正在生成';
  if (isGeneratingAnswer.value) return '正在思考';
  if (answerError.value) return '生成异常';
  if (answerNotice.value) return '暂无缓存';
  if (isSkillCreatorConversation.value && generatedAnswer.value) return '已创建技能';
  return '已完成回答';
});

const selectedThinkingMode = ref('thinking');

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
  if (skillName && /\/skill-creator\b/i.test(skillName) && skillName.trim().includes('\n')) {
    showSkillMenu.value = false;
    showSkillManageModal.value = false;
    inputValue.value = '';
    void completeLiveConversation(skillName.trim());
    return;
  }

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

const promptAssetLabelMap: Record<string, NonNullable<PromptPart['assetKind']>> = {
  关联模板: 'template',
  模板: 'template',
  关联知识库: 'knowledge-file',
  关联底稿: 'local-file',
  种子文件: 'local-file',
  交付模板: 'template',
  检索文件: 'knowledge-file',
};

const assetBadgeLabel = (kind: NonNullable<PromptPart['assetKind']>) => {
  if (kind === 'template') return '模板';
  return '底稿';
};

const splitPromptAssetEntries = (value: string) => {
  const entries: string[] = [];
  let current = '';
  let bracketDepth = 0;

  for (const char of value) {
    if (char === '（' || char === '(') bracketDepth += 1;
    if (char === '）' || char === ')') bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === '、' && bracketDepth === 0) {
      if (current.trim()) entries.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) entries.push(current.trim());
  return entries;
};

const parsePromptAssetEntry = (entry: string) => {
  const normalized = entry.trim();
  const match = normalized.match(/^(.+?)[（(]([^（）()]+)[）)]$/);

  if (!match) {
    return {
      name: normalized,
      sourceLabel: '',
    };
  }

  return {
    name: match[1]?.trim() || normalized,
    sourceLabel: match[2]?.trim() || '',
  };
};

const appendPromptInlineParts = (parts: PromptPart[], text: string) => {
  if (!text) return;

  const tokenPattern = /(\/[A-Za-z][\w-]*|「(?:模板|底稿)[：:][^」\n]+」|模板：[^\s，。；;,.、]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const value = match[0];
    if (value.startsWith('/')) {
      parts.push({ type: 'skill', value });
    } else if (value.startsWith('「')) {
      const inner = value.slice(1, -1);
      const sep = inner.search(/[：:]/);
      const label = sep > 0 ? inner.slice(0, sep) : '底稿';
      const rawName = sep > 0 ? inner.slice(sep + 1) : inner;
      const asset = parsePromptAssetEntry(rawName);
      parts.push({
        type: 'asset',
        value: asset.name,
        assetKind: label === '模板' ? 'template' : 'local-file',
        sourceLabel: asset.sourceLabel,
      });
    } else {
      const asset = parsePromptAssetEntry(value.replace(/^模板[：:]/, ''));
      parts.push({ type: 'text', value: '模板：' });
      parts.push({
        type: 'asset',
        value: asset.name,
        assetKind: 'template',
        sourceLabel: asset.sourceLabel,
      });
    }
    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
};

const tokenizeSkillCreatorUploadedFiles = (text: string): PromptPart[] | null => {
  if (!/\/skill-creator\b/i.test(text) || !text.includes('参考文件：')) return null;

  const referenceIndex = text.indexOf('参考文件：');
  const beforeReference = text.slice(0, referenceIndex + '参考文件：'.length);
  const fileSection = text.slice(referenceIndex + '参考文件：'.length);
  const headingPattern = /##\s*(种子文件|交付模板|检索文件)：\s*([\s\S]*?)(?=\s+文件类型：)/g;
  const headings = Array.from(fileSection.matchAll(headingPattern));
  if (!headings.length) return null;

  const parts: PromptPart[] = [];
  appendPromptInlineParts(parts, beforeReference.trimEnd());
  parts.push({ type: 'text', value: '\n' });

  headings.forEach((match, index) => {
    const label = match[1] ?? '种子文件';
    const name = (match[2] ?? '').trim();
    const blockStart = match.index ?? 0;
    const nextHeading = headings[index + 1];
    const blockEnd = nextHeading?.index ?? fileSection.length;
    const block = fileSection.slice(blockStart, blockEnd);
    const type = block.match(/文件类型：\s*([\s\S]*?)(?=\s+文件大小：)/)?.[1]?.trim();
    const size = block.match(/文件大小：\s*([0-9.]+\s*[KMGT]?B|[^\s#]+)/i)?.[1]?.trim();
    const sourceLabel = [label, size, type].filter(Boolean).join(' · ');

    if (index > 0) parts.push({ type: 'text', value: '、' });
    parts.push({
      type: 'asset',
      value: name,
      assetKind: promptAssetLabelMap[label] ?? 'local-file',
      sourceLabel,
    });
  });

  return parts;
};

const appendPromptAssetGroup = (parts: PromptPart[], label: string, content: string) => {
  const assetKind = promptAssetLabelMap[label] ?? 'local-file';
  const normalizedContent = content.trimEnd();
  const trailingSentenceMatch = normalizedContent.match(/^(.*?[）)])(\s+(?:请使用|请根据|请按|帮我).*)$/);
  const assetContent = trailingSentenceMatch?.[1] ?? normalizedContent;
  const trailingSentence = trailingSentenceMatch?.[2] ?? '';
  const entries = splitPromptAssetEntries(assetContent);

  if (!entries.length) {
    parts.push({ type: 'text', value: `${label}：${content}` });
    return;
  }

  parts.push({ type: 'text', value: `${label}：` });
  entries.forEach((entry, index) => {
    if (index > 0) parts.push({ type: 'text', value: '、' });
    const asset = parsePromptAssetEntry(entry);
    parts.push({
      type: 'asset',
      value: asset.name,
      assetKind,
      sourceLabel: asset.sourceLabel,
    });
  });

  if (trailingSentence) {
    appendPromptInlineParts(parts, trailingSentence);
  }
};

const tokenizePromptText = (text: string): PromptPart[] => {
  const skillCreatorUploadedFiles = tokenizeSkillCreatorUploadedFiles(text);
  if (skillCreatorUploadedFiles) return skillCreatorUploadedFiles;

  const parts: PromptPart[] = [];
  const assetGroupPattern = /(关联模板|关联知识库|关联底稿)[：:]\s*([^；;\n]*?)(?=(?:\s*(?:关联模板|关联知识库|关联底稿)[：:])|[；;\n]|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = assetGroupPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      appendPromptInlineParts(parts, text.slice(lastIndex, match.index));
    }

    appendPromptAssetGroup(parts, match[1] ?? '', match[2] ?? '');
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    appendPromptInlineParts(parts, text.slice(lastIndex));
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
};

const syncConversationRoute = (historyId: string, prompt: string) => {
  if (route.name !== 'chat') return;

  const normalizedPrompt = prompt.trim();
  if (!historyId || !normalizedPrompt) return;
  if (route.query.historyId === historyId && !route.query.prompt && !route.query.promptKey) return;

  handledRoutePromptKey.value = `${String(route.query.workspaceId ?? '')}:${historyId}:${normalizedPrompt}`;
  const {
    mock: _mock,
    prompt: _prompt,
    promptKey: _promptKey,
    source: _source,
    composerTick: _composerTick,
    ...query
  } = route.query;
  void router.replace({
    name: 'chat',
    query: {
      ...query,
      historyId,
    },
  });
};

const refreshGeneratedConversationTitle = async (
  historyId: string | null | undefined,
  prompt: string,
  answer: string,
) => {
  if (!historyId || !prompt.trim() || !answer.trim()) return;

  try {
    const title = await generateDeepSeekConversationTitle(prompt, answer);
    if (!title) return;
    applyGeneratedConversationTitle(historyId, prompt, title);
  } catch {
    // Keep the visible "新会话" title if the secondary title request fails.
  }
};

const extractSkillIdFromGeneratedArtifacts = (content: string) => {
  const artifacts = extractArtifactsFromAnswer(formatSkillCreatorDisplayContent(content), { generatedOnly: true });
  const skillMarkdown = artifacts.find((artifact) => artifact.title === 'SKILL.md')?.content || '';
  const frontmatterName = skillMarkdown.match(/^name\s*:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim();
  if (frontmatterName) return frontmatterName;

  const headingName = skillMarkdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return headingName || '';
};

const inferNormalizedSkillIdFromHistory = (content: string, prompt: string) => {
  const text = `${prompt}\n${content}`;

  if (
    /contract compliance review/i.test(text)
    || (/合同/.test(text) && /(合规|审查|红线|风险矩阵|谈判话术)/.test(text))
  ) {
    return 'contract-review-redline';
  }

  return '';
};

const resolveCreatedSkillIdFromHistory = (
  content: string,
  prompt: string,
  cachedSkillId?: string,
) => {
  const candidates = [
    cachedSkillId,
    extractCreatedSkillIdFromContent(content),
    inferNormalizedSkillIdFromHistory(content, prompt),
    extractSkillIdFromGeneratedArtifacts(content),
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));

  const availableCandidate = candidates.find((candidate) => getAnySkillByNameOrId(candidate));
  return availableCandidate || candidates[0] || '';
};

let skillCreatorRestoreToken = 0;

const restoreSkillCreatorPendingStateFromCache = async (
  historyId: string,
  prompt: string,
  content: string,
) => {
  if (!/\/skill-creator\b/i.test(prompt) || hasSkillCreatorCompletionMarker(content)) return;

  const restoredAnswers = parseSkillCreatorSelectionAnswers(content);
  if (!restoredAnswers.length) return;

  const restoreToken = ++skillCreatorRestoreToken;

  try {
    const intakeResult = await evaluateSkillCreatorIntake({
      currentText: extractSkillCreatorBrief(prompt),
      answers: restoredAnswers,
    });

    if (
      restoreToken !== skillCreatorRestoreToken
      || activeHistoryId.value !== historyId
      || completedQuestion.value !== prompt
      || hasSkillCreatorCompletionMarker(generatedAnswer.value)
    ) {
      return;
    }

    if (intakeResult.complete || !intakeResult.nextStep) {
      pendingSkillCreatorPrompt.value = '';
      pendingSkillCreatorStep.value = null;
      skillCreatorIntakeAnswers.value = restoredAnswers;
      return;
    }

    pendingSkillCreatorPrompt.value = prompt;
    pendingSkillCreatorStep.value = intakeResult.nextStep;
    pendingSkillCreatorMaterialStep.value = null;
    pendingSkillCreatorMaterialPrompt.value = '';
    skillCreatorIntakeAnswers.value = restoredAnswers;
    isSkillCreatorFlowActive.value = true;
    isSkillCreatorSelectorDismissed.value = false;
    isSkillCreatorCompletionSelectorDismissed.value = false;
    answerModel.value = intakeResult.model || answerModel.value;
  } catch {
    pendingSkillCreatorPrompt.value = prompt;
    skillCreatorIntakeAnswers.value = restoredAnswers;
  }
};

const hydrateCachedConversation = (prompt: string, historyId?: string) => {
  if (!historyId) return false;

  const cached = getCachedConversation(historyId, prompt);
  if (!cached?.answer) return false;

  beginConversation(cached.prompt, false, cached.id, !historyId);
  isDocxPreviewOpen.value = false;
  isArtifactPreviewOpen.value = false;
  answerModel.value = cached.answer.model || '';
  const normalizedCachedContent = normalizeGeneratedArtifactBoundaries(cached.answer.content);
  generatedAnswer.value = normalizedCachedContent;
  liveThinkingContent.value = cached.answer.thinkingContent || '';
  isLiveThinkingExpanded.value = false;
  const isCachedSkillCreatorPrompt = /\/skill-creator\b/i.test(cached.prompt);
  const hasCompletedSkillCreatorGeneration = !isCachedSkillCreatorPrompt
    || hasSkillCreatorCompletionMarker(normalizedCachedContent);
  const restoredSkillId = hasCompletedSkillCreatorGeneration
    ? resolveCreatedSkillIdFromHistory(
      normalizedCachedContent,
      cached.prompt,
      cached.answer.createdSkillId,
    )
    : '';
  activeCreatedSkillId.value = restoredSkillId;
  createdSkillResult.value = restoredSkillId ? getAnySkillByNameOrId(restoredSkillId) : null;
  syncPublishSettingsFromSkill(createdSkillResult.value);
  skillValidationStatus.value = restoredSkillId ? 'complete' : 'idle';
  skillValidationMessage.value = createdSkillResult.value
    ? `技能完整度校验通过，当前发布范围为${createdSkillResult.value.scope === 'team' ? '本团队' : '仅自己'}。`
    : '';
  isSkillCreatorCompletionSelectorDismissed.value = hasSkillCompletionSelectorDismissed(normalizedCachedContent);
  answerError.value = '';
  answerNotice.value = '';
  isGeneratingAnswer.value = false;
  const shouldClearStaleSkillId = isCachedSkillCreatorPrompt
    && !hasCompletedSkillCreatorGeneration
    && Boolean(cached.answer.createdSkillId);
  if (
    normalizedCachedContent !== cached.answer.content
    || (restoredSkillId && !cached.answer.createdSkillId)
    || shouldClearStaleSkillId
  ) {
    updateConversationAnswer(cached.id, cached.prompt, {
      ...cached.answer,
      content: normalizedCachedContent,
      createdSkillId: restoredSkillId || undefined,
      cachedAt: new Date().toISOString(),
    });
  }
  if (!isCachedSkillCreatorPrompt) {
    void nextTick(openFirstGeneratedArtifact);
  } else if (!hasCompletedSkillCreatorGeneration) {
    void restoreSkillCreatorPendingStateFromCache(cached.id, cached.prompt, normalizedCachedContent);
  }
  return true;
};

const hydrateMissingCachedConversation = (prompt: string, historyId?: string) => {
  if (!historyId) return false;

  const historyItem = findHistoryItem(historyId, prompt);
  const nextPrompt = historyItem?.prompt || prompt;
  beginConversation(nextPrompt, false, historyId);
  isDocxPreviewOpen.value = false;
  generatedAnswer.value = '';
  liveThinkingContent.value = '';
  isLiveThinkingExpanded.value = false;
  skillValidationStatus.value = 'idle';
  skillValidationMessage.value = '';
  createdSkillResult.value = null;
  activeCreatedSkillId.value = '';
  answerModel.value = '';
  answerError.value = '';
  answerNotice.value = '这条历史暂未保存回答内容。新提问生成成功后会自动缓存，之后点击历史或刷新会直接加载结果。';
  isGeneratingAnswer.value = false;
  return true;
};

const beginConversation = (
  prompt: string,
  shouldRecord = true,
  historyId?: string,
  shouldSyncRoute = false,
) => {
  completedQuestion.value = prompt;
  hasCompletedMock.value = true;
  isReferenceDrawerOpen.value = false;
  isArtifactPreviewOpen.value = false;
  isProcessExpanded.value = false;
  isThinkingExpanded.value = true;
  isLiveThinkingExpanded.value = false;
  activeReferenceId.value = null;
  activeArtifactId.value = '';
  expandedReferenceIds.value = new Set();
  generatedAnswer.value = '';
  liveThinkingContent.value = '';
  answerModel.value = '';
  answerError.value = '';
  answerNotice.value = '';
  isGeneratingAnswer.value = false;
  skillValidationStatus.value = 'idle';
  skillValidationMessage.value = '';
  createdSkillResult.value = null;
  activeCreatedSkillId.value = '';
  isSkillCreatorFlowActive.value = false;
  pendingSkillCreatorPrompt.value = '';
  pendingSkillCreatorStep.value = null;
  pendingSkillCreatorMaterialStep.value = null;
  pendingSkillCreatorMaterialPrompt.value = '';
  skillCreatorIntakeAnswers.value = [];
  isSkillCreatorOtherOpen.value = false;
  skillCreatorOtherInput.value = '';
  isSkillCreatorSelectorDismissed.value = false;
  isSkillCreatorCompletionSelectorDismissed.value = false;
  activePublishSkillId.value = '';
  artifactPanelMode.value = 'preview';
  lastAutoOpenedArtifactId.value = '';
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
  const isSkillCreatorContinuation = Boolean(pendingSkillCreatorPrompt.value) && !/\/skill-creator\b/i.test(prompt);
  const previousSkillCreatorPrompt = pendingSkillCreatorPrompt.value;
  const previousSkillCreatorStep = pendingSkillCreatorStep.value;
  const previousSkillCreatorAnswers = [...skillCreatorIntakeAnswers.value];
  const skillCreatorPromptForRun = isSkillCreatorContinuation
    ? `${previousSkillCreatorPrompt}\n\n用户补充：${prompt}`
    : prompt;
  const isSkillCreatorPrompt = /\/skill-creator\b/i.test(skillCreatorPromptForRun);

  if (!isSkillCreatorContinuation && hydrateCachedConversation(prompt, historyId)) return;

  if (!isSkillCreatorContinuation && historyId && !findHistoryItem(historyId, prompt)) {
    hydrateMissingCachedConversation(prompt, historyId);
    return;
  }

  if (isSkillCreatorPrompt) {
    const historyPrompt = isSkillCreatorContinuation
      ? completedQuestion.value || previousSkillCreatorPrompt
      : prompt;
    const historyItem = isSkillCreatorContinuation
      ? findHistoryItem(activeHistoryId.value, historyPrompt)
      : beginConversation(prompt, shouldRecord, historyId, shouldRecord || !historyId);
    const nextSkillCreatorAnswer = isSkillCreatorContinuation
      ? createSkillCreatorAnswerFromPrompt(prompt, previousSkillCreatorStep)
      : null;
    const nextSkillCreatorAnswers = isSkillCreatorContinuation
      ? [...previousSkillCreatorAnswers, ...(nextSkillCreatorAnswer ? [nextSkillCreatorAnswer] : [])]
      : [];

    if (isSkillCreatorContinuation) {
      inputValue.value = '';
      selectedTemplate.value = null;
      closeDropdown();
    }

    isSkillCreatorFlowActive.value = true;
    isDocxPreviewOpen.value = false;
    pendingSkillCreatorStep.value = null;
    pendingSkillCreatorMaterialStep.value = null;
    pendingSkillCreatorMaterialPrompt.value = '';
    isSkillCreatorSelectorDismissed.value = false;
    isSkillCreatorCompletionSelectorDismissed.value = false;
    isGeneratingAnswer.value = true;
    answerModel.value = 'deepseek-v4-flash';
    liveThinkingContent.value = '';
    isLiveThinkingExpanded.value = false;
    skillValidationStatus.value = 'idle';
    skillValidationMessage.value = '';
    createdSkillResult.value = null;
    activeCreatedSkillId.value = '';
    lastAutoOpenedArtifactId.value = '';

    try {
      const currentSkillCreatorText = extractSkillCreatorBrief(skillCreatorPromptForRun);
      const intakeResult = await evaluateSkillCreatorIntake({
        currentText: currentSkillCreatorText,
        answers: nextSkillCreatorAnswers,
      });

      if (!intakeResult.complete) {
        const intakeReply = renderSkillCreatorIntakeReply(intakeResult, {
          currentText: extractInitialSkillCreatorBrief(skillCreatorPromptForRun),
          answers: nextSkillCreatorAnswers,
        });
        const intakeDisplayContent = isSkillCreatorContinuation && generatedAnswer.value.trim()
          ? `${generatedAnswer.value.trimEnd()}\n\n${intakeReply}`
          : intakeReply;
        pendingSkillCreatorPrompt.value = skillCreatorPromptForRun;
        pendingSkillCreatorStep.value = intakeResult.nextStep;
        skillCreatorIntakeAnswers.value = nextSkillCreatorAnswers;
        isSkillCreatorOtherOpen.value = false;
        skillCreatorOtherInput.value = '';
        isSkillCreatorSelectorDismissed.value = false;
        isSkillCreatorCompletionSelectorDismissed.value = false;
        isGeneratingAnswer.value = false;
        syncAnswerContent(intakeDisplayContent);

        const cachedItem = updateConversationAnswer(activeHistoryId.value || historyItem?.id, historyPrompt, {
          content: intakeDisplayContent,
          model: intakeResult.model || answerModel.value,
          cachedAt: new Date().toISOString(),
          thinkingContent: '',
        });

        if (cachedItem) {
          activeHistoryId.value = cachedItem.id;
          syncConversationRoute(cachedItem.id, cachedItem.prompt);
          void refreshGeneratedConversationTitle(cachedItem.id, cachedItem.prompt, intakeDisplayContent);
        }
        return;
      }

      pendingSkillCreatorPrompt.value = '';
      pendingSkillCreatorStep.value = null;
      skillCreatorIntakeAnswers.value = nextSkillCreatorAnswers;
      isSkillCreatorSelectorDismissed.value = false;
      isSkillCreatorCompletionSelectorDismissed.value = false;
      const skillCreatorAnswersForRun = buildSkillCreatorGenerationAnswers(
        skillCreatorPromptForRun,
        nextSkillCreatorAnswers,
      );
      const preGenerationAnswerContent = [
        generatedAnswer.value.trimEnd(),
        renderSkillCreatorReadyToGenerateReply(),
        skillCreatorThinkingAnchor,
      ].filter(Boolean).join('\n\n');
      syncAnswerContent(preGenerationAnswerContent);
      scheduleLiveOutputScroll('answer');
      const result = await streamSkillWithSkillCreator(
        extractSkillCreatorBrief(skillCreatorPromptForRun),
        skillCreatorAnswersForRun,
        {
          onFinalContent(content) {
            if (content.trim()) {
              isLiveThinkingExpanded.value = false;
            }
            const mergedContent = mergeSkillCreatorGeneratedContent(preGenerationAnswerContent, content);
            liveThinkingContent.value = content;
            syncAnswerContent(mergedContent);
            scheduleLiveOutputScroll('answer', 'artifact');
          },
          onMeta(model) {
            answerModel.value = model;
          },
          onThinking(token) {
            liveThinkingContent.value += token;
            scheduleLiveOutputScroll('answer');
          },
          onToken(token) {
            if (!generatedAnswer.value.trim()) {
              isLiveThinkingExpanded.value = false;
            }
            liveThinkingContent.value += token;
            scheduleLiveOutputScroll('answer');
          },
          onValidation(payload) {
            isLiveThinkingExpanded.value = false;
            skillValidationStatus.value = payload.status;
            skillValidationMessage.value = payload.message || '正在校验技能完整度。';
            liveThinkingContent.value += `\n\n系统校验：${skillValidationMessage.value}`;
            scheduleLiveOutputScroll('answer', 'artifact');
          },
        },
        {
          thinkingMode: selectedThinkingMode.value,
        },
      );
      skillValidationStatus.value = 'checking';
      skillValidationMessage.value = '正在写入技能库、持久化保存并完成读回校验。';
      liveThinkingContent.value += `\n\n系统校验：${skillValidationMessage.value}`;

      const savedSkill = upsertCustomSkill({
        ...result.skill,
        scope: 'personal',
        status: 'draft',
      }, { persist: false });
      if (!savedSkill) {
        throw new Error('技能已生成，但写入技能库失败');
      }

      const locallyVerifiedSkill = getAnySkillByNameOrId(savedSkill.id);
      if (!locallyVerifiedSkill) {
        throw new Error('技能已生成，但未能从当前技能库读回，请重新创建或打开技能管理检查');
      }

      const persistedSkill = await persistCustomSkillNow(locallyVerifiedSkill);
      const finalSkill = upsertCustomSkill({
        ...persistedSkill,
        scope: 'personal',
        status: 'draft',
      }, { persist: false });
      const verifiedSkill = getAnySkillByNameOrId(finalSkill?.id || savedSkill.id);
      if (!verifiedSkill) {
        throw new Error('技能已持久化，但未能从当前技能库读回，请刷新后打开技能管理检查');
      }

      createdSkillResult.value = verifiedSkill;
      activeCreatedSkillId.value = verifiedSkill.id;
      isSkillCreatorCompletionSelectorDismissed.value = false;
      syncPublishSettingsFromSkill(verifiedSkill);
      skillValidationStatus.value = 'complete';
      skillValidationMessage.value = '技能完整度校验通过，已保存为个人草稿，可在右侧查看生成文件。';
      liveThinkingContent.value += `\n\n系统校验：${skillValidationMessage.value}`;

      const streamedContent = result.answerContent.trim();
      const resultContent = streamedContent
        ? mergeSkillCreatorGeneratedContent(preGenerationAnswerContent, streamedContent)
        : mergeSkillCreatorGeneratedContent(generatedAnswer.value, renderCreatedSkillAnswer(verifiedSkill));
      const finalResultContent = `${resultContent.trimEnd()}\n\n${renderSkillCreatorCompletionReply(verifiedSkill)}`;

      answerModel.value = result.model || answerModel.value;
      isGeneratingAnswer.value = false;
      syncAnswerContent(finalResultContent);

      const cachedItem = updateConversationAnswer(activeHistoryId.value || historyItem?.id, historyPrompt, {
        content: finalResultContent,
        model: answerModel.value,
        cachedAt: new Date().toISOString(),
        createdSkillId: verifiedSkill.id,
        thinkingContent: liveThinkingContent.value,
      });

      if (cachedItem) {
        activeHistoryId.value = cachedItem.id;
        syncConversationRoute(cachedItem.id, cachedItem.prompt);
        void refreshGeneratedConversationTitle(cachedItem.id, cachedItem.prompt, finalResultContent);
      }
    } catch (error) {
      isGeneratingAnswer.value = false;
      skillValidationStatus.value = skillValidationStatus.value === 'checking' ? 'error' : skillValidationStatus.value;
      answerError.value = error instanceof Error ? error.message : '技能生成失败';
    }

    return;
  }

  const selectedSkills = extractSelectedSkillsFromPrompt(prompt);
  if (!selectedSkills.length) {
    if (hydrateMissingCachedConversation(prompt, historyId)) return;
  }

  const templateName = selectedTemplate.value?.name;
  const historyItem = beginConversation(prompt, shouldRecord, historyId, shouldRecord || !historyId);
  isDocxPreviewOpen.value = false;
  isGeneratingAnswer.value = true;

  try {
    selectedSkills.forEach((skill) => markSkillUsed(skill.id));
    const result = await streamDeepSeekMessage(
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
        onToken(token) {
          appendAnswerToken(token);
        },
      },
    );

    answerModel.value = result.model || answerModel.value;
    isGeneratingAnswer.value = false;

    if (generatedAnswer.value !== result.content) {
      generatedAnswer.value = result.content;
    }

    openFirstGeneratedArtifact();

    const cachedItem = updateConversationAnswer(activeHistoryId.value || historyItem?.id, prompt, {
      content: result.content,
      model: answerModel.value || result.model,
      cachedAt: new Date().toISOString(),
    });

    if (cachedItem) {
      activeHistoryId.value = cachedItem.id;
      syncConversationRoute(cachedItem.id, cachedItem.prompt);
      void refreshGeneratedConversationTitle(cachedItem.id, cachedItem.prompt, result.content);
    }
  } catch (error) {
    isGeneratingAnswer.value = false;
    answerError.value = error instanceof Error ? error.message : 'AI 调用失败';
  } finally {
    isGeneratingAnswer.value = false;
  }
};

const submitComposer = () => {
  if (!hasComposerContent.value) return;

  const nextPrompt = inputValue.value.trim()
    || (selectedTemplate.value ? createTemplatePrompt(selectedTemplate.value) : '');
  if (!nextPrompt) return;

  if (
    isSkillCreatorConversation.value
    && pendingSkillCreatorStep.value
    && !isGeneratingAnswer.value
  ) {
    inputValue.value = '';
    if (hasPendingSkillCreatorMaterialSelector.value) {
      submitSkillCreatorMaterialText(nextPrompt);
      return;
    }
    const notice = { title: pendingSkillCreatorStep.value.title, label: nextPrompt };
    if (queueSkillCreatorMaterialSelector(nextPrompt, notice)) return;
    submitSkillCreatorAnswerPrompt(nextPrompt, notice);
    return;
  }

  void completeLiveConversation(nextPrompt);
};

const submitSharedComposer = (value: string, options?: Partial<ComposerSubmitOptions>) => {
  const nextValue = value.trim();
  if (!nextValue) return;

  if (options?.thinkingMode) {
    selectedThinkingMode.value = options.thinkingMode;
  }
  if (options?.workspaceId) {
    setActiveWorkspace(options.workspaceId);
  }

  if (
    isSkillCreatorConversation.value
    && pendingSkillCreatorStep.value
    && !isGeneratingAnswer.value
  ) {
    inputValue.value = '';
    if (hasPendingSkillCreatorMaterialSelector.value) {
      submitSkillCreatorMaterialText(nextValue);
      return;
    }
    const notice = { title: pendingSkillCreatorStep.value.title, label: nextValue };
    if (queueSkillCreatorMaterialSelector(nextValue, notice)) return;
    submitSkillCreatorAnswerPrompt(nextValue, notice);
    return;
  }

  void completeLiveConversation(nextValue);
};

const createClawConversationAnswer = () => ({
  content: [
    '已进入 claw 会话。',
    '',
    '把你要处理的材料、目标或问题发给我，我会在这个特殊会话里继续。',
  ].join('\n'),
  model: 'claw',
  cachedAt: new Date().toISOString(),
});

const openRoutePrompt = async () => {
  await loadHistory();

  const routeWorkspaceId = typeof route.query.workspaceId === 'string' ? route.query.workspaceId : '';
  if (routeWorkspaceId) {
    setActiveWorkspace(routeWorkspaceId);
  }

  const rawHistoryId = typeof route.query.historyId === 'string' ? route.query.historyId : undefined;
  const isClawRoute = route.query.source === 'claw';
  const clawHistoryItem = isClawRoute
    ? upsertSpecialConversation(
        'claw',
        'claw 会话',
        'claw',
        createClawConversationAnswer(),
      )
    : null;
  const normalizedHistoryId = rawHistoryId && !deprecatedMockHistoryIds.has(rawHistoryId)
    ? rawHistoryId
    : undefined;
  const historyId = isClawRoute
    ? clawHistoryItem?.id ?? normalizedHistoryId ?? 'special-claw'
    : normalizedHistoryId;
  const routePrompt = typeof route.query.prompt === 'string'
    ? route.query.prompt.trim()
    : typeof route.query.promptKey === 'string'
      ? window.sessionStorage.getItem(route.query.promptKey)?.trim() || ''
      : '';
  if (typeof route.query.promptKey === 'string') {
    window.sessionStorage.removeItem(route.query.promptKey);
  }
  const prompt = routePrompt || clawHistoryItem?.prompt || findHistoryItem(historyId)?.prompt || '';
  if (!prompt.trim()) return;

  const routeKey = `${routeWorkspaceId}:${String(historyId ?? '')}:${prompt}`;
  if (handledRoutePromptKey.value === routeKey) return;
  handledRoutePromptKey.value = routeKey;
  void completeLiveConversation(prompt, !isClawRoute && typeof historyId !== 'string', historyId);
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
  isArtifactPreviewOpen.value = false;

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
    isArtifactPreviewOpen.value = false;
    const referenceId = activeReferenceId.value;
    if (referenceId) {
      void nextTick(() => scrollReferenceIntoView(referenceId));
    }
  }
};

const openDocxPreview = () => {
  isReferenceDrawerOpen.value = false;
  isArtifactPreviewOpen.value = false;
  isDocxPreviewOpen.value = true;
};

const closeDocxPreview = () => {
  isDocxPreviewOpen.value = false;
};

const getSafeFenceForContent = (content: string, currentFence: string) => {
  const maxBacktickRun = Math.max(0, ...(content.match(/`+/g) || []).map((run) => run.length));
  return '`'.repeat(Math.max(currentFence.length, 3, maxBacktickRun + 1));
};

const replaceFencedArtifactContent = (
  source: string,
  start: number,
  end: number,
  nextContent: string,
) => {
  const sectionText = source.slice(start, end);
  const fenceMatch = sectionText.match(/(`{3,})([^\n`]*)\n?/);
  if (!fenceMatch || fenceMatch.index === undefined) return null;

  const normalizedContent = nextContent.replace(/\r\n/g, '\n').replace(/\s+$/, '');
  const prefix = sectionText.slice(0, fenceMatch.index);
  const fence = getSafeFenceForContent(normalizedContent, fenceMatch[1] || '```');
  const info = fenceMatch[2] || '';
  const contentBlock = normalizedContent ? `${normalizedContent}\n` : '';
  const nextSection = `${prefix}${fence}${info}\n${contentBlock}${fence}`;
  const suffix = source.slice(end);
  const separator = suffix && !suffix.startsWith('\n') ? '\n' : '';

  return `${source.slice(0, start)}${nextSection}${separator}${suffix}`;
};

const findArtifactReplacementTarget = (artifact: ChatArtifact) => {
  const source = generatedAnswer.value;
  const generatedTarget = extractGeneratedArtifactSections(source)
    .map((section) => ({
      id: createArtifactId(section.title),
      title: section.title,
      sourceStart: section.start,
      sourceEnd: section.end,
    }))
    .find((candidate) => candidate.id === artifact.id || candidate.title === artifact.title);

  if (generatedTarget) return generatedTarget;

  return extractArtifactsFromAnswer(source)
    .find((candidate) => candidate.id === artifact.id || candidate.title === artifact.title)
    ?? null;
};

const persistEditedArtifactConversation = () => {
  const previousAnswer = activeHistoryItem.value?.answer;
  const cachedItem = updateConversationAnswer(activeHistoryId.value, completedQuestion.value, {
    content: generatedAnswer.value,
    model: answerModel.value || previousAnswer?.model,
    cachedAt: new Date().toISOString(),
    createdSkillId: createdSkillResult.value?.id || previousAnswer?.createdSkillId,
    thinkingContent: liveThinkingContent.value || previousAnswer?.thinkingContent,
  });

  if (cachedItem) {
    activeHistoryId.value = cachedItem.id;
  }
};

const persistEditedSkillArtifact = (artifact: ChatArtifact, nextContent: string) => {
  if (!isSkillCreatorConversation.value) return false;

  const skill = skillCompletionSkill.value;
  if (!skill) return false;

  const nextFiles = skill.files.map((file) => (
    file.path === artifact.title || file.name === artifact.title || createArtifactId(file.path) === artifact.id
      ? { ...file, content: nextContent.replace(/\r\n/g, '\n') }
      : file
  ));
  const hasChangedFile = nextFiles.some((file, index) => file.content !== skill.files[index]?.content);
  if (!hasChangedFile) return false;

  const updatedSkill = upsertCustomSkill({
    ...skill,
    files: nextFiles,
    status: skill.status || 'active',
  });

  if (updatedSkill) {
    createdSkillResult.value = updatedSkill;
  }

  return Boolean(updatedSkill);
};

const startArtifactEdit = () => {
  const artifact = activeArtifact.value;
  if (!artifact) return;

  artifactEditContent.value = artifact.content;
  artifactPanelMode.value = 'preview';
  isArtifactEditing.value = true;
  void nextTick(() => artifactEditorRef.value?.focus());
};

const cancelArtifactEdit = () => {
  artifactEditContent.value = activeArtifact.value?.content || '';
  isArtifactEditing.value = false;
};

const saveArtifactEdit = () => {
  const artifact = activeArtifact.value;
  if (!artifact || isSavingArtifactEdit.value) return;

  isSavingArtifactEdit.value = true;

  try {
    generatedAnswer.value = normalizeGeneratedArtifactBoundaries(generatedAnswer.value);
    const target = findArtifactReplacementTarget(artifact);
    const updatedAnswer = target
      ? replaceFencedArtifactContent(generatedAnswer.value, target.sourceStart, target.sourceEnd, artifactEditContent.value)
      : null;

    if (!updatedAnswer) {
      showToast('未找到可保存的 Artifact 内容');
      return;
    }

    generatedAnswer.value = updatedAnswer;
    persistEditedArtifactConversation();
    persistEditedSkillArtifact(artifact, artifactEditContent.value);
    isArtifactEditing.value = false;
    showToast('Artifact 已保存');
  } finally {
    isSavingArtifactEdit.value = false;
  }
};

const openArtifactPreview = (artifactId: string) => {
  isArtifactEditing.value = false;
  artifactEditContent.value = '';
  artifactPanelMode.value = 'preview';
  activeArtifactId.value = artifactId;
  isReferenceDrawerOpen.value = false;
  isDocxPreviewOpen.value = false;
  isArtifactPreviewOpen.value = true;
};

const zipTextEncoder = new TextEncoder();
const zipCrcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const calculateZipCrc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = (zipCrcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

const createStoredZipBlob = (files: Array<{ path: string; content: string }>) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = zipTextEncoder.encode(file.path.replace(/^\/+/, '') || 'SKILL.md');
    const contentBytes = zipTextEncoder.encode(file.content || '');
    const crc = calculateZipCrc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, contentBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  const blobParts = [...localParts, ...centralParts, endRecord].map((part) =>
    part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength) as ArrayBuffer
  );
  return new Blob(blobParts, { type: 'application/zip' });
};

const getSkillPackageById = (skillId?: string | null) =>
  (skillId ? getAnySkillByNameOrId(skillId) : null)
  ?? skillCompletionSkill.value
  ?? createdSkillResult.value
  ?? (activeCreatedSkillId.value ? getAnySkillByNameOrId(activeCreatedSkillId.value) : null);

const normalizeSkillFileTypeFromArtifact = (artifact: ChatArtifact): SkillFile['type'] => {
  if (artifact.language === 'typescript' || artifact.language === 'json' || artifact.language === 'yaml') {
    return artifact.language;
  }
  return 'markdown';
};

const extractSkillPackageMetadataFromArtifacts = (artifacts: ChatArtifact[]) => {
  const skillMarkdown = artifacts.find((artifact) => artifact.title === 'SKILL.md')?.content || '';
  const frontmatterName = skillMarkdown.match(/^name\s*:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim() || '';
  const headingName = skillMarkdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
  const descriptionMatch = skillMarkdown.match(/^description\s*:\s*(?:>-\s*)?(.+)$/m);
  const description = descriptionMatch?.[1]?.trim()
    || skillMarkdown
      .replace(/^---[\s\S]*?---\s*/m, '')
      .replace(/^#\s+.+$/m, '')
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .find(Boolean)
    || '由技能创建器生成的个人技能。';

  return {
    id: frontmatterName,
    name: headingName || frontmatterName,
    description,
  };
};

const buildSkillPackageFromArtifacts = (
  skillId?: string | null,
  skillName?: string | null,
): SkillCatalogItem | null => {
  const artifacts = generatedArtifacts.value;
  if (!artifacts.length) return null;

  const metadata = extractSkillPackageMetadataFromArtifacts(artifacts);
  const id = (skillId || activeCreatedSkillId.value || createdSkillIdFromAnswer.value || metadata.id || 'generated-skill')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  const name = (skillName || metadata.name || id).trim();

  return {
    id,
    name,
    description: metadata.description,
    category: '自建技能',
    routeName: 'custom-skill',
    tags: ['自建技能'],
    files: artifacts.map((artifact, index) => ({
      id: `${id}-file-${index + 1}`,
      name: artifact.title.split('/').pop() || artifact.title,
      path: artifact.title,
      type: normalizeSkillFileTypeFromArtifact(artifact),
      content: stripSkillCreatorRuntimeMarkers(artifact.content),
    })),
    source: 'custom',
    scope: 'personal',
    status: 'active',
  };
};

const getSkillPackage = (skillId?: string | null, skillName?: string | null) =>
  getSkillPackageById(skillId) ?? buildSkillPackageFromArtifacts(skillId, skillName);

const getSkillPackageFiles = (skillId?: string | null, skillName?: string | null) => {
  const skill = getSkillPackage(skillId, skillName);
  if (skill?.files?.length) {
    return skill.files.map((file) => ({
      path: file.path || file.name || 'SKILL.md',
      content: stripSkillCreatorRuntimeMarkers(file.content || ''),
    }));
  }

  return generatedArtifacts.value.map((artifact) => ({
    path: artifact.title,
    content: stripSkillCreatorRuntimeMarkers(artifact.content),
  }));
};

const downloadSkillPackageZip = (skillId?: string | null, skillName?: string | null) => {
  const files = getSkillPackageFiles(skillId, skillName);
  if (!files.length) {
    showToast('当前没有可下载的技能文件');
    return;
  }

  const skill = getSkillPackage(skillId, skillName);
  const zipBlob = createStoredZipBlob(files);
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  const filename = `${(skill?.name || skill?.id || 'skill-package').replace(/[\\/:*?"<>|]+/g, '-')}.zip`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('技能包已开始下载');
};

const saveSkillPackageToPersonal = async (skillId?: string | null, skillName?: string | null) => {
  const skill = getSkillPackage(skillId, skillName);
  if (!skill) {
    showToast('当前没有可保存的技能包');
    return;
  }

  const localSkill = upsertCustomSkill({
    ...skill,
    scope: 'personal',
    status: 'active',
  }, { persist: false });

  if (!localSkill) {
    showToast('保存到个人技能失败');
    return;
  }

  try {
    const persistedSkill = await persistCustomSkillNow(localSkill);
    const savedSkill = upsertCustomSkill({
      ...persistedSkill,
      scope: 'personal',
      status: 'active',
    }, { persist: false }) ?? localSkill;
    const enabledSkill = setSkillEnabled(savedSkill.id, true) ?? savedSkill;
    createdSkillResult.value = enabledSkill;
    activeCreatedSkillId.value = enabledSkill.id;
    skillValidationStatus.value = 'complete';
    skillValidationMessage.value = '技能已保存到个人技能。';
    showToast('已保存到个人技能');
  } catch {
    showToast('已保存到本地个人技能，远端同步失败');
  }
};

const handleLiveAnswerClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const downloadButton = target.closest<HTMLElement>('[data-skill-package-download]');
  if (downloadButton) {
    const packageRoot = downloadButton.closest<HTMLElement>('[data-skill-package]');
    downloadSkillPackageZip(
      packageRoot?.dataset.skillPackage || downloadButton.dataset.skillPackageDownload,
      packageRoot?.dataset.skillPackageName,
    );
    return;
  }

  const saveButton = target.closest<HTMLElement>('[data-skill-package-save]');
  if (saveButton) {
    const packageRoot = saveButton.closest<HTMLElement>('[data-skill-package]');
    void saveSkillPackageToPersonal(
      packageRoot?.dataset.skillPackage || saveButton.dataset.skillPackageSave,
      packageRoot?.dataset.skillPackageName,
    );
    return;
  }

  const packageCard = target.closest<HTMLElement>('[data-skill-package]');
  if (packageCard) {
    openFirstGeneratedArtifact();
    return;
  }

  const card = target.closest<HTMLElement>('[data-artifact-id]');
  const artifactId = card?.dataset.artifactId;
  if (!artifactId) return;

  openArtifactPreview(artifactId);
};

const openFirstGeneratedArtifact = () => {
  const firstArtifact = generatedArtifacts.value[0];
  if (!firstArtifact) {
    isArtifactPreviewOpen.value = false;
    activeArtifactId.value = '';
    return;
  }

  openArtifactPreview(firstArtifact.id);
};

const openSkillPublishSettings = () => {
  const skill = skillCompletionSkill.value;
  if (!skill) return;

  syncPublishSettingsFromSkill(skill);
  const artifact = activeArtifact.value ?? generatedArtifacts.value[0];
  if (artifact) {
    openArtifactPreview(artifact.id);
  } else {
    isReferenceDrawerOpen.value = false;
    isDocxPreviewOpen.value = false;
    isArtifactPreviewOpen.value = true;
  }
  isArtifactEditing.value = false;
  artifactPanelMode.value = 'publish';
};

const choosePublishIcon = () => {
  publishIconInputRef.value?.click();
};

const clearPublishIcon = () => {
  publishSettings.value = {
    ...publishSettings.value,
    iconDataUrl: '',
  };
};

const handlePublishIconUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('请上传图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string') return;
    publishSettings.value = {
      ...publishSettings.value,
      iconDataUrl: reader.result,
    };
  };
  reader.readAsDataURL(file);
};

const updateActivePublishPermission = (patch: Partial<SkillPublishPermissionSettings>) => {
  const { visibility, scopePermissions } = publishSettings.value;
  if (!isShareablePublishVisibility(visibility)) return;
  const nextPermission = {
    ...scopePermissions[visibility],
    ...patch,
  };
  if (!nextPermission.allowCopy) {
    nextPermission.allowRemix = false;
  }

  publishSettings.value = {
    ...publishSettings.value,
    scopePermissions: {
      ...scopePermissions,
      [visibility]: nextPermission,
    },
  };
};

const handleActivePermissionCopyChange = (event: Event) => {
  const allowCopy = (event.target as HTMLInputElement).checked;
  updateActivePublishPermission({
    allowCopy,
    allowRemix: allowCopy ? activePublishPermission.value?.allowRemix : false,
  });
};

const handleActivePermissionRemixChange = (event: Event) => {
  updateActivePublishPermission({
    allowRemix: (event.target as HTMLInputElement).checked,
  });
};

const handleActivePermissionPublisherVisibilityChange = (event: Event) => {
  updateActivePublishPermission({
    showPublisherName: (event.target as HTMLInputElement).checked,
  });
};

const handleActivePermissionPublisherNameInput = (event: Event) => {
  updateActivePublishPermission({
    publisherName: (event.target as HTMLInputElement).value,
  });
};

const normalizePublishSettings = (settings: SkillPublishSettings): SkillPublishSettings => ({
  ...settings,
  name: settings.name.trim(),
  description: settings.description.trim(),
  visibility: isPublishVisibility(settings.visibility) ? settings.visibility : 'personal',
  scopePermissions: {
    group: normalizePublishPermission(settings.scopePermissions.group),
    team: normalizePublishPermission(settings.scopePermissions.team),
  },
});

const formatPublishDestination = (visibility: SkillPublishVisibility) => {
  if (visibility === 'personal') return '仅自己';
  return publishVisibilityOptions.find((option) => option.id === visibility)?.label ?? '仅自己';
};

const saveSkillPublishSettings = (mode: 'draft' | 'publish') => {
  const skill = skillCompletionSkill.value;
  if (!skill) return;

  const settings = normalizePublishSettings(publishSettings.value);

  if (!settings.name || !settings.description) {
    showToast('请补全技能名称和描述');
    return;
  }

  const updatedSkill = upsertCustomSkill({
    ...skill,
    name: settings.name,
    description: settings.description,
    scope: mode === 'publish' && settings.visibility !== 'personal' ? 'team' : 'personal',
    status: mode === 'publish' ? 'active' : 'draft',
  });

  if (!updatedSkill) {
    showToast('发布设置保存失败');
    return;
  }

  publishSettings.value = settings;
  writeStoredPublishSettings(updatedSkill.id, settings);
  createdSkillResult.value = updatedSkill;
  skillValidationStatus.value = 'complete';
  skillValidationMessage.value = mode === 'publish'
    ? `技能已发布到${formatPublishDestination(settings.visibility)}。`
    : '技能发布设置已保存为草稿。';
  showToast(mode === 'publish' ? '技能已发布' : '发布设置已保存');
};

const useCreatedSkillNow = () => {
  const skill = skillCompletionSkill.value;
  if (!skill) return;
  if (!isSkillEnabled(skill)) {
    showToast('请先启用技能后再使用');
    return;
  }

  void router.push({
    name: 'home',
    query: {
      composerAction: 'use-skill',
      skillName: skill.id,
      composerTick: Date.now().toString(),
    },
  });
};

const enableCreatedSkill = () => {
  const skill = skillCompletionSkill.value;
  if (!skill) return;

  const updatedSkill = setSkillEnabled(skill.id, true);
  if (updatedSkill) {
    createdSkillResult.value = updatedSkill;
  }
  skillValidationMessage.value = '技能已启用，可以在聊天中调用。';
  showToast('技能已启用');
};

const openSkillArtifactMatching = (
  matcher: (artifact: ChatArtifact) => boolean,
  options: { edit?: boolean } = {},
) => {
  const artifact = generatedArtifacts.value.find(matcher) ?? generatedArtifacts.value[0];
  if (!artifact) {
    showToast('当前没有可查看的技能文件');
    return;
  }

  openArtifactPreview(artifact.id);
  if (options.edit) {
    void nextTick(() => {
      artifactEditContent.value = activeArtifact.value?.content || '';
      isArtifactEditing.value = true;
      artifactEditorRef.value?.focus();
    });
  }
};

const persistSkillCreatorCompletionSelectorDismissal = () => {
  isSkillCreatorCompletionSelectorDismissed.value = true;

  const currentAnswer = activeHistoryItem.value?.answer;
  const baseContent = (generatedAnswer.value || currentAnswer?.content || '').trimEnd();
  if (!baseContent) return;

  const nextContent = hasSkillCompletionSelectorDismissed(baseContent)
    ? baseContent
    : `${baseContent}\n\n${skillCompletionDismissedMarker}`;

  syncAnswerContent(nextContent);

  if (!activeHistoryId.value || !completedQuestion.value.trim()) return;
  updateConversationAnswer(activeHistoryId.value, completedQuestion.value, {
    content: nextContent,
    model: answerModel.value || currentAnswer?.model,
    cachedAt: new Date().toISOString(),
    createdSkillId: activeCreatedSkillId.value || createdSkillIdFromAnswer.value || currentAnswer?.createdSkillId,
    thinkingContent: liveThinkingContent.value || currentAnswer?.thinkingContent,
  });
};

const dismissSkillCreatorCompletionSelector = () => {
  persistSkillCreatorCompletionSelectorDismissal();
};

const submitSkillCreatorCompletionOption = (option: SkillCreatorCompletionOption) => {
  if (!skillCompletionSkill.value) return;
  persistSkillCreatorCompletionSelectorDismissal();

  if (option.id === 'inspect-skill') {
    openSkillArtifactMatching((artifact) => artifact.title === 'SKILL.md');
    return;
  }

  if (option.id === 'edit-references') {
    openSkillArtifactMatching((artifact) => artifact.title.startsWith('references/'), { edit: true });
    return;
  }

  if (option.id === 'publish-settings') {
    openSkillPublishSettings();
    showToast('已打开技能文件，发布设置可在技能管理中继续完成');
    return;
  }

  enableCreatedSkill();
  useCreatedSkillNow();
};

const closeArtifactPreview = () => {
  isArtifactEditing.value = false;
  artifactEditContent.value = '';
  artifactPanelMode.value = 'preview';
  isArtifactPreviewOpen.value = false;
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
  const match = inputValue.value.match(/@([^\s@]+)$/u);
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

const showToast = (message: string) => {
  toastMessage.value = message;
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toastMessage.value = '';
    toastTimer = undefined;
  }, 1800);
};

const copyText = async (text: string, successMessage: string) => {
  const value = text.trim();
  if (!value) {
    showToast('暂无可复制内容');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(copied ? successMessage : '复制失败，请手动复制');
  }
};

const getShareUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.href;
};

const getAnswerPlainText = () => {
  if (isLiveConversation.value) {
    return renderableAnswerContent.value || answerError.value || answerNotice.value;
  }

  return [
    reportMock.title,
    reportMock.summary,
    ...reportMock.sections.flatMap((section) => [
      section.title,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    ]),
  ].join('\n\n');
};

const getConversationPlainText = () => {
  if (!hasCompletedMock.value) return '';
  const question = completedQuestion.value.trim();
  const answer = getAnswerPlainText().trim();

  return [
    headerTitle.value,
    question ? `用户：${question}` : '',
    answer ? `AI：${answer}` : '',
  ].filter(Boolean).join('\n\n');
};

const copyQuestion = () => {
  void copyText(completedQuestion.value, '问题已复制');
};

const copyAnswer = () => {
  void copyText(getAnswerPlainText(), '回答已复制');
};

const copyConversation = () => {
  void copyText(getConversationPlainText(), '全文已复制');
};

const copyShareLink = () => {
  void copyText(getShareUrl(), '分享链接已复制');
};

const goBackFromConversation = () => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }

  void router.push({ name: 'home' });
};

const clampPreviewRatio = (ratio: number, totalWidth: number) => {
  if (!Number.isFinite(ratio)) return previewPanelRatio.value;
  if (totalWidth <= chatMainMinWidth + previewPanelMinWidth) {
    return Math.min(0.62, Math.max(0.38, ratio));
  }

  const minRatio = previewPanelMinWidth / totalWidth;
  const maxRatio = (totalWidth - chatMainMinWidth) / totalWidth;
  return Math.min(maxRatio, Math.max(minRatio, ratio));
};

const updatePreviewPanelRatioFromClientX = (clientX: number) => {
  const rect = chatPageRef.value?.getBoundingClientRect();
  if (!rect?.width) return;

  const rightWidth = rect.right - clientX;
  previewPanelRatio.value = clampPreviewRatio(rightWidth / rect.width, rect.width);
};

const adjustPreviewPanelRatio = (delta: number) => {
  const rect = chatPageRef.value?.getBoundingClientRect();
  previewPanelRatio.value = clampPreviewRatio(previewPanelRatio.value + delta, rect?.width || window.innerWidth);
};

const handlePreviewResizeMove = (event: PointerEvent) => {
  if (!isPreviewResizing.value) return;
  event.preventDefault();
  updatePreviewPanelRatioFromClientX(event.clientX);
};

const stopPreviewResize = () => {
  if (!isPreviewResizing.value) return;
  isPreviewResizing.value = false;
  window.removeEventListener('pointermove', handlePreviewResizeMove);
  window.removeEventListener('pointerup', stopPreviewResize);
  window.removeEventListener('pointercancel', stopPreviewResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

const startPreviewResize = (event: PointerEvent) => {
  if (event.button !== 0) return;
  event.preventDefault();
  isPreviewResizing.value = true;
  updatePreviewPanelRatioFromClientX(event.clientX);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  window.addEventListener('pointermove', handlePreviewResizeMove, { passive: false });
  window.addEventListener('pointerup', stopPreviewResize);
  window.addEventListener('pointercancel', stopPreviewResize);
};

const deleteCurrentConversation = () => {
  const removed = activeHistoryId.value ? deleteConversation(activeHistoryId.value) : false;

  completedQuestion.value = '';
  hasCompletedMock.value = false;
  generatedAnswer.value = '';
  liveThinkingContent.value = '';
  isLiveThinkingExpanded.value = false;
  skillValidationStatus.value = 'idle';
  skillValidationMessage.value = '';
  createdSkillResult.value = null;
  activePublishSkillId.value = '';
  artifactPanelMode.value = 'preview';
  answerError.value = '';
  answerNotice.value = '';
  activeHistoryId.value = '';
  isDocxPreviewOpen.value = false;
  isArtifactPreviewOpen.value = false;
  activeArtifactId.value = '';
  isReferenceDrawerOpen.value = false;
  showToast(removed ? '会话已删除' : '当前内容已删除');
  void router.push({ name: 'home' });
};

const addCurrentAnswerToKnowledgeBase = () => {
  showToast('已加入知识库');
};

onMounted(() => {
  document.addEventListener('click', closeDropdown);
  void openRoutePrompt();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown);
  stopPreviewResize();
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }
  if (liveAutoScrollFrame !== undefined) {
    window.cancelAnimationFrame(liveAutoScrollFrame);
    liveAutoScrollFrame = undefined;
  }
});

watch(generatedArtifacts, (artifacts) => {
  if (!artifacts.length) return;

  if (isSkillCreatorConversation.value) {
    const preferredArtifact = artifacts.find((artifact) => /^SKILL\.md$/i.test(artifact.title)) ?? artifacts[0];
    if (preferredArtifact && !activeArtifactId.value) {
      lastAutoOpenedArtifactId.value = preferredArtifact.id;
      activeArtifactId.value = preferredArtifact.id;
    }
    return;
  }

  if (!activeArtifactId.value) return;
  if (!artifacts.some((artifact) => artifact.id === activeArtifactId.value)) {
    activeArtifactId.value = artifacts[0]?.id || '';
  }
});

watch(
  () => [activeArtifact.value?.id, activeArtifact.value?.content] as const,
  ([artifactId, content]) => {
    if (!artifactId) {
      artifactEditContent.value = '';
      isArtifactEditing.value = false;
      return;
    }

    if (!isArtifactEditing.value) {
      artifactEditContent.value = content || '';
    }
  },
);

watch(
  () => [liveThinkingContent.value, generatedAnswer.value, shouldShowSkillGenerationStatus.value] as const,
  () => {
    if (!isGeneratingAnswer.value) return;
    scheduleLiveOutputScroll('answer');
    if (isSkillCreatorConversation.value) {
      scheduleLiveOutputScroll('artifact');
    }
  },
  { flush: 'post' },
);

watch(
  () => [
    activeArtifact.value?.id,
    activeArtifact.value?.content,
    isArtifactPreviewOpen.value,
    artifactPanelMode.value,
  ] as const,
  () => {
    if (!isGeneratingAnswer.value || !isSkillCreatorConversation.value) return;
    scheduleLiveOutputScroll('artifact');
  },
  { flush: 'post' },
);

watch(
  () => skillCompletionSkill.value?.id ?? '',
  () => {
    syncPublishSettingsFromSkill(skillCompletionSkill.value);
  },
);

watch(
  () => [
    publishSettings.value.scopePermissions.group.allowCopy,
    publishSettings.value.scopePermissions.team.allowCopy,
  ] as const,
  ([groupAllowCopy, teamAllowCopy]) => {
    const { group, team } = publishSettings.value.scopePermissions;
    if (
      (groupAllowCopy || !group.allowRemix)
      && (teamAllowCopy || !team.allowRemix)
    ) {
      return;
    }

    publishSettings.value = {
      ...publishSettings.value,
      scopePermissions: {
        group: groupAllowCopy ? group : { ...group, allowRemix: false },
        team: teamAllowCopy ? team : { ...team, allowRemix: false },
      },
    };
  },
);

watch(
  () => [route.query.prompt, route.query.promptKey, route.query.historyId, route.query.workspaceId, route.query.source],
  () => {
    void openRoutePrompt();
  },
);
</script>

<template>
  <div
    ref="chatPageRef"
    class="chat-page"
    :class="{ 'preview-split': hasPreviewPanel, 'is-preview-resizing': isPreviewResizing }"
    :style="previewSplitStyle"
    @click.self="closeDropdown"
  >
    <main class="chat-main">
      <header class="chat-header">
        <button class="header-back-button" type="button" aria-label="返回上一页" @click="goBackFromConversation">
          <ArrowLeft :size="18" />
        </button>
        <div class="header-meta">
          <h1>{{ headerTitle }}</h1>
          <p>{{ headerSubtitle }}</p>
        </div>
        <div class="header-actions" aria-label="会话操作">
          <button
            class="header-action-button"
            type="button"
            aria-label="复制全文"
            :disabled="!hasCompletedMock"
            @click="copyConversation"
          >
            <Copy :size="14" />
            复制全文
          </button>
          <button class="header-action-button" type="button" aria-label="分享" @click="copyShareLink">
            <Share2 :size="14" />
            分享
          </button>
        </div>
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
        <div ref="answerScrollRef" class="answer-scroll">
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
                  <code
                    v-else-if="part.type === 'asset'"
                    class="question-asset-chip"
                    :data-badge="assetBadgeLabel(part.assetKind ?? 'local-file')"
                    :title="part.sourceLabel ? `${part.value}（${part.sourceLabel}）` : part.value"
                  >
                    <span class="question-asset-name">{{ part.value }}</span>
                  </code>
                  <span v-else>{{ part.value }}</span>
                </template>
              </p>
              <div class="question-actions">
                <button type="button" @click="copyQuestion"><Copy :size="13" />复制</button>
                <button type="button" @click="deleteCurrentConversation"><Trash2 :size="13" />删除</button>
              </div>
            </div>
          </div>

          <article class="answer-card" :class="{ 'live-answer-card': isLiveConversation }">
            <header v-if="!isSkillCreatorConversation" class="answer-card-header">
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
              <section v-if="isLiveConversation" class="live-answer-section" aria-label="AI 生成结果">
                <div v-if="isGeneratingAnswer && !generatedAnswer && !hasLiveThinking" class="live-loading">
                  <Brain :size="17" />
                  <span>正在思考</span>
                </div>
                <div v-if="shouldShowSkillGenerationStatus" class="live-generation-status" aria-label="正在生成技能">
                  <Puzzle :size="16" aria-hidden="true" />
                  <strong class="live-status-shine">正在生成技能</strong>
                </div>
                <div
                  v-if="liveAnswerBeforeThinkingHtml"
                  class="live-answer-text"
                  v-html="liveAnswerBeforeThinkingHtml"
                  @click="handleLiveAnswerClick"
                ></div>
                <div v-if="generatedArtifacts.length && !isSkillCreatorConversation" class="artifact-list" aria-label="生成文件">
                  <button
                    v-for="artifact in generatedArtifacts"
                    :key="artifact.id"
                    type="button"
                    class="artifact-card"
                    :class="{ active: activeArtifact?.id === artifact.id && isArtifactPreviewOpen }"
                    @click="openArtifactPreview(artifact.id)"
                  >
                    <span class="artifact-file-icon" :class="getArtifactFileMeta(artifact).className" aria-hidden="true">
                      <span>{{ getArtifactFileMeta(artifact).label }}</span>
                    </span>
                    <span class="artifact-card-main">
                      <strong>{{ artifact.title }}</strong>
                      <span>{{ artifact.summary || '已生成可预览文件' }}</span>
                    </span>
                    <span class="artifact-card-kind">预览</span>
                  </button>
                </div>
                <div
                  v-if="hasLiveThinking"
                  class="live-thinking-card"
                  :class="{ streaming: isLiveThinkingStreaming, expanded: isLiveThinkingExpanded }"
                >
                  <button
                    type="button"
                    class="live-thinking-header"
                    :class="{ 'can-toggle': canToggleLiveThinking }"
                    :aria-expanded="isLiveThinkingStreaming ? true : canToggleLiveThinking ? isLiveThinkingExpanded : undefined"
                    :aria-disabled="!canToggleLiveThinking"
                    :title="liveThinkingHint"
                    @click="toggleLiveThinking"
                  >
                    <span class="live-thinking-copy">
                      <strong class="live-thinking-shine">{{ liveThinkingLabel }}</strong>
                    </span>
                    <ChevronDown
                      v-if="canToggleLiveThinking"
                      class="live-thinking-chevron"
                      :size="14"
                      aria-hidden="true"
                    />
                  </button>
                  <div v-if="shouldShowLiveThinkingBody" class="live-thinking-body" v-html="liveThinkingBodyHtml"></div>
                </div>
                <div
                  v-if="liveAnswerAfterThinkingHtml"
                  class="live-answer-text"
                  v-html="liveAnswerAfterThinkingHtml"
                  @click="handleLiveAnswerClick"
                ></div>
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

            <div v-if="shouldShowAnswerActions" class="answer-actions">
              <button type="button" @click="copyAnswer"><Copy :size="14" />复制</button>
              <button type="button" @click="deleteCurrentConversation"><Trash2 :size="14" />删除</button>
              <button type="button" @click="copyShareLink"><Share2 :size="14" />分享</button>
              <button type="button" @click="addCurrentAnswerToKnowledgeBase"><Zap :size="14" />加入知识库</button>
            </div>
          </article>
        </div>
      </section>

      <footer class="composer-wrap" :class="{ 'with-source-drawer': isReferenceDrawerOpen && !isLiveConversation }">
        <section
          v-if="shouldShowSkillCreatorSelector && pendingSkillCreatorStep"
          class="skill-intake-selector"
          aria-label="技能创建补充选项"
        >
          <header class="skill-intake-selector-header">
            <h2>{{ pendingSkillCreatorStep.title }}</h2>
            <button
              type="button"
              class="skill-intake-close"
              aria-label="关闭补充选项"
              @click="dismissSkillCreatorSelector"
            >
              <X :size="18" />
            </button>
          </header>
          <div class="skill-intake-options">
            <button
              v-for="(option, index) in pendingSkillCreatorStep.options"
              :key="option.id"
              type="button"
              class="skill-intake-option"
              :class="{ recommended: option.recommended }"
              @click="submitSkillCreatorSelectorOption(option)"
            >
              <span class="skill-intake-option-index">{{ index + 1 }}</span>
              <span class="skill-intake-option-main">
                <span class="skill-intake-option-label">{{ option.label }}</span>
                <span v-if="option.description" class="skill-intake-option-desc">{{ option.description }}</span>
              </span>
              <CornerDownLeft v-if="option.recommended" :size="18" class="skill-intake-enter" />
            </button>
          </div>
          <footer class="skill-intake-selector-footer">
            <button
              v-if="!isSkillCreatorOtherOpen"
              type="button"
              class="skill-intake-other"
              aria-label="填写其他补充"
              @click="openSkillCreatorOtherInput"
            >
              <span class="skill-intake-other-icon"><Pencil :size="17" /></span>
              <span>其他补充</span>
            </button>
            <form
              v-else
              class="skill-intake-other-form"
              aria-label="其他补充"
              @submit.prevent="submitSkillCreatorOtherInput"
            >
              <span class="skill-intake-other-icon"><Pencil :size="17" /></span>
              <input
                ref="skillCreatorOtherInputRef"
                v-model="skillCreatorOtherInput"
                class="skill-intake-other-input"
                type="text"
                aria-label="补充具体说明"
                autocomplete="off"
                placeholder="补充具体说明"
              />
              <button
                type="submit"
                class="skill-intake-other-submit"
                aria-label="提交其他补充"
                :disabled="!skillCreatorOtherInput.trim()"
              >
                <CornerDownLeft :size="16" />
              </button>
            </form>
            <button type="button" class="skill-intake-skip" @click="submitSkillCreatorSkip">跳过</button>
          </footer>
        </section>
        <section
          v-if="shouldShowSkillCreatorMaterials"
          class="skill-intake-selector skill-material-selector"
          aria-label="技能创建参考材料"
        >
          <header class="skill-intake-selector-header">
            <div class="skill-intake-material-title">
              <h2>是否补充一份参考材料？</h2>
              <p>
                <span v-if="skillCreatorMaterialDecisionText">已记录：{{ skillCreatorMaterialDecisionText }}。</span>
                这一步不是必填；选择后我会把它转成技能里的模板、示例或判断依据继续创建。
              </p>
            </div>
            <button
              type="button"
              class="skill-intake-close"
              aria-label="不补充材料并继续"
              @click="submitSkillCreatorMaterialSkip"
            >
              <X :size="18" />
            </button>
          </header>
          <section class="skill-intake-materials" aria-label="可补充材料">
            <div class="skill-intake-material-grid">
              <button
                v-for="material in skillCreatorMaterialOptions"
                :key="material.id"
                type="button"
                class="skill-intake-material"
                @click="submitSkillCreatorMaterialOption(material)"
              >
                <span class="skill-intake-material-icon" :class="material.kind">
                  <Upload v-if="material.kind === 'local-file'" :size="15" />
                  <BookOpen v-else-if="material.kind === 'knowledge-file' || material.kind === 'team-rule'" :size="15" />
                  <History v-else-if="material.kind === 'history-output'" :size="15" />
                  <FileText v-else :size="15" />
                </span>
                <span class="skill-intake-material-copy">
                  <strong>{{ material.label }}</strong>
                  <small>{{ material.description }}</small>
                  <small
                    v-if="skillCreatorMaterialActionHint(material)"
                    class="skill-intake-material-action"
                  >
                    {{ skillCreatorMaterialActionHint(material) }}
                  </small>
                </span>
              </button>
            </div>
          </section>
          <footer class="skill-intake-selector-footer">
            <button
              v-if="!isSkillCreatorOtherOpen"
              type="button"
              class="skill-intake-other"
              aria-label="填写其他材料"
              @click="openSkillCreatorOtherInput"
            >
              <span class="skill-intake-other-icon"><Pencil :size="17" /></span>
              <span>其他补充</span>
            </button>
            <form
              v-else
              class="skill-intake-other-form"
              aria-label="其他材料补充"
              @submit.prevent="submitSkillCreatorOtherInput"
            >
              <span class="skill-intake-other-icon"><Pencil :size="17" /></span>
              <input
                ref="skillCreatorOtherInputRef"
                v-model="skillCreatorOtherInput"
                class="skill-intake-other-input"
                type="text"
                aria-label="补充材料说明"
                autocomplete="off"
                placeholder="说明材料来源或希望参考的模板"
              />
              <button
                type="submit"
                class="skill-intake-other-submit"
                aria-label="提交材料补充"
                :disabled="!skillCreatorOtherInput.trim()"
              >
                <CornerDownLeft :size="16" />
              </button>
            </form>
            <button type="button" class="skill-intake-skip" @click="submitSkillCreatorMaterialSkip">跳过</button>
          </footer>
        </section>
        <section
          v-if="shouldShowSkillCreatorCompletionSelector"
          class="skill-intake-selector skill-completion-selector"
          aria-label="技能创建完成后的下一步"
        >
          <header class="skill-intake-selector-header">
            <h2>技能文件已创建完成，下一步你想怎么走？</h2>
            <button
              type="button"
              class="skill-intake-close"
              aria-label="关闭下一步选项"
              @click="dismissSkillCreatorCompletionSelector"
            >
              <X :size="18" />
            </button>
          </header>
          <div class="skill-intake-options">
            <button
              v-for="(option, index) in skillCreatorCompletionOptions"
              :key="option.id"
              type="button"
              class="skill-intake-option"
              :class="{ recommended: option.recommended }"
              @click="submitSkillCreatorCompletionOption(option)"
            >
              <span class="skill-intake-option-index">{{ index + 1 }}</span>
              <span class="skill-intake-option-main">
                <span class="skill-intake-option-label">{{ option.label }}</span>
                <span class="skill-intake-option-desc">{{ option.description }}</span>
              </span>
              <CornerDownLeft v-if="option.recommended" :size="18" class="skill-intake-enter" />
            </button>
          </div>
        </section>
        <ChatInput
          ref="chatInputRef"
          v-model="inputValue"
          @submit="submitSharedComposer"
        />

        <p class="ai-note">回复的内容由AI生成，非人工编辑；其内容准确性和完整性无法保证，不代表我们的态度和观点。</p>
      </footer>
    </main>

    <div
      v-if="hasPreviewPanel"
      class="preview-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="调整预览面板宽度"
      tabindex="0"
      @pointerdown="startPreviewResize"
      @keydown.left.prevent="adjustPreviewPanelRatio(0.03)"
      @keydown.right.prevent="adjustPreviewPanelRatio(-0.03)"
    ></div>

    <SkillManageModal
      v-if="showSkillManageModal"
      create-behavior="emit"
      @close="showSkillManageModal = false"
      @create="triggerSkillAction"
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
          <button type="button" class="source-kb-button" @click.stop="addCurrentAnswerToKnowledgeBase">
            <Zap :size="13" />
            加入知识库
          </button>
        </article>
      </div>
    </aside>

    <aside v-if="hasCompletedMock && isArtifactPreviewOpen && activeArtifact" class="artifact-preview-panel" aria-label="Artifact 文件预览">
      <header class="artifact-preview-header">
        <div class="artifact-preview-title">
          <span class="artifact-preview-icon">
            <FileText :size="18" />
          </span>
          <div>
            <strong>{{ activeArtifact.title }}</strong>
            <span>{{ activeArtifact.kind === 'code' ? activeArtifact.language : 'Artifact 预览' }}</span>
          </div>
        </div>
        <div class="artifact-preview-actions">
          <button type="button" class="artifact-preview-close" aria-label="关闭文件预览" title="关闭文件预览" @click="closeArtifactPreview">
            <X :size="18" />
          </button>
        </div>
      </header>

      <div
        v-if="isSkillArtifactWorkspace"
        class="skill-artifact-workspace"
        ref="artifactPreviewScrollRef"
      >
        <nav class="skill-artifact-tree" aria-label="技能文件目录">
          <button
            v-for="artifact in generatedArtifacts"
            :key="artifact.id"
            type="button"
            class="skill-artifact-tree-item"
            :class="{ active: activeArtifact.id === artifact.id }"
            @click="openArtifactPreview(artifact.id)"
          >
            <span class="skill-tree-file-icon" :class="getSkillArtifactTypeMeta(artifact).className" aria-hidden="true">
              {{ getSkillArtifactTypeMeta(artifact).label.slice(0, 1) }}
            </span>
            <span class="skill-tree-file-copy">
              <strong>{{ artifact.title }}</strong>
              <small>{{ getSkillArtifactTypeMeta(artifact).description }}</small>
            </span>
          </button>
        </nav>
        <section class="skill-artifact-source-pane" aria-label="技能文件原文">
          <article
            v-if="isMarkdownArtifact(activeArtifact)"
            class="artifact-document-page skill-artifact-document"
            v-html="renderArtifactDocumentPreview(activeArtifact)"
          ></article>
          <pre v-else class="skill-artifact-source"><code>{{ activeArtifact.content }}</code></pre>
        </section>
      </div>

      <div
        v-else
        class="artifact-preview-scroll"
        ref="artifactPreviewScrollRef"
      >
        <iframe
          v-if="activeArtifact.kind === 'html'"
          class="artifact-html-frame"
          title="HTML Artifact 预览"
          sandbox=""
          :srcdoc="activeArtifact.content"
        ></iframe>
        <pre v-else-if="activeArtifact.kind === 'code'" class="artifact-code-page"><code>{{ activeArtifact.content }}</code></pre>
        <article v-else class="artifact-document-page" v-html="renderArtifactDocumentPreview(activeArtifact)"></article>
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

    <div v-if="toastMessage" class="app-toast" role="status" aria-live="polite">
      <Check :size="16" />
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  --line: var(--border-color);
  --line-soft: var(--border-soft);
  --paper: var(--card-bg);
  --chat-top-surface: color-mix(in srgb, var(--bg-color) 96%, var(--card-bg));
  --preview-panel-width: 50%;
  --preview-panel-min: 420px;
  --chat-main-min: 420px;
  position: relative;
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
  flex: 1 1 auto;
  width: auto;
  min-width: var(--chat-main-min);
  border-right: 0;
}

.preview-resizer {
  position: relative;
  z-index: 12;
  flex: 0 0 12px;
  width: 12px;
  min-width: 12px;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
  background: #fff;
}

.preview-resizer::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 5px;
  width: 1px;
  background: var(--border-color);
}

.preview-resizer::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 4px;
  width: 3px;
  background: var(--primary-color);
  opacity: 0;
  transition: opacity 0.14s ease;
}

.preview-resizer:hover::after,
.chat-page.is-preview-resizing .preview-resizer::after {
  opacity: 0.5;
}

.chat-page.is-preview-resizing,
.chat-page.is-preview-resizing * {
  cursor: col-resize !important;
  user-select: none;
}

.chat-page.preview-split .chat-header {
  padding: 0 16px;
}

.chat-page.preview-split .header-meta h1 {
  font-size: 16px;
  line-height: 1.25;
}

.chat-header {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px 0 28px;
  border-bottom: 1px solid var(--line);
  background: var(--chat-top-surface);
}

.header-back-button {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: background-color 0.16s ease, color 0.16s ease;
}

.header-back-button:hover {
  color: var(--text-strong);
  background: var(--surface-soft);
}

.header-meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.header-meta h1 {
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 640;
  line-height: 1.22;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-meta p {
  margin: 3px 0 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action-button {
  min-width: 0;
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-soft) 86%, var(--card-bg));
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.header-action-button:hover:not(:disabled) {
  border-color: var(--border-color);
  background: var(--card-bg);
  color: var(--text-strong);
}

.header-action-button:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.58;
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

.composer-wrap :deep(.chat-input-shell),
.skill-intake-selector,
.ai-note {
  width: min(850px, 100%);
  margin-left: auto;
  margin-right: auto;
}

.chat-page.preview-split .composer-wrap :deep(.chat-input-shell),
.chat-page.preview-split .skill-intake-selector,
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

.skill-intake-selector {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--text-muted) 26%, var(--border-color));
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.045);
}

.skill-intake-selector-header {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px;
}

.skill-intake-selector-header h2 {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  white-space: normal;
}

.skill-intake-close {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.skill-intake-close:hover {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.skill-intake-options {
  display: grid;
  gap: 0;
}

.skill-intake-option {
  min-height: 40px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 9px;
  padding: 4px 9px 4px 7px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 84%, transparent);
  border-radius: 0;
  background: transparent;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.skill-intake-option.recommended {
  margin-bottom: 4px;
  border-bottom: 0;
  border-radius: 11px;
  background: color-mix(in srgb, var(--surface-soft) 82%, var(--card-bg));
}

.skill-intake-option:hover,
.skill-intake-option:focus-visible {
  background: var(--surface-soft);
}

.skill-intake-option:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

.skill-intake-option-index,
.skill-intake-other-icon {
  width: 27px;
  height: 27px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--surface-soft) 90%, var(--card-bg));
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.skill-intake-option.recommended .skill-intake-option-index {
  background: color-mix(in srgb, var(--text-muted) 9%, var(--card-bg));
  color: var(--text-strong);
}

.skill-intake-option-main {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.skill-intake-option-label {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-intake-option-desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.skill-intake-enter {
  justify-self: end;
  color: var(--text-muted);
}

.skill-material-selector {
  gap: 10px;
}

.skill-intake-material-title {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.skill-intake-material-title p {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.skill-intake-materials {
  display: grid;
  gap: 8px;
  padding: 0 2px;
}

.skill-intake-materials-header {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.skill-intake-materials-header strong {
  flex: 0 0 auto;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
}

.skill-intake-materials-header span {
  min-width: 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-intake-material-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.skill-intake-material {
  min-width: 0;
  min-height: 44px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface-soft) 45%, var(--card-bg));
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
}

.skill-intake-material:hover,
.skill-intake-material:focus-visible {
  border-color: color-mix(in srgb, var(--text-muted) 34%, transparent);
  background: var(--surface-soft);
}

.skill-intake-material:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.skill-intake-material-icon {
  width: 27px;
  height: 27px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: var(--text-muted);
  background: var(--card-bg);
}

.skill-intake-material-icon.template,
.skill-intake-material-icon.example-output {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.skill-intake-material-icon.knowledge-file,
.skill-intake-material-icon.team-rule {
  color: var(--diff-added);
  background: var(--diff-added-soft);
}

.skill-intake-material-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.skill-intake-material-copy strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-intake-material-copy small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-intake-material-action {
  color: var(--primary-color);
  font-weight: 600;
}

.skill-intake-selector-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
}

.skill-intake-other {
  min-width: 0;
  min-height: 32px;
  display: inline-grid;
  grid-template-columns: 28px minmax(0, max-content);
  align-items: center;
  justify-content: start;
  gap: 9px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.skill-intake-other:hover {
  color: var(--text-strong);
}

.skill-intake-other-form {
  min-width: 0;
  min-height: 32px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 9px;
}

.skill-intake-other-input {
  min-width: 0;
  height: 30px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--text-muted) 28%, transparent);
  border-radius: 9px;
  background: var(--card-bg);
  color: var(--text-main);
  font: inherit;
  font-size: 13px;
  outline: 0;
}

.skill-intake-other-input:focus {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 12%, transparent);
}

.skill-intake-other-input::placeholder {
  color: var(--text-muted);
}

.skill-intake-other-submit {
  width: 32px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: color-mix(in srgb, var(--text-muted) 16%, var(--surface-soft));
  color: var(--text-muted);
  cursor: pointer;
}

.skill-intake-other-submit:hover:not(:disabled),
.skill-intake-other-submit:focus-visible {
  background: color-mix(in srgb, var(--text-muted) 24%, var(--surface-soft));
  color: var(--text-strong);
}

.skill-intake-other-submit:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.skill-intake-other-submit:disabled {
  background: color-mix(in srgb, var(--text-muted) 12%, var(--surface-soft));
  color: var(--text-muted);
  cursor: not-allowed;
}

.skill-intake-skip {
  min-width: 58px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--text-muted) 34%, transparent);
  border-radius: 9px;
  background: var(--card-bg);
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.skill-intake-skip:hover {
  background: var(--surface-soft);
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
  overflow-x: hidden;
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

.chat-page.preview-split .live-answer-card .answer-content {
  padding-bottom: 0;
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
  background: var(--chat-top-surface);
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

.question-asset-chip {
  max-width: min(280px, 70vw);
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 4px;
  padding: 2px 9px 2px 4px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #ffffff;
  color: #111827;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  line-height: 1.2;
  vertical-align: middle;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  white-space: nowrap;
}

.question-asset-chip::before {
  content: attr(data-badge);
  flex-shrink: 0;
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
}

.question-asset-chip[data-badge="模板"]::before {
  background: #ece9e2;
  color: #4a4032;
  box-shadow: inset 0 0 0 1px rgba(74, 64, 50, 0.2);
}

.question-asset-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.app-toast {
  position: absolute;
  left: 50%;
  top: 18px;
  z-index: 1200;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100vw - 32px));
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--diff-added-border);
  border-radius: 10px;
  color: var(--diff-added);
  background: color-mix(in srgb, var(--diff-added-soft) 88%, var(--card-bg));
  box-shadow: 0 12px 30px rgba(22, 163, 74, 0.14);
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
  font-size: 14px;
  font-weight: 650;
}

.app-toast svg {
  flex-shrink: 0;
  color: var(--diff-added);
}

.answer-card {
  width: min(850px, 100%);
  min-width: 0;
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
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 4px 32px 22px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.86;
}

.live-answer-card .answer-content {
  padding-bottom: 0;
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
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  padding: 4px 0 0;
  font-family: inherit;
  overflow-wrap: anywhere;
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

.live-thinking-card,
.skill-validation-card,
.skill-completion-card {
  width: 100%;
  margin: 0 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
}

.live-thinking-card {
  min-width: 0;
  max-width: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  overflow-x: hidden;
  overflow-wrap: anywhere;
}

.live-answer-text + .live-thinking-card {
  margin-top: 12px;
}

.live-thinking-header {
  width: auto;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: default;
}

.live-thinking-header.can-toggle {
  cursor: pointer;
}

.live-thinking-header:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary-color) 55%, transparent);
  outline-offset: 3px;
}

.live-thinking-copy {
  min-width: 0;
  display: inline-flex;
  align-items: center;
}

.live-thinking-shine,
.live-status-shine {
  display: inline-block;
  background: linear-gradient(110deg, #9ca3af 0%, #9ca3af 35%, #ffffff 50%, #9ca3af 75%, #9ca3af 100%);
  background-size: 200% 100%;
  background-position: 200% 0;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.45;
  animation: thinking-shine 2s linear infinite;
}

.live-thinking-card:not(.streaming) .live-thinking-shine {
  background: none;
  color: var(--text-muted);
  -webkit-text-fill-color: currentColor;
  animation: none;
}

.live-thinking-chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 0.18s ease;
}

.live-thinking-card.expanded .live-thinking-chevron {
  transform: rotate(180deg);
}

.live-thinking-body {
  box-sizing: border-box;
  max-width: 100%;
  margin: 6px 0 12px;
  padding: 2px 0 2px 12px;
  border-left: 2px solid #d1d5db;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
  overflow-x: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.live-generation-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  margin: 2px 0 12px;
  color: var(--text-secondary);
}

.live-generation-status svg {
  flex-shrink: 0;
  color: var(--primary-color);
}

.skill-validation-inline {
  display: grid;
  gap: 8px;
  margin: 4px 0 16px;
  color: var(--text-secondary);
}

.skill-validation-copy {
  display: grid;
  gap: 2px;
}

.skill-validation-copy span {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.skill-validation-bar {
  position: relative;
  width: min(360px, 100%);
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-soft) 72%, var(--border-soft));
}

.skill-validation-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 38%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--primary-color) 82%, #ffffff),
    transparent
  );
  animation: validation-bar-sweep 1.25s ease-in-out infinite;
}

.live-thinking-body :deep(.live-answer-paragraph) {
  margin: 0 0 10px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.live-thinking-body :deep(.live-answer-code) {
  display: inline;
  max-width: 100%;
  margin: 0 2px;
  padding: 0 5px;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.94em;
  font-weight: 600;
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.live-thinking-body :deep(.live-answer-codeblock) {
  position: relative;
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  margin: 0 0 12px;
  padding: 12px 14px;
  overflow-x: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.live-thinking-body :deep(.live-answer-codeblock > span) {
  display: block;
  margin: 0 0 8px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
}

.live-thinking-body :deep(.live-answer-codeblock code) {
  display: block;
  max-width: 100%;
  font-family: inherit;
  white-space: inherit;
  overflow-wrap: inherit;
  word-break: inherit;
}

.live-thinking-body :deep(.live-answer-table-wrap) {
  width: 100%;
  margin: 0 0 12px;
  overflow-x: hidden;
}

.live-thinking-body :deep(.live-answer-table) {
  min-width: 0;
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.live-thinking-body :deep(.live-answer-table th),
.live-thinking-body :deep(.live-answer-table td) {
  overflow-wrap: anywhere;
  word-break: break-word;
}

@keyframes thinking-shine {
  100% {
    background-position: -200% 0;
  }
}

@keyframes validation-bar-sweep {
  0% {
    transform: translateX(-110%);
  }

  100% {
    transform: translateX(270%);
  }
}

.skill-completion-card {
  min-height: 66px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
}

.skill-validation-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--primary-soft);
  border-top-color: var(--primary-color);
  border-radius: 999px;
  animation: skill-spin 0.9s linear infinite;
}

.skill-validation-card div,
.skill-completion-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-validation-card strong,
.skill-completion-copy strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 850;
}

.skill-validation-card span,
.skill-completion-copy span {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.skill-completion-card {
  position: relative;
  min-height: 236px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  overflow: hidden;
  padding: 10px 12px 12px;
  border-color: color-mix(in srgb, var(--primary-color) 22%, var(--border-color));
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--card-bg) 96%, var(--primary-soft)) 0%,
    var(--card-bg) 100%
  );
  box-shadow:
    0 16px 34px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 7%, transparent);
}

.skill-completion-banner {
  position: relative;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 15px;
  overflow: hidden;
  padding: 0 20px;
  border-radius: 10px;
  color: var(--on-primary);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary-color) 72%, #041e33) 0%,
      var(--primary-hover) 48%,
      var(--primary-color) 100%
    );
  font-size: 20px;
  font-weight: 850;
  line-height: 1;
}

.skill-completion-banner::before {
  content: '';
  position: absolute;
  top: -32px;
  right: 30%;
  width: 78px;
  height: 124px;
  border-left: 2px solid color-mix(in srgb, var(--on-primary) 42%, transparent);
  border-right: 2px solid color-mix(in srgb, var(--on-primary) 12%, transparent);
  background: color-mix(in srgb, var(--on-primary) 5%, transparent);
  transform: skewX(-28deg);
}

.skill-completion-banner::after {
  content: '';
  position: absolute;
  inset: 0 0 0 58%;
  background:
    repeating-linear-gradient(
      112deg,
      color-mix(in srgb, var(--on-primary) 20%, transparent) 0 1px,
      transparent 1px 9px
    );
  opacity: 0.55;
}

.skill-completion-banner > span {
  position: relative;
  z-index: 1;
}

.skill-completion-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  border-radius: 999px;
  color: var(--on-primary);
  background: transparent;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--on-primary) 18%, transparent),
    0 0 0 7px color-mix(in srgb, var(--on-primary) 5%, transparent);
}

.skill-completion-body {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 112px;
  padding: 15px 18px 15px 34px;
}

.skill-completion-body::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 24px;
  bottom: 24px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    var(--primary-color) 0%,
    color-mix(in srgb, var(--primary-color) 82%, var(--focus-ring)) 100%
  );
}

.skill-completion-copy {
  gap: 9px;
}

.skill-completion-copy strong {
  color: var(--text-strong);
  font-size: clamp(23px, 3.5vw, 30px);
  font-weight: 900;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.skill-completion-copy code {
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  min-height: 31px;
  overflow: hidden;
  padding: 0 13px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 9%, var(--primary-soft-strong));
  border-radius: 8px;
  color: var(--primary-hover);
  background: color-mix(in srgb, var(--primary-soft) 76%, var(--card-bg));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 15px;
  font-weight: 850;
  line-height: 1.25;
  text-overflow: ellipsis;
}

.skill-completion-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: auto;
  padding: 13px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--primary-color) 12%, var(--border-color));
}

.skill-completion-cta,
.skill-completion-secondary {
  min-width: 124px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 850;
  white-space: nowrap;
}

.skill-completion-secondary {
  border: 1px solid color-mix(in srgb, var(--primary-color) 54%, var(--border-color));
  color: var(--primary-color);
  background: var(--card-bg);
}

.skill-completion-secondary:hover {
  background: color-mix(in srgb, var(--primary-soft) 70%, var(--card-bg));
}

.skill-completion-cta {
  color: var(--on-primary);
  background: var(--primary-color);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.skill-completion-cta:hover {
  background: var(--primary-hover);
}

.skill-completion-ending {
  margin: 0 0 16px;
  color: var(--text-main);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.86;
}

@keyframes skill-spin {
  to {
    transform: rotate(360deg);
  }
}

.live-answer-text {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: var(--text-main);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.86;
}

.live-answer-text :deep(*:first-child) {
  margin-top: 0;
}

.live-answer-text :deep(*:last-child) {
  margin-bottom: 0;
}

.live-answer-text :deep(.live-answer-heading) {
  margin: 16px 0 8px;
  color: var(--text-strong);
  font-weight: 750;
  line-height: 1.55;
}

.live-answer-text :deep(.live-answer-heading.level-1) {
  font-size: 20px;
}

.live-answer-text :deep(.live-answer-heading.level-2) {
  font-size: 17.5px;
}

.live-answer-text :deep(.live-answer-heading.level-3),
.live-answer-text :deep(.live-answer-heading.level-4) {
  font-size: 15.5px;
}

.live-answer-text :deep(.live-answer-paragraph) {
  margin: 0 0 10px;
  color: var(--text-main);
  font: inherit;
}

.live-answer-text :deep(.live-answer-list) {
  margin: 0 0 12px;
  padding-left: 1.35em;
  color: var(--text-main);
}

.live-answer-text :deep(.live-answer-list li) {
  margin: 0 0 6px;
  padding-left: 2px;
  line-height: 1.86;
}

.live-answer-text :deep(.live-answer-list li:last-child) {
  margin-bottom: 0;
}

.live-answer-text :deep(.live-answer-strong) {
  color: var(--text-strong);
  font-weight: 750;
}

.live-answer-text :deep(.live-answer-code) {
  display: inline;
  max-width: 100%;
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
  overflow-wrap: anywhere;
  word-break: break-word;
}

.live-answer-text :deep(.live-answer-link) {
  color: var(--primary-color);
  font-weight: 650;
  text-decoration: none;
}

.live-answer-text :deep(.live-answer-link:hover) {
  text-decoration: underline;
}

.live-answer-text :deep(.live-source-token) {
  color: var(--text-muted);
  font-size: 0.9em;
}

.live-answer-text :deep(.live-answer-codeblock) {
  position: relative;
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  margin: 0 0 12px;
  padding: 14px 16px;
  overflow-x: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.live-answer-text :deep(.live-answer-codeblock > span) {
  display: block;
  margin: 0 0 8px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
}

.live-answer-text :deep(.live-answer-codeblock code) {
  display: block;
  max-width: 100%;
  font-family: inherit;
  white-space: inherit;
  overflow-wrap: inherit;
  word-break: inherit;
}

.live-answer-text :deep(.live-answer-table-wrap) {
  width: 100%;
  margin: 0 0 14px;
  overflow-x: hidden;
}

.live-answer-text :deep(.live-answer-table) {
  min-width: 0;
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.65;
}

.live-answer-text :deep(.live-answer-table th),
.live-answer-text :deep(.live-answer-table td) {
  padding: 9px 10px;
  border: 1px solid var(--border-color);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.live-answer-text :deep(.live-answer-table th) {
  background: var(--surface-soft);
  color: var(--text-strong);
  font-weight: 750;
}

.live-answer-text :deep(.live-answer-quote) {
  margin: 0 0 12px;
  padding: 8px 0 8px 14px;
  border-left: 3px solid var(--primary-color);
  color: var(--text-secondary);
}

.live-answer-text :deep(.live-selection-notice) {
  display: inline-flex;
  max-width: 100%;
  margin: 0 0 8px;
  padding: 2px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  line-height: inherit;
}

.live-answer-text :deep(.live-selection-notice .live-answer-strong) {
  color: var(--sidebar-active-text);
  font-weight: 650;
}

.live-answer-text :deep(.live-selection-question) {
  color: var(--text-main);
  font-weight: 650;
}

.live-answer-text :deep(.live-selection-action) {
  color: var(--text-main);
  font-weight: 400;
}

.live-answer-text :deep(.live-selection-choice) {
  color: var(--sidebar-active-text);
  font-weight: 650;
}

.live-answer-text :deep(.live-answer-rule) {
  width: 100%;
  height: 1px;
  margin: 16px 0;
  border: 0;
  background: var(--border-color);
}

.live-answer-text :deep(.live-answer-collapse),
.artifact-document-page :deep(.live-answer-collapse) {
  margin: 12px 0 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
}

.live-answer-text :deep(.live-answer-collapse summary),
.artifact-document-page :deep(.live-answer-collapse summary) {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 13px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.live-answer-text :deep(.live-answer-collapse-body),
.artifact-document-page :deep(.live-answer-collapse-body) {
  padding: 0 13px 13px;
}

.artifact-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 4px;
}

.artifact-card,
.live-answer-text :deep(.artifact-card) {
  width: 100%;
  min-height: 68px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  text-align: left;
  color: var(--text-main);
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.artifact-card:hover,
.artifact-card.active,
.live-answer-text :deep(.artifact-card:hover),
.live-answer-text :deep(.artifact-card.active) {
  border-color: var(--primary-border);
  background: color-mix(in srgb, var(--primary-soft) 34%, var(--card-bg));
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}

.artifact-file-icon,
.live-answer-text :deep(.artifact-file-icon) {
  position: relative;
  width: 40px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--primary-color) 22%, var(--border-color));
  border-radius: 8px;
  color: var(--primary-color);
  background: linear-gradient(180deg, var(--card-bg), var(--primary-soft));
  box-shadow: inset 0 -12px 0 color-mix(in srgb, var(--primary-color) 8%, transparent);
}

.artifact-file-icon::after,
.live-answer-text :deep(.artifact-file-icon::after) {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 13px;
  height: 13px;
  border-left: 1px solid color-mix(in srgb, var(--primary-color) 22%, var(--border-color));
  border-bottom: 1px solid color-mix(in srgb, var(--primary-color) 22%, var(--border-color));
  border-radius: 0 8px 0 4px;
  background: color-mix(in srgb, var(--card-bg) 82%, var(--primary-soft));
}

.artifact-file-icon span,
.live-answer-text :deep(.artifact-file-icon span) {
  max-width: 34px;
  color: currentColor;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  letter-spacing: 0;
  transform: translateY(3px);
}

.artifact-file-icon.format-json,
.live-answer-text :deep(.artifact-file-icon.format-json) {
  color: #0f766e;
  border-color: #99f6e4;
  background: linear-gradient(180deg, #ffffff, #ecfdf5);
}

.artifact-file-icon.format-yaml,
.live-answer-text :deep(.artifact-file-icon.format-yaml) {
  color: #a16207;
  border-color: #fde68a;
  background: linear-gradient(180deg, #ffffff, #fffbeb);
}

.artifact-file-icon.format-code,
.live-answer-text :deep(.artifact-file-icon.format-code) {
  color: #7c3aed;
  border-color: #ddd6fe;
  background: linear-gradient(180deg, #ffffff, #f5f3ff);
}

.artifact-file-icon.format-html,
.live-answer-text :deep(.artifact-file-icon.format-html) {
  color: #c2410c;
  border-color: #fed7aa;
  background: linear-gradient(180deg, #ffffff, #fff7ed);
}

.artifact-file-icon.format-doc,
.live-answer-text :deep(.artifact-file-icon.format-doc) {
  color: #1d4ed8;
  border-color: #bfdbfe;
  background: linear-gradient(180deg, #ffffff, #eff6ff);
}

.artifact-card-main,
.live-answer-text :deep(.artifact-card-main) {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.artifact-card-main strong,
.live-answer-text :deep(.artifact-card-main strong) {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 850;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-card-main span,
.live-answer-text :deep(.artifact-card-main span) {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-card-kind,
.live-answer-text :deep(.artifact-card-kind) {
  height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.live-answer-text :deep(.inline-artifact-card) {
  margin: 10px 0 14px;
}

.live-answer-text :deep(.skill-package-card) {
  width: min(560px, 100%);
  min-height: 78px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin: 12px 0 16px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.live-answer-text :deep(.skill-package-card:hover),
.live-answer-text :deep(.skill-package-card:focus-visible) {
  border-color: color-mix(in srgb, var(--text-muted) 26%, var(--border-color));
  background: color-mix(in srgb, var(--surface-soft) 36%, var(--card-bg));
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
}

.live-answer-text :deep(.skill-package-card:focus-visible) {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.live-answer-text :deep(.skill-package-icon) {
  width: 44px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-soft) 54%, var(--card-bg));
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0;
}

.live-answer-text :deep(.skill-package-main) {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.live-answer-text :deep(.skill-package-main strong) {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14.5px;
  font-weight: 750;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-answer-text :deep(.skill-package-main small) {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-answer-text :deep(.skill-package-actions) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.live-answer-text :deep(.skill-package-action) {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 750;
  line-height: 1;
  cursor: pointer;
}

.live-answer-text :deep(.skill-package-action:hover),
.live-answer-text :deep(.skill-package-action:focus-visible) {
  border-color: color-mix(in srgb, var(--text-muted) 30%, var(--border-color));
  color: var(--text-main);
  background: color-mix(in srgb, var(--surface-soft) 52%, var(--card-bg));
}

.live-answer-text :deep(.skill-package-action.primary) {
  border-color: var(--border-color);
  color: var(--text-main);
  background: var(--card-bg);
}

.live-answer-text :deep(.skill-package-action:focus-visible) {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
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

.live-answer-card .answer-actions {
  margin-top: 6px;
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

.docx-preview-panel,
.artifact-preview-panel {
  flex: 0 0 var(--preview-panel-width);
  width: var(--preview-panel-width);
  min-width: var(--preview-panel-min);
  max-width: calc(100% - var(--chat-main-min) - 12px);
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 0;
  background: var(--bg-color);
}

.artifact-preview-panel {
  background: #fff;
}

.docx-preview-header,
.artifact-preview-header {
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

.artifact-preview-header {
  background: #fff;
}

.docx-preview-title,
.artifact-preview-title {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.docx-preview-icon,
.artifact-preview-icon {
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

.docx-preview-title div,
.artifact-preview-title div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.docx-preview-title strong,
.artifact-preview-title strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 850;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docx-preview-title span,
.artifact-preview-title span {
  color: var(--text-secondary);
  font-size: 12px;
}

.docx-preview-header > button,
.artifact-preview-close {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
}

.docx-preview-header > button:hover,
.artifact-preview-close:hover {
  color: var(--text-secondary);
  background: var(--surface-soft);
}

.artifact-preview-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.artifact-preview-tabs {
  flex-shrink: 0;
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--card-bg);
}

.artifact-preview-tabs button {
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.artifact-preview-tabs button:hover,
.artifact-preview-tabs button.active {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.artifact-preview-action {
  min-width: 0;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--card-bg);
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.artifact-preview-action:hover {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.artifact-preview-action.primary {
  border-color: var(--primary-color);
  color: #fff;
  background: var(--primary-color);
}

.artifact-preview-action.primary:hover {
  color: #fff;
  background: color-mix(in srgb, var(--primary-color) 88%, #000);
}

.artifact-preview-action:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.docx-preview-scroll,
.artifact-preview-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.docx-preview-scroll {
  padding: 22px;
}

.artifact-preview-scroll {
  padding: 30px 38px;
}

.skill-artifact-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(168px, 31%) minmax(0, 1fr);
  overflow: hidden;
}

.skill-artifact-tree {
  min-width: 0;
  overflow-y: auto;
  padding: 14px 10px;
  border-right: 1px solid var(--border-color);
  background: #fff;
}

.skill-artifact-tree-item {
  width: 100%;
  min-height: 44px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-main);
  text-align: left;
}

.skill-artifact-tree-item:hover {
  background: #fff;
}

.skill-artifact-tree-item.active {
  border-color: var(--primary-border);
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}

.skill-tree-file-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #fff;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 850;
  line-height: 1;
}

.skill-tree-file-icon.main {
  color: var(--primary-color);
  background: #fff;
}

.skill-tree-file-icon.rule {
  color: var(--diff-added);
  background: #fff;
}

.skill-tree-file-icon.template {
  color: var(--primary-color);
  background: #fff;
}

.skill-tree-file-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.skill-tree-file-copy strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-tree-file-copy small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-artifact-source-pane {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #fff;
}

.skill-artifact-source {
  box-sizing: border-box;
  max-width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 22px 24px;
  color: var(--text-main);
  background: #fff;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.62;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.skill-artifact-source-pane .skill-artifact-document {
  box-sizing: border-box;
  min-height: 100%;
  padding: 28px 36px 36px;
  background: #fff;
}

.artifact-preview-scroll.is-editing {
  overflow: hidden;
  padding: 0;
}

.artifact-preview-scroll.is-publish-settings {
  padding: 0;
  background: var(--card-bg);
}

.skill-publish-panel {
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px 0;
}

.publish-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-soft);
}

.publish-identity-section {
  gap: 16px;
}

.publish-icon-field {
  display: flex;
  align-items: center;
  gap: 14px;
}

.publish-icon-preview {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--primary-border);
  border-radius: 12px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 24px;
  font-weight: 900;
}

.publish-icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publish-icon-actions {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.publish-icon-input {
  display: none;
}

.publish-small-action,
.publish-draft-btn,
.publish-primary-btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.publish-small-action {
  padding: 0 10px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--card-bg);
}

.publish-small-action:hover {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.publish-small-action.muted {
  color: var(--text-muted);
}

.publish-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.publish-field span,
.publish-section-header strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 850;
}

.publish-field input,
.publish-field textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  font-size: 14px;
  line-height: 1.55;
}

.publish-field input {
  height: 38px;
  padding: 0 11px;
}

.publish-field textarea {
  min-height: 92px;
  padding: 9px 11px;
  resize: vertical;
}

.publish-field input:focus,
.publish-field textarea:focus {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.publish-field.compact {
  margin-left: 0;
}

.publish-section-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.publish-section-header span,
.publish-scope-option small,
.publish-toggle small,
.publish-footer-summary span {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.publish-scope-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.publish-scope-option {
  min-height: 104px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-main);
  background: var(--card-bg);
  text-align: left;
}

.publish-scope-option:hover,
.publish-scope-option.active {
  border-color: var(--primary-border);
  background: color-mix(in srgb, var(--primary-soft) 40%, var(--card-bg));
}

.publish-scope-check {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: #fff;
  background: var(--card-bg);
}

.publish-scope-option.active .publish-scope-check {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.publish-scope-option > span:last-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.publish-scope-option strong,
.publish-toggle strong,
.publish-footer-summary strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 850;
  line-height: 1.35;
}

.publish-toggle {
  min-height: 56px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 11px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--surface-muted);
}

.publish-toggle.disabled {
  opacity: 0.58;
}

.publish-toggle > span {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.publish-toggle input {
  width: 38px;
  height: 22px;
  position: relative;
  appearance: none;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--border-color);
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.publish-toggle input::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  transition: transform 0.16s ease;
}

.publish-toggle input:checked {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.publish-toggle input:checked::after {
  transform: translateX(16px);
}

.publish-toggle input:disabled {
  cursor: not-allowed;
}

.publish-footer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding: 14px 0 16px;
  border-top: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--card-bg) 94%, transparent);
  backdrop-filter: blur(10px);
}

.publish-footer-summary {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.publish-footer-summary span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.publish-draft-btn {
  padding: 0 13px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--card-bg);
}

.publish-primary-btn {
  padding: 0 16px;
  color: #fff;
  background: var(--primary-color);
}

.publish-draft-btn:hover:not(:disabled) {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.publish-primary-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary-color) 88%, #000);
}

.publish-draft-btn:disabled,
.publish-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.artifact-document-page,
.artifact-code-page,
.artifact-html-frame {
  width: 100%;
  min-height: calc(100vh - 104px);
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.artifact-document-page {
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 0 0 28px;
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.9;
}

.artifact-document-page :deep(*:first-child) {
  margin-top: 0;
}

.artifact-document-page :deep(*:last-child) {
  margin-bottom: 0;
}

.artifact-document-page :deep(.live-answer-heading) {
  margin: 18px 0 10px;
  color: var(--text-strong);
  font-weight: 850;
  line-height: 1.35;
}

.artifact-document-page :deep(.live-answer-heading.level-1) {
  font-size: 22px;
}

.artifact-document-page :deep(.live-answer-heading.level-2) {
  font-size: 18px;
}

.artifact-document-page :deep(.live-answer-heading.level-3),
.artifact-document-page :deep(.live-answer-heading.level-4) {
  font-size: 16px;
}

.artifact-document-page :deep(.live-answer-paragraph) {
  margin: 0 0 12px;
  color: var(--text-main);
}

.artifact-document-page :deep(.live-answer-list) {
  margin: 0 0 14px;
  padding-left: 22px;
}

.artifact-document-page :deep(.live-answer-list li) {
  margin: 0 0 7px;
}

.artifact-document-page :deep(.live-answer-strong) {
  color: var(--text-strong);
  font-weight: 750;
}

.artifact-document-page :deep(.live-answer-code) {
  display: inline;
  max-width: 100%;
  align-items: center;
  min-height: 22px;
  margin: 0 2px;
  padding: 0 6px;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.94em;
  font-weight: 600;
  line-height: 20px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.artifact-document-page :deep(.live-answer-link) {
  color: var(--primary-color);
  font-weight: 650;
  text-decoration: none;
}

.artifact-document-page :deep(.live-answer-codeblock) {
  position: relative;
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
  margin: 0 0 14px;
  padding: 14px 16px;
  overflow-x: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.artifact-document-page :deep(.live-answer-codeblock > span) {
  display: block;
  margin: 0 0 8px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
}

.artifact-document-page :deep(.live-answer-table-wrap) {
  width: 100%;
  margin: 0 0 14px;
  overflow-x: hidden;
}

.artifact-document-page :deep(.live-answer-table) {
  min-width: 0;
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.55;
}

.artifact-document-page :deep(.live-answer-table th),
.artifact-document-page :deep(.live-answer-table td) {
  padding: 8px 9px;
  border: 1px solid var(--border-color);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.artifact-document-page :deep(.live-answer-table th) {
  background: var(--surface-soft);
  color: var(--text-strong);
  font-weight: 750;
}

.artifact-document-page :deep(.live-answer-quote) {
  margin: 0 0 12px;
  padding: 8px 0 8px 14px;
  border-left: 3px solid var(--primary-color);
  color: var(--text-secondary);
}

.artifact-document-page :deep(.live-answer-rule) {
  width: 100%;
  height: 1px;
  margin: 16px 0;
  border: 0;
  background: var(--border-color);
}

.artifact-code-page {
  box-sizing: border-box;
  max-width: 100%;
  margin: 0;
  padding: 0 0 28px;
  overflow-x: hidden;
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.72;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.artifact-code-page code {
  display: block;
  max-width: 100%;
  font-family: inherit;
  white-space: inherit;
  overflow-wrap: inherit;
  word-break: inherit;
}

.artifact-html-frame {
  display: block;
  background: white;
}

.artifact-editor {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 60px);
  padding: 24px 28px;
  border: 0;
  outline: 0;
  resize: none;
  color: var(--text-main);
  background: var(--card-bg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.72;
}

.artifact-editor:focus {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--primary-color) 36%, transparent);
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

  .preview-resizer {
    display: none;
  }

  .source-drawer,
  .docx-preview-panel,
  .artifact-preview-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 64px;
    z-index: 40;
    width: auto;
    min-width: 0;
    max-width: none;
    height: 100%;
  }

  .docx-preview-scroll {
    padding: 14px;
  }

  .artifact-preview-scroll {
    padding: 22px;
  }

  .artifact-preview-scroll.is-publish-settings {
    padding: 0;
  }

  .skill-completion-card {
    min-height: 218px;
    padding: 10px 11px 12px;
  }

  .skill-completion-banner {
    min-height: 52px;
    padding: 0 18px;
    font-size: 18px;
  }

  .skill-completion-body {
    min-height: 104px;
    padding: 16px 14px 16px 30px;
  }

  .skill-completion-body::before {
    left: 8px;
  }

  .skill-completion-actions {
    gap: 9px;
  }

  .skill-completion-cta,
  .skill-completion-secondary {
    flex: 1 1 150px;
    min-width: 0;
    height: 38px;
    font-size: 15px;
  }

  .artifact-preview-header {
    flex-wrap: wrap;
    height: auto;
    min-height: 60px;
    padding: 10px 14px;
  }

  .artifact-preview-tabs {
    order: 3;
    width: 100%;
  }

  .artifact-preview-tabs button {
    flex: 1;
  }

  .publish-scope-list {
    grid-template-columns: 1fr;
  }

  .publish-footer {
    grid-template-columns: 1fr;
  }

  .publish-footer-actions {
    justify-content: flex-end;
  }

  .artifact-preview-scroll.is-editing {
    padding: 0;
  }

  .docx-preview-page,
  .artifact-document-page,
  .artifact-code-page,
  .artifact-html-frame {
    min-height: calc(100vh - 88px);
  }

  .docx-preview-page {
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
    gap: 8px;
    padding: 0 10px;
  }

  .header-back-button {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
  }

  .header-meta h1 {
    font-size: 15px;
  }

  .header-meta p {
    font-size: 11px;
  }

  .header-actions {
    gap: 6px;
  }

  .header-action-button {
    width: 34px;
    padding: 0;
    justify-content: center;
  }

  .header-action-button svg {
    flex-shrink: 0;
  }

  .header-action-button {
    font-size: 0;
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
