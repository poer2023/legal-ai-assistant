<script setup lang="ts">
import { computed, ref } from 'vue';
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
  Network,
  Plus,
  Scale,
  Sparkles,
  Users,
  User,
} from 'lucide-vue-next';
import legalLogo from '../assets/legal-logo.png';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';
import { useChatHistory, type ChatHistoryItem } from '../stores/chatHistory';

const router = useRouter();
const route = useRoute();
const { recentHistory } = useChatHistory();

const isCollapsed = ref(false);
const handleItemClick = (routeName: string) => {
  if (routeName) {
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
        <button
          v-for="item in recentHistory"
          :key="item.id"
          class="history-item"
          :class="{ active: isHistoryActive(item) }"
          :title="isCollapsed ? item.title : undefined"
          @click="handleHistoryClick(item)"
        >
          <span class="history-title">{{ item.title }}</span>
        </button>
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

.history-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 5px 10px 5px 40px;
  border-radius: 8px;
  color: var(--text-sidebar);
  text-align: left;
  transition: all 0.2s ease;
}

.history-item:hover,
.history-item.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
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

.sidebar.collapsed .history-item {
  display: none;
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
  .history-item {
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
