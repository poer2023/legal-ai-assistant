<script setup lang="ts">
import { ref } from 'vue';
import { Camera, Edit3 } from 'lucide-vue-next';

const canEdit = ref(true);

const teamInfo = [
  { label: '团队名称', value: '演示团队' },
  { label: '团队简称', value: '涌见AI' },
  { label: '团队标语', value: 'AI法律助手' },
  { label: '团队规模', value: '10人/100人' },
  { label: '团队有效期', value: '无' },
  { label: '学术搜索次数', value: '95次/100次' },
  { label: '共享硬币', value: '0/0硬币' },
  { label: '提问次数', value: '1,040次/5万次' },
  { label: '知识库空间', value: '1.40GB/100GB' },
];
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
            <span>涌</span>
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
  color: #1f2937;
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
  color: #111827;
  font-size: 18px;
  font-weight: 650;
}

.team-info-card {
  width: min(896px, 100%);
  min-height: calc(100vh - 128px);
  margin: 0 auto;
  padding: 48px 64px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
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
  color: #333333;
  font-size: 16px;
  font-weight: 700;
}

.edit-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #2551b5;
  border-radius: 8px;
  color: #2551b5;
  font-size: 14px;
  font-weight: 500;
}

.edit-button:hover {
  background: #eff6ff;
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
  color: #333333;
  font-size: 16px;
  font-weight: 500;
}

.info-value {
  min-height: 40px;
  display: flex;
  align-items: center;
  color: #333333;
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
  border: 4px solid #ffffff;
  border-radius: 999px;
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
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
  color: #d1d5db;
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
