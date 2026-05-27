<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Bell,
  Bot,
  Camera,
  Check,
  Languages,
  LogOut,
  Palette,
  Plug,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wifi,
} from 'lucide-vue-next';
import { themeOptions, type ThemeId } from '../data/themes';
import { useOrgSession } from '../stores/orgSession';
import { useTheme } from '../stores/theme';

type ProfileTab = 'profile' | 'language' | 'theme' | 'mcp' | 'remote' | 'memory' | 'update' | 'team';

const router = useRouter();
const {
  currentOrganization,
  currentUser,
  logout,
  updateUserProfile,
} = useOrgSession();
const { currentThemeId, setTheme } = useTheme();

const activeTab = ref<ProfileTab>('profile');
const displayName = ref(currentUser.value?.displayName || '律师 · sinder');
const firmName = ref(currentUser.value?.firmShortName || currentOrganization.value?.shortName || 'XX律师事务所');
const years = ref(currentUser.value?.yearsInPractice || '12');
const qualification = ref(currentUser.value?.qualification || '合伙人');
const bio = ref(currentUser.value?.bio || '跨境投融资、并购重组、私募基金方向律师。');
const avatarDataUrl = ref(currentUser.value?.avatarDataUrl || '');
const language = ref<'zh' | 'en'>('zh');
const statusText = ref('');
const avatarInputRef = ref<HTMLInputElement | null>(null);

const tabs = [
  { id: 'profile' as const, label: '个人资料', sub: '头像、姓名与执业信息', icon: UserRound },
  { id: 'language' as const, label: '界面语言', sub: '选择界面显示的语言', icon: Languages },
  { id: 'theme' as const, label: '主题风格', sub: '外观与字体大小', icon: Palette },
  { id: 'mcp' as const, label: 'MCP 连接器', sub: '外部工具与浏览器集成', icon: Plug },
  { id: 'remote' as const, label: '远程控制', sub: '通过微信、飞书等渠道使用', icon: Wifi },
  { id: 'memory' as const, label: '记忆系统', sub: '长期记忆与工作区经验', icon: Bot },
  { id: 'update' as const, label: '检查更新', sub: '当前版本与新版本下载', icon: RefreshCw, badge: 'v2.4.0' },
  { id: 'team' as const, label: '团队管理', sub: '成员、积分与品牌配置', icon: ShieldCheck },
];

const profileEmail = computed(() => currentUser.value?.email || 'admin@yongjian.ai');
const avatarText = computed(() => displayName.value.trim().slice(0, 1).toUpperCase() || '律');
const activeTabMeta = computed(() => tabs.find((tab) => tab.id === activeTab.value) ?? tabs[0]!);

const showStatus = (message: string) => {
  statusText.value = message;
  window.setTimeout(() => {
    if (statusText.value === message) statusText.value = '';
  }, 1800);
};

const saveProfile = () => {
  const ok = updateUserProfile({
    displayName: displayName.value,
    firmShortName: firmName.value,
    yearsInPractice: years.value,
    qualification: qualification.value,
    bio: bio.value,
    avatarDataUrl: avatarDataUrl.value,
    expertise: ['跨境投融资', '并购重组', '私募基金'],
  });
  showStatus(ok ? '个人资料已保存' : '请先登录账号');
};

const chooseAvatar = () => {
  avatarInputRef.value?.click();
};

const handleAvatarUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') avatarDataUrl.value = reader.result;
  };
  reader.readAsDataURL(file);
};

const selectTheme = (themeId: ThemeId) => {
  setTheme(themeId);
  showStatus('主题已切换');
};

const openTeam = () => {
  void router.push({ name: 'team' });
};

const signOut = () => {
  logout();
  void router.replace({ name: 'login' });
};
</script>

<template>
  <section class="profile-settings-page">
    <aside class="settings-spine" aria-label="设置分类">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="settings-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="18" />
        <span>
          <strong>{{ tab.label }}</strong>
          <small>{{ tab.sub }}</small>
        </span>
        <em v-if="tab.badge">{{ tab.badge }}</em>
      </button>

      <div class="spine-actions">
        <button type="button" @click="signOut">
          <LogOut :size="16" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>

    <main class="settings-main">
      <header class="settings-main-header">
        <div>
          <h1>{{ activeTabMeta.label }}</h1>
          <p>{{ activeTabMeta.sub }}</p>
        </div>
        <span v-if="statusText" class="status-pill">{{ statusText }}</span>
      </header>

      <section v-if="activeTab === 'profile'" class="profile-panel">
        <div class="profile-form">
          <button class="avatar-editor" type="button" @click="chooseAvatar">
            <img v-if="avatarDataUrl" :src="avatarDataUrl" alt="" />
            <span v-else>{{ avatarText }}</span>
            <em><Camera :size="14" /> 上传头像</em>
          </button>
          <input ref="avatarInputRef" type="file" accept="image/*" hidden @change="handleAvatarUpload" />

          <label>
            <span>姓名</span>
            <input v-model="displayName" />
          </label>
          <label>
            <span>邮箱</span>
            <input :value="profileEmail" disabled />
          </label>
          <label>
            <span>机构名称</span>
            <input v-model="firmName" />
          </label>
          <div class="form-row">
            <label>
              <span>执业年限</span>
              <input v-model="years" />
            </label>
            <label>
              <span>资质 / 头衔</span>
              <input v-model="qualification" />
            </label>
          </div>
          <label>
            <span>个人简介</span>
            <textarea v-model="bio" rows="4" />
          </label>
          <button type="button" class="primary-action" @click="saveProfile">
            <Check :size="15" />
            <span>保存</span>
          </button>
        </div>

        <aside class="profile-preview">
          <span class="preview-avatar">{{ avatarText }}</span>
          <h2>{{ displayName }}</h2>
          <p>{{ firmName }} · {{ qualification }} · {{ years }} 年执业</p>
          <div class="preview-tags">
            <span>跨境投融资</span>
            <span>并购重组</span>
            <span>私募基金</span>
          </div>
        </aside>
      </section>

      <section v-else-if="activeTab === 'language'" class="settings-card">
        <button type="button" :class="{ selected: language === 'zh' }" @click="language = 'zh'">中文</button>
        <button type="button" :class="{ selected: language === 'en' }" @click="language = 'en'">English</button>
      </section>

      <section v-else-if="activeTab === 'theme'" class="theme-grid">
        <button
          v-for="theme in themeOptions"
          :key="theme.id"
          type="button"
          class="theme-card"
          :class="{ selected: currentThemeId === theme.id }"
          @click="selectTheme(theme.id)"
        >
          <span :style="{ background: theme.theme.surface, borderColor: 'var(--border-color)' }">
            <i :style="{ background: theme.theme.accent }"></i>
          </span>
          <strong>{{ theme.name }}</strong>
        </button>
      </section>

      <section v-else-if="activeTab === 'team'" class="settings-card">
        <h2>团队管理控制台</h2>
        <p>进入团队后台配置品牌、成员、积分、账单与客户端首页预览。</p>
        <button type="button" class="primary-action" @click="openTeam">打开团队管理</button>
      </section>

      <section v-else class="settings-card">
        <h2>{{ activeTabMeta.label }}</h2>
        <p>该设置入口已按原型补齐位置，后续接入真实配置项。</p>
        <button type="button" class="secondary-action">
          <Bell :size="15" />
          <span>保持默认</span>
        </button>
      </section>
    </main>
  </section>
</template>

<style scoped>
.profile-settings-page {
  min-height: 100%;
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  background: var(--bg-color);
  color: var(--text-main);
}

.settings-spine {
  min-height: 100%;
  padding: 28px 16px;
  border-right: 1px solid var(--border-color);
  background: var(--surface-muted);
}

.settings-tab {
  width: 100%;
  min-height: 58px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--text-main);
  text-align: left;
}

.settings-tab:hover,
.settings-tab.active {
  background: var(--card-bg);
  color: var(--text-strong);
}

.settings-tab span {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.settings-tab strong,
.settings-tab small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-tab strong {
  font-size: 14px;
}

.settings-tab small {
  color: var(--text-muted);
  font-size: 12px;
}

.settings-tab em {
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--text-strong);
  color: var(--card-bg);
  font-size: 10px;
  font-style: normal;
}

.spine-actions {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid var(--border-color);
}

.spine-actions button {
  width: 100%;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--text-main);
}

.spine-actions button:hover {
  background: var(--card-bg);
}

.settings-main {
  min-width: 0;
  padding: 42px 56px 56px;
}

.settings-main-header {
  min-height: 48px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.settings-main-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 30px;
  font-weight: 760;
}

.settings-main-header p,
.settings-card p,
.profile-preview p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.status-pill {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 12px;
}

.profile-panel {
  display: grid;
  grid-template-columns: minmax(0, 520px) 300px;
  gap: 28px;
}

.profile-form,
.profile-preview,
.settings-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.profile-form {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.avatar-editor {
  width: 92px;
  height: 92px;
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  background: var(--text-strong);
  color: var(--card-bg);
  font-size: 28px;
  font-weight: 760;
}

.avatar-editor img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-editor em {
  position: absolute;
  inset: auto 0 0;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  font-size: 11px;
  font-style: normal;
}

.profile-form label {
  display: grid;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.profile-form input,
.profile-form textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text-main);
  font: inherit;
}

.profile-form input {
  height: 38px;
  padding: 0 11px;
}

.profile-form textarea {
  resize: vertical;
  padding: 10px 11px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.primary-action,
.secondary-action,
.settings-card button,
.theme-card {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 750;
}

.primary-action {
  width: fit-content;
  background: var(--text-strong);
  color: var(--card-bg);
}

.secondary-action {
  width: fit-content;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  background: var(--card-bg);
}

.profile-preview,
.settings-card {
  padding: 22px;
}

.preview-avatar {
  width: 58px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--text-strong);
  color: var(--card-bg);
  font-size: 22px;
  font-weight: 760;
}

.profile-preview h2,
.settings-card h2 {
  margin: 16px 0 0;
  color: var(--text-strong);
  font-size: 18px;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 18px;
}

.preview-tags span {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 12px;
}

.settings-card {
  max-width: 640px;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 12px;
}

.settings-card button.selected {
  background: var(--text-strong);
  color: var(--card-bg);
}

.theme-grid {
  max-width: 720px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.theme-card {
  min-height: 92px;
  align-items: flex-start;
  flex-direction: column;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.theme-card.selected {
  border-color: var(--text-strong);
}

.theme-card > span {
  width: 100%;
  height: 36px;
  display: block;
  position: relative;
  border: 1px solid;
  border-radius: 6px;
}

.theme-card i {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 46px;
  height: 16px;
  border-radius: 999px;
}

@media (max-width: 980px) {
  .profile-settings-page,
  .profile-panel {
    grid-template-columns: 1fr;
  }

  .settings-spine {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .settings-main {
    padding: 28px 18px 40px;
  }
}
</style>
