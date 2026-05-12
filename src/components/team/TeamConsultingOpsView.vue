<script setup lang="ts">
import { computed, ref } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const DAY_MS = 86400000;
const BASE_DATE = '2025-01-01';
const DEFAULT_START = '2026-03-28';
const DEFAULT_END = '2026-04-03';
const BASE_TOTAL_USERS = 7680;
const BASE_TOTAL_QUESTIONS = 286400;

const startDate = ref(DEFAULT_START);
const endDate = ref(DEFAULT_END);
const draftStartDate = ref(startDate.value);
const draftEndDate = ref(endDate.value);
const isDatePanelOpen = ref(false);
const currentPage = ref(1);
const pageSize = 31;

const numberFormatter = new Intl.NumberFormat('zh-CN');

const formatNumber = (value: number, digits = 0) => {
  if (digits === 0) {
    return numberFormatter.format(Math.round(value));
  }

  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatDateLabel = (value: string) => {
  if (!value) return '--';
  return value.split('-').join('.');
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayIndex = (dateKey: string) => {
  return Math.floor((parseDate(dateKey).getTime() - parseDate(BASE_DATE).getTime()) / DAY_MS);
};

const getSeededValue = (dateKey: string, salt: number) => {
  let hash = salt;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 33 + dateKey.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

const getDailyMockMetrics = (dateKey: string) => {
  const weekday = parseDate(dateKey).getDay();
  const dayIndex = getDayIndex(dateKey);
  const weekdayBoost = weekday === 0 || weekday === 6 ? -10 : 8;

  const newUsers = 26 + (getSeededValue(dateKey, 17) % 22) + weekdayBoost + (dayIndex % 9 === 0 ? 18 : 0);
  const dau = 150 + (getSeededValue(dateKey, 31) % 72) + Math.floor(newUsers * 0.72);
  const questions = dau * (5 + (getSeededValue(dateKey, 47) % 3)) + (getSeededValue(dateKey, 59) % 160);

  return {
    newUsers: Math.max(12, newUsers),
    dau: Math.max(80, dau),
    questions: Math.max(300, questions),
  };
};

const openDatePanel = () => {
  draftStartDate.value = startDate.value;
  draftEndDate.value = endDate.value;
  isDatePanelOpen.value = true;
};

const cancelDateSelection = () => {
  isDatePanelOpen.value = false;
};

const confirmDateSelection = () => {
  if (!draftStartDate.value || !draftEndDate.value) return;
  if (draftStartDate.value > draftEndDate.value) return;
  startDate.value = draftStartDate.value;
  endDate.value = draftEndDate.value;
  currentPage.value = 1;
  isDatePanelOpen.value = false;
};

const filteredRows = computed(() => {
  if (!startDate.value || !endDate.value) return [];

  const start = parseDate(startDate.value);
  const end = parseDate(endDate.value);
  const base = parseDate(BASE_DATE);
  const rows = [];
  let totalUsers = BASE_TOTAL_USERS;
  let totalQuestions = BASE_TOTAL_QUESTIONS;

  for (let time = base.getTime(); time <= end.getTime(); time += DAY_MS) {
    const currentDate = new Date(time);
    const dateKey = formatDateKey(currentDate);
    const dailyMetrics = getDailyMockMetrics(dateKey);

    totalUsers += dailyMetrics.newUsers;
    totalQuestions += dailyMetrics.questions;

    if (time >= start.getTime()) {
      rows.push({
        day: dateKey,
        ...dailyMetrics,
        totalUsers,
        totalQuestions,
      });
    }
  }

  return rows;
});

const selectedDayCount = computed(() => {
  if (!startDate.value || !endDate.value) return 0;
  const start = new Date(`${startDate.value}T00:00:00`);
  const end = new Date(`${endDate.value}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredRows.value.length / pageSize));
});

const pagedRows = computed(() => {
  const rows = [...filteredRows.value].reverse();
  const start = (currentPage.value - 1) * pageSize;
  return rows.slice(start, start + pageSize);
});

const showPagination = computed(() => filteredRows.value.length > pageSize);

const goPrevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
  }
};

const goNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
  }
};

const averageRow = computed(() => {
  const rows = filteredRows.value;
  if (rows.length === 0) {
    return {
      label: '日均',
      newUsers: '-',
      dau: '-',
      questions: '-',
      totalUsers: '-',
      totalQuestions: '-',
    };
  }

  const count = rows.length;

  return {
    label: '日均',
    newUsers: formatNumber(rows.reduce((sum, row) => sum + row.newUsers, 0) / count, 1),
    dau: formatNumber(rows.reduce((sum, row) => sum + row.dau, 0) / count, 1),
    questions: formatNumber(rows.reduce((sum, row) => sum + row.questions, 0) / count, 1),
    totalUsers: '-',
    totalQuestions: '-',
  };
});

const subtotalRow = computed(() => {
  const rows = filteredRows.value;
  if (rows.length === 0) {
    return {
      label: '小计',
      newUsers: '-',
      dau: '-',
      questions: '-',
      totalUsers: '-',
      totalQuestions: '-',
    };
  }

  return {
    label: '小计',
    newUsers: formatNumber(rows.reduce((sum, row) => sum + row.newUsers, 0)),
    dau: formatNumber(rows.reduce((sum, row) => sum + row.dau, 0)),
    questions: formatNumber(rows.reduce((sum, row) => sum + row.questions, 0)),
    totalUsers: '-',
    totalQuestions: '-',
  };
});

</script>

<template>
  <div class="ops-page">
    <div class="page-header">
      <h1 class="page-title">咨询运营分析</h1>
      <div class="toolbar">
        <div class="date-filter">
          <button class="date-trigger" type="button" @click="openDatePanel">
            <CalendarDays :size="15" class="date-trigger-icon" />
            <span class="date-trigger-label">{{ formatDateLabel(startDate) }} - {{ formatDateLabel(endDate) }}</span>
          </button>

          <div v-if="isDatePanelOpen" class="date-panel">
            <div class="date-panel-title">选择统计时间段</div>
            <div class="date-range">
              <label class="date-field">
                <span>开始日期</span>
                <input v-model="draftStartDate" class="date-input" type="date" :max="draftEndDate || undefined" />
              </label>
              <label class="date-field">
                <span>结束日期</span>
                <input v-model="draftEndDate" class="date-input" type="date" :min="draftStartDate || undefined" />
              </label>
            </div>
            <div class="date-panel-actions">
              <button class="panel-btn" type="button" @click="cancelDateSelection">取消</button>
              <button class="panel-btn primary" type="button" @click="confirmDateSelection">确定</button>
            </div>
          </div>
        </div>
        <button class="toolbar-btn primary">下载报表</button>
      </div>
    </div>

    <div class="data-table">
      <div class="table-row table-head">
        <span>日期（共 {{ selectedDayCount }} 天）</span>
        <span>新增人数</span>
        <span>活跃用户数</span>
        <span>提问次数</span>
        <span>累计用户数</span>
        <span>累计提问次数</span>
      </div>
      <div class="table-row table-summary">
        <span class="summary-label">{{ averageRow.label }}</span>
        <span>{{ averageRow.newUsers }}</span>
        <span>{{ averageRow.dau }}</span>
        <span>{{ averageRow.questions }}</span>
        <span>{{ averageRow.totalUsers }}</span>
        <span>{{ averageRow.totalQuestions }}</span>
      </div>
      <div class="table-row table-summary table-subtotal">
        <span class="summary-label">{{ subtotalRow.label }}</span>
        <span>{{ subtotalRow.newUsers }}</span>
        <span>{{ subtotalRow.dau }}</span>
        <span>{{ subtotalRow.questions }}</span>
        <span>{{ subtotalRow.totalUsers }}</span>
        <span>{{ subtotalRow.totalQuestions }}</span>
      </div>
      <div v-for="row in pagedRows" :key="row.day" class="table-row">
        <span>{{ row.day }}</span>
        <span>{{ row.newUsers.toLocaleString('zh-CN') }}</span>
        <span>{{ row.dau.toLocaleString('zh-CN') }}</span>
        <span>{{ row.questions.toLocaleString('zh-CN') }}</span>
        <span>{{ row.totalUsers.toLocaleString('zh-CN') }}</span>
        <span>{{ row.totalQuestions.toLocaleString('zh-CN') }}</span>
      </div>
      <div v-if="filteredRows.length === 0" class="table-row table-empty">
        <span>当前时间段暂无数据</span>
        <span>-</span>
        <span>-</span>
        <span>-</span>
        <span>-</span>
        <span>-</span>
      </div>
    </div>

    <div v-if="showPagination" class="pagination pagination-bottom">
      <button class="page-btn" type="button" :disabled="currentPage === 1" @click="goPrevPage">
        <ChevronLeft :size="14" />
      </button>
      <span class="page-text">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button class="page-btn" type="button" :disabled="currentPage === totalPages" @click="goNextPage">
        <ChevronRight :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ops-page {
  width: 100%;
  max-width: 980px;
  color: var(--text-main);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.2;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.date-filter {
  position: relative;
}

.date-trigger {
  min-width: 280px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  cursor: pointer;
}

.date-trigger-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.date-trigger-label {
  white-space: nowrap;
}

.date-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 10;
  width: 360px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  padding: 14px;
}

.date-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 12px;
}

.date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.date-input,
.toolbar-btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  line-height: 1;
}

.date-input {
  min-width: 0;
  cursor: pointer;
  appearance: none;
  width: 100%;
}

.toolbar-btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--on-primary);
}

.toolbar-btn.primary:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.date-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.panel-btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.panel-btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--on-primary);
}

.date-separator {
  font-size: 12px;
  color: var(--text-secondary);
}

.data-table {
  width: 100%;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.table-row {
  display: grid;
}

.table-row {
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr 1.3fr;
}

.table-head {
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.table-summary {
  background: var(--card-bg);
}

.table-subtotal {
  background: var(--surface-muted);
}

.table-row > span {
  min-height: 46px;
  padding: 10px 12px;
  border-right: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
  text-align: center;
  vertical-align: middle;
  font-variant-numeric: tabular-nums;
}

.table-row > span:last-child {
  border-right: none;
}

.data-table .table-row:last-child > span {
  border-bottom: none;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-bottom {
  justify-content: flex-end;
  margin-top: 10px;
}

.page-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.page-btn:disabled {
  cursor: not-allowed;
  color: var(--text-muted);
  background: var(--surface-muted);
}

.page-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.table-row > span {
  min-height: 46px;
  font-size: 12px;
  color: var(--text-main);
}

.table-head > span {
  font-weight: 600;
  color: var(--text-secondary);
}

.summary-label {
  font-weight: 600;
  color: var(--text-main);
}

.table-summary > span {
  font-weight: 600;
}

.table-empty > span {
  color: var(--text-muted);
}

@media (max-width: 1080px) {
  .ops-page {
    max-width: none;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .toolbar {
    width: 100%;
  }

  .date-filter {
    width: 100%;
  }

  .date-trigger {
    width: 100%;
  }

  .date-panel {
    width: 100%;
  }

  .date-range {
    width: 100%;
    grid-template-columns: 1fr;
  }

  .data-table {
    overflow-x: auto;
  }

  .table-row {
    min-width: 900px;
  }
}
</style>
