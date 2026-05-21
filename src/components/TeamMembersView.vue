<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CheckCircle2,
  Mail,
  MoreHorizontal,
  Search,
  UserPlus,
  Users,
} from 'lucide-vue-next';

type Role = '管理员' | '业务负责人' | '律师' | '助理' | '法务';
type Status = 'active' | 'pending' | 'inactive';

type Member = {
  id: number;
  name: string;
  avatar: string;
  email: string;
  role: Role;
  group: string;
  status: Status;
  joinedAt: string;
  lastActive: string;
};

const members: Member[] = [
  { id: 1, name: '王雪琴', avatar: '王', email: 'wangxq@example.com', role: '管理员', group: '管理团队', status: 'active', joinedAt: '2024-03-12', lastActive: '5 分钟前' },
  { id: 2, name: '李伟', avatar: '李', email: 'liwei@example.com', role: '业务负责人', group: '诉讼一组', status: 'active', joinedAt: '2024-05-08', lastActive: '1 小时前' },
  { id: 3, name: '陈思', avatar: '陈', email: 'chensi@example.com', role: '律师', group: '诉讼一组', status: 'active', joinedAt: '2024-06-21', lastActive: '今天 09:32' },
  { id: 4, name: '王芳', avatar: '王', email: 'wangfang@example.com', role: '律师', group: '合同组', status: 'active', joinedAt: '2024-07-04', lastActive: '今天 11:08' },
  { id: 5, name: '张明', avatar: '张', email: 'zhangming@example.com', role: '律师', group: '合规组', status: 'active', joinedAt: '2024-08-15', lastActive: '今天 10:18' },
  { id: 6, name: '赵磊', avatar: '赵', email: 'zhaolei@example.com', role: '助理', group: '诉讼一组', status: 'active', joinedAt: '2024-09-02', lastActive: '昨天 18:42' },
  { id: 7, name: '孙莉', avatar: '孙', email: 'sunli@example.com', role: '助理', group: '合同组', status: 'active', joinedAt: '2024-10-19', lastActive: '昨天 17:21' },
  { id: 8, name: '周浩', avatar: '周', email: 'zhouhao@example.com', role: '法务', group: '合规组', status: 'active', joinedAt: '2024-11-25', lastActive: '昨天 15:09' },
  { id: 9, name: '吴敏', avatar: '吴', email: 'wumin@example.com', role: '律师', group: '诉讼二组', status: 'pending', joinedAt: '2026-05-18', lastActive: '邀请中' },
  { id: 10, name: '黄涛', avatar: '黄', email: 'huangtao@example.com', role: '助理', group: '诉讼二组', status: 'pending', joinedAt: '2026-05-20', lastActive: '邀请中' },
  { id: 11, name: '冯岚', avatar: '冯', email: 'fenglan@example.com', role: '律师', group: '合规组', status: 'inactive', joinedAt: '2024-02-01', lastActive: '30 天前' },
];

const roleOptions: Array<'全部' | Role> = ['全部', '管理员', '业务负责人', '律师', '助理', '法务'];
const activeRole = ref<'全部' | Role>('全部');
const keyword = ref('');

const statusMeta: Record<Status, { label: string; tone: string }> = {
  active: { label: '在职', tone: 'tone-success' },
  pending: { label: '待激活', tone: 'tone-warn' },
  inactive: { label: '已停用', tone: 'tone-mute' },
};

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  return members.filter((m) => {
    const matchRole = activeRole.value === '全部' ? true : m.role === activeRole.value;
    const matchKey = !k || m.name.toLowerCase().includes(k) || m.email.toLowerCase().includes(k) || m.group.toLowerCase().includes(k);
    return matchRole && matchKey;
  });
});

const stats = computed(() => ({
  total: members.length,
  active: members.filter((m) => m.status === 'active').length,
  pending: members.filter((m) => m.status === 'pending').length,
  admins: members.filter((m) => m.role === '管理员' || m.role === '业务负责人').length,
}));

type PendingRequest = {
  id: number;
  name: string;
  avatar: string;
  source: string;
  requestedAt: string;
};

const requests = ref<PendingRequest[]>([
  { id: 101, name: '林一帆', avatar: '林', source: '邀请链接 · 诉讼二组', requestedAt: '今天 11:24' },
  { id: 102, name: '梁芷晴', avatar: '梁', source: '手机号申请加入', requestedAt: '今天 09:46' },
  { id: 103, name: '苏婧', avatar: '苏', source: '邀请链接 · 合同组', requestedAt: '昨天 17:32' },
]);

const handleApprove = (id: number) => {
  requests.value = requests.value.filter((r) => r.id !== id);
};
const handleReject = (id: number) => {
  requests.value = requests.value.filter((r) => r.id !== id);
};
const handleInvite = () => window.alert('演示环境：可生成邀请链接 / 二维码 / 手机号邀请');
</script>

<template>
  <div class="team-members">
    <header class="team-members-header">
      <div>
        <div class="team-members-eyebrow">成员管理</div>
        <h1 class="team-members-title">团队成员</h1>
        <p class="team-members-desc">管理团队成员、所属小组、角色与权限</p>
      </div>
      <button type="button" class="team-members-cta" @click="handleInvite">
        <UserPlus :size="15" />
        <span>邀请成员</span>
      </button>
    </header>

    <section class="team-members-stats">
      <div class="team-members-stat">
        <div class="team-members-stat-icon"><Users :size="16" /></div>
        <div>
          <div class="team-members-stat-label">成员总数</div>
          <div class="team-members-stat-value">{{ stats.total }}<span>人</span></div>
        </div>
      </div>
      <div class="team-members-stat">
        <div class="team-members-stat-icon success"><CheckCircle2 :size="16" /></div>
        <div>
          <div class="team-members-stat-label">在职</div>
          <div class="team-members-stat-value">{{ stats.active }}<span>人</span></div>
        </div>
      </div>
      <div class="team-members-stat">
        <div class="team-members-stat-icon warn"><Mail :size="16" /></div>
        <div>
          <div class="team-members-stat-label">待激活</div>
          <div class="team-members-stat-value">{{ stats.pending }}<span>人</span></div>
        </div>
      </div>
      <div class="team-members-stat">
        <div class="team-members-stat-icon"><Users :size="16" /></div>
        <div>
          <div class="team-members-stat-label">管理 / 负责人</div>
          <div class="team-members-stat-value">{{ stats.admins }}<span>人</span></div>
        </div>
      </div>
    </section>

    <section class="team-members-section">
      <div class="team-members-section-head">
        <h2 class="team-members-section-title">待审核加入申请</h2>
        <span class="team-members-section-meta">{{ requests.length }} 条待处理</span>
      </div>
      <div v-if="requests.length === 0" class="team-members-empty">暂无待审核申请</div>
      <div v-else class="team-members-requests">
        <div v-for="req in requests" :key="req.id" class="team-members-request-row">
          <div class="team-members-avatar">{{ req.avatar }}</div>
          <div class="team-members-request-meta">
            <div class="team-members-request-name">{{ req.name }}</div>
            <div class="team-members-request-source">{{ req.source }} · {{ req.requestedAt }}</div>
          </div>
          <div class="team-members-request-actions">
            <button type="button" class="team-members-mini-btn ghost" @click="handleReject(req.id)">拒绝</button>
            <button type="button" class="team-members-mini-btn primary" @click="handleApprove(req.id)">通过</button>
          </div>
        </div>
      </div>
    </section>

    <section class="team-members-section">
      <div class="team-members-section-head">
        <h2 class="team-members-section-title">成员列表</h2>
        <div class="team-members-filters">
          <div class="team-members-search">
            <Search :size="14" />
            <input v-model="keyword" type="search" placeholder="搜索姓名、邮箱、小组" />
          </div>
          <div class="team-members-role-tabs">
            <button
              v-for="role in roleOptions"
              :key="role"
              type="button"
              class="team-members-role-tab"
              :class="{ active: activeRole === role }"
              @click="activeRole = role"
            >{{ role }}</button>
          </div>
        </div>
      </div>

      <div class="team-members-table" role="table">
        <div class="team-members-table-head" role="row">
          <div role="columnheader">成员</div>
          <div role="columnheader">角色</div>
          <div role="columnheader">所属小组</div>
          <div role="columnheader">加入时间</div>
          <div role="columnheader">最近活跃</div>
          <div role="columnheader">状态</div>
          <div role="columnheader" class="align-right">操作</div>
        </div>
        <div v-for="m in filtered" :key="m.id" class="team-members-table-row" role="row">
          <div class="team-members-cell-user" role="cell">
            <div class="team-members-avatar">{{ m.avatar }}</div>
            <div>
              <div class="team-members-cell-name">{{ m.name }}</div>
              <div class="team-members-cell-mail">{{ m.email }}</div>
            </div>
          </div>
          <div role="cell"><span class="team-members-role-pill">{{ m.role }}</span></div>
          <div role="cell">{{ m.group }}</div>
          <div role="cell" class="muted">{{ m.joinedAt }}</div>
          <div role="cell" class="muted">{{ m.lastActive }}</div>
          <div role="cell">
            <span class="team-members-status-pill" :class="statusMeta[m.status].tone">
              {{ statusMeta[m.status].label }}
            </span>
          </div>
          <div role="cell" class="align-right">
            <button type="button" class="team-members-icon-btn" aria-label="更多操作">
              <MoreHorizontal :size="16" />
            </button>
          </div>
        </div>
        <div v-if="filtered.length === 0" class="team-members-empty">未找到匹配的成员</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.team-members {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 32px 28px 56px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--text-main);
}

.team-members-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.team-members-eyebrow {
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.team-members-title {
  margin: 6px 0 6px;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.team-members-desc {
  margin: 0;
  color: var(--text-main);
  opacity: 0.74;
  font-size: 13.5px;
}

.team-members-cta {
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
.team-members-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22); }

.team-members-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.team-members-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--sidebar-border);
  background: var(--card-bg);
}

.team-members-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--primary-soft);
  color: var(--primary-color);
}
.team-members-stat-icon.success { background: rgba(34, 168, 95, 0.12); color: #1f9756; }
.team-members-stat-icon.warn { background: rgba(220, 152, 35, 0.14); color: #c97a17; }

.team-members-stat-label { font-size: 12px; color: var(--text-main); opacity: 0.66; }
.team-members-stat-value {
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.team-members-stat-value span { font-size: 12px; font-weight: 500; opacity: 0.55; margin-left: 2px; }

.team-members-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.team-members-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.team-members-section-title {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 700;
}

.team-members-section-meta {
  color: var(--text-main);
  opacity: 0.66;
  font-size: 12.5px;
}

.team-members-requests {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--sidebar-border);
  background: var(--card-bg);
  overflow: hidden;
}

.team-members-request-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--sidebar-border);
}
.team-members-request-row:last-child { border-bottom: none; }

.team-members-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary-color), var(--focus-ring));
  color: var(--on-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
}

.team-members-request-meta { min-width: 0; }
.team-members-request-name { color: var(--text-strong); font-size: 14px; font-weight: 600; }
.team-members-request-source { color: var(--text-main); opacity: 0.65; font-size: 12px; margin-top: 2px; }

.team-members-request-actions { display: flex; gap: 8px; }

.team-members-mini-btn {
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.team-members-mini-btn.ghost {
  background: transparent;
  border: 1px solid var(--sidebar-border);
  color: var(--text-main);
}
.team-members-mini-btn.ghost:hover { color: #e0454a; border-color: #e0454a; }
.team-members-mini-btn.primary {
  background: var(--primary-color);
  border: 1px solid var(--primary-color);
  color: var(--on-primary);
}

.team-members-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.team-members-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--sidebar-border);
  background: var(--card-bg);
  color: var(--text-main);
  opacity: 0.9;
}
.team-members-search input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-main);
  font-size: 13px;
  width: 200px;
}

.team-members-role-tabs {
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  background: var(--primary-soft);
  gap: 2px;
}
.team-members-role-tab {
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-main);
  opacity: 0.7;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.team-members-role-tab.active {
  background: var(--card-bg);
  color: var(--primary-color);
  opacity: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.team-members-table {
  border-radius: 12px;
  border: 1px solid var(--sidebar-border);
  background: var(--card-bg);
  overflow: hidden;
}
.team-members-table-head,
.team-members-table-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) 110px 120px 110px 110px 90px 60px;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  font-size: 13px;
}
.team-members-table-head {
  background: var(--primary-soft);
  color: var(--text-main);
  opacity: 0.78;
  font-size: 12px;
  font-weight: 600;
}
.team-members-table-row { border-top: 1px solid var(--sidebar-border); }

.team-members-cell-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.team-members-cell-name { color: var(--text-strong); font-weight: 600; font-size: 13.5px; }
.team-members-cell-mail { color: var(--text-main); opacity: 0.6; font-size: 12px; margin-top: 1px; }

.team-members-role-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
}

.team-members-status-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}
.team-members-status-pill.tone-success { background: rgba(34, 168, 95, 0.12); color: #1f9756; }
.team-members-status-pill.tone-warn { background: rgba(220, 152, 35, 0.14); color: #c97a17; }
.team-members-status-pill.tone-mute { background: rgba(120, 120, 120, 0.14); color: #6b6b6b; }

.muted { color: var(--text-main); opacity: 0.65; }

.team-members-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-main);
  opacity: 0.6;
  cursor: pointer;
}
.team-members-icon-btn:hover { background: var(--primary-soft); color: var(--primary-color); opacity: 1; }

.align-right { text-align: right; }

.team-members-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-main);
  opacity: 0.55;
  font-size: 13px;
  background: var(--card-bg);
  border: 1px solid var(--sidebar-border);
  border-radius: 12px;
}

@media (max-width: 960px) {
  .team-members-stats { grid-template-columns: repeat(2, 1fr); }
  .team-members-table-head { display: none; }
  .team-members-table-row {
    grid-template-columns: 1fr 90px;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 10px;
  }
  .team-members-table-row > div:nth-child(n+3):nth-child(-n+5) { display: none; }
  .team-members-table-row > div:nth-child(2) { grid-column: 1 / -1; }
}

@media (max-width: 720px) {
  .team-members { padding: 24px 16px 80px; }
  .team-members-search input { width: 130px; }
}
</style>
