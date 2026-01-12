<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import {
  ChevronLeft,
  Check,
  X,
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
  Edit3,
  Sparkles,
  FileText,
  BarChart3,
  Table2,
  FileImage,
  Presentation
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

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

// --- 完整的示例合同 ---
const contractContent = ref({
  title: '软件开发服务合同',
  contractNo: 'HT-2024-001',
  signDate: '2024年12月30日',
  
  partyA: {
    name: '北京未来科技有限公司',
    address: '北京市海淀区中关村大街1号',
    legalRep: '张三',
    contact: '010-12345678'
  },
  
  partyB: {
    name: '深圳智汇软件开发有限公司',
    address: '深圳市南山区科技园路100号',
    legalRep: '李四',
    contact: '0755-87654321'
  },
  
  clauses: [
    {
      id: 'clause-1',
      title: '第一条 项目内容',
      content: `1.1 甲方委托乙方开发"企业智能管理系统"（以下简称"本系统"），包括但不限于以下功能模块：
（1）用户权限管理模块
（2）数据统计分析模块
（3）报表自动生成模块
（4）移动端适配模块

1.2 乙方应按照甲方提供的《需求规格说明书》（附件一）进行开发，确保系统功能完整、运行稳定。

1.3 本系统的技术规格要求详见《技术规范文档》（附件二）。`
    },
    {
      id: 'clause-2',
      title: '第二条 开发周期',
      content: `2.1 本项目开发周期为自合同签订之日起90个日历日。

2.2 项目分为以下阶段：
（1）需求确认阶段：15日
（2）系统设计阶段：20日
（3）编码开发阶段：40日
（4）测试验收阶段：15日

2.3 乙方应在合同签订后30日内完成全部核心功能的开发。`
    },
    {
      id: 'clause-3',
      title: '第三条 合同金额及支付方式',
      content: `3.1 本合同项目总金额为人民币伍拾万元整（¥500,000.00）。

3.2 付款方式如下：
（1）合同签订后5个工作日内，甲方向乙方支付合同总额的30%作为预付款，即人民币壹拾伍万元整（¥150,000.00）；
（2）系统完成开发并通过甲方初验后5个工作日内，甲方向乙方支付合同总额的50%，即人民币贰拾伍万元整（¥250,000.00）；
（3）系统上线运行满3个月且无重大缺陷后5个工作日内，甲方向乙方支付合同总额的20%作为尾款，即人民币壹拾万元整（¥100,000.00）。

3.3 乙方应向甲方提供等额有效发票。`
    },
    {
      id: 'clause-4',
      title: '第四条 双方权利义务',
      content: `4.1 甲方权利义务：
（1）按时提供项目所需的业务资料和技术文档；
（2）指定专人配合乙方进行需求沟通和系统测试；
（3）按合同约定及时支付各期款项；
（4）对乙方提交的阶段性成果及时进行确认。

4.2 乙方权利义务：
（1）按照合同约定的时间节点完成各阶段工作；
（2）保证系统质量符合国家相关技术标准；
（3）提供系统操作培训和技术文档；
（4）在质保期内提供免费技术支持和缺陷修复服务。`
    },
    {
      id: 'clause-5',
      title: '第五条 违约责任',
      content: `5.1 如乙方未能按时交付系统，每延迟一日，应向甲方支付合同总额0.5%的违约金，但违约金总额不超过合同总额的30%。

5.2 如甲方未按时支付款项，每延迟一日，应向乙方支付未付款项0.05%的滞纳金。

5.3 甲方有权随时终止本合同，无需承担任何责任。

5.4 因一方严重违约导致合同无法继续履行的，守约方有权解除合同并要求违约方赔偿实际损失。`
    },
    {
      id: 'clause-6',
      title: '第六条 知识产权',
      content: `6.1 本合同项下开发的所有软件、文档及相关知识产权归甲方所有。

6.2 乙方保证其提供的技术方案和代码不侵犯任何第三方的知识产权。

6.3 如因知识产权争议给甲方造成损失的，乙方应承担全部赔偿责任。`
    },
    {
      id: 'clause-7',
      title: '第七条 保密条款',
      content: `7.1 双方对在合同履行过程中知悉的对方商业秘密负有保密义务，保密期限为合同终止后3年。

7.2 未经对方书面同意，任何一方不得向第三方披露、转让或许可使用上述保密信息。

7.3 违反保密义务的一方应赔偿对方因此遭受的全部损失。`
    },
    {
      id: 'clause-8',
      title: '第八条 争议解决',
      content: `8.1 本合同的签订、履行、解释及争议解决均适用中华人民共和国法律。

8.2 双方因履行本合同发生争议的，应向甲方所在地人民法院提起诉讼。`
    },
    {
      id: 'clause-9',
      title: '第九条 其他条款',
      content: `9.1 本合同一式四份，双方各执两份，具有同等法律效力。

9.2 本合同自双方签字盖章之日起生效。

9.3 本合同未尽事宜，双方可另行签订补充协议，补充协议与本合同具有同等法律效力。`
    }
  ]
});

// --- 修改建议数据 ---
const modifications = ref<Modification[]>([
  {
    id: 'mod-1',
    clauseId: 'clause-2',
    originalText: '2.3 乙方应在合同签订后30日内完成全部核心功能的开发。',
    suggestedText: '2.3 乙方应在合同签订后60日内完成全部核心功能的开发，如因不可抗力或甲方原因导致延误，工期相应顺延。',
    reason: '30日内完成全部核心功能时间过于紧迫，建议延长至60日。同时增加不可抗力和甲方原因导致延误的免责条款，避免因客观原因被认定为违约。',
    riskLevel: 'high',
    status: 'pending',
    expanded: true  // 第一个默认展开
  },
  {
    id: 'mod-2',
    clauseId: 'clause-5',
    originalText: '5.1 如乙方未能按时交付系统，每延迟一日，应向甲方支付合同总额0.5%的违约金，但违约金总额不超过合同总额的30%。',
    suggestedText: '5.1 如乙方未能按时交付系统，每延迟一日，应向甲方支付合同总额0.1%的违约金，但违约金总额不超过合同总额的10%。',
    reason: '违约金比例过高（0.5%/日，上限30%），延迟60天即达到上限。根据《民法典》第585条，违约金过高可被法院调减。建议调整为0.1%/日，上限10%，更符合行业惯例。',
    riskLevel: 'high',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-3',
    clauseId: 'clause-5',
    originalText: '5.3 甲方有权随时终止本合同，无需承担任何责任。',
    suggestedText: '5.3 甲方如需提前终止本合同，应提前30日书面通知乙方，并支付乙方已完成工作量对应的款项及合理的资遣费用。',
    reason: '此条款明显不公平，赋予甲方单方面无责解除权，严重损害乙方利益。根据《民法典》公平原则，建议增加提前通知期和已完成工作的结算条款。',
    riskLevel: 'high',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-4',
    clauseId: 'clause-6',
    originalText: '6.1 本合同项下开发的所有软件、文档及相关知识产权归甲方所有。',
    suggestedText: '6.1 本合同项下新开发的软件、文档及相关知识产权归甲方所有。乙方在本合同签订前已拥有的技术、工具、组件等知识产权仍归乙方所有，乙方授权甲方在本项目范围内免费使用。',
    reason: '原条款未区分"新开发"和"原有"知识产权，可能导致乙方已有技术资产被无偿转让。建议明确区分，保护乙方原有知识产权。',
    riskLevel: 'medium',
    status: 'pending',
    expanded: false
  },
  {
    id: 'mod-5',
    clauseId: 'clause-8',
    originalText: '8.2 双方因履行本合同发生争议的，应向甲方所在地人民法院提起诉讼。',
    suggestedText: '8.2 双方因履行本合同发生争议的，应首先通过友好协商解决；协商不成的，任何一方可向被告所在地人民法院提起诉讼。',
    reason: '建议增加协商前置程序，减少诉讼成本；同时将管辖改为"被告所在地"，更符合法律规定的一般管辖原则。',
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
  contractContent.value.clauses.forEach(c => {
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
  contractContent.value.clauses.forEach(c => {
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
    const clause = contractContent.value.clauses.find(c => c.id === mod.clauseId);
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

const acceptAll = () => {
  modifications.value.forEach(mod => {
    if (mod.status === 'pending') {
      // 真实替换正文
      const clause = contractContent.value.clauses.find(c => c.id === mod.clauseId);
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
  return contractContent.value.clauses.find(c => c.id === clauseId)?.title || '';
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
          <span class="header-badge">合同审查</span>
          <h1 class="page-title">{{ contractContent.title }}</h1>
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
                <h1 class="contract-title">{{ contractContent.title }}</h1>
                <p class="contract-no">合同编号：{{ contractContent.contractNo }}</p>
              </div>

              <div class="parties-section">
                <div class="party">
                  <div class="party-label">甲方（委托方）：</div>
                  <div class="party-info">
                    <p><strong>{{ contractContent.partyA.name }}</strong></p>
                    <p>地址：{{ contractContent.partyA.address }}</p>
                    <p>法定代表人：{{ contractContent.partyA.legalRep }}</p>
                    <p>联系电话：{{ contractContent.partyA.contact }}</p>
                  </div>
                </div>
                <div class="party">
                  <div class="party-label">乙方（受托方）：</div>
                  <div class="party-info">
                    <p><strong>{{ contractContent.partyB.name }}</strong></p>
                    <p>地址：{{ contractContent.partyB.address }}</p>
                    <p>法定代表人：{{ contractContent.partyB.legalRep }}</p>
                    <p>联系电话：{{ contractContent.partyB.contact }}</p>
                  </div>
                </div>
              </div>

              <p class="contract-intro">
                甲、乙双方经友好协商，就甲方委托乙方进行软件开发事宜，达成如下协议：
              </p>

              <!-- First 2 clauses on page 1 -->
              <div 
                v-for="clause in contractContent.clauses.slice(0, 2)" 
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
                        <span class="marker-label">修改建议 {{ getModificationIndex(mod.id) }}</span>
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
                v-for="clause in contractContent.clauses.slice(2, 4)" 
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
                        <span class="marker-label">修改建议 {{ getModificationIndex(mod.id) }}</span>
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
                v-for="clause in contractContent.clauses.slice(4)" 
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
                        <span class="marker-label">修改建议 {{ getModificationIndex(mod.id) }}</span>
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
                <div class="sign-row">
                  <div class="sign-box">
                    <p>甲方（盖章）：</p>
                    <p class="sign-line"></p>
                    <p>法定代表人（签字）：</p>
                    <p class="sign-line"></p>
                    <p>日期：{{ contractContent.signDate }}</p>
                  </div>
                  <div class="sign-box">
                    <p>乙方（盖章）：</p>
                    <p class="sign-line"></p>
                    <p>法定代表人（签字）：</p>
                    <p class="sign-line"></p>
                    <p>日期：{{ contractContent.signDate }}</p>
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
        <!-- 顶部 Tab 切换 -->
        <div class="panel-tabs">
          <button 
            class="panel-tab" 
            :class="{ active: rightPanelTab === 'review' }"
            @click="rightPanelTab = 'review'"
          >
            <Check :size="16" />
            AI 审查
          </button>
          <button 
            class="panel-tab" 
            :class="{ active: rightPanelTab === 'edit' }"
            @click="rightPanelTab = 'edit'"
          >
            <Edit3 :size="16" />
            AI 编辑
          </button>
        </div>

        <!-- AI 审查模式 -->
        <template v-if="rightPanelTab === 'review'">
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
                :class="[{ expanded: mod.expanded }]"
              >
                <!-- Card Header (always visible) -->
                <div class="card-header" @click="handleCardHeaderClick(mod.id)">
                  <div class="card-left">
                    <span class="card-index" :class="getRiskClass(mod.riskLevel)">{{ idx + 1 }}</span>
                    <div class="card-info">
                      <span class="card-clause">{{ getClauseTitle(mod.clauseId) }}</span>
                      <!-- Preview removed for cleaner look or optional -->
                    </div>
                  </div>
                  <div class="card-right">
                    <span class="risk-tag" :class="getRiskClass(mod.riskLevel)">
                      {{ getRiskText(mod.riskLevel) }}
                    </span>
                    <button class="expand-btn" @click.stop="toggleExpand(mod.id)">
                      <ChevronUp v-if="mod.expanded" :size="18" />
                      <ChevronDown v-else :size="18" />
                    </button>
                  </div>
                </div>

                <!-- Card Body (collapsible) -->
                <div class="card-body" v-show="mod.expanded">
                  <!-- Reason -->
                  <div class="reason-block">
                    <div class="reason-header">
                      <AlertTriangle :size="14" />
                      <span>修改理由</span>
                    </div>
                    <p class="reason-text">{{ mod.reason }}</p>
                  </div>

                  <!-- Diff Content in Card -->
                  <div class="card-diff-section">
                    <div v-if="mod.originalText" class="diff-box del">
                      <div class="box-label">原文内容</div>
                      <div class="box-content">{{ mod.originalText }}</div>
                    </div>
                    <div v-if="mod.suggestedText" class="diff-box add">
                      <div class="box-label">建议修改为</div>
                      <div class="box-content">{{ mod.suggestedText }}</div>
                    </div>
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
      </div>
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
  padding: 0; /* Removed padding */
  border-radius: 0; /* Removed radius */
  border-left: none; /* Removed border */
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

/* 待处理状态 - 移除背景色和边框 */
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
  text-decoration-color: #94a3b8;
  color: #94a3b8;
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

.highlight-block.risk-high .marker-dot { background: #dc2626; }
.highlight-block.risk-medium .marker-dot { background: #d97706; }
.highlight-block.risk-low .marker-dot { background: #16a34a; }

.marker-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
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
  background-color: #fee2e2;
  color: #b91c1c;
  text-decoration: line-through;
  text-decoration-color: rgba(185, 28, 28, 0.4);
}

.diff-line.add {
  background-color: #dcfce7;
  color: #15803d;
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
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-header h2 .count {
  font-weight: 500;
  color: #64748b;
  font-size: 13px;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 12px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.panel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f1f5f9 !important;
  color: #94a3b8 !important;
  border-color: transparent !important;
}

.panel-btn.reject {
  background: white;
  border-color: #fecaca;
  color: #dc2626;
}

.panel-btn.reject:hover:not(:disabled) {
  background: #fef2f2;
}

.panel-btn.accept {
  background: white;
  border-color: #bbf7d0;
  color: #16a34a;
}

.panel-btn.accept:hover:not(:disabled) {
  background: #f0fdf4;
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Modification Card */
.mod-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0; /* No colored left border */
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.mod-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-2px);
  border-color: #cbd5e1;
}

.mod-card.expanded {
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  border-color: #94a3b8;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: flex-start; /* Align to top for multi-line titles */
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  background: white;
  transition: background 0.2s;
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
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  margin-top: 2px; /* Align with text */
}

/* Use risk colors for index badge background with low opacity */
.card-index.risk-high { background: #fee2e2; color: #dc2626; }
.card-index.risk-medium { background: #fef3c7; color: #d97706; }
.card-index.risk-low { background: #dcfce7; color: #16a34a; }

.card-info {
  flex: 1;
  min-width: 0;
}

.card-clause {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  display: block;
  line-height: 1.5;
  margin-bottom: 2px;
}

.card-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 8px;
  margin-top: 2px;
}

.risk-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  background: #f1f5f9;
  color: #64748b;
}

.risk-tag.risk-high { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.risk-tag.risk-medium { background: #fffbeb; color: #f59e0b; border: 1px solid #fef3c7; }
.risk-tag.risk-low { background: #f0fdf4; color: #10b981; border: 1px solid #dcfce7; }

.expand-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

/* Card Body */
.card-body {
  padding: 0 16px 20px 16px;
  border-top: 1px solid #f1f5f9;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.reason-block {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #fff1f2;
  border: 1px solid #ffe4e6;
}

.reason-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #e11d48;
  margin-bottom: 8px;
}

.reason-text {
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  margin: 0;
  text-align: justify;
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
  background: #fef2f2;
  border-color: #fecaca;
}

.diff-box.add {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.box-label {
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.5);
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.diff-box.del .box-label { color: #991b1b; }
.diff-box.del .box-label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #ef4444;
  border-radius: 2px;
}

.diff-box.add .box-label { color: #166534; }
.diff-box.add .box-label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 2px;
}

.box-content {
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
}

.diff-box.del .box-content {
  text-decoration: line-through;
  color: #7f1d1d;
  opacity: 0.8;
  background: rgba(254, 226, 226, 0.3);
}

.diff-box.add .box-content {
  background: rgba(220, 252, 231, 0.3);
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
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.accept {
  background: #16a34a;
  color: white;
  box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
}
.action-btn.accept:hover {
  background: #15803d;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3);
}
.action-btn.accept:active { transform: translateY(0); }

.action-btn.reject {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
.action-btn.reject:hover {
  background: #e2e8f0;
  color: #475569;
  border-color: #cbd5e1;
}
.action-btn.reject:active { transform: translateY(0); }

.card-status {
  margin-top: 16px;
}

.status-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.status-display.status-accepted {
  background: #dcfce7;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}
.status-display.status-rejected {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

/* ============ 右侧面板 Tab 切换 ============ */
.panel-tabs {
  display: flex;
  gap: 0;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.panel-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
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
  background: #f8fafc;
  color: #3b82f6;
}

.panel-tab.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #2563eb;
}

.panel-tab.active + .panel-tab {
  border-left-color: #2563eb;
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
  color: #3b82f6;
  margin-top: 2px;
}

.section-icon.sparkle {
  color: #d97706;
}

.section-icon.ppt {
  color: #dc2626;
}

.section-title-group h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* 文本编辑工具按钮 */
.text-tools {
  display: flex;
  gap: 12px;
}

.text-tool-btn {
  flex: 1;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.text-tool-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

/* 多模态工具 */
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
  background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%);
}

.tool-row.gradient-rainbow {
  background: linear-gradient(135deg, #fdf2f8 0%, #eff6ff 33%, #f0fdf4 66%, #fefce8 100%);
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

.tool-card svg {
  color: #3b82f6;
}

.tool-card span {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.formula-icon {
  font-size: 24px;
  font-weight: 600;
  color: #d97706;
}

/* PPT 功能区 */
.ppt-section {
  background: #fef3c7;
  border: 1px solid #fcd34d;
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

.feature-icon {
  color: #3b82f6;
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  min-width: 60px;
}

.feature-desc {
  font-size: 13px;
  color: #64748b;
}

.ppt-generate-btn {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
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

.cursor-icon {
  font-size: 20px;
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
  background: #1e293b;
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}

.toast-message svg {
  color: #fbbf24;
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
