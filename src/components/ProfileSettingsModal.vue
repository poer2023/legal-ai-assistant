<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Building2,
  Camera,
  Check,
  ChevronRight,
  Database,
  Globe2,
  KeyRound,
  Link2,
  LogOut,
  PlugZap,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-vue-next';
import { useOrgSession } from '../stores/orgSession';
import { useTheme } from '../stores/theme';
import { themeOptions, type ThemeId } from '../data/themes';

type Language = 'zh' | 'en';
type SettingsSectionId = 'account' | 'general' | 'permissions' | 'memory' | 'mcp';
type PermissionSettings = {
  localFiles: boolean;
  teamKnowledge: boolean;
  externalConnectors: boolean;
  auditLogs: boolean;
};
type MemorySettings = {
  personal: boolean;
  organization: boolean;
  autoSummaries: boolean;
  retention: '30' | '90' | 'forever';
};
type ConnectorStatus = 'connected' | 'not_connected';
type McpConnector = {
  id: string;
  name: string;
  scope: string;
  status: ConnectorStatus;
  enabled: boolean;
};

const props = defineProps<{
  open: boolean;
  initialLanguage: Language;
}>();

const emit = defineEmits<{
  close: [];
  languageChange: [language: Language];
}>();

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

const safeReadJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null') as T | null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const safeWriteJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const defaultPermissionSettings = (): PermissionSettings => ({
  localFiles: true,
  teamKnowledge: true,
  externalConnectors: false,
  auditLogs: true,
});

const defaultMemorySettings = (): MemorySettings => ({
  personal: true,
  organization: true,
  autoSummaries: false,
  retention: '90',
});

const defaultMcpConnectors = (): McpConnector[] => [
  { id: 'browser', name: 'Browser', scope: 'localhost / DOM / screenshot', status: 'connected', enabled: true },
  { id: 'github', name: 'GitHub', scope: 'repository / issue / pull request', status: 'not_connected', enabled: false },
  { id: 'dify', name: 'Dify Workflow', scope: 'workflow / batch task', status: 'not_connected', enabled: false },
  { id: 'local-files', name: 'Local Files', scope: 'workspace files', status: 'connected', enabled: true },
];

const activeSection = ref<SettingsSectionId>('account');
const language = ref<Language>(props.initialLanguage);
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
const isOrganizationDialogOpen = ref(false);
const isLogoutConfirmOpen = ref(false);
const permissionSettings = ref<PermissionSettings>(
  safeReadJson('legal-version-settings-permissions', defaultPermissionSettings()),
);
const memorySettings = ref<MemorySettings>(
  safeReadJson('legal-version-settings-memory', defaultMemorySettings()),
);
const mcpConnectors = ref<McpConnector[]>(
  safeReadJson('legal-version-settings-mcp-connectors', defaultMcpConnectors()),
);
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const sections: Array<{ id: SettingsSectionId; label: string; icon: unknown }> = [
  { id: 'account', label: '账户管理', icon: UserRound },
  { id: 'general', label: '常规设置', icon: SlidersHorizontal },
  { id: 'permissions', label: '系统权限', icon: ShieldCheck },
  { id: 'memory', label: '记忆', icon: Database },
  { id: 'mcp', label: 'MCP 连接器', icon: PlugZap },
];

const expertiseOptions = [
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

const themeSwatchLabels: Record<ThemeId, string> = {
  classic: '原版',
  'codex-theme-v1': '纯白',
  'absolutely-theme-v1': '象牙',
  'happycapy-paper-v1': '纸页',
  'lawagents-standalone-v1': '暖白',
};

const themeSwatches = themeOptions.map((theme) => ({
  id: theme.id,
  label: themeSwatchLabels[theme.id],
  surface: theme.theme.surface,
  accent: theme.theme.accent,
  ink: theme.theme.ink,
}));

const profilePhone = computed(() => currentUser.value?.phone?.trim() || '11111111111');
const profileUserId = computed(() => {
  const rawUserId = currentUser.value?.id?.trim();
  if (!rawUserId || rawUserId === 'public-demo-user') return `user-${profilePhone.value}`;
  return rawUserId;
});
const savedProfileName = computed(() => {
  const rawName = currentUser.value?.displayName?.trim();
  if (rawName && rawName !== '演示用户') return rawName;
  return `律师 · ${profilePhone.value.slice(-4) || '1111'}`;
});
const savedFirmName = computed(() =>
  currentUser.value?.firmShortName?.trim()
  || currentOrganization.value?.shortName
  || '金杜律师事务所'
);
const savedYears = computed(() => currentUser.value?.yearsInPractice?.trim() || '12');
const savedQualification = computed(() => currentUser.value?.qualification?.trim() || '合伙人');
const savedBio = computed(() => currentUser.value?.bio?.trim() || '');
const savedExpertise = computed(() =>
  currentUser.value?.expertise?.length
    ? currentUser.value.expertise
    : ['跨境投融资', '并购重组', '私募基金']
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
const activeSectionLabel = computed(() =>
  sections.find((section) => section.id === activeSection.value)?.label ?? '设置'
);

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

const closeModal = () => {
  isOrganizationDialogOpen.value = false;
  isLogoutConfirmOpen.value = false;
  emit('close');
};

const chooseAvatar = () => {
  if (!isEditingProfile.value) isEditingProfile.value = true;
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
  if (ok) isEditingProfile.value = false;
  showStatus(ok ? '个人资料已保存' : '请先登录账号');
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
    showStatus('已切换组织');
  }
};

const handleLanguageSelect = (nextLanguage: Language) => {
  language.value = nextLanguage;
  emit('languageChange', nextLanguage);
};

const handleThemeSelect = (themeId: ThemeId) => {
  setTheme(themeId);
  showStatus('主题已切换');
};

const handleLogout = () => {
  isLogoutConfirmOpen.value = false;
  closeModal();
  logout();
  void router.replace({ name: 'login' });
};

const toggleConnector = (connectorId: string) => {
  mcpConnectors.value = mcpConnectors.value.map((connector) => {
    if (connector.id !== connectorId) return connector;
    const enabled = !connector.enabled;
    return {
      ...connector,
      enabled,
      status: enabled ? 'connected' : 'not_connected',
    };
  });
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      activeSection.value = 'account';
      language.value = props.initialLanguage;
      syncProfileDraft();
    }
  },
  { immediate: true },
);

watch(
  [currentUser, currentOrganization],
  () => {
    if (!isEditingProfile.value) syncProfileDraft();
  },
);

watch(permissionSettings, (settings) => {
  safeWriteJson('legal-version-settings-permissions', settings);
}, { deep: true });

watch(memorySettings, (settings) => {
  safeWriteJson('legal-version-settings-memory', settings);
}, { deep: true });

watch(mcpConnectors, (connectors) => {
  safeWriteJson('legal-version-settings-mcp-connectors', connectors);
}, { deep: true });

onBeforeUnmount(() => {
  if (statusTimer) clearTimeout(statusTimer);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="settings-modal-backdrop"
      role="presentation"
      @click.self="closeModal"
    >
      <section
        class="settings-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="activeSectionLabel"
      >
        <aside class="settings-modal-nav" aria-label="设置分类">
          <header class="settings-modal-brand">
            <span class="settings-brand-mark">Y</span>
            <span>
              <strong>设置</strong>
              <small>{{ currentOrganization?.shortName ?? '个人中心' }}</small>
            </span>
          </header>

          <nav>
            <button
              v-for="section in sections"
              :key="section.id"
              type="button"
              :class="{ active: activeSection === section.id }"
              @click="activeSection = section.id"
            >
              <component :is="section.icon" :size="16" />
              <span>{{ section.label }}</span>
              <ChevronRight :size="14" />
            </button>
          </nav>
        </aside>

        <main class="settings-modal-main">
          <header class="settings-modal-header">
            <div>
              <h2>{{ activeSectionLabel }}</h2>
              <span v-if="statusMessage" class="settings-status">{{ statusMessage }}</span>
            </div>
            <button class="settings-close" type="button" aria-label="关闭" @click="closeModal">
              <X :size="18" />
            </button>
          </header>

          <div class="settings-modal-scroll">
            <section v-if="activeSection === 'account'" class="settings-section">
              <article class="settings-panel account-profile-panel">
                <div class="account-profile-main">
                  <button
                    class="settings-avatar"
                    :class="{ 'has-img': avatarDraftDataUrl }"
                    type="button"
                    :aria-label="avatarDraftDataUrl ? '更换头像' : '上传头像'"
                    @click="chooseAvatar"
                  >
                    <img v-if="avatarDraftDataUrl" :src="avatarDraftDataUrl" alt="" />
                    <span v-else>{{ avatarText }}</span>
                    <span class="settings-avatar-overlay" aria-hidden="true">
                      <Camera :size="17" />
                    </span>
                  </button>
                  <input
                    ref="avatarInputRef"
                    class="settings-avatar-input"
                    type="file"
                    accept="image/*"
                    @change="handleAvatarUpload"
                  />

                  <div class="account-profile-copy">
                    <div class="account-name-row">
                      <input
                        v-if="isEditingProfile"
                        v-model="displayNameDraft"
                        class="settings-input account-name-input"
                        type="text"
                        maxlength="24"
                      />
                      <h3 v-else>{{ profileName }}</h3>
                      <button class="settings-primary-action" type="button" @click="toggleEdit">
                        <Check v-if="isEditingProfile" :size="14" />
                        <UserRound v-else :size="14" />
                        <span>{{ isEditingProfile ? '保存' : '编辑资料' }}</span>
                      </button>
                    </div>

                    <div class="account-meta-row">
                      <span><Building2 :size="13" />{{ firmName }}</span>
                      <span><UserRound :size="13" />{{ profilePhone }}</span>
                      <span><ShieldCheck :size="13" />{{ profileUserId }}</span>
                    </div>

                    <textarea
                      v-if="isEditingProfile"
                      v-model="profileBioDraft"
                      class="settings-textarea"
                      rows="3"
                      maxlength="200"
                      placeholder="专业背景、代表项目与业务能力"
                    ></textarea>
                    <p v-else class="account-bio" :class="{ empty: !bioText }">
                      {{ bioText || '专业背景、代表项目与业务能力' }}
                    </p>
                  </div>
                </div>

                <div class="settings-form-grid">
                  <label class="settings-field">
                    <span>机构名称</span>
                    <input v-model="firmDraft" class="settings-input" type="text" :disabled="!isEditingProfile" />
                  </label>
                  <label class="settings-field">
                    <span>执业年限</span>
                    <input v-model="yearsDraft" class="settings-input" type="text" :disabled="!isEditingProfile" />
                  </label>
                  <label class="settings-field">
                    <span>资质 / 头衔</span>
                    <input v-model="qualificationDraft" class="settings-input" type="text" :disabled="!isEditingProfile" />
                  </label>
                </div>

                <div class="settings-chip-group">
                  <button
                    v-for="tag in expertiseOptions"
                    :key="tag"
                    type="button"
                    class="settings-chip"
                    :class="{ selected: selectedExpertise.includes(tag), readonly: !isEditingProfile }"
                    @click="toggleExpertise(tag)"
                  >
                    <Check v-if="selectedExpertise.includes(tag)" :size="11" />
                    <span>{{ tag }}</span>
                  </button>
                </div>
              </article>

              <article class="settings-panel">
                <div class="settings-row">
                  <span>
                    <strong><KeyRound :size="15" />登录方式</strong>
                    <small>手机号密码登录 · 首次密码为手机号后六位</small>
                  </span>
                  <span class="settings-badge">已启用</span>
                </div>

                <div class="settings-row">
                  <span>
                    <strong><Building2 :size="15" />当前组织</strong>
                    <small>{{ currentOrganization?.name ?? '涌见律所演示组织' }} · {{ currentOrganization?.role ?? '管理员' }} · {{ currentOrganization?.planName ?? '专业版' }}</small>
                  </span>
                  <button class="settings-secondary-action" type="button" @click="isOrganizationDialogOpen = true">
                    切换组织
                  </button>
                </div>

                <div class="settings-row">
                  <span>
                    <strong><LogOut :size="15" />退出登录</strong>
                    <small>结束当前会话</small>
                  </span>
                  <button class="settings-danger-action" type="button" @click="isLogoutConfirmOpen = true">
                    退出
                  </button>
                </div>
              </article>
            </section>

            <section v-else-if="activeSection === 'general'" class="settings-section">
              <article class="settings-panel">
                <div class="settings-row">
                  <span>
                    <strong><Globe2 :size="15" />界面语言</strong>
                    <small>中文 / English</small>
                  </span>
                  <span class="settings-segmented">
                    <button type="button" :data-active="language === 'zh'" @click="handleLanguageSelect('zh')">中文</button>
                    <button type="button" :data-active="language === 'en'" @click="handleLanguageSelect('en')">EN</button>
                  </span>
                </div>

                <div class="settings-row align-start">
                  <span>
                    <strong><SlidersHorizontal :size="15" />主题</strong>
                    <small>{{ themeSwatches.find((theme) => theme.id === currentThemeId)?.label ?? '暖白' }}</small>
                  </span>
                  <span class="settings-theme-picks">
                    <button
                      v-for="theme in themeSwatches"
                      :key="theme.id"
                      type="button"
                      :title="theme.label"
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
                      <Check v-if="currentThemeId === theme.id" class="theme-swatch-check" :size="12" />
                    </button>
                  </span>
                </div>
              </article>
            </section>

            <section v-else-if="activeSection === 'permissions'" class="settings-section">
              <article class="settings-panel">
                <div class="settings-row">
                  <span>
                    <strong><ShieldCheck :size="15" />组织角色</strong>
                    <small>{{ currentOrganization?.role ?? '管理员' }} · {{ currentOrganization?.planName ?? '专业版' }}</small>
                  </span>
                  <a
                    v-if="canManageTeam"
                    class="settings-secondary-link"
                    :href="teamManagementHref"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    团队管理
                  </a>
                </div>

                <label class="settings-row settings-switch-row">
                  <span>
                    <strong>本地文件访问</strong>
                    <small>工作区文件与本地素材读取</small>
                  </span>
                  <input v-model="permissionSettings.localFiles" class="settings-switch" type="checkbox" />
                </label>
                <label class="settings-row settings-switch-row">
                  <span>
                    <strong>团队知识库</strong>
                    <small>组织知识库检索与引用</small>
                  </span>
                  <input v-model="permissionSettings.teamKnowledge" class="settings-switch" type="checkbox" />
                </label>
                <label class="settings-row settings-switch-row">
                  <span>
                    <strong>外部连接器调用</strong>
                    <small>MCP / API 工具调用权限</small>
                  </span>
                  <input v-model="permissionSettings.externalConnectors" class="settings-switch" type="checkbox" />
                </label>
                <label class="settings-row settings-switch-row">
                  <span>
                    <strong>操作审计</strong>
                    <small>保留关键操作记录</small>
                  </span>
                  <input v-model="permissionSettings.auditLogs" class="settings-switch" type="checkbox" />
                </label>
              </article>
            </section>

            <section v-else-if="activeSection === 'memory'" class="settings-section">
              <article class="settings-panel">
                <label class="settings-row settings-switch-row">
                  <span>
                    <strong>个人偏好记忆</strong>
                    <small>语言、排版、输出偏好</small>
                  </span>
                  <input v-model="memorySettings.personal" class="settings-switch" type="checkbox" />
                </label>
                <label class="settings-row settings-switch-row">
                  <span>
                    <strong>组织上下文记忆</strong>
                    <small>律所、团队、常用工作流</small>
                  </span>
                  <input v-model="memorySettings.organization" class="settings-switch" type="checkbox" />
                </label>
                <label class="settings-row settings-switch-row">
                  <span>
                    <strong>会话摘要记忆</strong>
                    <small>长会话摘要与待办继承</small>
                  </span>
                  <input v-model="memorySettings.autoSummaries" class="settings-switch" type="checkbox" />
                </label>

                <div class="settings-row">
                  <span>
                    <strong>保留周期</strong>
                    <small>{{ memorySettings.retention === 'forever' ? '长期保留' : `${memorySettings.retention} 天` }}</small>
                  </span>
                  <span class="settings-segmented wide">
                    <button type="button" :data-active="memorySettings.retention === '30'" @click="memorySettings.retention = '30'">30 天</button>
                    <button type="button" :data-active="memorySettings.retention === '90'" @click="memorySettings.retention = '90'">90 天</button>
                    <button type="button" :data-active="memorySettings.retention === 'forever'" @click="memorySettings.retention = 'forever'">长期</button>
                  </span>
                </div>
              </article>
            </section>

            <section v-else class="settings-section">
              <article class="settings-panel mcp-panel">
                <div
                  v-for="connector in mcpConnectors"
                  :key="connector.id"
                  class="settings-row connector-row"
                >
                  <span>
                    <strong><ServerCog :size="15" />{{ connector.name }}</strong>
                    <small>{{ connector.scope }}</small>
                  </span>
                  <span class="connector-actions">
                    <span class="settings-badge" :data-state="connector.status">
                      {{ connector.status === 'connected' ? '已连接' : '未连接' }}
                    </span>
                    <button class="settings-secondary-action" type="button" @click="toggleConnector(connector.id)">
                      <Link2 :size="13" />
                      <span>{{ connector.enabled ? '断开' : '连接' }}</span>
                    </button>
                  </span>
                </div>
              </article>
            </section>
          </div>
        </main>
      </section>

      <div v-if="isOrganizationDialogOpen" class="settings-subdialog-backdrop" @click.self="isOrganizationDialogOpen = false">
        <section class="settings-subdialog" role="dialog" aria-modal="true" aria-label="切换组织">
          <header>
            <strong>切换组织</strong>
            <button type="button" aria-label="关闭" @click="isOrganizationDialogOpen = false">×</button>
          </header>
          <div v-if="organizations.length" class="settings-org-list">
            <button
              v-for="organization in organizations"
              :key="organization.id"
              type="button"
              :class="{ active: organization.id === currentOrganizationId }"
              @click="handleOrganizationSelect(organization.id)"
            >
              <span>
                <strong>{{ organization.name }}</strong>
                <small>{{ organization.role }} · {{ organization.planName }}</small>
              </span>
              <span v-if="organization.id === currentOrganizationId" class="settings-badge">当前</span>
            </button>
          </div>
          <p v-else class="settings-empty">暂无可切换组织</p>
        </section>
      </div>

      <div v-if="isLogoutConfirmOpen" class="settings-subdialog-backdrop" @click.self="isLogoutConfirmOpen = false">
        <section class="settings-subdialog confirm" role="dialog" aria-modal="true" aria-label="确认退出登录">
          <header>
            <strong>确认退出登录？</strong>
            <button type="button" aria-label="关闭" @click="isLogoutConfirmOpen = false">×</button>
          </header>
          <p>退出后需要重新登录才能继续使用当前账号。</p>
          <footer>
            <button class="settings-secondary-action" type="button" @click="isLogoutConfirmOpen = false">取消</button>
            <button class="settings-danger-action" type="button" @click="handleLogout">退出登录</button>
          </footer>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: color-mix(in srgb, var(--text-strong) 26%, transparent);
  backdrop-filter: blur(6px);
}

.settings-modal {
  width: min(1020px, calc(100vw - 48px));
  height: min(720px, calc(100vh - 48px));
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: 0 28px 90px rgba(15, 23, 42, 0.24);
  color: var(--text-main);
}

.settings-modal-nav {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 12px;
  border-right: 1px solid var(--border-color);
  background: var(--surface-soft);
}

.settings-modal-brand {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 0 6px;
}

.settings-brand-mark {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--text-strong);
  color: var(--card-bg);
  font-family: var(--font-serif);
  font-size: 15px;
}

.settings-modal-brand strong,
.settings-modal-brand small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-modal-brand strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.settings-modal-brand small {
  color: var(--text-secondary);
  font-size: 12px;
}

.settings-modal-nav nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-modal-nav nav button {
  width: 100%;
  min-height: 38px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.settings-modal-nav nav button:hover,
.settings-modal-nav nav button.active {
  background: var(--card-bg);
  color: var(--text-strong);
}

.settings-modal-nav nav button.active {
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08);
}

.settings-modal-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.settings-modal-header {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-color);
}

.settings-modal-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.25;
}

.settings-status {
  display: block;
  margin-top: 3px;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
}

.settings-close {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
}

.settings-close:hover {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.settings-modal-scroll {
  min-height: 0;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 22px 24px 28px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.account-profile-panel {
  padding: 18px;
}

.account-profile-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
}

.settings-avatar {
  position: relative;
  width: 76px;
  height: 76px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 16px;
  background: var(--text-strong);
  color: var(--card-bg);
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 650;
}

.settings-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.settings-avatar-overlay {
  position: absolute;
  inset: auto 0 0;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.58);
  color: #fff;
  opacity: 0;
  transition: opacity 0.14s ease;
}

.settings-avatar:hover .settings-avatar-overlay {
  opacity: 1;
}

.settings-avatar-input {
  display: none;
}

.account-profile-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.account-name-row,
.account-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.account-name-row {
  justify-content: space-between;
}

.account-name-row h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 750;
}

.account-meta-row {
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 12px;
}

.account-meta-row span,
.settings-row strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.account-bio {
  margin: 0;
  color: var(--text-main);
  font-size: 13px;
  line-height: 1.55;
}

.account-bio.empty {
  color: var(--text-muted);
}

.settings-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.settings-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.settings-input,
.settings-textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  outline: 0;
  background: var(--bg-color);
  color: var(--text-main);
  font: inherit;
}

.settings-input {
  height: 36px;
  padding: 0 10px;
}

.settings-textarea {
  min-height: 76px;
  padding: 9px 10px;
  resize: vertical;
}

.settings-input:disabled {
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.settings-input:focus,
.settings-textarea:focus {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.settings-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.settings-chip {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.settings-chip.selected {
  border-color: color-mix(in srgb, var(--primary-color) 38%, transparent);
  background: var(--primary-soft);
  color: var(--primary-color);
}

.settings-chip.readonly {
  cursor: default;
}

.settings-row {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.settings-row:last-child {
  border-bottom: 0;
}

.settings-row.align-start {
  align-items: flex-start;
}

.settings-row > span:first-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-row strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 700;
}

.settings-row small {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.35;
}

.settings-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.settings-badge[data-state='connected'] {
  background: color-mix(in srgb, #16a34a 12%, transparent);
  color: #15803d;
}

.settings-primary-action,
.settings-secondary-action,
.settings-danger-action,
.settings-secondary-link {
  flex: 0 0 auto;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.settings-primary-action {
  background: var(--text-strong);
  color: var(--card-bg);
}

.settings-secondary-action,
.settings-secondary-link {
  border: 1px solid var(--border-color);
  color: var(--text-main);
  background: var(--card-bg);
}

.settings-secondary-action:hover,
.settings-secondary-link:hover {
  background: var(--surface-soft);
}

.settings-danger-action {
  color: var(--diff-removed);
  border: 1px solid color-mix(in srgb, var(--diff-removed) 32%, transparent);
}

.settings-danger-action:hover {
  background: color-mix(in srgb, var(--diff-removed) 8%, transparent);
}

.settings-segmented {
  flex: 0 0 auto;
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(42px, 1fr));
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
}

.settings-segmented.wide {
  grid-template-columns: repeat(3, minmax(52px, 1fr));
}

.settings-segmented button {
  height: 28px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.settings-segmented button[data-active='true'] {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.settings-theme-picks {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.settings-theme-picks button {
  position: relative;
  width: 44px;
  height: 32px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--swatch-surface);
}

.settings-theme-picks button.active {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.theme-swatch-accent,
.theme-swatch-ink {
  position: absolute;
  border-radius: 999px;
}

.theme-swatch-accent {
  width: 18px;
  height: 18px;
  right: 7px;
  top: 7px;
  background: var(--swatch-accent);
}

.theme-swatch-ink {
  width: 16px;
  height: 4px;
  left: 7px;
  bottom: 8px;
  background: var(--swatch-ink);
}

.theme-swatch-check {
  position: absolute;
  right: 4px;
  bottom: 3px;
  color: var(--swatch-ink);
}

.settings-switch-row {
  cursor: pointer;
}

.settings-switch {
  flex: 0 0 auto;
  width: 42px;
  height: 24px;
  appearance: none;
  border-radius: 999px;
  background: var(--border-color);
  box-shadow: inset 0 0 0 2px transparent;
  transition: background 0.14s ease;
}

.settings-switch::before {
  content: '';
  width: 20px;
  height: 20px;
  display: block;
  margin: 2px;
  border-radius: 999px;
  background: var(--card-bg);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
  transition: transform 0.14s ease;
}

.settings-switch:checked {
  background: var(--primary-color);
}

.settings-switch:checked::before {
  transform: translateX(18px);
}

.connector-row {
  align-items: center;
}

.connector-actions {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.settings-subdialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1310;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--text-strong) 22%, transparent);
}

.settings-subdialog {
  width: min(430px, 100%);
  max-height: min(520px, calc(100vh - 64px));
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  box-shadow: 0 22px 70px rgba(15, 23, 42, 0.22);
}

.settings-subdialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.settings-subdialog header strong {
  color: var(--text-strong);
  font-size: 15px;
}

.settings-subdialog header button {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 20px;
  line-height: 1;
}

.settings-org-list {
  padding: 8px;
}

.settings-org-list button {
  width: 100%;
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  text-align: left;
}

.settings-org-list button:hover,
.settings-org-list button.active {
  background: var(--surface-soft);
}

.settings-org-list strong,
.settings-org-list small {
  display: block;
}

.settings-org-list strong {
  color: var(--text-strong);
  font-size: 13px;
}

.settings-org-list small {
  color: var(--text-secondary);
  font-size: 12px;
}

.settings-empty,
.settings-subdialog.confirm p {
  margin: 0;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 13px;
}

.settings-subdialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 16px 16px;
}

@media (max-width: 820px) {
  .settings-modal-backdrop {
    padding: 12px;
  }

  .settings-modal {
    width: 100%;
    height: 100%;
    grid-template-columns: 1fr;
  }

  .settings-modal-nav {
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .settings-modal-nav nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-form-grid {
    grid-template-columns: 1fr;
  }

  .account-profile-main {
    grid-template-columns: 1fr;
  }

  .settings-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .connector-actions,
  .settings-theme-picks {
    justify-content: flex-start;
  }
}
</style>
