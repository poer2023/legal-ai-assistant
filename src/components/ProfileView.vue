<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Building2,
  Camera,
  Check,
  LogOut,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-vue-next';
import { useOrgSession } from '../stores/orgSession';
import { useTheme } from '../stores/theme';
import { themeOptions, type ThemeId } from '../data/themes';

type Language = 'zh' | 'en';
type ThemeSwatch = {
  id: ThemeId;
  labelZh: string;
  labelEn: string;
  surface: string;
  accent: string;
  ink: string;
};

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
const { currentThemeId, setTheme } = useTheme();

const language = ref<Language>('zh');
const displayNameDraft = ref('');
const avatarDraftDataUrl = ref('');
const firmDraft = ref('');
const profileBioDraft = ref('');
const yearsDraft = ref('12');
const qualificationDraft = ref('合伙人');
const expertiseDraft = ref<string[]>(['跨境投融资', '并购重组', '私募基金']);
const isEditingProfile = ref(false);
const avatarInputRef = ref<HTMLInputElement | null>(null);
const statusMessage = ref('');
const showOrganizationAccessControls = true;
const isOrganizationDialogOpen = ref(false);
const isLogoutConfirmOpen = ref(false);
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const zhExpertiseOptions = [
  '跨境投融资',
  '并购重组',
  '资本市场 / IPO',
  '私募基金',
  '合规与监管',
  '数据合规',
  '劳动用工',
  '知识产权',
  '商事争议',
  '刑事合规',
  '公司治理',
  '税务',
  '破产重整',
  '房地产与建工',
];

const enExpertiseOptions = [
  'Cross-border M&A',
  'Restructuring',
  'Capital markets / IPO',
  'PE / Funds',
  'Compliance',
  'Data privacy',
  'Labour',
  'IP',
  'Commercial dispute',
  'Criminal compliance',
  'Corporate governance',
  'Tax',
  'Bankruptcy',
  'Real estate',
];

const themeSwatchLabels: Record<ThemeId, { labelZh: string; labelEn: string }> = {
  classic: { labelZh: '原版', labelEn: 'Classic' },
  'codex-theme-v1': { labelZh: '纯白', labelEn: 'Snow' },
  'absolutely-theme-v1': { labelZh: '象牙', labelEn: 'Ivory' },
  'happycapy-paper-v1': { labelZh: '纸页', labelEn: 'Paper+' },
  'lawagents-standalone-v1': { labelZh: '暖白', labelEn: 'Paper' },
};

const themeSwatches: ThemeSwatch[] = themeOptions.map((theme) => ({
  id: theme.id,
  labelZh: themeSwatchLabels[theme.id].labelZh,
  labelEn: themeSwatchLabels[theme.id].labelEn,
  surface: theme.theme.surface,
  accent: theme.theme.accent,
  ink: theme.theme.ink,
}));

const copy = computed(() => {
  if (language.value === 'zh') {
    return {
      title: '个人中心',
      edit: '编辑资料',
      save: '保存',
      uploadAvatar: '上传头像',
      replaceAvatar: '更换头像',
      firm: '所在律所',
      phone: '手机号',
      years: '执业年限',
      qualification: '资质 / 头衔',
      bio: '个人简介',
      bioHint: '填写你的专业背景、代表项目与业务能力',
      expertise: '执业领域',
      expertiseHint: '至多选择 5 个，用于展示你的专业方向',
      identityCard: '身份信息',
      beta: '内测',
      statsSkills: '已发布技能',
      statsTemplates: '已发布模板',
      statsUses: '累计调用',
      statsRating: '平均评分',
      profileBioFallback: '填写专业方向、代表项目与跨境业务能力等信息',
      preferences: '界面偏好',
      orgSub: '组织切换与界面偏好',
      language: '界面语言',
      languageHint: '中文 / English 跨境团队推荐',
      theme: '主题',
      themeHint: '当前为暖白 · 默认',
      security: '账号安全',
      securitySub: '账号与组织相关设置',
      signinMethod: '登录方式',
      signinHint: '手机号密码登录 · 首次密码为手机号后六位',
      active: '已启用',
      organization: '当前组织',
      switchOrganization: '切换组织',
      switchOrganizationTitle: '切换组织',
      switchOrganizationSub: '选择当前工作空间，切换后会更新会话上下文。',
      noOrganizations: '暂无可切换组织',
      current: '当前',
      teamManagement: '团队管理',
      teamManagementOpened: '已打开团队管理认证窗口',
      popupBlocked: '新窗口被浏览器拦截',
      signOut: '退出登录',
      signOutHint: '结束当前会话',
      confirmLogout: '退出登录',
      logoutTitle: '确认退出登录？',
      logoutDescription: '退出后需要重新登录才能继续使用当前账号。',
      cancel: '取消',
      saved: '个人资料已保存',
      uploadError: '请上传图片文件',
      notSignedIn: '请先登录账号',
      organizationChanged: '已切换组织',
      themeChanged: '主题已切换',
    };
  }

  return {
    title: 'Account',
    edit: 'Edit',
    save: 'Save',
    uploadAvatar: 'Upload photo',
    replaceAvatar: 'Replace photo',
    firm: 'Law firm',
    phone: 'Mobile',
    years: 'Years in practice',
    qualification: 'Qualifications',
    bio: 'Bio',
    bioHint: 'Describe your practice background, representative work, and capabilities.',
    expertise: 'Practice areas',
    expertiseHint: 'Pick up to 5 areas for your professional profile.',
    identityCard: 'Identity',
    beta: 'Beta',
    statsSkills: 'Skills published',
    statsTemplates: 'Templates published',
    statsUses: 'Total invocations',
    statsRating: 'Avg. rating',
    profileBioFallback: 'Describe your practice, signature matters, and cross-border capability.',
    preferences: 'Preferences',
    orgSub: 'Switch organisation & interface preferences',
    language: 'Language',
    languageHint: 'Recommended for cross-border teams',
    theme: 'Theme',
    themeHint: 'Current: warm paper · default',
    security: 'Security',
    securitySub: 'Account & organisation settings',
    signinMethod: 'Sign-in method',
    signinHint: 'Phone password · first password is the last six digits',
    active: 'Active',
    organization: 'Current organisation',
    switchOrganization: 'Switch organisation',
    switchOrganizationTitle: 'Switch organisation',
    switchOrganizationSub: 'Choose the workspace used for this session.',
    noOrganizations: 'No organisations available',
    current: 'Current',
    teamManagement: 'Team management',
    teamManagementOpened: 'Team management auth opened',
    popupBlocked: 'Popup blocked',
    signOut: 'Sign out',
    signOutHint: 'End current session',
    confirmLogout: 'Sign out',
    logoutTitle: 'Sign out?',
    logoutDescription: 'You will need to sign in again to continue using this account.',
    cancel: 'Cancel',
    saved: 'Profile saved',
    uploadError: 'Upload an image file',
    notSignedIn: 'Sign in first',
    organizationChanged: 'Organisation switched',
    themeChanged: 'Theme changed',
  };
});

const isChinese = computed(() => language.value === 'zh');
const expertiseOptions = computed(() => (isChinese.value ? zhExpertiseOptions : enExpertiseOptions));
const profilePhone = computed(() => currentUser.value?.phone?.trim() || '11111111111');
const profileUserId = computed(() => {
  const rawUserId = currentUser.value?.id?.trim();
  if (!rawUserId || rawUserId === 'public-demo-user') return `user-${profilePhone.value}`;
  return rawUserId;
});
const savedProfileName = computed(() => {
  const rawName = currentUser.value?.displayName?.trim();
  if (rawName && rawName !== '演示用户') return rawName;
  return `${isChinese.value ? '律师' : 'Lawyer'} · ${profilePhone.value.slice(-4) || '1111'}`;
});
const savedFirmName = computed(() =>
  currentUser.value?.firmShortName?.trim()
  || currentOrganization.value?.shortName
  || '金杜律师事务所'
);
const savedYears = computed(() => currentUser.value?.yearsInPractice?.trim() || '12');
const savedQualification = computed(() => currentUser.value?.qualification?.trim() || (isChinese.value ? '合伙人' : 'Partner'));
const savedBio = computed(() => currentUser.value?.bio?.trim() || '');
const savedExpertise = computed(() =>
  currentUser.value?.expertise?.length
    ? currentUser.value.expertise
    : (isChinese.value ? ['跨境投融资', '并购重组', '私募基金'] : ['Cross-border M&A', 'Restructuring', 'PE / Funds'])
);
const profileName = computed(() => displayNameDraft.value.trim() || savedProfileName.value);
const firmName = computed(() => firmDraft.value.trim() || savedFirmName.value);
const qualification = computed(() => qualificationDraft.value.trim() || savedQualification.value);
const yearsInPractice = computed(() => yearsDraft.value.trim() || savedYears.value);
const bioText = computed(() => profileBioDraft.value.trim());
const avatarText = computed(() => profileName.value.slice(0, 1).toUpperCase() || '律');
const selectedExpertise = computed(() => expertiseDraft.value.slice(0, 5));
const canManageTeam = computed(() => currentOrganization.value?.role === '管理员');
const teamManagementHref = computed(() => router.resolve({ name: 'team' }).href);

const showStatus = (message: string) => {
  statusMessage.value = message;
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusMessage.value = '';
    statusTimer = null;
  }, 1800);
};

const syncProfileDraft = () => {
  displayNameDraft.value = savedProfileName.value;
  avatarDraftDataUrl.value = currentUser.value?.avatarDataUrl ?? '';
  firmDraft.value = savedFirmName.value;
  profileBioDraft.value = savedBio.value;
  yearsDraft.value = savedYears.value;
  qualificationDraft.value = savedQualification.value;
  expertiseDraft.value = [...savedExpertise.value].slice(0, 5);
};

const chooseAvatar = () => {
  if (!isEditingProfile.value) {
    isEditingProfile.value = true;
  }
  avatarInputRef.value?.click();
};

const handleAvatarUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showStatus(copy.value.uploadError);
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

const toggleEdit = () => {
  if (!isEditingProfile.value) {
    syncProfileDraft();
    isEditingProfile.value = true;
    return;
  }

  const ok = updateUserProfile({
    displayName: displayNameDraft.value,
    avatarDataUrl: avatarDraftDataUrl.value,
    firmShortName: firmDraft.value,
    bio: profileBioDraft.value,
    yearsInPractice: yearsDraft.value,
    qualification: qualificationDraft.value,
    expertise: expertiseDraft.value,
  });
  if (ok) {
    isEditingProfile.value = false;
  }
  showStatus(ok ? copy.value.saved : copy.value.notSignedIn);
};

const toggleExpertise = (tag: string) => {
  if (!isEditingProfile.value) return;
  if (expertiseDraft.value.includes(tag)) {
    expertiseDraft.value = expertiseDraft.value.filter((item) => item !== tag);
    return;
  }
  if (expertiseDraft.value.length >= 5) return;
  expertiseDraft.value = [...expertiseDraft.value, tag];
};

const handleOrganizationSelect = (organizationId: string) => {
  if (organizationId === currentOrganizationId.value) {
    isOrganizationDialogOpen.value = false;
    return;
  }
  if (selectOrganization(organizationId)) {
    isOrganizationDialogOpen.value = false;
    showStatus(copy.value.organizationChanged);
  }
};

const openOrganizationManager = () => {
  isOrganizationDialogOpen.value = true;
};

const handleLogout = () => {
  isLogoutConfirmOpen.value = false;
  logout();
  void router.replace({ name: 'login' });
};

const handleThemeSelect = (themeId: ThemeId) => {
  setTheme(themeId);
  showStatus(copy.value.themeChanged);
};

watch(
  [currentUser, currentOrganization, language],
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
</script>

<template>
  <div class="profile-page">
    <main class="profile-content">
      <div class="profile-inner">
        <div class="profile-heading-row">
          <h1 class="profile-title">{{ copy.title }}</h1>
          <div class="heading-actions">
            <span v-if="statusMessage" class="profile-status">{{ statusMessage }}</span>
            <a
              v-if="canManageTeam"
              class="btn btn-ghost btn-sm"
              :href="teamManagementHref"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Building2 :size="14" />
              <span>{{ copy.teamManagement }}</span>
            </a>
            <button class="btn btn-ghost btn-sm" type="button" @click="toggleEdit">
              <Check v-if="isEditingProfile" :size="14" />
              <UserRound v-else :size="14" />
              <span>{{ isEditingProfile ? copy.save : copy.edit }}</span>
            </button>
          </div>
        </div>

        <section class="card identity-card" aria-label="用户身份信息">
          <div class="identity-main">
            <button
              class="identity-avatar"
              :class="{ 'has-img': avatarDraftDataUrl }"
              type="button"
              :title="avatarDraftDataUrl ? copy.replaceAvatar : copy.uploadAvatar"
              @click="chooseAvatar"
            >
              <img v-if="avatarDraftDataUrl" :src="avatarDraftDataUrl" alt="" />
              <span v-if="avatarDraftDataUrl" class="avatar-overlay">
                <Camera :size="18" />
                <span>{{ copy.replaceAvatar }}</span>
              </span>
              <span v-else>{{ avatarText }}</span>
            </button>
            <input
              ref="avatarInputRef"
              class="profile-avatar-input"
              type="file"
              accept="image/*"
              @change="handleAvatarUpload"
            />

            <div class="identity-copy">
              <div class="identity-title-row">
                <input
                  v-if="isEditingProfile"
                  v-model="displayNameDraft"
                  class="profile-name-input"
                  type="text"
                  maxlength="24"
                />
                <h2 v-else>{{ profileName }}</h2>
                <label v-if="isEditingProfile" class="inline-field compact">
                  <span>{{ copy.years }}</span>
                  <input v-model="yearsDraft" class="tabular" type="text" />
                </label>
                <span v-else class="chip chip-outline">{{ yearsInPractice }}{{ isChinese ? '年执业' : ' yrs in practice' }}</span>
                <label v-if="isEditingProfile" class="inline-field compact">
                  <span>{{ copy.qualification }}</span>
                  <input
                    v-model="qualificationDraft"
                    type="text"
                    :placeholder="isChinese ? '例：合伙人 / Partner' : 'e.g. Partner'"
                  />
                </label>
                <span v-else-if="qualification" class="chip">{{ qualification }}</span>
              </div>

              <div class="identity-meta-row">
                <label v-if="isEditingProfile" class="inline-field firm-field">
                  <span><Building2 :size="13" />{{ copy.firm }}</span>
                  <input v-model="firmDraft" type="text" />
                </label>
                <span v-else><Building2 :size="13" />{{ firmName }}</span>
                <span><UserRound :size="13" />{{ copy.phone }} <span class="tabular">{{ profilePhone }}</span></span>
                <span><ShieldCheck :size="13" />{{ profileUserId }}</span>
              </div>

              <textarea
                v-if="isEditingProfile"
                v-model="profileBioDraft"
                class="identity-bio-input"
                rows="4"
                maxlength="200"
                :placeholder="copy.bioHint"
              ></textarea>
              <p v-else class="identity-bio" :class="{ empty: !bioText }">
                {{ bioText || copy.profileBioFallback }}
              </p>

              <div v-if="isEditingProfile" class="expertise-list inline-expertise">
                <button
                  v-for="tag in expertiseOptions"
                  :key="tag"
                  class="chip expertise-chip"
                  :class="{ selected: selectedExpertise.includes(tag) }"
                  type="button"
                  @click="toggleExpertise(tag)"
                >
                  <Check v-if="selectedExpertise.includes(tag)" :size="11" />
                  <span>{{ tag }}</span>
                </button>
              </div>
              <div v-else class="preview-tags">
                <span v-for="tag in selectedExpertise" :key="tag" class="chip chip-outline">{{ tag }}</span>
              </div>
            </div>
          </div>

          <div class="identity-stats">
            <div>
              <span>{{ copy.statsSkills }}</span>
              <strong>6</strong>
            </div>
            <div>
              <span>{{ copy.statsTemplates }}</span>
              <strong>3</strong>
            </div>
            <div>
              <span>{{ copy.statsUses }}</span>
              <strong>1,284</strong>
            </div>
            <div>
              <span>{{ copy.statsRating }}</span>
              <strong>4.8 <Star :size="14" /></strong>
            </div>
          </div>
        </section>

        <section class="settings-grid" aria-label="设置">
          <article class="card settings-card">
            <h2>{{ copy.preferences }}</h2>
            <p>{{ copy.orgSub }}</p>

            <div class="settings-row">
              <span>
                <strong>{{ copy.language }}</strong>
                <small>{{ copy.languageHint }}</small>
              </span>
              <span class="lang-toggle settings-lang">
                <button type="button" :data-active="language === 'zh'" @click="language = 'zh'">中文</button>
                <button type="button" :data-active="language === 'en'" @click="language = 'en'">English</button>
              </span>
            </div>

            <div class="settings-row">
              <span>
                <strong>{{ copy.theme }}</strong>
                <small>{{ copy.themeHint }}</small>
              </span>
              <span class="theme-picks">
                <button
                  v-for="theme in themeSwatches"
                  :key="theme.id"
                  type="button"
                  :title="isChinese ? theme.labelZh : theme.labelEn"
                  :class="{ active: currentThemeId === theme.id }"
                  :style="{
                    '--swatch-surface': theme.surface,
                    '--swatch-accent': theme.accent,
                    '--swatch-ink': theme.ink,
                  }"
                  @click="handleThemeSelect(theme.id)"
                >
                  <span class="theme-swatch-accent"></span>
                  <span class="theme-swatch-ink"></span>
                  <Check v-if="currentThemeId === theme.id" class="theme-swatch-check" :size="13" />
                </button>
              </span>
            </div>
          </article>

          <article class="card settings-card">
            <h2>{{ copy.security }}</h2>
            <p>{{ copy.securitySub }}</p>

            <div class="settings-row">
              <span>
                <strong><UserRound :size="14" />{{ copy.signinMethod }}</strong>
                <small>{{ copy.signinHint }}</small>
              </span>
              <span class="chip">{{ copy.active }}</span>
            </div>

            <div v-if="currentOrganization || showOrganizationAccessControls" class="settings-row">
              <span>
                <strong><Building2 :size="14" />{{ copy.organization }}</strong>
                <small>{{ currentOrganization?.name ?? '涌见律所演示组织' }} · {{ currentOrganization?.role ?? '管理员' }} · {{ currentOrganization?.planName ?? '专业版' }}</small>
              </span>
              <button
                v-if="showOrganizationAccessControls"
                class="btn btn-ghost btn-sm"
                type="button"
                @click="openOrganizationManager"
              >
                {{ copy.switchOrganization }}
              </button>
            </div>

            <div class="settings-row">
              <span>
                <strong><LogOut :size="14" />{{ copy.signOut }}</strong>
                <small>{{ copy.signOutHint }}</small>
              </span>
              <button
                class="btn btn-ghost btn-sm danger-button"
                type="button"
                @click="isLogoutConfirmOpen = true"
              >
                {{ copy.signOut }}
              </button>
            </div>

          </article>
        </section>
      </div>
    </main>

    <div v-if="isOrganizationDialogOpen" class="modal-backdrop" @click.self="isOrganizationDialogOpen = false">
      <section class="modal-panel org-dialog" role="dialog" aria-modal="true" :aria-label="copy.switchOrganizationTitle">
        <header class="modal-header">
          <span>
            <strong>{{ copy.switchOrganizationTitle }}</strong>
            <small>{{ copy.switchOrganizationSub }}</small>
          </span>
          <button class="modal-close" type="button" :aria-label="copy.cancel" @click="isOrganizationDialogOpen = false">×</button>
        </header>

        <div v-if="organizations.length" class="org-list">
          <button
            v-for="organization in organizations"
            :key="organization.id"
            class="org-option"
            :class="{ active: organization.id === currentOrganizationId }"
            type="button"
            @click="handleOrganizationSelect(organization.id)"
          >
            <span>
              <strong>{{ organization.name }}</strong>
              <small>{{ organization.role }} · {{ organization.planName }}</small>
            </span>
            <span v-if="organization.id === currentOrganizationId" class="chip">{{ copy.current }}</span>
          </button>
        </div>
        <p v-else class="empty-dialog-text">{{ copy.noOrganizations }}</p>
      </section>
    </div>

    <div v-if="isLogoutConfirmOpen" class="modal-backdrop" @click.self="isLogoutConfirmOpen = false">
      <section class="modal-panel confirm-dialog" role="dialog" aria-modal="true" :aria-label="copy.logoutTitle">
        <header class="modal-header">
          <span>
            <strong>{{ copy.logoutTitle }}</strong>
            <small>{{ copy.logoutDescription }}</small>
          </span>
        </header>

        <div class="confirm-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="isLogoutConfirmOpen = false">
            {{ copy.cancel }}
          </button>
          <button class="btn btn-sm danger-solid-button" type="button" @click="handleLogout">
            {{ copy.confirmLogout }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  --profile-bg: #faf7f1;
  --profile-panel: #ffffff;
  --profile-soft: #f3eee3;
  --profile-sunk: #efe9dc;
  --profile-ink: #1a1614;
  --profile-ink-800: #2b2522;
  --profile-ink-700: #4a423d;
  --profile-muted: #837a72;
  --profile-muted-light: #a29a91;
  --profile-line: #e8e1d4;
  --profile-line-strong: #d6cdbe;
  --profile-accent: #c8552e;
  --profile-accent-700: #a4441f;
  --profile-accent-tint: #fbf1e8;
  --profile-danger: #b23a3a;
  --profile-serif: var(--font-serif, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'SimSun', Georgia, serif);
  --profile-sans: var(--font-sans, 'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--profile-bg);
  color: var(--profile-ink);
  font-family: var(--profile-sans);
}

.lang-toggle {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: 1px solid var(--profile-line);
  border-radius: 999px;
  background: var(--profile-bg);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.lang-toggle button {
  min-width: 42px;
  height: 24px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--profile-muted);
  font-weight: 500;
  cursor: pointer;
}

.lang-toggle button[data-active='true'] {
  background: var(--profile-ink);
  color: #ffffff;
}

.profile-content {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 24px 56px 60px;
}

.profile-inner {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.profile-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.profile-title {
  margin: 0;
  color: var(--profile-ink);
  font-family: var(--profile-serif);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0;
}

.heading-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.profile-status {
  color: var(--profile-accent);
  font-size: 12px;
  font-weight: 600;
}

.btn {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 10px;
  border: 0;
  background: var(--profile-ink);
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.btn-ghost {
  border: 1px solid var(--profile-line-strong);
  background: transparent;
  color: var(--profile-ink);
}

.btn-ghost:hover {
  background: var(--profile-soft);
}

.btn-sm {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12.5px;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(26, 22, 20, 0.55);
  color: #ffffff;
  font-size: 12px;
  opacity: 0;
}

.profile-avatar-input {
  display: none;
}

.profile-name-input {
  width: min(260px, 100%);
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--profile-line);
  border-radius: 10px;
  background: var(--profile-panel);
  color: var(--profile-ink);
  font-family: var(--profile-serif);
  font-size: 22px;
  font-weight: 600;
}

.inline-field {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--profile-muted);
  font-size: 12px;
}

.inline-field > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.inline-field input,
.identity-bio-input {
  border: 1px solid var(--profile-line);
  border-radius: 10px;
  background: var(--profile-panel);
  color: var(--profile-ink);
  font: inherit;
}

.inline-field input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
}

.inline-field.compact {
  width: 150px;
}

.firm-field {
  width: min(260px, 100%);
}

.identity-bio-input {
  width: min(760px, 100%);
  min-height: 96px;
  margin: 14px 0 12px;
  padding: 10px 12px;
  resize: vertical;
  font-size: 13px;
  line-height: 1.6;
}

.identity-stats span,
.field-hint,
.settings-card > p {
  display: block;
  color: var(--profile-muted);
  font-size: 12px;
  line-height: 1.5;
}

.identity-stats strong {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
  color: var(--profile-ink);
  font-family: var(--profile-serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.identity-stats svg {
  color: var(--profile-accent);
}

.card {
  border: 1px solid var(--profile-line);
  border-radius: 14px;
  background: var(--profile-panel);
}

.identity-card {
  margin-bottom: 18px;
  padding: 26px;
}

.identity-main {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.identity-avatar {
  position: relative;
  width: 74px;
  height: 74px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 3px solid var(--profile-bg);
  border-radius: 999px;
  background: linear-gradient(150deg, var(--profile-ink-800), var(--profile-ink));
  box-shadow: 0 0 0 1px var(--profile-line-strong);
  color: #f6efe0;
  font-family: var(--profile-serif);
  font-size: 28px;
  font-weight: 600;
  cursor: pointer;
}

.identity-avatar:hover {
  box-shadow:
    0 0 0 1px var(--profile-accent),
    0 8px 22px rgba(26, 22, 20, 0.1);
}

.identity-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity-avatar.has-img:hover .avatar-overlay {
  opacity: 1;
}

.identity-copy {
  min-width: 0;
  flex: 1;
}

.identity-title-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.identity-title-row h2 {
  margin: 0;
  color: var(--profile-ink);
  font-family: var(--profile-serif);
  font-size: 23px;
  font-weight: 600;
  line-height: 1.3;
}

.identity-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
  color: var(--profile-muted);
  font-size: 13px;
}

.identity-meta-row span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.identity-bio {
  max-width: 760px;
  margin: 14px 0 12px;
  color: var(--profile-ink-700);
  font-size: 13px;
  line-height: 1.65;
}

.identity-bio.empty {
  color: var(--profile-muted);
}

.identity-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid var(--profile-line);
  border-radius: 10px;
  background: var(--profile-bg);
}

.identity-stats div {
  min-width: 0;
  padding: 13px 16px;
  border-left: 1px solid var(--profile-line);
}

.identity-stats div:first-child {
  border-left: 0;
}

.settings-card h2 {
  display: block;
  margin: 0 0 2px;
  color: var(--profile-ink);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-block > span {
  color: var(--profile-muted);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.field-block input,
.field-block textarea {
  width: 100%;
  border: 1px solid var(--profile-line);
  border-radius: 10px;
  background: var(--profile-panel);
  color: var(--profile-ink);
  font: inherit;
  font-size: 14px;
}

.field-block input {
  height: 42px;
  padding: 0 14px;
}

.field-block textarea {
  min-height: 134px;
  padding: 12px 14px;
  resize: vertical;
  line-height: 1.55;
}

.field-block input:hover,
.field-block textarea:hover {
  border-color: var(--profile-line-strong);
}

.field-block input:focus,
.field-block textarea:focus,
.profile-name-input:focus,
.inline-field input:focus,
.identity-bio-input:focus {
  outline: 0;
  border-color: var(--profile-ink);
  box-shadow: 0 0 0 3px rgba(26, 22, 20, 0.08);
}

.field-block input:disabled,
.field-block textarea:disabled {
  opacity: 1;
  cursor: default;
}

.field-hint {
  margin: -10px 0 0;
}

.expertise-list,
.preview-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--profile-soft);
  color: var(--profile-ink-700);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.chip-outline {
  border-color: var(--profile-line-strong);
  background: transparent;
}

.chip-accent {
  background: var(--profile-accent-tint);
  color: var(--profile-accent-700);
}

.expertise-chip {
  min-height: 28px;
  padding: 4px 12px;
  border: 0;
  cursor: pointer;
}

.expertise-chip.selected {
  background: var(--profile-ink);
  color: #ffffff;
}

.preview-tags {
  min-height: 24px;
  margin-bottom: 14px;
}

.inline-expertise {
  max-width: 760px;
  margin-bottom: 14px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.settings-card {
  padding: 24px;
}

.settings-card h2 {
  font-size: 15px;
}

.settings-card > p {
  margin: 0 0 16px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--profile-line);
}

.settings-row > span:first-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-row strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--profile-ink);
  font-size: 13px;
  font-weight: 500;
}

.settings-row small {
  color: var(--profile-muted);
  font-size: 12px;
  line-height: 1.5;
}

.settings-lang button {
  min-width: 54px;
}

.theme-picks {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.theme-picks button {
  position: relative;
  width: 44px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--profile-line);
  border-radius: 6px;
  background: var(--swatch-surface);
  color: var(--profile-muted);
  cursor: pointer;
}

.theme-picks button.active {
  border-color: var(--profile-ink);
  box-shadow: 0 0 0 3px rgba(26, 22, 20, 0.08);
}

.theme-swatch-accent,
.theme-swatch-ink {
  position: absolute;
  pointer-events: none;
}

.theme-swatch-accent {
  right: 5px;
  bottom: 5px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--swatch-accent);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.72);
}

.theme-swatch-ink {
  left: 6px;
  top: 7px;
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: var(--swatch-ink);
  box-shadow: 0 6px 0 color-mix(in srgb, var(--swatch-ink), transparent 55%);
}

.theme-swatch-check {
  position: relative;
  z-index: 1;
  color: var(--swatch-ink);
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.8));
  pointer-events: none;
}

.danger,
.danger-button {
  color: var(--profile-danger) !important;
}

.danger-button {
  border-color: rgba(178, 58, 58, 0.3);
}

.danger-solid-button {
  background: var(--profile-danger);
  color: #ffffff;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(26, 22, 20, 0.24);
}

.modal-panel {
  width: min(520px, 100%);
  max-height: min(680px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid var(--profile-line);
  border-radius: 14px;
  background: var(--profile-panel);
  box-shadow: 0 24px 70px rgba(26, 22, 20, 0.18);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 16px;
  border-bottom: 1px solid var(--profile-line);
}

.modal-header span {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.modal-header strong {
  color: var(--profile-ink);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.modal-header small,
.empty-dialog-text {
  color: var(--profile-muted);
  font-size: 12.5px;
  line-height: 1.6;
}

.modal-close {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--profile-line);
  border-radius: 8px;
  background: var(--profile-bg);
  color: var(--profile-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  color: var(--profile-ink);
  background: var(--profile-soft);
}

.org-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 22px 22px;
}

.org-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--profile-line);
  border-radius: 10px;
  background: var(--profile-panel);
  color: var(--profile-ink);
  text-align: left;
  cursor: pointer;
}

.org-option:hover,
.org-option.active {
  border-color: var(--profile-line-strong);
  background: var(--profile-bg);
}

.org-option > span:first-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.org-option strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-option small {
  color: var(--profile-muted);
  font-size: 12px;
  line-height: 1.5;
}

.empty-dialog-text {
  margin: 0;
  padding: 22px;
}

.confirm-dialog {
  width: min(420px, 100%);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 22px 22px;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--profile-ink);
  outline-offset: 2px;
}

@media (max-width: 1180px) {
  .profile-content {
    padding: 24px 32px 52px;
  }
}

@media (max-width: 940px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .settings-grid {
    display: grid;
  }

  .identity-main {
    flex-direction: column;
  }

  .identity-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .identity-stats div:nth-child(odd) {
    border-left: 0;
  }

  .identity-stats div:nth-child(n + 3) {
    border-top: 1px solid var(--profile-line);
  }
}

@media (max-width: 640px) {
  .profile-content {
    padding: 22px 16px 40px;
  }

  .profile-heading-row,
  .settings-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-title {
    font-size: 26px;
  }

  .identity-card,
  .settings-card {
    padding: 20px;
  }

  .identity-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .identity-stats div:nth-child(odd) {
    border-left: 0;
  }

  .identity-stats div:nth-child(n + 3) {
    border-top: 1px solid var(--profile-line);
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .inline-field.compact,
  .firm-field {
    width: 100%;
  }

  .identity-avatar {
    width: 64px;
    height: 64px;
    font-size: 24px;
  }
}
</style>
