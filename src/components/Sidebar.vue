<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { 
  Home, 
  MessageSquare, 
  Bot, 
  BookOpen, 
  Search, 
  FileText, 
  Users,
  Scale,
  HelpCircle
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const navItems = [
  { icon: Home, label: '首页', routeName: 'home' },
  { icon: MessageSquare, label: 'AI提问', routeName: 'chat' },
  { icon: Bot, label: '智能体', routeName: 'agents', hot: true },
  { icon: Scale, label: '法律搜索', routeName: 'legal-search' },
  { icon: Search, label: '学术搜索', routeName: 'search' },
  { icon: BookOpen, label: '知识库', routeName: 'knowledge' },
];

const bottomItems = [
  { icon: HelpCircle, label: '使用攻略', routeName: 'guide' },
  { icon: FileText, label: '团队管理', routeName: 'team' },
  { icon: Users, label: '个人中心', routeName: 'profile' },
];

const handleItemClick = (routeName: string) => {
  if (routeName) {
    router.push({ name: routeName });
  }
};

const isActive = (routeName: string) => {
  return route.name === routeName;
};
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo-area">
        <div class="logo-icon">
          <Bot :size="22" />
        </div>
        <span class="logo-text">涌见AI 法律版</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div 
        v-for="(item, index) in navItems" 
        :key="index"
        class="nav-item"
        :class="{ active: isActive(item.routeName) }"
        @click="handleItemClick(item.routeName)"
      >
        <component :is="item.icon" :size="18" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="item.hot" class="hot-badge">🔥</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div 
        v-for="(item, index) in bottomItems" 
        :key="index" 
        class="nav-item footer-item"
        :class="{ active: isActive(item.routeName) }"
        @click="handleItemClick(item.routeName)"
      >
        <component :is="item.icon" :size="18" class="nav-icon" />
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 180px;
  background: linear-gradient(180deg, #e8f4fd 0%, #dbeafe 100%);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  flex-shrink: 0;
}

.sidebar-header {
  margin-bottom: 32px;
  padding: 0 8px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #2563eb;
  font-size: 16px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: #2563eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-text {
  font-size: 16px;
  letter-spacing: 0.3px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 2px;
  font-size: 14px;
  position: relative;
  font-weight: 500;
}

.nav-item:hover {
  background-color: #f8fafc;
  color: #1e40af;
}

.nav-item.active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.nav-icon {
  margin-right: 10px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
}

.hot-badge {
  font-size: 12px;
  margin-left: auto;
}

.sidebar-nav {
  flex: 1;
}

.sidebar-footer {
  padding-top: 12px;
  margin-top: auto;
  border-top: 1px solid #f1f5f9;
}

.footer-item {
  color: #64748b;
  font-size: 13px;
}

.footer-item:hover {
  color: #1e40af;
  background-color: #f8fafc;
}
</style>
