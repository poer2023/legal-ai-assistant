<script setup lang="ts">
import {
  FileText,
  Scale,
  BookOpen,
  FolderSearch,
  Mic,
  FileSearch,
  MoreHorizontal
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const actions = [
  { icon: FileText, label: '合同起草', routeName: 'contract-form' },
  { icon: Scale, label: '民事起诉状', routeName: 'civil-lawsuit-form' },
  { icon: BookOpen, label: '法律研究报告', routeName: 'legal-research-form' },
  { icon: FolderSearch, label: '证据清单整理', routeName: 'evidence-list-form' },
  { icon: Mic, label: '录音证据整理', routeName: 'audio-evidence-form' },
  { icon: FileSearch, label: '合同审查', routeName: 'contract-review-form' },
  { icon: MoreHorizontal, label: '更多应用', isMore: true, routeName: 'agents' },
];

const handleActionClick = (action: any) => {
  if (action.routeName) {
    router.push({ name: action.routeName });
  }
};
</script>

<template>
  <div class="quick-actions-row">
    <div
      v-for="(action, index) in actions"
      :key="index"
      class="action-card"
      @click="handleActionClick(action)"
    >
      <div class="icon-wrapper" :class="{ 'more-wrapper': action.isMore }">
        <component
          :is="action.icon"
          :size="24"
          :style="{ color: action.isMore ? '#6366f1' : '#2563eb' }"
        />
        <span v-if="action.isMore" class="more-badge">10</span>
      </div>
      <div class="action-label">
        {{ action.label }}
        <span v-if="action.isMore"> ›</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-actions-row {
  display: flex;
  gap: 16px;
  width: 100%;
  justify-content: space-between;
}

.action-card {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: #e2e8f0;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #eff6ff; /* Default light blue bg for icons */
}

/* Specific overrides to match the colorful icons in screenshot somewhat */
.action-card:nth-child(2) .icon-wrapper { background: #fff7ed; }
.action-card:nth-child(3) .icon-wrapper { background: #f0fdf4; }

.action-label {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  text-align: center;
}

.more-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #6366f1;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 8px;
  border: 2px solid white;
}
</style>
