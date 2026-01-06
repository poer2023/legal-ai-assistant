<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { 
  ChevronLeft,
  Check,
  X,
  Edit3,
  CheckCheck,
  XCircle,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  RotateCw,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  Image as ImageIcon,
  Zap
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

// --- Types ---
type ChangeStatus = 'pending' | 'accepted' | 'rejected';
type RiskLevel = 'high' | 'medium' | 'low';

interface Modification {
  id: string;
  clauseId: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  riskLevel: RiskLevel;
  status: ChangeStatus;
  expanded: boolean;  // 新增：是否展开
}

// --- 完整的示例文书（律师函） ---
const documentContent = ref({
  title: '律师函',
  docNo: '京盈律函字【2024】第086号',
  createDate: '2024年12月30日',
  
  sender: {
    name: '北京盈科律师事务所',
    lawyer: '王志强 律师',
    phone: '010-59626688',
    address: '北京市朝阳区建国门外大街甲12号新华保险大厦15层'
  },
  
  recipient: {
    name: '深圳市创新科技有限公司',
    address: '深圳市南山区科技园南路88号'
  },
  
  clauses: [
    {
      id: 'clause-1',
      title: '一、委托事项',
      content: `本律师依法接受北京智慧云端科技有限公司（以下简称"委托人"）的委托，就贵公司拖欠委托人软件开发服务费用一事，特向贵公司发出本律师涵。`
    },
    {
      id: 'clause-2',
      title: '二、基本事实',
      content: `2023年5月10日，委托人与贵公司签署了《软件开发服务合同》(合同编号：RXKJ-2023-0510)，约定由委托人为贵公司开发"智能仓储管理系统"，合同总金额为人民币肆拾伍万元整（¥450,000.00）。

合同约定付款方式为：合同签署后支付30%预付款；系统上线验收合格后支付50%；质保期满后付15%尾款。

委托人已按合同约定完成全部开发工作，并于2024年1月15日通过贵公司组织的验收测试，贵公司出具了《验收合格确认书》。

截止本函发出之日，贵公司尚欠委托人软件开发服务费人民币贰拾玖万贰仟伍佰元整（¥292,500.00），经委托人多次催要，贵公司拒不付款。`
    },
    {
      id: 'clause-3',
      title: '三、律师意见',
      content: `贵公司的上述行为以严重违反了《中华人民共和国民法典》第五百零九条"当事人应当按照约定全面履行自己的义务"之规定，已经构成严重违约。

根据合同约定及相关法律规定，委托人有权要求贵公司：
1. 立即支付拖欠的软件开发服务费人民币贰拾玖万贰仟伍佰元整（￥292,500.00）；
2. 按照合同约定支付逾期付款违约金（按日万分之五计算）；
3. 承担委托人为追索债权而支付的律师费、诉讼费等合理费用。`
    },
    {
      id: 'clause-4',
      title: '四、正式催告',
      content: `鉴于上述事实，本律师郑重敬告贵公司：

请贵公司于收到本函后七（7）个工作日内，主动与委托人联系并付清上述全部欠款及违约金，否则，本律师将依据法律程序，代表委托人向有管辖权的人民法院提起诉讼，届时贵公司将承担更多的经济损失和法律责任。

特此函告，望贵公司慎重考虑，积极妥善处理此事。`
    }
  ]
});

// --- 纠错建议数据 ---
const modifications = ref<Modification[]>([
  {
    id: 'mod-1',
    clauseId: 'clause-1',
    originalText: '特向贵公司发出本律师涵',
    suggestedText: '特向贵公司发出本律师函',
    reason: '【错别字】"涵"应为"函"。律师函是法律文书专有名词，应使用"函"字。',
    riskLevel: 'high',
    status: 'pending',
    expanded: true
  },
  {
    id: 'mod-2',
    clauseId: 'clause-2',
    originalText: '质保期满后付15%尾款',
    suggestedText: '质保期满后支付20%尾款',
    reason: '【数据错误】付款比例合计应为100%（30%+50%+20%=100%），原文15%与前述比例合计仅95%，存在数据不一致问题。',
    riskLevel: 'high',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-3',
    clauseId: 'clause-3',
    originalText: '贵公司的上述行为以严重违反了',
    suggestedText: '贵公司的上述行为已严重违反了',
    reason: '【错别字】"以"应为"已"。此处表示动作完成，应使用"已经"的"已"。',
    riskLevel: 'medium',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-4',
    clauseId: 'clause-3',
    originalText: '人民币贰拾玖万贰仟伍佰元整（￥292,500.00）',
    suggestedText: '人民币贰拾玖万贰仟伍佰元整（¥292,500.00）',
    reason: '【符号错误】人民币符号应使用"¥"（半角），原文使用了"￥"（全角），与前文表述不一致，建议统一。',
    riskLevel: 'low',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-5',
    clauseId: 'clause-4',
    originalText: '本律师郑重敬告贵公司',
    suggestedText: '本律师郑重告知贵公司',
    reason: '【表述优化】"敬告"含有敬意，用于律师函催债场景语气过于客气，建议改为中性的"告知"，更符合律师函的严肃性。',
    riskLevel: 'low',
    status: 'pending',
    expanded: false
  }
]);


// --- State ---
interface HistoryState {
  modifications: Modification[];
  clauseContents: Record<string, string>;
}
const historyStack = ref<HistoryState[]>([]);
const historyIndex = ref(-1);

// 保存当前状态到历史记录
const saveHistory = () => {
  const snapshot: HistoryState = {
    modifications: JSON.parse(JSON.stringify(modifications.value)),
    clauseContents: {}
  };
  documentContent.value.clauses.forEach(c => {
    snapshot.clauseContents[c.id] = c.content;
  });
  
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  historyStack.value.push(snapshot);
  historyIndex.value++;
};

// 撤销/重做计算属性
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

// 撤销
const undo = () => {
  if (!canUndo.value) return;
  historyIndex.value--;
  const state = historyStack.value[historyIndex.value];
  if (state) restoreState(state);
};

// 重做
const redo = () => {
  if (!canRedo.value) return;
  historyIndex.value++;
  const state = historyStack.value[historyIndex.value];
  if (state) restoreState(state);
};

// 恢复状态
const restoreState = (state: HistoryState) => {
  modifications.value = JSON.parse(JSON.stringify(state.modifications));
  documentContent.value.clauses.forEach(c => {
    const content = state.clauseContents[c.id];
    if (content !== undefined) {
      c.content = content;
    }
  });
};

saveHistory();

// --- Computed ---
const stats = computed(() => ({
  total: modifications.value.length,
  pending: modifications.value.filter(m => m.status === 'pending').length,
  accepted: modifications.value.filter(m => m.status === 'accepted').length,
  rejected: modifications.value.filter(m => m.status === 'rejected').length,
  highRisk: modifications.value.filter(m => m.riskLevel === 'high').length
}));

// 获取某条款的修改
const getClauseModifications = (clauseId: string) => {
  return modifications.value.filter(m => m.clauseId === clauseId);
};

// 检查条款是否有修改
const hasModifications = (clauseId: string) => {
  return modifications.value.some(m => m.clauseId === clauseId);
};

// 检查条款是否还有待处理的修改
const hasPendingModifications = (clauseId: string) => {
  return modifications.value.some(m => m.clauseId === clauseId && m.status === 'pending');
};

// 获取条款的最高风险级别
const getClauseRiskLevel = (clauseId: string): RiskLevel | null => {
  const mods = getClauseModifications(clauseId);
  if (mods.length === 0) return null;
  if (mods.some(m => m.riskLevel === 'high')) return 'high';
  if (mods.some(m => m.riskLevel === 'medium')) return 'medium';
  return 'low';
};

// --- Actions ---

// 合同文档面板引用
const contractPanelRef = ref<HTMLElement | null>(null);

// 滚动到指定的高亮块
const scrollToHighlight = (modId: string) => {
  nextTick(() => {
    const highlightEl = document.getElementById(`highlight-${modId}`);
    if (highlightEl && contractPanelRef.value) {
      // 滚动容器内定位
      const containerRect = contractPanelRef.value.getBoundingClientRect();
      const elementRect = highlightEl.getBoundingClientRect();
      const scrollTop = contractPanelRef.value.scrollTop + elementRect.top - containerRect.top - 100;
      
      contractPanelRef.value.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
      
      // 添加高亮闪烁效果
      highlightEl.classList.add('flash');
      setTimeout(() => {
        highlightEl.classList.remove('flash');
      }, 1500);
    }
  });
};

// 切换卡片展开/折叠
const toggleExpand = (modId: string) => {
  const mod = modifications.value.find(m => m.id === modId);
  if (mod) {
    const wasExpanded = mod.expanded;
    mod.expanded = !mod.expanded;
    // 展开时滚动到对应位置
    if (!wasExpanded) {
      scrollToHighlight(modId);
    }
  }
};

// 展开指定卡片，折叠其他，并滚动定位
const expandCard = (modId: string) => {
  modifications.value.forEach(m => {
    m.expanded = m.id === modId;
  });
  scrollToHighlight(modId);
};

const acceptModification = (modId: string) => {
  const mod = modifications.value.find(m => m.id === modId);
  if (mod) {
    // 真实替换正文中的原文为建议文本
    const clause = documentContent.value.clauses.find(c => c.id === mod.clauseId);
    if (clause) {
      clause.content = clause.content.replace(mod.originalText, mod.suggestedText);
    }
    
    mod.status = 'accepted';
    mod.expanded = false;
    saveHistory();
    // 自动展开下一个待处理项
    const next = modifications.value.find(m => m.status === 'pending');
    if (next) next.expanded = true;
  }
};

const rejectModification = (modId: string) => {
  const mod = modifications.value.find(m => m.id === modId);
  if (mod) {
    mod.status = 'rejected';
    mod.expanded = false;
    saveHistory();
    const next = modifications.value.find(m => m.status === 'pending');
    if (next) next.expanded = true;
  }
};

const rewriteModification = (modId: string) => {
  const mod = modifications.value.find(m => m.id === modId);
  if (mod) {
    const newText = prompt('请输入修改后的内容：', mod.suggestedText);
    if (newText && newText !== mod.suggestedText) {
      mod.suggestedText = newText;
      mod.status = 'accepted';
      mod.expanded = false;
      saveHistory();
      const next = modifications.value.find(m => m.status === 'pending');
      if (next) next.expanded = true;
    }
  }
};

const acceptAll = () => {
  modifications.value.forEach(mod => {
    if (mod.status === 'pending') {
      // 真实替换正文
      const clause = documentContent.value.clauses.find(c => c.id === mod.clauseId);
      if (clause) {
        clause.content = clause.content.replace(mod.originalText, mod.suggestedText);
      }
      mod.status = 'accepted';
      mod.expanded = false;
    }
  });
  saveHistory();
};

const rejectAll = () => {
  modifications.value.forEach(m => {
    if (m.status === 'pending') {
      m.status = 'rejected';
      m.expanded = false;
    }
  });
  saveHistory();
};

const goBack = () => {
  router.back();
};

const exportResult = () => {
  alert('导出功能开发中...');
};

const addToKnowledgeBase = () => {
  alert('加入知识库功能开发中...');
};

// --- Helpers ---
const getRiskClass = (level: RiskLevel) => ({
  'risk-high': level === 'high',
  'risk-medium': level === 'medium',
  'risk-low': level === 'low'
});

const getRiskText = (level: RiskLevel) => 
  ({ high: '高风险', medium: '中风险', low: '低风险' })[level];

const getStatusClass = (status: ChangeStatus) => ({
  'status-pending': status === 'pending',
  'status-accepted': status === 'accepted',
  'status-rejected': status === 'rejected'
});

const getClauseTitle = (clauseId: string) => {
  return documentContent.value.clauses.find(c => c.id === clauseId)?.title || '';
};
</script>

<template>
  <div class="contract-review-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button class="back-circle-btn" @click="goBack">
          <ChevronLeft :size="20" />
        </button>
        
        <div class="header-info-group">
          <span class="header-badge">文档纠错</span>
          <h1 class="page-title">{{ documentContent.title }}</h1>
          <span class="save-status">已保存</span>
          
          <div class="history-controls">
            <button class="tool-btn icon-only" title="历史记录">
              <Clock :size="16" />
            </button>
            <button 
              class="tool-btn icon-only" 
              :class="{ disabled: !canUndo }"
              :disabled="!canUndo"
              @click="undo"
              title="撤销"
            >
              <RotateCcw :size="16" />
            </button>
            <button 
              class="tool-btn icon-only" 
              :class="{ disabled: !canRedo }"
              :disabled="!canRedo"
              @click="redo"
              title="重做"
            >
              <RotateCw :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="header-center">
        <div class="editor-toolbar">
          <button class="tool-btn icon-only"><Type :size="16" /></button>
          <div class="divider-v"></div>
          <button class="tool-btn icon-only"><Heading1 :size="16" /></button>
          <button class="tool-btn icon-only"><Heading2 :size="16" /></button>
          <button class="tool-btn icon-only"><Heading3 :size="16" /></button>
          <div class="divider-v"></div>
          <button class="tool-btn icon-only"><Bold :size="16" /></button>
          <button class="tool-btn icon-only"><Italic :size="16" /></button>
          <button class="tool-btn icon-only"><Underline :size="16" /></button>
          <div class="divider-v"></div>
          <button class="tool-btn icon-only"><AlignLeft :size="16" /></button>
          <button class="tool-btn icon-only"><ImageIcon :size="16" /></button>
        </div>
      </div>

      <div class="header-right">
        <button class="action-btn-primary" @click="exportResult">
          <Download :size="16" />
          导出Word
        </button>
        <button class="action-btn-secondary" @click="addToKnowledgeBase">
          <Zap :size="16" />
          加入知识库
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left: Contract Document -->
      <div class="contract-panel" ref="contractPanelRef">
        <div class="pages-container">
          <!-- Page 1: Title & Parties -->
          <div class="doc-page">
            <div class="page-content">
              <div class="contract-header">
                <h1 class="contract-title">{{ documentContent.title }}</h1>
                <p class="contract-no">文号：{{ documentContent.docNo }}</p>
              </div>

              <div class="parties-section">
                <div class="party">
                  <div class="party-label">致：</div>
                  <div class="party-info">
                    <p><strong>{{ documentContent.recipient.name }}</strong></p>
                    <p>地址：{{ documentContent.recipient.address }}</p>
                  </div>
                </div>
                <div class="party">
                  <div class="party-label">发函人：</div>
                  <div class="party-info">
                    <p><strong>{{ documentContent.sender.name }}</strong></p>
                    <p>承办律师：{{ documentContent.sender.lawyer }}</p>
                    <p>地址：{{ documentContent.sender.address }}</p>
                    <p>联系电话：{{ documentContent.sender.phone }}</p>
                  </div>
                </div>
              </div>

              <p class="contract-intro">
                &nbsp;
              </p>

              <!-- First 2 clauses on page 1 -->
              <div 
                v-for="clause in documentContent.clauses.slice(0, 2)" 
                :key="clause.id"
                class="contract-clause"
                :class="{ 
                  'has-issues': hasModifications(clause.id),
                  'has-pending': hasPendingModifications(clause.id)
                }"
              >
                <h3 class="clause-title">
                  {{ clause.title }}
                  <span 
                    v-if="hasPendingModifications(clause.id)" 
                    class="clause-badge"
                    :class="getRiskClass(getClauseRiskLevel(clause.id)!)"
                  >
                    {{ getClauseModifications(clause.id).length }}处修改
                  </span>
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseModifications(clause.id)" :key="mod.id">
                    <div 
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.riskLevel), getStatusClass(mod.status)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">修改建议 {{ idx + 1 }}</span>
                      </div>
                      <div class="highlight-text">{{ mod.originalText }}</div>
                      <div class="highlight-status" v-if="mod.status !== 'pending'">
                        <Check v-if="mod.status === 'accepted'" :size="14" />
                        <X v-else :size="14" />
                        {{ mod.status === 'accepted' ? '已采纳' : '已拒绝' }}
                      </div>
                    </div>
                  </template>
                  <pre class="clause-text">{{ clause.content }}</pre>
                </div>
              </div>
            </div>
            <div class="page-footer">
              <span class="page-number">第 1 页</span>
            </div>
          </div>

          <!-- Page 2: Clauses 3-4 -->
          <div class="doc-page">
            <div class="page-content">
              <div 
                v-for="clause in documentContent.clauses.slice(2, 4)" 
                :key="clause.id"
                class="contract-clause"
                :class="{ 
                  'has-issues': hasModifications(clause.id),
                  'has-pending': hasPendingModifications(clause.id)
                }"
              >
                <h3 class="clause-title">
                  {{ clause.title }}
                  <span 
                    v-if="hasPendingModifications(clause.id)" 
                    class="clause-badge"
                    :class="getRiskClass(getClauseRiskLevel(clause.id)!)"
                  >
                    {{ getClauseModifications(clause.id).length }}处修改
                  </span>
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseModifications(clause.id)" :key="mod.id">
                    <div 
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.riskLevel), getStatusClass(mod.status)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">修改建议 {{ idx + 1 }}</span>
                      </div>
                      <div class="highlight-text">{{ mod.originalText }}</div>
                      <div class="highlight-status" v-if="mod.status !== 'pending'">
                        <Check v-if="mod.status === 'accepted'" :size="14" />
                        <X v-else :size="14" />
                        {{ mod.status === 'accepted' ? '已采纳' : '已拒绝' }}
                      </div>
                    </div>
                  </template>
                  <pre class="clause-text">{{ clause.content }}</pre>
                </div>
              </div>
            </div>
            <div class="page-footer">
              <span class="page-number">第 2 页</span>
            </div>
          </div>

          <!-- Page 3: Remaining clauses & Signature -->
          <div class="doc-page">
            <div class="page-content">
              <div 
                v-for="clause in documentContent.clauses.slice(4)" 
                :key="clause.id"
                class="contract-clause"
                :class="{ 
                  'has-issues': hasModifications(clause.id),
                  'has-pending': hasPendingModifications(clause.id)
                }"
              >
                <h3 class="clause-title">
                  {{ clause.title }}
                  <span 
                    v-if="hasPendingModifications(clause.id)" 
                    class="clause-badge"
                    :class="getRiskClass(getClauseRiskLevel(clause.id)!)"
                  >
                    {{ getClauseModifications(clause.id).length }}处修改
                  </span>
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseModifications(clause.id)" :key="mod.id">
                    <div 
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.riskLevel), getStatusClass(mod.status)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">修改建议 {{ idx + 1 }}</span>
                      </div>
                      <div class="highlight-text">{{ mod.originalText }}</div>
                      <div class="highlight-status" v-if="mod.status !== 'pending'">
                        <Check v-if="mod.status === 'accepted'" :size="14" />
                        <X v-else :size="14" />
                        {{ mod.status === 'accepted' ? '已采纳' : '已拒绝' }}
                      </div>
                    </div>
                  </template>
                  <pre class="clause-text">{{ clause.content }}</pre>
                </div>
              </div>

              <!-- Signature Section -->
              <div class="signature-section">
                <div class="sign-row single">
                  <div class="sign-box">
                    <p>发函律师（签章）：</p>
                    <p class="sign-line"></p>
                    <p>{{ documentContent.createDate }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="page-footer">
              <span class="page-number">第 3 页</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Modification Cards Panel -->
      <div class="cards-panel">
        <div class="panel-header">
          <h2>修改建议 <span class="count">{{ stats.pending }}/{{ stats.total }}</span></h2>
          <div class="panel-actions">
            <button class="panel-btn reject" @click="rejectAll" :disabled="stats.pending === 0">
              <XCircle :size="14" />
              全部拒绝
            </button>
            <button class="panel-btn accept" @click="acceptAll" :disabled="stats.pending === 0">
              <CheckCheck :size="14" />
              全部接受
            </button>
          </div>
        </div>

        <div class="cards-container">
          <!-- Modification Cards -->
          <div 
            v-for="(mod, idx) in modifications" 
            :key="mod.id"
            class="mod-card"
            :class="[getStatusClass(mod.status), getRiskClass(mod.riskLevel), { expanded: mod.expanded }]"
          >
            <!-- Card Header (always visible) -->
            <div class="card-header" @click="toggleExpand(mod.id)">
              <div class="card-left">
                <span class="card-index">{{ idx + 1 }}</span>
                <div class="card-info">
                  <span class="card-clause">{{ getClauseTitle(mod.clauseId) }}</span>
                  <span class="card-preview" v-if="!mod.expanded">
                    {{ mod.originalText.slice(0, 35) }}...
                  </span>
                </div>
              </div>
              <div class="card-right">
                <span class="risk-tag" :class="getRiskClass(mod.riskLevel)">
                  {{ getRiskText(mod.riskLevel) }}
                </span>
                <span class="status-tag" v-if="mod.status !== 'pending'" :class="getStatusClass(mod.status)">
                  <Check v-if="mod.status === 'accepted'" :size="12" />
                  <X v-else :size="12" />
                  {{ mod.status === 'accepted' ? '已接受' : '已拒绝' }}
                </span>
                <button class="expand-btn">
                  <ChevronUp v-if="mod.expanded" :size="18" />
                  <ChevronDown v-else :size="18" />
                </button>
              </div>
            </div>

            <!-- Card Body (collapsible) -->
            <div class="card-body" v-show="mod.expanded">
              <!-- Reason -->
              <div class="reason-block" :class="getRiskClass(mod.riskLevel)">
                <div class="reason-header">
                  <AlertTriangle :size="14" />
                  <span>修改理由</span>
                </div>
                <p class="reason-text">{{ mod.reason }}</p>
              </div>

              <!-- Original Text -->
              <div class="text-block original">
                <div class="text-label">
                  <span class="label-dot del"></span>
                  原文内容
                </div>
                <div class="text-content">{{ mod.originalText }}</div>
              </div>

              <!-- Suggested Text -->
              <div class="text-block suggested">
                <div class="text-label">
                  <span class="label-dot add"></span>
                  建议修改为
                </div>
                <div class="text-content">{{ mod.suggestedText }}</div>
              </div>

              <!-- Actions -->
              <div class="card-actions" v-if="mod.status === 'pending'">
                <button class="action-btn accept" @click.stop="acceptModification(mod.id)">
                  <Check :size="16" />
                  接受
                </button>
                <button class="action-btn reject" @click.stop="rejectModification(mod.id)">
                  <X :size="16" />
                  拒绝
                </button>
                <button class="action-btn rewrite" @click.stop="rewriteModification(mod.id)">
                  <Edit3 :size="16" />
                  重写
                </button>
              </div>

              <div class="card-status" v-else>
                <div class="status-display" :class="getStatusClass(mod.status)">
                  <Check v-if="mod.status === 'accepted'" :size="16" />
                  <X v-else :size="16" />
                  {{ mod.status === 'accepted' ? '已接受此修改建议' : '已拒绝此修改建议' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contract-review-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

/* Header - 文档编辑器风格 */
.page-header {
  height: 56px;
  background: linear-gradient(90deg, #e0e7ff 0%, #eff6ff 50%, #e0e7ff 100%);
  border-bottom: 1px solid #c7d2fe;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.back-circle-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: all 0.2s;
}

.back-circle-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-info-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-badge {
  background: white;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.1);
}

.page-title {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  margin: 0;
}

.save-status {
  font-size: 12px;
  color: #94a3b8;
  margin-left: 4px;
}

.history-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid #cbd5e1;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 4px;
  cursor: pointer;
}

.tool-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.05);
  color: #1e293b;
}

.tool-btn:disabled,
.tool-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.divider-v {
  width: 1px;
  height: 16px;
  background: #cbd5e1;
  margin: 0 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.action-btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.2);
}

.action-btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.action-btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: white;
  color: #1e293b;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.action-btn-secondary:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Contract Panel (Left) - 分页文档容器 */
.contract-panel {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  background: #e5e7eb;
}

/* 页面容器 */
.pages-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

/* 单页样式 - A4纸张比例 */
.doc-page {
  width: 720px;
  min-height: 1018px; /* A4比例 */
  background: white;
  border-radius: 2px;
  box-shadow: 
    0 1px 3px rgba(0,0,0,0.08),
    0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  position: relative;
}

.page-content {
  flex: 1;
  padding: 56px 64px 40px 64px;
  overflow: hidden;
}

.page-footer {
  padding: 16px 64px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: center;
}

.page-number {
  font-size: 12px;
  color: #94a3b8;
}

.contract-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #1e293b;
}

.contract-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
  letter-spacing: 4px;
}

.contract-no {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.parties-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 24px;
}

.party-label {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.party-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.contract-intro {
  font-size: 14px;
  color: #475569;
  margin-bottom: 32px;
  text-indent: 2em;
  line-height: 1.8;
}

/* Contract Clause */
.contract-clause {
  margin-bottom: 28px;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

/* 有待处理修改 - 醒目黄色框 */
.contract-clause.has-pending {
  background: #fffbeb;
  border-color: #fcd34d;
}

/* 有修改但已全部处理 - 淡化效果 */
.contract-clause.has-issues:not(.has-pending) {
  background: transparent;
  border-color: transparent;
}

.clause-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.clause-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.clause-badge.risk-high { background: #fee2e2; color: #dc2626; }
.clause-badge.risk-medium { background: #fef3c7; color: #d97706; }
.clause-badge.risk-low { background: #dcfce7; color: #16a34a; }

.clause-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.9;
  color: #475569;
  white-space: pre-wrap;
  margin: 0;
}

/* Highlight Block */
.highlight-block {
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: 6px;
  border-left: 4px solid;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

/* 待处理状态 - 醒目高亮 */
.highlight-block.risk-high { background: #fef2f2; border-color: #dc2626; }
.highlight-block.risk-medium { background: #fffbeb; border-color: #d97706; }
.highlight-block.risk-low { background: #f0fdf4; border-color: #16a34a; }

/* 已接受状态 - 融入正文，几乎透明 */
.highlight-block.status-accepted {
  background: transparent;
  border-color: transparent;
  border-left-width: 0;
  padding-left: 18px;
  margin: 0;
}

.highlight-block.status-accepted .highlight-marker,
.highlight-block.status-accepted .highlight-status {
  display: none;
}

.highlight-block.status-accepted .highlight-text {
  color: #475569;
}

/* 已拒绝状态 - 轻微删除线效果 */
.highlight-block.status-rejected {
  background: transparent;
  border-color: transparent;
  border-left-width: 0;
  padding-left: 18px;
  margin: 0;
}

.highlight-block.status-rejected .highlight-marker,
.highlight-block.status-rejected .highlight-status {
  display: none;
}

.highlight-block.status-rejected .highlight-text {
  color: #94a3b8;
  text-decoration: line-through;
  text-decoration-color: #cbd5e1;
}

/* 滚动定位后的闪烁动画 - 待处理 */
@keyframes flash-highlight {
  0%, 100% { box-shadow: none; }
  25%, 75% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.5); }
}

/* 滚动定位后的闪烁动画 - 已处理（更柔和） */
@keyframes flash-highlight-soft {
  0%, 100% { background: transparent; }
  30%, 70% { background: rgba(59, 130, 246, 0.08); }
}

.highlight-block.flash {
  animation: flash-highlight 2.5s ease-out;
}

.highlight-block.status-accepted.flash,
.highlight-block.status-rejected.flash {
  animation: flash-highlight-soft 2.5s ease-out;
}

.highlight-marker {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.highlight-block.risk-high .marker-dot { background: #dc2626; }
.highlight-block.risk-medium .marker-dot { background: #d97706; }
.highlight-block.risk-low .marker-dot { background: #16a34a; }

.marker-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.highlight-text {
  font-size: 14px;
  line-height: 1.7;
  color: #1e293b;
}

.highlight-status {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
}

.highlight-block.status-accepted .highlight-status { background: #dcfce7; color: #16a34a; }
.highlight-block.status-rejected .highlight-status { background: #f1f5f9; color: #64748b; }

/* Signature Section */
.signature-section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid #e2e8f0;
}

.sign-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}

.sign-box p {
  font-size: 14px;
  color: #475569;
  margin: 8px 0;
}

.sign-line {
  border-bottom: 1px solid #1e293b;
  margin: 16px 0;
}

/* ===== Right: Cards Panel ===== */
.cards-panel {
  width: 420px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-header h2 .count {
  font-weight: 400;
  color: #9ca3af;
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

.panel-btn.reject {
  background: #fef2f2;
  color: #dc2626;
}

.panel-btn.reject:hover:not(:disabled) {
  background: #fee2e2;
}

.panel-btn.accept {
  background: #f0fdf4;
  color: #16a34a;
}

.panel-btn.accept:hover:not(:disabled) {
  background: #dcfce7;
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Modification Card */
.mod-card {
  background: white;
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.2s;
}

.mod-card.expanded {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.mod-card.status-accepted {
  border-left: 4px solid #16a34a;
  opacity: 0.85;
}

.mod-card.status-rejected {
  border-left: 4px solid #94a3b8;
  opacity: 0.7;
}

.mod-card.status-pending.risk-high { border-left: 4px solid #dc2626; }
.mod-card.status-pending.risk-medium { border-left: 4px solid #d97706; }
.mod-card.status-pending.risk-low { border-left: 4px solid #16a34a; }

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.card-header:hover {
  background: #f8fafc;
}

.card-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.card-index {
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-clause {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  display: block;
}

.card-preview {
  font-size: 12px;
  color: #64748b;
  display: block;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.risk-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.risk-tag.risk-high { background: #fee2e2; color: #dc2626; }
.risk-tag.risk-medium { background: #fef3c7; color: #d97706; }
.risk-tag.risk-low { background: #dcfce7; color: #16a34a; }

.status-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-tag.status-accepted { background: #dcfce7; color: #16a34a; }
.status-tag.status-rejected { background: #f1f5f9; color: #64748b; }

.expand-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
}

.expand-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

/* Card Body */
.card-body {
  padding: 0 16px 16px 16px;
  border-top: 1px solid #f1f5f9;
}

.reason-block {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
}

.reason-block.risk-high {
  background: #fef2f2;
  border-color: #fecaca;
}

.reason-block.risk-low {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.reason-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 6px;
}

.reason-block.risk-high .reason-header { color: #dc2626; }
.reason-block.risk-low .reason-header { color: #16a34a; }

.reason-text {
  font-size: 13px;
  line-height: 1.7;
  color: #78716c;
  margin: 0;
}

.text-block {
  margin-top: 12px;
}

.text-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
}

.label-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.label-dot.del { background: #dc2626; }
.label-dot.add { background: #16a34a; }

.text-content {
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
}

.text-block.original .text-content {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.text-block.suggested .text-content {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn.accept {
  background: #16a34a;
  color: white;
}
.action-btn.accept:hover { background: #15803d; }

.action-btn.rewrite {
  background: #dbeafe;
  color: #2563eb;
}
.action-btn.rewrite:hover { background: #bfdbfe; }

.action-btn.reject {
  background: #f1f5f9;
  color: #64748b;
}
.action-btn.reject:hover { background: #e2e8f0; }

.card-status {
  margin-top: 14px;
}

.status-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.status-display.status-accepted { background: #dcfce7; color: #16a34a; }
.status-display.status-rejected { background: #f1f5f9; color: #64748b; }
</style>
