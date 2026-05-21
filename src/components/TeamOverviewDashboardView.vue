<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowUpRight,
  Building2,
  Camera,
  Check,
  Coins,
  Edit3,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-vue-next';
import { useOrgSession } from '../stores/orgSession';

type MemberPreview = {
  id: number;
  name: string;
  avatar: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  lastActive: string;
};

const router = useRouter();
const { currentOrganization, updateOrganizationProfile } = useOrgSession();

const isEditing = ref(false);
const nameDraft = ref('');
const shortNameDraft = ref('');
const descriptionDraft = ref('');
const avatarDraftDataUrl = ref('');
const avatarInputRef = ref<HTMLInputElement | null>(null);

const memberPreviews: MemberPreview[] = [
  { id: 1, name: '王雪琴', avatar: '王', role: '管理员', status: 'active', lastActive: '5 分钟前' },
  { id: 2, name: '李伟', avatar: '李', role: '业务负责人', status: 'active', lastActive: '1 小时前' },
  { id: 3, name: '陈思', avatar: '陈', role: '律师', status: 'active', lastActive: '今天 09:32' },
  { id: 4, name: '王芳', avatar: '王', role: '律师', status: 'active', lastActive: '今天 11:08' },
  { id: 5, name: '张明', avatar: '张', role: '律师', status: 'active', lastActive: '今天 10:18' },
  { id: 6, name: '吴敏', avatar: '吴', role: '律师', status: 'pending', lastActive: '邀请中' },
];

const teamCreditsTotal = 50000;
const teamCreditsUsed = 12480;
const teamCreditsRemaining = teamCreditsTotal - teamCreditsUsed;
const creditsUsagePercent = computed(() =>
  Math.round((teamCreditsUsed / teamCreditsTotal) * 100),
);
const creditsNearLimit = computed(() => creditsUsagePercent.value >= 85);

const teamPlan = computed(() => currentOrganization.value?.planName ?? '专业版');
const teamMemberCount = computed(() => currentOrganization.value?.memberCount ?? memberPreviews.length);
const activeMemberCount = computed(() => memberPreviews.filter((m) => m.status === 'active').length);
const pendingMemberCount = computed(() => memberPreviews.filter((m) => m.status === 'pending').length);

const displayName = computed(() =>
  isEditing.value ? nameDraft.value : (currentOrganization.value?.name ?? '演示团队'),
);
const displayShortName = computed(() =>
  isEditing.value ? shortNameDraft.value : (currentOrganization.value?.shortName ?? '团队'),
);
const displayDescription = computed(() =>
  isEditing.value
    ? descriptionDraft.value
    : (currentOrganization.value?.description ?? '为团队补充简介，方便成员了解组织定位与协作范围。'),
);

const displayAvatarUrl = computed(() =>
  isEditing.value
    ? avatarDraftDataUrl.value
    : (currentOrganization.value?.avatarDataUrl ?? ''),
);

const syncDraftFromOrganization = () => {
  const organization = currentOrganization.value;
  nameDraft.value = organization?.name ?? '';
  shortNameDraft.value = organization?.shortName ?? '';
  descriptionDraft.value = organization?.description ?? '';
  avatarDraftDataUrl.value = organization?.avatarDataUrl ?? '';
};

watch(currentOrganization, () => {
  if (!isEditing.value) syncDraftFromOrganization();
}, { immediate: true });

const startEdit = () => {
  syncDraftFromOrganization();
  isEditing.value = true;
};

const cancelEdit = () => {
  syncDraftFromOrganization();
  isEditing.value = false;
};

const saveEdit = () => {
  const organizationId = currentOrganization.value?.id;
  if (!organizationId) return;

  const name = nameDraft.value.trim();
  updateOrganizationProfile(organizationId, {
    name,
    shortName: shortNameDraft.value,
    description: descriptionDraft.value,
    avatarText: name.slice(0, 1) || currentOrganization.value?.avatarText || '团',
    avatarDataUrl: avatarDraftDataUrl.value,
  });
  isEditing.value = false;
};

const triggerAvatarUpload = () => {
  if (!isEditing.value) return;
  avatarInputRef.value?.click();
};

const handleAvatarUpload = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      avatarDraftDataUrl.value = reader.result;
    }
  };
  reader.readAsDataURL(file);
  if (input) input.value = '';
};

const formatCredits = (value: number) => value.toLocaleString('zh-CN');

const goMembers = () => router.push({ name: 'team-members' });
const goCredits = () => router.push({ name: 'team-credits' });

const statusLabel: Record<MemberPreview['status'], string> = {
  active: '在职',
  pending: '待激活',
  inactive: '已停用',
};
</script>

<template>
  <div class="team-dashboard">
    <header class="team-dashboard-page-head">
      <div class="team-dashboard-eyebrow">团队概览</div>
      <p class="team-dashboard-page-desc">管理团队基础信息、成员概况与积分权益</p>
    </header>

    <section class="team-dashboard-card team-settings-card" aria-labelledby="team-settings-title">
      <div class="team-dashboard-card-head">
        <div>
          <h2 id="team-settings-title" class="team-dashboard-card-title">团队信息</h2>
          <p class="team-dashboard-card-desc">名称、简介等对外展示与内部识别用的基础资料</p>
        </div>
        <div v-if="!isEditing" class="team-dashboard-card-actions">
          <button type="button" class="team-dashboard-edit-btn" @click="startEdit">
            <Edit3 :size="15" />
            <span>编辑</span>
          </button>
        </div>
        <div v-else class="team-dashboard-card-actions">
          <button type="button" class="team-dashboard-ghost-btn" @click="cancelEdit">
            <X :size="15" />
            <span>取消</span>
          </button>
          <button type="button" class="team-dashboard-save-btn" @click="saveEdit">
            <Check :size="15" />
            <span>保存</span>
          </button>
        </div>
      </div>

      <div class="team-settings-body">
        <div class="team-settings-logo-block">
          <button
            type="button"
            class="team-settings-avatar"
            :class="{ editable: isEditing }"
            :aria-label="`${displayName} 团队头像`"
            :disabled="!isEditing"
            @click="triggerAvatarUpload"
          >
            <img
              v-if="displayAvatarUrl"
              :src="displayAvatarUrl"
              alt=""
              class="team-settings-avatar-image"
            />
            <span v-else class="team-settings-avatar-fallback" aria-hidden="true">
              <Building2 :size="34" />
            </span>
            <span v-if="isEditing" class="team-settings-avatar-overlay" aria-hidden="true">
              <Camera :size="20" />
            </span>
          </button>
          <input
            ref="avatarInputRef"
            class="team-settings-avatar-input"
            type="file"
            accept="image/*"
            @change="handleAvatarUpload"
          />
          <p v-if="isEditing" class="team-settings-avatar-hint">点击头像上传图片</p>
        </div>

        <div class="team-settings-fields">
          <label class="team-settings-field">
            <span>团队名称</span>
            <input
              v-if="isEditing"
              v-model="nameDraft"
              type="text"
              placeholder="如：涌见律所演示组织"
              autocomplete="organization"
            />
            <div v-else class="team-settings-value">{{ displayName }}</div>
          </label>

          <label class="team-settings-field">
            <span>团队简称</span>
            <input
              v-if="isEditing"
              v-model="shortNameDraft"
              type="text"
              placeholder="如：涌见律所"
              autocomplete="off"
            />
            <div v-else class="team-settings-value">{{ displayShortName }}</div>
          </label>

          <label class="team-settings-field team-settings-field-wide">
            <span>团队简介</span>
            <textarea
              v-if="isEditing"
              v-model="descriptionDraft"
              rows="4"
              placeholder="介绍团队定位、业务方向或协作说明"
            />
            <div v-else class="team-settings-value team-settings-description">{{ displayDescription }}</div>
          </label>

          <div v-if="!isEditing" class="team-settings-readonly-grid">
            <div class="team-settings-readonly-item">
              <span>团队规模</span>
              <strong>{{ teamMemberCount }} 人</strong>
            </div>
            <div class="team-settings-readonly-item">
              <span>当前套餐</span>
              <strong>{{ teamPlan }}</strong>
            </div>
            <div class="team-settings-readonly-item">
              <span>我的角色</span>
              <strong>{{ currentOrganization?.role ?? '管理员' }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="team-dashboard-card" aria-labelledby="team-credits-title">
      <div class="team-dashboard-card-head">
        <div>
          <h2 id="team-credits-title" class="team-dashboard-card-title">团队权益</h2>
          <p class="team-dashboard-card-desc">本计费周期内团队积分总量与消耗情况</p>
        </div>
        <button type="button" class="team-dashboard-text-link" @click="goCredits">
          <span>积分明细</span>
          <ArrowUpRight :size="13" />
        </button>
      </div>

      <article
        class="team-credits-panel"
        :class="{ warning: creditsNearLimit }"
      >
        <div class="team-credits-panel-top">
          <div class="team-credits-panel-icon">
            <Coins :size="20" />
          </div>
          <span class="team-credits-panel-trend">
            <TrendingUp :size="12" />
            本周 +1,260
          </span>
        </div>

        <div class="team-credits-panel-label">团队积分</div>

        <div class="team-credits-panel-metrics">
          <div class="team-credits-metric">
            <span>总量</span>
            <strong>{{ formatCredits(teamCreditsTotal) }}<small>分</small></strong>
          </div>
          <div class="team-credits-metric">
            <span>已用</span>
            <strong>{{ formatCredits(teamCreditsUsed) }}<small>分</small></strong>
          </div>
          <div class="team-credits-metric highlight">
            <span>剩余</span>
            <strong>{{ formatCredits(teamCreditsRemaining) }}<small>分</small></strong>
          </div>
        </div>

        <div class="team-credits-progress" aria-hidden="true">
          <div class="team-credits-progress-fill" :style="{ width: `${creditsUsagePercent}%` }"></div>
        </div>

        <p class="team-credits-footnote">
          <template v-if="creditsNearLimit">已使用 {{ creditsUsagePercent }}% · 接近上限</template>
          <template v-else>已使用 {{ creditsUsagePercent }}% · 剩余 {{ formatCredits(teamCreditsRemaining) }} 分可用</template>
        </p>
      </article>
    </section>

    <section class="team-dashboard-card" aria-labelledby="team-members-title">
      <div class="team-dashboard-card-head">
        <div>
          <h2 id="team-members-title" class="team-dashboard-card-title">团队成员</h2>
          <p class="team-dashboard-card-desc">
            在职 {{ activeMemberCount }} 人 · 待激活 {{ pendingMemberCount }} 人 · 共 {{ teamMemberCount }} 人
          </p>
        </div>
        <button type="button" class="team-dashboard-text-link" @click="goMembers">
          <span>成员管理</span>
          <ArrowUpRight :size="13" />
        </button>
      </div>

      <div class="team-members-preview">
        <div
          v-for="member in memberPreviews"
          :key="member.id"
          class="team-members-preview-row"
        >
          <div class="team-members-preview-avatar">{{ member.avatar }}</div>
          <div class="team-members-preview-main">
            <div class="team-members-preview-name">{{ member.name }}</div>
            <div class="team-members-preview-meta">{{ member.role }} · {{ member.lastActive }}</div>
          </div>
          <span
            class="team-members-preview-status"
            :class="{
              pending: member.status === 'pending',
              inactive: member.status === 'inactive',
            }"
          >
            {{ statusLabel[member.status] }}
          </span>
        </div>
      </div>

      <button type="button" class="team-members-invite-btn" @click="goMembers">
        <UserPlus :size="15" />
        <span>邀请成员 / 查看全部</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.team-dashboard {
  width: min(896px, 100%);
  margin: 0 auto;
  padding: 32px 28px 56px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text-main);
}

.team-dashboard-page-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.team-dashboard-eyebrow {
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.team-dashboard-page-desc {
  margin: 0;
  color: var(--text-main);
  opacity: 0.72;
  font-size: 13.5px;
  line-height: 1.5;
}

.team-dashboard-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px;
  border: 1px solid var(--sidebar-border);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}

.team-dashboard-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.team-dashboard-card-title {
  margin: 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 700;
}

.team-dashboard-card-desc {
  margin: 4px 0 0;
  color: var(--text-main);
  opacity: 0.7;
  font-size: 12.5px;
  line-height: 1.45;
}

.team-dashboard-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.team-dashboard-edit-btn,
.team-dashboard-save-btn,
.team-dashboard-ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.team-dashboard-edit-btn,
.team-dashboard-save-btn {
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: var(--on-primary);
}

.team-dashboard-ghost-btn {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
}

.team-dashboard-text-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border: none;
  background: transparent;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  flex-shrink: 0;
}

.team-dashboard-text-link:hover {
  background: var(--primary-soft);
}

.team-settings-body {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.team-settings-logo-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.team-settings-avatar {
  position: relative;
  width: 96px;
  height: 96px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  background: var(--surface-muted);
  box-shadow: var(--shadow-card);
  cursor: default;
}

.team-settings-avatar.editable {
  cursor: pointer;
}

.team-settings-avatar:disabled {
  cursor: default;
}

.team-settings-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.team-settings-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  background: linear-gradient(145deg, var(--primary-soft) 0%, var(--card-bg) 100%);
}

.team-settings-avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  color: #fff;
}

.team-settings-avatar-input {
  display: none;
}

.team-settings-avatar-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 11.5px;
  text-align: center;
}

.team-settings-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.team-settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.team-settings-field > span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.team-settings-field input,
.team-settings-field textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-main);
  background: var(--surface-muted);
  font-size: 14px;
  line-height: 1.5;
  outline: none;
}

.team-settings-field input:focus,
.team-settings-field textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 16%, transparent);
}

.team-settings-value {
  min-height: 40px;
  display: flex;
  align-items: center;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 500;
}

.team-settings-description {
  align-items: flex-start;
  min-height: auto;
  padding: 2px 0;
  line-height: 1.65;
  white-space: pre-wrap;
  font-weight: 400;
  color: var(--text-main);
}

.team-settings-readonly-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 4px;
}

.team-settings-readonly-item {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--surface-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-settings-readonly-item span {
  color: var(--text-muted);
  font-size: 11.5px;
}

.team-settings-readonly-item strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.team-members-preview {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--sidebar-border);
  border-radius: 12px;
  overflow: hidden;
}

.team-members-preview-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--sidebar-border);
}

.team-members-preview-row:last-child {
  border-bottom: none;
}

.team-members-preview-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-soft);
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 700;
}

.team-members-preview-name {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 600;
}

.team-members-preview-meta {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
}

.team-members-preview-status {
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, #16a34a 12%, transparent);
  color: #15803d;
  font-size: 11px;
  font-weight: 700;
}

.team-members-preview-status.pending {
  background: color-mix(in srgb, #f59e0b 14%, transparent);
  color: #b45309;
}

.team-members-preview-status.inactive {
  background: var(--surface-muted);
  color: var(--text-muted);
}

.team-members-invite-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px dashed var(--primary-border);
  border-radius: 10px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 13px;
  font-weight: 600;
}

.team-credits-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--primary-border);
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--card-bg) 72%);
}

.team-credits-panel.warning {
  border-color: color-mix(in srgb, #e0454a 40%, var(--border-color));
  background: linear-gradient(135deg, rgba(224, 69, 74, 0.08) 0%, var(--card-bg) 72%);
}

.team-credits-panel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team-credits-panel-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--primary-color);
}

.team-credits-panel.warning .team-credits-panel-icon {
  color: #e0454a;
}

.team-credits-panel-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--primary-color);
  font-size: 11px;
  font-weight: 600;
}

.team-credits-panel-label {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 500;
  opacity: 0.78;
}

.team-credits-panel-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.team-credits-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-credits-metric span {
  color: var(--text-muted);
  font-size: 12px;
}

.team-credits-metric strong {
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.4px;
}

.team-credits-metric strong small {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 500;
  opacity: 0.65;
}

.team-credits-metric.highlight strong {
  color: var(--primary-color);
}

.team-credits-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  overflow: hidden;
}

.team-credits-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--primary-color);
  transition: width 0.35s ease;
}

.team-credits-panel.warning .team-credits-progress-fill {
  background: #e0454a;
}

.team-credits-footnote {
  margin: 0;
  color: var(--text-muted);
  font-size: 12.5px;
}

.team-credits-panel.warning .team-credits-footnote {
  color: #e0454a;
}

@media (max-width: 768px) {
  .team-dashboard {
    padding: 24px 16px 80px;
  }

  .team-settings-body {
    grid-template-columns: 1fr;
  }

  .team-settings-readonly-grid {
    grid-template-columns: 1fr;
  }

  .team-credits-panel-metrics {
    grid-template-columns: 1fr;
  }

  .team-dashboard-card-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
