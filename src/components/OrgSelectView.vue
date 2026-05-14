<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Building2, CheckCircle2, LogOut, Users } from 'lucide-vue-next';
import { useOrgSession } from '../stores/orgSession';

const route = useRoute();
const router = useRouter();
const {
  currentOrganizationId,
  organizations,
  removeOrganization,
  selectOrganization,
} = useOrgSession();

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;
  if (
    typeof redirect !== 'string'
    || !redirect
    || redirect.startsWith('/login')
    || redirect.startsWith('/org/select')
  ) {
    return '/';
  }
  return redirect;
});

const handleSelectOrganization = async (organizationId: string) => {
  if (!selectOrganization(organizationId)) return;
  await router.replace(redirectTarget.value);
};

const handleLeaveOrganization = (organizationId: string) => {
  removeOrganization(organizationId);
};
</script>

<template>
  <main class="org-select-page">
    <section class="org-select-shell" aria-label="管理我的组织">
      <header class="org-select-header">
        <div class="org-title-area">
          <h1>管理我的组织</h1>
          <p>选择当前使用的组织，或管理你已加入的组织。</p>
        </div>
      </header>

      <div v-if="organizations.length" class="organization-list">
        <article
          v-for="organization in organizations"
          :key="organization.id"
          class="organization-item"
          :class="{ active: organization.id === currentOrganizationId }"
        >
          <button class="organization-select-action" type="button" @click="handleSelectOrganization(organization.id)">
            <span class="organization-avatar">{{ organization.avatarText }}</span>
            <span class="organization-main">
              <span class="organization-name">{{ organization.name }}</span>
              <span class="organization-meta">
                <Users :size="14" />
                <span>{{ organization.memberCount }} 人</span>
                <span>{{ organization.role }}</span>
                <span>{{ organization.planName }}</span>
              </span>
            </span>
            <CheckCircle2 v-if="organization.id === currentOrganizationId" :size="20" class="selected-icon" />
            <Building2 v-else :size="20" class="building-icon" />
          </button>
          <button
            class="leave-organization-button"
            type="button"
            :aria-label="`退出组织：${organization.name}`"
            @click.stop="handleLeaveOrganization(organization.id)"
          >
            <LogOut :size="15" />
            <span>退出组织</span>
          </button>
        </article>
      </div>

      <section v-else class="empty-organization-state" aria-label="尚未加入组织">
        <div class="empty-icon">
          <Building2 :size="28" />
        </div>
        <h2>尚未加入任何组织</h2>
        <p>当前账号没有可进入的组织。需要加入组织后才能使用产品，这里用于演示无团队账号的受限状态。</p>
        <div class="empty-actions">
          <button class="primary-empty-action" type="button" disabled>等待组织邀请</button>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.org-select-page {
  width: 100%;
  min-height: 100%;
  padding: 42px 28px;
  background: var(--bg-color);
  color: var(--text-main);
}

.org-select-shell {
  width: min(840px, 100%);
  margin: 0 auto;
  padding: 28px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-soft);
}

.org-select-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.org-title-area {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.org-select-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 650;
}

.org-select-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.organization-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.organization-item {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 92px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  text-align: left;
}

.organization-item:hover {
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.organization-item.active {
  border-color: var(--primary-color);
  background: var(--primary-soft);
}

.organization-select-action {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 66px;
  color: inherit;
  text-align: left;
}

.organization-avatar {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 18px;
  font-weight: 750;
}

.organization-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.organization-name {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.selected-icon {
  color: var(--primary-color);
}

.building-icon {
  color: var(--text-muted);
}

.leave-organization-button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid var(--diff-removed-border);
  border-radius: 8px;
  color: var(--diff-removed);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.leave-organization-button:hover {
  background: var(--diff-removed-soft);
}

.empty-organization-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 18px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: var(--surface-muted);
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary-color);
}

.empty-organization-state h2 {
  margin: 0 0 10px;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 650;
}

.empty-organization-state p {
  width: min(420px, 100%);
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.65;
}

.empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.primary-empty-action {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 650;
}

.primary-empty-action {
  background: var(--text-muted);
  color: var(--on-primary);
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .org-select-page {
    padding: 24px 14px;
  }

  .org-select-shell {
    padding: 20px 16px;
  }

  .org-select-header {
    align-items: stretch;
    flex-direction: column;
  }

  .org-title-area {
    flex-direction: column;
    gap: 0;
  }

  .organization-item {
    grid-template-columns: 1fr;
  }

  .organization-select-action {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .leave-organization-button {
    width: fit-content;
    justify-self: end;
  }

  .selected-icon,
  .building-icon {
    display: none;
  }
}
</style>
