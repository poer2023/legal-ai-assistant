<script setup lang="ts">
import { computed, ref } from 'vue';
import { Calendar, Info } from 'lucide-vue-next';

const teamCreditsTotal = 50_000;
const teamCreditsUsed = 12_480;
const teamCreditsRemaining = teamCreditsTotal - teamCreditsUsed;
const creditsUsagePercent = computed(() =>
  Math.round((teamCreditsUsed / teamCreditsTotal) * 100),
);

const cycleStart = '2026年05月15日';
const cycleEnd = '2026年06月15日';

const formatNumber = (value: number) => value.toLocaleString('zh-CN');

type LedgerTab = 'used' | 'earned';
const activeTab = ref<LedgerTab>('used');
const dateRangeLabel = '5月14日 ~ 5月21日';

type ModelTier = '基础' | '标准' | '高级' | '专家';
type LedgerRow = {
  id: number;
  time: string;
  source: string;
  action: string;
  tier: ModelTier;
  type: string;
  credits: number;
  cost: string;
};

const usedLedger: LedgerRow[] = [
  {
    id: 1,
    time: '2026-05-21 14:32',
    source: '王芳',
    action: '类案检索 · 民事·房屋买卖',
    tier: '高级',
    type: '消耗',
    credits: -240,
    cost: '¥1.20',
  },
  {
    id: 2,
    time: '2026-05-21 11:08',
    source: '李伟',
    action: '合同审查 · 服务采购协议',
    tier: '标准',
    type: '消耗',
    credits: -180,
    cost: '¥0.90',
  },
  {
    id: 3,
    time: '2026-05-21 09:45',
    source: '张明',
    action: '法律咨询问答',
    tier: '基础',
    type: '消耗',
    credits: -15,
    cost: '¥0.08',
  },
  {
    id: 4,
    time: '2026-05-20 17:22',
    source: '陈思',
    action: '智能体调用 · 合同审查 Pro',
    tier: '专家',
    type: '消耗',
    credits: -320,
    cost: '¥1.60',
  },
  {
    id: 5,
    time: '2026-05-20 10:05',
    source: '王芳',
    action: '法律研究报告 · 知识产权',
    tier: '高级',
    type: '消耗',
    credits: -360,
    cost: '¥1.80',
  },
  {
    id: 6,
    time: '2026-05-19 16:48',
    source: '张明',
    action: '类案检索 · 劳动争议',
    tier: '高级',
    type: '消耗',
    credits: -240,
    cost: '¥1.20',
  },
];

const earnedLedger: LedgerRow[] = [
  {
    id: 101,
    time: '2026-05-15 00:00',
    source: '系统发放',
    action: '月度积分发放',
    tier: '基础',
    type: '发放',
    credits: 5_000,
    cost: '—',
  },
  {
    id: 102,
    time: '2026-05-18 11:30',
    source: '管理员',
    action: '活动奖励补发',
    tier: '基础',
    type: '调整',
    credits: 800,
    cost: '—',
  },
];

const tableRows = computed<LedgerRow[]>(() =>
  activeTab.value === 'used' ? usedLedger : earnedLedger
);
</script>

<template>
  <div class="team-credits-page">
    <header class="team-credits-page-header">
      <h1>积分明细</h1>
      <p>查看本团队积分总量、消耗与流水记录</p>
    </header>

    <section class="team-credits-card">
      <div class="team-credits-card-head">
        <h2>团队积分</h2>
        <p>
          本计费周期团队积分使用情况（{{ cycleStart }} - {{ cycleEnd }}）。
        </p>
      </div>
      <div class="team-credits-quota">
        <div class="team-credits-quota-meta">
          <div class="team-credits-quota-main">
            <span class="team-credits-quota-used">{{ formatNumber(teamCreditsUsed) }}</span>
            <span class="team-credits-quota-divider">/</span>
            <span class="team-credits-quota-total">{{ formatNumber(teamCreditsTotal) }}</span>
            <span class="team-credits-quota-percent">（已使用 {{ creditsUsagePercent }}%）</span>
          </div>
          <div class="team-credits-quota-remaining">剩余 {{ formatNumber(teamCreditsRemaining) }} 分</div>
        </div>
        <div class="team-credits-progress">
          <div
            class="team-credits-progress-fill"
            :style="{ width: `${creditsUsagePercent}%` }"
          ></div>
        </div>
      </div>
    </section>

    <section class="team-credits-card">
      <div class="team-credits-records-head">
        <h2>积分记录</h2>
      </div>
      <div class="team-credits-records-toolbar">
        <div class="team-credits-segmented" role="tablist">
          <button
            type="button"
            role="tab"
            class="team-credits-segmented-item"
            :class="{ active: activeTab === 'used' }"
            :aria-selected="activeTab === 'used'"
            @click="activeTab = 'used'"
          >已使用</button>
          <button
            type="button"
            role="tab"
            class="team-credits-segmented-item"
            :class="{ active: activeTab === 'earned' }"
            :aria-selected="activeTab === 'earned'"
            @click="activeTab = 'earned'"
          >已获得</button>
        </div>
        <div class="team-credits-date-range">
          <Calendar :size="14" />
          <span>{{ dateRangeLabel }}</span>
        </div>
      </div>
      <div class="team-credits-note">
        <Info :size="14" />
        <span>本明细仅展示团队工作台内的积分消耗与发放。第三方模型 / BYOK 用量由模型提供方计费，不在此处汇总。</span>
      </div>
      <div class="team-credits-table">
        <div class="team-credits-table-head" role="row">
          <div role="columnheader">时间</div>
          <div role="columnheader">来源</div>
          <div role="columnheader">操作</div>
          <div role="columnheader">模型分级</div>
          <div role="columnheader">类型</div>
          <div role="columnheader" class="align-right">积分</div>
          <div role="columnheader" class="align-right">费用</div>
        </div>
        <template v-if="tableRows.length">
          <div
            v-for="row in tableRows"
            :key="row.id"
            class="team-credits-table-row"
            role="row"
          >
            <div role="cell" class="cell-time">{{ row.time }}</div>
            <div role="cell">{{ row.source }}</div>
            <div role="cell" class="cell-action" :title="row.action">{{ row.action }}</div>
            <div role="cell">
              <span class="team-credits-tier" :data-tier="row.tier">{{ row.tier }}</span>
            </div>
            <div role="cell">{{ row.type }}</div>
            <div
              role="cell"
              class="align-right cell-credits"
              :class="{ positive: row.credits > 0, negative: row.credits < 0 }"
            >
              {{ row.credits > 0 ? '+' : '' }}{{ formatNumber(row.credits) }}
            </div>
            <div role="cell" class="align-right cell-cost">{{ row.cost }}</div>
          </div>
        </template>
        <div v-else class="team-credits-empty">暂无数据。</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.team-credits-page {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 28px 28px 56px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--text-main);
}

.team-credits-page-header h1 {
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.team-credits-page-header p {
  margin: 0;
  color: var(--text-main);
  opacity: 0.72;
  font-size: 13px;
  line-height: 1.5;
}

.team-credits-card {
  border: 1px solid var(--sidebar-border);
  border-radius: 12px;
  background: var(--card-bg);
  padding: 20px 24px 22px;
}

.team-credits-card-head h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 700;
}

.team-credits-card-head p {
  margin: 6px 0 0;
  color: var(--text-main);
  opacity: 0.7;
  font-size: 12.5px;
  line-height: 1.6;
}

.team-credits-link {
  color: var(--primary-color);
  text-decoration: none;
}
.team-credits-link:hover { text-decoration: underline; }

.team-credits-quota {
  margin-top: 18px;
}

.team-credits-quota-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.team-credits-quota-main {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  color: var(--text-strong);
}

.team-credits-quota-used {
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
}

.team-credits-quota-divider {
  color: var(--text-main);
  opacity: 0.45;
  font-size: 22px;
  font-weight: 500;
}

.team-credits-quota-total {
  color: var(--text-main);
  opacity: 0.6;
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.team-credits-quota-percent {
  margin-left: 8px;
  color: var(--text-main);
  opacity: 0.6;
  font-size: 13px;
  font-weight: 500;
}

.team-credits-quota-remaining {
  color: var(--text-main);
  opacity: 0.78;
  font-size: 13px;
  font-weight: 500;
}

.team-credits-progress {
  height: 6px;
  margin-top: 14px;
  border-radius: 999px;
  background: var(--primary-soft);
  overflow: hidden;
}

.team-credits-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--primary-color);
  transition: width 0.35s ease;
}

.team-credits-shared-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.team-credits-shared-item {
  border: 1px solid var(--sidebar-border);
  border-radius: 10px;
  padding: 14px 16px 16px;
  background: var(--card-bg);
}

.team-credits-shared-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-main);
  opacity: 0.78;
  font-size: 12.5px;
  font-weight: 500;
}

.team-credits-shared-help {
  opacity: 0.55;
  cursor: help;
}

.team-credits-shared-value {
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
}

.team-credits-shared-suffix {
  margin-left: 6px;
  color: var(--text-main);
  opacity: 0.5;
  font-size: 13px;
  font-weight: 500;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.dot-used { background: #22a85f; }
.dot-limit { background: #f59e0b; }

.team-credits-records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.team-credits-records-head h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 700;
}

.team-credits-records-toolbar {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.team-credits-segmented {
  display: inline-flex;
  gap: 18px;
  border-bottom: 1px solid var(--sidebar-border);
}

.team-credits-segmented-item {
  position: relative;
  padding: 6px 0 10px;
  border: none;
  background: transparent;
  color: var(--text-main);
  opacity: 0.62;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.team-credits-segmented-item.active {
  opacity: 1;
  color: var(--text-strong);
}

.team-credits-segmented-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--primary-color);
  border-radius: 2px;
}

.team-credits-date-range {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--sidebar-border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-main);
  opacity: 0.82;
  font-size: 12.5px;
  cursor: pointer;
}

.team-credits-date-range:hover { color: var(--primary-color); border-color: var(--primary-color); opacity: 1; }

.team-credits-note {
  margin-top: 14px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--text-main);
  opacity: 0.85;
  font-size: 12px;
  line-height: 1.6;
}

.team-credits-note svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--primary-color);
  opacity: 0.85;
}

.team-credits-table {
  margin-top: 12px;
  border: 1px solid var(--sidebar-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--card-bg);
}

.team-credits-table-head,
.team-credits-table-row {
  display: grid;
  grid-template-columns: 150px 100px minmax(0, 1fr) 80px 70px 110px 80px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 12.5px;
}

.team-credits-table-head {
  background: var(--sidebar-bg, var(--primary-soft));
  color: var(--text-main);
  opacity: 0.78;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.team-credits-table-row {
  border-top: 1px solid var(--sidebar-border);
}

.cell-time {
  color: var(--text-main);
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
}

.cell-action {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-strong);
}

.cell-credits {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.cell-credits.positive { color: #1f9756; }
.cell-credits.negative { color: #e0454a; }

.cell-cost {
  color: var(--text-main);
  opacity: 0.74;
  font-variant-numeric: tabular-nums;
}

.team-credits-tier {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
}
.team-credits-tier[data-tier='基础'] {
  background: #eef1f5;
  color: #475569;
  border-color: rgba(71, 85, 105, 0.18);
}
.team-credits-tier[data-tier='标准'] {
  background: rgba(34, 168, 95, 0.1);
  color: #1f9756;
  border-color: rgba(31, 151, 86, 0.22);
}
.team-credits-tier[data-tier='高级'] {
  background: var(--primary-soft);
  color: var(--primary-color);
  border-color: color-mix(in srgb, var(--primary-color) 22%, transparent);
}
.team-credits-tier[data-tier='专家'] {
  background: rgba(245, 158, 11, 0.12);
  color: #b25c08;
  border-color: rgba(178, 92, 8, 0.24);
}

.align-right { text-align: right; }

.team-credits-empty {
  padding: 60px 16px;
  text-align: center;
  color: var(--text-main);
  opacity: 0.5;
  font-size: 13px;
}

@media (max-width: 960px) {
  .team-credits-shared-grid { grid-template-columns: 1fr; }
  .team-credits-table-head { display: none; }
  .team-credits-table-row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 14px 16px;
  }
  .team-credits-table-row .align-right { text-align: left; }
}

@media (max-width: 720px) {
  .team-credits-page { padding: 20px 16px 80px; }
  .team-credits-card { padding: 16px 16px 18px; }
  .team-credits-quota-used { font-size: 22px; }
  .team-credits-quota-divider,
  .team-credits-quota-total { font-size: 18px; }
}
</style>
