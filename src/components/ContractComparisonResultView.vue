<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Check,
  X,
  Edit3,
  CheckCheck,
  XCircle,
  AlertTriangle,
  Files,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

// --- Types ---
type ChangeStatus = 'pending' | 'accepted' | 'rejected';
type ChangeType = 'add' | 'del' | 'mod';
type RiskLevel = 'high' | 'medium' | 'low';

interface DiffItem {
  id: string;
  type: ChangeType;
  location: string;      // 位置描述
  originalText: string;  // 原合同内容
  newText: string;       // 新合同内容
  description: string;   // 变更说明
  riskLevel: RiskLevel;
  status: ChangeStatus;
}

// --- 完整的示例合同（原版本） ---
const originalContract = ref({
  title: '软件开发服务合同',
  version: 'V1.0',
  date: '2024年10月15日',
  
  partyA: '北京未来科技有限公司',
  partyB: '深圳智汇软件开发有限公司',
  
  clauses: [
    {
      id: 'oc-1',
      title: '第一条 项目内容',
      content: `1.1 甲方委托乙方开发"企业智能管理系统"，包括：
（1）用户权限管理模块
（2）数据统计分析模块
（3）报表自动生成模块

1.2 系统需支持高并发访问，不仅限于1000 QPS。`
    },
    {
      id: 'oc-2',
      title: '第二条 合同金额',
      content: `2.1 项目总金额为人民币伍拾万元整（¥500,000.00）。

2.2 付款方式：
（1）预付款30%：¥150,000.00
（2）中期款50%：¥250,000.00
（3）尾款20%：¥100,000.00`
    },
    {
      id: 'oc-3',
      title: '第三条 开发周期',
      content: `3.1 项目开发周期为90个日历日。

3.2 乙方应在合同签订后30日内完成核心功能开发。`
    },
    {
      id: 'oc-4',
      title: '第四条 违约责任',
      content: `4.1 乙方延迟交付，每延迟一日，支付合同总额0.1%的违约金。

4.2 乙方享有30日的修复缓冲期。

4.3 违约金总额不超过合同总额的15%。`
    },
    {
      id: 'oc-5',
      title: '第五条 知识产权',
      content: `5.1 本合同项下新开发的软件知识产权归甲方所有。

5.2 乙方原有知识产权仍归乙方所有。`
    }
  ]
});

// --- 新版本合同 ---
const newContract = ref({
  title: '软件开发服务合同',
  version: 'V2.0',
  date: '2024年12月25日',
  
  partyA: '北京未来科技（集团）有限公司',
  partyB: '深圳智汇软件开发有限公司',
  
  clauses: [
    {
      id: 'nc-1',
      title: '第一条 项目内容',
      content: `1.1 甲方委托乙方开发"企业智能管理系统"，包括：
（1）用户权限管理模块
（2）数据统计分析模块
（3）报表自动生成模块
（4）移动端APP适配模块  【新增】

1.2 系统需支持高并发访问，至少支持5000 QPS。【提升】`
    },
    {
      id: 'nc-2',
      title: '第二条 合同金额',
      content: `2.1 项目总金额为人民币捌拾万元整（¥800,000.00）。【上调】

2.2 付款方式：
（1）预付款40%：¥320,000.00【比例上调】
（2）中期款40%：¥320,000.00
（3）尾款20%：¥160,000.00`
    },
    {
      id: 'nc-3',
      title: '第三条 开发周期',
      content: `3.1 项目开发周期为120个日历日。【延长】

3.2 乙方应在合同签订后45日内完成核心功能开发。【延长】`
    },
    {
      id: 'nc-4',
      title: '第四条 违约责任',
      content: `4.1 乙方延迟交付，每延迟一日，支付合同总额0.5%的违约金。【提升5倍】

4.2 【已删除修复缓冲期条款】

4.3 违约金总额不超过合同总额的30%。【上限提升】`
    },
    {
      id: 'nc-5',
      title: '第五条 知识产权',
      content: `5.1 本合同项下所有软件及相关知识产权均归甲方所有。【扩大范围】

5.2 【已删除乙方保留条款】`
    }
  ]
});

// --- 差异数据 ---
const diffItems = ref<DiffItem[]>([
  {
    id: 'd1',
    type: 'mod',
    location: '合同主体 - 甲方名称',
    originalText: '北京未来科技有限公司',
    newText: '北京未来科技（集团）有限公司',
    description: '甲方公司名称变更，需确认是否为同一主体或关联公司，核实工商登记信息。',
    riskLevel: 'medium',
    status: 'pending'
  },
  {
    id: 'd2',
    type: 'add',
    location: '第一条 - 项目范围',
    originalText: '',
    newText: '移动端APP适配模块',
    description: '新增移动端开发要求，项目范围扩大。需评估额外工作量是否与价格调整匹配。',
    riskLevel: 'medium',
    status: 'pending'
  },
  {
    id: 'd3',
    type: 'mod',
    location: '第一条 - 性能要求',
    originalText: '不仅限于1000 QPS',
    newText: '至少支持5000 QPS',
    description: '性能要求提升5倍，需评估服务器成本、架构调整等技术可行性。这是硬性指标变更。',
    riskLevel: 'high',
    status: 'pending'
  },
  {
    id: 'd4',
    type: 'mod',
    location: '第二条 - 合同金额',
    originalText: '伍拾万元整（¥500,000.00）',
    newText: '捌拾万元整（¥800,000.00）',
    description: '合同金额上调60%（+30万），需财务审批。注意与新增工作量是否对等。',
    riskLevel: 'high',
    status: 'pending'
  },
  {
    id: 'd5',
    type: 'mod',
    location: '第四条 - 违约金比例',
    originalText: '每延迟一日，支付合同总额0.1%的违约金',
    newText: '每延迟一日，支付合同总额0.5%的违约金',
    description: '违约金比例提升5倍！延迟60天即达上限。这对乙方风险显著增加。',
    riskLevel: 'high',
    status: 'pending'
  },
  {
    id: 'd6',
    type: 'del',
    location: '第四条 - 修复缓冲期',
    originalText: '乙方享有30日的修复缓冲期',
    newText: '',
    description: '删除了原有的30日修复缓冲期，乙方失去容错空间，风险增加。',
    riskLevel: 'high',
    status: 'pending'
  },
  {
    id: 'd7',
    type: 'mod',
    location: '第五条 - 知识产权归属',
    originalText: '本合同项下新开发的软件知识产权归甲方所有',
    newText: '本合同项下所有软件及相关知识产权均归甲方所有',
    description: '知识产权条款扩大化，从"新开发"变为"所有"，可能包含乙方原有技术资产。',
    riskLevel: 'high',
    status: 'pending'
  }
]);

// --- State ---
const selectedDiffId = ref<string | null>(diffItems.value[0]?.id || null);
const historyStack = ref<string[]>([]);
const historyIndex = ref(-1);

const saveHistory = () => {
  const snapshot = JSON.stringify(diffItems.value);
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  historyStack.value.push(snapshot);
  historyIndex.value++;
};
saveHistory();

// --- Computed ---
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

const selectedDiff = computed(() => 
  diffItems.value.find(d => d.id === selectedDiffId.value)
);

const stats = computed(() => ({
  total: diffItems.value.length,
  pending: diffItems.value.filter(d => d.status === 'pending').length,
  accepted: diffItems.value.filter(d => d.status === 'accepted').length,
  rejected: diffItems.value.filter(d => d.status === 'rejected').length,
  highRisk: diffItems.value.filter(d => d.riskLevel === 'high').length
}));

const currentDiffIndex = computed(() => 
  diffItems.value.findIndex(d => d.id === selectedDiffId.value)
);

// --- Actions ---
const undo = () => {
  if (!canUndo.value) return;
  historyIndex.value--;
  const state = historyStack.value[historyIndex.value];
  if (state) diffItems.value = JSON.parse(state);
};

const redo = () => {
  if (!canRedo.value) return;
  historyIndex.value++;
  const state = historyStack.value[historyIndex.value];
  if (state) diffItems.value = JSON.parse(state);
};

const selectDiff = (id: string) => {
  selectedDiffId.value = id;
};

const acceptDiff = (id: string) => {
  const diff = diffItems.value.find(d => d.id === id);
  if (diff) {
    diff.status = 'accepted';
    saveHistory();
    moveToNextPending();
  }
};

const rejectDiff = (id: string) => {
  const diff = diffItems.value.find(d => d.id === id);
  if (diff) {
    diff.status = 'rejected';
    saveHistory();
    moveToNextPending();
  }
};

const moveToNextPending = () => {
  const next = diffItems.value.find(d => d.status === 'pending');
  if (next) selectedDiffId.value = next.id;
};

const acceptAll = () => {
  diffItems.value.forEach(d => {
    if (d.status === 'pending') d.status = 'accepted';
  });
  saveHistory();
};

const rejectAll = () => {
  diffItems.value.forEach(d => {
    if (d.status === 'pending') d.status = 'rejected';
  });
  saveHistory();
};

const goBack = () => {
  router.back();
};

const exportResult = () => {
  alert('导出功能开发中...');
};

const goToPrevDiff = () => {
  if (currentDiffIndex.value > 0) {
    const prevItem = diffItems.value[currentDiffIndex.value - 1];
    if (prevItem) selectedDiffId.value = prevItem.id;
  }
};

const goToNextDiff = () => {
  if (currentDiffIndex.value < diffItems.value.length - 1) {
    const nextItem = diffItems.value[currentDiffIndex.value + 1];
    if (nextItem) selectedDiffId.value = nextItem.id;
  }
};

// --- Helpers ---
const getRiskClass = (level: RiskLevel) => ({
  'risk-high': level === 'high',
  'risk-medium': level === 'medium',
  'risk-low': level === 'low'
});

const getRiskText = (level: RiskLevel) => 
  ({ high: '高风险', medium: '中风险', low: '低风险' })[level];

const getTypeText = (type: ChangeType) => 
  ({ add: '新增', del: '删除', mod: '修改' })[type];

const getTypeClass = (type: ChangeType) => ({
  'type-add': type === 'add',
  'type-del': type === 'del',
  'type-mod': type === 'mod'
});

const getStatusClass = (status: ChangeStatus) => ({
  'status-pending': status === 'pending',
  'status-accepted': status === 'accepted',
  'status-rejected': status === 'rejected'
});
</script>

<template>
  <div class="comparison-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <ArrowLeft :size="18" />
          <span>返回</span>
        </button>
        <div class="header-divider"></div>
        <Files :size="20" class="header-icon" />
        <h1 class="page-title">合同比对结果</h1>
      </div>

      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">处差异</span>
        </div>
        <div class="stat-item high">
          <AlertTriangle :size="14" />
          <span class="stat-num">{{ stats.highRisk }}</span>
          <span class="stat-label">需关注</span>
        </div>
        <div class="stat-item pending">
          <span class="stat-num">{{ stats.pending }}</span>
          <span class="stat-label">待确认</span>
        </div>
        <div class="stat-item accepted">
          <span class="stat-num">{{ stats.accepted }}</span>
          <span class="stat-label">已确认</span>
        </div>
      </div>

      <div class="header-right">
        <div class="history-btns">
          <button class="icon-btn" :disabled="!canUndo" @click="undo" title="撤销">
            <RotateCcw :size="16" />
          </button>
          <button class="icon-btn" :disabled="!canRedo" @click="redo" title="重做">
            <RotateCw :size="16" />
          </button>
        </div>
        <div class="bulk-btns">
          <button class="bulk-btn reject" @click="rejectAll">
            <XCircle :size="16" />
            全部保留原版
          </button>
          <button class="bulk-btn accept" @click="acceptAll">
            <CheckCheck :size="16" />
            全部采用新版
          </button>
        </div>
        <button class="export-btn" @click="exportResult">
          <Download :size="16" />
          导出差异报告
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left: Dual Documents -->
      <div class="documents-panel">
        <div class="documents-wrapper">
          <!-- Original Contract -->
          <div class="contract-doc original">
            <div class="doc-header">
              <span class="version-tag old">{{ originalContract.version }}</span>
              <span class="doc-date">{{ originalContract.date }}</span>
            </div>
            <div class="doc-title">
              <h2>{{ originalContract.title }}</h2>
              <p>甲方：{{ originalContract.partyA }}</p>
              <p>乙方：{{ originalContract.partyB }}</p>
            </div>
            <div class="doc-content">
              <div v-for="clause in originalContract.clauses" :key="clause.id" class="clause">
                <h4>{{ clause.title }}</h4>
                <pre>{{ clause.content }}</pre>
              </div>
            </div>
          </div>

          <!-- New Contract -->
          <div class="contract-doc new">
            <div class="doc-header">
              <span class="version-tag new">{{ newContract.version }}</span>
              <span class="doc-date">{{ newContract.date }}</span>
            </div>
            <div class="doc-title">
              <h2>{{ newContract.title }}</h2>
              <p>甲方：{{ newContract.partyA }}</p>
              <p>乙方：{{ newContract.partyB }}</p>
            </div>
            <div class="doc-content">
              <div v-for="clause in newContract.clauses" :key="clause.id" class="clause">
                <h4>{{ clause.title }}</h4>
                <pre>{{ clause.content }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Diff Panel -->
      <div class="diff-panel">
        <div class="panel-header">
          <h2>差异详情</h2>
          <div class="nav-btns">
            <button class="nav-btn" :disabled="currentDiffIndex <= 0" @click="goToPrevDiff">
              <ChevronLeft :size="16" />
            </button>
            <span class="nav-info">{{ currentDiffIndex + 1 }} / {{ diffItems.length }}</span>
            <button class="nav-btn" :disabled="currentDiffIndex >= diffItems.length - 1" @click="goToNextDiff">
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>

        <!-- Diff List -->
        <div class="diff-list">
          <div 
            v-for="(diff, idx) in diffItems" 
            :key="diff.id"
            class="diff-item"
            :class="[getStatusClass(diff.status), { selected: diff.id === selectedDiffId }]"
            @click="selectDiff(diff.id)"
          >
            <div class="diff-item-header">
              <span class="diff-index">{{ idx + 1 }}</span>
              <span class="diff-type" :class="getTypeClass(diff.type)">{{ getTypeText(diff.type) }}</span>
              <span class="diff-risk" :class="getRiskClass(diff.riskLevel)">
                {{ getRiskText(diff.riskLevel) }}
              </span>
            </div>
            <div class="diff-location">{{ diff.location }}</div>
            <div class="diff-status-icon">
              <Check v-if="diff.status === 'accepted'" :size="14" class="icon-accepted" />
              <X v-else-if="diff.status === 'rejected'" :size="14" class="icon-rejected" />
              <span v-else class="icon-pending"></span>
            </div>
          </div>
        </div>

        <!-- Selected Diff Detail -->
        <div class="diff-detail" v-if="selectedDiff">
          <div class="detail-section">
            <div class="detail-header desc" :class="getRiskClass(selectedDiff.riskLevel)">
              <AlertTriangle :size="16" />
              <span>{{ getRiskText(selectedDiff.riskLevel) }} · 变更说明</span>
            </div>
            <p class="detail-desc">{{ selectedDiff.description }}</p>
          </div>

          <div class="detail-section" v-if="selectedDiff.originalText">
            <div class="detail-header original">
              <span class="label-tag">原合同 {{ originalContract.version }}</span>
            </div>
            <div class="detail-text deleted">{{ selectedDiff.originalText }}</div>
          </div>

          <div class="detail-section" v-if="selectedDiff.newText">
            <div class="detail-header new">
              <span class="label-tag">新合同 {{ newContract.version }}</span>
            </div>
            <div class="detail-text added">{{ selectedDiff.newText }}</div>
          </div>

          <div class="detail-section" v-if="selectedDiff.type === 'del'">
            <div class="detail-header warning">
              <span>⚠️ 此内容在新合同中已被删除</span>
            </div>
          </div>

          <div class="detail-actions" v-if="selectedDiff.status === 'pending'">
            <button class="action-btn accept" @click="acceptDiff(selectedDiff.id)">
              <Check :size="18" />
              采用新版本
            </button>
            <button class="action-btn reject" @click="rejectDiff(selectedDiff.id)">
              <X :size="18" />
              保留原版本
            </button>
          </div>

          <div class="detail-status" v-else>
            <div class="status-badge" :class="getStatusClass(selectedDiff.status)">
              <Check v-if="selectedDiff.status === 'accepted'" :size="18" />
              <X v-else :size="18" />
              {{ selectedDiff.status === 'accepted' ? '已确认采用新版本' : '已决定保留原版本' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comparison-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

/* Header - 与审查页一致 */
.page-header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
}

.back-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.header-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
}

.header-icon {
  color: #8b5cf6;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #f8fafc;
  border-radius: 20px;
  font-size: 13px;
  color: #64748b;
}

.stat-item .stat-num {
  font-weight: 600;
  color: #1e293b;
}

.stat-item.high { background: #fef2f2; color: #dc2626; }
.stat-item.high .stat-num { color: #dc2626; }
.stat-item.pending { background: #fefce8; color: #ca8a04; }
.stat-item.pending .stat-num { color: #ca8a04; }
.stat-item.accepted { background: #f0fdf4; color: #16a34a; }
.stat-item.accepted .stat-num { color: #16a34a; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-btns { display: flex; gap: 4px; }

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) { background: #f1f5f9; color: #8b5cf6; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.bulk-btns { display: flex; gap: 8px; }

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.bulk-btn.reject { background: #fee2e2; color: #dc2626; }
.bulk-btn.reject:hover { background: #fecaca; }
.bulk-btn.accept { background: #dcfce7; color: #16a34a; }
.bulk-btn.accept:hover { background: #bbf7d0; }

.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #8b5cf6;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.export-btn:hover { background: #7c3aed; }

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Documents Panel */
.documents-panel {
  flex: 1;
  overflow: hidden;
  padding: 24px;
}

.documents-wrapper {
  display: flex;
  gap: 20px;
  height: 100%;
}

.contract-doc {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.contract-doc.original {
  border-top: 4px solid #f87171;
}

.contract-doc.new {
  border-top: 4px solid #4ade80;
}

.doc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.version-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
}

.version-tag.old { background: #fef2f2; color: #dc2626; }
.version-tag.new { background: #f0fdf4; color: #16a34a; }

.doc-date {
  font-size: 12px;
  color: #64748b;
}

.doc-title {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
}

.doc-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.doc-title p {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0;
}

.doc-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.clause {
  margin-bottom: 20px;
}

.clause h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.clause pre {
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  color: #475569;
  white-space: pre-wrap;
  margin: 0;
}

/* Diff Panel */
.diff-panel {
  width: 380px;
  background: white;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.nav-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: none;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
}

.nav-btn:hover:not(:disabled) { background: #e2e8f0; color: #1e293b; }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.nav-info {
  font-size: 13px;
  color: #64748b;
}

/* Diff List */
.diff-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.diff-item {
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  position: relative;
}

.diff-item:hover { background: #faf5ff; }

.diff-item.selected {
  border-color: #8b5cf6;
  background: #f5f3ff;
}

.diff-item.status-accepted { border-left: 3px solid #16a34a; }
.diff-item.status-rejected { border-left: 3px solid #94a3b8; opacity: 0.7; }
.diff-item.status-pending { border-left: 3px solid #eab308; }

.diff-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.diff-index {
  width: 18px;
  height: 18px;
  background: #8b5cf6;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diff-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.type-add { background: #dcfce7; color: #16a34a; }
.type-del { background: #fee2e2; color: #dc2626; }
.type-mod { background: #ede9fe; color: #7c3aed; }

.diff-risk {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: auto;
}

.risk-high { background: #fee2e2; color: #dc2626; }
.risk-medium { background: #fef3c7; color: #d97706; }
.risk-low { background: #dcfce7; color: #16a34a; }

.diff-location {
  font-size: 12px;
  color: #64748b;
}

.diff-status-icon {
  position: absolute;
  top: 10px;
  right: 10px;
}

.icon-accepted { color: #16a34a; }
.icon-rejected { color: #94a3b8; }
.icon-pending {
  width: 8px;
  height: 8px;
  background: #eab308;
  border-radius: 50%;
  display: inline-block;
}

/* Diff Detail */
.diff-detail {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-section {
  margin-bottom: 14px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px 6px 0 0;
  font-size: 13px;
  font-weight: 500;
}

.detail-header.desc {
  background: #fef3c7;
  color: #d97706;
}
.detail-header.desc.risk-high { background: #fee2e2; color: #dc2626; }
.detail-header.desc.risk-low { background: #dcfce7; color: #16a34a; }

.detail-header.original { background: #fef2f2; }
.detail-header.new { background: #f0fdf4; }
.detail-header.warning { background: #fef3c7; color: #d97706; }

.label-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
}

.detail-header.original .label-tag { background: #dc2626; color: white; }
.detail-header.new .label-tag { background: #16a34a; color: white; }

.detail-desc {
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-top: none;
  border-radius: 0 0 6px 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #78716c;
  margin: 0;
}

.detail-text {
  padding: 12px;
  font-size: 14px;
  line-height: 1.7;
  border-radius: 0 0 6px 6px;
}

.detail-text.deleted {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-top: none;
}

.detail-text.added {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  border-top: none;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.action-btn.accept { background: #16a34a; color: white; }
.action-btn.accept:hover { background: #15803d; }
.action-btn.reject { background: #f1f5f9; color: #64748b; }
.action-btn.reject:hover { background: #e2e8f0; }

.detail-status { padding-top: 16px; }

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.status-accepted { background: #dcfce7; color: #16a34a; }
.status-badge.status-rejected { background: #f1f5f9; color: #64748b; }
</style>
