<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Component } from 'vue';
import { useRoute } from 'vue-router';
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
import { docxLegalResearchMock } from '../data/docxLegalResearchMock';

type SearchMode = {
  id: string;
  label: string;
  icon: Component;
};

type PromptPart = {
  type: 'text' | 'skill' | 'template';
  value: string;
};

const route = useRoute();
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
const completedQuestion = ref('');
const selectedTemplate = ref<TemplateAsset | null>(null);
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

const isResearchMode = computed(() => selectedDialogMode.value === 'research');
const hasComposerContent = computed(() => inputValue.value.length > 0 || Boolean(selectedTemplate.value));
const reportMock = docxLegalResearchMock;
const hasSidePanel = computed(() => isReferenceDrawerOpen.value || isDocxPreviewOpen.value);

const headerTitle = computed(() => hasCompletedMock.value ? reportMock.title : '新提问');
const headerTime = computed(() => hasCompletedMock.value ? reportMock.createdAt : currentTime.value);
const completedQuestionParts = computed(() => tokenizePromptText(completedQuestion.value));

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

const renderMockText = (text: string) => {
  return text.replace(/\[(\d+)\]/g, '<span class="source-index">$1</span>');
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

const submitComposer = () => {
  if (!hasComposerContent.value) return;

  completedQuestion.value = inputValue.value.trim() || reportMock.userPrompt;
  hasCompletedMock.value = true;
  isReferenceDrawerOpen.value = true;
  isDocxPreviewOpen.value = false;
  inputValue.value = '';
  selectedTemplate.value = null;
  showSourceNotice.value = false;
  closeDropdown();
};

const submitSharedComposer = (value: string) => {
  const nextValue = value.trim();
  if (!nextValue) return;

  completedQuestion.value = nextValue;
  hasCompletedMock.value = true;
  isReferenceDrawerOpen.value = true;
  isDocxPreviewOpen.value = false;
  inputValue.value = '';
  selectedTemplate.value = null;
  showSourceNotice.value = false;
  closeDropdown();
};

const openDocxMock = (prompt?: string) => {
  completedQuestion.value = prompt?.trim() || reportMock.userPrompt;
  hasCompletedMock.value = true;
  isReferenceDrawerOpen.value = true;
  isDocxPreviewOpen.value = false;
  inputValue.value = '';
  selectedTemplate.value = null;
  showSourceNotice.value = false;
};

const toggleReferenceDrawer = () => {
  isReferenceDrawerOpen.value = !isReferenceDrawerOpen.value;
  if (isReferenceDrawerOpen.value) {
    isDocxPreviewOpen.value = false;
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
  if (route.query.mock === 'docx') {
    openDocxMock(typeof route.query.prompt === 'string' ? route.query.prompt : undefined);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown);
  document.body.classList.remove('docx-preview-mode');
});

watch(isDocxPreviewOpen, (isOpen) => {
  document.body.classList.toggle('docx-preview-mode', isOpen);
});
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
        :class="{ 'with-source-drawer': isReferenceDrawerOpen }"
        aria-label="docx 技能回答结果"
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
                已完成回答
                <ChevronDown :size="14" />
              </button>
              <button
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
              <section class="process-summary" aria-label="生成过程摘要">
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

                <div class="reasoning-timeline compact">
                  <div class="timeline-node last thinking-node">
                    <p class="thinking-title">深度思考</p>
                    <p v-for="paragraph in reportMock.thinking" :key="paragraph">{{ paragraph }}</p>
                  </div>
                </div>
              </section>

              <section class="docx-result-summary" aria-label="docx 生成结果">
                <p>
                  已按“法律研究报告”模板生成一份婚姻家事方向的 Word 文档，内容覆盖共同财产分割、共同债务、子女抚养、家务补偿及离婚救济等核心问题。
                </p>
                <p>
                  报告已整理为可导出的 `.docx` 文件，右侧保留本次生成所依据的主要法规、司法解释和类案来源。
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
                        <p class="docx-file-kicker">法律研究报告</p>
                      <h2>婚姻家事纠纷法律研究报告.docx</h2>
                    </div>
                    <span class="docx-file-status">已生成</span>
                  </div>

                  <p class="docx-file-desc">{{ reportMock.summary }}</p>
                  </div>
                </div>
              </section>
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

      <footer class="composer-wrap" :class="{ 'with-source-drawer': isReferenceDrawerOpen }">
        <div class="composer-top-actions">
          <button class="ghost-action">
            <MessageSquareText :size="15" />
            新提问
          </button>
          <button class="ghost-action">
            <BookOpen :size="15" />
            提问记录
          </button>
        </div>

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
    <aside v-if="hasCompletedMock && isReferenceDrawerOpen" class="source-drawer" aria-label="参考来源">
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
        <article v-for="source in reportMock.references" :key="source.id" class="source-card">
          <div class="source-card-title">
            <Share2 :size="16" />
            <strong>{{ source.type }}</strong>
          </div>
          <h4>{{ source.id }}.{{ source.title }}</h4>
          <p class="source-origin">{{ source.source }}</p>
          <p>{{ source.excerpt }}</p>
          <button type="button" class="source-kb-button">
            <Zap :size="13" />
            加入知识库
          </button>
        </article>
      </div>
    </aside>

    <aside v-if="hasCompletedMock && isDocxPreviewOpen" class="docx-preview-panel" aria-label="DOCX 文件预览">
      <header class="docx-preview-header">
        <div class="docx-preview-title">
          <span class="docx-preview-icon">
            <FileText :size="18" />
          </span>
          <div>
            <strong>婚姻家事纠纷法律研究报告.docx</strong>
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
            <p>法律研究报告</p>
            <h1>{{ reportMock.title }}</h1>
            <dl>
              <div>
                <dt>报告用途</dt>
                <dd>内部研判 / 客户沟通 / 离婚谈判准备</dd>
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
              v-html="renderMockText(paragraph)"
            ></p>
            <ul v-if="section.bullets">
              <li
                v-for="bullet in section.bullets"
                :key="bullet"
                v-html="renderMockText(bullet)"
              ></li>
            </ul>
          </section>
        </article>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.chat-page {
  --line: #d9e0ee;
  --line-soft: #e9edf5;
  --paper: #ffffff;
  --text-main: #2d3445;
  --text-muted: #8a93a6;
  --text-strong: #2a5bd7;
  display: flex;
  width: 100%;
  min-height: 100%;
  height: 100%;
  background: #f6f8fc;
  overflow: hidden;
}

.chat-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f9fd;
}

.chat-page.preview-split .chat-main {
  flex: 0 0 50%;
  width: 50%;
  border-right: 1px solid #dbe5f4;
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
  background: rgba(247, 249, 253, 0.94);
}

.header-title-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #eef4ff;
  color: #2a5bd7;
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
  color: #a0a8b8;
  background: #edf1f7;
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
  padding: 0 28px 16px;
  flex-shrink: 0;
  transition: margin-right 0.2s ease;
}

.chat-page.preview-split .composer-wrap {
  padding: 0 clamp(16px, 4vw, 54px) 14px;
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

.composer-top-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 10px;
}

.ghost-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  color: #64748b;
  background: transparent;
}

.ghost-action:hover {
  background: #eef2f7;
  color: #2a5bd7;
}

.composer {
  position: relative;
  border: 1px solid #6aa1ff;
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
  color: #2d3445;
  background: transparent;
}

.composer-textarea::placeholder {
  color: #9aa4b6;
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
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
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
  color: #9a3412;
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
  color: #047857;
  background: #ecfdf5;
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
  color: #047857;
}

.selected-template-chip button:hover {
  background: #d1fae5;
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
  color: #64748b;
  background: #f1f5f9;
  transition: all 0.2s;
}

.plus-button:hover,
.plus-button[aria-expanded="true"] {
  background: #e0edff;
  color: #2563eb;
}

.text-tool-button {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  border-radius: 8px;
  color: #5f6368;
  background: transparent;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  transition: background-color 0.2s, color 0.2s;
}

.text-tool-button:hover,
.text-tool-button[aria-expanded="true"] {
  background: #eef2f7;
  color: #475569;
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
  outline: 2px solid #60a5fa;
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
  border-bottom: 1px solid #eef2f7;
}

.action-group:last-child {
  padding-bottom: 2px;
  border-bottom: none;
}

.action-group-title {
  margin: 4px 8px 6px;
  color: #94a3b8;
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
  color: #2563eb;
  background: #eff6ff;
}

.action-icon {
  color: #64748b;
  flex-shrink: 0;
}

.action-menu-item.selected .action-icon {
  color: #2563eb;
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
  color: #8a93a6;
}

.icon-button:hover {
  background: #f1f5f9;
  color: #475569;
}

.send-button {
  color: white;
  background: #c7d1df;
  cursor: not-allowed;
}

.send-button.ready {
  background: #2563eb;
  cursor: pointer;
}

.ai-note {
  margin: 10px 0 0;
  text-align: center;
  font-size: 12px;
  color: #9aa4b6;
}

.answer-conversation {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #f7f9fd;
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

.chat-page.preview-split .answer-card-header {
  padding: 14px 18px 8px;
}

.chat-page.preview-split .answer-content {
  padding: 2px 20px 18px;
}

.user-message {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.question-bubble {
  max-width: 520px;
  padding: 14px 16px 10px;
  border-radius: 12px 12px 2px 12px;
  background: #dbeafe;
  color: #273344;
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
  background: #f2f2f2;
  color: #5f6368;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  line-height: 24px;
  vertical-align: baseline;
}

.question-inline-code.template-inline-code {
  background: #ecfdf5;
  color: #047857;
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
  color: #6b7280;
  font-size: 12px;
}

.question-actions button:hover,
.answer-actions button:hover {
  color: #2563eb;
}

.answer-card {
  width: min(850px, 100%);
  margin: 0 auto;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(51, 79, 120, 0.06);
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
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
}

.answer-status-button,
.reference-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 700;
}

.answer-status-button {
  padding: 0 4px;
}

.reference-button {
  padding: 0 10px;
  background: #f1f5f9;
}

.reference-button.active,
.reference-button:hover {
  color: #245ad8;
  background: #eaf2ff;
}

.answer-content {
  padding: 4px 32px 22px;
  color: #263142;
  font-size: 15px;
  line-height: 1.86;
}

.process-summary {
  margin-bottom: 26px;
}

.docx-result-summary p {
  margin: 0 0 10px;
  color: #3f4a5f;
}

.docx-file-card {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 22px;
  margin-top: 18px;
  padding: 22px;
  border: 1px solid #dbe7fb;
  border-radius: 10px;
  background: linear-gradient(180deg, #fbfdff 0%, #f7fbff 100%);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.docx-file-card:hover {
  border-color: #aacbff;
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.08);
}

.docx-file-card:focus-visible {
  outline: 2px solid #60a5fa;
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
  color: #245ad8;
  background: #eaf2ff;
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
  color: #245ad8 !important;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.35;
}

.docx-file-heading h2 {
  margin: 0;
  color: #111827;
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
  color: #047857;
  background: #ecfdf5;
  font-size: 12px;
  font-weight: 850;
}

.docx-file-desc {
  margin: 11px 0 0 !important;
  color: #4b5563 !important;
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
  color: #111827;
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
  background: #e1e6ef;
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
  background: #b8c1d1;
}

.timeline-node.last {
  padding-bottom: 0;
}

.timeline-node p {
  margin: 0 0 10px;
  color: #5f6b7b;
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
  color: #1254d8;
  font-size: 14px;
  font-weight: 850;
}

.tool-step span {
  min-width: 0;
  padding: 3px 9px;
  border-radius: 7px;
  color: #475569;
  background: #f3f6fa;
  font-size: 13px;
}

.tool-step small {
  grid-column: 1 / -1;
  color: #8a94a6;
  font-size: 12px;
}

.thinking-node {
  color: #5f6b7b;
}

.thinking-title {
  margin-bottom: 2px !important;
  color: #4b5563 !important;
}

.thinking-node p,
.report-body p {
  margin: 0 0 12px;
}

.lead-copy {
  color: #1f2937;
}

.report-cover {
  margin: 18px 0 26px;
  padding: 22px 24px;
  border: 1px solid #e1e8f5;
  border-radius: 8px;
  background: #fbfdff;
}

.report-label {
  margin: 0 0 8px !important;
  color: #245ad8;
  font-size: 13px;
  font-weight: 850;
}

.report-cover h2 {
  margin: 0 0 10px;
  color: #111827;
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
  color: #7a8496;
  font-size: 12px;
  font-weight: 800;
}

.report-cover dd {
  margin: 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.55;
}

.report-section {
  margin: 25px 0 0;
}

.report-section h3 {
  margin: 0 0 12px;
  color: #151a23;
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

:deep(.source-index) {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 2px;
  border-radius: 999px;
  color: #6b7280;
  background: #eef1f5;
  font-size: 11px;
  font-weight: 800;
  vertical-align: 1px;
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
  color: #8b95a6;
  background: #eef1f5;
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
  border-left: 1px solid #dbe5f4;
  background: #f7f9fc;
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
  background: #f7f9fc;
}

.source-drawer-header div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.source-drawer-header strong {
  color: #1f2937;
  font-size: 16px;
  font-weight: 850;
}

.source-drawer-header span {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 8px;
  background: #edf1f7;
  color: #5f6b7a;
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
  color: #b7bec9;
}

.source-drawer-header button:hover {
  background: #eef3fb;
  color: #667085;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.source-card {
  padding: 17px 18px 18px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 9px rgba(45, 70, 110, 0.06);
}

.source-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #1f2937;
}

.source-card-title svg {
  color: #2357d7;
}

.source-card-title strong {
  font-size: 14px;
  font-weight: 900;
}

.source-card h4 {
  margin: 0 0 8px;
  color: #253041;
  font-size: 14px;
  font-weight: 850;
  line-height: 1.45;
}

.source-card p {
  margin: 0;
  color: #5c6675;
  font-size: 13px;
  line-height: 1.7;
}

.source-origin {
  margin-bottom: 7px !important;
  color: #7b8493 !important;
}

.source-kb-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  margin-top: 14px;
  padding: 0 11px;
  border: 1px solid #d6e5ff;
  border-radius: 8px;
  color: #1f2937;
  background: #ffffff;
  font-size: 13px;
}

.source-kb-button:hover {
  color: #245ad8;
  border-color: #aacbff;
}

.docx-preview-panel {
  flex: 0 0 50%;
  width: 50%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #dbe5f4;
  background: #f5f7fb;
}

.docx-preview-header {
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 16px 0 18px;
  border-bottom: 1px solid #e1e7f2;
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
  color: #245ad8;
  background: #eaf2ff;
}

.docx-preview-title div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.docx-preview-title strong {
  overflow: hidden;
  color: #111827;
  font-size: 14px;
  font-weight: 850;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docx-preview-title span {
  color: #7b8494;
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
  color: #98a2b3;
}

.docx-preview-header button:hover {
  color: #475569;
  background: #edf2f8;
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
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 16px 34px rgba(31, 57, 114, 0.10);
}

.docx-preview-cover {
  padding-bottom: 18px;
  margin-bottom: 24px;
  border-bottom: 1px solid #dbe4f2;
}

.docx-preview-cover p {
  margin: 0 0 8px;
  color: #245ad8;
  font-size: 14px;
  font-weight: 850;
}

.docx-preview-cover h1 {
  margin: 0 0 18px;
  color: #111827;
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
  color: #7b8494;
  font-size: 12px;
  font-weight: 800;
}

.docx-preview-cover dd {
  margin: 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.5;
}

.docx-preview-section {
  margin-top: 22px;
}

.docx-preview-section h2 {
  margin: 0 0 10px;
  color: #111827;
  font-size: 18px;
  line-height: 1.45;
  font-weight: 900;
}

.docx-preview-section p,
.docx-preview-section li {
  color: #344054;
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
