<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Building2,
  Camera,
  Check,
  LogOut,
  Palette,
  ShieldCheck,
  Star,
  Store,
  UserRound,
} from 'lucide-vue-next';
import { AUTH_FLOW_ENABLED, useOrgSession } from '../stores/orgSession';
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
const showOrganizationAccessControls = AUTH_FLOW_ENABLED;
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
      bioHint: '用于市场橱窗，向购买者展示你的专业背景与代表项目',
      expertise: '执业领域',
      expertiseHint: '至多选择 5 个，用于技能 / 模板的市场分类',
      profileBar: '律师 IP · 市场橱窗',
      profileBarSub: '当你将技能或模板发布到市场，以下信息将作为"店铺简介"展示给采购方',
      beta: '内测',
      previewCard: '橱窗预览',
      statsSkills: '已发布技能',
      statsTemplates: '已发布模板',
      statsUses: '累计调用',
      statsRating: '平均评分',
      storefrontPublished: '已发布',
      storefrontUses: '调用',
      storefrontRating: '评分',
      storefrontBioFallback: '在这里写下专业方向、代表项目、跨境业务能力等，让采购方对你建立信任 …',
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
      manageOrganization: '管理组织',
      teamManagement: '团队管理',
      signOut: '退出登录',
      signOutHint: '结束当前会话',
      confirmLogout: '退出登录',
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
    bioHint: 'Shown on your marketplace storefront when others browse your skills / templates.',
    expertise: 'Practice areas',
    expertiseHint: 'Pick up to 5. Used to classify your published skills / templates.',
    profileBar: 'Lawyer IP · Marketplace storefront',
    profileBarSub: 'When you publish skills or templates, this profile is shown to buyers as your storefront.',
    beta: 'Beta',
    previewCard: 'Storefront preview',
    statsSkills: 'Skills published',
    statsTemplates: 'Templates published',
    statsUses: 'Total invocations',
    statsRating: 'Avg. rating',
    storefrontPublished: 'Published',
    storefrontUses: 'Invocations',
    storefrontRating: 'Rating',
    storefrontBioFallback: 'Describe your practice, signature deals and cross-border capability so buyers can trust you...',
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
    manageOrganization: 'Manage',
    teamManagement: 'Team management',
    signOut: 'Sign out',
    signOutHint: 'End current session',
    confirmLogout: 'Sign out',
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
  if (organizationId === currentOrganizationId.value) return;
  if (selectOrganization(organizationId)) {
    showStatus(copy.value.organizationChanged);
  }
};

const openOrganizationManager = () => {
  void router.push({
    name: 'org-select',
    query: { switch: '1' },
  });
};

const openTeamManagement = () => {
  void router.push({ name: 'team' });
};

const handleLogout = () => {
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
            <button
              v-if="canManageTeam"
              class="btn btn-ghost btn-sm"
              type="button"
              @click="openTeamManagement"
            >
              <Building2 :size="14" />
              <span>{{ copy.teamManagement }}</span>
            </button>
            <button class="btn btn-ghost btn-sm" type="button" @click="toggleEdit">
              <Check v-if="isEditingProfile" :size="14" />
              <UserRound v-else :size="14" />
              <span>{{ isEditingProfile ? copy.save : copy.edit }}</span>
            </button>
            <button class="btn btn-ghost btn-sm danger-button" type="button" @click="handleLogout">
              <LogOut :size="14" />
              <span>{{ copy.signOut }}</span>
            </button>
          </div>
        </div>

        <section class="profile-hero" aria-label="个人资料">
          <button
            class="profile-avatar-slot"
            :class="{ 'has-img': avatarDraftDataUrl }"
            type="button"
            :title="avatarDraftDataUrl ? copy.replaceAvatar : copy.uploadAvatar"
            @click="chooseAvatar"
          >
            <img v-if="avatarDraftDataUrl" :src="avatarDraftDataUrl" alt="" />
            <span v-if="avatarDraftDataUrl" class="avatar-overlay">
              <Camera :size="20" />
              <span>{{ copy.replaceAvatar }}</span>
            </span>
            <span v-else class="avatar-empty">
              <Camera :size="26" />
              <span>{{ copy.uploadAvatar }}</span>
              <small>JPG · PNG · ≤ 5MB</small>
            </span>
          </button>
          <input
            ref="avatarInputRef"
            class="profile-avatar-input"
            type="file"
            accept="image/*"
            @change="handleAvatarUpload"
          />

          <div class="hero-main">
            <div class="profile-name-row">
              <input
                v-if="isEditingProfile"
                v-model="displayNameDraft"
                class="profile-name-input"
                type="text"
                maxlength="24"
              />
              <h2 v-else>{{ profileName }}</h2>
              <span class="chip chip-outline">{{ yearsInPractice }}{{ isChinese ? '年执业' : ' yrs in practice' }}</span>
              <span v-if="qualification" class="chip">{{ qualification }}</span>
            </div>

            <div class="profile-meta-row">
              <span><Building2 :size="13" />{{ firmName }}</span>
              <span><UserRound :size="13" />{{ copy.phone }} <span class="tabular">{{ profilePhone }}</span></span>
              <span><ShieldCheck :size="13" />{{ profileUserId }}</span>
            </div>

            <div class="profile-stats">
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
          </div>
        </section>

        <section class="card market-panel" aria-label="律师 IP 市场橱窗">
          <header class="market-header">
            <div class="market-title">
              <span class="market-icon">
                <Store :size="18" />
              </span>
              <span>
                <strong>{{ copy.profileBar }}</strong>
                <small>{{ copy.profileBarSub }}</small>
              </span>
            </div>
            <span class="chip chip-accent">{{ copy.beta }}</span>
          </header>

          <div class="market-grid">
            <div class="market-form">
              <label class="field-block">
                <span>{{ copy.firm }}</span>
                <input v-model="firmDraft" :disabled="!isEditingProfile" type="text" />
              </label>

              <div class="field-row">
                <label class="field-block">
                  <span>{{ copy.years }}</span>
                  <input v-model="yearsDraft" :disabled="!isEditingProfile" class="tabular" type="text" />
                </label>
                <label class="field-block">
                  <span>{{ copy.qualification }}</span>
                  <input
                    v-model="qualificationDraft"
                    :disabled="!isEditingProfile"
                    type="text"
                    :placeholder="isChinese ? '例：合伙人 / Partner' : 'e.g. Partner'"
                  />
                </label>
              </div>

              <label class="field-block">
                <span>{{ copy.bio }}</span>
                <textarea
                  v-model="profileBioDraft"
                  :disabled="!isEditingProfile"
                  rows="5"
                  maxlength="200"
                  :placeholder="copy.bioHint"
                ></textarea>
              </label>
              <p class="field-hint">{{ copy.bioHint }}</p>

              <div class="field-block">
                <span>{{ copy.expertise }}</span>
                <div class="expertise-list">
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
                <p class="field-hint">{{ copy.expertiseHint }}</p>
              </div>
            </div>

            <aside class="storefront-column" aria-label="橱窗预览">
              <div class="preview-label">{{ copy.previewCard }}</div>
              <article class="storefront-preview">
                <span class="preview-badge">{{ copy.previewCard }}</span>
                <div class="preview-head">
                  <span class="preview-avatar">
                    <img v-if="avatarDraftDataUrl" :src="avatarDraftDataUrl" alt="" />
                    <span v-else>{{ avatarText }}</span>
                  </span>
                  <span class="preview-title-copy">
                    <strong>{{ profileName }}</strong>
                    <small>{{ qualification }} · {{ firmName }}</small>
                  </span>
                </div>

                <p class="preview-bio" :class="{ empty: !bioText }">
                  "{{ bioText || copy.storefrontBioFallback }}"
                </p>

                <div class="preview-tags">
                  <span v-for="tag in selectedExpertise" :key="tag" class="chip chip-outline">{{ tag }}</span>
                </div>

                <div class="preview-stats">
                  <div>
                    <span>{{ copy.storefrontPublished }}</span>
                    <strong>9</strong>
                  </div>
                  <div>
                    <span>{{ copy.storefrontUses }}</span>
                    <strong>1.2K</strong>
                  </div>
                  <div>
                    <span>{{ copy.storefrontRating }}</span>
                    <strong>4.8 <Star :size="12" /></strong>
                  </div>
                </div>
              </article>
            </aside>
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
                {{ copy.manageOrganization }}
              </button>
            </div>

          </article>
        </section>
      </div>
    </main>
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

.profile-hero {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  min-height: 240px;
  margin-bottom: 18px;
  padding: 32px;
  border: 1px solid var(--profile-line);
  border-radius: 14px;
  background: var(--profile-panel);
}

.profile-avatar-slot {
  position: relative;
  width: 132px;
  height: 132px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 2px dashed var(--profile-line-strong);
  border-radius: 999px;
  background: var(--profile-soft);
  color: var(--profile-muted);
  text-align: center;
  cursor: pointer;
}

.profile-avatar-slot:hover {
  border-color: var(--profile-accent);
  background: var(--profile-accent-tint);
  color: var(--profile-accent);
}

.profile-avatar-slot.has-img {
  border-style: solid;
  border-color: var(--profile-ink);
}

.profile-avatar-slot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.profile-avatar-slot.has-img:hover .avatar-overlay {
  opacity: 1;
}

.avatar-empty {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
}

.avatar-empty small {
  color: var(--profile-muted-light);
  font-size: 10px;
}

.profile-avatar-input {
  display: none;
}

.hero-main {
  flex: 1;
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
}

.profile-name-row h2 {
  margin: 0;
  color: var(--profile-ink);
  font-family: var(--profile-serif);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
}

.profile-name-input {
  width: min(280px, 100%);
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

.profile-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 10px;
  color: var(--profile-muted);
  font-size: 13px;
}

.profile-meta-row span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 20px;
  overflow: hidden;
  border: 1px solid var(--profile-line);
  border-radius: 10px;
  background: var(--profile-bg);
}

.profile-stats div {
  min-width: 0;
  padding: 14px 16px;
  border-left: 1px solid var(--profile-line);
}

.profile-stats div:first-child {
  border-left: 0;
}

.profile-stats span,
.preview-stats span,
.field-hint,
.preview-label,
.settings-card > p {
  display: block;
  color: var(--profile-muted);
  font-size: 12px;
  line-height: 1.5;
}

.profile-stats strong,
.preview-stats strong {
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

.profile-stats svg,
.preview-stats svg {
  color: var(--profile-accent);
}

.card {
  border: 1px solid var(--profile-line);
  border-radius: 14px;
  background: var(--profile-panel);
}

.market-panel {
  margin-bottom: 18px;
  padding: 28px;
}

.market-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.market-title {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.market-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--profile-accent-tint);
  color: var(--profile-accent);
}

.market-title strong,
.settings-card h2 {
  display: block;
  margin: 0 0 2px;
  color: var(--profile-ink);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
}

.market-title small {
  display: block;
  color: var(--profile-muted);
  font-size: 12px;
  line-height: 1.5;
}

.market-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.market-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.profile-name-input:focus {
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

.chip-accent,
.preview-badge {
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

.storefront-column {
  min-width: 0;
}

.preview-label {
  margin-bottom: 10px;
}

.storefront-preview {
  position: relative;
  min-height: 280px;
  overflow: hidden;
  padding: 24px;
  border: 1px solid var(--profile-line);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--profile-bg) 0%, var(--profile-panel) 100%);
}

.preview-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.preview-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.preview-avatar {
  width: 56px;
  height: 56px;
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
  font-size: 24px;
  font-weight: 600;
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-title-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.preview-title-copy strong {
  color: var(--profile-ink);
  font-family: var(--profile-serif);
  font-size: 18px;
  font-weight: 600;
}

.preview-title-copy small {
  overflow: hidden;
  color: var(--profile-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-bio {
  margin: 0 0 14px;
  color: var(--profile-ink-700);
  font-size: 13px;
  font-style: normal;
  line-height: 1.65;
}

.preview-bio.empty {
  font-style: italic;
  opacity: 0.55;
}

.preview-tags {
  min-height: 24px;
  margin-bottom: 14px;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  padding-top: 14px;
  border-top: 1px solid var(--profile-line);
}

.preview-stats strong {
  font-size: 18px;
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
  .profile-hero,
  .market-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .market-grid,
  .settings-grid {
    display: grid;
  }

  .profile-hero {
    flex-direction: column;
  }

  .profile-avatar-slot {
    width: 112px;
    height: 112px;
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

  .profile-hero,
  .market-panel,
  .settings-card {
    padding: 20px;
  }

  .profile-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-stats div:nth-child(odd) {
    border-left: 0;
  }

  .profile-stats div:nth-child(n + 3) {
    border-top: 1px solid var(--profile-line);
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .storefront-preview {
    padding: 20px;
  }
}
</style>
