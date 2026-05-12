<script setup lang="ts">
import { useRouter } from 'vue-router';
import AgentIcon from './AgentIcon.vue';
import type { AgentIconKind } from './AgentIcon.vue';

const router = useRouter();

type QuickAction = {
  iconKind: AgentIconKind;
  label: string;
  routeName: string;
  params?: Record<string, string>;
  isMore?: boolean;
};

const actions: QuickAction[] = [
  {
    iconKind: 'network',
    label: '网络核查',
    routeName: 'investigation-agent-demo',
    params: { agentKey: 'network-verification' },
  },
  {
    iconKind: 'flow',
    label: '资金流向',
    routeName: 'investigation-agent-demo',
    params: { agentKey: 'fund-flow' },
  },
  {
    iconKind: 'equity',
    label: '股权穿透核查',
    routeName: 'investigation-agent-demo',
    params: { agentKey: 'equity-penetration' },
  },
  { iconKind: 'word', label: '咨政报告', routeName: 'policy-advisory-report-form' },
  { iconKind: 'word', label: '类案分析报告', routeName: 'similar-case-analysis-report-form' },
  { iconKind: 'review', label: '文书审查', routeName: 'prod-document-review-form' },
  { iconKind: 'grid', label: '更多应用', isMore: true, routeName: 'agents' },
];

const handleActionClick = (action: QuickAction) => {
  if (action.routeName) {
    router.push({ name: action.routeName, params: action.params });
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
        <AgentIcon :kind="action.iconKind" />
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
  width: min(1185px, 100%);
  margin: 0 auto;
  justify-content: space-between;
}

.action-card {
  flex: 1;
  background: white;
  min-width: 0;
  min-height: 122px;
  border-radius: 8px;
  padding: 18px 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--primary-soft-strong);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: var(--border-color);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.action-label {
  font-size: 14px;
  color: var(--text-main);
  font-weight: 500;
  text-align: center;
  line-height: 1.25;
  white-space: nowrap;
}

@media (max-width: 1080px) {
  .quick-actions-row {
    flex-wrap: wrap;
    justify-content: center;
  }

  .action-card {
    flex: 0 1 150px;
  }
}

@media (max-width: 768px) {
  .quick-actions-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .action-card {
    min-height: 108px;
  }
}
</style>
