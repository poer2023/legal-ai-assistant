<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Coins,
  LayoutDashboard,
  Users,
} from 'lucide-vue-next';
import { useOrgSession } from '../stores/orgSession';

type MenuItem = {
  key: string;
  label: string;
  icon: typeof Users;
  routeName: string;
  group: 'overview' | 'manage';
};

const menuItems: MenuItem[] = [
  { key: 'overview', label: '团队概览', icon: LayoutDashboard, routeName: 'team-overview', group: 'overview' },
  { key: 'credits', label: '积分明细', icon: Coins, routeName: 'team-credits', group: 'overview' },
  { key: 'members', label: '成员管理', icon: Users, routeName: 'team-members', group: 'manage' },
];

const groupLabels: Record<MenuItem['group'], string> = {
  overview: '团队概览',
  manage: '团队管理',
};

const groupedMenu = computed(() => {
  const order: Array<MenuItem['group']> = ['overview', 'manage'];
  return order.map((group) => ({
    group,
    title: groupLabels[group],
    items: menuItems.filter((item) => item.group === group),
  }));
});

const route = useRoute();
const router = useRouter();
const { currentOrganization } = useOrgSession();

const teamName = computed(() => currentOrganization.value?.name ?? '演示团队');
const teamAvatarText = computed(() => currentOrganization.value?.avatarText ?? '团');

const activeMenuKey = computed(() => {
  const name = String(route.name ?? '');
  const item = menuItems.find((m) => m.routeName === name);
  return item?.key ?? 'overview';
});

const handleMenuClick = (item: MenuItem) => {
  if (route.name === item.routeName) return;
  void router.push({ name: item.routeName });
};
</script>

<template>
  <div class="team-admin-page">
    <aside class="team-admin-side" aria-label="团队后台导航">
      <div class="team-admin-side-header">
        <div class="team-admin-side-logo" aria-hidden="true">
          <img
            v-if="currentOrganization?.avatarDataUrl"
            :src="currentOrganization.avatarDataUrl"
            alt=""
            class="team-admin-side-logo-image"
          />
          <span v-else>{{ teamAvatarText }}</span>
        </div>
        <div class="team-admin-side-meta">
          <div class="team-admin-side-name">{{ teamName }}</div>
        </div>
      </div>

      <nav class="team-admin-menu">
        <div
          v-for="group in groupedMenu"
          :key="group.group"
          class="team-admin-menu-group"
        >
          <div class="team-admin-menu-title">{{ group.title }}</div>
          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            class="team-admin-menu-item"
            :class="{ active: activeMenuKey === item.key }"
            :aria-current="activeMenuKey === item.key ? 'page' : undefined"
            @click="handleMenuClick(item)"
          >
            <component :is="item.icon" :size="17" class="team-admin-menu-icon" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </nav>
    </aside>

    <main class="team-admin-main">
      <router-view />
    </main>

    <nav class="team-admin-mobile-bar" aria-label="团队后台移动导航">
      <button
        v-for="item in menuItems"
        :key="`m-${item.key}`"
        type="button"
        class="team-admin-mobile-item"
        :class="{ active: activeMenuKey === item.key }"
        @click="handleMenuClick(item)"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.team-admin-page {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--bg-color);
  color: var(--text-main);
}

.team-admin-side {
  width: 256px;
  flex-shrink: 0;
  height: 100%;
  padding: 20px 14px;
  border-right: 1px solid var(--sidebar-border);
  background: var(--team-menu-bg);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}

.team-admin-side-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px 14px;
  border-bottom: 1px solid var(--sidebar-border);
}

.team-admin-side-logo {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--primary-color), var(--focus-ring));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-primary);
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
}

.team-admin-side-logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.team-admin-side-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-admin-side-name {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-admin-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.team-admin-menu-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.team-admin-menu-title {
  padding: 0 10px 6px;
  color: var(--text-main);
  opacity: 0.5;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.team-admin-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-main);
  font-size: 13.5px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.team-admin-menu-item:hover {
  background: var(--primary-soft);
}

.team-admin-menu-item.active {
  background: var(--primary-color);
  color: var(--on-primary);
  font-weight: 600;
}

.team-admin-menu-item.active .team-admin-menu-icon {
  color: var(--on-primary);
}

.team-admin-menu-icon {
  flex-shrink: 0;
  color: var(--text-main);
  opacity: 0.78;
}

.team-admin-menu-item:hover .team-admin-menu-icon {
  color: var(--primary-color);
  opacity: 1;
}

.team-admin-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
}

.team-admin-mobile-bar {
  display: none;
}

@media (max-width: 900px) {
  .team-admin-side {
    display: none;
  }
  .team-admin-mobile-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    overflow-x: auto;
    gap: 4px;
    padding: 8px 12px;
    background: var(--card-bg);
    border-top: 1px solid var(--sidebar-border);
    box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.05);
    z-index: 50;
  }
  .team-admin-main {
    padding-bottom: 72px;
  }
  .team-admin-mobile-item {
    flex-shrink: 0;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-main);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    opacity: 0.7;
  }
  .team-admin-mobile-item.active {
    background: var(--primary-soft);
    color: var(--primary-color);
    opacity: 1;
  }
}
</style>
