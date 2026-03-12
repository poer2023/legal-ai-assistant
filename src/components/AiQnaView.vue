<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  MessageSquareText,
  Mic,
  Paperclip,
  Scale,
  Send,
  Share2,
  X,
} from 'lucide-vue-next';

type SearchMode = {
  id: string;
  label: string;
  icon: typeof Scale;
};

type ReferenceItem = {
  id: number;
  category: string;
  title: string;
  detail: string;
  clickable?: boolean;
};

const router = useRouter();
const inputValue = ref('');
const showSearchDropdown = ref(false);
const showSourceNotice = ref(true);
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));

const searchModes: SearchMode[] = [
  { id: 'legal', label: '法律搜索', icon: Scale },
  { id: 'web', label: '联网搜索', icon: Globe },
  { id: 'academic', label: '学术搜索', icon: GraduationCap },
];

const references: ReferenceItem[] = [
  {
    id: 1,
    category: '司法案例',
    title: '1. 执行错误',
    detail: '搜索失败: 上海返还 404',
    clickable: true,
  },
];

const sections = [
  {
    title: '二、在品牌宣传与内容创作中',
    paragraphs: [
      '这个词组也常被用作标语、栏目名称或文章标题，以突出其内容的独特价值。',
    ],
    bullets: [
      '适用逻辑：当创作者希望强调其内容不同于肤浅的观点罗列，而是提供了独到的、有深度的见解时，“金析为证”就成为一个有力的承诺。它暗示了内容将“剥开表象，直抵核心”，为读者提供真正有营养的“干货”。',
      '现实类比方式：例如，一个财经评论专栏可能取名“金析为证”，意味着每篇文章都会对市场动态进行抽丝剥茧式的分析；一个测评类账号使用这个口号，则表示其测评结果基于详尽、客观的对比和测试数据。',
    ],
  },
  {
    title: '三、作为一种思维方式的倡导',
    paragraphs: [
      '在更抽象的层面，“金析为证”可以代表一种批判性思维和求真态度。',
    ],
    bullets: [
      '理论依据：它呼应了“大胆假设，小心求证”的科学精神。在面对复杂问题或争议时，它提醒我们应避免情绪化判断，转而依靠事实梳理、逻辑推理和多角度辨析来形成最终看法。',
      '常见误区及反面：与之相对的是“感觉为证”或“权威为证”。许多决策失误源于分析不足或依赖单一信源。“金析为证”正是对这种惰性的矫正，强调证据链的构建和分析过程的可复现性。',
    ],
  },
];

const summaryPoints = [
  '强调过程的可靠性：它将“分析”这一过程本身提升到了“黄金标准”的高度，暗示了其方法的科学性和结论的稳健性。',
  '突出结论的客观性：以“分析”为“证”，避免了主观臆断，将立论基础锚定在可讨论、可检验的客观材料之上。',
  '传递专业与深度的承诺：无论在何种语境下，它都在向受众传递一个明确信号：即将呈现的内容是经过深度加工和严密思考的产物，具有较高的参考价值。',
];

const toggleSearchMode = (modeId: string) => {
  if (enabledSearchModes.value.has(modeId)) {
    enabledSearchModes.value.delete(modeId);
  } else {
    enabledSearchModes.value.add(modeId);
  }
};

const isEnabled = (modeId: string) => enabledSearchModes.value.has(modeId);

const toggleSearchDropdown = () => {
  showSearchDropdown.value = !showSearchDropdown.value;
};

const closeDropdown = () => {
  showSearchDropdown.value = false;
};

const openReference = (item: ReferenceItem) => {
  if (!item.clickable) {
    return;
  }

  router.push({
    name: 'legal-document-detail',
    params: { id: item.id },
  });
};
</script>

<template>
  <div class="chat-page" @click.self="closeDropdown">
    <main class="chat-main">
      <header class="chat-header">
        <div class="chat-header-left">
          <button class="nav-back" aria-label="返回">
            <ChevronLeft :size="16" />
          </button>
          <div class="header-meta">
            <h1>金析为证是什么意思</h1>
            <p>2026-03-11 16:08</p>
          </div>
        </div>

        <button class="share-button">
          <Share2 :size="14" />
          分享
        </button>
      </header>

      <section class="conversation-scroll">
        <div class="answer-shell">
          <div class="answer-card">
            <p class="lead-text">
              “金析为证”通常不是严格意义上的固定成语，而更像是一个带有文雅色彩的表达。它可以理解为：以深入分析作为论证依据，以严密推理支撑最终结论。
            </p>

            <section
              v-for="section in sections"
              :key="section.title"
              class="article-section"
            >
              <h2>{{ section.title }}</h2>
              <p v-for="paragraph in section.paragraphs" :key="paragraph">
                {{ paragraph }}
              </p>
              <ul>
                <li v-for="bullet in section.bullets" :key="bullet">
                  {{ bullet }}
                </li>
              </ul>
            </section>

            <section class="article-section summary-section">
              <h2>总结与价值解释</h2>
              <p>
                总而言之，“金析为证”是一个富有现代感和专业精神的组合表达。其核心价值在于：
              </p>
              <ol>
                <li v-for="point in summaryPoints" :key="point">{{ point }}</li>
              </ol>
              <p>
                因此，当你遇到“金析为证”时，可以将其理解为一个对深度、精确和可靠分析行为的强调与标榜。它背后的意思是建立权威、获取信任，并引导受众关注分析过程本身。
              </p>
              <p>
                如果你愿意，我可以结合一个具体案例，来演示这类表达在法律分析或内容写作中的实际用法。
              </p>
              <span class="ai-badge">AI</span>
            </section>
          </div>
        </div>
      </section>

      <footer class="composer-wrap">
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

        <div class="composer">
          <textarea
            v-model="inputValue"
            class="composer-textarea"
            :placeholder="showSourceNotice ? '' : '想了解什么知识，快来问问我！ Shift+Enter/Ctrl+Enter 换行'"
            @click.stop="closeDropdown"
          />

          <div v-if="showSourceNotice && !inputValue" class="source-notice-bubble" role="status" aria-live="polite">
            <div class="source-notice-copy">
              <AlertCircle :size="15" class="source-notice-icon" />
              <span>当前参考来源较少，为获得更高质量回答，建议打开联网搜索等更多数据源</span>
            </div>
            <button
              class="source-notice-close"
              type="button"
              aria-label="关闭提醒"
              @click="showSourceNotice = false"
            >
              <X :size="14" />
            </button>
          </div>

          <div class="composer-toolbar">
            <div class="toolbar-left">
              <button class="mode-pill primary-pill">
                研究模式
                <ChevronDown :size="13" />
              </button>

              <div class="search-selector" @click.stop="toggleSearchDropdown">
                <div class="search-icons">
                  <component
                    :is="mode.icon"
                    v-for="mode in searchModes"
                    :key="mode.id"
                    :size="15"
                    class="search-icon"
                    :class="{ active: isEnabled(mode.id) }"
                  />
                </div>
                <ChevronDown :size="13" class="search-chevron" />

                <div v-if="showSearchDropdown" class="search-dropdown">
                  <button
                    v-for="mode in searchModes"
                    :key="mode.id"
                    class="dropdown-item"
                    :class="{ selected: isEnabled(mode.id) }"
                    @click.stop="toggleSearchMode(mode.id)"
                  >
                    <component :is="mode.icon" :size="15" />
                    <span>{{ mode.label }}</span>
                    <Check v-if="isEnabled(mode.id)" :size="15" />
                  </button>
                </div>
              </div>
            </div>

            <div class="toolbar-right">
              <button class="icon-button" aria-label="上传图片">
                <ImageIcon :size="18" />
              </button>
              <button class="icon-button" aria-label="上传附件">
                <Paperclip :size="18" />
              </button>
              <button class="icon-button" aria-label="语音输入">
                <Mic :size="18" />
              </button>
              <button class="send-button" :class="{ ready: inputValue.length > 0 }" aria-label="发送">
                <Send :size="16" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </main>

    <aside class="references-panel">
      <div class="references-header">
        <div class="references-title">
          <span>参考来源</span>
          <em>1篇</em>
        </div>
        <button class="close-button" aria-label="关闭">×</button>
      </div>

      <div class="reference-list">
        <article
          v-for="item in references"
          :key="item.id"
          class="reference-card"
          :class="{ clickable: item.clickable }"
          @click="openReference(item)"
        >
          <div class="reference-category">
            <Scale :size="14" />
            {{ item.category }}
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.detail }}</p>
        </article>
      </div>
    </aside>
  </div>
</template>

<style>
.chat-page {
  --line: #d9e0ee;
  --line-soft: #e9edf5;
  --panel: #f5f7fb;
  --paper: #ffffff;
  --paper-tint: #fbfcff;
  --text-main: #2d3445;
  --text-muted: #8a93a6;
  --text-strong: #2a5bd7;
  --shadow: 0 8px 24px rgba(31, 57, 114, 0.06);
  display: flex;
  width: 100%;
  min-height: 100%;
  height: 100%;
  background:
    linear-gradient(180deg, #f2f5fb 0%, #f7f8fc 100%);
  overflow: hidden;
}

.chat-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.85));
  border-right: 1px solid var(--line);
}

.chat-header {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px 0 16px;
  border-bottom: 1px solid var(--line);
  background: rgba(241, 244, 250, 0.92);
  backdrop-filter: blur(8px);
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.nav-back {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #7a86a0;
}

.header-meta {
  min-width: 0;
}

.header-meta h1 {
  margin: 0;
  font-size: 15px;
  line-height: 1.25;
  font-weight: 700;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-meta p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-muted);
}

.share-button {
  height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #cdd8ee;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #5f6c86;
  font-size: 12px;
  font-weight: 600;
}

.conversation-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 220px;
}

.answer-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 18px 28px 24px;
}

.answer-card {
  position: relative;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-tint) 100%);
  border-left: 1px solid var(--line-soft);
  border-right: 1px solid var(--line-soft);
  padding: 22px 28px 24px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.lead-text,
.article-section p,
.article-section li,
.summary-section ol {
  font-size: 13px;
  line-height: 1.8;
  color: #4a5264;
}

.article-section + .article-section {
  margin-top: 18px;
}

.article-section h2 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 800;
  color: #2b3140;
}

.article-section p + ul,
.article-section p + ol {
  margin-top: 8px;
}

.article-section ul,
.article-section ol {
  padding-left: 20px;
}

.article-section li + li {
  margin-top: 8px;
}

.summary-section {
  padding-top: 4px;
}

.ai-badge {
  display: inline-flex;
  margin-top: 8px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #f0f3f8;
  color: #8b94a6;
  font-size: 11px;
  font-weight: 700;
}

.composer-wrap {
  position: sticky;
  bottom: 0;
  padding: 0 18px 18px;
  background: linear-gradient(180deg, rgba(247, 248, 252, 0) 0%, rgba(247, 248, 252, 0.96) 18%, #f7f8fc 100%);
}

.composer-top-actions {
  max-width: 760px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.source-notice-bubble {
  position: absolute;
  top: 10px;
  left: 14px;
  right: 14px;
  width: fit-content;
  max-width: min(100% - 28px, 520px);
  min-height: 28px;
  padding: 4px 8px 4px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #c6d9fb;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(232, 241, 255, 0.98) 0%, rgba(220, 234, 255, 0.98) 100%);
  color: #4f6287;
  box-shadow: 0 4px 14px rgba(64, 96, 160, 0.08);
}

.source-notice-copy {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.35;
}

.source-notice-icon {
  flex: 0 0 auto;
  margin-top: 0;
  color: #3d6fe2;
}

.source-notice-close {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: #7184aa;
}

.source-notice-close:hover {
  background: rgba(79, 125, 231, 0.12);
  color: #466bc7;
}

.ghost-action {
  height: 30px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d5ddeb;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.84);
  color: #65718a;
  font-size: 12px;
  font-weight: 600;
}

.composer {
  max-width: 760px;
  margin: 0 auto;
  position: relative;
  background: linear-gradient(180deg, #fefeff 0%, #f9fbff 100%);
  border: 1px solid #cfd8ea;
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 12px 14px 10px;
}

.composer-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 180px;
  resize: none;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.6;
  padding-top: 0;
}

.composer-textarea::placeholder {
  color: #a0a9bb;
}

.composer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-pill,
.search-selector {
  height: 34px;
  border: 1px solid #d7deec;
  border-radius: 8px;
  background: #f4f7fd;
}

.primary-pill {
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #3368df;
  font-size: 12px;
  font-weight: 700;
}

.search-selector {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 10px;
}

.search-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-icon {
  color: #9aa5ba;
}

.search-icon.active {
  color: #3368df;
}

.search-chevron {
  color: #8c97ad;
}

.search-dropdown {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  width: 160px;
  padding: 6px;
  border: 1px solid #d7deec;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(35, 55, 108, 0.12);
}

.dropdown-item {
  width: 100%;
  height: 34px;
  padding: 0 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #58647d;
  font-size: 12px;
  text-align: left;
}

.dropdown-item.selected {
  background: #eef4ff;
  color: #2f63d8;
}

.dropdown-item span {
  flex: 1;
}

.icon-button,
.send-button {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-button {
  color: #7f8aa2;
  background: transparent;
}

.send-button {
  background: #d7deef;
  color: #ffffff;
}

.send-button.ready {
  background: linear-gradient(180deg, #5b87ef 0%, #3b67dc 100%);
}

.references-panel {
  flex: 0 0 228px;
  width: 228px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f4f5f8;
  border-left: 1px solid var(--line);
}

.references-header {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  background: #f4f5f8;
}

.references-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #394257;
}

.references-title em {
  font-style: normal;
  font-size: 12px;
  color: #8d96a8;
}

.close-button {
  font-size: 18px;
  line-height: 1;
  color: #b0b7c5;
}

.reference-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px 18px;
}

.reference-card {
  padding: 14px 12px;
  border: 1px solid #e5e8f0;
  border-radius: 12px;
  background: #fbfbfc;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}

.reference-card + .reference-card {
  margin-top: 12px;
}

.reference-card.clickable {
  cursor: pointer;
}

.reference-category {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #586786;
  font-size: 12px;
  font-weight: 700;
}

.reference-card h3 {
  margin: 0;
  font-size: 13px;
  color: #31394b;
  font-weight: 700;
}

.reference-card p {
  margin-top: 8px;
  min-height: 18px;
  font-size: 12px;
  line-height: 1.5;
  color: #8c95a8;
}

@media (max-width: 1100px) {
  .chat-page {
    display: block;
  }

  .references-panel {
    display: none;
  }
}

@media (max-width: 768px) {
  .chat-header,
  .answer-shell,
  .composer-wrap {
    padding-left: 12px;
    padding-right: 12px;
  }

  .answer-card {
    padding: 18px 16px;
  }

  .source-notice-bubble {
    top: 10px;
    left: 12px;
    right: 12px;
    max-width: calc(100% - 24px);
  }

  .composer-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: space-between;
  }
}
</style>
