<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Bot,
  ClipboardList,
  LayoutList,
  Palette,
  Smartphone,
  Users,
  UsersRound,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const menuItems = [
  { icon: LayoutList, label: '团队概览', routeName: 'team-overview', path: '/team' },
  { icon: Users, label: '成员管理', routeName: 'team-members', path: '/team/members' },
  { icon: UsersRound, label: '小组管理', routeName: 'team-groups', path: '/team/group' },
  { icon: Bot, label: '智能体管理', routeName: 'team-agents', path: '/team/agent' },
  { icon: ClipboardList, label: '咨询运营分析', routeName: 'team-consulting-analysis', path: '/team/consulting-analysis' },
  { icon: Palette, label: '主题切换', routeName: 'team-theme', path: '/team/theme' },
  { icon: Smartphone, label: '小程序管理', routeName: 'team-miniprogram', path: '/team/miniprogram' },
];

const activeMenu = computed(() => {
  const name = String(route.name ?? '');
  if (name === 'team-consulting-ops') {
    return 'team-consulting-analysis';
  }
  return name;
});

const handleMenuClick = (routeName: string) => {
  router.push({ name: routeName });
};
</script>

<template>
  <div class="team-manage-page">
    <aside class="team-side-menu">
      <nav class="team-menu-list" aria-label="团队管理">
        <button
          v-for="item in menuItems"
          :key="item.routeName"
          class="team-menu-item"
          :class="{ active: activeMenu === item.routeName }"
          @click="handleMenuClick(item.routeName)"
        >
          <component :is="item.icon" :size="18" class="menu-icon" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="team-main-panel">
      <router-view />
    </main>

    <nav class="team-mobile-menu" aria-label="团队管理移动导航">
      <button
        v-for="item in menuItems"
        :key="`mobile-${item.routeName}`"
        class="mobile-menu-item"
        :class="{ active: activeMenu === item.routeName }"
        @click="handleMenuClick(item.routeName)"
      >
        <component :is="item.icon" :size="22" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.team-manage-page {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--bg-color);
}

.team-side-menu {
  width: 256px;
  height: 100%;
  padding: 16px;
  border-right: 1px solid var(--sidebar-border);
  background: var(--team-menu-bg);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.team-menu-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
}

.team-menu-item {
  width: 100%;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-radius: 8px;
  color: var(--text-sidebar);
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
}

.team-menu-item:hover {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.team-menu-item.active {
  background: var(--primary-soft);
  color: var(--primary-color);
  font-weight: 650;
}

.menu-icon {
  flex-shrink: 0;
}

.team-main-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
}

.team-mobile-menu {
  display: none;
}

@media (max-width: 768px) {
  .team-side-menu {
    display: none;
  }

  .team-manage-page {
    padding-bottom: 74px;
  }

  .team-mobile-menu {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 6px 8px;
    border-top: 1px solid var(--sidebar-border);
    background: var(--team-menu-bg);
  }

  .mobile-menu-item {
    min-width: 64px;
    min-height: 58px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-radius: 8px;
    color: var(--text-sidebar);
    font-size: 12px;
    white-space: nowrap;
  }

  .mobile-menu-item.active {
    color: var(--primary-color);
    background: var(--primary-soft);
  }
}
</style>
