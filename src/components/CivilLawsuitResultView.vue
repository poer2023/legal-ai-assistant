<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AgentResultLayout from './AgentResultLayout.vue';

const router = useRouter();

// --- 民事起诉状完整内容 ---
const lawsuitContent = ref({
  title: '民事起诉状',
  caseType: '民间借贷纠纷',
  courtName: '北京市朝阳区人民法院',
  filingDate: '2024年12月30日',

  plaintiff: {
    name: '王某某',
    gender: '男',
    birthDate: '1985年6月15日',
    nationality: '汉族',
    idCard: '110105198506151234',
    address: '北京市朝阳区朝阳路123号',
    phone: '138****1234'
  },

  defendant: {
    name: '李某某',
    gender: '女',
    birthDate: '1990年3月20日',
    nationality: '汉族',
    idCard: '110108199003205678',
    address: '北京市海淀区中关村大街456号',
    phone: '159****5678'
  },

  sections: [
    {
      id: 'section-1',
      title: '诉讼请求',
      content: `一、判令被告李某某立即向原告王某某偿还借款本金人民币50万元；

二、判令被告李某某向原告王某某支付自2023年12月1日起至实际付清之日止的借款利息，按照年利率6%计算（暂计至2024年12月31日为人民币3万元）；

三、判令被告李某某向原告王某某支付违约金人民币5万元；

四、本案诉讼费、保全费等全部费用由被告承担。`
    },
    {
      id: 'section-2',
      title: '事实与理由',
      content: `一、借款事实

原告与被告系朋友关系。2022年10月15日，被告因投资需要向原告借款人民币50万元，约定借款期限为1年，即自2022年10月15日至2023年10月15日，年利率为6%，到期一次性还本付息。双方签订了《借款协议》，原告通过银行转账方式将借款50万元汇入被告指定账户。

二、违约事实

借款到期后，原告多次通过电话、微信等方式催促被告归还借款，但被告以各种理由推脱，拒不履行还款义务。截至起诉之日，被告尚未偿还任何本金及利息。原告于2023年11月20日向被告发送《催款函》，要求其在收到函件后7日内归还全部借款本息，但被告仍未履行。

三、诉讼请求的法律依据

根据《中华人民共和国民法典》第六百七十五条规定："借款人应当按照约定的期限返还借款。对借款期限没有约定或者约定不明确，依据本法第五百一十条的规定仍不能确定的，借款人可以随时返还；贷款人可以催告借款人在合理期限内返还。"

根据《中华人民共和国民法典》第六百七十六条规定："借款人未按照约定的期限返还借款的，应当按照约定或者国家有关规定支付逾期利息。"

根据《中华人民共和国民法典》第五百七十七条规定："当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。"

综上所述，被告借款到期拒不归还，严重违反了双方签订的借款协议，侵害了原告的合法权益。原告为维护自身合法权益，特依法向贵院提起诉讼，恳请贵院依法判决，支持原告的诉讼请求。`
    },
    {
      id: 'section-3',
      title: '证据清单',
      content: `一、身份证明材料
1. 原告王某某身份证复印件一份
2. 被告李某某身份证复印件一份（来源于借款协议）

二、借款关系证据
1. 《借款协议》原件一份，签订于2022年10月15日
2. 银行转账凭证一份，证明原告于2022年10月15日向被告转账50万元
3. 被告银行账户信息证明一份

三、催收证据
1. 微信聊天记录截图若干份，记录了原告多次催款及被告拖延还款的对话
2. 通话记录清单一份，显示原告多次致电被告催收
3. 《催款函》及邮寄凭证各一份，证明原告于2023年11月20日向被告发送催款函

四、利息及违约金计算依据
1. 利息计算说明书一份，详细列明利息计算方式
2. 借款协议中关于利息及违约金的约定条款`
    }
  ],

  footer: {
    court: '北京市朝阳区人民法院',
    plaintiff: '原告：王某某',
    date: '2024年12月30日'
  }
});

// --- State ---
interface HistoryState {
  sectionContents: Record<string, string>;
}
const historyStack = ref<HistoryState[]>([]);
const historyIndex = ref(-1);

// 保存当前状态到历史记录
const saveHistory = () => {
  const snapshot: HistoryState = {
    sectionContents: {}
  };
  lawsuitContent.value.sections.forEach(s => {
    snapshot.sectionContents[s.id] = s.content;
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
  lawsuitContent.value.sections.forEach(section => {
    const content = state.sectionContents[section.id];
    if (content !== undefined) {
      section.content = content;
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
  return lawsuitContent.value.sections.map(s => ({
    id: s.id,
    title: s.title,
    level: 1
  }));
});

// 初始化历史记录
saveHistory();
</script>

<template>
  <AgentResultLayout
    :title="lawsuitContent.caseType"
    badge="民事起诉状"
    badge-class="badge-warning"
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
      <!-- Page 1: Title & Parties & Section 1: Claims -->
      <div class="doc-page">
        <div class="page-content">
          <!-- Document Header -->
          <div class="doc-header">
            <h1 class="doc-title">{{ lawsuitContent.title }}</h1>
            <div class="doc-meta">
              <p>案由：{{ lawsuitContent.caseType }}</p>
              <p>立案日期：{{ lawsuitContent.filingDate }}</p>
            </div>
          </div>

          <!-- Parties Information -->
          <div class="parties-section">
            <div class="party-info">
              <h3 class="party-label">原告</h3>
              <div class="party-details">
                <p>姓名：{{ lawsuitContent.plaintiff.name }}</p>
                <p>性别：{{ lawsuitContent.plaintiff.gender }}，出生日期：{{ lawsuitContent.plaintiff.birthDate }}，民族：{{ lawsuitContent.plaintiff.nationality }}</p>
                <p>身份证号：{{ lawsuitContent.plaintiff.idCard }}</p>
                <p>住所地：{{ lawsuitContent.plaintiff.address }}</p>
                <p>联系电话：{{ lawsuitContent.plaintiff.phone }}</p>
              </div>
            </div>

            <div class="party-info">
              <h3 class="party-label">被告</h3>
              <div class="party-details">
                <p>姓名：{{ lawsuitContent.defendant.name }}</p>
                <p>性别：{{ lawsuitContent.defendant.gender }}，出生日期：{{ lawsuitContent.defendant.birthDate }}，民族：{{ lawsuitContent.defendant.nationality }}</p>
                <p>身份证号：{{ lawsuitContent.defendant.idCard }}</p>
                <p>住所地：{{ lawsuitContent.defendant.address }}</p>
                <p>联系电话：{{ lawsuitContent.defendant.phone }}</p>
              </div>
            </div>
          </div>

          <!-- First Section (Claims) -->
          <div
            v-for="section in lawsuitContent.sections.slice(0, 1)"
            :key="section.id"
            class="lawsuit-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 1 页</span>
        </div>
      </div>

      <!-- Page 2: Section 2: Facts -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="section in lawsuitContent.sections.slice(1, 2)"
            :key="section.id"
            class="lawsuit-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 2 页</span>
        </div>
      </div>

      <!-- Page 3: Section 3: Evidence & Footer -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="section in lawsuitContent.sections.slice(2)"
            :key="section.id"
            class="lawsuit-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>

          <!-- Footer -->
          <div class="doc-footer">
            <p class="footer-line">此致</p>
            <p class="footer-line court-name">{{ lawsuitContent.footer.court }}</p>
            <div class="signature-area">
              <p class="signature-line">{{ lawsuitContent.footer.plaintiff }}</p>
              <p class="signature-line">{{ lawsuitContent.footer.date }}</p>
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
/* Custom Badge for warning style */
:deep(.badge-warning) {
  background: #fef3c7;
  color: #d97706;
}

/* Base Layout */
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
  /* Fixed A4 Width: 794px */
  width: 794px;
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
  border-top: 1px solid #f3f4f6;
  margin-top: auto;
}

.page-number {
  font-size: 12px;
  color: #9ca3af;
}

/* Document Header */
.doc-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.doc-title {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
  letter-spacing: 2px;
}

.doc-meta {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.8;
}

/* Parties Section */
.parties-section {
  margin-bottom: 32px;
}

.party-info {
  margin-bottom: 20px;
}

.party-label {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.party-details p {
  font-size: 14px;
  color: #374151;
  margin: 4px 0;
  line-height: 1.6;
}

/* Lawsuit Sections */
.lawsuit-section {
  margin-bottom: 24px;
  scroll-margin-top: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.section-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
  text-align: justify;
}

.section-text {
  font-family: inherit;
  white-space: pre-wrap;
  margin: 0;
}

/* Footer */
.doc-footer {
  margin-top: auto; /* Push to bottom when needed */
  padding-top: 48px;
  padding-bottom: 20px;
}

.footer-line {
  font-size: 16px;
  color: #111827;
  margin-bottom: 8px;
}

.court-name {
  font-weight: 600;
  margin-bottom: 40px;
}

.signature-area {
  text-align: right;
  padding-right: 40px;
}

.signature-line {
  font-size: 16px;
  color: #111827;
  margin-bottom: 16px;
}
</style>
