<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Home,
  Lock,
  MessageSquare,
  Network,
  Plus,
  Scale,
  Sparkles,
  GraduationCap,
  Users,
  User,
} from 'lucide-vue-next';
import legalLogo from '../assets/legal-logo.png';
import KnowledgeSearchIcon from './icons/KnowledgeSearchIcon.vue';

const router = useRouter();
const route = useRoute();

const isCollapsed = ref(false);
const handleItemClick = (routeName: string) => {
  if (routeName) {
    router.push({ name: routeName });
  }
};

const isActive = (routeName: string) => {
  return route.name === routeName;
};

const isSkillTemplateActive = computed(() => {
  return ['skills', 'templates'].includes(String(route.name ?? ''));
});

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
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item"
        :class="{ active: isActive('home') }"
        :title="isCollapsed ? '首页' : undefined"
        @click="handleItemClick('home')"
      >
        <Home :size="18" class="nav-icon" />
        <span class="nav-label">首页</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('chat') }"
        :title="isCollapsed ? '法律问答' : undefined"
        @click="handleItemClick('chat')"
      >
        <MessageSquare :size="18" class="nav-icon" />
        <span class="nav-label">法律问答</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('legal-search') }"
        :title="isCollapsed ? '法律搜索' : undefined"
        @click="handleItemClick('legal-search')"
      >
        <Scale :size="18" class="nav-icon" />
        <span class="nav-label">法律搜索</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('search') }"
        :title="isCollapsed ? '学术搜索' : undefined"
        @click="handleItemClick('search')"
      >
        <GraduationCap :size="18" class="nav-icon" />
        <span class="nav-label">学术搜索</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('agents') }"
        :title="isCollapsed ? '智能体' : undefined"
        @click="handleItemClick('agents')"
      >
        <Bot :size="18" class="nav-icon" />
        <span class="nav-label">智能体</span>
        <span class="hot-badge-fire">🔥</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: isSkillTemplateActive }"
        :title="isCollapsed ? '技能&模板' : undefined"
        @click="handleItemClick('skills')"
      >
        <Sparkles :size="18" class="nav-icon" />
        <span class="nav-label">技能&模板</span>
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
    </nav>

    <div class="sidebar-footer">
      <button
        v-for="(item, index) in bottomItems"
        :key="index"
        class="nav-item footer-item"
        :class="{ active: isActive(item.routeName) }"
        :title="isCollapsed ? item.label : undefined"
        @click="handleItemClick(item.routeName)"
      >
        <component :is="item.icon" :size="18" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>

    <button
      class="sidebar-collapse"
      type="button"
      :aria-label="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
      :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
      @click="toggleSidebarCollapsed"
    >
      <ChevronRight v-if="isCollapsed" :size="17" :stroke-width="2.4" />
      <ChevronLeft v-else :size="17" :stroke-width="2.4" />
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
  width: 201px;
  background: #dfeafb;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 15px 8px 14px;
  flex-shrink: 0;
  border-right: 1px solid #c9dbf5;
  transition:
    width 0.2s ease,
    padding 0.2s ease;
}

.sidebar.collapsed {
  width: 81px;
  padding: 15px 8px 14px;
}

.sidebar-collapse {
  position: absolute;
  top: 49.4%;
  right: -12px;
  z-index: 5;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d6e4ff;
  border-radius: 999px;
  background: #ffffff;
  color: #2d68ff;
  box-shadow: 0 2px 7px rgba(50, 79, 145, 0.18);
}

.sidebar-header {
  margin-bottom: 33px;
  padding: 0 12px;
}

.sidebar.collapsed .sidebar-header {
  padding: 0;
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
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  color: #2453c7;
  letter-spacing: 0;
}

.logo-subtitle {
  font-size: 12px;
  font-weight: 700;
  color: #1e40af;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-radius: 8px;
  color: #444c5f;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 7px;
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
  background-color: rgba(255, 255, 255, 0.46);
  color: #1e40af;
}

.nav-item:focus,
.submenu-item:focus {
  outline: none;
}

.nav-item.active {
  background-color: rgba(238, 246, 255, 0.82);
  color: #2453c7;
  font-weight: 600;
}

.nav-item.parent-active {
  color: #444c5f;
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
  color: #48566e;
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
  margin: -1px 0 7px 18px;
}

.submenu-item {
  width: 166px;
  min-height: 35px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 9px;
  border-radius: 8px;
  color: #3f485b;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.submenu-item:hover,
.submenu-item.active {
  color: #2453c7;
  background: #eef6ff;
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
  color: #2453c7;
}

.group-chevron {
  color: #4b5567;
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

.footer-item {
  color: #2f384d;
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
  background: #cbd5e1;
}
</style>
