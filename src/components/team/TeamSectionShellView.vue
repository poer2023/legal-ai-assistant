<script setup lang="ts">
import { computed } from 'vue';
import { Bell, Bot, Coins, Users, UsersRound } from 'lucide-vue-next';

type TeamSectionKey = 'members' | 'groups' | 'agents' | 'miniprogram';

interface TeamSectionConfig {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  metrics: Array<{ label: string; value: string }>;
  tasks: string[];
}

const props = defineProps<{
  section: TeamSectionKey;
}>();

const sectionConfigs: Record<TeamSectionKey, TeamSectionConfig> = {
  members: {
    title: '成员管理',
    subtitle: '为律师、法务、助理等团队成员预留统一的账号、角色和权限管理壳子。',
    primaryLabel: '导入成员',
    secondaryLabel: '新建成员',
    metrics: [
      { label: '演示成员', value: '26' },
      { label: '角色类型', value: '5' },
      { label: '待完善字段', value: '执业方向 / 权限' },
    ],
    tasks: ['展示成员列表与角色信息', '补充导入、筛选、状态切换', '为法律版各智能体复用统一权限结构'],
  },
  groups: {
    title: '小组管理',
    subtitle: '预留诉讼组、合同组、合规组等法律团队分组能力的壳子。',
    primaryLabel: '创建小组',
    secondaryLabel: '批量调整',
    metrics: [
      { label: '演示小组', value: '8' },
      { label: '分组维度', value: '业务 / 部门 / 专业方向' },
      { label: '待完善字段', value: '可见范围 / 协作规则' },
    ],
    tasks: ['展示小组卡片与成员规模', '补充小组与知识库绑定关系', '为案件协作和权限范围提供结构基础'],
  },
  agents: {
    title: '智能体管理',
    subtitle: '预留团队级法律智能体启用、分配、可见范围和负责人配置壳子。',
    primaryLabel: '新增智能体',
    secondaryLabel: '批量配置',
    metrics: [
      { label: '现有智能体', value: '11' },
      { label: '重点场景', value: '合同 / 检索 / 文书' },
      { label: '待完善字段', value: '启停 / 团队可见 / 知识源' },
    ],
    tasks: ['展示智能体启用状态', '补充负责人和可见范围', '承接法律版新增模块配置'],
  },
  miniprogram: {
    title: '小程序管理',
    subtitle: '预留小程序端团队入口、展示配置和访问状态管理。',
    primaryLabel: '新增配置',
    secondaryLabel: '预览入口',
    metrics: [
      { label: '展示入口', value: '演示团队' },
      { label: '访问状态', value: '已开启' },
      { label: '待完善字段', value: '二维码 / 分享范围 / 首页配置' },
    ],
    tasks: ['展示小程序入口信息', '补充首页配置和可见范围', '支撑移动端演示场景'],
  },
};

const currentSection = computed(() => sectionConfigs[props.section]);

const currentIcon = computed(() => {
  const iconMap = {
    members: Users,
    groups: UsersRound,
    agents: Bot,
    miniprogram: Coins,
  };

  return iconMap[props.section];
});

const currentBadge = computed(() => {
  const badgeMap = {
    members: '成员结构壳子',
    groups: '分组结构壳子',
    agents: '智能体配置壳子',
    miniprogram: '小程序配置壳子',
  };

  return badgeMap[props.section];
});
</script>

<template>
  <div class="team-section-shell">
    <div class="content-header">
      <div class="header-main">
        <div class="icon-wrapper">
          <component :is="currentIcon" :size="22" />
        </div>
        <div>
          <div class="badge">{{ currentBadge }}</div>
          <h1 class="page-title">{{ currentSection.title }}</h1>
          <p class="page-subtitle">{{ currentSection.subtitle }}</p>
        </div>
      </div>
      <div class="action-group">
        <button class="ghost-btn">{{ currentSection.secondaryLabel }}</button>
        <button class="primary-btn">{{ currentSection.primaryLabel }}</button>
      </div>
    </div>

    <div class="metric-grid">
      <div v-for="metric in currentSection.metrics" :key="metric.label" class="metric-card">
        <div class="metric-label">{{ metric.label }}</div>
        <div class="metric-value">{{ metric.value }}</div>
      </div>
    </div>

    <div class="shell-card">
      <div class="card-header">
        <h2>本期 Demo 壳子范围</h2>
        <span>前端 Mock 演示，不接后端</span>
      </div>
      <div class="task-list">
        <div v-for="task in currentSection.tasks" :key="task" class="task-item">
          <Bell :size="14" />
          <span>{{ task }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-section-shell { width: 100%; max-width: 940px; }
.content-header, .metric-card, .shell-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.05); }
.content-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px; margin-bottom: 18px; }
.header-main { display: flex; gap: 14px; align-items: flex-start; }
.icon-wrapper { width: 50px; height: 50px; border-radius: 14px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.badge { display: inline-flex; padding: 6px 10px; border-radius: 999px; background: #f8fafc; color: #475569; font-size: 12px; font-weight: 600; }
.page-title { margin: 10px 0 6px; font-size: 24px; color: #0f172a; }
.page-subtitle { margin: 0; color: #64748b; line-height: 1.65; }
.action-group { display: flex; gap: 10px; flex-wrap: wrap; }
.ghost-btn, .primary-btn { padding: 10px 14px; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 600; }
.ghost-btn { border: 1px solid #cbd5e1; background: white; color: #475569; }
.primary-btn { border: 1px solid #2563eb; background: #2563eb; color: white; }
.metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
.metric-card { padding: 18px 20px; }
.metric-label { font-size: 13px; color: #64748b; }
.metric-value { margin-top: 10px; font-size: 18px; font-weight: 700; color: #0f172a; }
.shell-card { padding: 22px 24px; }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.card-header h2 { margin: 0; font-size: 18px; color: #0f172a; }
.card-header span { font-size: 13px; color: #94a3b8; }
.task-list { display: flex; flex-direction: column; gap: 12px; }
.task-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; background: #f8fafc; color: #475569; }
@media (max-width: 900px) { .content-header { flex-direction: column; align-items: stretch; } .metric-grid { grid-template-columns: 1fr; } }
</style>
