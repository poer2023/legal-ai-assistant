<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Pencil,
  Power,
  Upload,
} from 'lucide-vue-next';
import {
  addPersonalSkill,
  isSkillEnabled,
  isSkillAvailable,
  isRecommendedSkill,
  publishSkillToTeamMarket,
  setSkillEnabled,
  upsertCustomSkill,
  type SkillPublishDestination,
  type SkillCatalogItem,
  type SkillFile,
} from '../data/skillCatalog';
import {
  getSkillAuthorAvatarStyle,
  getSkillAuthorAvatarText,
  getSkillAuthorName,
  hasSkillAuthorAvatarImage,
  getProfileDisplayName,
} from '../data/profileIdentity';
import { useOrgSession } from '../stores/orgSession';

const props = withDefaults(
  defineProps<{
    skill: SkillCatalogItem;
    layout?: 'page' | 'modal';
    startEditKey?: string;
  }>(),
  {
    layout: 'page',
    startEditKey: '',
  },
);

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'use', skillName?: string): void;
  (event: 'updated', skill: SkillCatalogItem): void;
}>();

type TreeFolder = {
  key: string;
  label: string;
  files: SkillFile[];
};

type TreeGroup = {
  key: string;
  label: string;
  files: SkillFile[];
  folders: TreeFolder[];
};

type DetailPanelMode = 'preview' | 'publish';
type SkillPublishVisibility = 'personal' | SkillPublishDestination;
type ShareablePublishVisibility = Exclude<SkillPublishVisibility, 'personal'>;

type SkillPublishPermissionSettings = {
  allowCopy: boolean;
  allowRemix: boolean;
  showPublisherName: boolean;
  publisherName: string;
};

type SkillPublishSettings = {
  iconDataUrl: string;
  name: string;
  useProfileIdentity: boolean;
  description: string;
  visibilities: SkillPublishVisibility[];
  scopePermissions: Record<ShareablePublishVisibility, SkillPublishPermissionSettings>;
};

const defaultPublisherName = '李律师';
const skillPublishSettingsStorageKey = 'legal-version-skill-publish-settings';
const { currentUser } = useOrgSession();

const createDefaultPublishPermission = (): SkillPublishPermissionSettings => ({
  allowCopy: false,
  allowRemix: false,
  showPublisherName: true,
  publisherName: defaultPublisherName,
});

const publishVisibilityOptions: Array<{
  id: SkillPublishVisibility;
  label: string;
  description: string;
  permissionSubject?: string;
}> = [
  { id: 'personal', label: '仅自己', description: '只保存在个人技能区，可随时继续调整。' },
  { id: 'group', label: '小组', description: '小组成员可以在技能库中查看和调用。', permissionSubject: '小组成员' },
  { id: 'team', label: '本团队', description: '本团队成员可以在技能库中查看和调用。', permissionSubject: '本团队成员' },
  { id: 'public', label: '公共库', description: '公开后可进入公共库，更多用户可以发现和安装。', permissionSubject: '公共库用户' },
];

const activeFileId = ref('');
const expandedTreeKeys = ref<Record<string, boolean>>({});
const editMode = ref(false);
const editBuffer = ref('');
const fileDrafts = ref<Record<string, string>>({});
const detailPanelMode = ref<DetailPanelMode>('preview');
const publishIconInputRef = ref<HTMLInputElement | null>(null);
const publishSettings = ref<SkillPublishSettings>({
  iconDataUrl: '',
  name: '',
  useProfileIdentity: true,
  description: '',
  visibilities: ['personal'],
  scopePermissions: {
    group: createDefaultPublishPermission(),
    team: createDefaultPublishPermission(),
    public: createDefaultPublishPermission(),
  },
});
const statusMessage = ref('');
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const selectedFiles = computed(() => props.skill.files ?? []);

const rootFile = computed(() =>
  selectedFiles.value.find((file) => file.path === 'SKILL.md') ?? selectedFiles.value[0] ?? null
);

const activeFile = computed(() => {
  if (!selectedFiles.value.length) return null;
  return selectedFiles.value.find((file) => file.id === activeFileId.value) ?? rootFile.value;
});

const activeFileContent = computed(() => {
  const file = activeFile.value;
  if (!file) return '';
  return fileDrafts.value[`${props.skill.id}:${file.id}`] ?? file.content;
});

const activeFileParentPath = computed(() => {
  const path = activeFile.value?.path ?? '';
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? `${path.slice(0, lastSlash)}/` : '';
});

const activeFileName = computed(() => activeFile.value?.name ?? '');

const treeGroups = computed<TreeGroup[]>(() => {
  type GroupBucket = { files: SkillFile[]; folderMap: Map<string, SkillFile[]> };

  const groupMap = new Map<string, GroupBucket>();
  const ensureGroup = (label: string) => {
    const group = groupMap.get(label) ?? { files: [], folderMap: new Map<string, SkillFile[]>() };
    groupMap.set(label, group);
    return group;
  };

  selectedFiles.value
    .filter((file) => file.path !== 'SKILL.md')
    .forEach((file) => {
      const parts = file.path.split('/');
      const groupName = parts[0] ?? 'files';
      const folderName = parts.length > 2 ? parts[1] : '';
      const group = ensureGroup(groupName);

      if (folderName) {
        const folderFiles = group.folderMap.get(folderName) ?? [];
        folderFiles.push(file);
        group.folderMap.set(folderName, folderFiles);
      } else {
        group.files.push(file);
      }
    });

  return Array.from(groupMap.entries()).map(([label, group]) => ({
    key: `group:${label}`,
    label,
    files: group.files,
    folders: Array.from(group.folderMap.entries()).map(([folderLabel, files]) => ({
      key: `folder:${label}/${folderLabel}`,
      label: folderLabel,
      files,
    })),
  }));
});

const currentFileKey = computed(() =>
  activeFile.value ? `${props.skill.id}:${activeFile.value.id}` : ''
);

const selectedSkillIsRecommended = computed(() => isRecommendedSkill(props.skill.id));

const selectedSkillIsAdded = computed(() =>
  !selectedSkillIsRecommended.value || isSkillAvailable(props.skill.id)
);

const selectedSkillIsEnabled = computed(() => isSkillEnabled(props.skill));

const panelClass = computed(() => `${props.layout}-layout`);

type StoredPublishSettings = Partial<Omit<SkillPublishSettings, 'visibilities' | 'scopePermissions'>> & {
  visibility?: SkillPublishVisibility | 'public';
  visibilities?: unknown;
  scopePermissions?: Partial<Record<ShareablePublishVisibility, Partial<SkillPublishPermissionSettings>>>;
} & Partial<SkillPublishPermissionSettings>;

const isShareablePublishVisibility = (value: unknown): value is ShareablePublishVisibility =>
  value === 'group' || value === 'team' || value === 'public';

const isPublishVisibility = (value: unknown): value is SkillPublishVisibility =>
  value === 'personal' || isShareablePublishVisibility(value);

const normalizePublishVisibilities = (value: unknown): SkillPublishVisibility[] => {
  const values = Array.isArray(value) ? value : [value];
  const normalized = values.filter(isPublishVisibility);
  return Array.from(new Set(normalized.length ? normalized : ['personal']));
};

const hasLegacyPublishPermission = (settings: StoredPublishSettings) =>
  'allowCopy' in settings
  || 'allowRemix' in settings
  || 'showPublisherName' in settings
  || 'publisherName' in settings;

const normalizePublishPermission = (
  permission: Partial<SkillPublishPermissionSettings> | undefined,
): SkillPublishPermissionSettings => {
  const allowCopy = Boolean(permission?.allowCopy);
  const publisherName = typeof permission?.publisherName === 'string' && permission.publisherName.trim()
    ? permission.publisherName.trim()
    : defaultPublisherName;

  return {
    allowCopy,
    allowRemix: allowCopy && Boolean(permission?.allowRemix),
    showPublisherName: typeof permission?.showPublisherName === 'boolean'
      ? permission.showPublisherName
      : true,
    publisherName,
  };
};

const readStoredPublishSettings = (): Record<string, StoredPublishSettings> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(skillPublishSettingsStorageKey) || '{}');
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, StoredPublishSettings>
      : {};
  } catch {
    return {};
  }
};

const writeStoredPublishSettings = (skillId: string, settings: SkillPublishSettings) => {
  if (typeof window === 'undefined' || !skillId) return;
  const stored = readStoredPublishSettings();
  stored[skillId] = settings;
  window.localStorage.setItem(skillPublishSettingsStorageKey, JSON.stringify(stored));
};

const createPublishSettingsForSkill = (skill: SkillCatalogItem): SkillPublishSettings => {
  const stored = readStoredPublishSettings()[skill.id] ?? {};
  const visibilities = normalizePublishVisibilities(
    Array.isArray(stored.visibilities) ? stored.visibilities : stored.visibility,
  );
  const storedScopePermissions = stored.scopePermissions && typeof stored.scopePermissions === 'object'
    ? stored.scopePermissions
    : {};
  const legacyPermission = normalizePublishPermission(stored);
  const createPermissionForVisibility = (option: ShareablePublishVisibility) => {
    const scopedPermission = storedScopePermissions[option];
    if (scopedPermission && typeof scopedPermission === 'object') {
      return normalizePublishPermission(scopedPermission);
    }
    if (visibilities.includes(option) && hasLegacyPublishPermission(stored)) {
      return legacyPermission;
    }
    return createDefaultPublishPermission();
  };

  return {
    iconDataUrl: typeof stored.iconDataUrl === 'string' ? stored.iconDataUrl : skill.iconDataUrl || '',
    name: typeof stored.name === 'string' && stored.name.trim() ? stored.name : skill.name,
    useProfileIdentity: typeof stored.useProfileIdentity === 'boolean'
      ? stored.useProfileIdentity
      : skill.useProfileIdentity !== false,
    description: typeof stored.description === 'string' && stored.description.trim()
      ? stored.description
      : skill.description,
    visibilities,
    scopePermissions: {
      group: createPermissionForVisibility('group'),
      team: createPermissionForVisibility('team'),
      public: createPermissionForVisibility('public'),
    },
  };
};

const selectedPublishVisibilityOptions = computed(() =>
  publishVisibilityOptions.filter((option) => publishSettings.value.visibilities.includes(option.id))
);

const selectedShareablePublishOptions = computed(() =>
  selectedPublishVisibilityOptions.value.filter(
    (option): option is typeof option & { id: ShareablePublishVisibility } =>
      isShareablePublishVisibility(option.id),
  )
);

const publishVisibilityDescription = computed(() =>
  selectedPublishVisibilityOptions.value.length
    ? `已选择 ${selectedPublishVisibilityOptions.value.map((option) => option.label).join('、')}，可同时发布到多个范围。`
    : '请选择至少一个发布范围。'
);

const publishSettingsSummary = computed(() => {
  const previewSkill = {
    ...props.skill,
    useProfileIdentity: publishSettings.value.useProfileIdentity,
  };
  const authorName = getSkillAuthorName(previewSkill, currentUser.value);
  const identity = publishSettings.value.useProfileIdentity
    ? `使用个人资料：${getProfileDisplayName(currentUser.value)} / ${publishSettings.value.name || props.skill.name}`
    : authorName
      ? `技能作者：${authorName} / ${publishSettings.value.name || props.skill.name}`
      : `仅显示技能：${publishSettings.value.name || props.skill.name}`;
  const shareableLabels = selectedShareablePublishOptions.value.map((option) => option.label);
  if (!shareableLabels.length) return `仅保存在个人技能区 · ${identity}`;

  return `发布到：${shareableLabels.join('、')} · ${identity}`;
});

const publishIdentityPreviewSkill = computed(() => ({
  ...props.skill,
  useProfileIdentity: publishSettings.value.useProfileIdentity,
}));
const profileIdentityPreviewName = computed(() =>
  getSkillAuthorName(publishIdentityPreviewSkill.value, currentUser.value) || '未设置作者'
);
const profileIdentityPreviewText = computed(() =>
  getSkillAuthorAvatarText(publishIdentityPreviewSkill.value, currentUser.value) || '作'
);
const profileIdentityPreviewStyle = computed(() =>
  getSkillAuthorAvatarStyle(publishIdentityPreviewSkill.value, currentUser.value)
);
const profileIdentityPreviewHasImage = computed(() =>
  hasSkillAuthorAvatarImage(publishIdentityPreviewSkill.value, currentUser.value)
);
const profileIdentityPreviewSource = computed(() =>
  publishSettings.value.useProfileIdentity ? '来自个人中心' : '来自技能作者'
);

const publishIconFallback = computed(() =>
  (publishSettings.value.name || props.skill.name || '技').trim().slice(0, 1).toUpperCase()
);

const canSavePublishSettings = computed(() =>
  Boolean(
    publishSettings.value.name.trim()
    && publishSettings.value.description.trim()
  )
);

const setStatus = (message: string) => {
  statusMessage.value = message;
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  statusTimer = setTimeout(() => {
    statusMessage.value = '';
    statusTimer = null;
  }, 1800);
};

const resetDetailState = (skill: SkillCatalogItem) => {
  const firstFile = skill.files.find((file) => file.path === 'SKILL.md') ?? skill.files[0];
  activeFileId.value = firstFile?.id ?? '';
  editMode.value = false;
  editBuffer.value = '';
  publishSettings.value = createPublishSettingsForSkill(skill);

  const nextExpanded: Record<string, boolean> = {};
  skill.files.forEach((file) => {
    const parts = file.path.split('/');
    if (parts[0] && file.path !== 'SKILL.md') {
      nextExpanded[`group:${parts[0]}`] = true;
    }
    if (parts.length > 2) {
      nextExpanded[`folder:${parts[0]}/${parts[1]}`] = true;
    }
  });
  expandedTreeKeys.value = nextExpanded;
};

const isExpanded = (key: string) => expandedTreeKeys.value[key] !== false;

const toggleExpanded = (key: string) => {
  expandedTreeKeys.value = {
    ...expandedTreeKeys.value,
    [key]: !isExpanded(key),
  };
};

const selectFile = (file: SkillFile) => {
  detailPanelMode.value = 'preview';
  activeFileId.value = file.id;
  editMode.value = false;
  editBuffer.value = '';
};

const copyText = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  setStatus(`${label}已复制`);
};

const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`${filename} 已下载`);
};

const createSkillBundleContent = (skill: SkillCatalogItem) =>
  skill.files.map((file) => `# ${file.path}\n\n${file.content}`).join('\n\n---\n\n');

const copyCurrentFile = () => {
  if (!activeFile.value) return;
  void copyText(activeFileContent.value, activeFile.value.name);
};

const downloadCurrentSkill = () => {
  downloadText(`${props.skill.name}-skill-bundle.md`, createSkillBundleContent(props.skill));
};

const useSkill = () => {
  if (!selectedSkillIsEnabled.value) {
    setStatus('请先启用技能后再使用');
    return;
  }

  emit('use', props.skill.name);
  setStatus(`${props.skill.name} 已选择`);
};

const addSkill = () => {
  const didAdd = addPersonalSkill(props.skill.id);
  setStatus(didAdd ? `${props.skill.name} 已添加` : `${props.skill.name} 已添加`);
};

const enableSkill = () => {
  const updatedSkill = setSkillEnabled(props.skill.id, true);
  if (updatedSkill) {
    emit('updated', updatedSkill);
  }
  setStatus(`${props.skill.name} 已启用`);
};

const setDetailPanelMode = (mode: DetailPanelMode) => {
  if (mode === 'publish' && editMode.value) {
    setStatus('请先保存或取消当前文件编辑');
    return;
  }
  detailPanelMode.value = mode;
};

const choosePublishIcon = () => {
  publishIconInputRef.value?.click();
};

const clearPublishIcon = () => {
  publishSettings.value = {
    ...publishSettings.value,
    iconDataUrl: '',
  };
};

const handlePublishIconUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setStatus('请上传图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string') return;
    publishSettings.value = {
      ...publishSettings.value,
      iconDataUrl: reader.result,
    };
  };
  reader.readAsDataURL(file);
};

const updatePublishPermission = (
  visibility: ShareablePublishVisibility,
  patch: Partial<SkillPublishPermissionSettings>,
) => {
  const { scopePermissions } = publishSettings.value;
  const nextPermission = {
    ...scopePermissions[visibility],
    ...patch,
  };
  if (!nextPermission.allowCopy) {
    nextPermission.allowRemix = false;
  }

  publishSettings.value = {
    ...publishSettings.value,
    scopePermissions: {
      ...scopePermissions,
      [visibility]: nextPermission,
    },
  };
};

const handlePermissionCopyChange = (visibility: ShareablePublishVisibility, event: Event) => {
  const allowCopy = (event.target as HTMLInputElement).checked;
  updatePublishPermission(visibility, {
    allowCopy,
    allowRemix: allowCopy ? publishSettings.value.scopePermissions[visibility].allowRemix : false,
  });
};

const handlePermissionRemixChange = (visibility: ShareablePublishVisibility, event: Event) => {
  updatePublishPermission(visibility, {
    allowRemix: (event.target as HTMLInputElement).checked,
  });
};

const isPublishVisibilitySelected = (visibility: SkillPublishVisibility) =>
  publishSettings.value.visibilities.includes(visibility);

const isScopePermissionEnabled = (visibility: SkillPublishVisibility) =>
  isShareablePublishVisibility(visibility) && isPublishVisibilitySelected(visibility);

const getScopePermission = (visibility: SkillPublishVisibility) =>
  isShareablePublishVisibility(visibility)
    ? publishSettings.value.scopePermissions[visibility]
    : null;

const isScopePermissionAllowCopy = (visibility: SkillPublishVisibility) =>
  Boolean(getScopePermission(visibility)?.allowCopy);

const isScopePermissionAllowRemix = (visibility: SkillPublishVisibility) =>
  Boolean(getScopePermission(visibility)?.allowRemix);

const handleScopePermissionCopyChange = (visibility: SkillPublishVisibility, event: Event) => {
  if (!isShareablePublishVisibility(visibility)) return;
  handlePermissionCopyChange(visibility, event);
};

const handleScopePermissionRemixChange = (visibility: SkillPublishVisibility, event: Event) => {
  if (!isShareablePublishVisibility(visibility)) return;
  handlePermissionRemixChange(visibility, event);
};

const togglePublishVisibility = (visibility: SkillPublishVisibility) => {
  const current = publishSettings.value.visibilities;
  const next = current.includes(visibility)
    ? current.filter((item) => item !== visibility)
    : [...current, visibility];

  publishSettings.value = {
    ...publishSettings.value,
    visibilities: normalizePublishVisibilities(next),
  };
};

const normalizePublishSettings = (settings: SkillPublishSettings): SkillPublishSettings => ({
  ...settings,
  name: settings.name.trim(),
  description: settings.description.trim(),
  useProfileIdentity: Boolean(settings.useProfileIdentity),
  visibilities: normalizePublishVisibilities(settings.visibilities),
  scopePermissions: {
    group: normalizePublishPermission(settings.scopePermissions.group),
    team: normalizePublishPermission(settings.scopePermissions.team),
    public: normalizePublishPermission(settings.scopePermissions.public),
  },
});

const formatPublishDestinations = (visibilities: SkillPublishVisibility[]) => {
  const labels = publishVisibilityOptions
    .filter((option) => visibilities.includes(option.id))
    .map((option) => option.label);
  return labels.length ? labels.join('、') : '未选择范围';
};

const saveSkillPublishSettings = (mode: 'draft' | 'publish') => {
  const settings = normalizePublishSettings(publishSettings.value);

  if (!settings.name || !settings.description) {
    setStatus('请补全技能名称和描述');
    return;
  }

  const updatedSkill = upsertCustomSkill({
    ...props.skill,
    name: settings.name,
    iconDataUrl: settings.iconDataUrl,
    useProfileIdentity: settings.useProfileIdentity,
    description: settings.description,
    scope: mode === 'publish' && settings.visibilities.some(isShareablePublishVisibility) ? 'team' : 'personal',
    status: mode === 'publish' ? 'active' : 'draft',
  });

  if (!updatedSkill) {
    setStatus('发布设置保存失败');
    return;
  }

  publishSettings.value = settings;
  writeStoredPublishSettings(updatedSkill.id, settings);
  if (mode === 'publish') {
    const destinations = settings.visibilities.filter(isShareablePublishVisibility);
    if (destinations.length) {
      publishSkillToTeamMarket(updatedSkill.id, destinations);
    }
  }
  emit('updated', updatedSkill);
  setStatus(
    mode === 'publish'
      ? `技能已发布到${formatPublishDestinations(settings.visibilities)}`
      : '技能发布设置已保存为草稿',
  );
};

const startEditMode = () => {
  if (!activeFile.value || !currentFileKey.value) return;

  detailPanelMode.value = 'preview';
  editBuffer.value = activeFileContent.value;
  editMode.value = true;
  setStatus('已进入编辑模式');
};

const saveEdit = () => {
  if (!activeFile.value || !currentFileKey.value) return;

  fileDrafts.value = {
    ...fileDrafts.value,
    [currentFileKey.value]: editBuffer.value,
  };

  if (props.skill.source === 'custom') {
    const updatedFiles = props.skill.files.map((file) =>
      file.id === activeFile.value?.id ? { ...file, content: editBuffer.value } : file
    );
    const updatedSkill = upsertCustomSkill({
      ...props.skill,
      files: updatedFiles,
      status: props.skill.status || 'active',
    });
    if (updatedSkill) {
      emit('updated', updatedSkill);
    }
  }

  editMode.value = false;
  setStatus('当前文件已保存');
};

const cancelEdit = () => {
  editBuffer.value = '';
  editMode.value = false;
  setStatus('已取消编辑');
};

watch(
  () => props.skill,
  (skill) => resetDetailState(skill),
  { immediate: true },
);

watch(
  () => props.skill.id,
  () => {
    detailPanelMode.value = 'preview';
  },
);

watch(
  () => [
    publishSettings.value.scopePermissions.group.allowCopy,
    publishSettings.value.scopePermissions.team.allowCopy,
    publishSettings.value.scopePermissions.public.allowCopy,
  ] as const,
  ([groupAllowCopy, teamAllowCopy, publicAllowCopy]) => {
    const { group, team, public: publicPermission } = publishSettings.value.scopePermissions;
    if (
      (groupAllowCopy || !group.allowRemix)
      && (teamAllowCopy || !team.allowRemix)
      && (publicAllowCopy || !publicPermission.allowRemix)
    ) {
      return;
    }

    publishSettings.value = {
      ...publishSettings.value,
      scopePermissions: {
        group: groupAllowCopy ? group : { ...group, allowRemix: false },
        team: teamAllowCopy ? team : { ...team, allowRemix: false },
        public: publicAllowCopy ? publicPermission : { ...publicPermission, allowRemix: false },
      },
    };
  },
);

watch(
  () => props.startEditKey,
  async (key) => {
    if (!key) return;
    await nextTick();
    startEditMode();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
});
</script>

<template>
  <section class="skill-detail-panel" :class="panelClass">
    <header class="detail-header">
      <div class="detail-title-area">
        <button class="detail-back-btn" type="button" aria-label="返回技能列表" @click="emit('back')">
          <ChevronRight :size="17" class="back-chevron" />
        </button>
        <div class="detail-title-copy">
          <div class="detail-title-row">
            <h2>{{ skill.name }}</h2>
            <span class="skill-state-badge" :class="{ closed: !selectedSkillIsEnabled }">
              {{ selectedSkillIsEnabled ? '已启用' : '已停用' }}
            </span>
          </div>
          <p>{{ skill.description }}</p>
        </div>
      </div>
      <div class="detail-actions">
        <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
        <div class="detail-view-switch" role="tablist" aria-label="技能详情视图">
          <button
            type="button"
            role="tab"
            :class="{ active: detailPanelMode === 'preview' }"
            :aria-selected="detailPanelMode === 'preview'"
            @click="setDetailPanelMode('preview')"
          >
            预览
          </button>
          <button
            type="button"
            role="tab"
            :class="{ active: detailPanelMode === 'publish' }"
            :aria-selected="detailPanelMode === 'publish'"
            @click="setDetailPanelMode('publish')"
          >
            发布设置
          </button>
        </div>
        <button v-if="selectedSkillIsAdded && selectedSkillIsEnabled" class="use-skill-btn" type="button" @click="useSkill">去使用</button>
        <button
          v-else-if="selectedSkillIsAdded"
          class="use-skill-btn add-detail-btn"
          type="button"
          @click="enableSkill"
        >
          <Power :size="15" />
          启用技能
        </button>
        <button v-else class="use-skill-btn add-detail-btn" type="button" @click="addSkill">
          添加
        </button>
        <template v-if="editMode">
          <button class="edit-cancel-btn" type="button" @click="cancelEdit">取消</button>
          <button class="edit-save-btn" type="button" @click="saveEdit">保存</button>
        </template>
        <button
          v-else
          class="detail-icon-btn"
          type="button"
          aria-label="编辑当前技能文件"
          title="编辑当前技能文件"
          @click="startEditMode"
        >
          <Pencil :size="18" />
        </button>
        <button
          class="detail-icon-btn"
          type="button"
          aria-label="下载技能包"
          title="下载技能包"
          @click="downloadCurrentSkill"
        >
          <Download :size="18" />
        </button>
      </div>
    </header>

    <div v-if="detailPanelMode === 'preview'" class="skill-detail-shell">
      <aside class="detail-tree" aria-label="技能文件">
        <button
          v-if="rootFile"
          class="tree-file root-file"
          :class="{ active: activeFile?.id === rootFile.id }"
          type="button"
          @click="selectFile(rootFile)"
        >
          <FileText :size="15" />
          <span>{{ rootFile.name }}</span>
        </button>

        <div v-for="group in treeGroups" :key="group.key" class="tree-group">
          <button class="tree-heading" type="button" @click="toggleExpanded(group.key)">
            <ChevronDown v-if="isExpanded(group.key)" :size="15" />
            <ChevronRight v-else :size="15" />
            <span>{{ group.label }}</span>
          </button>

          <template v-if="isExpanded(group.key)">
            <button
              v-for="file in group.files"
              :key="file.id"
              class="tree-file"
              :class="{ active: activeFile?.id === file.id }"
              type="button"
              @click="selectFile(file)"
            >
              <FileText :size="15" />
              <span>{{ file.name }}</span>
            </button>

            <div v-for="folder in group.folders" :key="folder.key" class="tree-folder">
              <button
                class="tree-child"
                type="button"
                @click="toggleExpanded(folder.key)"
              >
                <ChevronDown v-if="isExpanded(folder.key)" :size="15" />
                <ChevronRight v-else :size="15" />
                <span>{{ folder.label }}</span>
              </button>

              <template v-if="isExpanded(folder.key)">
                <button
                  v-for="file in folder.files"
                  :key="file.id"
                  class="tree-file nested"
                  :class="{ active: activeFile?.id === file.id }"
                  type="button"
                  @click="selectFile(file)"
                >
                  <FileText :size="15" />
                  <span>{{ file.name }}</span>
                </button>
              </template>
            </div>
          </template>
        </div>
      </aside>

      <main class="detail-doc">
        <header class="doc-header">
          <div class="doc-path" aria-label="当前文件路径">
            <span v-if="activeFileParentPath" class="doc-path-parent">{{ activeFileParentPath }}</span>
            <span class="doc-path-name">{{ activeFileName }}</span>
          </div>

          <div class="doc-actions">
            <button
              class="detail-icon-btn"
              type="button"
              aria-label="复制当前文件"
              title="复制当前文件"
              @click="copyCurrentFile"
            >
              <Copy :size="17" />
            </button>
          </div>
        </header>

        <article class="doc-content">
          <textarea
            v-if="editMode"
            v-model="editBuffer"
            class="doc-editor"
            spellcheck="false"
            aria-label="编辑当前技能文件"
          ></textarea>
          <pre v-else class="doc-pre" :class="`file-${activeFile?.type ?? 'markdown'}`">{{ activeFileContent }}</pre>
        </article>
      </main>
    </div>

    <section v-else class="skill-publish-shell" aria-label="技能发布设置">
      <div class="skill-publish-panel">
        <div class="publish-section publish-identity-section">
          <div class="publish-identity-row">
            <div class="publish-skill-info-group">
              <div class="publish-avatar-control">
                <span class="publish-control-label">技能头像</span>
                <div class="publish-avatar-line">
                  <button
                    type="button"
                    class="publish-icon-preview"
                    aria-label="更换技能头像"
                    title="更换技能头像"
                    @click="choosePublishIcon"
                  >
                    <span class="publish-icon-thumb">
                      <img v-if="publishSettings.iconDataUrl" :src="publishSettings.iconDataUrl" alt="" />
                      <span v-else>{{ publishIconFallback }}</span>
                    </span>
                    <span class="publish-icon-change">
                      <Upload :size="13" />
                      <span>更换</span>
                    </span>
                  </button>
                  <input
                    ref="publishIconInputRef"
                    class="publish-icon-input"
                    type="file"
                    accept="image/*"
                    @change="handlePublishIconUpload"
                  />
                </div>
              </div>

              <label class="publish-field publish-name-field">
                <span>技能名称</span>
                <input v-model="publishSettings.name" type="text" maxlength="48" />
              </label>
            </div>

            <label class="publish-author-info-group">
              <span class="publish-control-label">使用作者信息</span>
              <div class="publish-author-card">
                <div class="profile-identity-preview">
                  <span class="profile-identity-avatar" :style="profileIdentityPreviewStyle">
                    <span v-if="!profileIdentityPreviewHasImage">{{ profileIdentityPreviewText }}</span>
                  </span>
                  <span>
                    <strong>{{ profileIdentityPreviewName }}</strong>
                    <small>{{ profileIdentityPreviewSource }}</small>
                  </span>
                </div>
                <span class="publish-switch-slot">
                  <input v-model="publishSettings.useProfileIdentity" type="checkbox" />
                </span>
              </div>
            </label>
          </div>

          <label class="publish-field">
            <span>技能描述</span>
            <textarea v-model="publishSettings.description" rows="4" maxlength="360"></textarea>
          </label>
        </div>

        <div class="publish-section">
          <div class="publish-section-header">
            <strong>发布范围</strong>
            <span>{{ publishVisibilityDescription }}</span>
          </div>
          <div class="publish-scope-list" role="group" aria-label="发布范围">
            <div
              v-for="option in publishVisibilityOptions"
              :key="option.id"
              class="publish-scope-option"
              :class="{ active: isPublishVisibilitySelected(option.id) }"
              role="checkbox"
              tabindex="0"
              :aria-checked="isPublishVisibilitySelected(option.id)"
              @click="togglePublishVisibility(option.id)"
              @keydown.enter.prevent="togglePublishVisibility(option.id)"
              @keydown.space.prevent="togglePublishVisibility(option.id)"
            >
              <div class="publish-scope-head">
                <span class="publish-scope-check">
                  <Check v-if="isPublishVisibilitySelected(option.id)" :size="14" />
                </span>
                <span class="publish-scope-copy">
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </span>
              </div>

              <div
                v-if="isShareablePublishVisibility(option.id)"
                class="publish-scope-permissions"
                :class="{ disabled: !isScopePermissionEnabled(option.id) }"
                @click.stop
              >
                <label class="publish-inline-toggle">
                  <span>查看详情</span>
                  <input
                    :checked="isScopePermissionAllowCopy(option.id)"
                    :disabled="!isScopePermissionEnabled(option.id)"
                    type="checkbox"
                    @change="handleScopePermissionCopyChange(option.id, $event)"
                  />
                </label>
                <label class="publish-inline-toggle">
                  <span>自行编辑</span>
                  <input
                    :checked="isScopePermissionAllowRemix(option.id)"
                    :disabled="!isScopePermissionEnabled(option.id) || !isScopePermissionAllowCopy(option.id)"
                    type="checkbox"
                    @change="handleScopePermissionRemixChange(option.id, $event)"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="publish-footer">
          <div class="publish-footer-summary">
            <strong>{{ formatPublishDestinations(publishSettings.visibilities) }}</strong>
            <span>{{ publishSettingsSummary }}</span>
          </div>
          <div class="publish-footer-actions">
            <button
              type="button"
              class="publish-draft-btn"
              :disabled="!canSavePublishSettings"
              @click="saveSkillPublishSettings('draft')"
            >
              保存草稿
            </button>
            <button
              type="button"
              class="publish-primary-btn"
              :disabled="!canSavePublishSettings"
              @click="saveSkillPublishSettings('publish')"
            >
              发布
            </button>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.skill-detail-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.skill-detail-panel.page-layout {
  flex: 1;
  min-height: 0;
  gap: 12px;
}

.detail-header {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.modal-layout .detail-header {
  padding: 0 58px 0 24px;
}

.page-layout .detail-header {
  min-height: 70px;
  align-items: flex-start;
  padding: 2px 0 4px;
  border-bottom: 0;
}

.detail-title-area {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-back-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 5px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--card-bg);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.detail-back-btn:hover {
  color: var(--primary-color);
  background: var(--primary-soft);
  box-shadow: inset 0 0 0 1px var(--primary-border);
}

.back-chevron {
  flex-shrink: 0;
  transform: rotate(180deg);
}

.detail-title-copy {
  min-width: 0;
}

.detail-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-title-copy h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-state-badge {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.skill-state-badge.closed {
  color: var(--text-muted);
  background: var(--surface-muted);
}

.detail-title-copy p {
  max-width: 680px;
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.45;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 5px;
}

.detail-status {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.use-skill-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 650;
}

.use-skill-btn:hover,
.detail-icon-btn:hover {
  background: var(--surface-soft);
}

.add-detail-btn {
  color: var(--on-primary);
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.add-detail-btn:hover {
  background: var(--primary-hover);
}

.edit-cancel-btn,
.edit-save-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.edit-cancel-btn {
  border: 1px solid var(--border-color);
  color: var(--text-main);
  background: var(--card-bg);
}

.edit-cancel-btn:hover {
  background: var(--surface-soft);
}

.edit-save-btn {
  color: var(--on-primary);
  background: var(--primary-color);
}

.edit-save-btn:hover {
  background: var(--primary-hover);
}

.detail-icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-strong);
}

.detail-view-switch {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-muted);
}

.detail-view-switch button {
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.detail-view-switch button:hover,
.detail-view-switch button.active {
  color: var(--primary-color);
  background: var(--card-bg);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--text-strong) 8%, transparent);
}

.skill-detail-shell {
  min-height: 520px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.modal-layout .skill-detail-shell {
  height: calc(min(700px, 100vh - 40px) - 96px);
  margin: 0 24px 24px;
  border-radius: 16px;
}

.page-layout .skill-detail-shell {
  flex: 1;
  height: auto;
  min-height: 0;
  margin: 0;
  border-color: var(--border-color);
  border-radius: 12px;
}

.skill-publish-shell {
  min-height: 520px;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
}

.modal-layout .skill-publish-shell {
  height: calc(min(700px, 100vh - 40px) - 96px);
  margin: 0 24px 24px;
  border-radius: 16px;
}

.page-layout .skill-publish-shell {
  flex: 1;
  height: auto;
  min-height: 0;
  margin: 0;
}

.detail-tree {
  min-height: 0;
  overflow: auto;
  padding: 18px 18px 24px;
  border-right: 1px solid var(--border-color);
  background: var(--card-bg);
}

.tree-group + .tree-group {
  margin-top: 16px;
}

.tree-heading,
.tree-child,
.tree-file {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 30px;
  padding: 0 6px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1;
  text-align: left;
}

.tree-child,
.tree-file {
  width: calc(100% - 22px);
  margin-left: 22px;
  color: var(--text-secondary);
}

.tree-heading:hover,
.tree-child:hover,
.tree-file:hover {
  background: var(--bg-color);
}

.tree-file.active {
  background: var(--primary-soft);
  color: var(--primary-color);
  font-weight: 650;
}

.tree-heading em,
.tree-child em,
.tree-file em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 0;
  margin-left: auto;
  padding: 3px 6px;
  border-radius: 999px;
  color: var(--primary-color);
  background: var(--primary-soft-strong);
  font-size: 11px;
  font-style: normal;
  font-weight: 760;
  line-height: 1;
  white-space: nowrap;
}

.tree-file.root-file {
  width: 100%;
  margin: 0 0 16px;
}

.tree-file.nested {
  width: calc(100% - 38px);
  margin-left: 38px;
}

.tree-folder + .tree-folder,
.tree-folder + .tree-file,
.tree-file + .tree-folder {
  margin-top: 2px;
}

.tree-file span,
.tree-child span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-file svg,
.tree-child svg,
.tree-heading svg {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.detail-doc {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
}

.doc-header {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-bg);
}

.doc-path {
  min-width: 0;
  display: flex;
  align-items: center;
  flex: 1;
  height: 34px;
  padding: 0 10px;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-path-parent {
  color: var(--text-muted);
  font-weight: 500;
}

.doc-path-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doc-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 0;
  color: var(--text-strong);
  background: var(--card-bg);
}

.doc-pre,
.doc-editor {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 34px 28px 46px;
  border: 0;
  outline: none;
  background: var(--card-bg);
  color: var(--text-strong);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
}

.doc-pre.file-markdown {
  font-family: inherit;
  font-size: 15px;
  line-height: 1.78;
}

.doc-editor {
  display: block;
  resize: none;
  min-height: 520px;
  border-radius: 0;
  box-shadow: inset 0 0 0 2px var(--primary-soft-strong);
}

.skill-publish-panel {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px 0;
}

.publish-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-soft);
}

.publish-identity-section {
  gap: 14px;
}

.publish-identity-row {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
  align-items: end;
  gap: 34px;
}

.publish-skill-info-group,
.publish-author-info-group {
  min-width: 0;
  display: grid;
  align-items: end;
  gap: 12px;
}

.publish-skill-info-group {
  grid-template-columns: 106px minmax(0, 1fr);
}

.publish-author-info-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  cursor: pointer;
}

.publish-avatar-control,
.publish-profile-switch {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.publish-control-label {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 850;
  line-height: 16px;
}

.publish-avatar-line {
  height: 40px;
  display: flex;
  align-items: center;
}

.publish-icon-preview {
  position: relative;
  width: 106px;
  height: 40px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 8px 3px 4px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--primary-border) 72%, var(--border-color));
  border-radius: 9px;
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-soft) 48%, var(--card-bg));
  font-size: 12px;
  font-weight: 850;
}

.publish-icon-preview:hover {
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.publish-icon-thumb {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--primary-border) 72%, transparent);
  border-radius: 8px;
  background:
    radial-gradient(circle at 34% 22%, rgba(255, 255, 255, 0.95), transparent 36%),
    var(--primary-soft);
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
}

.publish-icon-change {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  line-height: 1;
  white-space: nowrap;
}

.publish-icon-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publish-icon-input {
  display: none;
}

.publish-draft-btn,
.publish-primary-btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.publish-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.publish-field small {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.publish-author-card {
  width: 100%;
  height: 40px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--card-bg);
}

.profile-identity-preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  height: 40px;
}

.profile-identity-avatar {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 999px;
  color: var(--on-primary);
  background: var(--primary-color);
  background-position: center;
  background-size: cover;
  font-size: 12px;
  font-weight: 850;
}

.profile-identity-preview > span:last-child {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.profile-identity-preview strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.profile-identity-preview small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 11.5px;
  line-height: 1.2;
}

.publish-field > span,
.publish-section-header strong {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 850;
  line-height: 16px;
}

.publish-field input,
.publish-field textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--card-bg);
  font-size: 14px;
  line-height: 1.55;
}

.publish-field input {
  height: 40px;
  padding: 0 11px;
}

.publish-field textarea {
  min-height: 92px;
  padding: 9px 11px;
  resize: vertical;
}

.publish-field input:focus,
.publish-field textarea:focus {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.publish-field.compact {
  margin-left: 0;
}

.publish-section-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.publish-section-header span,
.publish-scope-option small,
.publish-toggle small,
.publish-footer-summary span {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.publish-scope-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.publish-scope-option {
  min-height: 118px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-main);
  background: var(--card-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.publish-scope-option:hover,
.publish-scope-option.active {
  border-color: var(--primary-border);
  background: color-mix(in srgb, var(--primary-soft) 40%, var(--card-bg));
}

.publish-scope-option.active {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-border) 54%, transparent);
}

.publish-scope-head {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.publish-scope-check {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: #fff;
  background: var(--card-bg);
}

.publish-scope-option.active .publish-scope-check {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.publish-scope-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.publish-scope-permissions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}

.publish-scope-permissions.disabled {
  opacity: 0.46;
}

.publish-inline-toggle {
  min-width: 0;
  height: 32px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-muted) 70%, var(--card-bg));
  cursor: pointer;
}

.publish-scope-permissions.disabled .publish-inline-toggle {
  cursor: not-allowed;
}

.publish-inline-toggle > span {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 760;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-scope-option strong,
.publish-toggle strong,
.publish-footer-summary strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 850;
  line-height: 1.35;
}

.publish-toggle {
  min-height: 42px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--surface-muted);
}

.publish-toggle.disabled {
  opacity: 0.58;
}

.publish-toggle > span {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.identity-toggle small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-switch-slot {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.publish-author-card input,
.publish-toggle input,
.publish-inline-toggle input {
  width: 40px;
  height: 23px;
  position: relative;
  appearance: none;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--border-color);
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.publish-author-card input::after,
.publish-toggle input::after,
.publish-inline-toggle input::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  transition: transform 0.16s ease;
}

.publish-author-card input:checked,
.publish-toggle input:checked,
.publish-inline-toggle input:checked {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.publish-author-card input:checked::after,
.publish-toggle input:checked::after,
.publish-inline-toggle input:checked::after {
  transform: translateX(17px);
}

.publish-author-card input:disabled,
.publish-toggle input:disabled,
.publish-inline-toggle input:disabled {
  cursor: not-allowed;
}

.publish-footer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding: 14px 0 16px;
  border-top: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--card-bg) 94%, transparent);
  backdrop-filter: blur(10px);
}

.publish-footer-summary {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.publish-footer-summary span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.publish-draft-btn {
  padding: 0 13px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--card-bg);
}

.publish-primary-btn {
  padding: 0 16px;
  color: #fff;
  background: var(--primary-color);
}

.publish-draft-btn:hover:not(:disabled) {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.publish-primary-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary-color) 88%, #000);
}

.publish-draft-btn:disabled,
.publish-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.detail-back-btn:focus-visible,
.use-skill-btn:focus-visible,
.edit-cancel-btn:focus-visible,
.edit-save-btn:focus-visible,
.detail-icon-btn:focus-visible,
.detail-view-switch button:focus-visible,
.tree-heading:focus-visible,
.tree-child:focus-visible,
.tree-file:focus-visible,
.publish-icon-preview:focus-visible,
.publish-scope-option:focus-visible,
.publish-author-card input:focus-visible,
.publish-inline-toggle input:focus-visible,
.publish-toggle input:focus-visible,
.publish-draft-btn:focus-visible,
.publish-primary-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .skill-detail-shell,
  .page-layout .skill-detail-shell {
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .publish-identity-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .publish-skill-info-group,
  .publish-author-info-group {
    grid-template-columns: 106px minmax(0, 1fr);
  }

  .publish-scope-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .detail-header,
  .page-layout .detail-header {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .detail-title-copy h2 {
    white-space: normal;
  }

  .detail-actions {
    flex-wrap: wrap;
    padding-top: 0;
  }

  .skill-detail-shell,
  .page-layout .skill-detail-shell {
    height: auto;
    grid-template-columns: 1fr;
  }

  .detail-tree {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .doc-pre,
  .doc-editor {
    min-height: 460px;
    padding: 24px 18px 34px;
  }

  .skill-publish-panel {
    padding: 18px 16px 0;
  }

  .publish-identity-row {
    grid-template-columns: 1fr;
  }

  .publish-skill-info-group,
  .publish-author-info-group {
    grid-template-columns: 1fr;
  }

  .publish-footer {
    grid-template-columns: 1fr;
  }

  .publish-footer-actions {
    width: 100%;
  }

  .publish-draft-btn,
  .publish-primary-btn {
    flex: 1;
  }
}
</style>
