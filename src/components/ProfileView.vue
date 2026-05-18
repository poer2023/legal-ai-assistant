<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  BadgeCheck,
  Building2,
  Check,
  KeyRound,
  LogOut,
  Palette,
  Pencil,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from 'lucide-vue-next';
import { AUTH_FLOW_ENABLED, useOrgSession } from '../stores/orgSession';
import { useTheme } from '../stores/theme';
import type { ThemeId } from '../data/themes';

const router = useRouter();
const {
  currentOrganization,
  currentOrganizationId,
  currentUser,
  logout,
  organizations,
  selectOrganization,
  updateUserProfile,
} = useOrgSession();
const { currentThemeId, setTheme, themeOptions } = useTheme();

const displayNameDraft = ref('');
const avatarDraftDataUrl = ref('');
const firmShortNameDraft = ref('');
const profileBioDraft = ref('');
const isEditingProfile = ref(false);
const avatarInputRef = ref<HTMLInputElement | null>(null);
const statusMessage = ref('');
const showAuthControls = AUTH_FLOW_ENABLED;
const showOrganizationAccessControls = AUTH_FLOW_ENABLED;
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const showStatus = (message: string) => {
  statusMessage.value = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusMessage.value = '';
    statusTimer = null;
  }, 1600);
};

const profileAvatarText = computed(() =>
  displayNameDraft.value.trim().slice(0, 1).toUpperCase()
  || currentUser.value?.avatarText
  || '用'
);

const savedFirmShortName = computed(() =>
  currentUser.value?.firmShortName?.trim()
  || currentOrganization.value?.shortName
  || ''
);

const syncProfileDraft = () => {
  const user = currentUser.value;
  const organization = currentOrganization.value;
  displayNameDraft.value = user?.displayName ?? '';
  avatarDraftDataUrl.value = user?.avatarDataUrl ?? '';
  firmShortNameDraft.value = user?.firmShortName ?? organization?.shortName ?? '';
  profileBioDraft.value = user?.bio ?? '';
};

const chooseAvatar = () => {
  if (!isEditingProfile.value) return;
  avatarInputRef.value?.click();
};

const handleAvatarUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showStatus('请上传图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      avatarDraftDataUrl.value = reader.result;
    }
  };
  reader.readAsDataURL(file);
};

const startProfileEdit = () => {
  syncProfileDraft();
  isEditingProfile.value = true;
};

const cancelProfileEdit = () => {
  syncProfileDraft();
  isEditingProfile.value = false;
};

const saveProfile = () => {
  const ok = updateUserProfile({
    displayName: displayNameDraft.value,
    avatarDataUrl: avatarDraftDataUrl.value,
    firmShortName: firmShortNameDraft.value,
    bio: profileBioDraft.value,
  });
  if (ok) {
    isEditingProfile.value = false;
  }
  showStatus(ok ? '个人资料已保存' : '请先登录账号');
};

const handleOrganizationSelect = (organizationId: string) => {
  if (organizationId === currentOrganizationId.value) return;
  if (selectOrganization(organizationId)) {
    showStatus('已切换组织');
  }
};

const openOrganizationManager = () => {
  void router.push({
    name: 'org-select',
    query: { switch: '1' },
  });
};

const handleLogout = () => {
  logout();
  void router.replace({ name: 'login' });
};

const handleThemeSelect = (themeId: ThemeId) => {
  setTheme(themeId);
  showStatus('主题已切换');
};

watch(
  [currentUser, currentOrganization],
  () => {
    if (!isEditingProfile.value) {
      syncProfileDraft();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (statusTimer) clearTimeout(statusTimer);
});

const accountRows = computed(() => {
  const rows = [
    {
      icon: UserRound,
      label: '昵称',
      value: currentUser.value?.displayName ?? '未设置',
      meta: '协作场景中的展示名称',
      compact: true,
    },
    {
      icon: Building2,
      label: '律所简称',
      value: savedFirmShortName.value || '未设置',
      meta: '用于作者身份、技能发布与对外展示',
      compact: true,
    },
    {
      icon: BadgeCheck,
      label: '用户ID',
      value: currentUser.value?.id ?? '未生成',
      meta: '账号唯一标识',
      compact: true,
    },
    {
      icon: Smartphone,
      label: '绑定手机号',
      value: currentUser.value?.phone ?? '未绑定',
      meta: '登录与安全验证手机号',
      compact: true,
      authOnly: true,
    },
    {
      icon: Building2,
      label: '当前组织',
      value: currentOrganization.value?.name ?? '未选择组织',
      meta: currentOrganization.value
        ? `${currentOrganization.value.role} · ${currentOrganization.value.planName}`
        : '当前公开演示入口使用默认组织',
    },
    {
      icon: ShieldCheck,
      label: '账号安全',
      value: '密码已启用',
      meta: '建议定期更新登录密码',
      actionLabel: '修改密码',
      authOnly: true,
    },
    {
      icon: UserRound,
      label: '个人简介',
      value: currentUser.value?.bio?.trim() || '未填写',
      meta: '用于说明专业方向与服务经验',
      wide: true,
      multiline: true,
    },
  ];

  return showAuthControls ? rows : rows.filter((row) => !row.authOnly);
});
</script>

<template>
  <div class="profile-page">
    <main class="profile-main">
      <section class="profile-card" aria-label="个人信息">
        <header class="profile-header">
          <button
            v-if="isEditingProfile"
            type="button"
            class="profile-avatar"
            aria-label="更换头像"
            title="更换头像"
            @click="chooseAvatar"
          >
            <img v-if="avatarDraftDataUrl" :src="avatarDraftDataUrl" alt="" />
            <span v-else class="profile-avatar-letter">{{ profileAvatarText }}</span>
            <span class="profile-avatar-edit" aria-hidden="true">
              <Pencil :size="13" />
            </span>
          </button>
          <span v-else class="profile-avatar">
            <img v-if="avatarDraftDataUrl" :src="avatarDraftDataUrl" alt="" />
            <span v-else class="profile-avatar-letter">{{ profileAvatarText }}</span>
          </span>
          <input
            ref="avatarInputRef"
            class="profile-avatar-input"
            type="file"
            accept="image/*"
            @change="handleAvatarUpload"
          />
          <span class="profile-title-copy">
            <h1>个人信息</h1>
            <p>{{ currentUser?.displayName ?? '未登录账号' }}</p>
          </span>
          <span class="profile-header-actions">
            <span v-if="statusMessage" class="profile-status">{{ statusMessage }}</span>
            <button
              v-if="!isEditingProfile"
              type="button"
              class="profile-edit-toggle"
              @click="startProfileEdit"
            >
              <Pencil :size="15" />
              <span>编辑资料</span>
            </button>
          </span>
        </header>

        <section v-if="isEditingProfile" class="profile-edit-panel" aria-label="编辑个人展示资料">
          <div class="profile-fields-grid">
            <label class="profile-name-field">
              <span>显示姓名</span>
              <input v-model="displayNameDraft" type="text" maxlength="24" />
            </label>

            <label class="profile-name-field">
              <span>律所简称</span>
              <input v-model="firmShortNameDraft" type="text" maxlength="18" placeholder="如：涌见律所" />
            </label>

            <label class="profile-name-field profile-bio-field">
              <span>个人简介</span>
              <textarea
                v-model="profileBioDraft"
                maxlength="160"
                rows="4"
                placeholder="填写专业方向、执业经验或常办业务"
              ></textarea>
            </label>
          </div>

          <div class="profile-edit-actions">
            <button type="button" class="profile-cancel-btn" @click="cancelProfileEdit">
              <X :size="15" />
              <span>取消</span>
            </button>
            <button type="button" class="profile-save-btn" @click="saveProfile">
              <Check :size="15" />
              <span>保存资料</span>
            </button>
          </div>
        </section>

        <section class="info-grid">
          <article
            v-for="row in accountRows"
            :key="row.label"
            class="info-item"
            :class="{ wide: row.wide, multiline: row.multiline, compact: row.compact }"
          >
            <span class="info-icon">
              <component :is="row.icon" :size="18" />
            </span>
            <span class="info-copy">
              <span class="info-label">{{ row.label }}</span>
              <strong class="info-value">{{ row.value }}</strong>
              <span class="info-meta">{{ row.meta }}</span>
            </span>
            <button v-if="row.actionLabel" class="inline-action" type="button">
              <KeyRound :size="15" />
              <span>{{ row.actionLabel }}</span>
            </button>
          </article>
        </section>

        <section class="settings-section" aria-label="个人中心设置">
          <header class="settings-header">
            <span>设置</span>
            <p>{{ showOrganizationAccessControls ? '组织切换与界面偏好' : '界面偏好' }}</p>
          </header>

          <section class="settings-block" aria-label="组织设置">
            <div class="settings-block-title">
              <Building2 :size="18" />
              <strong>我的组织</strong>
            </div>

            <div v-if="organizations.length" class="organization-list">
              <button
                v-for="organization in organizations"
                :key="organization.id"
                class="organization-row"
                :class="{ active: organization.id === currentOrganizationId }"
                type="button"
                @click="handleOrganizationSelect(organization.id)"
              >
                <span class="organization-avatar">{{ organization.avatarText }}</span>
                <span class="organization-copy">
                  <span class="organization-name">{{ organization.name }}</span>
                  <span class="organization-meta">{{ organization.role }} · {{ organization.memberCount }} 人 · {{ organization.planName }}</span>
                </span>
                <Check v-if="organization.id === currentOrganizationId" :size="16" class="organization-check" />
              </button>
            </div>
            <p v-else class="settings-empty">暂无可切换组织</p>

            <div v-if="showOrganizationAccessControls || showAuthControls" class="settings-actions">
              <button
                v-if="showOrganizationAccessControls"
                type="button"
                class="settings-action-btn"
                @click="openOrganizationManager"
              >
                <Building2 :size="15" />
                <span>管理我的组织</span>
              </button>
              <button v-if="showAuthControls" type="button" class="settings-action-btn danger" @click="handleLogout">
                <LogOut :size="15" />
                <span>退出登录</span>
              </button>
            </div>
          </section>

          <section class="settings-block" aria-label="主题设置">
            <div class="settings-block-title">
              <Palette :size="18" />
              <strong>主题切换</strong>
            </div>

            <div class="theme-option-list">
              <button
                v-for="theme in themeOptions"
                :key="theme.id"
                class="theme-option"
                :class="{ active: currentThemeId === theme.id }"
                type="button"
                @click="handleThemeSelect(theme.id)"
              >
                <span
                  class="theme-swatch"
                  :style="{
                    '--swatch-accent': theme.theme.accent,
                    '--swatch-ink': theme.theme.ink,
                    '--swatch-surface': theme.theme.surface,
                  }"
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                <span class="theme-copy">
                  <span class="theme-name">{{ theme.name }}</span>
                  <span class="theme-desc">{{ theme.description }}</span>
                </span>
                <Check v-if="currentThemeId === theme.id" :size="16" class="organization-check" />
              </button>
            </div>
          </section>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100%;
  background: var(--bg-color);
  color: var(--text-main);
}

.profile-main {
  width: min(840px, calc(100% - 56px));
  margin: 0 auto;
  padding: 42px 0;
}

.profile-card {
  padding: 28px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-soft);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--border-soft);
}

.profile-avatar {
  position: relative;
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 8px;
  border: 0;
  background: var(--primary-color);
  color: var(--on-primary);
  cursor: default;
  font-size: 20px;
  font-weight: 750;
  overflow: hidden;
}

button.profile-avatar {
  cursor: pointer;
}

.profile-avatar:hover .profile-avatar-edit,
.profile-avatar:focus-visible .profile-avatar-edit {
  opacity: 1;
  transform: translateY(0);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar-letter {
  line-height: 1;
}

.profile-avatar-edit {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--on-primary) 58%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--text-strong) 62%, transparent);
  color: #ffffff;
  opacity: 0.92;
  transform: translateY(0);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.profile-title-copy {
  min-width: 0;
  flex: 1;
}

.profile-title-copy h1 {
  margin: 0 0 5px;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 650;
}

.profile-title-copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.profile-status {
  flex: 0 0 auto;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 700;
}

.profile-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.profile-edit-toggle,
.profile-cancel-btn,
.profile-save-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}

.profile-edit-toggle,
.profile-cancel-btn {
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--card-bg);
}

.profile-edit-toggle:hover,
.profile-cancel-btn:hover {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.profile-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 0 0;
}

.profile-avatar-input {
  display: none;
}

.profile-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.profile-fields-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.profile-name-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.profile-name-field span {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 650;
}

.profile-bio-field {
  grid-column: 1 / -1;
}

.profile-name-field input,
.profile-name-field textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  font-size: 14px;
}

.profile-name-field input {
  height: 34px;
  padding: 0 11px;
}

.profile-name-field textarea {
  min-height: 86px;
  resize: vertical;
  padding: 10px 11px;
  line-height: 1.5;
}

.profile-name-field input:focus,
.profile-name-field textarea:focus {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.profile-save-btn {
  border: 0;
  color: var(--on-primary);
  background: var(--primary-color);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 18px 0 0;
}

.info-item {
  min-width: 0;
  min-height: 62px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-muted) 72%, var(--card-bg));
}

.info-item.wide {
  grid-column: 1 / -1;
  min-height: 66px;
}

.info-item.compact {
  min-height: 58px;
}

.info-icon {
  grid-column: 1;
  grid-row: 1;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary-color);
}

.info-copy {
  grid-column: 2;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.info-label {
  min-width: 0;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.info-value {
  min-height: 0;
  display: block;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-item.multiline .info-value {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.45;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.info-meta {
  min-height: 0;
  display: block;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.info-item.compact .info-meta {
  display: none;
}

.inline-action {
  grid-column: 3;
  grid-row: 1;
  width: fit-content;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 0;
  padding: 0 8px;
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
}

.inline-action:hover {
  background: var(--primary-soft);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid var(--border-soft);
}

.settings-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.settings-header span {
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 750;
}

.settings-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.settings-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-block-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-strong);
}

.settings-block-title svg {
  color: var(--primary-color);
}

.settings-block-title strong {
  font-size: 15px;
  font-weight: 720;
}

.organization-list,
.theme-option-list {
  display: grid;
  gap: 10px;
}

.organization-row,
.theme-option {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text-main);
  text-align: left;
}

.organization-row:hover,
.organization-row.active,
.theme-option:hover,
.theme-option.active {
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.organization-avatar {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-weight: 750;
}

.organization-copy,
.theme-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.organization-name,
.organization-meta,
.theme-name,
.theme-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-name,
.theme-name {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 680;
}

.organization-meta,
.theme-desc {
  color: var(--text-muted);
  font-size: 12px;
}

.organization-check {
  color: var(--primary-color);
}

.settings-empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.settings-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.settings-action-btn {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.settings-action-btn:hover {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.settings-action-btn.danger {
  color: var(--diff-removed);
}

.theme-swatch {
  width: 54px;
  height: 36px;
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--swatch-surface);
}

.theme-swatch span:first-child {
  grid-row: 1 / 4;
  border-radius: 5px;
  background: color-mix(in srgb, var(--swatch-accent) 24%, var(--swatch-surface));
}

.theme-swatch span:nth-child(2),
.theme-swatch span:nth-child(3) {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--swatch-ink) 34%, var(--swatch-surface));
}

.theme-swatch span:nth-child(3) {
  width: 68%;
}

@media (max-width: 760px) {
  .profile-main {
    width: calc(100% - 28px);
    padding: 24px 0;
  }

  .profile-card {
    padding: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .profile-edit-panel {
    grid-template-columns: 1fr;
  }

  .profile-header {
    align-items: flex-start;
  }

  .profile-header-actions {
    align-items: flex-end;
    flex-direction: column;
  }

  .profile-fields-grid {
    grid-template-columns: 1fr;
  }

  .profile-edit-actions {
    flex-direction: column-reverse;
  }

  .profile-edit-toggle,
  .profile-cancel-btn,
  .profile-save-btn {
    width: 100%;
  }

  .settings-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .organization-row,
  .theme-option {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .organization-check {
    display: none;
  }
}
</style>
