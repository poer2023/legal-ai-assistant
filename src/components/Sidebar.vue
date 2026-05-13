<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  History,
  Home,
  Lock,
  MoreHorizontal,
  Network,
  Pencil,
  Plus,
  Scale,
  Sparkles,
  Trash2,
  Users,
  User,
} from 'lucide-vue-next';
import legalLogo from '../assets/legal-logo.png';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import { useChatHistory, type ChatHistoryItem } from '../stores/chatHistory';

const router = useRouter();
const route = useRoute();
const { recentHistory, renameConversation, deleteConversation } = useChatHistory();

const isCollapsed = ref(false);
const openHistoryMenuId = ref('');
const historyMenuPosition = ref({ top: 0, left: 0 });
const renamingHistoryId = ref('');
const historyRenameValue = ref('');
const pendingDeleteHistoryItem = ref<ChatHistoryItem | null>(null);

const activeHistoryMenuItem = computed(() =>
  recentHistory.value.find((item) => item.id === openHistoryMenuId.value) ?? null
);

const closeHistoryMenu = () => {
  openHistoryMenuId.value = '';
};

const closeDeleteConfirm = () => {
  pendingDeleteHistoryItem.value = null;
};

const handleItemClick = (routeName: string) => {
  if (routeName) {
    closeHistoryMenu();
    router.push({ name: routeName });
  }
};

const isActive = (routeName: string) => {
  return route.name === routeName;
};

const isHistoryActive = (item: ChatHistoryItem) => {
  return route.name === 'chat'
    && (
      route.query.historyId === item.id
      || route.query.prompt === item.prompt
      || (item.mock && route.query.mock === item.mock)
    );
};

const isKnowledgeActive = computed(() => {
  return ['knowledge'].includes(String(route.name ?? ''));
});

const isKnowledgeExpanded = ref(false);

const toggleKnowledgeExpanded = () => {
  isKnowledgeExpanded.value = !isKnowledgeExpanded.value;
};

const toggleSidebarCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
  if (isCollapsed.value) {
    isKnowledgeExpanded.value = false;
    closeHistoryMenu();
  }
};

const handleKnowledgeClick = () => {
  if (isCollapsed.value) {
    handleItemClick('knowledge');
    return;
  }
  toggleKnowledgeExpanded();
};

const handleHistoryClick = (item: ChatHistoryItem) => {
  closeHistoryMenu();
  const query: Record<string, string> = {
    prompt: item.prompt,
    historyId: item.id,
  };

  if (item.mock) {
    query.mock = item.mock;
  }

  router.push({
    name: 'chat',
    query,
  });
};

const openHistoryMenu = (item: ChatHistoryItem, event: MouseEvent) => {
  event.stopPropagation();

  if (openHistoryMenuId.value === item.id) {
    closeHistoryMenu();
    return;
  }

  const trigger = event.currentTarget as HTMLElement | null;
  const rect = trigger?.getBoundingClientRect();
  const menuWidth = 144;
  const menuHeight = 94;
  const left = rect ? rect.right + 6 : 0;
  const top = rect ? rect.top - 8 : 0;

  historyMenuPosition.value = {
    left: Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8)),
    top: Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8)),
  };
  openHistoryMenuId.value = item.id;
};

const startRenameHistory = (item: ChatHistoryItem) => {
  historyRenameValue.value = item.title === '新会话' ? '' : item.title;
  renamingHistoryId.value = item.id;
  closeHistoryMenu();

  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-history-rename-input="true"]');
    input?.focus();
    input?.select();
  });
};

const cancelHistoryRename = () => {
  renamingHistoryId.value = '';
  historyRenameValue.value = '';
};

const submitHistoryRename = (item: ChatHistoryItem) => {
  if (renamingHistoryId.value !== item.id) return;

  const nextTitle = historyRenameValue.value.trim();
  if (nextTitle) {
    renameConversation(item.id, nextTitle);
  }

  cancelHistoryRename();
};

const removeHistoryItem = (item: ChatHistoryItem) => {
  closeHistoryMenu();
  pendingDeleteHistoryItem.value = item;
};

const confirmRemoveHistoryItem = () => {
  const item = pendingDeleteHistoryItem.value;
  if (!item) return;

  const wasActive = isHistoryActive(item);
  const removed = deleteConversation(item.id);
  closeDeleteConfirm();

  if (removed && wasActive) {
    void router.push({ name: 'home' });
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    closeHistoryMenu();
    return;
  }

  if (
    target.closest('.history-menu-popover')
    || target.closest('.history-more')
    || target.closest('.history-rename-input')
  ) {
    return;
  }

  closeHistoryMenu();
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

const knowledgeItems = [
  { icon: Network, label: '团队知识库', routeName: 'knowledge', activeOnKnowledge: true },
  { icon: User, label: '个人知识库', routeName: 'knowledge', activeOnKnowledge: false },
  { icon: Lock, label: '隐藏知识库', routeName: 'knowledge', activeOnKnowledge: false },
];

const bottomItems = [
  { icon: Users, label: '团队管理', routeName: 'team' },
  { icon: User, label: '个人中心', routeName: 'profile-basic' },
];
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <div class="logo-area">
        <div class="logo-icon">
          <img :src="legalLogo" alt="涌见AI" />
        </div>
        <div class="logo-text">
          <span class="logo-brand">涌见AI</span>
        </div>
      </div>

      <button
        class="sidebar-collapse"
        type="button"
        :aria-label="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
        :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="toggleSidebarCollapsed"
      >
        <ChevronRight v-if="isCollapsed" :size="16" :stroke-width="2.4" />
        <ChevronLeft v-else :size="16" :stroke-width="2.4" />
      </button>
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item"
        :class="{ active: isActive('home') }"
        aria-label="首页"
        :title="isCollapsed ? '首页' : undefined"
        @click="handleItemClick('home')"
      >
        <Home :size="18" class="nav-icon" />
        <span class="nav-label">首页</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('legal-search') }"
        aria-label="法律搜索"
        :title="isCollapsed ? '法律搜索' : undefined"
        @click="handleItemClick('legal-search')"
      >
        <Scale :size="18" class="nav-icon" />
        <span class="nav-label">法律搜索</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('skills') }"
        aria-label="技能"
        :title="isCollapsed ? '技能' : undefined"
        @click="handleItemClick('skills')"
      >
        <Sparkles :size="18" class="nav-icon" />
        <span class="nav-label">技能</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('templates') }"
        aria-label="模板"
        :title="isCollapsed ? '模板' : undefined"
        @click="handleItemClick('templates')"
      >
        <FileText :size="18" class="nav-icon" />
        <span class="nav-label">模板</span>
      </button>

      <button
        class="nav-item nav-item-with-toggle"
        type="button"
        :class="{ 'parent-active': isKnowledgeActive }"
        :title="isCollapsed ? '知识库' : undefined"
        :aria-expanded="!isCollapsed && isKnowledgeExpanded"
        :aria-label="isCollapsed ? '知识库' : isKnowledgeExpanded ? '收起知识库菜单' : '展开知识库菜单'"
        @click="handleKnowledgeClick"
      >
        <KnowledgeSearchIcon :size="18" class="nav-icon" />
        <span class="nav-label">知识库</span>
        <ChevronUp v-if="isKnowledgeExpanded" :size="15" class="submenu-arrow" />
        <ChevronDown v-else :size="15" class="submenu-arrow" />
      </button>

      <div v-if="isKnowledgeExpanded" class="knowledge-submenu">
        <button
          v-for="item in knowledgeItems"
          :key="item.label"
          class="submenu-item"
          :class="{ active: isKnowledgeActive && item.activeOnKnowledge }"
          @click="handleItemClick(item.routeName)"
        >
          <component :is="item.icon" :size="15" class="submenu-icon" />
          <span>{{ item.label }}</span>
        </button>
        <button class="submenu-item group-item" @click="handleItemClick('knowledge')">
          <Users :size="15" class="submenu-icon" />
          <span>小组知识库</span>
          <Plus :size="14" class="group-plus" />
          <ChevronDown :size="14" class="group-chevron" />
        </button>
      </div>

      <section class="history-section" aria-label="历史会话">
        <div
          class="nav-item history-group-label"
          :title="isCollapsed ? '历史会话' : undefined"
        >
          <History :size="18" class="nav-icon" />
          <span class="nav-label">历史会话</span>
        </div>
        <div
          v-for="item in recentHistory"
          :key="item.id"
          class="history-row"
          :class="{ active: isHistoryActive(item), 'menu-open': openHistoryMenuId === item.id }"
        >
          <input
            v-if="renamingHistoryId === item.id"
            v-model="historyRenameValue"
            class="history-rename-input"
            data-history-rename-input="true"
            maxlength="18"
            aria-label="重命名历史会话"
            @click.stop
            @keydown.enter.prevent="submitHistoryRename(item)"
            @keydown.esc.prevent="cancelHistoryRename"
            @blur="submitHistoryRename(item)"
          />
          <button
            v-else
            class="history-item"
            :title="isCollapsed ? item.title : undefined"
            @click="handleHistoryClick(item)"
          >
            <span class="history-title">{{ item.title }}</span>
          </button>
          <button
            v-if="renamingHistoryId !== item.id"
            class="history-more"
            type="button"
            :aria-label="`打开 ${item.title} 的更多操作`"
            :aria-expanded="openHistoryMenuId === item.id"
            @click="openHistoryMenu(item, $event)"
          >
            <MoreHorizontal :size="16" />
          </button>
        </div>
      </section>
    </nav>

    <div class="sidebar-footer">
      <button
        v-for="(item, index) in bottomItems"
        :key="index"
        class="nav-item footer-item"
        :class="{ active: isActive(item.routeName) }"
        :aria-label="item.label"
        :title="isCollapsed ? item.label : undefined"
        @click="handleItemClick(item.routeName)"
      >
        <component :is="item.icon" :size="18" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>

  </aside>

  <Teleport to="body">
    <div
      v-if="activeHistoryMenuItem"
      class="history-menu-popover"
      :style="{ top: `${historyMenuPosition.top}px`, left: `${historyMenuPosition.left}px` }"
      role="menu"
      @click.stop
    >
      <button
        type="button"
        class="history-menu-item"
        role="menuitem"
        @click="startRenameHistory(activeHistoryMenuItem)"
      >
        <Pencil :size="16" />
        <span>重命名</span>
      </button>
      <button
        type="button"
        class="history-menu-item danger"
        role="menuitem"
        @click="removeHistoryItem(activeHistoryMenuItem)"
      >
        <Trash2 :size="16" />
        <span>删除</span>
      </button>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="pendingDeleteHistoryItem"
      class="history-confirm-backdrop"
      role="presentation"
      @click.self="closeDeleteConfirm"
    >
      <section
        class="history-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-delete-title"
      >
        <div class="history-confirm-icon">
          <Trash2 :size="22" />
        </div>
        <div class="history-confirm-copy">
          <h2 id="history-delete-title">删除历史会话</h2>
          <p>确定删除“{{ pendingDeleteHistoryItem.title }}”吗？删除后将无法在历史会话中恢复。</p>
        </div>
        <div class="history-confirm-actions">
          <button type="button" class="history-confirm-cancel" @click="closeDeleteConfirm">
            取消
          </button>
          <button type="button" class="history-confirm-delete" @click="confirmRemoveHistoryItem">
            删除
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.sidebar {
  position: relative;
  width: 201px;
  background: var(--sidebar-bg);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 15px 8px 14px;
  flex-shrink: 0;
  border-right: 1px solid var(--sidebar-border);
  transition:
    width 0.2s ease,
    padding 0.2s ease;
}

.sidebar.collapsed {
  width: 64px;
  padding: 15px 8px 14px;
}

.sidebar-collapse {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--primary-color) 18%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--card-bg) 64%, transparent);
  color: var(--text-secondary);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.sidebar-collapse:hover,
.sidebar-collapse:focus-visible {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-color);
}

.sidebar-header {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding: 0 4px 0 10px;
}

.sidebar.collapsed .sidebar-header {
  padding: 0;
  min-height: 72px;
  flex-direction: column;
  justify-content: flex-start;
  gap: 8px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar.collapsed .logo-area {
  justify-content: center;
  gap: 0;
}

.logo-icon {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar.collapsed .logo-icon {
  width: 32px;
  height: 32px;
}

.logo-icon img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.sidebar.collapsed .logo-text {
  display: none;
}

.logo-brand {
  font-size: 19px;
  font-weight: 700;
  color: var(--sidebar-active-text);
  letter-spacing: 0;
}

.logo-subtitle {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary-color);
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-radius: 8px;
  color: var(--text-sidebar);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 3px;
  font-size: 16px;
  position: relative;
  font-weight: 500;
  min-height: 38px;
  text-align: left;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 9px 0;
}

.nav-item:hover {
  background-color: var(--sidebar-hover-bg);
  color: var(--primary-color);
}

.nav-item:focus,
.submenu-item:focus {
  outline: none;
}

.nav-item.active {
  background-color: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
  font-weight: 600;
}

.nav-item.parent-active {
  color: var(--text-sidebar);
  background: transparent;
}

.nav-item-with-toggle {
  justify-content: flex-start;
}

.nav-icon {
  margin-right: 10px;
  flex-shrink: 0;
}

.sidebar.collapsed .nav-icon {
  margin-right: 0;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
}

.sidebar.collapsed .nav-label,
.sidebar.collapsed .submenu-arrow,
.sidebar.collapsed .hot-badge-fire,
.sidebar.collapsed .knowledge-submenu {
  display: none;
}

.submenu-arrow {
  margin-left: auto;
  color: var(--text-secondary);
}

.hot-badge-fire {
  font-size: 18px;
  margin-left: auto;
  line-height: 1;
}

.knowledge-submenu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: -1px 0 4px 18px;
}

.submenu-item {
  width: 166px;
  min-height: 35px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--text-sidebar);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.submenu-item:hover,
.submenu-item.active {
  color: var(--sidebar-active-text);
  background: var(--primary-soft);
}

.submenu-item.active {
  font-weight: 700;
}

.submenu-icon {
  flex-shrink: 0;
}

.group-item span {
  flex: 1;
  white-space: nowrap;
}

.group-plus {
  color: var(--primary-color);
}

.group-chevron {
  color: var(--text-secondary);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
}

.sidebar-footer {
  padding-top: 12px;
  margin-top: auto;
  border-top: 0;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0 8px;
  margin-top: 0;
  border-bottom: 0;
}

.history-group-label {
  cursor: default;
  margin-bottom: 4px;
}

.history-group-label:hover {
  background: transparent;
  color: var(--text-sidebar);
}

.history-row {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  border-radius: 8px;
  color: var(--text-sidebar);
  transition: all 0.2s ease;
}

.history-row:hover,
.history-row.active,
.history-row.menu-open {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
}

.history-item {
  min-width: 0;
  flex: 1;
  min-height: 32px;
  display: flex;
  align-items: center;
  padding: 5px 34px 5px 40px;
  color: inherit;
  text-align: left;
}

.history-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
}

.history-more {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--text-muted);
  opacity: 0;
  transform: translateY(-50%);
  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.history-row:hover .history-more,
.history-row.menu-open .history-more,
.history-more:focus-visible {
  opacity: 1;
}

.history-more:hover,
.history-more[aria-expanded="true"] {
  background: var(--card-bg);
  color: var(--text-secondary);
}

.history-rename-input {
  min-width: 0;
  flex: 1;
  height: 28px;
  margin: 2px 34px 2px 34px;
  padding: 0 7px;
  border: 1px solid var(--primary-border);
  border-radius: 7px;
  outline: 0;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  line-height: 28px;
}

.history-rename-input:focus {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus-ring) 20%, transparent);
}

.sidebar.collapsed .history-row {
  display: none;
}

.history-menu-popover {
  position: fixed;
  z-index: 1000;
  width: 144px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.history-menu-item {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.history-menu-item:hover,
.history-menu-item:focus-visible {
  background: var(--surface-soft);
  outline: 0;
}

.history-menu-item.danger {
  color: var(--diff-removed);
}

.history-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(6px);
}

.history-confirm-dialog {
  width: min(380px, 100%);
  padding: 22px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.history-confirm-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-radius: 10px;
  color: var(--diff-removed);
  background: var(--diff-removed-soft);
}

.history-confirm-copy h2 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.35;
}

.history-confirm-copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.65;
}

.history-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.history-confirm-actions button {
  min-width: 78px;
  height: 36px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 650;
}

.history-confirm-cancel {
  color: var(--text-secondary);
  background: var(--surface-soft);
}

.history-confirm-cancel:hover {
  color: var(--text-main);
  background: var(--border-soft);
}

.history-confirm-delete {
  color: #ffffff;
  background: var(--diff-removed);
}

.history-confirm-delete:hover {
  background: color-mix(in srgb, var(--diff-removed) 88%, #000000);
}

.footer-item {
  color: var(--text-sidebar);
  font-size: 16px;
  margin-bottom: 4px;
}

.guide-item {
  margin-bottom: 8px;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

.sidebar-nav:hover::-webkit-scrollbar-thumb {
  background: var(--border-color);
}

@media (max-width: 768px) {
  .sidebar {
    width: 64px;
    padding: 15px 8px 14px;
  }

  .sidebar-header {
    min-height: 72px;
    flex-direction: column;
    justify-content: flex-start;
    gap: 8px;
    padding: 0;
  }

  .logo-area {
    justify-content: center;
    gap: 0;
  }

  .logo-text,
  .nav-label,
  .submenu-arrow,
  .hot-badge-fire,
  .knowledge-submenu,
  .history-row {
    display: none;
  }

  .nav-item {
    justify-content: center;
    padding: 9px 0;
  }

  .nav-icon {
    margin-right: 0;
  }

  .history-group-label {
    margin-bottom: 0;
  }
}
</style>
