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
  MessageCircle,
  MessageSquareText,
  Mic,
  Pencil,
  Plus,
  Puzzle,
  Scale,
  Send,
  Share2,
  Trash2,
  Upload,
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
import { getSkillByNameOrId, markSkillUsed, persistCustomSkillNow, upsertCustomSkill, type SkillCatalogItem } from '../data/skillCatalog';
import { docxLegalResearchMock } from '../data/docxLegalResearchMock';
import { streamSkillWithSkillCreator, type SkillCreatorAnswers } from '../services/skillCreator';
import { generateDeepSeekConversationTitle, streamDeepSeekMessage } from '../services/deepseekChat';
import { useChatHistory } from '../stores/chatHistory';

type SearchMode = {
  id: string;
  label: string;
  icon: Component;
};

type PromptPart = {
  type: 'text' | 'skill' | 'template' | 'asset';
  value: string;
  assetKind?: 'template' | 'knowledge-file' | 'local-file';
  sourceLabel?: string;
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
const answerScrollRef = ref<HTMLElement | null>(null);
const artifactPreviewScrollRef = ref<HTMLElement | null>(null);
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
const pendingAutoScrollTargets = new Set<'answer' | 'artifact'>();
const selectedDialogMode = ref('research');
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));
const templateCreatorPrompt = '请使用 /template-creator 帮我创建一个可复用的写作模板，我的需求/源文件如下：';
const skillCreatorPrompt = '请使用 /skill-creator 帮我创建一个可复用的技能，我的需求如下：';
const createSkillPrompt = (skillName: string) =>
  `请使用 /${skillName} 帮我完成以下任务，我的需求如下：`;
const createTemplatePrompt = (template: TemplateAsset) =>
  `请使用 模板：${template.name} 帮我按照这个模板完成写作，我的需求/源文件如下：`;

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

const formatSkillCreatorDisplayContent = (content: string): string => {
  let text = normalizeGeneratedArtifactBoundaries(content.replace(/\r\n/g, '\n'));
  const trimmed = text.trimStart().toLowerCase();

  if (!text.match(/<generation_markdown>/i) && '<generation_markdown>'.startsWith(trimmed)) {
    return '';
  }

  const generationStart = text.search(/<generation_markdown>/i);
  if (generationStart >= 0) {
    text = text.slice(generationStart).replace(/^<generation_markdown>/i, '');
  }

  text = text
    .replace(/<\/generation_markdown>/ig, '')
    .replace(/\n*##\s*4\.\s*待系统解析[\s\S]*?(?=<skill_json>|$)/i, '');

  const partialGenerationEnd = text.match(/\s*<\/[^>\n]*$/i);
  if (partialGenerationEnd && '</generation_markdown>'.startsWith(partialGenerationEnd[0].trim().toLowerCase())) {
    text = text.slice(0, partialGenerationEnd.index);
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

  const partialSkillJsonStart = text.match(/\s*<[^>\n]*$/i);
  if (partialSkillJsonStart && '<skill_json>'.startsWith(partialSkillJsonStart[0].trim().toLowerCase())) {
    text = text.slice(0, partialSkillJsonStart.index);
  }

  return hideSkillCreatorArtifactList(text.trimStart());
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
    const stopMatch = trailingContent.match(/\n(?=<\/generation_markdown>|<skill_json>|技能创建完成[:：]|系统创建完成[:：]|系统保存流程[:：]|系统保存结果[:：]|文件结构[:：]|可在「技能|##\s*系统解析)/i);
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
    const artifactContent = artifactBody.replace(closingFencePattern, '').replace(/\s+$/, '');

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
      const artifact: ChatArtifact = {
        id: createArtifactId(title),
        title,
        kind: getArtifactKind(title, language),
        language,
        content: section.content,
        summary: section.content ? getArtifactSummary(section.content) : '正在生成文件内容...',
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
    const artifactContent = (match[2] || '').trim();
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
      html.push(`<blockquote class="live-answer-quote">${renderInlineMarkdown(quoteLines.join('\n')).replace(/\n/g, '<br>')}</blockquote>`);
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
    ? unwrapWholeMarkdownFence(artifact.content)
    : artifact.content;

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

const renderCreatedSkillAnswer = (skill: SkillCatalogItem) => [
  `技能草稿已生成：${skill.name}`,
  `当前发布范围：${skill.scope === 'team' ? '本团队' : '仅自己'}。可在右侧「发布设置」中修改名称、图标、描述和复制权限；输入 \`/${skill.id}\` 即可调用。`,
  `技能 ID：${skill.id}`,
].join('\n');

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

const isResearchMode = computed(() => selectedDialogMode.value === 'research');
const hasComposerContent = computed(() => inputValue.value.length > 0 || Boolean(selectedTemplate.value));
const reportMock = docxLegalResearchMock;
const isLiveConversation = computed(() =>
  isGeneratingAnswer.value
  || Boolean(generatedAnswer.value)
  || Boolean(answerError.value)
  || Boolean(answerNotice.value)
);
const isSkillCreatorConversation = computed(() => /\/skill-creator\b/i.test(completedQuestion.value));
const renderableAnswerContent = computed(() =>
  isSkillCreatorConversation.value
    ? formatSkillCreatorDisplayContent(generatedAnswer.value)
    : generatedAnswer.value
);
const generatedArtifacts = computed(() => {
  if (!isLiveConversation.value) return [];

  return extractArtifactsFromAnswer(renderableAnswerContent.value, {
    generatedOnly: isSkillCreatorConversation.value,
  });
});
const liveAnswerHtml = computed(() =>
  renderLiveAnswerMarkdown(
    renderableAnswerContent.value,
    isSkillCreatorConversation.value ? generatedArtifacts.value : [],
  ),
);
const hasLiveThinking = computed(() =>
  isSkillCreatorConversation.value
  && (isLiveConversation.value || Boolean(liveThinkingContent.value.trim()))
);
const isLiveThinkingStreaming = computed(() =>
  isSkillCreatorConversation.value
  && isGeneratingAnswer.value
  && !generatedAnswer.value.trim()
  && skillValidationStatus.value === 'idle'
);
const canToggleLiveThinking = computed(() =>
  hasLiveThinking.value && !isLiveThinkingStreaming.value
);
const shouldShowLiveThinkingBody = computed(() =>
  isLiveThinkingStreaming.value || (canToggleLiveThinking.value && isLiveThinkingExpanded.value)
);
const shouldShowSkillGenerationStatus = computed(() =>
  isSkillCreatorConversation.value
  && isGeneratingAnswer.value
  && Boolean(generatedAnswer.value.trim())
  && skillValidationStatus.value === 'idle'
);
const liveThinkingLabel = computed(() =>
  isLiveThinkingStreaming.value ? '正在思考' : '思考过程'
);
const liveThinkingHint = computed(() => {
  if (isLiveThinkingStreaming.value) return '正在思考';
  if (isLiveThinkingExpanded.value) return '收起思考过程';
  if (liveThinkingContent.value.trim()) return '点击展开查看完整思考内容';
  return isGeneratingAnswer.value ? '点击展开查看流式思考内容' : '本次历史暂未保存思考内容';
});
const liveThinkingBodyHtml = computed(() =>
  renderLiveAnswerMarkdown(
    liveThinkingContent.value.trim()
      ? liveThinkingContent.value
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
      ? getSkillByNameOrId(activeCreatedSkillId.value || createdSkillIdFromAnswer.value)
      : null
  )
);
const canShowSkillPublishSettings = computed(() =>
  isSkillCreatorConversation.value && Boolean(skillCompletionSkill.value)
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
  isSkillCreatorConversation.value && skillValidationStatus.value === 'checking'
);
const shouldShowSkillCompletion = computed(() =>
  isSkillCreatorConversation.value
  && skillValidationStatus.value === 'complete'
  && Boolean(skillCompletionSkill.value)
);
const activeArtifact = computed(() =>
  generatedArtifacts.value.find((artifact) => artifact.id === activeArtifactId.value)
    ?? generatedArtifacts.value[0]
    ?? null
);
const hasPreviewPanel = computed(() => isDocxPreviewOpen.value || (isArtifactPreviewOpen.value && Boolean(activeArtifact.value)));
const shouldShowAnswerActions = computed(() =>
  !isGeneratingAnswer.value
  && (Boolean(generatedAnswer.value) || Boolean(answerError.value) || Boolean(answerNotice.value) || !isLiveConversation.value)
);

const activeHistoryItem = computed(() => findHistoryItem(activeHistoryId.value, completedQuestion.value));
const liveHeaderTitle = computed(() => activeHistoryItem.value?.title || '新会话');
const headerTitle = computed(() => {
  if (!hasCompletedMock.value) return '新提问';
  return isLiveConversation.value ? liveHeaderTitle.value : reportMock.title;
});
const headerTime = computed(() => {
  if (!hasCompletedMock.value) return currentTime.value;
  return isLiveConversation.value ? currentTime.value : reportMock.createdAt;
});
const completedQuestionParts = computed(() => tokenizePromptText(completedQuestion.value));
const processToolCount = computed(() =>
  reportMock.timeline.reduce((count, node) => count + (node.tools?.length ?? 0), 0)
);
const processSummaryText = computed(() =>
  `已完成 ${reportMock.timeline.length} 个处理阶段、${processToolCount.value} 项工具动作，采用 ${reportMock.references.length} 条参考来源。`
);
const answerStatusLabel = computed(() => {
  if (shouldShowSkillValidation.value) return '正在校验技能';
  if (isSkillCreatorConversation.value && isGeneratingAnswer.value) return '正在创建技能';
  if (isGeneratingAnswer.value && generatedAnswer.value) return '正在流式生成';
  if (isGeneratingAnswer.value) return '正在生成回答';
  if (answerError.value) return '调用异常';
  if (answerNotice.value) return '暂无缓存';
  if (isSkillCreatorConversation.value && generatedAnswer.value) return '已创建技能';
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

const selectedThinkingMode = ref('thinking');
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

const promptAssetLabelMap: Record<string, NonNullable<PromptPart['assetKind']>> = {
  关联模板: 'template',
  模板: 'template',
  关联知识库: 'knowledge-file',
  关联底稿: 'local-file',
};

const assetBadgeLabel = (kind: NonNullable<PromptPart['assetKind']>) => {
  if (kind === 'template') return '模';
  if (kind === 'knowledge-file') return '库';
  return '稿';
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

  const tokenPattern = /(\/[A-Za-z][\w-]*|模板：[^\s，。；;,.、]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const value = match[0];
    if (value.startsWith('/')) {
      parts.push({ type: 'skill', value });
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

  const availableCandidate = candidates.find((candidate) => getSkillByNameOrId(candidate));
  return availableCandidate || candidates[0] || '';
};

const hydrateCachedConversation = (prompt: string, historyId?: string) => {
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
  const restoredSkillId = resolveCreatedSkillIdFromHistory(
    normalizedCachedContent,
    cached.prompt,
    cached.answer.createdSkillId,
  );
  activeCreatedSkillId.value = restoredSkillId;
  createdSkillResult.value = restoredSkillId ? getSkillByNameOrId(restoredSkillId) : null;
  syncPublishSettingsFromSkill(createdSkillResult.value);
  skillValidationStatus.value = restoredSkillId ? 'complete' : 'idle';
  skillValidationMessage.value = createdSkillResult.value
    ? `技能完整度校验通过，当前发布范围为${createdSkillResult.value.scope === 'team' ? '本团队' : '仅自己'}。`
    : '';
  answerError.value = '';
  answerNotice.value = '';
  isGeneratingAnswer.value = false;
  if (normalizedCachedContent !== cached.answer.content || (restoredSkillId && !cached.answer.createdSkillId)) {
    updateConversationAnswer(cached.id, cached.prompt, {
      ...cached.answer,
      content: normalizedCachedContent,
      createdSkillId: restoredSkillId || cached.answer.createdSkillId,
      cachedAt: new Date().toISOString(),
    });
  }
  void nextTick(openFirstGeneratedArtifact);
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
  if (hydrateCachedConversation(prompt, historyId)) return;

  if (historyId && !findHistoryItem(historyId, prompt)) {
    hydrateMissingCachedConversation(prompt, historyId);
    return;
  }

  if (/\/skill-creator\b/i.test(prompt)) {
    const historyItem = beginConversation(prompt, shouldRecord, historyId, shouldRecord || !historyId);
    isDocxPreviewOpen.value = false;
    isGeneratingAnswer.value = true;
    answerModel.value = 'deepseek-v4-flash';
    liveThinkingContent.value = '';
    isLiveThinkingExpanded.value = true;
    skillValidationStatus.value = 'idle';
    skillValidationMessage.value = '';
    createdSkillResult.value = null;
    lastAutoOpenedArtifactId.value = '';

    try {
      const result = await streamSkillWithSkillCreator(
        extractSkillCreatorBrief(prompt),
        inferSkillCreatorAnswers(prompt),
        {
          onFinalContent(content) {
            if (content.trim()) {
              isLiveThinkingExpanded.value = false;
            }
            syncAnswerContent(content);
            scheduleLiveOutputScroll('answer', 'artifact');
          },
          onMeta(model) {
            answerModel.value = model;
          },
          onThinking(token) {
            if (!generatedAnswer.value.trim()) {
              isLiveThinkingExpanded.value = true;
            }
            liveThinkingContent.value += token;
            scheduleLiveOutputScroll('answer');
          },
          onToken(token) {
            if (!generatedAnswer.value.trim()) {
              isLiveThinkingExpanded.value = false;
            }
            appendAnswerToken(token);
            scheduleLiveOutputScroll('answer', 'artifact');
          },
          onValidation(payload) {
            isLiveThinkingExpanded.value = false;
            skillValidationStatus.value = payload.status;
            skillValidationMessage.value = payload.message || '正在校验技能完整度。';
            scheduleLiveOutputScroll('answer', 'artifact');
          },
        },
        {
          thinkingMode: selectedThinkingMode.value,
        },
      );
      skillValidationStatus.value = 'checking';
      skillValidationMessage.value = '正在写入技能库、持久化保存并完成读回校验。';

      const savedSkill = upsertCustomSkill({
        ...result.skill,
        scope: 'personal',
        status: 'draft',
      }, { persist: false });
      if (!savedSkill) {
        throw new Error('技能已生成，但写入技能库失败');
      }

      const locallyVerifiedSkill = getSkillByNameOrId(savedSkill.id);
      if (!locallyVerifiedSkill) {
        throw new Error('技能已生成，但未能从当前技能库读回，请重新创建或打开技能管理检查');
      }

      const persistedSkill = await persistCustomSkillNow(locallyVerifiedSkill);
      const finalSkill = upsertCustomSkill({
        ...persistedSkill,
        scope: 'personal',
        status: 'draft',
      }, { persist: false });
      const verifiedSkill = getSkillByNameOrId(finalSkill?.id || savedSkill.id);
      if (!verifiedSkill) {
        throw new Error('技能已持久化，但未能从当前技能库读回，请刷新后打开技能管理检查');
      }

      createdSkillResult.value = verifiedSkill;
      activeCreatedSkillId.value = verifiedSkill.id;
      syncPublishSettingsFromSkill(verifiedSkill);
      skillValidationStatus.value = 'complete';
      skillValidationMessage.value = '技能完整度校验通过，已保存为个人草稿，可继续配置后发布。';

      const streamedContent = result.answerContent.trim();
      const resultContent = streamedContent || renderCreatedSkillAnswer(verifiedSkill);

      answerModel.value = result.model || answerModel.value;
      isGeneratingAnswer.value = false;
      syncAnswerContent(resultContent);
      void nextTick(openSkillPublishSettings);

      const cachedItem = updateConversationAnswer(activeHistoryId.value || historyItem?.id, prompt, {
        content: resultContent,
        model: answerModel.value,
        cachedAt: new Date().toISOString(),
        createdSkillId: verifiedSkill.id,
        thinkingContent: liveThinkingContent.value,
      });

      if (cachedItem) {
        activeHistoryId.value = cachedItem.id;
        syncConversationRoute(cachedItem.id, cachedItem.prompt);
        void refreshGeneratedConversationTitle(cachedItem.id, cachedItem.prompt, resultContent);
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
    answerError.value = error instanceof Error ? error.message : 'DeepSeek 调用失败';
  } finally {
    isGeneratingAnswer.value = false;
  }
};

const submitComposer = () => {
  if (!hasComposerContent.value) return;

  void completeLiveConversation(inputValue.value.trim() || reportMock.userPrompt);
};

const submitSharedComposer = (value: string, options?: { thinkingMode?: string }) => {
  const nextValue = value.trim();
  if (!nextValue) return;

  if (options?.thinkingMode) {
    selectedThinkingMode.value = options.thinkingMode;
  }

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

const handleLiveAnswerClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

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

  void router.push({
    name: 'home',
    query: {
      composerAction: 'use-skill',
      skillName: skill.id,
      composerTick: Date.now().toString(),
    },
  });
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
    return generatedAnswer.value || answerError.value || answerNotice.value;
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

const copyQuestion = () => {
  void copyText(completedQuestion.value, '问题已复制');
};

const copyAnswer = () => {
  void copyText(getAnswerPlainText(), '回答已复制');
};

const copyShareLink = () => {
  void copyText(getShareUrl(), '分享链接已复制');
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
    const latestArtifact = artifacts[artifacts.length - 1];
    if (latestArtifact && latestArtifact.id !== lastAutoOpenedArtifactId.value) {
      lastAutoOpenedArtifactId.value = latestArtifact.id;
      openArtifactPreview(latestArtifact.id);
      scheduleLiveOutputScroll('answer', 'artifact');
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
  () => [route.query.mock, route.query.prompt, route.query.historyId],
  () => {
    void openRoutePrompt();
  },
);
</script>

<template>
  <div class="chat-page" :class="{ 'preview-split': hasPreviewPanel }" @click.self="closeDropdown">
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

          <article class="answer-card">
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
              <section v-if="isLiveConversation" class="live-answer-section" aria-label="DeepSeek 生成结果">
                <div v-if="isGeneratingAnswer && !generatedAnswer && !isSkillCreatorConversation" class="live-loading">
                  <Brain :size="17" />
                  <span>正在调用 DeepSeek 生成回答...</span>
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
                <div v-if="shouldShowSkillGenerationStatus" class="live-generation-status" aria-label="正在生成技能">
                  <Puzzle :size="16" aria-hidden="true" />
                  <strong class="live-status-shine">正在生成技能</strong>
                </div>
                <div
                  v-if="generatedAnswer"
                  class="live-answer-text"
                  v-html="liveAnswerHtml"
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
                <div v-if="shouldShowSkillValidation" class="skill-validation-card">
                  <span class="skill-validation-spinner" aria-hidden="true"></span>
                  <div>
                    <strong>校验技能完整度</strong>
                    <span>{{ skillValidationMessage || '正在解析技能结构、文件完整性和持久化状态。' }}</span>
                  </div>
                </div>
                <div v-if="shouldShowSkillCompletion && skillCompletionSkill" class="skill-completion-card">
                  <div class="skill-completion-banner">
                    <span class="skill-completion-icon">
                      <Check :size="22" />
                    </span>
                    <span>生成完成</span>
                  </div>
                  <div class="skill-completion-body">
                    <div class="skill-completion-copy">
                      <strong>{{ skillCompletionSkill.name }}</strong>
                      <code>/{{ skillCompletionSkill.id }}</code>
                    </div>
                  </div>
                  <div class="skill-completion-actions">
                    <button type="button" class="skill-completion-secondary" @click="openSkillPublishSettings">
                      <Share2 :size="15" />
                      配置发布
                    </button>
                    <button type="button" class="skill-completion-cta" @click="useCreatedSkillNow">
                      <Zap :size="15" />
                      立即使用
                    </button>
                  </div>
                </div>
                <p v-if="shouldShowSkillCompletion && skillCompletionSkill" class="skill-completion-ending">
                  技能文件已生成并校验通过，右侧已打开发布设置，可继续确认名称、图标、描述和发布范围。
                </p>
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
        <ChatInput v-model="inputValue" @submit="submitSharedComposer" />

        <p class="ai-note">回复的内容由AI生成，非人工编辑；其内容准确性和完整性无法保证，不代表我们的态度和观点。</p>
      </footer>
    </main>

    <SkillManageModal
      v-if="showSkillManageModal"
      create-behavior="emit"
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
            <span>{{ artifactPanelMode === 'publish' ? '发布前设置' : isArtifactEditing ? 'Artifact 编辑' : activeArtifact.kind === 'code' ? activeArtifact.language : 'Artifact 预览' }}</span>
          </div>
        </div>
        <div v-if="canShowSkillPublishSettings" class="artifact-preview-tabs" role="tablist" aria-label="技能生成结果面板">
          <button
            type="button"
            :class="{ active: artifactPanelMode === 'preview' }"
            role="tab"
            :aria-selected="artifactPanelMode === 'preview'"
            @click="artifactPanelMode = 'preview'"
          >
            预览
          </button>
          <button
            type="button"
            :class="{ active: artifactPanelMode === 'publish' }"
            role="tab"
            :aria-selected="artifactPanelMode === 'publish'"
            @click="artifactPanelMode = 'publish'"
          >
            发布设置
          </button>
        </div>
        <div class="artifact-preview-actions">
          <template v-if="artifactPanelMode === 'preview' && isArtifactEditing">
            <button
              type="button"
              class="artifact-preview-action"
              aria-label="取消编辑"
              title="取消编辑"
              :disabled="isSavingArtifactEdit"
              @click="cancelArtifactEdit"
            >
              <X :size="15" />
              <span>取消</span>
            </button>
            <button
              type="button"
              class="artifact-preview-action primary"
              aria-label="保存 Artifact"
              title="保存 Artifact"
              :disabled="isSavingArtifactEdit"
              @click="saveArtifactEdit"
            >
              <Check :size="15" />
              <span>{{ isSavingArtifactEdit ? '保存中' : '保存' }}</span>
            </button>
          </template>
          <button
            v-else-if="artifactPanelMode === 'preview'"
            type="button"
            class="artifact-preview-action"
            aria-label="编辑 Artifact"
            title="编辑 Artifact"
            @click="startArtifactEdit"
          >
            <Pencil :size="15" />
            <span>编辑</span>
          </button>
          <button type="button" class="artifact-preview-close" aria-label="关闭文件预览" title="关闭文件预览" @click="closeArtifactPreview">
            <X :size="18" />
          </button>
        </div>
      </header>

      <div
        class="artifact-preview-scroll"
        :class="{ 'is-editing': isArtifactEditing && artifactPanelMode === 'preview', 'is-publish-settings': artifactPanelMode === 'publish' }"
        ref="artifactPreviewScrollRef"
      >
        <section v-if="artifactPanelMode === 'publish' && skillCompletionSkill" class="skill-publish-panel" aria-label="技能发布前设置">
          <div class="publish-section publish-identity-section">
            <div class="publish-icon-field">
              <button type="button" class="publish-icon-preview" aria-label="上传技能图标" @click="choosePublishIcon">
                <img v-if="publishSettings.iconDataUrl" :src="publishSettings.iconDataUrl" alt="" />
                <span v-else>{{ publishIconFallback }}</span>
              </button>
              <div class="publish-icon-actions">
                <button type="button" class="publish-small-action" @click="choosePublishIcon">
                  <Upload :size="14" />
                  上传图标
                </button>
                <button
                  v-if="publishSettings.iconDataUrl"
                  type="button"
                  class="publish-small-action muted"
                  @click="clearPublishIcon"
                >
                  移除
                </button>
                <input
                  ref="publishIconInputRef"
                  class="publish-icon-input"
                  type="file"
                  accept="image/*"
                  @change="handlePublishIconUpload"
                />
              </div>
            </div>

            <label class="publish-field">
              <span>技能名称</span>
              <input v-model="publishSettings.name" type="text" maxlength="48" />
            </label>

            <label class="publish-field">
              <span>技能描述</span>
              <textarea v-model="publishSettings.description" rows="4" maxlength="360"></textarea>
            </label>
          </div>

          <div class="publish-section">
            <div class="publish-section-header">
              <strong>发布范围</strong>
              <span>{{ currentPublishVisibility.description }}</span>
            </div>
            <div class="publish-scope-list" role="radiogroup" aria-label="发布范围">
              <button
                v-for="option in publishVisibilityOptions"
                :key="option.id"
                type="button"
                class="publish-scope-option"
                :class="{ active: publishSettings.visibility === option.id }"
                role="radio"
                :aria-checked="publishSettings.visibility === option.id"
                @click="publishSettings.visibility = option.id"
              >
                <span class="publish-scope-check">
                  <Check v-if="publishSettings.visibility === option.id" :size="14" />
                </span>
                <span>
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </span>
              </button>
            </div>
          </div>

          <div v-if="activePublishPermission" class="publish-section">
            <div class="publish-section-header">
              <strong>{{ currentPublishVisibility.label }}权限</strong>
              <span>这些开关只影响{{ currentPublishVisibility.permissionSubject }}对技能副本的使用方式。</span>
            </div>
            <label class="publish-toggle">
              <span>
                <strong>允许查看详情</strong>
                <small>{{ currentPublishVisibility.permissionSubject }}可以查看该技能详情和说明。</small>
              </span>
              <input
                :checked="activePublishPermission.allowCopy"
                type="checkbox"
                @change="handleActivePermissionCopyChange"
              />
            </label>
            <label class="publish-toggle" :class="{ disabled: !activePublishPermission.allowCopy }">
              <span>
                <strong>允许自行编辑</strong>
                <small>自行编辑副本，不修改原技能。</small>
              </span>
              <input
                :checked="activePublishPermission.allowRemix"
                type="checkbox"
                :disabled="!activePublishPermission.allowCopy"
                @change="handleActivePermissionRemixChange"
              />
            </label>
            <label class="publish-toggle">
              <span>
                <strong>显示发布者名称</strong>
                <small>在技能详情和共享列表中展示发布者。</small>
              </span>
              <input
                :checked="activePublishPermission.showPublisherName"
                type="checkbox"
                @change="handleActivePermissionPublisherVisibilityChange"
              />
            </label>
            <label v-if="activePublishPermission.showPublisherName" class="publish-field compact">
              <span>发布者名称</span>
              <input
                :value="activePublishPermission.publisherName"
                type="text"
                maxlength="32"
                @input="handleActivePermissionPublisherNameInput"
              />
            </label>
          </div>

          <div class="publish-footer">
            <div class="publish-footer-summary">
              <strong>{{ currentPublishVisibility.label }}</strong>
              <span>{{ publishSettingsSummary }}</span>
            </div>
            <div class="publish-footer-actions">
              <button type="button" class="publish-draft-btn" :disabled="!canSavePublishSettings" @click="saveSkillPublishSettings('draft')">
                保存草稿
              </button>
              <button type="button" class="publish-primary-btn" :disabled="!canSavePublishSettings" @click="saveSkillPublishSettings('publish')">
                发布
              </button>
            </div>
          </div>
        </section>
        <textarea
          v-else-if="isArtifactEditing"
          ref="artifactEditorRef"
          v-model="artifactEditContent"
          class="artifact-editor"
          :aria-label="`编辑 ${activeArtifact.title}`"
          spellcheck="false"
        ></textarea>
        <template v-else>
          <iframe
            v-if="activeArtifact.kind === 'html'"
            class="artifact-html-frame"
            title="HTML Artifact 预览"
            sandbox=""
            :srcdoc="activeArtifact.content"
          ></iframe>
          <pre v-else-if="activeArtifact.kind === 'code'" class="artifact-code-page"><code>{{ activeArtifact.content }}</code></pre>
          <article v-else class="artifact-document-page" v-html="renderArtifactDocumentPreview(activeArtifact)"></article>
        </template>
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

.question-asset-chip {
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
  font-size: inherit;
  font-weight: 520;
  line-height: 24px;
  vertical-align: baseline;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
}

.question-asset-chip::before {
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
  border: 0;
  border-radius: 0;
  background: transparent;
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
  margin: 6px 0 12px;
  padding: 2px 0 2px 12px;
  border-left: 2px solid #d1d5db;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
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

.live-thinking-body :deep(.live-answer-paragraph) {
  margin: 0 0 10px;
}

@keyframes thinking-shine {
  100% {
    background-position: -200% 0;
  }
}

.skill-validation-card,
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
  width: 100%;
  margin: 0 0 12px;
  padding: 14px 16px;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre;
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
  font-family: inherit;
}

.live-answer-text :deep(.live-answer-table-wrap) {
  width: 100%;
  margin: 0 0 14px;
  overflow-x: auto;
}

.live-answer-text :deep(.live-answer-table) {
  min-width: 520px;
  width: 100%;
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

.docx-preview-panel,
.artifact-preview-panel {
  flex: 0 0 50%;
  width: 50%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  background: var(--bg-color);
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
}

.docx-preview-scroll {
  padding: 22px;
}

.artifact-preview-scroll {
  padding: 30px 38px;
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
  display: inline-flex;
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
}

.artifact-document-page :deep(.live-answer-link) {
  color: var(--primary-color);
  font-weight: 650;
  text-decoration: none;
}

.artifact-document-page :deep(.live-answer-codeblock) {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 14px;
  padding: 14px 16px;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre;
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
  overflow-x: auto;
}

.artifact-document-page :deep(.live-answer-table) {
  min-width: 520px;
  width: 100%;
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
  margin: 0;
  padding: 0 0 28px;
  overflow: auto;
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.72;
  white-space: pre;
}

.artifact-code-page code {
  font-family: inherit;
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
