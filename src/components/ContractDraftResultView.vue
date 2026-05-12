<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AgentResultLayout from './AgentResultLayout.vue';

const router = useRouter();

// --- 合同起草完整内容 ---
const contractContent = ref({
  title: '房屋租赁合同',
  contractNo: 'HT-ZL-2024-0156',
  signDate: '2024年12月30日',

  partyA: {
    name: '张伟（出租方）',
    idCard: '110101198801011234',
    address: '北京市朝阳区建国路88号',
    phone: '138****5678'
  },

  partyB: {
    name: '李娜（承租方）',
    idCard: '310102199002022345',
    address: '上海市黄浦区南京路100号',
    phone: '159****8765'
  },

  clauses: [
    {
      id: 'clause-1',
      title: '第一条 租赁标的物',
      content: `1.1 甲方同意将其合法拥有的位于北京市朝阳区望京SOHO 2号楼1808室的房屋（以下简称"租赁房屋"）出租给乙方使用。

1.2 租赁房屋建筑面积为85平方米，户型为两室一厅一厨一卫。

1.3 租赁房屋的具体位置、面积、装修及附属设施详见本合同附件《房屋清单》。`
    },
    {
      id: 'clause-2',
      title: '第二条 租赁用途',
      content: `2.1 乙方承租房屋仅用作住宅居住使用。

2.2 未经甲方书面同意，乙方不得擅自改变房屋用途，不得将房屋用于违法活动或危险用途。

2.3 乙方不得在租赁房屋内从事经营性活动或开设公司。`
    },
    {
      id: 'clause-3',
      title: '第三条 租赁期限',
      content: `3.1 租赁期限自2025年1月1日起至2026年12月31日止，共计24个月。

3.2 租赁期满，本合同自然终止。乙方如需继续承租，应提前60日向甲方提出续租申请，经甲方同意后重新签订租赁合同。

3.3 合同期满前，乙方如需提前解除合同，应提前30日书面通知甲方，并承担相应违约责任。`
    },
    {
      id: 'clause-4',
      title: '第四条 租金及支付方式',
      content: `4.1 租金标准：租赁房屋每月租金为人民币捌仟伍佰元整（¥8,500.00）。

4.2 支付方式：乙方采用押一付三的方式支付租金，即每三个月支付一次，每次支付人民币贰万伍仟伍佰元整（¥25,500.00）。

4.3 首期租金及押金：
（1）合同签订后5日内，乙方应向甲方支付首期3个月租金人民币贰万伍仟伍佰元整（¥25,500.00）；
（2）同时支付押金人民币捌仟伍佰元整（¥8,500.00），合同终止且房屋及设施无损后全额退还。

4.4 后续租金应在每个缴费周期到期前7日内支付完毕。`
    },
    {
      id: 'clause-5',
      title: '第五条 房屋交付与验收',
      content: `5.1 甲方应于2025年1月1日前将租赁房屋及附件《房屋清单》所列设施设备交付给乙方使用。

5.2 乙方应对房屋及设施进行验收，确认无误后在《房屋交接单》上签字。

5.3 交付时房屋应满足基本居住条件，水电气暖等设施正常运转。`
    },
    {
      id: 'clause-6',
      title: '第六条 房屋使用与维护',
      content: `6.1 甲方应确保房屋主体结构、门窗、水电管线等基础设施的正常使用，如发生损坏由甲方负责维修。

6.2 乙方应合理使用租赁房屋及附属设施，因乙方使用不当或故意造成的损坏，由乙方承担维修费用。

6.3 乙方在租赁期内对房屋进行装修或改造的，应事先征得甲方书面同意，装修方案需报甲方审核批准。`
    },
    {
      id: 'clause-7',
      title: '第七条 费用承担',
      content: `7.1 租赁期内，水费、电费、燃气费、物业费、供暖费、网络费等日常使用费用由乙方承担。

7.2 房产税、土地使用税等与房屋所有权相关的费用由甲方承担。

7.3 乙方应按时缴纳各项费用，逾期未缴造成停水停电等后果由乙方自行承担。`
    },
    {
      id: 'clause-8',
      title: '第八条 违约责任',
      content: `8.1 乙方逾期支付租金的，每逾期一日，应按未付租金的0.3%向甲方支付滞纳金。

8.2 乙方擅自转租、转借房屋的，甲方有权解除合同，乙方应向甲方支付相当于两个月租金的违约金。

8.3 甲方无正当理由提前收回房屋的，应双倍返还押金，并赔偿乙方因此遭受的实际损失。

8.4 因一方严重违约导致合同无法继续履行的，守约方有权解除合同并要求违约方赔偿损失。`
    },
    {
      id: 'clause-9',
      title: '第九条 合同解除与终止',
      content: `9.1 有下列情形之一的，本合同可以解除：
（1）经双方协商一致；
（2）因不可抗力致使合同无法履行；
（3）一方严重违约，致使合同目的无法实现。

9.2 合同解除或终止时，乙方应在7日内将房屋及附属设施完好返还给甲方，经甲方验收合格后办理交接手续。

9.3 押金在扣除乙方应承担的费用后，余款应在交接完成后15日内退还乙方。`
    },
    {
      id: 'clause-10',
      title: '第十条 争议解决',
      content: `10.1 本合同的订立、履行、解释及争议解决均适用中华人民共和国法律。

10.2 双方因履行本合同发生争议的，应首先通过友好协商解决；协商不成的，任何一方均可向房屋所在地人民法院提起诉讼。`
    },
    {
      id: 'clause-11',
      title: '第十一条 其他约定',
      content: `11.1 本合同一式两份，甲乙双方各执一份，具有同等法律效力。

11.2 本合同自双方签字或盖章之日起生效。

11.3 本合同未尽事宜，双方可另行签订补充协议，补充协议与本合同具有同等法律效力。

11.4 附件《房屋清单》和《房屋交接单》为本合同不可分割的组成部分。`
    }
  ]
});

// --- State ---
interface HistoryState {
  clauseContents: Record<string, string>;
}
const historyStack = ref<HistoryState[]>([]);
const historyIndex = ref(-1);

// 保存当前状态到历史记录
const saveHistory = () => {
  const snapshot: HistoryState = {
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

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    const state = historyStack.value[historyIndex.value];
    if (state) restoreHistory(state);
  }
};

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    const state = historyStack.value[historyIndex.value];
    if (state) restoreHistory(state);
  }
};

const restoreHistory = (state: HistoryState) => {
  contractContent.value.clauses.forEach(clause => {
    const content = state.clauseContents[clause.id];
    if (content !== undefined) {
      clause.content = content;
    }
  });
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

const outlineItems = computed(() => {
  return contractContent.value.clauses.map(c => ({
    id: c.id,
    title: c.title,
    level: 1
  }));
});

// 初始化历史记录
saveHistory();
</script>

<template>
  <AgentResultLayout
    title="房屋租赁合同"
    badge="合同起草"
    badge-class="badge-default"
    :outline-items="outlineItems"
    :can-undo="canUndo"
    :can-redo="canRedo"
    @back="goBack"
    @undo="undo"
    @redo="redo"
    @export="exportResult"
    @add-to-kb="addToKnowledgeBase"
  >
    <div class="doc-container">
      <!-- Page 1: Title, Parties & First 2 Clauses -->
      <div class="doc-page">
        <div class="page-content">
          <!-- Contract Header -->
          <div class="contract-header">
            <h1 class="contract-title">{{ contractContent.title }}</h1>
            <div class="contract-meta">
              <p>合同编号：{{ contractContent.contractNo }}</p>
              <p>签订日期：{{ contractContent.signDate }}</p>
            </div>
          </div>

          <!-- Parties -->
          <div class="contract-parties">
            <div class="party-section">
              <h3>甲方（出租方）</h3>
              <p>姓名：{{ contractContent.partyA.name }}</p>
              <p>身份证号：{{ contractContent.partyA.idCard }}</p>
              <p>地址：{{ contractContent.partyA.address }}</p>
              <p>联系电话：{{ contractContent.partyA.phone }}</p>
            </div>

            <div class="party-section">
              <h3>乙方（承租方）</h3>
              <p>姓名：{{ contractContent.partyB.name }}</p>
              <p>身份证号：{{ contractContent.partyB.idCard }}</p>
              <p>地址：{{ contractContent.partyB.address }}</p>
              <p>联系电话：{{ contractContent.partyB.phone }}</p>
            </div>
          </div>

          <!-- First 2 Clauses -->
          <div
            v-for="clause in contractContent.clauses.slice(0, 2)"
            :key="clause.id"
            class="contract-clause"
            :id="clause.id"
          >
            <h3 class="clause-title">{{ clause.title }}</h3>
            <div class="clause-content">
              <pre class="clause-text">{{ clause.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 1 页</span>
        </div>
      </div>

      <!-- Page 2: Clauses 3-6 -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="clause in contractContent.clauses.slice(2, 6)"
            :key="clause.id"
            class="contract-clause"
            :id="clause.id"
          >
            <h3 class="clause-title">{{ clause.title }}</h3>
            <div class="clause-content">
              <pre class="clause-text">{{ clause.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 2 页</span>
        </div>
      </div>

      <!-- Page 3: Remaining Clauses & Signature -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="clause in contractContent.clauses.slice(6)"
            :key="clause.id"
            class="contract-clause"
            :id="clause.id"
          >
            <h3 class="clause-title">{{ clause.title }}</h3>
            <div class="clause-content">
              <pre class="clause-text">{{ clause.content }}</pre>
            </div>
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-block">
              <p>甲方（签字/盖章）：_______________</p>
              <p>日期：_______________</p>
            </div>
            <div class="signature-block">
              <p>乙方（签字/盖章）：_______________</p>
              <p>日期：_______________</p>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 3 页</span>
        </div>
      </div>
    </div>
  </AgentResultLayout>
</template>

<style scoped>
/* Page Layout Styles */
.doc-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.doc-page {
  background: white;
  min-height: 1123px; /* A4 Ratio */
  width: 794px; /* Fixed A4 Width */
  flex-shrink: 0;
  padding: 80px 96px;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid var(--surface-soft);
  margin-top: auto;
}

.page-number {
  font-size: 12px;
  color: var(--text-muted);
}

/* Contract Header */
.contract-header {
  text-align: center;
  margin-bottom: 40px;
}

.contract-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-strong);
  margin: 0 0 16px 0;
}

.contract-meta {
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Parties */
.contract-parties {
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.party-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong);
  margin: 0 0 12px 0;
}

.party-section p {
  font-size: 14px;
  color: var(--text-main);
  margin: 4px 0;
  line-height: 1.6;
}

/* Clauses */
.contract-clause {
  margin-bottom: 32px;
  scroll-margin-top: 20px;
}

.clause-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong);
  margin: 0 0 12px 0;
}

.clause-content {
  font-size: 14px;
  color: var(--text-main);
  line-height: 1.8;
  text-align: justify;
}

.clause-text {
  font-family: inherit;
  white-space: pre-wrap;
  margin: 0;
}

/* Signature */
.signature-section {
  margin-top: auto; /* Push to bottom of page content */
  padding-top: 60px;
  padding-bottom: 20px;
  display: flex;
  justify-content: space-between;
}

.signature-block {
  width: 40%;
}

.signature-block p {
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--text-main);
}
</style>
