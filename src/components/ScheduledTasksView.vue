<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Search,
  Sparkles,
} from 'lucide-vue-next';
import { useProjects } from '../stores/projects';
import { useToast } from '../stores/toast';

type ScheduledResult = {
  id: string;
  title: string;
  project: string;
  summary: string;
  deliveredAt: string;
  sources: string[];
  files: string[];
  status: 'ready' | 'running';
};

type ScheduledTask = {
  id: string;
  title: string;
  schedule: string;
  project: string;
  nextRun: string;
};

const { activeProject } = useProjects();
const { showToast } = useToast();
const activeTab = ref<'results' | 'mine' | 'recommended'>('results');
const keyword = ref('');

const results = ref<ScheduledResult[]>([
  {
    id: 'result-contract-redline',
    title: '合同审查与红线生成',
    project: '鸿盛地产',
    summary: '已识别 12 个高风险条款，生成红线版合同、风险点清单和谈判口径。',
    deliveredAt: '今天 09:00',
    sources: ['项目底稿 18 份', '团队合同库', '最新法规'],
    files: ['风险点汇总表.xlsx', '红线版合同.docx'],
    status: 'ready',
  },
  {
    id: 'result-ma-weekly',
    title: '并购项目每周风险摘要',
    project: '海康并购案',
    summary: '本周新增交割条件、员工安置和数据合规相关风险，建议在 SPA 中补充特别承诺。',
    deliveredAt: '昨天 18:30',
    sources: ['SPA 初稿', '尽调访谈纪要', '披露清单'],
    files: ['每周风险摘要.docx'],
    status: 'ready',
  },
  {
    id: 'result-reg-watch',
    title: '监管新规影响扫描',
    project: '未关联',
    summary: '监测到 3 条与数据出境、平台责任相关的新规，已生成适用性判断。',
    deliveredAt: '今天 07:30',
    sources: ['法律法规库', '监管问答库'],
    files: ['新规影响清单.xlsx', '适用性说明.pdf'],
    status: 'ready',
  },
]);

const tasks = ref<ScheduledTask[]>([
  {
    id: 'task-contract-redline',
    title: '每天生成合同审查风险更新',
    schedule: '工作日 09:00',
    project: '鸿盛地产',
    nextRun: '明天 09:00',
  },
  {
    id: 'task-ma-weekly',
    title: '并购项目每周风险摘要',
    schedule: '每周五 18:30',
    project: '海康并购案',
    nextRun: '周五 18:30',
  },
  {
    id: 'task-reg-watch',
    title: '监管新规影响扫描',
    schedule: '每天 07:30',
    project: '未关联',
    nextRun: '明天 07:30',
  },
]);

const recommendedTasks = [
  '每周生成项目风险摘要',
  '每日监测客户相关裁判文书',
  '合同到期与交割条件提醒',
  '团队知识库新增文件摘要',
  '法规变化影响扫描',
  '案件时间线自动更新',
];

const tabs = computed(() => [
  { id: 'results' as const, label: '定时任务结果', count: results.value.length },
  { id: 'mine' as const, label: '我的任务', count: tasks.value.length },
  { id: 'recommended' as const, label: '推荐任务', count: recommendedTasks.length },
]);

const filteredResults = computed(() => {
  const normalized = keyword.value.trim().toLowerCase();
  return results.value.filter((item) =>
    !normalized || `${item.project} ${item.title} ${item.summary}`.toLowerCase().includes(normalized),
  );
});

const createTask = () => {
  const projectName = activeProject.value?.client || '未关联';
  tasks.value = [
    {
      id: `task-${Date.now()}`,
      title: '新的定时法律任务',
      schedule: '每天 09:00',
      project: projectName,
      nextRun: '明天 09:00',
    },
    ...tasks.value,
  ];
  activeTab.value = 'mine';
  showToast('已创建定时任务草稿');
};
</script>

<template>
  <section class="scheduled-page">
    <header class="scheduled-header">
      <div>
        <h1>让 AI 按照你的要求定时干活</h1>
        <p>按项目、客户或知识库定期执行检索、审查、摘要和交付，结果会沉淀在这里。</p>
      </div>
      <button type="button" class="primary-action" @click="createTask">
        <Plus :size="15" />
        <span>新建任务</span>
      </button>
    </header>

    <div class="scheduled-toolbar">
      <nav class="scheduled-tabs" aria-label="定时任务视图">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ tab.count }}</strong>
        </button>
      </nav>
      <label class="scheduled-search">
        <Search :size="15" />
        <input v-model="keyword" type="search" placeholder="搜索任务结果" />
      </label>
    </div>

    <main v-if="activeTab === 'results'" class="result-layout">
      <section class="result-list">
        <article
          v-for="item in filteredResults"
          :key="item.id"
          class="result-card"
        >
          <header>
            <span class="result-project">{{ item.project }}</span>
            <time>{{ item.deliveredAt }}</time>
          </header>
          <h2>{{ item.title }}</h2>
          <p>{{ item.summary }}</p>
          <div class="source-row">
            <span v-for="source in item.sources" :key="source">{{ source }}</span>
          </div>
          <footer>
            <span v-for="file in item.files" :key="file" class="file-chip">
              <FileText :size="13" />
              {{ file }}
            </span>
            <button type="button" aria-label="下载结果">
              <Download :size="15" />
            </button>
          </footer>
        </article>
      </section>

      <aside class="result-aside">
        <section>
          <h2>今日交付</h2>
          <strong>{{ filteredResults.length }}</strong>
          <p>已生成并可下载的任务结果</p>
        </section>
        <section>
          <h2>当前项目</h2>
          <strong>{{ activeProject?.client || '未关联' }}</strong>
          <p>{{ activeProject?.name || '新建任务时可选择项目上下文' }}</p>
        </section>
      </aside>
    </main>

    <main v-else-if="activeTab === 'mine'" class="task-list">
      <article v-for="task in tasks" :key="task.id" class="task-row">
        <CalendarClock :size="17" />
        <span>
          <strong>{{ task.title }}</strong>
          <small>{{ task.project }} · {{ task.schedule }}</small>
        </span>
        <time>{{ task.nextRun }}</time>
        <CheckCircle2 :size="17" />
      </article>
    </main>

    <main v-else class="recommended-grid">
      <button v-for="task in recommendedTasks" :key="task" type="button" @click="createTask">
        <Sparkles :size="17" />
        <span>{{ task }}</span>
        <Bell :size="15" />
      </button>
    </main>
  </section>
</template>

<style scoped>
.scheduled-page {
  min-height: 100%;
  padding: 42px 56px 56px;
  background: var(--bg-color);
  color: var(--text-main);
}

.scheduled-header,
.scheduled-toolbar,
.result-card header,
.result-card footer,
.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.scheduled-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 30px;
  font-weight: 760;
}

.scheduled-header p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.primary-action {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border-radius: 8px;
  background: var(--text-strong);
  color: var(--card-bg);
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.scheduled-toolbar {
  margin-top: 34px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-soft);
}

.scheduled-tabs {
  display: flex;
  gap: 20px;
}

.scheduled-tabs button {
  position: relative;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 720;
}

.scheduled-tabs button.active {
  color: var(--text-strong);
}

.scheduled-tabs button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -17px;
  height: 2px;
  border-radius: 999px;
  background: var(--text-strong);
}

.scheduled-tabs strong {
  min-width: 21px;
  height: 21px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-soft);
  font-size: 11px;
}

.scheduled-search {
  width: min(320px, 36vw);
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-muted);
  background: var(--card-bg);
}

.scheduled-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-main);
}

.result-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 28px;
  margin-top: 24px;
}

.result-list,
.task-list,
.recommended-grid {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.result-layout .result-list {
  margin-top: 0;
}

.result-card,
.result-aside section,
.task-row,
.recommended-grid button {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.result-card {
  padding: 18px;
}

.result-project {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 760;
}

.result-card time,
.task-row time {
  color: var(--text-muted);
  font-size: 12px;
}

.result-card h2 {
  margin: 12px 0 8px;
  color: var(--text-strong);
  font-size: 18px;
}

.result-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.source-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 16px 0;
}

.source-row span,
.file-chip {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 12px;
}

.result-card footer button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-main);
  background: var(--surface-soft);
}

.result-aside {
  display: grid;
  gap: 12px;
  align-content: start;
}

.result-aside section {
  padding: 18px;
}

.result-aside h2 {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.result-aside strong {
  color: var(--text-strong);
  font-size: 24px;
}

.result-aside p {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.task-row {
  min-height: 62px;
  padding: 0 16px;
}

.task-row span {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 4px;
}

.task-row strong,
.task-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-row strong {
  color: var(--text-strong);
  font-size: 14px;
}

.task-row small {
  color: var(--text-muted);
  font-size: 12px;
}

.recommended-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.recommended-grid button {
  min-height: 72px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: var(--text-main);
  text-align: left;
}

.recommended-grid span {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 920px) {
  .scheduled-page {
    padding: 28px 18px 40px;
  }

  .scheduled-header,
  .scheduled-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .scheduled-search {
    width: 100%;
  }

  .result-layout {
    grid-template-columns: 1fr;
  }
}
</style>
