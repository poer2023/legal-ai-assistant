<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  Check,
  ChevronRight,
  Copy,
  FileText,
  Loader2,
} from 'lucide-vue-next';
import {
  type TemplateAsset,
  type TemplateDocumentSection,
} from '../data/legalAssets';
import { getMockSkillAuthor } from '../data/mockSkillAuthors';
import {
  publishTemplateToMarket,
  type TemplatePublishDestination,
} from '../data/templateCatalog';
import {
  getProfileAvatarStyle,
  getProfileAvatarText,
  getProfileDisplayName,
} from '../data/profileIdentity';
import { useOrgSession } from '../stores/orgSession';

type TemplateSectionId = string;
type DetailPreviewMode = 'template' | 'original';
type DetailPanelMode = 'preview' | 'publish';
type TemplateGenerationState = 'idle' | 'reading' | 'analyzing' | 'done' | 'error';
type TemplatePublishVisibility = 'personal' | TemplatePublishDestination;
type ShareableTemplatePublishVisibility = TemplatePublishDestination;
type OriginalTemplateFile = {
  fileName: string;
  fileSize: number;
  fileType: string;
  originalText: string;
};
type TemplatePublishPermissionSettings = {
  allowCopy: boolean;
  allowRemix: boolean;
};
type TemplatePublishSettings = {
  name: string;
  useProfileIdentity: boolean;
  description: string;
  visibilities: TemplatePublishVisibility[];
  scopePermissions: Record<ShareableTemplatePublishVisibility, TemplatePublishPermissionSettings>;
};

const props = withDefaults(
  defineProps<{
    template: TemplateAsset;
    layout?: 'page' | 'modal';
    generationState?: TemplateGenerationState;
    generationMessage?: string;
    originalFile?: OriginalTemplateFile;
  }>(),
  {
    layout: 'page',
    generationState: 'idle',
    generationMessage: '',
    originalFile: undefined,
  },
);

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'select', template: TemplateAsset): void;
}>();

const templatePublishSettingsStorageKey = 'legal-version-template-publish-settings';
const { currentUser } = useOrgSession();

const createDefaultTemplatePublishPermission = (): TemplatePublishPermissionSettings => ({
  allowCopy: false,
  allowRemix: false,
});

const publishVisibilityOptions: Array<{
  id: TemplatePublishVisibility;
  label: string;
  description: string;
}> = [
  { id: 'personal', label: '仅自己', description: '只保存在个人模板区，可随时继续调整。' },
  { id: 'group', label: '小组', description: '小组成员可以在模板库中查看和调用。' },
  { id: 'team', label: '本团队', description: '本团队成员可以在模板库中查看和调用。' },
  { id: 'public', label: '推荐', description: '公开后可进入推荐，更多用户可以发现和安装。' },
];

const activeSectionId = ref<TemplateSectionId>('section-0');
const activePreviewMode = ref<DetailPreviewMode>('template');
const detailPanelMode = ref<DetailPanelMode>('preview');
const publishSettings = ref<TemplatePublishSettings>({
  name: '',
  useProfileIdentity: true,
  description: '',
  visibilities: ['personal'],
  scopePermissions: {
    group: createDefaultTemplatePublishPermission(),
    team: createDefaultTemplatePublishPermission(),
    public: createDefaultTemplatePublishPermission(),
  },
});
const statusMessage = ref('');
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const panelClass = computed(() => `${props.layout}-layout`);
const hasOriginalFile = computed(() => Boolean(props.originalFile));
const isGenerating = computed(() =>
  props.generationState === 'reading' || props.generationState === 'analyzing'
);
const detailSummary = computed(() => {
  if (activePreviewMode.value === 'original' && props.originalFile) {
    return `原件已保留：${props.originalFile.fileName}。`;
  }

  if (isGenerating.value) {
    return props.generationMessage || '生成模板中，可先切换到原文件查看。';
  }

  return props.template.preview;
});
const originalTextPreview = computed(() => {
  const text = props.originalFile?.originalText.trim();
  return text || '原件已保留，当前格式暂无可读文本预览。';
});
const originalFileSizeLabel = computed(() => {
  const size = props.originalFile?.fileSize ?? 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
});

type StoredTemplatePublishSettings = Partial<Omit<TemplatePublishSettings, 'visibilities' | 'scopePermissions'>> & {
  visibility?: TemplatePublishVisibility;
  visibilities?: unknown;
  scopePermissions?: Partial<Record<ShareableTemplatePublishVisibility, Partial<TemplatePublishPermissionSettings>>>;
};

const isShareablePublishVisibility = (value: unknown): value is ShareableTemplatePublishVisibility =>
  value === 'group' || value === 'team' || value === 'public';

const isPublishVisibility = (value: unknown): value is TemplatePublishVisibility =>
  value === 'personal' || isShareablePublishVisibility(value);

const normalizePublishVisibilities = (value: unknown): TemplatePublishVisibility[] => {
  const values = Array.isArray(value) ? value : [value];
  const normalized = values.filter(isPublishVisibility);
  return Array.from(new Set(normalized.length ? normalized : ['personal']));
};

const normalizeTemplatePublishPermission = (
  permission: Partial<TemplatePublishPermissionSettings> | undefined,
): TemplatePublishPermissionSettings => {
  const allowCopy = Boolean(permission?.allowCopy);
  return {
    allowCopy,
    allowRemix: allowCopy && Boolean(permission?.allowRemix),
  };
};

const readStoredPublishSettings = (): Record<string, StoredTemplatePublishSettings> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(templatePublishSettingsStorageKey) || '{}');
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, StoredTemplatePublishSettings>
      : {};
  } catch {
    return {};
  }
};

const writeStoredPublishSettings = (templateId: string, settings: TemplatePublishSettings) => {
  if (typeof window === 'undefined' || !templateId) return;
  const stored = readStoredPublishSettings();
  stored[templateId] = settings;
  window.localStorage.setItem(templatePublishSettingsStorageKey, JSON.stringify(stored));
};

const createPublishSettingsForTemplate = (template: TemplateAsset): TemplatePublishSettings => {
  const stored = readStoredPublishSettings()[template.id] ?? {};
  const storedScopePermissions = stored.scopePermissions && typeof stored.scopePermissions === 'object'
    ? stored.scopePermissions
    : {};
  const createPermissionForVisibility = (visibility: ShareableTemplatePublishVisibility) =>
    normalizeTemplatePublishPermission(storedScopePermissions[visibility]);

  return {
    name: typeof stored.name === 'string' && stored.name.trim() ? stored.name : template.name,
    useProfileIdentity: typeof stored.useProfileIdentity === 'boolean' ? stored.useProfileIdentity : true,
    description: typeof stored.description === 'string' && stored.description.trim()
      ? stored.description
      : template.preview,
    visibilities: normalizePublishVisibilities(
      Array.isArray(stored.visibilities) ? stored.visibilities : stored.visibility,
    ),
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
    (option): option is typeof option & { id: ShareableTemplatePublishVisibility } =>
      isShareablePublishVisibility(option.id),
  )
);

const publishVisibilityDescription = computed(() =>
  selectedPublishVisibilityOptions.value.length
    ? `已选择 ${selectedPublishVisibilityOptions.value.map((option) => option.label).join('、')}，可同时发布到多个范围。`
    : '请选择至少一个发布范围。'
);

const templateFallbackAuthor = computed(() => getMockSkillAuthor(props.template.id, 9));
const templateAuthorName = computed(() =>
  publishSettings.value.useProfileIdentity
    ? getProfileDisplayName(currentUser.value)
    : templateFallbackAuthor.value.name
);
const templateAuthorAvatarText = computed(() =>
  publishSettings.value.useProfileIdentity
    ? getProfileAvatarText(currentUser.value)
    : templateFallbackAuthor.value.name.slice(0, 1).toUpperCase()
);
const templateAuthorAvatarStyle = computed(() =>
  publishSettings.value.useProfileIdentity
    ? getProfileAvatarStyle(currentUser.value)
    : { backgroundImage: `url("${templateFallbackAuthor.value.avatarUrl}")` }
);
const templateAuthorHasImage = computed(() =>
  publishSettings.value.useProfileIdentity
    ? Boolean(currentUser.value?.avatarDataUrl)
    : Boolean(templateFallbackAuthor.value.avatarUrl)
);
const templateAuthorSource = computed(() =>
  publishSettings.value.useProfileIdentity ? '来自个人中心' : '来自模板作者'
);

const publishSettingsSummary = computed(() => {
  const identity = publishSettings.value.useProfileIdentity
    ? `使用个人资料：${getProfileDisplayName(currentUser.value)} / ${publishSettings.value.name || props.template.name}`
    : `模板作者：${templateAuthorName.value} / ${publishSettings.value.name || props.template.name}`;
  const shareableLabels = selectedShareablePublishOptions.value.map((option) => option.label);
  if (!shareableLabels.length) return `仅保存在个人模板区 · ${identity}`;

  return `发布到：${shareableLabels.join('、')} · ${identity}`;
});

const canSavePublishSettings = computed(() =>
  Boolean(publishSettings.value.name.trim() && publishSettings.value.description.trim())
);

const createFallbackDocumentSections = (template: TemplateAsset): TemplateDocumentSection[] => [
  {
    title: '模板说明',
    paragraphs: [template.preview],
  },
  {
    title: '填写字段',
    table: {
      headers: ['序号', '字段名称', '填写状态'],
      rows: template.requiredFields.map((field, index) => [
        `${index + 1}`,
        field,
        '待填写',
      ]),
    },
  },
  {
    title: '适用能力',
    items: template.applicableSkills,
  },
  {
    title: '标签约束',
    items: template.tags,
  },
];

const activeDocumentSections = computed<TemplateDocumentSection[]>(() =>
  props.template.documentSections ?? createFallbackDocumentSections(props.template)
);

const documentSections = computed<Array<{ id: TemplateSectionId; title: string }>>(() =>
  activeDocumentSections.value.map((section, index) => ({
    id: `section-${index}`,
    title: section.title,
  }))
);

const stringifySection = (section: TemplateDocumentSection) => {
  const tableRows = section.table
    ? [
        section.table.headers.join(' | '),
        ...section.table.rows.map((row) => row.join(' | ')),
      ]
    : [];

  return [
    section.title,
    ...(section.paragraphs ?? []),
    ...(section.items ?? []).map((item) => `- ${item}`),
    ...tableRows,
  ].join('\n');
};

const templateDocumentText = computed(() => [
  props.template.name,
  '',
  `文档类型：${props.template.docType}`,
  `来源：${props.template.source}`,
  `关联能力：${props.template.agent}`,
  `更新时间：${props.template.updatedAt}`,
  ...activeDocumentSections.value.flatMap((section) => ['', stringifySection(section)]),
].join('\n'));

const sectionElementId = (sectionId: TemplateSectionId) =>
  `template-document-${props.template.id}-${sectionId}`;

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

const copyTemplateDocument = () => {
  if (activePreviewMode.value === 'original' && props.originalFile) {
    void copyText(originalTextPreview.value, props.originalFile.fileName);
    return;
  }

  void copyText(templateDocumentText.value, props.template.name);
};

const selectTemplate = () => {
  if (isGenerating.value) {
    setStatus('模板生成中，完成后可使用');
    return;
  }

  emit('select', props.template);
  setStatus(`${props.template.name} 已选择`);
};

const isPublishVisibilitySelected = (visibility: TemplatePublishVisibility) =>
  publishSettings.value.visibilities.includes(visibility);

const isScopePermissionEnabled = (visibility: TemplatePublishVisibility) =>
  isShareablePublishVisibility(visibility) && isPublishVisibilitySelected(visibility);

const getScopePermission = (visibility: TemplatePublishVisibility) =>
  isShareablePublishVisibility(visibility)
    ? publishSettings.value.scopePermissions[visibility]
    : null;

const isScopePermissionAllowCopy = (visibility: TemplatePublishVisibility) =>
  Boolean(getScopePermission(visibility)?.allowCopy);

const isScopePermissionAllowRemix = (visibility: TemplatePublishVisibility) =>
  Boolean(getScopePermission(visibility)?.allowRemix);

const updatePublishPermission = (
  visibility: ShareableTemplatePublishVisibility,
  patch: Partial<TemplatePublishPermissionSettings>,
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

const handleScopePermissionCopyChange = (visibility: TemplatePublishVisibility, event: Event) => {
  if (!isShareablePublishVisibility(visibility)) return;
  const allowCopy = (event.target as HTMLInputElement).checked;
  updatePublishPermission(visibility, {
    allowCopy,
    allowRemix: allowCopy ? publishSettings.value.scopePermissions[visibility].allowRemix : false,
  });
};

const handleScopePermissionRemixChange = (visibility: TemplatePublishVisibility, event: Event) => {
  if (!isShareablePublishVisibility(visibility)) return;
  updatePublishPermission(visibility, {
    allowRemix: (event.target as HTMLInputElement).checked,
  });
};

const togglePublishVisibility = (visibility: TemplatePublishVisibility) => {
  const current = publishSettings.value.visibilities;
  const next = current.includes(visibility)
    ? current.filter((item) => item !== visibility)
    : [...current, visibility];

  publishSettings.value = {
    ...publishSettings.value,
    visibilities: normalizePublishVisibilities(next),
  };
};

const normalizePublishSettings = (settings: TemplatePublishSettings): TemplatePublishSettings => ({
  ...settings,
  name: settings.name.trim(),
  description: settings.description.trim(),
  useProfileIdentity: Boolean(settings.useProfileIdentity),
  visibilities: normalizePublishVisibilities(settings.visibilities),
  scopePermissions: {
    group: normalizeTemplatePublishPermission(settings.scopePermissions.group),
    team: normalizeTemplatePublishPermission(settings.scopePermissions.team),
    public: normalizeTemplatePublishPermission(settings.scopePermissions.public),
  },
});

const formatPublishDestinations = (visibilities: TemplatePublishVisibility[]) => {
  const labels = publishVisibilityOptions
    .filter((option) => visibilities.includes(option.id))
    .map((option) => option.label);
  return labels.length ? labels.join('、') : '未选择范围';
};

const saveTemplatePublishSettings = (mode: 'draft' | 'publish') => {
  const settings = normalizePublishSettings(publishSettings.value);

  if (!settings.name || !settings.description) {
    setStatus('请补全模板名称和描述');
    return;
  }

  publishSettings.value = settings;
  writeStoredPublishSettings(props.template.id, settings);
  if (mode === 'publish') {
    const destinations = settings.visibilities.filter(isShareablePublishVisibility);
    if (destinations.length) {
      publishTemplateToMarket(props.template.id, destinations);
    }
  }
  setStatus(
    mode === 'publish'
      ? `模板已发布到${formatPublishDestinations(settings.visibilities)}`
      : '模板发布设置已保存为草稿',
  );
};

const scrollToSection = (sectionId: TemplateSectionId) => {
  activeSectionId.value = sectionId;
  void nextTick(() => {
    document
      .getElementById(sectionElementId(sectionId))
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
};

watch(
  () => props.template,
  (template) => {
    activeSectionId.value = 'section-0';
    activePreviewMode.value = 'template';
    detailPanelMode.value = 'preview';
    publishSettings.value = createPublishSettingsForTemplate(template);
  },
  { immediate: true },
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
  hasOriginalFile,
  (value) => {
    if (!value) activePreviewMode.value = 'template';
  },
);

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
});
</script>

<template>
  <section class="template-detail-panel" :class="panelClass">
    <header class="detail-header">
      <div class="detail-heading-row">
        <div class="detail-title-area">
          <button class="detail-back-btn" type="button" aria-label="返回模板列表" @click="emit('back')">
            <ChevronRight :size="17" class="back-chevron" />
          </button>
          <div class="detail-title-copy">
            <h2>{{ template.name }}</h2>
          </div>
        </div>
        <div class="detail-actions">
          <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
          <div class="detail-view-switch" role="tablist" aria-label="模板详情视图">
            <button
              type="button"
              role="tab"
              :class="{ active: detailPanelMode === 'preview' }"
              :aria-selected="detailPanelMode === 'preview'"
              @click="detailPanelMode = 'preview'"
            >
              预览
            </button>
            <button
              type="button"
              role="tab"
              :class="{ active: detailPanelMode === 'publish' }"
              :aria-selected="detailPanelMode === 'publish'"
              @click="detailPanelMode = 'publish'"
            >
              发布设置
            </button>
          </div>
          <div v-if="detailPanelMode === 'preview' && hasOriginalFile" class="detail-view-switch" aria-label="预览模式">
            <button
              type="button"
              :class="{ active: activePreviewMode === 'template' }"
              @click="activePreviewMode = 'template'"
            >
              模板
            </button>
            <button
              type="button"
              :class="{ active: activePreviewMode === 'original' }"
              @click="activePreviewMode = 'original'"
            >
              原件
            </button>
          </div>
          <button v-if="detailPanelMode === 'preview'" class="doc-action-btn" type="button" @click="copyTemplateDocument">
            <Copy :size="16" />
            <span>{{ activePreviewMode === 'original' ? '复制原件' : '复制正文' }}</span>
          </button>
          <button class="use-template-btn" type="button" :disabled="isGenerating" @click="selectTemplate">
            {{ isGenerating ? '生成中' : '使用模板' }}
          </button>
        </div>
      </div>
      <p class="detail-summary">{{ detailPanelMode === 'publish' ? publishSettingsSummary : detailSummary }}</p>
    </header>

    <div v-if="detailPanelMode === 'preview'" class="template-document-shell">
      <aside class="document-outline" aria-label="模板目录">
        <div class="outline-heading">
          <FileText :size="16" />
          <span>{{ activePreviewMode === 'original' ? '原件' : '目录' }}</span>
        </div>
        <template v-if="activePreviewMode === 'template'">
          <button
            v-for="section in documentSections"
            :key="section.id"
            class="outline-item"
            :class="{ active: activeSectionId === section.id }"
            type="button"
            @click="scrollToSection(section.id)"
          >
            <span>{{ section.title }}</span>
          </button>
        </template>
        <button v-else class="outline-item active" type="button">
          <span>原文件查看</span>
        </button>
      </aside>

      <main class="document-stage" aria-label="模板文档预览">
        <article v-if="activePreviewMode === 'template' && isGenerating" class="word-page generation-page">
          <section class="generation-state">
            <Loader2 :size="28" class="generation-spinner" />
            <span>生成模板中</span>
            <h1>{{ template.name }}</h1>
            <p>{{ generationMessage || 'AI 正在分析原件结构、字段和可复用正文。你可以先切换到原件查看。' }}</p>
          </section>
          <section class="document-section generation-skeleton" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <div></div>
            <div></div>
          </section>
        </article>

        <article v-else-if="activePreviewMode === 'original'" class="word-page original-word-page">
          <section class="document-section">
            <div class="doc-kicker">原件保留</div>
            <h1>{{ originalFile?.fileName || template.name }}</h1>
            <div class="doc-meta-grid original-meta-grid">
              <div>
                <span>文件名</span>
                <strong>{{ originalFile?.fileName || '-' }}</strong>
              </div>
              <div>
                <span>文件类型</span>
                <strong>{{ originalFile?.fileType || '未知' }}</strong>
              </div>
              <div>
                <span>文件大小</span>
                <strong>{{ originalFileSizeLabel }}</strong>
              </div>
            </div>
          </section>
          <section class="document-section">
            <h2>原文件内容</h2>
            <pre class="original-text">{{ originalTextPreview }}</pre>
          </section>
        </article>

        <article v-else class="word-page">
          <section class="document-section">
            <div class="doc-kicker">{{ template.docType }}</div>
            <h1>{{ template.name }}</h1>
            <div class="doc-meta-grid">
              <div>
                <span>来源</span>
                <strong>{{ template.source }}</strong>
              </div>
              <div>
                <span>关联能力</span>
                <strong>{{ template.agent }}</strong>
              </div>
              <div>
                <span>更新时间</span>
                <strong>{{ template.updatedAt }}</strong>
              </div>
            </div>
          </section>

          <section
            v-for="(section, index) in activeDocumentSections"
            :id="sectionElementId(`section-${index}`)"
            :key="`${template.id}-${section.title}`"
            class="document-section"
          >
            <h2>{{ section.title }}</h2>
            <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <ul v-if="section.items?.length" class="doc-list">
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
            <table v-if="section.table" class="field-table">
              <thead>
                <tr>
                  <th v-for="header in section.table.headers" :key="header">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in section.table.rows" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>
      </main>
    </div>

    <section v-else class="template-publish-shell" aria-label="模板发布设置">
      <div class="template-publish-panel">
        <div class="publish-section publish-identity-section">
          <div class="publish-identity-row">
            <label class="publish-field publish-name-field">
              <span>模板名称</span>
              <input v-model="publishSettings.name" type="text" maxlength="48" />
            </label>

            <label class="publish-author-info-group">
              <span class="publish-control-label">使用作者信息</span>
              <div class="publish-author-card">
                <div class="profile-identity-preview">
                  <span class="profile-identity-avatar" :style="templateAuthorAvatarStyle">
                    <span v-if="!templateAuthorHasImage">{{ templateAuthorAvatarText }}</span>
                  </span>
                  <span>
                    <strong>{{ templateAuthorName }}</strong>
                    <small>{{ templateAuthorSource }}</small>
                  </span>
                </div>
                <span class="publish-switch-slot">
                  <input v-model="publishSettings.useProfileIdentity" type="checkbox" />
                </span>
              </div>
            </label>
          </div>

          <label class="publish-field">
            <span>模板描述</span>
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
              @click="saveTemplatePublishSettings('draft')"
            >
              保存草稿
            </button>
            <button
              type="button"
              class="publish-primary-btn"
              :disabled="!canSavePublishSettings"
              @click="saveTemplatePublishSettings('publish')"
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
.template-detail-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-soft);
}

.template-detail-panel.modal-layout {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--card-bg);
}

.template-detail-panel.page-layout {
  flex: 1;
  min-height: 0;
  gap: 12px;
  background: transparent;
}

.detail-header {
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.modal-layout .detail-header {
  min-height: 128px;
  justify-content: center;
  gap: 12px;
  padding: 24px 28px 22px 24px;
}

.page-layout .detail-header {
  min-height: 72px;
  justify-content: flex-start;
  padding: 2px 0 4px;
  background: var(--bg-color);
  border-bottom: 0;
}

.detail-heading-row {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.detail-title-area {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.modal-layout .detail-title-area {
  flex: 1;
  align-items: flex-start;
  gap: 20px;
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

.modal-layout .detail-back-btn {
  width: 36px;
  height: 36px;
  margin-top: 1px;
  border-radius: 11px;
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

.modal-layout .detail-title-copy {
  display: grid;
  gap: 7px;
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

.modal-layout .detail-title-copy h2 {
  font-size: 22px;
  line-height: 1.16;
}

.detail-summary {
  max-width: 680px;
  margin: 0;
  padding-left: 42px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-layout .detail-summary {
  max-width: 780px;
  padding-left: 56px;
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

.modal-layout .detail-actions {
  align-self: center;
  padding-top: 0;
}

.detail-status {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.detail-view-switch {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface-muted);
}

.detail-view-switch button {
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.detail-view-switch button.active {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--text-strong) 7%, transparent);
}

.use-template-btn,
.doc-action-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 650;
}

.use-template-btn {
  color: var(--on-primary);
  background: var(--primary-color);
}

.use-template-btn:hover {
  background: var(--primary-hover);
}

.use-template-btn:disabled {
  cursor: default;
  opacity: 0.72;
}

.doc-action-btn {
  border: 1px solid var(--border-color);
  color: var(--text-strong);
  background: var(--card-bg);
}

.doc-action-btn:hover {
  background: var(--surface-soft);
}

.template-document-shell {
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow: hidden;
}

.modal-layout .template-document-shell {
  flex: 1;
  height: auto;
  min-height: 0;
  grid-template-columns: 210px minmax(0, 1fr);
}

.page-layout .template-document-shell {
  flex: 1;
  height: auto;
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.template-publish-shell {
  min-height: 520px;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
}

.modal-layout .template-publish-shell {
  flex: 1;
  min-height: 0;
  margin: 0 24px 24px;
  border-radius: 16px;
}

.page-layout .template-publish-shell {
  flex: 1;
  min-height: 0;
}

.template-publish-panel {
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
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.92fr);
  align-items: end;
  gap: 34px;
}

.publish-author-info-group {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  cursor: pointer;
}

.publish-control-label,
.publish-field > span,
.publish-section-header strong {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 850;
  line-height: 16px;
}

.publish-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  min-width: 0;
  width: 100%;
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
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
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-identity-preview small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11.5px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-section-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.publish-section-header span,
.publish-scope-option small,
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
  cursor: pointer;
  text-align: left;
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

.publish-scope-option strong,
.publish-footer-summary strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 850;
  line-height: 1.35;
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

.publish-switch-slot {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.publish-author-card input,
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
.publish-inline-toggle input:checked {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.publish-author-card input:checked::after,
.publish-inline-toggle input:checked::after {
  transform: translateX(17px);
}

.publish-author-card input:disabled,
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

.document-outline {
  min-height: 0;
  overflow: auto;
  padding: 20px 16px;
  border-right: 1px solid var(--border-color);
  background: var(--card-bg);
}

.page-layout .document-outline {
  background: var(--card-bg);
}

.outline-heading {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 8px;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.outline-heading svg {
  color: var(--primary-color);
}

.outline-item {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-left: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: left;
}

.outline-item:hover {
  color: var(--primary-hover);
  background: var(--bg-color);
}

.outline-item.active {
  border-left-color: var(--primary-color);
  color: var(--primary-hover);
  background: var(--primary-soft);
  font-weight: 650;
}

.document-stage {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px 40px;
  background: var(--border-soft);
}

.modal-layout .document-stage {
  height: 100%;
  padding: 24px 28px 36px;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0) 24px),
    var(--surface-muted);
}

.page-layout .document-stage {
  background: var(--surface-soft);
}

.word-page {
  width: min(760px, 100%);
  min-height: 980px;
  margin: 0 auto;
  padding: 64px 72px 80px;
  background: var(--card-bg);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.13);
  color: var(--text-strong);
  font-family: "Times New Roman", "Songti SC", "SimSun", serif;
}

.modal-layout .word-page {
  width: min(720px, 100%);
  min-height: 860px;
  padding: 52px 64px 72px;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);
}

.page-layout .word-page {
  width: min(720px, 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08), 0 18px 40px rgba(15, 23, 42, 0.08);
}

.generation-page {
  display: grid;
  align-content: start;
  gap: 44px;
}

.generation-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 48px 0 18px;
  text-align: center;
}

.generation-state span {
  color: var(--primary-color);
  font-family: var(--font-sans, inherit);
  font-size: 14px;
  font-weight: 750;
}

.generation-state p {
  max-width: 460px;
  color: var(--text-secondary);
  font-family: var(--font-sans, inherit);
  font-size: 14px;
  line-height: 1.7;
}

.generation-spinner {
  color: var(--primary-color);
  animation: spin 0.9s linear infinite;
}

.generation-skeleton {
  display: grid;
  gap: 12px;
}

.generation-skeleton span,
.generation-skeleton div {
  display: block;
  border-radius: 999px;
  background: var(--border-soft);
}

.generation-skeleton span {
  height: 12px;
}

.generation-skeleton span:nth-child(1) {
  width: 72%;
}

.generation-skeleton span:nth-child(2) {
  width: 58%;
}

.generation-skeleton span:nth-child(3) {
  width: 66%;
}

.generation-skeleton div {
  height: 86px;
  border-radius: 8px;
  background: var(--surface-muted);
}

.original-word-page {
  font-family: "Times New Roman", "Songti SC", "SimSun", serif;
}

.original-meta-grid strong {
  overflow-wrap: anywhere;
}

.original-text {
  max-height: 560px;
  margin: 0;
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.document-section {
  scroll-margin-top: 24px;
}

.document-section + .document-section {
  margin-top: 34px;
}

.doc-kicker {
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 14px;
  text-align: center;
}

.word-page h1 {
  margin: 0 0 28px;
  color: var(--text-strong);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.word-page h2 {
  margin: 0 0 14px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
}

.word-page p,
.doc-list {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.9;
}

.word-page p + p,
.word-page p + .field-table,
.doc-list + .field-table {
  margin-top: 10px;
}

.doc-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--border-color);
}

.doc-meta-grid div {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 12px;
  border-right: 1px solid var(--border-color);
}

.doc-meta-grid div:last-child {
  border-right: 0;
}

.doc-meta-grid span {
  color: var(--text-secondary);
  font-size: 13px;
}

.doc-meta-grid strong {
  color: var(--text-strong);
  font-size: 15px;
  line-height: 1.4;
}

.field-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text-strong);
  font-size: 15px;
  line-height: 1.6;
}

.field-table th,
.field-table td {
  padding: 9px 10px;
  border: 1px solid var(--border-color);
  text-align: left;
  vertical-align: top;
}

.field-table th {
  background: var(--surface-soft);
  font-weight: 700;
}

.field-table td:first-child,
.field-table th:first-child {
  width: 64px;
  text-align: center;
}

.field-table td:last-child,
.field-table th:last-child {
  width: 96px;
}

.doc-list {
  padding-left: 22px;
}

.doc-list li + li {
  margin-top: 4px;
}

.detail-back-btn:focus-visible,
.use-template-btn:focus-visible,
.doc-action-btn:focus-visible,
.detail-view-switch button:focus-visible,
.outline-item:focus-visible,
.publish-scope-option:focus-visible,
.publish-author-card input:focus-visible,
.publish-inline-toggle input:focus-visible,
.publish-draft-btn:focus-visible,
.publish-primary-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .template-document-shell,
  .page-layout .template-document-shell {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .publish-identity-row,
  .publish-scope-list {
    grid-template-columns: 1fr;
  }

  .document-outline {
    max-height: 176px;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .document-stage {
    padding: 18px 14px 28px;
  }

  .word-page {
    min-height: 780px;
    padding: 42px 28px 54px;
  }

  .doc-meta-grid {
    grid-template-columns: 1fr;
  }

  .doc-meta-grid div {
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .doc-meta-grid div:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 640px) {
  .detail-header,
  .page-layout .detail-header {
    gap: 12px;
  }

  .detail-heading-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .detail-title-copy h2 {
    white-space: normal;
  }

  .detail-summary,
  .modal-layout .detail-summary {
    padding-left: 0;
    white-space: normal;
  }

  .detail-actions {
    flex-wrap: wrap;
    padding-top: 0;
  }

  .template-publish-panel {
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
