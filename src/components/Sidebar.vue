<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  MoreHorizontal,
  Pencil,
  Puzzle,
  Scale,
  Trash2,
  User,
  Workflow,
} from 'lucide-vue-next';
import legalLogo from '../assets/legal-logo.png';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import LawAgentsLogoIcon from './icons/LawAgentsLogoIcon.vue';
import LawAgentsNavIcon from './icons/LawAgentsNavIcon.vue';
import { useChatHistory, type ChatHistoryItem } from '../stores/chatHistory';
import { useOrgSession } from '../stores/orgSession';
import { useTheme } from '../stores/theme';

const router = useRouter();
const route = useRoute();
const { recentHistory, renameConversation, deleteConversation } = useChatHistory();
const { currentOrganization, currentUser } = useOrgSession();
const { currentThemeId } = useTheme();

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
      || (item.mock && route.query.mock === item.mock)
    );
};

const isKnowledgeActive = computed(() => {
  return ['knowledge'].includes(String(route.name ?? ''));
});
const isHistoryPageActive = computed(() => route.name === 'history');
const isProfileActive = computed(() => route.path.startsWith('/profile'));
const isLawAgentsTheme = computed(() => currentThemeId.value === 'lawagents-standalone-v1');
const profileDisplayName = computed(() => {
  const user = currentUser.value;
  if (!user) return '个人中心';

  const name = user.displayName?.trim() || user.phone || '个人中心';
  const suffix = user.phone?.slice(-4);
  return suffix && !name.includes(suffix) ? `${name} · ${suffix}` : name;
});
const profileMeta = computed(() =>
  currentUser.value?.firmShortName?.trim()
  || currentOrganization.value?.shortName
  || currentOrganization.value?.name
  || '个人中心'
);
const profileAvatarText = computed(() =>
  currentUser.value?.avatarText
  || currentOrganization.value?.avatarText
  || '律'
);
const hasProfileAvatarImage = computed(() => Boolean(currentUser.value?.avatarDataUrl));
const profileAvatarStyle = computed(() => {
  const avatarDataUrl = currentUser.value?.avatarDataUrl;
  return avatarDataUrl ? { backgroundImage: `url(${JSON.stringify(avatarDataUrl)})` } : undefined;
});

const toggleSidebarCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
  if (isCollapsed.value) {
    closeHistoryMenu();
  }
};

const handleKnowledgeClick = () => {
  handleItemClick('knowledge');
};

const handleHistoryClick = (item: ChatHistoryItem) => {
  closeHistoryMenu();
  const query: Record<string, string> = {
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

const handleHistoryPageClick = () => {
  closeHistoryMenu();
  void router.push({ name: 'history' });
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
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <div class="logo-area">
        <div class="logo-icon">
          <LawAgentsLogoIcon
            v-if="isLawAgentsTheme"
            :size="isCollapsed ? 32 : 36"
            :radius="isCollapsed ? 8 : 9"
          />
          <img v-else :src="legalLogo" alt="涌见AI" />
        </div>
        <div class="logo-text">
          <span class="logo-brand">
            <template v-if="isLawAgentsTheme">
              涌见 <span class="logo-brand-ai">AI</span>
            </template>
            <template v-else>涌见AI</template>
          </span>
        </div>
      </div>

      <button
        class="sidebar-collapse"
        type="button"
        :aria-label="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
        :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="toggleSidebarCollapsed"
      >
        <LawAgentsNavIcon
          v-if="isLawAgentsTheme"
          :kind="isCollapsed ? 'chevron-right' : 'chevron-left'"
          :size="16"
        />
        <ChevronRight v-else-if="isCollapsed" :size="16" :stroke-width="2.4" />
        <ChevronLeft v-else :size="16" :stroke-width="2.4" />
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="sidebar-nav-main">
        <button
          class="nav-item"
          :class="{ active: isActive('home') }"
          aria-label="助手"
          :title="isCollapsed ? '助手' : undefined"
          @click="handleItemClick('home')"
        >
          <LawAgentsNavIcon v-if="isLawAgentsTheme" kind="assistant" :size="18" class="nav-icon" />
          <Workflow v-else :size="18" class="nav-icon" />
          <span class="nav-label">助手</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('skills') }"
          aria-label="技能"
          :title="isCollapsed ? '技能' : undefined"
          @click="handleItemClick('skills')"
        >
          <LawAgentsNavIcon v-if="isLawAgentsTheme" kind="skills" :size="18" class="nav-icon" />
          <Puzzle v-else :size="18" class="nav-icon" />
          <span class="nav-label">技能</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('templates') }"
          aria-label="模板"
          :title="isCollapsed ? '模板' : undefined"
          @click="handleItemClick('templates')"
        >
          <LawAgentsNavIcon v-if="isLawAgentsTheme" kind="templates" :size="18" class="nav-icon" />
          <FileText v-else :size="18" class="nav-icon" />
          <span class="nav-label">模板</span>
        </button>

        <button
          class="nav-item"
          type="button"
          :class="{ active: isKnowledgeActive }"
          :title="isCollapsed ? '知识库' : undefined"
          aria-label="知识库"
          @click="handleKnowledgeClick"
        >
          <LawAgentsNavIcon v-if="isLawAgentsTheme" kind="knowledge" :size="18" class="nav-icon" />
          <KnowledgeSearchIcon v-else :size="18" class="nav-icon" />
          <span class="nav-label">知识库</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('legal-search') }"
          aria-label="法律搜索"
          :title="isCollapsed ? '法律搜索' : undefined"
          @click="handleItemClick('legal-search')"
        >
          <LawAgentsNavIcon v-if="isLawAgentsTheme" kind="search" :size="18" class="nav-icon" />
          <Scale v-else :size="18" class="nav-icon" />
          <span class="nav-label">法律搜索</span>
        </button>

        <section class="history-section" aria-label="历史会话">
          <button
            type="button"
            class="nav-item history-group-label"
            :class="{ active: isHistoryPageActive }"
            :title="isCollapsed ? '历史会话' : undefined"
            @click="handleHistoryPageClick"
          >
            <LawAgentsNavIcon v-if="isLawAgentsTheme" kind="history" :size="18" class="nav-icon" />
            <History v-else :size="18" class="nav-icon" />
            <span class="nav-label">历史会话</span>
          </button>
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
              maxlength="38"
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
      </div>

      <div class="sidebar-nav-bottom">
        <button
          class="nav-item profile-nav-item"
          :class="{ active: isProfileActive, 'lawagents-profile-item': isLawAgentsTheme }"
          aria-label="个人中心"
          :title="isCollapsed ? '个人中心' : undefined"
          @click="handleItemClick('profile')"
        >
          <template v-if="isLawAgentsTheme">
            <span
              class="lawagents-profile-avatar"
              :class="{ 'has-image': hasProfileAvatarImage }"
              :style="profileAvatarStyle"
            >
              <span v-if="!hasProfileAvatarImage">{{ profileAvatarText }}</span>
            </span>
            <span class="lawagents-profile-copy">
              <span class="lawagents-profile-name">{{ profileDisplayName }}</span>
              <span class="lawagents-profile-sub">{{ profileMeta }}</span>
            </span>
            <LawAgentsNavIcon kind="chevron-right" :size="14" class="lawagents-profile-chevron" />
          </template>
          <template v-else>
            <User :size="18" class="nav-icon" />
            <span class="nav-label">个人中心</span>
          </template>
        </button>
      </div>
    </nav>

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

.organization-switcher {
  position: relative;
  margin: 0 0 10px;
}

.option-avatar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-weight: 750;
}

.sidebar.collapsed .organization-switcher {
  margin-bottom: 8px;
}

.sidebar.collapsed .footer-profile-trigger {
  width: 100%;
  justify-content: center;
  padding: 9px 0;
}

.sidebar.collapsed .profile-trigger-chevron {
  display: none;
}

.organization-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: auto;
  z-index: 30;
  width: 292px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.organization-popover-title {
  padding: 2px 8px 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.organization-option {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 8px;
  color: var(--text-main);
  text-align: left;
}

.organization-option:hover,
.organization-option.active {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.organization-option.compact {
  min-height: 36px;
  display: flex;
  font-size: 14px;
  font-weight: 500;
}

.organization-option.danger {
  color: var(--diff-removed);
}

.option-avatar {
  width: 30px;
  height: 30px;
  font-size: 13px;
}

.option-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.option-name,
.option-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-name {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 650;
}

.option-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.option-check {
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-nav-main {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}

.sidebar-nav-bottom {
  flex: 0 0 auto;
  padding-top: 8px;
  margin-top: auto;
}

.profile-nav-item {
  margin-bottom: 0;
}

.sidebar-footer {
  padding-top: 12px;
  margin-top: auto;
  border-top: 0;
}

.footer-organization {
  margin: 0 0 4px;
}

.footer-profile-trigger {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 7px 8px 7px 12px;
  border-radius: 8px;
  color: var(--text-sidebar);
  text-align: left;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.footer-profile-trigger:hover,
.footer-profile-trigger.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
}

.profile-trigger-chevron {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.footer-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.footer-label,
.footer-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-label {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}

.footer-meta {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}

.footer-organization .organization-popover {
  top: auto;
  bottom: calc(100% + 8px);
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
  cursor: pointer;
  margin-bottom: 4px;
}

.history-group-label:hover {
  background: var(--sidebar-hover-bg);
  color: var(--primary-color);
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
  font-size: 15px;
  margin-bottom: 4px;
  min-height: 42px;
}

.profile-footer-item {
  align-items: center;
}

.guide-item {
  margin-bottom: 8px;
}

.sidebar-nav-main::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav-main::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

.sidebar-nav-main:hover::-webkit-scrollbar-thumb {
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
  .footer-copy,
  .profile-trigger-chevron,
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

  .footer-profile-trigger {
    width: 100%;
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
