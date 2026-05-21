<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Bot,
  Briefcase,
  Database,
  Plus,
  Scale,
  ShieldCheck,
  Users,
  Lightbulb,
  Search,
} from 'lucide-vue-next';

type Group = {
  id: string;
  name: string;
  icon: typeof Users;
  category: string;
  leader: { name: string; avatar: string };
  members: number;
  agents: number;
  knowledgeBases: number;
  cases: number;
  description: string;
  recentActivity: string;
};

const groups: Group[] = [
  {
    id: 'litigation-1',
    name: '诉讼一组',
    icon: Scale,
    category: '诉讼业务',
    leader: { name: '李伟', avatar: '李' },
    members: 6,
    agents: 4,
    knowledgeBases: 3,
    cases: 28,
    description: '主攻民商事诉讼，覆盖合同纠纷、房屋买卖、劳动争议等高频案件。',
    recentActivity: '今天 11:08 · 王芳更新了类案检索结果',
  },
  {
    id: 'litigation-2',
    name: '诉讼二组',
    icon: Scale,
    category: '诉讼业务',
    leader: { name: '陈思', avatar: '陈' },
    members: 4,
    agents: 3,
    knowledgeBases: 2,
    cases: 18,
    description: '聚焦民事侵权与执行业务，配套证据整理与录音转写智能体。',
    recentActivity: '昨天 17:42 · 启用合同审查 Pro',
  },
  {
    id: 'contract',
    name: '合同组',
    icon: Briefcase,
    category: '商事服务',
    leader: { name: '王芳', avatar: '王' },
    members: 5,
    agents: 5,
    knowledgeBases: 4,
    cases: 64,
    description: '覆盖合同起草、审查、比对全流程，沉淀了三套示范合同模板库。',
    recentActivity: '今天 09:45 · 新增 4 份模板',
  },
  {
    id: 'compliance',
    name: '合规组',
    icon: ShieldCheck,
    category: '风控合规',
    leader: { name: '周浩', avatar: '周' },
    members: 4,
    agents: 3,
    knowledgeBases: 5,
    cases: 12,
    description: '为企业客户提供合规审计、内控梳理与制度撰写，承接咨政业务。',
    recentActivity: '今天 10:22 · 张明上传 1 份新法规',
  },
  {
    id: 'research',
    name: '研究小组',
    icon: Lightbulb,
    category: '法律研究',
    leader: { name: '王雪琴', avatar: '王' },
    members: 3,
    agents: 2,
    knowledgeBases: 6,
    cases: 9,
    description: '负责法律研究报告、咨政报告与论文写作支持，对接学术搜索与法规库。',
    recentActivity: '昨天 16:48 · 生成 1 份法律研究报告',
  },
  {
    id: 'kb',
    name: '知识沉淀',
    icon: Database,
    category: '内部协作',
    leader: { name: '管理员', avatar: '管' },
    members: 2,
    agents: 1,
    knowledgeBases: 8,
    cases: 0,
    description: '维护团队共享知识库、办案要点与典型案例，向各业务组提供检索支持。',
    recentActivity: '今天 09:10 · 知识库索引完成',
  },
];

const keyword = ref('');
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return groups;
  return groups.filter((g) =>
    g.name.toLowerCase().includes(k)
    || g.category.toLowerCase().includes(k)
    || g.description.toLowerCase().includes(k)
  );
});

const totalStats = computed(() => ({
  groups: groups.length,
  members: groups.reduce((s, g) => s + g.members, 0),
  agents: groups.reduce((s, g) => s + g.agents, 0),
  cases: groups.reduce((s, g) => s + g.cases, 0),
}));

const handleCreate = () => window.alert('演示环境：可创建新小组并配置可见范围、负责人');
</script>

<template>
  <div class="team-groups">
    <header class="team-groups-header">
      <div>
        <div class="team-groups-eyebrow">小组管理</div>
        <h1 class="team-groups-title">协作小组</h1>
        <p class="team-groups-desc">为不同业务线组建小组，绑定负责人、智能体与知识库</p>
      </div>
      <button type="button" class="team-groups-cta" @click="handleCreate">
        <Plus :size="15" />
        <span>新建小组</span>
      </button>
    </header>

    <section class="team-groups-stats">
      <div class="team-groups-stat">
        <div class="team-groups-stat-label">小组总数</div>
        <div class="team-groups-stat-value">{{ totalStats.groups }}<span>组</span></div>
      </div>
      <div class="team-groups-stat">
        <div class="team-groups-stat-label">覆盖成员</div>
        <div class="team-groups-stat-value">{{ totalStats.members }}<span>人</span></div>
      </div>
      <div class="team-groups-stat">
        <div class="team-groups-stat-label">绑定智能体</div>
        <div class="team-groups-stat-value">{{ totalStats.agents }}<span>个</span></div>
      </div>
      <div class="team-groups-stat">
        <div class="team-groups-stat-label">在办案件</div>
        <div class="team-groups-stat-value">{{ totalStats.cases }}<span>件</span></div>
      </div>
    </section>

    <div class="team-groups-toolbar">
      <div class="team-groups-search">
        <Search :size="14" />
        <input v-model="keyword" type="search" placeholder="搜索小组名称、分类、简介" />
      </div>
    </div>

    <section class="team-groups-grid">
      <article v-for="g in filtered" :key="g.id" class="team-groups-card">
        <div class="team-groups-card-top">
          <div class="team-groups-card-icon">
            <component :is="g.icon" :size="18" />
          </div>
          <span class="team-groups-card-category">{{ g.category }}</span>
        </div>

        <h3 class="team-groups-card-name">{{ g.name }}</h3>
        <p class="team-groups-card-desc">{{ g.description }}</p>

        <div class="team-groups-card-meta">
          <div class="team-groups-card-leader">
            <div class="team-groups-card-avatar">{{ g.leader.avatar }}</div>
            <div>
              <div class="team-groups-card-meta-label">负责人</div>
              <div class="team-groups-card-meta-value">{{ g.leader.name }}</div>
            </div>
          </div>
        </div>

        <div class="team-groups-card-counters">
          <div class="team-groups-counter">
            <Users :size="13" />
            <span>{{ g.members }} 成员</span>
          </div>
          <div class="team-groups-counter">
            <Bot :size="13" />
            <span>{{ g.agents }} 智能体</span>
          </div>
          <div class="team-groups-counter">
            <Database :size="13" />
            <span>{{ g.knowledgeBases }} 知识库</span>
          </div>
          <div class="team-groups-counter">
            <Briefcase :size="13" />
            <span>{{ g.cases }} 案件</span>
          </div>
        </div>

        <footer class="team-groups-card-foot">
          <span class="team-groups-card-activity">{{ g.recentActivity }}</span>
        </footer>
      </article>

      <div v-if="filtered.length === 0" class="team-groups-empty">未找到匹配的小组</div>
    </section>
  </div>
</template>

<style scoped>
.team-groups {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 32px 28px 56px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text-main);
}

.team-groups-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.team-groups-eyebrow {
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.team-groups-title {
  margin: 6px 0 6px;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.3px;
}
.team-groups-desc {
  margin: 0;
  color: var(--text-main);
  opacity: 0.74;
  font-size: 13.5px;
}
.team-groups-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--primary-color);
  border-radius: 9px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.team-groups-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22); }

.team-groups-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.team-groups-stat {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--sidebar-border);
  background: var(--card-bg);
}
.team-groups-stat-label { color: var(--text-main); opacity: 0.66; font-size: 12px; }
.team-groups-stat-value {
  margin-top: 4px;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
}
.team-groups-stat-value span { margin-left: 2px; font-size: 12px; font-weight: 500; opacity: 0.55; }

.team-groups-toolbar { display: flex; align-items: center; }
.team-groups-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  border: 1px solid var(--sidebar-border);
  background: var(--card-bg);
  color: var(--text-main);
}
.team-groups-search input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-main);
  font-size: 13px;
  width: 220px;
}

.team-groups-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.team-groups-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 18px 16px;
  border-radius: 14px;
  border: 1px solid var(--sidebar-border);
  background: var(--card-bg);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.team-groups-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary-color);
  box-shadow: var(--shadow-card);
}

.team-groups-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.team-groups-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary-color);
}
.team-groups-card-category {
  font-size: 11.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-color);
}

.team-groups-card-name {
  margin: 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.team-groups-card-desc {
  margin: 0;
  color: var(--text-main);
  opacity: 0.74;
  font-size: 13px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.team-groups-card-meta { display: flex; align-items: center; }
.team-groups-card-leader { display: flex; align-items: center; gap: 10px; }
.team-groups-card-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary-color), var(--focus-ring));
  color: var(--on-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
}
.team-groups-card-meta-label { color: var(--text-main); opacity: 0.6; font-size: 11.5px; }
.team-groups-card-meta-value { color: var(--text-strong); font-weight: 600; font-size: 13px; }

.team-groups-card-counters {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 14px;
  padding-top: 10px;
  border-top: 1px dashed var(--sidebar-border);
}
.team-groups-counter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-main);
  opacity: 0.78;
  font-size: 12.5px;
}

.team-groups-card-foot {
  padding-top: 10px;
  border-top: 1px dashed var(--sidebar-border);
}
.team-groups-card-activity {
  color: var(--text-main);
  opacity: 0.6;
  font-size: 12px;
}

.team-groups-empty {
  grid-column: 1 / -1;
  padding: 24px;
  text-align: center;
  color: var(--text-main);
  opacity: 0.55;
  border-radius: 12px;
  border: 1px dashed var(--sidebar-border);
  background: var(--card-bg);
}

@media (max-width: 960px) {
  .team-groups-stats { grid-template-columns: repeat(2, 1fr); }
  .team-groups-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 720px) {
  .team-groups { padding: 24px 16px 80px; }
  .team-groups-grid { grid-template-columns: 1fr; }
  .team-groups-search input { width: 100%; }
  .team-groups-search { width: 100%; }
}
</style>
