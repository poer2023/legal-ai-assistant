<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AgentResultLayout from './AgentResultLayout.vue';

const router = useRouter();

// --- 录音证据整理完整内容 ---
const audioContent = ref({
  title: '借款纠纷录音证据整理报告',
  audioFile: '证据录音_20240315.mp3',
  duration: '8分32秒',
  date: '2024年3月15日',

  // 智能总结部分
  summary: {
    overview: `本次录音为2024年3月15日下午3点在某咖啡厅进行的债务确认谈话，录音时长8分32秒。对话双方为债权人张某某（以下简称"甲方"）与债务人李某某（以下简称"乙方"）。录音内容主要围绕2023年10月的50万元借款事宜展开，乙方在录音中明确承认借款事实，并就还款事宜进行了协商。`,

    keyPoints: [
      {
        title: '借款事实确认',
        content: '乙方李某某在录音中明确承认于2023年10月15日向甲方张某某借款人民币50万元，借款用途为公司周转。乙方表示"当时确实是你借给我50万，这个我不否认"（02:15处）。'
      },
      {
        title: '还款承诺',
        content: '乙方承诺分期还款，第一期10万元将于2024年4月底前支付，剩余款项分4个月还清。乙方表示"4月底前我先给你10万，剩下的我分4个月还清"（05:42处）。'
      },
      {
        title: '利息协商',
        content: '双方就利息问题进行协商，甲方要求按年利率6%计算利息，乙方表示同意。乙方说"利息按你说的6%算，我没意见"（06:18处）。'
      },
      {
        title: '违约责任',
        content: '甲方提出如逾期未还需承担违约金，乙方表示理解并接受。乙方回应"这个我理解，如果我到时候还不上，该承担的责任我承担"（07:25处）。'
      }
    ],

    participants: [
      {
        role: '甲方（债权人）',
        name: '张某某',
        phone: '138****1234'
      },
      {
        role: '乙方（债务人）',
        name: '李某某',
        phone: '159****5678'
      }
    ],

    timeline: [
      { time: '2023年10月15日', event: '借款发生，金额50万元' },
      { time: '2024年3月15日', event: '录音谈话，确认债务并协商还款' },
      { time: '2024年4月底前', event: '约定第一期还款10万元' },
      { time: '后续4个月', event: '分期偿还剩余40万元及利息' }
    ],

    legalAnalysis: `从证据角度分析，本录音具有较高的证明力：

1. 真实性方面：录音中双方身份明确，对话内容连贯自然，能够相互印证借贷关系的存在。

2. 合法性方面：录音系在公共场所（咖啡厅）进行，未侵犯他人隐私，录音手段合法。

3. 关联性方面：录音内容直接涉及借款金额、借款时间、还款计划等核心事实，与案件待证事实具有直接关联。

建议：该录音可作为证明借贷关系存在的重要证据，建议与转账记录、聊天记录等其他证据相互印证，形成完整证据链。`
  },

  // 原文转写部分
  transcript: {
    intro: '以下为录音原文逐字转写，标注了关键时间节点及说话人。转写准确率：96.8%',

    content: `【00:00 - 00:15】
张某某：李总，今天约你出来，主要是想谈谈去年那笔借款的事。
李某某：嗯，我知道，你说吧。

【00:15 - 00:45】
张某某：去年10月15号，我借给你50万，当时说好三个月还的，现在都过去快半年了。
李某某：是，我记得，当时确实是这么说的。

【00:45 - 02:30】
张某某：那现在怎么办？你公司那边情况怎么样了？
李某某：公司情况确实不太好，资金周转有点困难。但是这个钱我肯定要还的。
张某某：那你打算什么时候还？
李某某：当时确实是你借给我50万，这个我不否认。现在让我一次性拿出来确实有困难。

【02:30 - 04:15】
张某某：我也知道你现在不容易，但是我这边也等着用钱啊。
李某某：我理解，我理解。这样吧，我跟你商量一下，能不能分期还？
张某某：分期？怎么个分法？
李某某：我手头能凑出来一部分，大概10万左右，其他的能不能给我点时间？

【04:15 - 05:50】
张某某：具体说说你的还款计划。
李某某：4月底前我先给你10万，剩下的我分4个月还清，每个月还10万，你看行吗？
张某某：也就是说，到8月底全部还清？
李某某：对，8月底之前肯定全部还清。

【05:50 - 06:30】
张某某：那利息怎么算？当时咱们没约定利息。
李某某：利息按你说的算吧，你觉得多少合适？
张某某：按银行同期贷款利率，年利率6%，你看可以吗？
李某某：利息按你说的6%算，我没意见。

【06:30 - 07:35】
张某某：那如果到时候你又还不上怎么办？
李某某：不会的，我现在有个项目在谈，应该问题不大。
张某某：我的意思是，万一你又逾期了，是不是要有点违约责任？
李某某：这个我理解，如果我到时候还不上，该承担的责任我承担。具体违约金你定吧。

【07:35 - 08:32】
张某某：那就按每逾期一个月，支付未还金额5%的违约金，可以吗？
李某某：行，没问题。那咱们是不是要签个协议什么的？
张某某：对，我让律师准备一份还款协议，你看一下没问题就签。
李某某：好的，没问题。那就这么定了，我尽快准备第一笔10万。
张某某：好，那就这样，我等你消息。
李某某：好的，谢谢你的理解。

【录音结束】`
  }
});

// --- State ---
interface HistoryState {
  summaryContent: string;
  transcriptContent: string;
}
const historyStack = ref<HistoryState[]>([]);
const historyIndex = ref(-1);

// 保存当前状态到历史记录
const saveHistory = () => {
  const snapshot: HistoryState = {
    summaryContent: audioContent.value.summary.overview,
    transcriptContent: audioContent.value.transcript.content
  };

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
  audioContent.value.summary.overview = state.summaryContent;
  audioContent.value.transcript.content = state.transcriptContent;
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
  return [
    { id: 'summary-overview', title: '整理概述', level: 1 },
    { id: 'summary-keypoints', title: '关键要点', level: 1 },
    { id: 'summary-participants', title: '参与人信息', level: 1 },
    { id: 'summary-timeline', title: '时间线', level: 1 },
    { id: 'summary-legal', title: '法律分析', level: 1 },
    { id: 'transcript', title: '录音原文', level: 1 }
  ];
});

// 初始化历史记录
saveHistory();
</script>

<template>
  <AgentResultLayout
    title="录音证据整理报告"
    badge="证据整理"
    badge-class="badge-info"
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
      <!-- Audio Info Header -->
      <div class="audio-header">
        <div class="audio-meta">
          <h1 class="audio-title">{{ audioContent.title }}</h1>
          <div class="audio-info">
            <span class="info-item">📁 {{ audioContent.audioFile }}</span>
            <span class="info-item">⏱️ {{ audioContent.duration }}</span>
            <span class="info-item">📅 {{ audioContent.date }}</span>
          </div>
        </div>
      </div>

      <!-- Part 1: 智能总结 -->
      <div class="section-divider">
        <div class="divider-line"></div>
        <span class="divider-text">第一部分：AI智能总结</span>
        <div class="divider-line"></div>
      </div>

      <div class="content-section" id="summary-overview">
        <h2 class="section-title">📋 整理概述</h2>
        <div class="section-content">
          <p class="overview-text">{{ audioContent.summary.overview }}</p>
        </div>
      </div>

      <div class="content-section" id="summary-keypoints">
        <h2 class="section-title">🔑 关键要点</h2>
        <div class="keypoints-list">
          <div
            v-for="(point, index) in audioContent.summary.keyPoints"
            :key="index"
            class="keypoint-card"
          >
            <div class="keypoint-number">{{ index + 1 }}</div>
            <div class="keypoint-content">
              <h3 class="keypoint-title">{{ point.title }}</h3>
              <p class="keypoint-text">{{ point.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section" id="summary-participants">
        <h2 class="section-title">👥 参与人信息</h2>
        <div class="participants-grid">
          <div
            v-for="(participant, index) in audioContent.summary.participants"
            :key="index"
            class="participant-card"
          >
            <div class="participant-role">{{ participant.role }}</div>
            <div class="participant-name">{{ participant.name }}</div>
            <div class="participant-phone">{{ participant.phone }}</div>
          </div>
        </div>
      </div>

      <div class="content-section" id="summary-timeline">
        <h2 class="section-title">📅 时间线</h2>
        <div class="timeline">
          <div
            v-for="(item, index) in audioContent.summary.timeline"
            :key="index"
            class="timeline-item"
          >
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-time">{{ item.time }}</div>
              <div class="timeline-event">{{ item.event }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section" id="summary-legal">
        <h2 class="section-title">⚖️ 法律分析</h2>
        <div class="legal-analysis">
          <pre class="legal-text">{{ audioContent.summary.legalAnalysis }}</pre>
        </div>
      </div>

      <!-- Part 2: 录音原文 -->
      <div class="section-divider">
        <div class="divider-line"></div>
        <span class="divider-text">第二部分：录音原文转写</span>
        <div class="divider-line"></div>
      </div>

      <div class="content-section" id="transcript">
        <h2 class="section-title">📝 原文内容</h2>
        <div class="transcript-intro">
          <p>{{ audioContent.transcript.intro }}</p>
        </div>
        <div class="transcript-content">
          <pre class="transcript-text">{{ audioContent.transcript.content }}</pre>
        </div>
      </div>
    </div>
  </AgentResultLayout>
</template>

<style scoped>
/* Custom Badge for info style */
:deep(.badge-info) {
  background: var(--primary-soft);
  color: var(--primary-color);
}

/* Container */
.doc-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

/* Audio Header */
.audio-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.audio-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-strong);
  margin: 0 0 16px 0;
}

.audio-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.info-item {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Section Divider */
.section-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 40px 0 32px 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.divider-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
  white-space: nowrap;
}

/* Content Sections */
.content-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  scroll-margin-top: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-strong);
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-color);
}

.section-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-main);
}

.overview-text {
  margin: 0;
  text-indent: 2em;
}

/* Key Points */
.keypoints-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.keypoint-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--surface-muted);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

.keypoint-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.keypoint-content {
  flex: 1;
}

.keypoint-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong);
  margin: 0 0 8px 0;
}

.keypoint-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* Participants */
.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.participant-card {
  padding: 16px;
  background: var(--surface-muted);
  border-radius: 8px;
  text-align: center;
}

.participant-role {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.participant-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong);
  margin-bottom: 4px;
}

.participant-phone {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline-item {
  position: relative;
  padding-bottom: 24px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -32px;
  top: 4px;
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--primary-color);
}

.timeline-item:not(:last-child) .timeline-dot::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 12px;
  width: 2px;
  height: 32px;
  background: var(--border-color);
  transform: translateX(-50%);
}

.timeline-time {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.timeline-event {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Legal Analysis */
.legal-analysis {
  padding: 16px;
  background: var(--warning-soft);
  border-radius: 8px;
  border-left: 4px solid var(--warning-color);
}

.legal-text {
  font-family: inherit;
  white-space: pre-wrap;
  margin: 0;
  font-size: 14px;
  color: var(--warning-color);
  line-height: 1.8;
}

/* Transcript */
.transcript-intro {
  padding: 12px 16px;
  background: var(--primary-soft);
  border-radius: 8px;
  margin-bottom: 16px;
}

.transcript-intro p {
  margin: 0;
  font-size: 14px;
  color: var(--primary-hover);
}

.transcript-content {
  padding: 20px;
  background: var(--surface-muted);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.transcript-text {
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  margin: 0;
  font-size: 14px;
  color: var(--text-main);
  line-height: 1.8;
}
</style>
