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
