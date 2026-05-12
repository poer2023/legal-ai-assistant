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
  Zap,
  Sparkles,
  FileText,
  BarChart3,
  Table2,
  FileImage,
  Presentation
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import ComparePanel from './ComparePanel.vue';
import type { CompareItem } from './ComparePanel.vue';

const router = useRouter();

// ComparePanel ref
const comparePanelRef = ref<InstanceType<typeof ComparePanel> | null>(null);

// 右侧面板 Tab 状态
type RightPanelTab = 'review' | 'edit';
const rightPanelTab = ref<RightPanelTab>('review');

// Toast 提示状态
const toastMessage = ref('');
const showToast = ref(false);

const displayToast = (message: string, duration = 3000) => {
  toastMessage.value = message;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, duration);
};

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

// --- 完整的示例文书（民事起诉状） ---
const documentContent = ref({
  title: '民事起诉状',
  caseNo: '（2024）京民初字第XXXX号',
  createDate: '2024年12月30日',
  
  plaintiff: {
    name: '张明（原告）',
    gender: '男',
    birthDate: '1985年6月15日',
    nationality: '汉族',
    idNumber: '110105198506150012',
    address: '北京市朝阳区建国路88号院3号楼1801室',
    phone: '13800138001'
  },
  
  defendant: {
    name: '北京恒通房地产开发有限公司（被告）',
    legalRep: '李强',
    position: '总经理',
    address: '北京市海淀区中关村大街16号',
    phone: '010-88889999'
  },
  
  clauses: [
    {
      id: 'clause-1',
      title: '一、诉讼请求',
      content: `1. 判令被告立即向原告交付位于北京市朝阳区望京街道XX小区3号楼2单元1502室的商品房（建筑面积约120平方米）；

2. 判令被告向原告支付逾期交房违约金人民币贰拾万元整（¥200,000.00），自2024年6月1日起算至实际交付之日止；

3. 判令被告承担本案全部诉讼费用。`
    },
    {
      id: 'clause-2',
      title: '二、事实与理由',
      content: `2023年3月15日，原告与被告签订《商品房买卖合同》（案号：HT-2023-0315），约定原告向被告购买位于北京市朝阳区望京街道XX小区3号楼2单元1502室的商品房一套，建筑面积约120平方米，总购房款为人民币陆佰万元整（¥6,000,000.00）。

合同第八条明确约定：被告应于2024年5月31日前将符合交付条件的商品房交付给原告。如逾期交付，被告应按日向原告支付已付购房款万分之一的违约金。

原告已于2023年3月20日按照合同约定支付全部购房款人民币陆佰万元整。

然而，截至起诉之日，被告仍未按照合同约定向原告交付房屋，已构成严重违约。`
    },
    {
      id: 'clause-3',
      title: '三、证据清单',
      content: `1.《商品房买卖合同》原件一份，证明双方之间存在商品房买卖合同关系；

2. 银行转账凭证三份，证明原告已全额支付购房款；

3. 催告函及送达回执各一份，证明原告已依法催告被告履行交房义务；

4. 被告工商登记信息一份，证明被告主体资格。`
    },
    {
      id: 'clause-4',
      title: '四、法律依据',
      content: `根据《中华人民共和国民法典》第五百零九条规定："当事人应当按照约定全面履行自己的义务。"第五百七十七条规定："当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。"

被告未按合同约定期限交付房屋，已构成违约，应当承担继续履行（交付房屋）及支付违约金的法律责任。`
    },
    {
      id: 'clause-5',
      title: '五、结语',
      content: `综上所述，被告的行为已严重侵害了原告的合法权益。为维护原告的正当利益，特依据《中华人民共和国民事诉讼法》第一百二十二条之规定，向贵院提起诉讼，恳请依法支持原告的全部诉讼请求。

此致
北京市朝阳区人民法院`
    }
  ]
});

// --- 修改建议数据 ---
const modifications = ref<Modification[]>([
  {
    id: 'mod-1',
    clauseId: 'clause-1',
    originalText: '2. 判令被告向原告支付逾期交房违约金人民币贰拾万元整（¥200,000.00），自2024年6月1日起算至实际交付之日止；',
    suggestedText: '2. 判令被告向原告支付逾期交房违约金，按已付购房款人民币陆佰万元的日万分之一计算，自2024年6月1日起算至实际交付之日止（暂计至2024年12月30日为人民币壹拾贰万陆仟元整，即¥126,000.00）；',
    reason: '违约金请求应当与合同约定保持一致。合同约定违约金计算方式为"按日支付已付购房款万分之一"，建议按此标准精确计算，并注明计算期间，便于法院审理时核查。',
    riskLevel: 'high',
    status: 'pending',
    expanded: true
  },
  {
    id: 'mod-2',
    clauseId: 'clause-2',
    originalText: '原告已于2023年3月20日按照合同约定支付全部购房款人民币陆佰万元整。',
    suggestedText: '原告已分别于2023年3月20日支付首付款人民币壹佰捌拾万元整（¥1,800,000.00），于2023年4月15日通过银行按揭贷款支付余款人民币肆佰贰拾万元整（¥4,200,000.00），合计支付全部购房款人民币陆佰万元整（¥6,000,000.00）。',
    reason: '事实陈述应当详细、准确，明确各笔付款的时间和金额，与证据相互印证，增强诉讼请求的可信度。',
    riskLevel: 'medium',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-3',
    clauseId: 'clause-2',
    originalText: '然而，截至起诉之日，被告仍未按照合同约定向原告交付房屋，已构成严重违约。',
    suggestedText: '然而，截至本状起诉之日（2024年12月30日），被告仍未按照合同约定向原告交付符合交付条件的房屋，已逾期214天，严重违反合同约定，构成根本违约。',
    reason: '建议明确起诉日期并计算具体逾期天数，突出违约的严重性。使用"根本违约"这一法律术语，强化违约责任的认定。',
    riskLevel: 'medium',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-4',
    clauseId: 'clause-3',
    originalText: '3. 催告函及送达回执各一份，证明原告已依法催告被告履行交房义务；',
    suggestedText: '3. 律师函（含EMS快递单号及签收凭证）一份，证明原告已于2024年7月15日通过律师函书面催告被告履行交房义务，被告于2024年7月18日签收；',
    reason: '证据描述应当具体明确，包括送达方式、送达时间和签收情况，增强证据的证明力，便于法院采信。',
    riskLevel: 'low',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-5',
    clauseId: 'clause-4',
    originalText: '被告未按合同约定期限交付房屋，已构成违约，应当承担继续履行（交付房屋）及支付违约金的法律责任。',
    suggestedText: '被告未按合同约定期限交付房屋，已构成违约。根据《民法典》第五百八十五条第一款"当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金"之规定，被告应当承担继续履行（交付房屋）及按合同约定支付违约金的法律责任。',
    reason: '建议补充违约金的法律依据条款（民法典第585条），使法律论证更加完整充分。',
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

// 获取全局索引
const getModificationIndex = (modId: string) => {
  return modifications.value.findIndex(m => m.id === modId) + 1;
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

// 处理卡片标题区域点击 - 根据状态区分行为
const handleCardHeaderClick = (modId: string) => {
  const mod = modifications.value.find(m => m.id === modId);
  if (!mod) return;
  
  // 检查锚点是否存在（容错处理：用户可能手动删除了内容）
  const anchor = document.getElementById(`highlight-${modId}`);
  if (!anchor) {
    displayToast('该内容位置可能已被手动修改，无法精确定位');
    return;
  }
  
  if (mod.status === 'pending') {
    // 待处理状态：切换展开/收起 + 跳转
    toggleExpand(modId);
  } else {
    // 已处理状态：只跳转定位，不切换展开
    scrollToHighlight(modId);
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

// 转换为 ComparePanel 所需格式
const panelItems = computed((): CompareItem[] => {
  return modifications.value.map(m => ({
    id: m.id,
    clauseId: m.clauseId,
    clauseTitle: getClauseTitle(m.clauseId),
    baseText: m.originalText,
    compareText: m.suggestedText,
    reason: m.reason,
    riskLevel: m.riskLevel,
    status: m.status,
    expanded: m.expanded
  }));
});
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
          <span class="header-badge">文书审查</span>
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
                <p class="contract-no">案号：{{ documentContent.caseNo }}</p>
              </div>

              <div class="parties-section">
                <div class="party">
                  <div class="party-label">原告：</div>
                  <div class="party-info">
                    <p><strong>{{ documentContent.plaintiff.name }}</strong></p>
                    <p>性别：{{ documentContent.plaintiff.gender }}，民族：{{ documentContent.plaintiff.nationality }}</p>
                    <p>出生日期：{{ documentContent.plaintiff.birthDate }}</p>
                    <p>身份证号：{{ documentContent.plaintiff.idNumber }}</p>
                    <p>住址：{{ documentContent.plaintiff.address }}</p>
                    <p>联系电话：{{ documentContent.plaintiff.phone }}</p>
                  </div>
                </div>
                <div class="party">
                  <div class="party-label">被告：</div>
                  <div class="party-info">
                    <p><strong>{{ documentContent.defendant.name }}</strong></p>
                    <p>法定代表人：{{ documentContent.defendant.legalRep }}（{{ documentContent.defendant.position }}）</p>
                    <p>住所地：{{ documentContent.defendant.address }}</p>
                    <p>联系电话：{{ documentContent.defendant.phone }}</p>
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
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseModifications(clause.id)" :key="mod.id">
                    <!-- 只有 pending 状态才显示 diff 高亮块 -->
                    <div
                      v-if="mod.status === 'pending'"
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.riskLevel)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">修改建议 {{ idx + 1 }}</span>
                      </div>
                      <div class="diff-content">
                        <div v-if="mod.originalText" class="diff-line del">{{ mod.originalText }}</div>
                        <div v-if="mod.suggestedText" class="diff-line add">{{ mod.suggestedText }}</div>
                      </div>
                    </div>
                    <!-- 非 pending 状态：保留一个定位锚点用于跳转高亮 -->
                    <span 
                      v-else
                      :id="`highlight-${mod.id}`" 
                      class="modification-anchor"
                      :class="{ 'status-accepted': mod.status === 'accepted', 'status-rejected': mod.status === 'rejected' }"
                    >{{ mod.status === 'accepted' ? mod.suggestedText : mod.originalText }}</span>
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
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseModifications(clause.id)" :key="mod.id">
                    <!-- 只有 pending 状态才显示 diff 高亮块 -->
                    <div
                      v-if="mod.status === 'pending'"
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.riskLevel)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">修改建议 {{ idx + 1 }}</span>
                      </div>
                      <div class="diff-content">
                        <div v-if="mod.originalText" class="diff-line del">{{ mod.originalText }}</div>
                        <div v-if="mod.suggestedText" class="diff-line add">{{ mod.suggestedText }}</div>
                      </div>
                    </div>
                    <!-- 非 pending 状态：保留一个定位锚点用于跳转高亮 -->
                    <span 
                      v-else
                      :id="`highlight-${mod.id}`" 
                      class="modification-anchor"
                      :class="{ 'status-accepted': mod.status === 'accepted', 'status-rejected': mod.status === 'rejected' }"
                    >{{ mod.status === 'accepted' ? mod.suggestedText : mod.originalText }}</span>
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
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseModifications(clause.id)" :key="mod.id">
                    <!-- 只有 pending 状态才显示 diff 高亮块 -->
                    <div
                      v-if="mod.status === 'pending'"
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.riskLevel)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">修改建议 {{ idx + 1 }}</span>
                      </div>
                      <div class="diff-content">
                        <div v-if="mod.originalText" class="diff-line del">{{ mod.originalText }}</div>
                        <div v-if="mod.suggestedText" class="diff-line add">{{ mod.suggestedText }}</div>
                      </div>
                    </div>
                    <!-- 非 pending 状态：保留一个定位锚点用于跳转高亮 -->
                    <span 
                      v-else
                      :id="`highlight-${mod.id}`" 
                      class="modification-anchor"
                      :class="{ 'status-accepted': mod.status === 'accepted', 'status-rejected': mod.status === 'rejected' }"
                    >{{ mod.status === 'accepted' ? mod.suggestedText : mod.originalText }}</span>
                  </template>
                  <pre class="clause-text">{{ clause.content }}</pre>
                </div>
              </div>

              <!-- Signature Section -->
              <div class="signature-section">
                <div class="sign-row single">
                  <div class="sign-box">
                    <p>起诉人（签名/捺印）：</p>
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
      <ComparePanel
        ref="comparePanelRef"
        :items="panelItems"
        panel-title="修改建议"
        :labels="{
          reviewTabLabel: 'AI 审查',
          baseLabel: '原文内容',
          compareLabel: '建议修改为',
          reasonTitle: '修改理由',
          keepBtn: '拒绝',
          adoptBtn: '接受',
          keepAllBtn: '全部拒绝',
          adoptAllBtn: '全部接受',
          keptStatus: '已拒绝此修改',
          adoptedStatus: '已接受此修改'
        }"
        @accept="acceptModification"
        @reject="rejectModification"
        @accept-all="acceptAll"
        @reject-all="rejectAll"
        @toggle-expand="toggleExpand"
        @card-click="handleCardHeaderClick"
      />
    </div>
  </div>

  <!-- Toast 提示 -->
  <Transition name="toast">
    <div v-if="showToast" class="toast-container">
      <div class="toast-message">
        <AlertTriangle :size="18" />
        <span>{{ toastMessage }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.contract-review-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-soft);
}

/* Header - 文档编辑器风格 */
.page-header {
  height: 56px;
  background: linear-gradient(90deg, var(--primary-soft-strong) 0%, var(--primary-soft) 50%, var(--primary-soft-strong) 100%);
  border-bottom: 1px solid var(--primary-border);
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
  color: var(--primary-color);
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
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.1);
}

.page-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-main);
  margin: 0;
}

.save-status {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 4px;
}

.history-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid var(--border-color);
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
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
}

.tool-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.05);
  color: var(--text-main);
}

.tool-btn:disabled,
.tool-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.divider-v {
  width: 1px;
  height: 16px;
  background: var(--border-color);
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
  background: var(--primary-color);
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
  background: var(--primary-color);
  transform: translateY(-1px);
}

.action-btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: white;
  color: var(--text-main);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.action-btn-secondary:hover {
  background: var(--bg-color);
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
  background: var(--border-color);
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
  border-top: 1px solid var(--surface-soft);
  display: flex;
  justify-content: center;
}

.page-number {
  font-size: 12px;
  color: var(--text-muted);
}

.contract-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--text-main);
}

.contract-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px 0;
  letter-spacing: 4px;
}

.contract-no {
  font-size: 14px;
  color: var(--text-secondary);
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
  color: var(--text-main);
  margin-bottom: 8px;
}

.party-info p {
  margin: 4px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.contract-intro {
  font-size: 14px;
  color: var(--text-secondary);
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
  background: transparent;
  border-color: transparent;
}

/* 有修改但已全部处理 - 淡化效果 */
.contract-clause.has-issues:not(.has-pending) {
  background: transparent;
  border-color: transparent;
}

.clause-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
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

.clause-badge.risk-high { background: var(--diff-removed-soft); color: var(--diff-removed); }
.clause-badge.risk-medium { background: var(--warning-soft); color: var(--warning-color); }
.clause-badge.risk-low { background: var(--diff-added-soft); color: var(--diff-added); }

.clause-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-secondary);
  white-space: pre-wrap;
  margin: 0;
}

/* Highlight Block */
.highlight-block {
  margin: 12px 0;
  padding: 0;
  border-radius: 0;
  border-left: none;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

/* 待处理状态 - 移除背景和边框 */
.highlight-block.risk-high { background: transparent; border-color: transparent; }
.highlight-block.risk-medium { background: transparent; border-color: transparent; }
.highlight-block.risk-low { background: transparent; border-color: transparent; }

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
  color: var(--text-secondary);
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
  color: var(--text-muted);
  text-decoration: line-through;
  text-decoration-color: var(--border-color);
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
  margin-bottom: 8px;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.highlight-block.risk-high .marker-dot { background: var(--diff-removed); }
.highlight-block.risk-medium .marker-dot { background: var(--warning-color); }
.highlight-block.risk-low .marker-dot { background: var(--diff-added); }

.marker-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.diff-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diff-line {
  font-size: 14px;
  line-height: 1.6;
  padding: 4px 8px;
  border-radius: 4px;
  text-decoration: none; /* Reset default text decoration */
}

.diff-line.del {
  background-color: var(--diff-removed-soft);
  color: var(--diff-removed);
  text-decoration: line-through;
  text-decoration-color: rgba(185, 28, 28, 0.4);
}

.diff-line.add {
  background-color: var(--diff-added-soft);
  color: var(--diff-added);
}

/* Original highlight-text removal if no longer used */
/* .highlight-text { ... } */

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

.highlight-block.status-accepted .highlight-status { background: var(--diff-added-soft); color: var(--diff-added); }
.highlight-block.status-rejected .highlight-status { background: var(--surface-soft); color: var(--text-secondary); }

/* Signature Section */
.signature-section {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
}

.sign-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}

.sign-box p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 8px 0;
}

.sign-line {
  border-bottom: 1px solid var(--text-main);
  margin: 16px 0;
}

/* ===== Right: Cards Panel ===== */
.cards-panel {
  width: 420px;
  background: var(--bg-color);
  border-left: 1px solid var(--border-color);
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

.panel-btn.reject {
  background: var(--diff-removed-soft);
  color: var(--diff-removed);
}

.panel-btn.reject:hover:not(:disabled) {
  background: var(--diff-removed-soft);
}

.panel-btn.accept {
  background: var(--diff-added-soft);
  color: var(--diff-added);
}

.panel-btn.accept:hover:not(:disabled) {
  background: var(--diff-added-soft);
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Modification Card */
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

/* Card Header */
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

/* Use risk colors for index badge */
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

/* Card Body */
.card-body {
  padding: 0 16px 16px 16px;
  border-top: 1px solid var(--surface-soft);
}

.reason-block {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--diff-removed-soft); /* Light red tint for reason */
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

/* Diff Section in Card */
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

.diff-box.del {
  background: var(--diff-removed-soft);
  border-color: var(--diff-removed-border);
}

.diff-box.add {
  background: var(--diff-added-soft);
  border-color: var(--diff-added-border);
}

.box-label {
  font-size: 11px;
  font-weight: 600;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-box.del .box-label { color: var(--diff-removed); }
.diff-box.del .box-label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--diff-removed);
  border-radius: 2px;
}

.diff-box.add .box-label { color: var(--diff-added); }
.diff-box.add .box-label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--diff-added);
  border-radius: 2px;
}

.box-content {
  padding: 0 12px 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-main);
}

.diff-box.del .box-content {
  text-decoration: line-through;
  color: var(--diff-removed);
  opacity: 0.8;
}

/* Card Actions */
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

.action-btn.accept {
  background: var(--diff-added);
  color: white;
  box-shadow: 0 1px 2px rgba(22, 163, 74, 0.2);
}
.action-btn.accept:hover { background: var(--diff-added); transform: translateY(-1px); }

.action-btn.reject {
  background: var(--surface-soft);
  color: var(--text-secondary);
}
.action-btn.reject:hover { background: var(--border-color); color: var(--text-secondary); }

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

/* 修改锚点 - 用于已接受/拒绝的修改定位 */
.modification-anchor {
  display: inline;
  position: relative;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

/* 接受状态 - 完全无标记，融入正文 */
.modification-anchor.status-accepted {
  /* 无样式，完全融入正文 */
}

/* 拒绝状态 - 灰色删除线 */
.modification-anchor.status-rejected {
  text-decoration: line-through;
  text-decoration-color: var(--text-muted);
  color: var(--text-muted);
}

/* 锚点的闪烁高亮动画 - 只影响锚点本身 */
.modification-anchor.flash {
  animation: anchor-flash 2s ease-out;
}

@keyframes anchor-flash {
  0% { background-color: transparent; }
  20%, 60% { background-color: rgba(37, 99, 235, 0.2); }
  100% { background-color: transparent; }
}

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

/* Toast 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
