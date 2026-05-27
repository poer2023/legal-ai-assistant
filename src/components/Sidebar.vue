<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  Coins,
  FolderOpen,
  FolderPlus,
  Languages,
  List,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-vue-next';
import LawAgentsLogoIcon from './icons/LawAgentsLogoIcon.vue';
import LawAgentsNavIcon from './icons/LawAgentsNavIcon.vue';
import ProfileSettingsModal from './ProfileSettingsModal.vue';
import { useChatHistory, type ChatHistoryItem } from '../stores/chatHistory';
import { useOrgSession } from '../stores/orgSession';
import {
  normalizeWorkspaceId,
  STANDALONE_WORKSPACE_ID,
  useWorkspaces,
} from '../stores/workspaces';

const router = useRouter();
const route = useRoute();
const {
  recentHistory,
  renameConversation,
  deleteConversation,
  deleteConversationsByWorkspace,
} = useChatHistory();
const { currentOrganization, currentUser } = useOrgSession();
const {
  activeWorkspaceId,
  createWorkspace,
  deleteWorkspace,
  renameWorkspace,
  setActiveWorkspace,
  toggleWorkspacePinned,
  updateWorkspace,
  workspaces,
} = useWorkspaces();

const isCollapsed = ref(false);
const openHistoryMenuId = ref('');
const historyMenuPosition = ref({ top: 0, left: 0 });
const renamingHistoryId = ref('');
const historyRenameValue = ref('');
const pendingDeleteHistoryItem = ref<ChatHistoryItem | null>(null);
const isCreatingWorkspace = ref(false);
const newWorkspaceName = ref('');
const workspaceNameDialogMode = ref<'create' | 'rename'>('create');
const renamingWorkspaceId = ref('');
const showWorkspaceCreateMenu = ref(false);
const openWorkspaceMenuId = ref('');
const pendingDeleteWorkspaceGroup = ref<HistoryWorkspaceGroup | null>(null);
const workspaceFolderTargetId = ref('');
const workspaceFolderInputRef = ref<HTMLInputElement | null>(null);
const workspaceCreateTriggerRef = ref<HTMLButtonElement | null>(null);
const historyModeTriggerRef = ref<HTMLButtonElement | null>(null);
const profileMenuTriggerRef = ref<HTMLButtonElement | null>(null);
const workspaceCreateMenuPosition = ref({ top: 0, left: 0 });
const historyModeMenuPosition = ref({ top: 0, left: 0 });
const workspaceRowMenuPosition = ref({ top: 0, left: 0 });
const profileMenuPosition = ref({ top: 0, left: 0 });
const sidebarHistoryMode = ref<'workspace' | 'timeline'>('workspace');
const showHistoryModeMenu = ref(false);
const showProfileMenu = ref(false);
const showSettingsModal = ref(false);
const isHistoryListCollapsed = ref(false);
const collapsedWorkspaceIds = ref<Set<string>>(new Set());
const INTERFACE_LANGUAGE_STORAGE_KEY = 'legal-version-interface-language';
const readStoredInterfaceLanguage = (): 'zh' | 'en' => {
  if (typeof window === 'undefined') return 'zh';
  return window.localStorage.getItem(INTERFACE_LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'zh';
};
const interfaceLanguage = ref<'zh' | 'en'>(readStoredInterfaceLanguage());

type HistoryWorkspaceGroup = {
  id: string;
  name: string;
  meta: string;
  items: ChatHistoryItem[];
  pinned?: boolean;
  source?: 'manual' | 'local-folder';
  virtual?: boolean;
};

const activeHistoryMenuItem = computed(() =>
  recentHistory.value.find((item) => item.id === openHistoryMenuId.value) ?? null
);
const activeWorkspaceMenuGroup = computed(() =>
  workspaceHistoryGroups.value.find((group) => group.id === openWorkspaceMenuId.value) ?? null
);
const workspaceNameDialogTitle = computed(() =>
  workspaceNameDialogMode.value === 'rename' ? '重命名工作区' : '为工作区命名'
);
const workspaceNameDialogDescription = computed(() =>
  workspaceNameDialogMode.value === 'rename' ? '修改后会同步显示在历史会话分组中' : '保持简短且易识别'
);
const workspaceHistoryGroups = computed<HistoryWorkspaceGroup[]>(() => {
  const itemsByWorkspace = recentHistory.value.reduce<Map<string, ChatHistoryItem[]>>((groups, item) => {
    const workspaceId = normalizeWorkspaceId(item.workspaceId);
    groups.set(workspaceId, [...(groups.get(workspaceId) ?? []), item]);
    return groups;
  }, new Map());

  const groups: HistoryWorkspaceGroup[] = workspaces.value.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    meta: workspace.description || `${itemsByWorkspace.get(workspace.id)?.length ?? 0} 条会话`,
    pinned: workspace.pinned,
    source: workspace.source,
    items: itemsByWorkspace.get(workspace.id) ?? [],
  }));

  const standaloneItems = itemsByWorkspace.get(STANDALONE_WORKSPACE_ID) ?? [];
  if (standaloneItems.length || activeWorkspaceId.value === STANDALONE_WORKSPACE_ID) {
    groups.push({
      id: STANDALONE_WORKSPACE_ID,
      name: '不指定工作区',
      meta: `${standaloneItems.length} 条独立会话`,
      items: standaloneItems,
      virtual: true,
    });
  }

  return groups.filter((group) => group.items.length > 0 || group.id === activeWorkspaceId.value);
});

const closeHistoryMenu = () => {
  openHistoryMenuId.value = '';
};

const closeWorkspaceCreate = () => {
  isCreatingWorkspace.value = false;
  newWorkspaceName.value = '';
  workspaceNameDialogMode.value = 'create';
  renamingWorkspaceId.value = '';
};

const closeWorkspaceCreateMenu = () => {
  showWorkspaceCreateMenu.value = false;
};

const closeWorkspaceRowMenu = () => {
  openWorkspaceMenuId.value = '';
};

const closeHistoryModeMenu = () => {
  showHistoryModeMenu.value = false;
};

const closeProfileMenu = () => {
  showProfileMenu.value = false;
};

const closeSettingsModal = () => {
  showSettingsModal.value = false;
};

const closeDeleteConfirm = () => {
  pendingDeleteHistoryItem.value = null;
};

const closeWorkspaceDeleteConfirm = () => {
  pendingDeleteWorkspaceGroup.value = null;
};

const handleItemClick = (routeName: string) => {
  if (routeName) {
    closeHistoryMenu();
    closeProfileMenu();
    router.push({ name: routeName });
  }
};

const isActive = (routeName: string) => {
  return route.name === routeName;
};

const isHistoryActive = (item: ChatHistoryItem) => {
  return route.name === 'chat'
    && (
      route.query.historyId === item.id
      || (item.mock && route.query.mock === item.mock)
    );
};

const isKnowledgeActive = computed(() => {
  return ['knowledge'].includes(String(route.name ?? ''));
});
const isHistoryPageActive = computed(() => route.name === 'history');
const isProfileActive = computed(() => route.path.startsWith('/profile'));
const profileDisplayName = computed(() => {
  const user = currentUser.value;
  if (!user) return '个人中心';

  const email = user.email?.trim() || '';
  const name = user.displayName?.trim() || email || '个人中心';
  const suffix = email.split('@')[0];
  return suffix && !name.includes(suffix) ? `${name} · ${suffix}` : name;
});
const profileMeta = computed(() =>
  currentUser.value?.firmShortName?.trim()
  || currentOrganization.value?.shortName
  || currentOrganization.value?.name
  || '个人中心'
);
const sidebarBrandName = computed(() => {
  const organizationName = currentOrganization.value?.name?.trim();
  if (organizationName?.endsWith('律师事务所')) {
    return organizationName.replace(/律师事务所$/, '律所');
  }
  return currentOrganization.value?.shortName?.trim() || organizationName || '涌见 AI';
});
const profileAvatarText = computed(() =>
  currentUser.value?.avatarText
  || currentOrganization.value?.avatarText
  || '律'
);
const hasProfileAvatarImage = computed(() => Boolean(currentUser.value?.avatarDataUrl));
const profileAvatarStyle = computed(() => {
  const avatarDataUrl = currentUser.value?.avatarDataUrl;
  return avatarDataUrl ? { backgroundImage: `url(${JSON.stringify(avatarDataUrl)})` } : undefined;
});
const profileMenuCopy = computed(() => (
  interfaceLanguage.value === 'zh'
    ? {
      account: '当前账号',
      language: '界面语言',
      plan: '套餐',
      remaining: '剩余额度',
      settings: '设置',
      settingsHint: '个人资料与组织设置',
      unavailable: '暂无额度信息',
      used: '已用',
    }
    : {
      account: 'Account',
      language: 'Language',
      plan: 'Plan',
      remaining: 'Remaining',
      settings: 'Settings',
      settingsHint: 'Profile and organisation settings',
      unavailable: 'Quota unavailable',
      used: 'Used',
    }
));
const parseUsageNumbers = (value: string | undefined) => {
  const matches = value?.match(/[\d,]+/g);
  if (!matches || matches.length < 2) return null;

  const used = Number(matches[0]?.replace(/,/g, ''));
  const total = Number(matches[1]?.replace(/,/g, ''));
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null;

  return { total, used };
};
const questionUsageNumbers = computed(() => parseUsageNumbers(currentOrganization.value?.questionUsage));
const formatQuotaCount = (value: number) =>
  value.toLocaleString(interfaceLanguage.value === 'zh' ? 'zh-CN' : 'en-US');
const remainingQuestionQuota = computed(() => {
  const usage = questionUsageNumbers.value;
  if (!usage) return currentOrganization.value?.questionUsage || profileMenuCopy.value.unavailable;

  const remaining = Math.max(0, usage.total - usage.used);
  return interfaceLanguage.value === 'zh'
    ? `${formatQuotaCount(remaining)} 次`
    : `${formatQuotaCount(remaining)} uses`;
});
const questionUsageSummary = computed(() => {
  const usage = questionUsageNumbers.value;
  if (!usage) return currentOrganization.value?.questionUsage || '--';

  return `${formatQuotaCount(usage.used)} / ${formatQuotaCount(usage.total)}`;
});
const quotaTooltip = computed(() =>
  `${profileMenuCopy.value.used} ${questionUsageSummary.value}`
);
const quotaProgressPercent = computed(() => {
  const usage = questionUsageNumbers.value;
  if (!usage) return '0%';

  return `${Math.min(100, Math.max(0, (usage.used / usage.total) * 100)).toFixed(0)}%`;
});

const toggleSidebarCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
  if (isCollapsed.value) {
    closeHistoryMenu();
    closeWorkspaceCreateMenu();
    closeWorkspaceCreate();
    closeHistoryModeMenu();
    closeWorkspaceRowMenu();
    closeProfileMenu();
    closeSettingsModal();
  }
};

const getWorkspaceRootName = (files: File[]) => {
  const firstFile = files[0] as (File & { webkitRelativePath?: string }) | undefined;
  const rootName = firstFile?.webkitRelativePath?.split('/').find(Boolean);
  return rootName || firstFile?.name || '';
};

const createDefaultWorkspaceName = () => {
  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `新工作区 ${String(index).padStart(4, '0')}`;
    if (!workspaces.value.some((workspace) => workspace.name === candidate)) return candidate;
  }
  return `新工作区 ${Date.now().toString().slice(-4)}`;
};
const defaultWorkspaceName = computed(() => createDefaultWorkspaceName());

const getFloatingMenuPosition = (trigger: HTMLElement | null, menuWidth: number) => {
  const rect = trigger?.getBoundingClientRect();
  if (!rect) return { top: 0, left: 0 };

  return {
    top: Math.min(rect.bottom + 5, window.innerHeight - 8),
    left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
  };
};

const getUpwardMenuPosition = (trigger: HTMLElement | null, menuWidth: number, menuHeight: number) => {
  const rect = trigger?.getBoundingClientRect();
  if (!rect) return { top: 0, left: 0 };

  return {
    top: Math.max(8, Math.min(rect.top - menuHeight - 8, window.innerHeight - menuHeight - 8)),
    left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
  };
};

const openWorkspaceCreateMenu = () => {
  workspaceCreateMenuPosition.value = getFloatingMenuPosition(workspaceCreateTriggerRef.value, 142);
  showWorkspaceCreateMenu.value = !showWorkspaceCreateMenu.value;
  closeWorkspaceCreate();
  closeHistoryModeMenu();
  closeHistoryMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
};

const startWorkspaceCreate = () => {
  sidebarHistoryMode.value = 'workspace';
  showWorkspaceCreateMenu.value = false;
  workspaceNameDialogMode.value = 'create';
  renamingWorkspaceId.value = '';
  newWorkspaceName.value = defaultWorkspaceName.value;
  closeHistoryModeMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
  isCreatingWorkspace.value = true;
  closeHistoryMenu();
  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-sidebar-workspace-name="true"]');
    input?.focus();
    input?.select();
  });
};

const openWorkspaceFolderPicker = () => {
  sidebarHistoryMode.value = 'workspace';
  workspaceFolderTargetId.value = '';
  closeHistoryModeMenu();
  closeHistoryMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
  showWorkspaceCreateMenu.value = false;
  closeWorkspaceCreate();
  workspaceFolderInputRef.value?.click();
};

const toggleHistoryModeMenu = () => {
  historyModeMenuPosition.value = getFloatingMenuPosition(historyModeTriggerRef.value, 150);
  showHistoryModeMenu.value = !showHistoryModeMenu.value;
  closeWorkspaceCreateMenu();
  closeHistoryMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
};

const selectHistoryMode = (mode: 'workspace' | 'timeline') => {
  sidebarHistoryMode.value = mode;
  closeHistoryModeMenu();
};

const submitNewWorkspace = () => {
  const workspaceName = newWorkspaceName.value.trim() || createDefaultWorkspaceName();
  if (workspaceNameDialogMode.value === 'rename') {
    const workspace = renameWorkspace(renamingWorkspaceId.value, workspaceName);
    if (!workspace) return;
    closeWorkspaceCreate();
    return;
  }

  const workspace = createWorkspace(workspaceName);
  if (!workspace) return;
  closeWorkspaceCreate();
};

const handleWorkspaceFolderSelection = (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  if (!input) return;

  const files = Array.from(input.files ?? []);
  if (files.length) {
    const targetWorkspaceId = workspaceFolderTargetId.value;
    if (targetWorkspaceId) {
      const rootName = getWorkspaceRootName(files);
      updateWorkspace(targetWorkspaceId, {
        description: `${rootName || '本地文件夹'} · ${files.length} 个文件`,
        source: 'local-folder',
      });
    } else {
      createWorkspace(getWorkspaceRootName(files) || createDefaultWorkspaceName(), {
        description: `${files.length} 个文件`,
        source: 'local-folder',
      });
    }
  }

  input.value = '';
  workspaceFolderTargetId.value = '';
  closeWorkspaceCreateMenu();
};

const isWorkspaceGroupCollapsed = (workspaceId: string) => collapsedWorkspaceIds.value.has(workspaceId);

const toggleWorkspaceGroup = (workspaceId: string) => {
  const nextCollapsedIds = new Set(collapsedWorkspaceIds.value);
  if (nextCollapsedIds.has(workspaceId)) {
    nextCollapsedIds.delete(workspaceId);
  } else {
    nextCollapsedIds.add(workspaceId);
  }
  collapsedWorkspaceIds.value = nextCollapsedIds;
};

const openWorkspaceRowMenu = (group: HistoryWorkspaceGroup, event: MouseEvent) => {
  event.stopPropagation();
  if (group.virtual) return;

  if (openWorkspaceMenuId.value === group.id) {
    closeWorkspaceRowMenu();
    return;
  }

  const trigger = event.currentTarget as HTMLElement | null;
  workspaceRowMenuPosition.value = getFloatingMenuPosition(trigger, 158);
  openWorkspaceMenuId.value = group.id;
  closeHistoryMenu();
  closeHistoryModeMenu();
  closeWorkspaceCreateMenu();
  closeProfileMenu();
};

const startWorkspaceConversation = (group: HistoryWorkspaceGroup) => {
  closeHistoryMenu();
  closeWorkspaceRowMenu();
  closeHistoryModeMenu();
  closeWorkspaceCreateMenu();
  closeProfileMenu();
  setActiveWorkspace(group.id);
  void router.push({ name: 'home' });
};

const startWorkspaceRename = (group: HistoryWorkspaceGroup) => {
  if (group.virtual) return;

  workspaceNameDialogMode.value = 'rename';
  renamingWorkspaceId.value = group.id;
  newWorkspaceName.value = group.name;
  isCreatingWorkspace.value = true;
  closeWorkspaceRowMenu();
  closeHistoryMenu();
  closeHistoryModeMenu();
  closeWorkspaceCreateMenu();
  closeProfileMenu();

  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-sidebar-workspace-name="true"]');
    input?.focus();
    input?.select();
  });
};

const openWorkspaceFolderForGroup = (group: HistoryWorkspaceGroup) => {
  if (group.virtual) return;

  workspaceFolderTargetId.value = group.id;
  closeWorkspaceRowMenu();
  workspaceFolderInputRef.value?.click();
};

const toggleWorkspacePinnedForGroup = (group: HistoryWorkspaceGroup) => {
  if (group.virtual) return;

  toggleWorkspacePinned(group.id);
  closeWorkspaceRowMenu();
};

const removeWorkspaceGroup = (group: HistoryWorkspaceGroup) => {
  if (group.virtual) return;

  pendingDeleteWorkspaceGroup.value = group;
  closeWorkspaceRowMenu();
};

const handleKnowledgeClick = () => {
  handleItemClick('knowledge');
};

const handleHistoryClick = (item: ChatHistoryItem) => {
  closeHistoryMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
  const workspaceId = normalizeWorkspaceId(item.workspaceId);
  setActiveWorkspace(workspaceId);
  const query: Record<string, string> = {
    historyId: item.id,
    workspaceId,
  };

  if (item.mock) {
    query.mock = item.mock;
  }

  router.push({
    name: 'chat',
    query,
  });
};

const toggleHistoryList = () => {
  isHistoryListCollapsed.value = !isHistoryListCollapsed.value;
  closeHistoryMenu();
  closeHistoryModeMenu();
  closeWorkspaceCreateMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
};

const openHistoryPage = () => {
  closeHistoryMenu();
  closeHistoryModeMenu();
  closeWorkspaceCreateMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
  void router.push({ name: 'history' });
};

const openHistoryMenu = (item: ChatHistoryItem, event: MouseEvent) => {
  event.stopPropagation();

  if (openHistoryMenuId.value === item.id) {
    closeHistoryMenu();
    return;
  }

  const trigger = event.currentTarget as HTMLElement | null;
  const rect = trigger?.getBoundingClientRect();
  const menuWidth = 144;
  const menuHeight = 94;
  const left = rect ? rect.right + 6 : 0;
  const top = rect ? rect.top - 8 : 0;

  historyMenuPosition.value = {
    left: Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8)),
    top: Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8)),
  };
  openHistoryMenuId.value = item.id;
  closeWorkspaceRowMenu();
  closeProfileMenu();
};

const toggleProfileMenu = () => {
  if (showProfileMenu.value) {
    closeProfileMenu();
    return;
  }

  profileMenuPosition.value = getUpwardMenuPosition(profileMenuTriggerRef.value, 272, 220);
  showProfileMenu.value = true;
  closeHistoryMenu();
  closeHistoryModeMenu();
  closeWorkspaceCreateMenu();
  closeWorkspaceRowMenu();
};

const openProfileSettings = () => {
  closeProfileMenu();
  showSettingsModal.value = true;
};

const setInterfaceLanguage = (language: 'zh' | 'en') => {
  interfaceLanguage.value = language;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(INTERFACE_LANGUAGE_STORAGE_KEY, language);
  }
};

const startRenameHistory = (item: ChatHistoryItem) => {
  historyRenameValue.value = item.title === '新会话' ? '' : item.title;
  renamingHistoryId.value = item.id;
  closeHistoryMenu();

  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-history-rename-input="true"]');
    input?.focus();
    input?.select();
  });
};

const cancelHistoryRename = () => {
  renamingHistoryId.value = '';
  historyRenameValue.value = '';
};

const submitHistoryRename = (item: ChatHistoryItem) => {
  if (renamingHistoryId.value !== item.id) return;

  const nextTitle = historyRenameValue.value.trim();
  if (nextTitle) {
    renameConversation(item.id, nextTitle);
  }

  cancelHistoryRename();
};

const removeHistoryItem = (item: ChatHistoryItem) => {
  closeHistoryMenu();
  pendingDeleteHistoryItem.value = item;
};

const confirmRemoveHistoryItem = () => {
  const item = pendingDeleteHistoryItem.value;
  if (!item) return;

  const wasActive = isHistoryActive(item);
  const removed = deleteConversation(item.id);
  closeDeleteConfirm();

  if (removed && wasActive) {
    void router.push({ name: 'home' });
  }
};

const confirmRemoveWorkspaceGroup = () => {
  const group = pendingDeleteWorkspaceGroup.value;
  if (!group) return;

  const currentRouteWorkspaceId = normalizeWorkspaceId(String(route.query.workspaceId || ''));
  const shouldLeaveChat = route.name === 'chat' && currentRouteWorkspaceId === group.id;
  deleteConversationsByWorkspace(group.id);
  deleteWorkspace(group.id);
  closeWorkspaceDeleteConfirm();

  if (shouldLeaveChat) {
    void router.push({ name: 'home' });
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    closeHistoryMenu();
    closeHistoryModeMenu();
    closeWorkspaceCreateMenu();
    closeWorkspaceRowMenu();
    closeProfileMenu();
    return;
  }

  if (
    target.closest('.history-menu-popover')
    || target.closest('.history-mode-menu')
    || target.closest('.history-create-menu')
    || target.closest('.workspace-row-menu')
    || target.closest('.profile-account-menu')
    || target.closest('.history-more')
    || target.closest('.history-workspace-actions')
    || target.closest('.history-rename-input')
    || target.closest('.history-heading-actions')
    || target.closest('.lawagents-profile-item')
  ) {
    return;
  }

  closeHistoryMenu();
  closeHistoryModeMenu();
  closeWorkspaceCreateMenu();
  closeWorkspaceRowMenu();
  closeProfileMenu();
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <div class="logo-area">
        <div class="logo-icon">
          <LawAgentsLogoIcon
            :size="isCollapsed ? 32 : 36"
            :radius="isCollapsed ? 8 : 9"
          />
        </div>
        <div class="logo-text">
          <span class="logo-brand">{{ sidebarBrandName }}</span>
        </div>
      </div>

      <button
        class="sidebar-collapse"
        type="button"
        :aria-label="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
        :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="toggleSidebarCollapsed"
      >
        <LawAgentsNavIcon
          :kind="isCollapsed ? 'chevron-right' : 'chevron-left'"
          :size="16"
        />
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="sidebar-nav-main">
        <button
          class="nav-item"
          :class="{ active: isActive('home') }"
          aria-label="助手"
          :title="isCollapsed ? '助手' : undefined"
          @click="handleItemClick('home')"
        >
          <LawAgentsNavIcon kind="assistant" :size="18" class="nav-icon" />
          <span class="nav-label">助手</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('projects') }"
          aria-label="项目"
          :title="isCollapsed ? '项目' : undefined"
          @click="handleItemClick('projects')"
        >
          <LawAgentsNavIcon kind="projects" :size="18" class="nav-icon" />
          <span class="nav-label">项目</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('skills') }"
          aria-label="技能"
          :title="isCollapsed ? '技能' : undefined"
          @click="handleItemClick('skills')"
        >
          <LawAgentsNavIcon kind="skills" :size="18" class="nav-icon" />
          <span class="nav-label">技能</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('templates') }"
          aria-label="模板"
          :title="isCollapsed ? '模板' : undefined"
          @click="handleItemClick('templates')"
        >
          <LawAgentsNavIcon kind="templates" :size="18" class="nav-icon" />
          <span class="nav-label">模板</span>
        </button>

        <button
          class="nav-item"
          type="button"
          :class="{ active: isKnowledgeActive }"
          :title="isCollapsed ? '知识库' : undefined"
          aria-label="知识库"
          @click="handleKnowledgeClick"
        >
          <LawAgentsNavIcon kind="knowledge" :size="18" class="nav-icon" />
          <span class="nav-label">知识库</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('scheduled-tasks') }"
          aria-label="定时任务"
          :title="isCollapsed ? '定时任务' : undefined"
          @click="handleItemClick('scheduled-tasks')"
        >
          <LawAgentsNavIcon kind="schedule" :size="18" class="nav-icon" />
          <span class="nav-label">定时任务</span>
        </button>

        <button
          class="nav-item"
          :class="{ active: isActive('legal-search') }"
          aria-label="法律搜索"
          :title="isCollapsed ? '法律搜索' : undefined"
          @click="handleItemClick('legal-search')"
        >
          <LawAgentsNavIcon kind="search" :size="18" class="nav-icon" />
          <span class="nav-label">法律搜索</span>
        </button>

        <section class="history-section" aria-label="历史会话">
          <div class="history-heading-row">
            <button
              type="button"
              class="nav-item history-group-label"
              :class="{ active: isHistoryPageActive }"
              :title="isCollapsed ? '历史会话' : undefined"
              :aria-expanded="!isHistoryListCollapsed"
              @click="toggleHistoryList"
            >
              <LawAgentsNavIcon kind="history" :size="18" class="nav-icon" />
              <span class="nav-label">历史会话</span>
            </button>

            <div v-if="!isCollapsed" class="history-heading-actions" @click.stop>
              <input
                ref="workspaceFolderInputRef"
                class="workspace-folder-input"
                type="file"
                webkitdirectory
                directory
                multiple
                @change="handleWorkspaceFolderSelection"
              />
              <button
                ref="workspaceCreateTriggerRef"
                type="button"
                class="history-heading-icon"
                aria-label="新建工作区"
                :aria-expanded="showWorkspaceCreateMenu"
                @click="openWorkspaceCreateMenu"
              >
                <FolderPlus :size="15" />
              </button>
              <button
                ref="historyModeTriggerRef"
                type="button"
                class="history-heading-icon"
                aria-label="更多历史会话选项"
                :aria-expanded="showHistoryModeMenu"
                @click="toggleHistoryModeMenu"
              >
                <MoreHorizontal :size="16" />
              </button>
            </div>
          </div>

          <template v-if="!isHistoryListCollapsed && sidebarHistoryMode === 'timeline'">
            <div
              v-for="item in recentHistory"
              :key="item.id"
              class="history-row"
              :class="{ active: isHistoryActive(item), 'menu-open': openHistoryMenuId === item.id }"
            >
              <input
                v-if="renamingHistoryId === item.id"
                v-model="historyRenameValue"
                class="history-rename-input"
                data-history-rename-input="true"
                maxlength="38"
                aria-label="重命名历史会话"
                @click.stop
                @keydown.enter.prevent="submitHistoryRename(item)"
                @keydown.esc.prevent="cancelHistoryRename"
                @blur="submitHistoryRename(item)"
              />
              <button
                v-else
                class="history-item"
                :title="isCollapsed ? item.title : undefined"
                @click="handleHistoryClick(item)"
              >
                <span class="history-title">{{ item.title }}</span>
              </button>
              <button
                v-if="renamingHistoryId !== item.id"
                class="history-more"
                type="button"
                :aria-label="`打开 ${item.title} 的更多操作`"
                :aria-expanded="openHistoryMenuId === item.id"
                @click="openHistoryMenu(item, $event)"
              >
                <MoreHorizontal :size="16" />
              </button>
            </div>
          </template>

          <template v-else-if="!isHistoryListCollapsed">
            <section
              v-for="group in workspaceHistoryGroups"
              :key="group.id"
              class="history-workspace-group"
              :class="{ 'menu-open': openWorkspaceMenuId === group.id }"
            >
              <button
                type="button"
                class="history-workspace-head"
                :aria-expanded="!isWorkspaceGroupCollapsed(group.id)"
                @click="toggleWorkspaceGroup(group.id)"
              >
                <LawAgentsNavIcon
                  kind="chevron-right"
                  :size="12"
                  class="history-workspace-toggle-icon"
                  :class="{ collapsed: isWorkspaceGroupCollapsed(group.id) }"
                />
                <FolderOpen :size="13" />
                <span class="history-workspace-name">{{ group.name }}</span>
              </button>
              <div
                v-if="!group.virtual"
                class="history-workspace-actions"
                @click.stop
              >
                <button
                  type="button"
                  class="history-workspace-action"
                  :aria-label="`在 ${group.name} 下新建会话`"
                  @click="startWorkspaceConversation(group)"
                >
                  <Plus :size="13" />
                </button>
                <button
                  type="button"
                  class="history-workspace-action"
                  :aria-label="`打开 ${group.name} 的工作区操作`"
                  :aria-expanded="openWorkspaceMenuId === group.id"
                  @click="openWorkspaceRowMenu(group, $event)"
                >
                  <MoreHorizontal :size="15" />
                </button>
              </div>
              <div
                v-if="!isWorkspaceGroupCollapsed(group.id) && group.items.length === 0"
                class="history-workspace-empty"
              >
                暂无会话
              </div>
              <div
                v-for="item in group.items"
                v-show="!isWorkspaceGroupCollapsed(group.id)"
                :key="item.id"
                class="history-row workspace-history-row"
                :class="{ active: isHistoryActive(item), 'menu-open': openHistoryMenuId === item.id }"
              >
                <input
                  v-if="renamingHistoryId === item.id"
                  v-model="historyRenameValue"
                  class="history-rename-input"
                  data-history-rename-input="true"
                  maxlength="38"
                  aria-label="重命名历史会话"
                  @click.stop
                  @keydown.enter.prevent="submitHistoryRename(item)"
                  @keydown.esc.prevent="cancelHistoryRename"
                  @blur="submitHistoryRename(item)"
                />
                <button
                  v-else
                  class="history-item"
                  :title="isCollapsed ? item.title : undefined"
                  @click="handleHistoryClick(item)"
                >
                  <span class="history-title">{{ item.title }}</span>
                </button>
                <button
                  v-if="renamingHistoryId !== item.id"
                  class="history-more"
                  type="button"
                  :aria-label="`打开 ${item.title} 的更多操作`"
                  :aria-expanded="openHistoryMenuId === item.id"
                  @click="openHistoryMenu(item, $event)"
                >
                  <MoreHorizontal :size="16" />
                </button>
              </div>
            </section>
          </template>
        </section>
      </div>

      <div class="sidebar-nav-bottom">
        <button
          v-if="!isCollapsed"
          type="button"
          class="sidebar-update-card"
          @click="showSettingsModal = true"
        >
          <span class="sidebar-update-dot" aria-hidden="true"></span>
          <span>
            <strong>新版本 v2.4.0 可更新</strong>
            <small>查看更新与设置</small>
          </span>
          <Settings :size="14" />
        </button>
        <button
          ref="profileMenuTriggerRef"
          class="nav-item profile-nav-item lawagents-profile-item"
          :class="{ active: isProfileActive || showProfileMenu }"
          aria-label="个人中心"
          aria-haspopup="menu"
          :aria-expanded="showProfileMenu"
          :title="isCollapsed ? '个人中心' : undefined"
          @click.stop="toggleProfileMenu"
        >
          <span
            class="lawagents-profile-avatar"
            :class="{ 'has-image': hasProfileAvatarImage }"
            :style="profileAvatarStyle"
          >
            <span v-if="!hasProfileAvatarImage">{{ profileAvatarText }}</span>
          </span>
          <span class="lawagents-profile-copy">
            <span class="lawagents-profile-name">{{ profileDisplayName }}</span>
            <span class="lawagents-profile-sub">{{ profileMeta }}</span>
          </span>
        </button>
      </div>
    </nav>

  </aside>

  <Teleport to="body">
    <div
      v-if="showProfileMenu"
      class="profile-account-menu"
      :style="{ top: `${profileMenuPosition.top}px`, left: `${profileMenuPosition.left}px` }"
      role="menu"
      @click.stop
    >
      <section
        class="profile-account-summary profile-tooltip-host"
        :aria-label="`${profileMenuCopy.account}: ${profileDisplayName}; ${profileMeta}`"
        :data-profile-tooltip="profileMeta"
      >
        <span
          class="profile-menu-avatar"
          :class="{ 'has-image': hasProfileAvatarImage }"
          :style="profileAvatarStyle"
        >
          <span v-if="!hasProfileAvatarImage">{{ profileAvatarText }}</span>
        </span>
        <span class="profile-menu-copy">
          <strong>{{ profileDisplayName }}</strong>
        </span>
      </section>

      <section class="profile-menu-language" :aria-label="profileMenuCopy.language">
        <span class="profile-menu-language-label">
          <Languages :size="15" />
          {{ profileMenuCopy.language }}
        </span>
        <span class="profile-language-toggle" role="group" :aria-label="profileMenuCopy.language">
          <button
            type="button"
            :data-active="interfaceLanguage === 'zh'"
            @click="setInterfaceLanguage('zh')"
          >
            中文
          </button>
          <button
            type="button"
            :data-active="interfaceLanguage === 'en'"
            @click="setInterfaceLanguage('en')"
          >
            EN
          </button>
        </span>
      </section>

      <section
        class="profile-menu-quota profile-tooltip-host"
        :aria-label="`${profileMenuCopy.remaining}: ${remainingQuestionQuota}; ${quotaTooltip}`"
        :data-profile-tooltip="quotaTooltip"
      >
        <div class="profile-menu-row-title">
          <span>
            <Coins :size="15" />
            {{ profileMenuCopy.remaining }}
          </span>
          <strong>{{ remainingQuestionQuota }}</strong>
        </div>
        <div class="profile-menu-meter" aria-hidden="true">
          <span :style="{ width: quotaProgressPercent }"></span>
        </div>
      </section>

      <button
        type="button"
        class="profile-menu-action profile-tooltip-host"
        role="menuitem"
        :aria-label="`${profileMenuCopy.settings}: ${profileMenuCopy.settingsHint}`"
        :data-profile-tooltip="profileMenuCopy.settingsHint"
        @click="openProfileSettings"
      >
        <Settings :size="15" />
        <span class="profile-menu-action-copy">
          <strong>{{ profileMenuCopy.settings }}</strong>
        </span>
        <LawAgentsNavIcon kind="chevron-right" :size="13" />
      </button>
    </div>
  </Teleport>

  <ProfileSettingsModal
    :open="showSettingsModal"
    :initial-language="interfaceLanguage"
    @close="closeSettingsModal"
    @language-change="setInterfaceLanguage"
  />

  <Teleport to="body">
    <div
      v-if="showWorkspaceCreateMenu"
      class="history-create-menu"
      :style="{ top: `${workspaceCreateMenuPosition.top}px`, left: `${workspaceCreateMenuPosition.left}px` }"
      role="menu"
      @click.stop
    >
      <button type="button" role="menuitem" @click="startWorkspaceCreate">
        <FolderPlus :size="13" />
        <span>新建工作区</span>
      </button>
      <button type="button" role="menuitem" @click="openWorkspaceFolderPicker">
        <FolderOpen :size="13" />
        <span>使用本地文件夹</span>
      </button>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="showHistoryModeMenu"
      class="history-mode-menu"
      :style="{ top: `${historyModeMenuPosition.top}px`, left: `${historyModeMenuPosition.left}px` }"
      role="menu"
      @click.stop
    >
      <button
        type="button"
        role="menuitem"
        @click="openHistoryPage"
      >
        <LawAgentsNavIcon kind="history" :size="13" />
        <span>查看所有会话</span>
      </button>
      <div class="history-sort-menu-item" role="menuitem" tabindex="0">
        <span class="history-sort-label">
          <List :size="13" />
          <span>会话排序</span>
        </span>
        <LawAgentsNavIcon kind="chevron-right" :size="12" />
        <div class="history-sort-submenu" role="menu">
          <button
            type="button"
            :class="{ active: sidebarHistoryMode === 'workspace' }"
            role="menuitem"
            @click="selectHistoryMode('workspace')"
          >
            <FolderOpen :size="13" />
            <span>按工作空间显示</span>
          </button>
          <button
            type="button"
            :class="{ active: sidebarHistoryMode === 'timeline' }"
            role="menuitem"
            @click="selectHistoryMode('timeline')"
          >
            <List :size="13" />
            <span>按时间线显示</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="activeWorkspaceMenuGroup"
      class="workspace-row-menu"
      :style="{ top: `${workspaceRowMenuPosition.top}px`, left: `${workspaceRowMenuPosition.left}px` }"
      role="menu"
      @click.stop
    >
      <button
        type="button"
        role="menuitem"
        @click="startWorkspaceRename(activeWorkspaceMenuGroup)"
      >
        <Pencil :size="13" />
        <span>重命名</span>
      </button>
      <button
        type="button"
        role="menuitem"
        @click="openWorkspaceFolderForGroup(activeWorkspaceMenuGroup)"
      >
        <FolderOpen :size="13" />
        <span>打开本地文件夹</span>
      </button>
      <button
        type="button"
        role="menuitem"
        @click="toggleWorkspacePinnedForGroup(activeWorkspaceMenuGroup)"
      >
        <Pin :size="13" />
        <span>{{ activeWorkspaceMenuGroup.pinned ? '取消置顶' : '置顶' }}</span>
      </button>
      <button
        type="button"
        class="danger"
        role="menuitem"
        @click="removeWorkspaceGroup(activeWorkspaceMenuGroup)"
      >
        <Trash2 :size="13" />
        <span>删除对话</span>
      </button>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="isCreatingWorkspace"
      class="workspace-name-backdrop"
      role="presentation"
      @click.self="closeWorkspaceCreate"
    >
      <section
        class="workspace-name-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-name-title"
      >
        <header class="workspace-name-header">
          <div>
            <h2 id="workspace-name-title">{{ workspaceNameDialogTitle }}</h2>
            <p>{{ workspaceNameDialogDescription }}</p>
          </div>
          <button type="button" aria-label="关闭" @click="closeWorkspaceCreate">
            <X :size="18" />
          </button>
        </header>
        <input
          v-model="newWorkspaceName"
          class="workspace-name-input"
          data-sidebar-workspace-name="true"
          type="text"
          maxlength="28"
          :placeholder="defaultWorkspaceName"
          @keydown.enter.prevent="submitNewWorkspace"
          @keydown.esc.prevent="closeWorkspaceCreate"
        />
        <footer class="workspace-name-actions">
          <button type="button" class="workspace-name-cancel" @click="closeWorkspaceCreate">
            取消
          </button>
          <button type="button" class="workspace-name-save" @click="submitNewWorkspace">
            保存
          </button>
        </footer>
      </section>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="pendingDeleteWorkspaceGroup"
      class="history-confirm-backdrop"
      role="presentation"
      @click.self="closeWorkspaceDeleteConfirm"
    >
      <section
        class="history-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-delete-title"
      >
        <div class="history-confirm-icon">
          <Trash2 :size="22" />
        </div>
        <div class="history-confirm-copy">
          <h2 id="workspace-delete-title">删除工作空间</h2>
          <p>
            将删除“{{ pendingDeleteWorkspaceGroup.name }}”工作空间和下方所有的对话内容，本地文件不受影响。
          </p>
        </div>
        <div class="history-confirm-actions">
          <button type="button" class="history-confirm-cancel" @click="closeWorkspaceDeleteConfirm">
            取消
          </button>
          <button type="button" class="history-confirm-delete" @click="confirmRemoveWorkspaceGroup">
            删除
          </button>
        </div>
      </section>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="activeHistoryMenuItem"
      class="history-menu-popover"
      :style="{ top: `${historyMenuPosition.top}px`, left: `${historyMenuPosition.left}px` }"
      role="menu"
      @click.stop
    >
      <button
        type="button"
        class="history-menu-item"
        role="menuitem"
        @click="startRenameHistory(activeHistoryMenuItem)"
      >
        <Pencil :size="16" />
        <span>重命名</span>
      </button>
      <button
        type="button"
        class="history-menu-item danger"
        role="menuitem"
        @click="removeHistoryItem(activeHistoryMenuItem)"
      >
        <Trash2 :size="16" />
        <span>删除</span>
      </button>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="pendingDeleteHistoryItem"
      class="history-confirm-backdrop"
      role="presentation"
      @click.self="closeDeleteConfirm"
    >
      <section
        class="history-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-delete-title"
      >
        <div class="history-confirm-icon">
          <Trash2 :size="22" />
        </div>
        <div class="history-confirm-copy">
          <h2 id="history-delete-title">删除历史会话</h2>
          <p>确定删除“{{ pendingDeleteHistoryItem.title }}”吗？删除后将无法在历史会话中恢复。</p>
        </div>
        <div class="history-confirm-actions">
          <button type="button" class="history-confirm-cancel" @click="closeDeleteConfirm">
            取消
          </button>
          <button type="button" class="history-confirm-delete" @click="confirmRemoveHistoryItem">
            删除
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.sidebar {
  position: relative;
  width: 201px;
  background: var(--sidebar-bg);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 15px 8px 14px;
  flex-shrink: 0;
  border-right: 1px solid var(--sidebar-border);
  transition:
    width 0.2s ease,
    padding 0.2s ease;
}

.sidebar.collapsed {
  width: 64px;
  padding: 15px 8px 14px;
}

.sidebar-collapse {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--primary-color) 18%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--card-bg) 64%, transparent);
  color: var(--text-secondary);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.sidebar-collapse:hover,
.sidebar-collapse:focus-visible {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-color);
}

.sidebar-header {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding: 0 4px 0 10px;
}

.sidebar.collapsed .sidebar-header {
  padding: 0;
  min-height: 72px;
  flex-direction: column;
  justify-content: flex-start;
  gap: 8px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar.collapsed .logo-area {
  justify-content: center;
  gap: 0;
}

.logo-icon {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar.collapsed .logo-icon {
  width: 32px;
  height: 32px;
}

.logo-icon img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.sidebar.collapsed .logo-text {
  display: none;
}

.logo-brand {
  font-size: 19px;
  font-weight: 700;
  color: var(--sidebar-active-text);
  letter-spacing: 0;
}

.logo-subtitle {
  font-size: 12px;
  font-weight: 700;
  color: var(--primary-color);
}

.organization-switcher {
  position: relative;
  margin: 0 0 10px;
}

.option-avatar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-weight: 750;
}

.sidebar.collapsed .organization-switcher {
  margin-bottom: 8px;
}

.sidebar.collapsed .footer-profile-trigger {
  width: 100%;
  justify-content: center;
  padding: 9px 0;
}

.sidebar.collapsed .profile-trigger-chevron {
  display: none;
}

.organization-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: auto;
  z-index: 30;
  width: 292px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.organization-popover-title {
  padding: 2px 8px 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.organization-option {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 8px;
  color: var(--text-main);
  text-align: left;
}

.organization-option:hover,
.organization-option.active {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.organization-option.compact {
  min-height: 36px;
  display: flex;
  font-size: 14px;
  font-weight: 500;
}

.organization-option.danger {
  color: var(--diff-removed);
}

.option-avatar {
  width: 30px;
  height: 30px;
  font-size: 13px;
}

.option-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.option-name,
.option-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-name {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 650;
}

.option-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.option-check {
  color: var(--primary-color);
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-radius: 8px;
  color: var(--text-sidebar);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 3px;
  font-size: 16px;
  position: relative;
  font-weight: 500;
  min-height: 38px;
  text-align: left;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 9px 0;
}

.nav-item:hover {
  background-color: var(--sidebar-hover-bg);
  color: var(--primary-color);
}

.nav-item:focus,
.submenu-item:focus {
  outline: none;
}

.nav-item.active {
  background-color: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
  font-weight: 600;
}

.nav-item.parent-active {
  color: var(--text-sidebar);
  background: transparent;
}

.nav-item-with-toggle {
  justify-content: flex-start;
}

.nav-icon {
  margin-right: 10px;
  flex-shrink: 0;
}

.sidebar.collapsed .nav-icon {
  margin-right: 0;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
}

.sidebar.collapsed .nav-label,
.sidebar.collapsed .submenu-arrow,
.sidebar.collapsed .hot-badge-fire,
.sidebar.collapsed .knowledge-submenu {
  display: none;
}

.submenu-arrow {
  margin-left: auto;
  color: var(--text-secondary);
}

.hot-badge-fire {
  font-size: 18px;
  margin-left: auto;
  line-height: 1;
}

.knowledge-submenu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: -1px 0 4px 18px;
}

.submenu-item {
  width: 166px;
  min-height: 35px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--text-sidebar);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.submenu-item:hover,
.submenu-item.active {
  color: var(--sidebar-active-text);
  background: var(--primary-soft);
}

.submenu-item.active {
  font-weight: 700;
}

.submenu-icon {
  flex-shrink: 0;
}

.group-item span {
  flex: 1;
  white-space: nowrap;
}

.group-plus {
  color: var(--primary-color);
}

.group-chevron {
  color: var(--text-secondary);
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-nav-main {
  min-height: 0;
  flex: 1;
  overflow-x: visible;
  overflow-y: auto;
  padding-bottom: 12px;
}

.sidebar-nav-bottom {
  flex: 0 0 auto;
  padding-top: 8px;
  margin-top: auto;
}

.sidebar-update-card {
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--border-color) 78%, transparent);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  text-align: left;
}

.sidebar-update-card:hover {
  border-color: var(--sidebar-active-text);
}

.sidebar-update-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--sidebar-active-text);
}

.sidebar-update-card span:not(.sidebar-update-dot) {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.sidebar-update-card strong,
.sidebar-update-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-update-card strong {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 760;
}

.sidebar-update-card small {
  color: var(--text-muted);
  font-size: 11px;
}

.profile-nav-item {
  margin-bottom: 0;
}

.sidebar-footer {
  padding-top: 12px;
  margin-top: auto;
  border-top: 0;
}

.footer-organization {
  margin: 0 0 4px;
}

.footer-profile-trigger {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 7px 8px 7px 12px;
  border-radius: 8px;
  color: var(--text-sidebar);
  text-align: left;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.footer-profile-trigger:hover,
.footer-profile-trigger.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
}

.profile-trigger-chevron {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.footer-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.footer-label,
.footer-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-label {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}

.footer-meta {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}

.footer-organization .organization-popover {
  top: auto;
  bottom: calc(100% + 8px);
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0 8px;
  margin-top: 0;
  border-bottom: 0;
}

.history-group-label {
  min-width: 0;
  flex: 1;
  cursor: pointer;
  margin-bottom: 4px;
}

.history-group-label:hover {
  background: var(--sidebar-hover-bg);
  color: var(--primary-color);
}

.history-heading-row {
  position: relative;
  align-items: center;
  display: flex;
  overflow: visible;
}

.history-heading-actions {
  position: absolute;
  right: 8px;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition: opacity 0.14s ease;
}

.history-heading-row:hover .history-heading-actions,
.history-heading-row:focus-within .history-heading-actions,
.history-heading-actions:has(.history-mode-menu),
.history-heading-actions:has(.history-heading-icon[aria-expanded="true"]) {
  opacity: 1;
  pointer-events: auto;
}

.history-heading-icon {
  width: 25px;
  height: 25px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--text-muted);
}

.history-heading-icon:hover,
.history-heading-icon[aria-expanded="true"] {
  background: var(--card-bg);
  color: var(--primary-color);
}

.workspace-folder-input {
  display: none;
}

.history-mode-menu,
.history-create-menu,
.workspace-row-menu {
  position: fixed;
  z-index: 1200;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.history-mode-menu {
  width: 150px;
}

.history-create-menu {
  width: 142px;
}

.workspace-row-menu {
  width: 158px;
}

.profile-account-menu {
  position: fixed;
  z-index: 1200;
  width: 272px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.15);
}

.profile-account-summary {
  position: relative;
  min-height: 52px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: var(--surface-soft);
}

.profile-menu-avatar {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(150deg, var(--sidebar-active-text), color-mix(in srgb, var(--sidebar-active-text) 78%, #000000));
  background-position: center;
  background-size: cover;
  color: var(--on-primary);
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.profile-menu-copy,
.profile-menu-action-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.profile-menu-copy strong,
.profile-menu-copy span,
.profile-menu-action-copy strong,
.profile-menu-action-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-menu-copy strong,
.profile-menu-action-copy strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.25;
}

.profile-menu-copy span,
.profile-menu-action-copy span,
.profile-menu-row-meta {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.25;
}

.profile-menu-action {
  position: relative;
  width: 100%;
  min-height: 40px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  border-radius: 8px;
  color: var(--text-main);
  text-align: left;
}

.profile-menu-action:hover,
.profile-menu-action:focus-visible {
  background: color-mix(in srgb, var(--text-main) 4%, transparent);
  outline: 0;
}

.profile-menu-quota {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
}

.profile-menu-row-title,
.profile-menu-row-meta,
.profile-menu-language {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.profile-menu-row-title span,
.profile-menu-language-label {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.profile-menu-row-title strong {
  flex: 0 0 auto;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 750;
}

.profile-menu-meter {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border-color) 55%, transparent);
}

.profile-menu-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-color);
}

.profile-tooltip-host::after {
  content: attr(data-profile-tooltip);
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  z-index: 1202;
  width: max-content;
  max-width: 220px;
  padding: 6px 8px;
  border-radius: 7px;
  background: var(--text-strong);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
  color: var(--card-bg);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  opacity: 0;
  pointer-events: none;
  transform: translate(2px, -50%);
  transition: opacity 0.14s ease, transform 0.14s ease;
  white-space: normal;
}

.profile-tooltip-host:hover::after,
.profile-tooltip-host:focus-visible::after,
.profile-tooltip-host:focus-within::after {
  opacity: 1;
  transform: translate(0, -50%);
}

.profile-menu-language {
  min-height: 40px;
  padding: 6px 8px;
}

.profile-language-toggle {
  flex: 0 0 auto;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--border-color) 76%, transparent);
  border-radius: 8px;
  background: var(--surface-soft);
}

.profile-language-toggle button {
  min-width: 42px;
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.profile-language-toggle button[data-active='true'] {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.history-mode-menu button,
.history-sort-menu-item,
.history-create-menu > button,
.workspace-row-menu > button {
  width: 100%;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 0 8px;
  border-radius: 6px;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 500;
  text-align: left;
}

.history-sort-label {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.history-mode-menu button:hover,
.history-mode-menu button.active,
.history-sort-menu-item:hover,
.history-sort-menu-item:focus-visible {
  background: var(--surface-soft);
  color: var(--text-main);
}

.history-create-menu > button:hover {
  background: color-mix(in srgb, var(--text-main) 4%, transparent);
  color: var(--text-main);
}

.workspace-row-menu > button:hover {
  background: color-mix(in srgb, var(--text-main) 4%, transparent);
  color: var(--text-main);
}

.workspace-row-menu > button.danger {
  color: var(--diff-removed);
}

.history-mode-menu button.active {
  color: var(--primary-color);
  font-weight: 650;
}

.history-sort-menu-item {
  position: relative;
  justify-content: space-between;
  outline: 0;
}

.history-sort-submenu {
  position: absolute;
  top: -4px;
  left: calc(100% + 5px);
  z-index: 1201;
  width: 142px;
  display: none;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border-color) 82%, transparent);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.history-sort-menu-item:hover .history-sort-submenu,
.history-sort-menu-item:focus-within .history-sort-submenu {
  display: block;
}

.history-sort-submenu button + button {
  margin-top: 2px;
}

.history-workspace-group {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 0 4px;
}

.history-workspace-head {
  width: calc(100% - 8px);
  min-height: 28px;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 5px;
  margin: 0 0 1px 4px;
  padding: 0 58px 0 28px;
  border-radius: 7px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.history-workspace-head:hover,
.history-workspace-group.menu-open .history-workspace-head {
  background: var(--sidebar-hover-bg);
  color: var(--sidebar-active-text);
}

.history-workspace-toggle-icon {
  color: currentColor;
  transform: rotate(90deg);
  transition: transform 0.16s ease;
}

.history-workspace-toggle-icon.collapsed {
  transform: rotate(0deg);
}

.history-workspace-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-workspace-actions {
  position: absolute;
  top: 1px;
  right: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 1px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}

.history-workspace-group:hover .history-workspace-actions,
.history-workspace-group:focus-within .history-workspace-actions,
.history-workspace-group.menu-open .history-workspace-actions {
  opacity: 1;
  pointer-events: auto;
}

.history-workspace-action {
  width: 23px;
  height: 25px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--text-muted);
}

.history-workspace-action:hover,
.history-workspace-action[aria-expanded="true"] {
  background: var(--card-bg);
  color: var(--primary-color);
}

.history-workspace-empty {
  margin: 0 8px 6px 40px;
  color: var(--text-muted);
  font-size: 12px;
}

.history-row {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  border-radius: 8px;
  color: var(--text-sidebar);
  transition: all 0.2s ease;
}

.history-row:hover,
.history-row.active,
.history-row.menu-open {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
}

.history-item {
  min-width: 0;
  flex: 1;
  min-height: 32px;
  display: flex;
  align-items: center;
  padding: 5px 34px 5px 40px;
  color: inherit;
  text-align: left;
}

.workspace-history-row .history-item {
  padding-left: 48px;
}

.history-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
}

.history-more {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--text-muted);
  opacity: 0;
  transform: translateY(-50%);
  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.history-row:hover .history-more,
.history-row.menu-open .history-more,
.history-more:focus-visible {
  opacity: 1;
}

.history-more:hover,
.history-more[aria-expanded="true"] {
  background: var(--card-bg);
  color: var(--text-secondary);
}

.history-rename-input {
  min-width: 0;
  flex: 1;
  height: 28px;
  margin: 2px 34px 2px 34px;
  padding: 0 7px;
  border: 1px solid var(--primary-border);
  border-radius: 7px;
  outline: 0;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  line-height: 28px;
}

.history-rename-input:focus {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus-ring) 20%, transparent);
}

.sidebar.collapsed .history-row {
  display: none;
}

.sidebar.collapsed .history-heading-actions,
.sidebar.collapsed .history-workspace-group {
  display: none;
}

.history-menu-popover {
  position: fixed;
  z-index: 1000;
  width: 144px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.history-menu-item {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.history-menu-item:hover,
.history-menu-item:focus-visible {
  background: var(--surface-soft);
  outline: 0;
}

.history-menu-item.danger {
  color: var(--diff-removed);
}

.workspace-name-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1090;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(6px);
}

.workspace-name-dialog {
  width: min(486px, 100%);
  padding: 24px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.workspace-name-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.workspace-name-header h2 {
  margin: 0 0 4px;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 750;
  line-height: 1.25;
}

.workspace-name-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.workspace-name-header button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
}

.workspace-name-header button:hover {
  background: var(--surface-soft);
  color: var(--text-main);
}

.workspace-name-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  outline: 0;
  background: var(--bg-color);
  color: var(--text-main);
  font-size: 16px;
}

.workspace-name-input:focus {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.workspace-name-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.workspace-name-actions button {
  min-width: 76px;
  height: 38px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 650;
}

.workspace-name-cancel {
  color: var(--text-secondary);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.workspace-name-cancel:hover {
  color: var(--text-main);
  background: var(--surface-soft);
}

.workspace-name-save {
  color: var(--on-primary);
  background: var(--sidebar-active-text);
}

.workspace-name-save:hover {
  background: color-mix(in srgb, var(--sidebar-active-text) 88%, #000000);
}

.history-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(6px);
}

.history-confirm-dialog {
  width: min(380px, 100%);
  padding: 22px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.history-confirm-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-radius: 10px;
  color: var(--diff-removed);
  background: var(--diff-removed-soft);
}

.history-confirm-copy h2 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.35;
}

.history-confirm-copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.65;
}

.history-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.history-confirm-actions button {
  min-width: 78px;
  height: 36px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 650;
}

.history-confirm-cancel {
  color: var(--text-secondary);
  background: var(--surface-soft);
}

.history-confirm-cancel:hover {
  color: var(--text-main);
  background: var(--border-soft);
}

.history-confirm-delete {
  color: #ffffff;
  background: var(--diff-removed);
}

.history-confirm-delete:hover {
  background: color-mix(in srgb, var(--diff-removed) 88%, #000000);
}

.footer-item {
  color: var(--text-sidebar);
  font-size: 15px;
  margin-bottom: 4px;
  min-height: 42px;
}

.profile-footer-item {
  align-items: center;
}

.guide-item {
  margin-bottom: 8px;
}

.sidebar-nav-main::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav-main::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

.sidebar-nav-main:hover::-webkit-scrollbar-thumb {
  background: var(--border-color);
}

@media (max-width: 768px) {
  .sidebar {
    width: 64px;
    padding: 15px 8px 14px;
  }

  .sidebar-header {
    min-height: 72px;
    flex-direction: column;
    justify-content: flex-start;
    gap: 8px;
    padding: 0;
  }

  .logo-area {
    justify-content: center;
    gap: 0;
  }

  .logo-text,
  .footer-copy,
  .profile-trigger-chevron,
  .nav-label,
  .submenu-arrow,
  .hot-badge-fire,
  .knowledge-submenu,
  .history-row {
    display: none;
  }

  .nav-item {
    justify-content: center;
    padding: 9px 0;
  }

  .footer-profile-trigger {
    width: 100%;
    justify-content: center;
    padding: 9px 0;
  }

  .nav-icon {
    margin-right: 0;
  }

  .history-group-label {
    margin-bottom: 0;
  }
}
</style>
