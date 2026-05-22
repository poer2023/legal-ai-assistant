<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  Circle,
  PauseCircle,
  Play,
  Plus,
  Trash2,
} from 'lucide-vue-next';
import { useToast } from '../stores/toast';

type AutomationStatus = 'scheduled' | 'completed' | 'paused';

type AutomationRun = {
  id: string;
  title: string;
  time: string;
  success: boolean;
};

type AutomationTask = {
  id: string;
  title: string;
  description: string;
  status: AutomationStatus;
  schedule: string;
  nextRun: string;
  lastRun: string;
  project: string;
  model: string;
  reasoning: string;
  runs: AutomationRun[];
};

const seedTasks: AutomationTask[] = [
  {
    id: 'automation-2026-05-20-archive-chat',
    title: '对话列表过期内容自动归档',
    description: '超过一周的对话需要自动归档',
    status: 'scheduled',
    schedule: '每天 13:00',
    nextRun: '明天 13:00',
    lastRun: '今天 13:02',
    project: '聊天',
    model: 'GPT-5.5',
    reasoning: '超高',
    runs: [
      { id: 'run-1', title: '对话列表过期内容自动归档', time: '5 小时', success: true },
      { id: 'run-2', title: '对话列表过期内容自动归档', time: '1 天', success: false },
      { id: 'run-3', title: '对话列表过期内容自动归档', time: '2 天', success: false },
      { id: 'run-4', title: '对话列表过期内容自动归档', time: '3 天', success: false },
      { id: 'run-5', title: '对话列表过期内容自动归档', time: '1 周', success: true },
    ],
  },
  {
    id: 'automation-2026-05-20-ai-news',
    title: '每日 AI 新闻推送',
    description: '每天整理 AI 新闻并生成简短推送',
    status: 'completed',
    schedule: '每天 09:00',
    nextRun: '14 小时后开始',
    lastRun: '38 分钟前',
    project: '聊天',
    model: 'GPT-5.5',
    reasoning: '高',
    runs: [
      { id: 'run-news-1', title: '每日 AI 新闻推送', time: '38 分钟前', success: true },
      { id: 'run-news-2', title: '每日 AI 新闻推送', time: '1 天', success: true },
    ],
  },
];

const { showToast } = useToast();
const tasks = ref<AutomationTask[]>(seedTasks);
const selectedTaskId = ref('');

const selectedTask = computed(() =>
  tasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
);
const scheduledTasks = computed(() => tasks.value.filter((task) => task.status === 'scheduled' || task.status === 'paused'));
const completedTasks = computed(() => tasks.value.filter((task) => task.status === 'completed'));

const createTask = () => {
  const index = tasks.value.length + 1;
  tasks.value = [
    {
      id: `automation-draft-${Date.now()}`,
      title: `新的自动化任务 ${index}`,
      description: '通过聊天创建后会显示任务说明',
      status: 'scheduled',
      schedule: '每天 09:00',
      nextRun: '明天 09:00',
      lastRun: '未运行',
      project: '聊天',
      model: 'GPT-5.5',
      reasoning: '高',
      runs: [],
    },
    ...tasks.value,
  ];
  showToast('已添加自动化任务');
};

const addFromTemplate = () => {
  showToast('已打开模板添加入口', { tone: 'info' });
};

const openTask = (task: AutomationTask) => {
  selectedTaskId.value = task.id;
};

const closeDetail = () => {
  selectedTaskId.value = '';
};

const runNow = (task: AutomationTask) => {
  task.status = 'completed';
  task.lastRun = '刚刚';
  task.runs = [
    { id: `run-${Date.now()}`, title: task.title, time: '刚刚', success: true },
    ...task.runs,
  ];
  showToast('任务已立即运行');
};

const togglePause = (task: AutomationTask) => {
  task.status = task.status === 'paused' ? 'scheduled' : 'paused';
  task.nextRun = task.status === 'paused' ? '已暂停' : '明天 13:00';
  showToast(task.status === 'paused' ? '任务已暂停' : '任务已恢复');
};

const deleteTask = (task: AutomationTask) => {
  tasks.value = tasks.value.filter((item) => item.id !== task.id);
  selectedTaskId.value = '';
  showToast('任务已删除', { tone: 'info' });
};
</script>

<template>
  <section class="automation-page">
    <div v-if="!selectedTask" class="automation-list-shell">
      <header class="automation-header">
        <div>
          <h1>自动化</h1>
          <p>管理自动化任务并查看近期运行记录。</p>
        </div>
        <div class="automation-header-actions">
          <button type="button" @click="createTask">
            <Plus :size="14" />
            <span>添加</span>
          </button>
          <button type="button" @click="addFromTemplate">从模版添加</button>
        </div>
      </header>

      <section class="automation-section" aria-labelledby="scheduled-title">
        <h2 id="scheduled-title">已安排</h2>
        <button
          v-for="task in scheduledTasks"
          :key="task.id"
          type="button"
          class="automation-row"
          @click="openTask(task)"
        >
          <span class="automation-dot" :data-status="task.status"></span>
          <strong>{{ task.title }}</strong>
          <span class="automation-id">{{ task.id }}</span>
          <span class="automation-chip">{{ task.schedule }}</span>
          <span class="automation-time">{{ task.nextRun }}</span>
        </button>
      </section>

      <section class="automation-section" aria-labelledby="completed-title">
        <h2 id="completed-title">已完成</h2>
        <button
          v-for="task in completedTasks"
          :key="task.id"
          type="button"
          class="automation-row"
          @click="openTask(task)"
        >
          <span class="automation-dot success"></span>
          <strong>{{ task.title }}</strong>
          <span class="automation-id">{{ task.id }}</span>
          <span class="automation-success">成功</span>
          <span class="automation-time">{{ task.lastRun }}</span>
        </button>
      </section>
    </div>

    <div v-else class="automation-detail-shell">
      <header class="automation-detail-top">
        <button type="button" class="automation-breadcrumb" @click="closeDetail">
          <span>自动化功能</span>
          <ChevronRight :size="15" />
          <strong>{{ selectedTask.title }}</strong>
        </button>
        <div class="automation-detail-actions">
          <button type="button" aria-label="暂停任务" @click="togglePause(selectedTask)">
            <PauseCircle :size="17" />
          </button>
          <button type="button" aria-label="删除任务" @click="deleteTask(selectedTask)">
            <Trash2 :size="17" />
          </button>
          <button type="button" class="run-now-button" @click="runNow(selectedTask)">
            <Play :size="15" />
            <span>立即运行</span>
          </button>
        </div>
      </header>

      <main class="automation-detail-main">
        <section class="automation-detail-content">
          <h1>{{ selectedTask.title }}</h1>
          <p>{{ selectedTask.description }}</p>
        </section>

        <aside class="automation-detail-aside">
          <section class="automation-side-section">
            <h2>状态</h2>
            <dl>
              <div>
                <dt>状态</dt>
                <dd>
                  <span class="status-pill" :data-status="selectedTask.status">
                    {{ selectedTask.status === 'paused' ? '暂停' : '活跃' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>下次运行</dt>
                <dd>{{ selectedTask.nextRun }}</dd>
              </div>
              <div>
                <dt>上次运行时间</dt>
                <dd>{{ selectedTask.lastRun }}</dd>
              </div>
            </dl>
          </section>

          <section class="automation-side-section">
            <h2>详情</h2>
            <dl>
              <div>
                <dt>主机</dt>
                <dd>本地主机</dd>
              </div>
              <div>
                <dt>项目</dt>
                <dd>{{ selectedTask.project }}</dd>
              </div>
              <div>
                <dt>重复次数</dt>
                <dd>{{ selectedTask.schedule }}</dd>
              </div>
              <div>
                <dt>模型</dt>
                <dd>{{ selectedTask.model }}</dd>
              </div>
              <div>
                <dt>推理</dt>
                <dd>{{ selectedTask.reasoning }}</dd>
              </div>
            </dl>
          </section>

          <section class="automation-side-section">
            <h2>运行历史记录</h2>
            <div class="automation-run-list">
              <article v-for="run in selectedTask.runs" :key="run.id" class="automation-run-row">
                <CheckCircle2 v-if="run.success" :size="15" />
                <Archive v-else :size="15" />
                <strong>{{ run.title }}</strong>
                <span>对话</span>
                <time>{{ run.time }}</time>
              </article>
              <div v-if="selectedTask.runs.length === 0" class="automation-run-empty">
                <Circle :size="14" />
                <span>暂无运行记录</span>
              </div>
            </div>
          </section>
        </aside>
      </main>
    </div>
  </section>
</template>

<style scoped>
.automation-page {
  min-height: 100%;
  background: var(--bg-color);
  color: var(--text-main);
}

.automation-list-shell {
  width: min(960px, 100%);
  padding: 38px 56px;
}

.automation-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 36px;
}

.automation-header h1,
.automation-detail-content h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0;
}

.automation-header p,
.automation-detail-content p {
  margin: 12px 0 0;
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.7;
}

.automation-header-actions {
  display: flex;
  gap: 8px;
}

.automation-header-actions button,
.automation-detail-actions button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 500;
}

.automation-header-actions button:hover,
.automation-detail-actions button:hover {
  background: var(--surface-soft);
}

.automation-section {
  margin-top: 34px;
}

.automation-section h2,
.automation-side-section h2 {
  margin: 0 0 18px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.automation-row {
  width: 100%;
  min-height: 42px;
  display: grid;
  grid-template-columns: 18px auto auto auto minmax(96px, 1fr);
  align-items: center;
  gap: 8px;
  padding: 0;
  color: var(--text-main);
  text-align: left;
}

.automation-row:hover strong {
  color: var(--primary-color);
}

.automation-dot {
  width: 8px;
  height: 8px;
  margin-left: 1px;
  border-radius: 999px;
  background: var(--text-secondary);
}

.automation-dot.success {
  background: var(--diff-added);
}

.automation-dot[data-status='paused'] {
  background: var(--text-muted);
}

.automation-row strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.automation-id,
.automation-chip,
.automation-success {
  min-width: 0;
  max-width: 184px;
  overflow: hidden;
  padding: 4px 9px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.automation-success {
  background: transparent;
  color: var(--diff-added);
}

.automation-time {
  justify-self: end;
  color: var(--text-muted);
  font-size: 13px;
}

.automation-detail-shell {
  min-height: 100vh;
}

.automation-detail-top {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 18px 0 26px;
}

.automation-breadcrumb {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 650;
}

.automation-breadcrumb strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.automation-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.automation-detail-actions .run-now-button {
  border-color: var(--text-strong);
  background: var(--text-strong);
  color: var(--card-bg);
}

.automation-detail-main {
  min-height: calc(100vh - 52px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
}

.automation-detail-content {
  padding: 56px 56px 56px 110px;
}

.automation-detail-content p {
  margin-top: 36px;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 650;
}

.automation-detail-aside {
  padding: 34px 28px 34px 30px;
  border-left: 1px solid var(--border-color);
}

.automation-side-section + .automation-side-section {
  margin-top: 34px;
}

.automation-side-section dl {
  display: grid;
  gap: 14px;
  margin: 0;
}

.automation-side-section dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.automation-side-section dt {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 650;
}

.automation-side-section dd {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 650;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--surface-soft);
}

.status-pill::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--diff-added);
}

.status-pill[data-status='paused']::before {
  background: var(--text-muted);
}

.automation-run-list {
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.automation-run-row,
.automation-run-empty {
  min-height: 34px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.automation-run-row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.automation-run-row time {
  color: var(--text-muted);
}

.automation-run-empty {
  grid-template-columns: 18px minmax(0, 1fr);
}

@media (max-width: 980px) {
  .automation-list-shell {
    padding: 32px 24px;
  }

  .automation-detail-main {
    grid-template-columns: 1fr;
  }

  .automation-detail-content {
    padding: 38px 24px;
  }

  .automation-detail-aside {
    border-top: 1px solid var(--border-color);
    border-left: 0;
  }
}

@media (max-width: 720px) {
  .automation-header,
  .automation-detail-top {
    align-items: stretch;
    flex-direction: column;
    height: auto;
  }

  .automation-detail-top {
    padding: 18px;
  }

  .automation-row {
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 6px 8px;
    padding: 10px 0;
  }

  .automation-id,
  .automation-chip,
  .automation-success,
  .automation-time {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
