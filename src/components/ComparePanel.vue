<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Check,
  X,
  Edit3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  FileText,
  BarChart3,
  Table2,
  FileImage,
  Presentation,
  Image as ImageIcon
} from 'lucide-vue-next';

// --- Types ---
export type ChangeStatus = 'pending' | 'accepted' | 'rejected';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface CompareItem {
  id: string;
  clauseId: string;
  clauseTitle?: string;
  baseText: string;
  compareText: string;
  reason: string;
  riskLevel: RiskLevel;
  status: ChangeStatus;
  expanded: boolean;
}

export interface ComparePanelLabels {
  reviewTabLabel?: string;
  editTabLabel?: string;
  panelTitle?: string;
  baseLabel?: string;
  compareLabel?: string;
  reasonTitle?: string;
  keepBtn?: string;
  adoptBtn?: string;
  keepAllBtn?: string;
  adoptAllBtn?: string;
  keptStatus?: string;
  adoptedStatus?: string;
}

// --- Props ---
const props = withDefaults(defineProps<{
  items: CompareItem[];
  panelTitle?: string;
  labels?: ComparePanelLabels;
  theme?: 'blue-orange' | 'red-green';
}>(), {
  panelTitle: '差异对比',
  labels: () => ({}),
  theme: 'blue-orange'
});

// --- Emits ---
const emit = defineEmits<{
  'accept': [id: string];
  'reject': [id: string];
  'accept-all': [];
  'reject-all': [];
  'toggle-expand': [id: string];
  'card-click': [id: string];
}>();

// --- Tab 状态 ---
type RightPanelTab = 'review' | 'edit';
const rightPanelTab = ref<RightPanelTab>('review');

// --- Toast 提示 ---
const toastMessage = ref('');
const showToast = ref(false);

const displayToast = (message: string, duration = 3000) => {
  toastMessage.value = message;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, duration);
};

// --- 计算属性 ---
const stats = computed(() => {
  const total = props.items.length;
  const pending = props.items.filter(m => m.status === 'pending').length;
  const accepted = props.items.filter(m => m.status === 'accepted').length;
  const rejected = props.items.filter(m => m.status === 'rejected').length;
  return { total, pending, accepted, rejected };
});

// --- 合并标签 ---
const mergedLabels = computed(() => ({
  reviewTabLabel: props.labels?.reviewTabLabel || '差异列表',
  editTabLabel: props.labels?.editTabLabel || 'AI 编辑',
  baseLabel: props.labels?.baseLabel || '🔵 基准版本',
  compareLabel: props.labels?.compareLabel || '🟠 对比版本',
  reasonTitle: props.labels?.reasonTitle || '差异点',
  keepBtn: props.labels?.keepBtn || '保持基准版本',
  adoptBtn: props.labels?.adoptBtn || '采用对比版本',
  keepAllBtn: props.labels?.keepAllBtn || '全部保持基准',
  adoptAllBtn: props.labels?.adoptAllBtn || '全部采用对比',
  keptStatus: props.labels?.keptStatus || '已保持基准版本',
  adoptedStatus: props.labels?.adoptedStatus || '已采用对比版本',
}));

// --- 辅助函数 ---
const getRiskClass = (level: RiskLevel) => {
  const map = { high: 'risk-high', medium: 'risk-medium', low: 'risk-low' };
  return map[level] || 'risk-low';
};

const getRiskText = (level: RiskLevel) => {
  const map = { high: '高风险', medium: '中风险', low: '低风险' };
  return map[level] || '低风险';
};

const getStatusClass = (status: ChangeStatus) => {
  const map = { pending: 'status-pending', accepted: 'status-accepted', rejected: 'status-rejected' };
  return map[status] || 'status-pending';
};

// --- 事件处理 ---
const handleCardClick = (id: string) => {
  emit('card-click', id);
};

const handleToggleExpand = (id: string) => {
  emit('toggle-expand', id);
};

const handleAccept = (id: string) => {
  emit('accept', id);
};

const handleReject = (id: string) => {
  emit('reject', id);
};

const handleAcceptAll = () => {
  emit('accept-all');
};

const handleRejectAll = () => {
  emit('reject-all');
};

// 暴露给父组件
defineExpose({ displayToast });
</script>

<template>
  <div class="compare-panel" :class="`theme-${theme}`">
    <!-- Tab 切换 -->
    <div class="panel-tabs">
      <button 
        class="panel-tab" 
        :class="{ active: rightPanelTab === 'review' }"
        @click="rightPanelTab = 'review'"
      >
        <ChevronDown :size="16" />
        {{ mergedLabels.reviewTabLabel }}
      </button>
      <button 
        class="panel-tab" 
        :class="{ active: rightPanelTab === 'edit' }"
        @click="rightPanelTab = 'edit'"
      >
        <Edit3 :size="16" />
        {{ mergedLabels.editTabLabel }}
      </button>
    </div>

    <!-- 审查模式 -->
    <template v-if="rightPanelTab === 'review'">
      <div class="panel-header">
        <h2>{{ panelTitle }} <span class="count">{{ stats.pending }}/{{ stats.total }}</span></h2>
        <div class="panel-actions">
          <button class="panel-btn keep" @click="handleRejectAll" :disabled="stats.pending === 0">
            {{ mergedLabels.keepAllBtn }}
          </button>
          <button class="panel-btn adopt" @click="handleAcceptAll" :disabled="stats.pending === 0">
            {{ mergedLabels.adoptAllBtn }}
          </button>
        </div>
      </div>

      <div class="cards-container">
        <div
          v-for="(item, idx) in items"
          :key="item.id"
          class="mod-card"
          :class="[{ expanded: item.expanded }]"
        >
          <!-- Card Header -->
          <div class="card-header" @click="handleCardClick(item.id)">
            <div class="card-left">
              <span class="card-index" :class="getRiskClass(item.riskLevel)">{{ idx + 1 }}</span>
              <div class="card-info">
                <span class="card-clause">{{ item.clauseTitle || `条款 ${item.clauseId}` }}</span>
              </div>
            </div>
            <div class="card-right">
              <span class="risk-tag" :class="getRiskClass(item.riskLevel)">
                {{ getRiskText(item.riskLevel) }}
              </span>
              <button class="expand-btn" @click.stop="handleToggleExpand(item.id)">
                <ChevronUp v-if="item.expanded" :size="18" />
                <ChevronDown v-else :size="18" />
              </button>
            </div>
          </div>

          <!-- Card Body -->
          <div class="card-body" v-show="item.expanded">
            <!-- Reason -->
            <div class="reason-block">
              <div class="reason-header">
                <AlertTriangle :size="14" />
                <span>{{ mergedLabels.reasonTitle }}</span>
              </div>
              <p class="reason-text">{{ item.reason }}</p>
            </div>

            <!-- Diff Content -->
            <div class="card-diff-section">
              <div v-if="item.baseText" class="diff-box base">
                <div class="box-label">{{ mergedLabels.baseLabel }}</div>
                <div class="box-content">{{ item.baseText }}</div>
              </div>
              <div v-if="item.compareText" class="diff-box compare">
                <div class="box-label">{{ mergedLabels.compareLabel }}</div>
                <div class="box-content">{{ item.compareText }}</div>
              </div>
            </div>

            <!-- Actions -->
            <div class="card-actions" v-if="item.status === 'pending'">
              <button class="action-btn keep" @click.stop="handleReject(item.id)">
                {{ mergedLabels.keepBtn }}
              </button>
              <button class="action-btn adopt" @click.stop="handleAccept(item.id)">
                {{ mergedLabels.adoptBtn }}
              </button>
            </div>

            <div class="card-status" v-else>
              <div class="status-display" :class="getStatusClass(item.status)">
                <Check v-if="item.status === 'accepted'" :size="16" />
                <X v-else :size="16" />
                {{ item.status === 'accepted' ? mergedLabels.adoptedStatus : mergedLabels.keptStatus }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- AI 编辑模式 -->
    <template v-else>
      <div class="ai-edit-panel">
        <!-- AI 文本编辑 -->
        <div class="edit-section">
          <div class="section-header">
            <Edit3 :size="18" class="section-icon" />
            <div class="section-title-group">
              <h3>AI文本编辑</h3>
              <p class="section-desc">选中文字后，点击对应文本编辑工具</p>
            </div>
          </div>
          <div class="text-tools">
            <button class="text-tool-btn">改写</button>
            <button class="text-tool-btn">扩写</button>
            <button class="text-tool-btn">缩写</button>
            <button class="text-tool-btn">翻译</button>
          </div>
        </div>

        <!-- 多模态 AI 生成 -->
        <div class="edit-section">
          <div class="section-header">
            <Sparkles :size="18" class="section-icon sparkle" />
            <div class="section-title-group">
              <h3>多模态AI生成</h3>
              <p class="section-desc">选中文字后，点击对应多模态生成工具</p>
            </div>
          </div>
          <div class="multimodal-tools">
            <div class="tool-row gradient-purple">
              <div class="tool-card">
                <FileImage :size="28" />
                <span>示意图</span>
              </div>
              <div class="tool-card">
                <BarChart3 :size="28" />
                <span>图表</span>
              </div>
            </div>
            <div class="tool-row gradient-rainbow">
              <div class="tool-card">
                <ImageIcon :size="24" />
                <span>图片</span>
              </div>
              <div class="tool-card">
                <Table2 :size="24" />
                <span>表格</span>
              </div>
              <div class="tool-card">
                <span class="formula-icon">∑</span>
                <span>公式</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 文档转 PPT -->
        <div class="edit-section ppt-section">
          <div class="section-header">
            <Presentation :size="18" class="section-icon ppt" />
            <h3>文档转PPT</h3>
          </div>
          <div class="ppt-features">
            <div class="ppt-feature">
              <Edit3 :size="16" class="feature-icon" />
              <span class="feature-title">智能匹配</span>
              <span class="feature-desc">100%忠于原文内容生成</span>
            </div>
            <div class="ppt-feature">
              <FileText :size="16" class="feature-icon" />
              <span class="feature-title">专业排版</span>
              <span class="feature-desc">海量模版选择，专业图示效果</span>
            </div>
            <div class="ppt-feature">
              <Clock :size="16" class="feature-icon" />
              <span class="feature-title">省时省力</span>
              <span class="feature-desc">只需几分钟，演讲、汇报轻松搞定</span>
            </div>
          </div>
          <button class="ppt-generate-btn">
            立即生成专业PPT
            <span class="cursor-icon">👆</span>
          </button>
        </div>
      </div>
    </template>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="showToast" class="toast-container">
        <div class="toast-message">
          <AlertTriangle :size="18" />
          <span>{{ toastMessage }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.compare-panel {
  width: 420px;
  min-width: 420px;
  background: var(--bg-color);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* ============ Tab 切换 ============ */
.panel-tabs {
  display: flex;
  gap: 0;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.panel-tab:first-child {
  border-radius: 8px 0 0 8px;
}

.panel-tab:last-child {
  border-radius: 0 8px 8px 0;
  border-left: none;
}

.panel-tab:hover {
  background: var(--bg-color);
  color: var(--primary-color);
}

.panel-tab.active {
  background: var(--primary-soft);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

/* ============ 面板头部 ============ */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: white;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-header h2 .count {
  font-weight: 400;
  color: var(--text-muted);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.panel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.panel-btn.keep {
  background: var(--primary-soft);
  color: var(--primary-hover);
}

.panel-btn.keep:hover:not(:disabled) {
  background: var(--primary-soft-strong);
}

.panel-btn.adopt {
  background: var(--warning-soft);
  color: var(--warning-color);
}

.panel-btn.adopt:hover:not(:disabled) {
  background: var(--warning-border);
}

/* ============ 卡片容器 ============ */
.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.mod-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.mod-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.04);
  transform: translateY(-1px);
}

.mod-card.expanded {
  box-shadow: 0 8px 16px rgba(0,0,0,0.06);
  border-color: var(--border-color);
}

/* ============ 卡片头部 ============ */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  background: white;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.card-index {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.card-index.risk-high { background: var(--diff-removed-soft); color: var(--diff-removed); }
.card-index.risk-medium { background: var(--warning-soft); color: var(--warning-color); }
.card-index.risk-low { background: var(--diff-added-soft); color: var(--diff-added); }

.card-info {
  flex: 1;
  min-width: 0;
}

.card-clause {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.risk-tag {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.risk-tag.risk-high { background: var(--diff-removed-soft); color: var(--diff-removed); }
.risk-tag.risk-medium { background: var(--warning-soft); color: var(--warning-color); }
.risk-tag.risk-low { background: var(--diff-added-soft); color: var(--diff-added); }

.expand-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
}

.expand-btn:hover {
  background: var(--surface-soft);
  color: var(--text-secondary);
}

/* ============ 卡片内容 ============ */
.card-body {
  padding: 0 16px 16px 16px;
  border-top: 1px solid var(--surface-soft);
}

.reason-block {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--diff-removed-soft);
  border: 1px solid var(--diff-removed-border);
}

.reason-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--diff-removed);
  margin-bottom: 6px;
}

.reason-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

/* ============ Diff 区块 ============ */
.card-diff-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.diff-box {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid transparent;
}

.diff-box.base {
  background: var(--primary-soft);
  border-color: var(--primary-border);
}

.diff-box.compare {
  background: var(--warning-soft);
  border-color: var(--warning-border);
}

.box-label {
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-box.base .box-label { color: var(--primary-hover); }
.diff-box.compare .box-label { color: var(--warning-color); }

.box-content {
  padding: 0 12px 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-main);
}

/* ============ 主题覆盖 (Red-Green) ============ */
.theme-red-green .diff-box.base {
  background: var(--diff-removed-soft); /* red-50 */
  border-color: var(--diff-removed-border); /* red-300 */
}
.theme-red-green .diff-box.base .box-label {
  color: var(--diff-removed); /* red-700 */
}

.theme-red-green .diff-box.compare {
  background: var(--diff-added-soft); /* green-50 */
  border-color: var(--diff-added-border); /* green-300 */
}
.theme-red-green .diff-box.compare .box-label {
  color: var(--diff-added); /* green-700 */
}

.theme-red-green .reason-block {
  background: var(--warning-soft); /* amber-50 */
  border-color: var(--warning-border); /* amber-300 */
}
.theme-red-green .reason-header {
  color: var(--warning-color); /* amber-700 */
}

.theme-red-green .panel-btn.keep {
  background: var(--diff-removed-soft); /* red-50 */
  color: var(--diff-removed); /* red-700 */
}
.theme-red-green .panel-btn.keep:hover:not(:disabled) {
  background: var(--diff-removed-soft); /* red-100 */
}

.theme-red-green .panel-btn.adopt {
  background: var(--diff-added-soft); /* green-50 */
  color: var(--diff-added); /* green-700 */
}
.theme-red-green .panel-btn.adopt:hover:not(:disabled) {
  background: var(--diff-added-soft); /* green-100 */
}

/* ============ 操作按钮 ============ */
.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.keep {
  background: var(--primary-soft);
  color: var(--primary-hover);
  border: 1px solid var(--primary-border);
}
.action-btn.keep:hover { 
  background: var(--primary-soft-strong); 
  border-color: var(--primary-color);
}

.action-btn.adopt {
  background: var(--warning-color);
  color: white;
  box-shadow: 0 1px 2px rgba(245, 158, 11, 0.2);
}
.action-btn.adopt:hover { 
  background: var(--warning-color); 
  transform: translateY(-1px); 
}

.card-status {
  margin-top: 16px;
}

.status-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.status-display.status-accepted { background: var(--diff-added-soft); color: var(--diff-added); }
.status-display.status-rejected { background: var(--surface-soft); color: var(--text-secondary); }

/* ============ Toast 提示 ============ */
.toast-container {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
}

.toast-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--text-main);
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}

.toast-message svg {
  color: var(--warning-color);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ============ AI 编辑模式 ============ */
.ai-edit-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.edit-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.section-icon {
  color: var(--primary-color);
  margin-top: 2px;
}

.section-icon.sparkle {
  color: var(--warning-color);
}

.section-icon.ppt {
  color: var(--diff-removed);
}

.section-title-group h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.text-tools {
  display: flex;
  gap: 12px;
}

.text-tool-btn {
  flex: 1;
  padding: 10px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.text-tool-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-soft);
}

.multimodal-tools {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-row {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
}

.tool-row.gradient-purple {
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--skill-soft) 100%);
}

.tool-row.gradient-rainbow {
  background: linear-gradient(135deg, var(--skill-soft) 0%, var(--primary-soft) 33%, var(--diff-added-soft) 66%, var(--warning-soft) 100%);
}

.tool-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.tool-card svg { color: var(--primary-color); }
.tool-card span { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.formula-icon { font-size: 24px; font-weight: 600; color: var(--warning-color); }

.ppt-section {
  background: var(--warning-soft);
  border: 1px solid var(--warning-border);
}

.ppt-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.ppt-feature {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feature-icon { color: var(--primary-color); }
.feature-title { font-size: 14px; font-weight: 600; color: var(--text-main); min-width: 60px; }
.feature-desc { font-size: 13px; color: var(--text-secondary); }

.ppt-generate-btn {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--skill-color) 50%, var(--skill-color) 100%);
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.ppt-generate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.35);
}

.cursor-icon { font-size: 20px; }
</style>
