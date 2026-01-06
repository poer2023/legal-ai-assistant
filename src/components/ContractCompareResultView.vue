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
type DiffLevel = 'high' | 'medium' | 'low';

interface Difference {
  id: string;
  clauseId: string;
  baseText: string;      // 基准合同内容
  compareText: string;   // 对比合同内容
  diffNote: string;      // 差异点说明
  diffLevel: DiffLevel;
  status: ChangeStatus;
  expanded: boolean;
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

// --- 差异对比数据 ---
const differences = ref<Difference[]>([
  {
    id: 'diff-1',
    clauseId: 'clause-2',
    baseText: '2.3 乙方应在合同签订后30日内完成全部核心功能的开发。',
    compareText: '2.3 乙方应在合同签订后60日内完成全部核心功能的开发，如因不可抗力或甲方原因导致延误，工期相应顺延。',
    diffNote: '开发周期从30日延长至60日，新增了不可抗力和甲方原因导致延误的免责条款。',
    diffLevel: 'high',
    status: 'pending',
    expanded: true
  },
  {
    id: 'diff-2',
    clauseId: 'clause-5',
    baseText: '5.1 如乙方未能按时交付系统，每延迟一日，应向甲方支付合同总额0.5%的违约金，但违约金总额不超过合同总额的30%。',
    compareText: '5.1 如乙方未能按时交付系统，每延迟一日，应向甲方支付合同总额0.1%的违约金，但违约金总额不超过合同总额的10%。',
    diffNote: '违约金比例从0.5%/日降至0.1%/日，上限从30%降至10%。',
    diffLevel: 'high',
    status: 'pending',
    expanded: false
  },
  {
    id: 'diff-3',
    clauseId: 'clause-5',
    baseText: '5.3 甲方有权随时终止本合同，无需承担任何责任。',
    compareText: '5.3 甲方如需提前终止本合同，应提前30日书面通知乙方，并支付乙方已完成工作量对应的款项及合理的资遣费用。',
    diffNote: '删除了甲方单方面无责解除权，新增了提前通知期和已完成工作的结算条款。',
    diffLevel: 'high',
    status: 'pending',
    expanded: false
  },
  {
    id: 'diff-4',
    clauseId: 'clause-6',
    baseText: '6.1 本合同项下开发的所有软件、文档及相关知识产权归甲方所有。',
    compareText: '6.1 本合同项下新开发的软件、文档及相关知识产权归甲方所有。乙方在本合同签订前已拥有的技术、工具、组件等知识产权仍归乙方所有，乙方授权甲方在本项目范围内免费使用。',
    diffNote: '新增了乙方原有知识产权的保护条款，明确区分“新开发”和“原有”。',
    diffLevel: 'medium',
    status: 'pending',
    expanded: false
  },
  {
    id: 'diff-5',
    clauseId: 'clause-8',
    baseText: '8.2 双方因履行本合同发生争议的，应向甲方所在地人民法院提起诉讼。',
    compareText: '8.2 双方因履行本合同发生争议的，应首先通过友好协商解决；协商不成的，任何一方可向被告所在地人民法院提起诉讼。',
    diffNote: '新增协商前置程序，管辖改为“被告所在地”。',
    diffLevel: 'low',
    status: 'pending',
    expanded: false
  }
]);

// --- State ---
interface HistoryState {
  differences: Difference[];
  clauseContents: Record<string, string>;
}
const historyStack = ref<HistoryState[]>([]);
const historyIndex = ref(-1);

// 保存当前状态到历史记录
const saveHistory = () => {
  const snapshot: HistoryState = {
    differences: JSON.parse(JSON.stringify(differences.value)),
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
  differences.value = JSON.parse(JSON.stringify(state.differences));
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
  total: differences.value.length,
  pending: differences.value.filter(m => m.status === 'pending').length,
  accepted: differences.value.filter(m => m.status === 'accepted').length,
  rejected: differences.value.filter(m => m.status === 'rejected').length,
  highRisk: differences.value.filter(m => m.diffLevel === 'high').length
}));

// 获取某条款的修改
const getClauseDifferences = (clauseId: string) => {
  return differences.value.filter(m => m.clauseId === clauseId);
};

// 检查条款是否有修改
const hasDifferences = (clauseId: string) => {
  return differences.value.some(m => m.clauseId === clauseId);
};

// 检查条款是否还有待处理的修改
const hasPendingDifferences = (clauseId: string) => {
  return differences.value.some(m => m.clauseId === clauseId && m.status === 'pending');
};

// 获取条款的最高风险级别
const getClauseDiffLevel = (clauseId: string): DiffLevel | null => {
  const mods = getClauseDifferences(clauseId);
  if (mods.length === 0) return null;
  if (mods.some(m => m.diffLevel === 'high')) return 'high';
  if (mods.some(m => m.diffLevel === 'medium')) return 'medium';
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
  const mod = differences.value.find(m => m.id === modId);
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
  differences.value.forEach(m => {
    m.expanded = m.id === modId;
  });
  scrollToHighlight(modId);
};

const acceptDifference = (modId: string) => {
  const mod = differences.value.find(m => m.id === modId);
  if (mod) {
    // 真实替换正文中的原文为建议文本
    const clause = contractContent.value.clauses.find(c => c.id === mod.clauseId);
    if (clause) {
      clause.content = clause.content.replace(mod.baseText, mod.compareText);
    }
    
    mod.status = 'accepted';
    mod.expanded = false;
    saveHistory();
    // 自动展开下一个待处理项
    const next = differences.value.find(m => m.status === 'pending');
    if (next) next.expanded = true;
  }
};

const rejectDifference = (modId: string) => {
  const mod = differences.value.find(m => m.id === modId);
  if (mod) {
    mod.status = 'rejected';
    mod.expanded = false;
    saveHistory();
    const next = differences.value.find(m => m.status === 'pending');
    if (next) next.expanded = true;
  }
};

const rewriteDifference = (modId: string) => {
  const mod = differences.value.find(m => m.id === modId);
  if (mod) {
    const newText = prompt('请输入修改后的内容：', mod.compareText);
    if (newText && newText !== mod.compareText) {
      mod.compareText = newText;
      mod.status = 'accepted';
      mod.expanded = false;
      saveHistory();
      const next = differences.value.find(m => m.status === 'pending');
      if (next) next.expanded = true;
    }
  }
};

const acceptAll = () => {
  differences.value.forEach(mod => {
    if (mod.status === 'pending') {
      // 真实替换正文
      const clause = contractContent.value.clauses.find(c => c.id === mod.clauseId);
      if (clause) {
        clause.content = clause.content.replace(mod.baseText, mod.compareText);
      }
      mod.status = 'accepted';
      mod.expanded = false;
    }
  });
  saveHistory();
};

const rejectAll = () => {
  differences.value.forEach(m => {
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
const getRiskClass = (level: DiffLevel) => ({
  'risk-high': level === 'high',
  'risk-medium': level === 'medium',
  'risk-low': level === 'low'
});

const getRiskText = (level: DiffLevel) => 
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
          <span class="header-badge">合同对比</span>
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
                  'has-issues': hasDifferences(clause.id),
                  'has-pending': hasPendingDifferences(clause.id)
                }"
              >
                <h3 class="clause-title">
                  {{ clause.title }}
                  <span 
                    v-if="hasPendingDifferences(clause.id)" 
                    class="clause-badge"
                    :class="getRiskClass(getClauseDiffLevel(clause.id)!)"
                  >
                    {{ getClauseDifferences(clause.id).length }}处差异
                  </span>
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseDifferences(clause.id)" :key="mod.id">
                    <div 
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.diffLevel), getStatusClass(mod.status)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">差异对比 {{ idx + 1 }}</span>
                      </div>
                      <div class="highlight-text">{{ mod.baseText }}</div>
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
                v-for="clause in contractContent.clauses.slice(2, 4)" 
                :key="clause.id"
                class="contract-clause"
                :class="{ 
                  'has-issues': hasDifferences(clause.id),
                  'has-pending': hasPendingDifferences(clause.id)
                }"
              >
                <h3 class="clause-title">
                  {{ clause.title }}
                  <span 
                    v-if="hasPendingDifferences(clause.id)" 
                    class="clause-badge"
                    :class="getRiskClass(getClauseDiffLevel(clause.id)!)"
                  >
                    {{ getClauseDifferences(clause.id).length }}处差异
                  </span>
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseDifferences(clause.id)" :key="mod.id">
                    <div 
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.diffLevel), getStatusClass(mod.status)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">差异对比 {{ idx + 1 }}</span>
                      </div>
                      <div class="highlight-text">{{ mod.baseText }}</div>
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
                v-for="clause in contractContent.clauses.slice(4)" 
                :key="clause.id"
                class="contract-clause"
                :class="{ 
                  'has-issues': hasDifferences(clause.id),
                  'has-pending': hasPendingDifferences(clause.id)
                }"
              >
                <h3 class="clause-title">
                  {{ clause.title }}
                  <span 
                    v-if="hasPendingDifferences(clause.id)" 
                    class="clause-badge"
                    :class="getRiskClass(getClauseDiffLevel(clause.id)!)"
                  >
                    {{ getClauseDifferences(clause.id).length }}处差异
                  </span>
                </h3>
                <div class="clause-content">
                  <template v-for="(mod, idx) in getClauseDifferences(clause.id)" :key="mod.id">
                    <div 
                      :id="`highlight-${mod.id}`"
                      class="highlight-block"
                      :class="[getRiskClass(mod.diffLevel), getStatusClass(mod.status)]"
                      @click="expandCard(mod.id)"
                    >
                      <div class="highlight-marker">
                        <span class="marker-dot"></span>
                        <span class="marker-label">差异对比 {{ idx + 1 }}</span>
                      </div>
                      <div class="highlight-text">{{ mod.baseText }}</div>
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

      <!-- Right: Difference Cards Panel -->
      <div class="cards-panel">
        <div class="panel-header">
          <h2>差异对比 <span class="count">{{ stats.pending }}/{{ stats.total }}</span></h2>
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
          <!-- Difference Cards -->
          <div 
            v-for="(mod, idx) in differences" 
            :key="mod.id"
            class="mod-card"
            :class="[getStatusClass(mod.status), getRiskClass(mod.diffLevel), { expanded: mod.expanded }]"
          >
            <!-- Card Header (always visible) -->
            <div class="card-header" @click="toggleExpand(mod.id)">
              <div class="card-left">
                <span class="card-index">{{ idx + 1 }}</span>
                <div class="card-info">
                  <span class="card-clause">{{ getClauseTitle(mod.clauseId) }}</span>
                  <span class="card-preview" v-if="!mod.expanded">
                    {{ mod.baseText.slice(0, 35) }}...
                  </span>
                </div>
              </div>
              <div class="card-right">
                <span class="risk-tag" :class="getRiskClass(mod.diffLevel)">
                  {{ getRiskText(mod.diffLevel) }}
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
              <div class="reason-block" :class="getRiskClass(mod.diffLevel)">
                <div class="reason-header">
                  <AlertTriangle :size="14" />
                  <span>差异点</span>
                </div>
                <p class="reason-text">{{ mod.diffNote }}</p>
              </div>

              <!-- Original Text -->
              <div class="text-block original">
                <div class="text-label">
                  <span class="label-dot del"></span>
                  基准合同内容
                </div>
                <div class="text-content">{{ mod.baseText }}</div>
              </div>

              <!-- Suggested Text -->
              <div class="text-block suggested">
                <div class="text-label">
                  <span class="label-dot add"></span>
                  对比合同内容
                </div>
                <div class="text-content">{{ mod.compareText }}</div>
              </div>

              <!-- Actions -->
              <div class="card-actions" v-if="mod.status === 'pending'">
                <button class="action-btn accept" @click.stop="acceptDifference(mod.id)">
                  <Check :size="16" />
                  接受
                </button>
                <button class="action-btn reject" @click.stop="rejectDifference(mod.id)">
                  <X :size="16" />
                  拒绝
                </button>
                <button class="action-btn rewrite" @click.stop="rewriteDifference(mod.id)">
                  <Edit3 :size="16" />
                  重写
                </button>
              </div>

              <div class="card-status" v-else>
                <div class="status-display" :class="getStatusClass(mod.status)">
                  <Check v-if="mod.status === 'accepted'" :size="16" />
                  <X v-else :size="16" />
                  {{ mod.status === 'accepted' ? '已接受此差异对比' : '已拒绝此差异对比' }}
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

/* Difference Card */
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
  background: #eff6ff;
  border: 1px solid #bfdbfe;
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
  color: #2563eb;
  margin-bottom: 6px;
}

.reason-block.risk-high .reason-header { color: #dc2626; }
.reason-block.risk-low .reason-header { color: #16a34a; }

.reason-text {
  font-size: 13px;
  line-height: 1.7;
  color: #475569;
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

.label-dot.del { background: #16a34a; }
.label-dot.add { background: #dc2626; }

.text-content {
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
}

/* 基准合同 - 绿色 */
.text-block.original .text-content {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

/* 对比合同 - 红色突出差异 */
.text-block.suggested .text-content {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
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
