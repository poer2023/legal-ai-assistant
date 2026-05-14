<script setup lang="ts">
import { computed, ref } from 'vue';
import { Camera, Edit3 } from 'lucide-vue-next';
import { useOrgSession } from '../stores/orgSession';

const canEdit = ref(true);
const { currentOrganization } = useOrgSession();

const teamInfo = computed(() => {
  const organization = currentOrganization.value;

  return [
    { label: '团队名称', value: organization?.name ?? '未选择组织' },
    { label: '团队简称', value: organization?.shortName ?? '-' },
    { label: '当前角色', value: organization?.role ?? '-' },
    { label: '团队规模', value: organization ? `${organization.memberCount}人` : '-' },
    { label: '团队套餐', value: organization?.planName ?? '-' },
    { label: '团队有效期', value: '无' },
    { label: '学术搜索次数', value: '95次/100次' },
    { label: '共享硬币', value: '0/0硬币' },
    { label: '提问次数', value: organization?.questionUsage ?? '-' },
    { label: '知识库空间', value: organization?.storageUsage ?? '-' },
  ];
});
</script>

<template>
  <div class="team-overview-page">
    <div class="team-overview-header">
      <h2>团队概览</h2>
    </div>

    <section class="team-info-card">
      <div v-if="canEdit" class="card-topline">
        <div class="card-title">团队信息</div>
        <button class="edit-button">
          <Edit3 :size="16" />
          <span>编辑</span>
        </button>
      </div>

      <div class="info-row logo-row">
        <div class="info-label">团队LOGO</div>
        <div class="logo-editor">
          <div class="team-logo">
            <span>{{ currentOrganization?.avatarText ?? '组' }}</span>
          </div>
          <div class="logo-overlay">
            <Camera :size="22" />
          </div>
        </div>
      </div>

      <div v-for="item in teamInfo" :key="item.label" class="info-row">
        <div class="info-label">{{ item.label }}</div>
        <div class="info-value">{{ item.value }}</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.team-overview-page {
  width: 100%;
  min-height: 100%;
  padding: 32px 16px;
  color: var(--text-main);
}

.team-overview-header {
  width: min(896px, 100%);
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team-overview-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 650;
}

.team-info-card {
  width: min(896px, 100%);
  min-height: calc(100vh - 128px);
  margin: 0 auto;
  padding: 48px 64px;
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}

.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.card-title {
  min-width: 120px;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 700;
}

.edit-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 500;
}

.edit-button:hover {
  background: var(--primary-soft);
}

.info-row {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 8px;
  margin-bottom: 10px;
}

.logo-row {
  min-height: 102px;
}

.info-label {
  min-width: 160px;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 500;
}

.info-value {
  min-height: 40px;
  display: flex;
  align-items: center;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 400;
}

.logo-editor {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 999px;
}

.team-logo {
  width: 96px;
  height: 96px;
  border: 4px solid var(--card-bg);
  border-radius: 999px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: linear-gradient(135deg, var(--primary-color), var(--focus-ring));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-primary);
  font-size: 34px;
  font-weight: 800;
}

.logo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.36);
  color: var(--border-color);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.logo-editor:hover .logo-overlay {
  opacity: 1;
}

@media (max-width: 768px) {
  .team-overview-page {
    padding: 24px 14px;
  }

  .team-overview-header {
    margin-bottom: 24px;
  }

  .team-info-card {
    padding: 28px 18px;
  }

  .info-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    min-height: auto;
    margin-bottom: 18px;
  }

  .info-label {
    min-width: 0;
  }
}
</style>
