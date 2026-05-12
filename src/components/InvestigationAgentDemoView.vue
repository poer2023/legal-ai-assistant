<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  Download,
  FileDiff,
  LayoutGrid,
  Play,
  RefreshCcw,
  SearchCheck,
  ShieldCheck,
  Upload,
} from 'lucide-vue-next';
import {
  investigationAgentKeys,
  investigationAgents,
  type InvestigationAgentKey,
} from '../data/investigationAgents';

type RunStatus = 'idle' | 'running' | 'complete';

type AgentBrief = {
  deliveryName: string;
  inputs: string[];
  sourceOptions: Array<{ value: string; label: string }>;
};

const route = useRoute();
const router = useRouter();

const subject = ref('');
const material = ref('');
const selectedFocus = ref<string[]>([]);
const selectedSource = ref('mixed');
const uploadedFileName = ref('');
const runStatus = ref<RunStatus>('idle');
const progress = ref(0);
const currentStep = ref(0);
const resultReady = ref(false);
const validationMessage = ref('');
const liveMessage = ref('核查智能体已就绪。');
const reportHeadingRef = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

const iconMap = {
  'network-verification': ShieldCheck,
  'fund-flow': FileDiff,
  'equity-penetration': LayoutGrid,
} satisfies Record<InvestigationAgentKey, unknown>;

const briefByAgent: Record<InvestigationAgentKey, AgentBrief> = {
  'network-verification': {
    deliveryName: '网络公开源核查报告',
    inputs: ['主体名称/统一社会信用代码', '核心人员、电话、邮箱、地址', '已有网页截图或沟通记录', '核查时间范围'],
    sourceOptions: [
      { value: 'public', label: '公开源' },
      { value: 'client', label: '客户线索' },
      { value: 'mixed', label: '交叉核查' },
    ],
  },
  'fund-flow': {
    deliveryName: '资金流向分析报告',
    inputs: ['银行流水原表', '账户主体映射表', '合同/发票/审批凭证', '核查期间与金额阈值'],
    sourceOptions: [
      { value: 'public', label: '流水原表' },
      { value: 'client', label: '业务凭证' },
      { value: 'mixed', label: '流水+凭证' },
    ],
  },
  'equity-penetration': {
    deliveryName: '股权穿透核查报告',
    inputs: ['股东名册/工商档案', '章程/合伙协议', '表决权委托/一致行动', '历史股权转让凭证'],
    sourceOptions: [
      { value: 'public', label: '工商穿透' },
      { value: 'client', label: '协议核验' },
      { value: 'mixed', label: '穿透+控制权' },
    ],
  },
};

const currentKey = computed<InvestigationAgentKey>(() => {
  const rawKey = route.params.agentKey;
  const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
  return investigationAgentKeys.includes(key as InvestigationAgentKey)
    ? (key as InvestigationAgentKey)
    : 'network-verification';
});

const agent = computed(() => investigationAgents[currentKey.value]);
const brief = computed(() => briefByAgent[currentKey.value]);
const currentIcon = computed(() => iconMap[currentKey.value]);
const activeStepName = computed(() => agent.value.steps[currentStep.value] || '等待启动');

const clearTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
};

const loadSample = (announce = true) => {
  clearTimer();
  subject.value = agent.value.sample.subject;
  material.value = agent.value.sample.material;
  selectedFocus.value = [...agent.value.focusOptions];
  selectedSource.value = brief.value.sourceOptions[brief.value.sourceOptions.length - 1]?.value ?? 'mixed';
  uploadedFileName.value = '';
  runStatus.value = 'idle';
  progress.value = 0;
  currentStep.value = 0;
  resultReady.value = false;
  validationMessage.value = '';
  if (announce) liveMessage.value = `已填充${agent.value.name}样例。`;
};

watch(currentKey, () => loadSample(false), { immediate: true });
onBeforeUnmount(() => clearTimer());

const goBack = () => {
  router.push({ name: 'agents' });
};

const toggleFocus = (option: string) => {
  selectedFocus.value = selectedFocus.value.includes(option)
    ? selectedFocus.value.filter((item) => item !== option)
    : [...selectedFocus.value, option];
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  uploadedFileName.value = target.files?.[0]?.name || '';
  liveMessage.value = uploadedFileName.value
    ? `已选择演示材料：${uploadedFileName.value}。`
    : '已清空补充材料。';
};

const runDemo = () => {
  validationMessage.value = '';
  if (!subject.value.trim()) {
    validationMessage.value = '请输入核查对象后再启动。';
    liveMessage.value = validationMessage.value;
    return;
  }

  clearTimer();
  runStatus.value = 'running';
  progress.value = 8;
  currentStep.value = 0;
  resultReady.value = false;
  liveMessage.value = `${agent.value.name}已启动。`;

  timer = setInterval(() => {
    const nextProgress = Math.min(progress.value + 12, 100);
    progress.value = nextProgress;
    currentStep.value = Math.min(
      Math.floor((nextProgress / 100) * agent.value.steps.length),
      agent.value.steps.length - 1,
    );

    if (nextProgress >= 100) {
      clearTimer();
      runStatus.value = 'complete';
      progress.value = 100;
      resultReady.value = true;
      liveMessage.value = `${brief.value.deliveryName}已生成。`;
      nextTick(() => reportHeadingRef.value?.focus());
    }
  }, 260);
};

const showResultImmediately = () => {
  clearTimer();
  runStatus.value = 'complete';
  progress.value = 100;
  currentStep.value = agent.value.steps.length - 1;
  resultReady.value = true;
  validationMessage.value = '';
  liveMessage.value = `${brief.value.deliveryName}已生成。`;
  nextTick(() => reportHeadingRef.value?.focus());
};

const resetDemo = () => {
  loadSample();
};

const exportMockReport = () => {
  liveMessage.value = `已模拟导出${brief.value.deliveryName}。`;
};
</script>

<template>
  <div class="agent-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回智能体应用市场" @click="goBack">
        <ChevronLeft :size="18" aria-hidden="true" />
        返回
      </button>

      <div class="title-row">
        <span class="title-icon" aria-hidden="true">
          <component :is="currentIcon" :size="23" />
        </span>
        <div>
          <h1>{{ agent.name }}</h1>
        </div>
      </div>
    </header>

    <main class="page-flow">
      <section v-if="!resultReady" class="panel" aria-labelledby="input-title">
        <div class="panel-heading">
          <div>
            <span class="section-label">Input</span>
            <h2 id="input-title">核查输入</h2>
          </div>
          <button class="plain-button" type="button" @click="loadSample()">
            <RefreshCcw :size="15" aria-hidden="true" />
            填充样例
          </button>
        </div>

        <form class="input-form" @submit.prevent="runDemo">
          <div class="form-field">
            <label for="subject-input">{{ agent.subjectLabel }} <span aria-hidden="true">*</span></label>
            <input
              id="subject-input"
              v-model="subject"
              type="text"
              autocomplete="off"
              :aria-invalid="Boolean(validationMessage)"
              aria-describedby="validation-message"
            />
          </div>

          <div class="form-field">
            <label for="material-input">已知事实</label>
            <textarea id="material-input" v-model="material" rows="4" :placeholder="agent.materialPlaceholder"></textarea>
          </div>

          <div class="compact-list" aria-label="所需材料">
            <span v-for="item in brief.inputs" :key="item">
              <CheckCircle2 :size="14" aria-hidden="true" />
              {{ item }}
            </span>
          </div>

          <fieldset class="chip-group">
            <legend>核查目标</legend>
            <button
              v-for="option in agent.focusOptions"
              :key="option"
              class="chip"
              :class="{ selected: selectedFocus.includes(option) }"
              type="button"
              :aria-pressed="selectedFocus.includes(option)"
              @click="toggleFocus(option)"
            >
              <CheckCircle2 v-if="selectedFocus.includes(option)" :size="15" aria-hidden="true" />
              <CircleDot v-else :size="15" aria-hidden="true" />
              {{ option }}
            </button>
          </fieldset>

          <div class="source-row" role="radiogroup" aria-label="数据范围">
            <button
              v-for="option in brief.sourceOptions"
              :key="option.value"
              class="source-button"
              :class="{ selected: selectedSource === option.value }"
              type="button"
              role="radio"
              :aria-checked="selectedSource === option.value"
              @click="selectedSource = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <label class="file-row" for="file-input">
            <Upload :size="16" aria-hidden="true" />
            <span>{{ uploadedFileName || '补充材料' }}</span>
            <small>仅 mock 文件名</small>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.csv,.txt"
              @change="handleFileChange"
            />
          </label>

          <p id="validation-message" class="validation-message" role="alert">{{ validationMessage }}</p>

          <div class="action-row">
            <button class="primary-button" type="submit" :disabled="runStatus === 'running'">
              <Play :size="16" aria-hidden="true" />
              {{ runStatus === 'running' ? '运行中' : '开始核查' }}
            </button>
            <button class="secondary-button" type="button" @click="showResultImmediately">直接生成结果</button>
            <button class="plain-button" type="button" @click="resetDemo">重置</button>
          </div>
        </form>
      </section>

      <section class="panel" aria-labelledby="progress-title">
        <div class="panel-heading">
          <div>
            <span class="section-label">Progress</span>
            <h2 id="progress-title">核查进度</h2>
            <p>{{ runStatus === 'idle' ? '待启动' : activeStepName }}</p>
          </div>
          <strong class="progress-value">{{ Math.round(progress) }}%</strong>
        </div>

        <div class="progress-track" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100" :aria-label="`${agent.name}核查进度`">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>

        <ol class="step-list">
          <li
            v-for="(step, index) in agent.steps"
            :key="step"
            :class="{ done: runStatus === 'complete' || index < currentStep, active: runStatus === 'running' && index === currentStep }"
          >
            <span aria-hidden="true"></span>
            {{ step }}
          </li>
        </ol>
      </section>

      <section v-if="resultReady" class="panel" aria-labelledby="result-title">
        <div class="panel-heading">
          <div>
            <span class="section-label">Result</span>
            <h2 id="result-title" ref="reportHeadingRef" tabindex="-1">{{ brief.deliveryName }}</h2>
            <p>Mock 结果，仅展示交互与输出结构。</p>
          </div>
          <button class="secondary-button" type="button" @click="exportMockReport">
            <Download :size="16" aria-hidden="true" />
            模拟导出
          </button>
        </div>

        <div class="metric-grid" aria-label="关键指标">
          <article v-for="metric in agent.metrics" :key="metric.label" class="metric-card" :class="`tone-${metric.tone}`">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <p>{{ metric.hint }}</p>
          </article>
        </div>

        <section class="result-block" aria-labelledby="finding-title">
          <h3 id="finding-title">核心发现</h3>
          <article v-for="finding in agent.findings" :key="finding.id" class="finding-item">
            <span class="risk-badge" :class="`tone-${finding.tone}`">{{ finding.severity }}</span>
            <div>
              <h4>{{ finding.title }}</h4>
              <p>{{ finding.body }}</p>
              <small>{{ finding.evidence }}</small>
            </div>
          </article>
        </section>

        <section class="result-block" aria-labelledby="relation-title">
          <h3 id="relation-title">关系链路</h3>
          <div class="relation-list">
            <div v-for="relation in agent.relations" :key="`${relation.source}-${relation.target}`" class="relation-item">
              <span>{{ relation.source }}</span>
              <ArrowRight :size="14" aria-hidden="true" />
              <span>{{ relation.target }}</span>
              <small>{{ relation.label }}</small>
            </div>
          </div>
        </section>

        <section class="result-block" aria-labelledby="table-title">
          <h3 id="table-title">线索清单</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="column in agent.evidenceTable.columns" :key="column" scope="col">{{ column }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in agent.evidenceTable.rows" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>

    <div class="sr-only" aria-live="polite">{{ liveMessage }}</div>
  </div>
</template>

<style scoped>
.agent-page {
  min-height: 100%;
  padding: 28px 28px 44px;
  background:
    linear-gradient(180deg, var(--bg-color) 0, var(--bg-color) 210px),
    var(--bg-color);
  color: var(--text-main);
}

.page-header,
.page-flow {
  width: min(960px, 100%);
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  padding: 0 2px;
}

.back-button,
.plain-button,
.primary-button,
.secondary-button,
.chip,
.source-button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 7px;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.back-button,
.plain-button,
.secondary-button,
.source-button {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-main);
}

.back-button {
  min-height: 40px;
  padding: 0 13px 0 10px;
  color: var(--text-main);
}

.title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 4px;
}

.title-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--card-bg) 0%, var(--bg-color) 100%);
  color: var(--primary-color);
  border: 1px solid var(--border-color);
  box-shadow: 0 7px 18px rgba(37, 99, 235, 0.11);
}

.title-row h1,
.panel h2,
.result-block h3,
.finding-item h4 {
  margin: 0;
  color: var(--text-strong);
}

.title-row h1 {
  margin-top: 0;
  font-size: 24px;
  font-weight: 750;
  line-height: 1.18;
  letter-spacing: 0;
}

.panel-heading p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.page-flow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  padding: 20px 20px 18px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.055);
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel h2 {
  font-size: 17px;
  font-weight: 720;
  line-height: 1.2;
}

.section-label {
  display: block;
  margin-bottom: 4px;
  color: var(--primary-color);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.input-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

label,
legend {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--card-bg);
  color: var(--text-main);
  font: inherit;
  font-size: 14px;
}

input {
  min-height: 42px;
  padding: 0 12px;
}

textarea {
  min-height: 104px;
  padding: 12px;
  resize: vertical;
  line-height: 1.55;
}

input:focus-visible,
textarea:focus-visible,
button:focus-visible,
#result-title:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

.compact-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.compact-list span {
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--bg-color);
  color: var(--text-secondary);
  font-size: 12px;
}

.compact-list svg {
  color: var(--text-secondary);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  border: 0;
}

.chip-group legend {
  width: 100%;
}

.chip {
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-main);
}

.chip.selected,
.source-button.selected {
  border-color: var(--primary-border);
  background: var(--bg-color);
  color: var(--primary-hover);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.1);
}

.source-row,
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.source-button {
  min-height: 36px;
  padding: 0 13px;
}

.file-row {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 1px dashed var(--border-color);
  border-radius: 7px;
  background: var(--card-bg);
  color: var(--text-main);
  cursor: pointer;
}

.file-row small {
  color: var(--text-secondary);
}

.file-row input {
  width: 1px;
  height: 1px;
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.validation-message {
  min-height: 18px;
  color: var(--diff-removed);
  font-size: 12px;
}

.primary-button {
  min-height: 40px;
  padding: 0 17px;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: var(--on-primary);
  box-shadow: 0 7px 16px rgba(37, 99, 235, 0.2);
}

.secondary-button,
.plain-button {
  min-height: 40px;
  padding: 0 12px;
}

.primary-button:disabled {
  border-color: var(--text-muted);
  background: var(--text-muted);
  cursor: not-allowed;
}

.progress-value {
  color: var(--primary-hover);
  font-size: 20px;
  font-weight: 800;
}

.progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-soft);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-color);
  transition: width 0.22s ease;
}

.step-list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  margin: 16px 0 0;
  padding: 0;
}

.step-list li {
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 13px;
}

.step-list li span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--border-color);
  flex-shrink: 0;
}

.step-list li.active {
  border-color: var(--primary-border);
  background: var(--bg-color);
  color: var(--primary-hover);
  font-weight: 700;
}

.step-list li.active span {
  background: var(--primary-color);
}

.step-list li.done span {
  background: var(--diff-added);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}

.metric-card {
  min-height: 94px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--card-bg);
}

.metric-card span {
  color: var(--text-secondary);
  font-size: 12px;
}

.metric-card strong {
  display: block;
  margin: 8px 0;
  color: var(--text-strong);
  font-size: 24px;
  line-height: 1;
}

.metric-card p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.result-block {
  margin-top: 16px;
}

.result-block h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 720;
}

.finding-item {
  display: flex;
  gap: 12px;
  padding: 13px 0;
  border-top: 1px solid var(--border-soft);
}

.finding-item h4 {
  font-size: 15px;
}

.finding-item p {
  margin: 6px 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.finding-item small {
  color: var(--text-secondary);
  font-size: 12px;
}

.risk-badge {
  flex-shrink: 0;
  min-width: 34px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.relation-list {
  display: grid;
  gap: 8px;
}

.relation-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 13px;
}

.relation-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-item small {
  grid-column: 1 / -1;
  color: var(--text-secondary);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
}

th,
td {
  padding: 11px 12px;
  border-bottom: 1px solid var(--border-soft);
  text-align: left;
  font-size: 13px;
  line-height: 1.45;
}

th {
  background: var(--bg-color);
  color: var(--text-main);
  font-weight: 800;
}

td {
  color: var(--text-secondary);
}

.tone-critical {
  border-color: var(--diff-removed-border);
  background: var(--diff-removed-soft);
  color: var(--diff-removed);
}

.tone-warning {
  border-color: var(--warning-border);
  background: var(--warning-soft);
  color: var(--warning-color);
}

.tone-good {
  border-color: var(--diff-added-border);
  background: var(--diff-added-soft);
  color: var(--diff-added);
}

.tone-info {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-hover);
}

.back-button:hover,
.plain-button:hover,
.secondary-button:hover,
.chip:hover,
.source-button:hover {
  border-color: var(--primary-border);
  color: var(--primary-hover);
  background: var(--card-bg);
}

.primary-button:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 800px) {
  .agent-page {
    padding: 16px;
  }

  .page-header,
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .compact-list,
  .step-list,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .relation-item {
    grid-template-columns: 1fr;
  }
}
</style>
