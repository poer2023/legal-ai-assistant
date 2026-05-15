<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  BadgeCheck,
  Building2,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Upload,
  UserRound,
  X,
} from 'lucide-vue-next';
import { useOrgSession } from '../stores/orgSession';

const { currentOrganization, currentUser, updateUserProfile } = useOrgSession();

const displayNameDraft = ref('');
const avatarDraftDataUrl = ref('');
const avatarInputRef = ref<HTMLInputElement | null>(null);
const statusMessage = ref('');
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

const chooseAvatar = () => {
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

const removeAvatar = () => {
  avatarDraftDataUrl.value = '';
};

const saveProfile = () => {
  const ok = updateUserProfile({
    displayName: displayNameDraft.value,
    avatarDataUrl: avatarDraftDataUrl.value,
  });
  showStatus(ok ? '个人资料已保存' : '请先登录账号');
};

watch(
  currentUser,
  (user) => {
    displayNameDraft.value = user?.displayName ?? '';
    avatarDraftDataUrl.value = user?.avatarDataUrl ?? '';
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (statusTimer) clearTimeout(statusTimer);
});

const accountRows = computed(() => [
  {
    icon: UserRound,
    label: '昵称',
    value: currentUser.value?.displayName ?? '未设置',
    meta: '协作场景中的展示名称',
  },
  {
    icon: BadgeCheck,
    label: '用户ID',
    value: currentUser.value?.id ?? '未生成',
    meta: '账号唯一标识',
  },
  {
    icon: Smartphone,
    label: '绑定手机号',
    value: currentUser.value?.phone ?? '未绑定',
    meta: '登录与安全验证手机号',
  },
  {
    icon: Building2,
    label: '当前组织',
    value: currentOrganization.value?.name ?? '未选择组织',
    meta: currentOrganization.value
      ? `${currentOrganization.value.role} · ${currentOrganization.value.planName}`
      : '可在个人中心弹窗中管理',
  },
  {
    icon: ShieldCheck,
    label: '账号安全',
    value: '密码已启用',
    meta: '建议定期更新登录密码',
    actionLabel: '修改密码',
  },
]);
</script>

<template>
  <div class="profile-page">
    <main class="profile-main">
      <section class="profile-card" aria-label="个人信息">
        <header class="profile-header">
          <span class="profile-avatar">
            <img v-if="avatarDraftDataUrl" :src="avatarDraftDataUrl" alt="" />
            <span v-else>{{ profileAvatarText }}</span>
          </span>
          <span class="profile-title-copy">
            <h1>个人信息</h1>
            <p>{{ currentUser?.displayName ?? '未登录账号' }}</p>
          </span>
          <span v-if="statusMessage" class="profile-status">{{ statusMessage }}</span>
        </header>

        <section class="profile-edit-panel" aria-label="编辑个人展示资料">
          <div class="profile-avatar-actions">
            <button type="button" class="profile-action-btn" @click="chooseAvatar">
              <Upload :size="15" />
              <span>上传头像</span>
            </button>
            <button
              v-if="avatarDraftDataUrl"
              type="button"
              class="profile-action-btn muted"
              @click="removeAvatar"
            >
              <X :size="15" />
              <span>移除头像</span>
            </button>
            <input
              ref="avatarInputRef"
              class="profile-avatar-input"
              type="file"
              accept="image/*"
              @change="handleAvatarUpload"
            />
          </div>

          <label class="profile-name-field">
            <span>显示姓名</span>
            <input v-model="displayNameDraft" type="text" maxlength="24" />
          </label>

          <button type="button" class="profile-save-btn" @click="saveProfile">保存资料</button>
        </section>

        <section class="info-grid">
          <article v-for="row in accountRows" :key="row.label" class="info-item">
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
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 20px;
  font-weight: 750;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.profile-edit-panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: end;
  gap: 14px;
  padding: 22px 0 0;
}

.profile-avatar-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-avatar-input {
  display: none;
}

.profile-action-btn,
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

.profile-action-btn {
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--card-bg);
}

.profile-action-btn:hover {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.profile-action-btn.muted {
  color: var(--text-muted);
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

.profile-name-field input {
  width: 100%;
  height: 34px;
  padding: 0 11px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  font-size: 14px;
}

.profile-name-field input:focus {
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
  gap: 14px;
  padding-top: 22px;
}

.info-item {
  min-width: 0;
  min-height: 112px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--surface-muted);
}

.info-item:last-child {
  grid-column: 1 / -1;
  min-height: 96px;
}

.info-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary-color);
}

.info-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-label {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.info-value {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-meta {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.inline-action {
  grid-column: 2;
  width: fit-content;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 0 10px;
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
}

.inline-action:hover {
  background: var(--primary-soft);
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
}
</style>
