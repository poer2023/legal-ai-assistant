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
  Upload,
} from 'lucide-vue-next';
import {
  addPersonalSkill,
  isSkillAvailable,
  isRecommendedSkill,
  upsertCustomSkill,
  type SkillCatalogItem,
  type SkillFile,
} from '../data/skillCatalog';

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
type SkillPublishVisibility = 'personal' | 'group' | 'team';
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
  description: string;
  visibility: SkillPublishVisibility;
  scopePermissions: Record<ShareablePublishVisibility, SkillPublishPermissionSettings>;
};

const defaultPublisherName = '涌见AI';
const skillPublishSettingsStorageKey = 'legal-version-skill-publish-settings';

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
];
const defaultPublishVisibilityOption = publishVisibilityOptions[0]!;

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
  description: '',
  visibility: 'personal',
  scopePermissions: {
    group: createDefaultPublishPermission(),
    team: createDefaultPublishPermission(),
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

const panelClass = computed(() => `${props.layout}-layout`);

type StoredPublishSettings = Partial<Omit<SkillPublishSettings, 'visibility' | 'scopePermissions'>> & {
  visibility?: SkillPublishVisibility | 'public';
  scopePermissions?: Partial<Record<ShareablePublishVisibility, Partial<SkillPublishPermissionSettings>>>;
} & Partial<SkillPublishPermissionSettings>;

const isShareablePublishVisibility = (value: unknown): value is ShareablePublishVisibility =>
  value === 'group' || value === 'team';

const isPublishVisibility = (value: unknown): value is SkillPublishVisibility =>
  value === 'personal' || isShareablePublishVisibility(value);

const normalizeStoredPublishVisibility = (value: unknown): SkillPublishVisibility | '' => {
  if (value === 'public') return 'group';
  return isPublishVisibility(value) ? value : '';
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
  const storedVisibility = normalizeStoredPublishVisibility(stored.visibility);
  const visibility = storedVisibility || 'personal';
  const storedScopePermissions = stored.scopePermissions && typeof stored.scopePermissions === 'object'
    ? stored.scopePermissions
    : {};
  const legacyPermission = normalizePublishPermission(stored);
  const createPermissionForVisibility = (option: ShareablePublishVisibility) => {
    const scopedPermission = storedScopePermissions[option];
    if (scopedPermission && typeof scopedPermission === 'object') {
      return normalizePublishPermission(scopedPermission);
    }
    if (storedVisibility === option && hasLegacyPublishPermission(stored)) {
      return legacyPermission;
    }
    return createDefaultPublishPermission();
  };

  return {
    iconDataUrl: typeof stored.iconDataUrl === 'string' ? stored.iconDataUrl : '',
    name: typeof stored.name === 'string' && stored.name.trim() ? stored.name : skill.name,
    description: typeof stored.description === 'string' && stored.description.trim()
      ? stored.description
      : skill.description,
    visibility,
    scopePermissions: {
      group: createPermissionForVisibility('group'),
      team: createPermissionForVisibility('team'),
    },
  };
};

const currentPublishVisibility = computed(() =>
  publishVisibilityOptions.find((option) => option.id === publishSettings.value.visibility)
    ?? defaultPublishVisibilityOption
);

const activePublishPermission = computed(() => {
  const { visibility, scopePermissions } = publishSettings.value;
  return isShareablePublishVisibility(visibility) ? scopePermissions[visibility] : null;
});

const publishSettingsSummary = computed(() => {
  const permissionSettings = activePublishPermission.value;
  if (!permissionSettings) return '仅保存在个人技能区，无需设置范围内权限';

  const permission = permissionSettings.allowCopy
    ? permissionSettings.allowRemix ? '允许查看详情和自行编辑' : '允许查看详情'
    : '不允许查看详情';
  const publisher = permissionSettings.showPublisherName
    ? `显示发布者：${permissionSettings.publisherName || defaultPublisherName}`
    : '隐藏发布者';
  return `${currentPublishVisibility.value.label} · ${permission} · ${publisher}`;
});

const publishIconFallback = computed(() =>
  (publishSettings.value.name || props.skill.name || '技').trim().slice(0, 1).toUpperCase()
);

const canSavePublishSettings = computed(() =>
  Boolean(publishSettings.value.name.trim() && publishSettings.value.description.trim())
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
  emit('use', props.skill.name);
  setStatus(`${props.skill.name} 已选择`);
};

const addSkill = () => {
  const didAdd = addPersonalSkill(props.skill.id);
  setStatus(didAdd ? `${props.skill.name} 已添加` : `${props.skill.name} 已添加`);
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

const updateActivePublishPermission = (patch: Partial<SkillPublishPermissionSettings>) => {
  const { visibility, scopePermissions } = publishSettings.value;
  if (!isShareablePublishVisibility(visibility)) return;
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

const handleActivePermissionCopyChange = (event: Event) => {
  const allowCopy = (event.target as HTMLInputElement).checked;
  updateActivePublishPermission({
    allowCopy,
    allowRemix: allowCopy ? activePublishPermission.value?.allowRemix : false,
  });
};

const handleActivePermissionRemixChange = (event: Event) => {
  updateActivePublishPermission({
    allowRemix: (event.target as HTMLInputElement).checked,
  });
};

const handleActivePermissionPublisherVisibilityChange = (event: Event) => {
  updateActivePublishPermission({
    showPublisherName: (event.target as HTMLInputElement).checked,
  });
};

const handleActivePermissionPublisherNameInput = (event: Event) => {
  updateActivePublishPermission({
    publisherName: (event.target as HTMLInputElement).value,
  });
};

const normalizePublishSettings = (settings: SkillPublishSettings): SkillPublishSettings => ({
  ...settings,
  name: settings.name.trim(),
  description: settings.description.trim(),
  visibility: isPublishVisibility(settings.visibility) ? settings.visibility : 'personal',
  scopePermissions: {
    group: normalizePublishPermission(settings.scopePermissions.group),
    team: normalizePublishPermission(settings.scopePermissions.team),
  },
});

const formatPublishDestination = (visibility: SkillPublishVisibility) => {
  if (visibility === 'personal') return '仅自己';
  return publishVisibilityOptions.find((option) => option.id === visibility)?.label ?? '仅自己';
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
    description: settings.description,
    scope: mode === 'publish' && settings.visibility !== 'personal' ? 'team' : 'personal',
    status: mode === 'publish' ? 'active' : 'draft',
  });

  if (!updatedSkill) {
    setStatus('发布设置保存失败');
    return;
  }

  publishSettings.value = settings;
  writeStoredPublishSettings(updatedSkill.id, settings);
  emit('updated', updatedSkill);
  setStatus(
    mode === 'publish'
      ? `技能已发布到${formatPublishDestination(settings.visibility)}`
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
      status: 'active',
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
  ] as const,
  ([groupAllowCopy, teamAllowCopy]) => {
    const { group, team } = publishSettings.value.scopePermissions;
    if (
      (groupAllowCopy || !group.allowRemix)
      && (teamAllowCopy || !team.allowRemix)
    ) {
      return;
    }

    publishSettings.value = {
      ...publishSettings.value,
      scopePermissions: {
        group: groupAllowCopy ? group : { ...group, allowRemix: false },
        team: teamAllowCopy ? team : { ...team, allowRemix: false },
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
          <h2>{{ skill.name }}</h2>
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
        <button v-if="selectedSkillIsAdded" class="use-skill-btn" type="button" @click="useSkill">去使用</button>
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
          <div class="publish-icon-field">
            <button type="button" class="publish-icon-preview" aria-label="上传技能图标" @click="choosePublishIcon">
              <img v-if="publishSettings.iconDataUrl" :src="publishSettings.iconDataUrl" alt="" />
              <span v-else>{{ publishIconFallback }}</span>
            </button>
            <div class="publish-icon-actions">
              <button type="button" class="publish-small-action" @click="choosePublishIcon">
                <Upload :size="14" />
                上传图标
              </button>
              <button
                v-if="publishSettings.iconDataUrl"
                type="button"
                class="publish-small-action muted"
                @click="clearPublishIcon"
              >
                移除
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

          <label class="publish-field">
            <span>技能名称</span>
            <input v-model="publishSettings.name" type="text" maxlength="48" />
          </label>

          <label class="publish-field">
            <span>技能描述</span>
            <textarea v-model="publishSettings.description" rows="4" maxlength="360"></textarea>
          </label>
        </div>

        <div class="publish-section">
          <div class="publish-section-header">
            <strong>发布范围</strong>
            <span>{{ currentPublishVisibility.description }}</span>
          </div>
          <div class="publish-scope-list" role="radiogroup" aria-label="发布范围">
            <button
              v-for="option in publishVisibilityOptions"
              :key="option.id"
              type="button"
              class="publish-scope-option"
              :class="{ active: publishSettings.visibility === option.id }"
              role="radio"
              :aria-checked="publishSettings.visibility === option.id"
              @click="publishSettings.visibility = option.id"
            >
              <span class="publish-scope-check">
                <Check v-if="publishSettings.visibility === option.id" :size="14" />
              </span>
              <span>
                <strong>{{ option.label }}</strong>
                <small>{{ option.description }}</small>
              </span>
            </button>
          </div>
        </div>

        <div v-if="activePublishPermission" class="publish-section">
          <div class="publish-section-header">
            <strong>{{ currentPublishVisibility.label }}权限</strong>
            <span>这些开关只影响{{ currentPublishVisibility.permissionSubject }}对技能副本的使用方式。</span>
          </div>
          <label class="publish-toggle">
            <span>
              <strong>允许查看详情</strong>
              <small>{{ currentPublishVisibility.permissionSubject }}可以查看该技能详情和说明。</small>
            </span>
            <input
              :checked="activePublishPermission.allowCopy"
              type="checkbox"
              @change="handleActivePermissionCopyChange"
            />
          </label>
          <label class="publish-toggle" :class="{ disabled: !activePublishPermission.allowCopy }">
            <span>
              <strong>允许自行编辑</strong>
              <small>自行编辑副本，不修改原技能。</small>
            </span>
            <input
              :checked="activePublishPermission.allowRemix"
              type="checkbox"
              :disabled="!activePublishPermission.allowCopy"
              @change="handleActivePermissionRemixChange"
            />
          </label>
          <label class="publish-toggle">
            <span>
              <strong>显示发布者名称</strong>
              <small>在技能详情和共享列表中展示发布者。</small>
            </span>
            <input
              :checked="activePublishPermission.showPublisherName"
              type="checkbox"
              @change="handleActivePermissionPublisherVisibilityChange"
            />
          </label>
          <label v-if="activePublishPermission.showPublisherName" class="publish-field compact">
            <span>发布者名称</span>
            <input
              :value="activePublishPermission.publisherName"
              type="text"
              maxlength="32"
              @input="handleActivePermissionPublisherNameInput"
            />
          </label>
        </div>

        <div class="publish-footer">
          <div class="publish-footer-summary">
            <strong>{{ currentPublishVisibility.label }}</strong>
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

.detail-title-copy h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  gap: 16px;
}

.publish-icon-field {
  display: flex;
  align-items: center;
  gap: 14px;
}

.publish-icon-preview {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--primary-border);
  border-radius: 12px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 24px;
  font-weight: 900;
}

.publish-icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publish-icon-actions {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.publish-icon-input {
  display: none;
}

.publish-small-action,
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

.publish-small-action {
  padding: 0 10px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  background: var(--card-bg);
}

.publish-small-action:hover {
  color: var(--primary-color);
  border-color: var(--primary-border);
  background: var(--primary-soft);
}

.publish-small-action.muted {
  color: var(--text-muted);
}

.publish-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.publish-field span,
.publish-section-header strong {
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 850;
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
  height: 38px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.publish-scope-option {
  min-height: 104px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-main);
  background: var(--card-bg);
  text-align: left;
}

.publish-scope-option:hover,
.publish-scope-option.active {
  border-color: var(--primary-border);
  background: color-mix(in srgb, var(--primary-soft) 40%, var(--card-bg));
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

.publish-scope-option > span:last-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  min-height: 56px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 11px 12px;
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
  gap: 3px;
}

.publish-toggle input {
  width: 38px;
  height: 22px;
  position: relative;
  appearance: none;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--border-color);
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.publish-toggle input::after {
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

.publish-toggle input:checked {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.publish-toggle input:checked::after {
  transform: translateX(16px);
}

.publish-toggle input:disabled {
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
.publish-small-action:focus-visible,
.publish-scope-option:focus-visible,
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
