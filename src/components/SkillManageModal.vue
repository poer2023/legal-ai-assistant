<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  UsersRound,
  X,
} from 'lucide-vue-next';
import {
  addPersonalSkill,
  groupSharedSkills as catalogGroupSharedSkills,
  isSkillEnabled,
  isSkillAvailable,
  markSkillUsed,
  officialRecommendedSkills,
  personalSkills,
  publicHubSkills as catalogPublicHubSkills,
  publishSkillToTeamMarket,
  removePersonalSkill,
  setSkillEnabled,
  teamSharedSkills,
  upsertCustomSkill,
  type SkillCatalogItem,
  type SkillFile,
  type SkillPublishDestination,
} from '../data/skillCatalog';
import { getSkillAvatarStyle } from '../data/skillAvatars';
import { createSkillWithSkillCreator } from '../services/skillCreator';
import LibraryTypeDropdown from './LibraryTypeDropdown.vue';

const props = withDefaults(defineProps<{
  startInCreate?: boolean;
  createBehavior?: 'inline' | 'emit';
}>(), {
  startInCreate: false,
  createBehavior: 'inline',
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'create'): void;
  (event: 'use', skillName?: string): void;
}>();

const router = useRouter();
type SkillListPage = 'personal' | 'group-shared' | 'team-shared' | 'public-hub' | 'recommended';

const selectedSkill = ref<SkillCatalogItem | null>(null);
const activeListPage = ref<SkillListPage>('personal');
const modalSearchKeyword = ref('');
const selectedListCategory = ref('全部');
const isCreateMode = ref(false);
const activeFileId = ref('');
const expandedTreeKeys = ref<Record<string, boolean>>({});
const editMode = ref(false);
const editBuffer = ref('');
const fileDrafts = ref<Record<string, string>>({});
const statusMessage = ref('');
const openCardMenuId = ref<string | null>(null);
const createBrief = ref('');
const createScenario = ref('合同 / 交易文件');
const createSource = ref('上传或粘贴项目材料');
const createOutput = ref('Word 文书初稿');
const createScope = ref<'personal' | 'team'>('personal');
const createError = ref('');
const isGeneratingDraft = ref(false);
let statusTimer: ReturnType<typeof setTimeout> | null = null;

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

const skillListPageCopy: Record<SkillListPage, { name: string; empty: string }> = {
  personal: { name: '我的技能', empty: '暂无匹配技能' },
  'group-shared': { name: '小组共享', empty: '暂无小组共享技能' },
  'team-shared': { name: '团队共享', empty: '暂无团队共享技能' },
  'public-hub': { name: '公共库', empty: '暂无公开共享技能' },
  recommended: { name: '官方推荐', empty: '暂无官方推荐技能' },
};

const shouldShowCategoryFilter = computed(() => activeListPage.value === 'recommended');
const activeListSkills = computed(() =>
  ({
    personal: personalSkills.value,
    'group-shared': catalogGroupSharedSkills.value,
    'team-shared': teamSharedSkills.value,
    'public-hub': catalogPublicHubSkills.value,
    recommended: officialRecommendedSkills,
  })[activeListPage.value],
);

const sourceTabs = computed(() => [
  { key: 'personal' as const, name: skillListPageCopy.personal.name, count: personalSkills.value.length },
  { key: 'group-shared' as const, name: skillListPageCopy['group-shared'].name, count: catalogGroupSharedSkills.value.length },
  { key: 'team-shared' as const, name: skillListPageCopy['team-shared'].name, count: teamSharedSkills.value.length },
  { key: 'public-hub' as const, name: skillListPageCopy['public-hub'].name, count: catalogPublicHubSkills.value.length },
  { key: 'recommended' as const, name: skillListPageCopy.recommended.name, count: officialRecommendedSkills.length },
]);

const activeListCategoryOptions = computed(() => {
  const counts = new Map<string, number>();
  activeListSkills.value.forEach((skill) => {
    counts.set(skill.category, (counts.get(skill.category) ?? 0) + 1);
  });

  return [
    { name: '全部', count: activeListSkills.value.length },
    ...Array.from(counts, ([name, count]) => ({ name, count })).sort((left, right) =>
      left.name.localeCompare(right.name, 'zh-Hans-CN'),
    ),
  ];
});

const visibleListSkills = computed(() => {
  const keyword = modalSearchKeyword.value.trim().toLowerCase();

  return activeListSkills.value.filter((skill) => {
    const matchesCategory =
      !shouldShowCategoryFilter.value ||
      selectedListCategory.value === '全部' ||
      skill.category === selectedListCategory.value;
    const searchable = [
      skill.name,
      skill.description,
      skill.category,
      ...skill.tags,
      ...skill.files.map((file) => `${file.name} ${file.path}`),
    ]
      .join(' ')
      .toLowerCase();

    return matchesCategory && (!keyword || searchable.includes(keyword));
  });
});

const getUsedAtTime = (skill: SkillCatalogItem) => {
  if (!skill.lastUsedAt) return 0;
  const time = Date.parse(skill.lastUsedAt);
  return Number.isNaN(time) ? 0 : time;
};

const mostUsedListSkills = computed(() => {
  const activePersonalSkills = personalSkills.value.filter(isSkillEnabled);
  const originalIndex = new Map(activePersonalSkills.map((skill, index) => [skill.id, index]));
  return [...activePersonalSkills]
    .sort((left, right) => {
      const usageDelta = (right.usageCount ?? 0) - (left.usageCount ?? 0);
      if (usageDelta) return usageDelta;

      const timeDelta = getUsedAtTime(right) - getUsedAtTime(left);
      if (timeDelta) return timeDelta;

      return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
    })
    .slice(0, 3);
});

const getSkillUsageMeta = (skill: SkillCatalogItem) =>
  isSkillEnabled(skill)
    ? skill.usageCount && skill.usageCount > 0 ? `${skill.usageCount} 次使用` : '可直接调用'
    : '已停用，启用后可调用';

const activeListTitle = computed(() => {
  return skillListPageCopy[activeListPage.value].name;
});

const selectedFiles = computed(() => selectedSkill.value?.files ?? []);

const rootFile = computed(() =>
  selectedFiles.value.find((file) => file.path === 'SKILL.md') ?? selectedFiles.value[0] ?? null
);

const activeFile = computed(() => {
  if (!selectedFiles.value.length) return null;
  return selectedFiles.value.find((file) => file.id === activeFileId.value) ?? rootFile.value;
});

const activeFileContent = computed(() => {
  const file = activeFile.value;
  if (!selectedSkill.value || !file) return '';
  return fileDrafts.value[`${selectedSkill.value.id}:${file.id}`] ?? file.content;
});

const activeFileParentPath = computed(() => {
  const path = activeFile.value?.path ?? '';
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? `${path.slice(0, lastSlash)}/` : '';
});

const activeFileName = computed(() => activeFile.value?.name ?? '');

const treeGroups = computed<TreeGroup[]>(() => {
  const groupMap = new Map<string, { files: SkillFile[]; folderMap: Map<string, SkillFile[]> }>();

  selectedFiles.value
    .filter((file) => file.path !== 'SKILL.md')
    .forEach((file) => {
      const parts = file.path.split('/');
      const groupName = parts[0] ?? 'files';
      const folderName = parts.length > 2 ? parts[1] : '';
      const group = groupMap.get(groupName) ?? { files: [], folderMap: new Map<string, SkillFile[]>() };

      if (folderName) {
        const folderFiles = group.folderMap.get(folderName) ?? [];
        folderFiles.push(file);
        group.folderMap.set(folderName, folderFiles);
      } else {
        group.files.push(file);
      }

      groupMap.set(groupName, group);
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
  selectedSkill.value && activeFile.value ? `${selectedSkill.value.id}:${activeFile.value.id}` : ''
);

const selectedSkillIsAdded = computed(() =>
  selectedSkill.value ? isSkillAvailable(selectedSkill.value.id) : false
);

const selectedSkillIsEnabled = computed(() =>
  selectedSkill.value ? isSkillEnabled(selectedSkill.value) : false
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

const isExpanded = (key: string) => expandedTreeKeys.value[key] !== false;

const toggleExpanded = (key: string) => {
  expandedTreeKeys.value = {
    ...expandedTreeKeys.value,
    [key]: !isExpanded(key),
  };
};

const resetDetailState = (skill: SkillCatalogItem) => {
  const firstFile = skill.files.find((file) => file.path === 'SKILL.md') ?? skill.files[0];
  activeFileId.value = firstFile?.id ?? '';
  editMode.value = false;
  editBuffer.value = '';
  openCardMenuId.value = null;

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

const setListPage = (page: SkillListPage) => {
  activeListPage.value = page;
  selectedListCategory.value = '全部';
  selectedSkill.value = null;
  isCreateMode.value = false;
  activeFileId.value = '';
  editMode.value = false;
  editBuffer.value = '';
  openCardMenuId.value = null;
};

const selectFile = (file: SkillFile) => {
  activeFileId.value = file.id;
  editMode.value = false;
  editBuffer.value = '';
};

const closeModal = () => {
  emit('close');
};

const createSkill = () => {
  isCreateMode.value = true;
  selectedSkill.value = null;
  editMode.value = false;
  editBuffer.value = '';
  createError.value = '';
};

const handleCreateSkillAction = () => {
  if (props.createBehavior === 'emit') {
    emit('create');
    return;
  }

  createSkill();
};

const useSkill = (skillName?: string, skillId?: string) => {
  const skill = skillId
    ? personalSkills.value.find((item) => item.id === skillId)
    : selectedSkill.value;
  if (skill && !isSkillEnabled(skill)) {
    setStatus(`${skill.name} 已停用，请先启用后再使用`);
    return;
  }

  if (skillId) {
    markSkillUsed(skillId);
  } else if (selectedSkill.value) {
    markSkillUsed(selectedSkill.value.id);
  }
  emit('use', skillName ?? selectedSkill.value?.name);
};

const openSkill = (skill: SkillCatalogItem) => {
  selectedSkill.value = skill;
  resetDetailState(skill);
};

const backToList = () => {
  selectedSkill.value = null;
  isCreateMode.value = false;
  activeFileId.value = '';
  editMode.value = false;
  editBuffer.value = '';
};

const toggleCardMenu = (skillId: string) => {
  openCardMenuId.value = openCardMenuId.value === skillId ? null : skillId;
};

const closeCardMenuOnOutsideClick = (event: MouseEvent) => {
  if (!openCardMenuId.value) return;
  const target = event.target;
  if (target instanceof Element && target.closest('.card-action-menu, .card-more-btn')) return;
  openCardMenuId.value = null;
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
  if (!selectedSkill.value) return;
  downloadText(`${selectedSkill.value.name}-skill-bundle.md`, createSkillBundleContent(selectedSkill.value));
};

const downloadSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  downloadText(`${skill.name}-skill-bundle.md`, createSkillBundleContent(skill));
};

const editSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  closeModal();
  void router.push({
    name: 'skills',
    query: {
      skillMode: activeListPage.value,
      skillId: skill.id,
      edit: '1',
      skillTick: Date.now().toString(),
    },
  });
};

const isSkillAdded = (skill: SkillCatalogItem) => isSkillAvailable(skill.id);

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addPersonalSkill(skill.id);
  setStatus(didAdd ? `${skill.name} 已安装到我的技能` : `${skill.name} 已在我的技能中`);
};

const installSkill = (skill: SkillCatalogItem) => {
  if (activeListPage.value === 'recommended') {
    addSkill(skill);
    return;
  }
  setStatus(`${skill.name} 已安装到我的技能`);
};

const isInstallDisabled = (skill: SkillCatalogItem) =>
  activeListPage.value === 'recommended' && isSkillAdded(skill);

const installButtonLabel = (skill: SkillCatalogItem) =>
  isInstallDisabled(skill) ? '已安装' : '安装';

const setSkillOpen = (skill: SkillCatalogItem, enabled: boolean) => {
  const updatedSkill = setSkillEnabled(skill.id, enabled);
  if (selectedSkill.value?.id === skill.id && updatedSkill) {
    selectedSkill.value = updatedSkill;
  }
  openCardMenuId.value = null;
  setStatus(`${skill.name} 已${enabled ? '启用' : '停用'}`);
};

const publishDestinationLabels: Record<SkillPublishDestination, string> = {
  group: '小组共享',
  team: '团队共享',
  public: '公共库',
};

const publishSkill = (skill: SkillCatalogItem, destination: SkillPublishDestination) => {
  const didPublish = publishSkillToTeamMarket(skill.id, destination);
  openCardMenuId.value = null;
  const label = publishDestinationLabels[destination];
  setStatus(didPublish ? `${skill.name} 已发布到${label}` : `${skill.name} 已在${label}中`);
};

const deleteSkill = (skill: SkillCatalogItem) => {
  const didRemove = removePersonalSkill(skill.id);
  openCardMenuId.value = null;
  setStatus(didRemove ? `${skill.name} 已删除` : '默认技能不可删除');
};

const startEditMode = () => {
  if (!activeFile.value || !currentFileKey.value) return;

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

  if (selectedSkill.value?.source === 'custom') {
    const updatedFiles = selectedSkill.value.files.map((file) =>
      file.id === activeFile.value?.id ? { ...file, content: editBuffer.value } : file
    );
    const updatedSkill = upsertCustomSkill({
      ...selectedSkill.value,
      files: updatedFiles,
      status: selectedSkill.value.status || 'active',
    });
    if (updatedSkill) {
      selectedSkill.value = updatedSkill;
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

const saveGeneratedSkill = (skill: SkillCatalogItem) => {
  const savedSkill = upsertCustomSkill({
    ...skill,
    scope: createScope.value,
    status: 'active',
  });
  if (!savedSkill) return;

  activeListPage.value = savedSkill.scope === 'team' ? 'team-shared' : 'personal';
  isCreateMode.value = false;
  openSkill(savedSkill);
  setStatus(`${savedSkill.name} 已创建`);
};

const generateDraft = async () => {
  const brief = createBrief.value.trim();
  if (!brief) {
    createError.value = '请先输入技能需求';
    return;
  }

  isGeneratingDraft.value = true;
  createError.value = '';

  try {
    const draft = await createSkillWithSkillCreator(brief, {
      scenario: createScenario.value,
      source: createSource.value,
      output: createOutput.value,
      scope: createScope.value === 'team' ? '团队共享' : '仅个人使用',
    });
    saveGeneratedSkill(draft);
  } catch (error) {
    createError.value = error instanceof Error ? error.message : '技能生成失败';
  } finally {
    isGeneratingDraft.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeCardMenuOnOutsideClick);
  if (props.startInCreate) {
    createSkill();
  }
});

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  document.removeEventListener('click', closeCardMenuOnOutsideClick);
});
</script>

<template>
  <div class="skill-modal-backdrop" @click.self="closeModal">
    <section
      class="skill-modal"
      :class="{ 'detail-mode': selectedSkill }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-modal-title"
    >
      <button class="modal-close-btn" type="button" aria-label="关闭技能弹窗" @click="closeModal">
        <X :size="24" :stroke-width="2.2" />
      </button>

      <header v-if="!selectedSkill" class="modal-header">
        <div v-if="isCreateMode" class="modal-create-heading">
          <button v-if="isCreateMode" class="list-back-btn" type="button" @click="backToList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>创建技能</span>
          </button>
        </div>
        <template v-else>
          <div class="modal-title-row">
            <h2 id="skill-modal-title">技能市场</h2>
          </div>

          <div class="modal-command-bar">
            <label class="modal-search-control">
              <Search :size="16" />
              <input v-model="modalSearchKeyword" type="text" placeholder="搜索技能、描述、标签" />
            </label>
            <button
              class="modal-create-btn"
              type="button"
              @click.stop="handleCreateSkillAction"
            >
              <Plus :size="16" />
              创建技能
            </button>
          </div>

          <div class="modal-source-switcher">
            <nav class="modal-tabs" aria-label="技能来源">
              <button
                v-for="tab in sourceTabs"
                :key="tab.key"
                class="modal-tab"
                :class="{ active: activeListPage === tab.key }"
                type="button"
                @click="setListPage(tab.key)"
              >
                <span>{{ tab.name }}</span>
                <strong>{{ tab.count }}</strong>
              </button>
            </nav>
          </div>

          <div v-if="activeListPage !== 'personal'" class="modal-result-toolbar">
            <div class="modal-result-title">
              <strong>{{ activeListTitle }}</strong>
              <span>{{ visibleListSkills.length }} 个技能</span>
            </div>
            <div class="modal-source-actions">
              <LibraryTypeDropdown
                v-if="shouldShowCategoryFilter"
                v-model="selectedListCategory"
                :options="activeListCategoryOptions"
                label="类型"
              />

              <div v-else class="modal-sort-segment" aria-label="排序">
                <button class="active" type="button">最近更新</button>
                <button type="button">安装量</button>
              </div>
            </div>
          </div>
          <span v-if="statusMessage" class="modal-status">{{ statusMessage }}</span>
        </template>
      </header>

      <section v-if="isCreateMode" class="create-skill-panel" aria-label="创建技能">
        <div class="create-form-grid">
          <label class="create-field create-field-wide">
            <span>技能需求</span>
            <textarea
              v-model="createBrief"
              placeholder="例如：创建一个买方并购协议审查技能，重点识别交易结构、陈述保证、交割条件、赔偿责任和目标公司风险。"
            ></textarea>
          </label>

          <label class="create-field">
            <span>工作场景</span>
            <select v-model="createScenario">
              <option>合同 / 交易文件</option>
              <option>尽职调查</option>
              <option>咨询意见</option>
              <option>投融资 / 并购</option>
              <option>基金 / 合规</option>
            </select>
          </label>

          <label class="create-field">
            <span>输入来源</span>
            <select v-model="createSource">
              <option>上传或粘贴项目材料</option>
              <option>团队知识库</option>
              <option>现有模板 / 技能</option>
              <option>纯文字描述规则</option>
            </select>
          </label>

          <label class="create-field">
            <span>稳定输出</span>
            <select v-model="createOutput">
              <option>Word 文书初稿</option>
              <option>审查清单</option>
              <option>风险矩阵 / 问题表</option>
              <option>工作步骤 / 操作规程</option>
              <option>模板 / 条款库</option>
            </select>
          </label>

          <label class="create-field">
            <span>保存范围</span>
            <select v-model="createScope">
              <option value="personal">我的技能</option>
              <option value="team">团队共享</option>
            </select>
          </label>
        </div>

        <p v-if="createError" class="create-error">{{ createError }}</p>

        <div class="create-actions">
          <button class="edit-cancel-btn" type="button" @click="backToList">取消</button>
          <button class="edit-save-btn" type="button" :disabled="isGeneratingDraft" @click="generateDraft">
            {{ isGeneratingDraft ? '生成中...' : '生成并保存技能' }}
          </button>
        </div>
      </section>

      <p v-if="!selectedSkill && !isCreateMode && !visibleListSkills.length" class="empty-list">
        {{ skillListPageCopy[activeListPage].empty }}
      </p>

      <template v-else-if="!selectedSkill && !isCreateMode">
        <section
          v-if="activeListPage === 'personal' && mostUsedListSkills.length"
          class="modal-frequent-section"
          aria-label="最常使用技能"
        >
          <header class="modal-frequent-header">
            <strong>最常使用</strong>
            <span>按使用频率排序</span>
          </header>

          <div class="modal-frequent-list">
            <article
              v-for="skill in mostUsedListSkills"
              :key="`modal-frequent-${skill.id}`"
              class="modal-frequent-item"
              :class="{ 'menu-open': openCardMenuId === `modal-frequent-${skill.id}` }"
              role="button"
              tabindex="0"
              @click="openSkill(skill)"
              @keydown.enter.prevent="openSkill(skill)"
            >
              <span class="modal-frequent-avatar" :style="getSkillAvatarStyle(skill)" aria-hidden="true"></span>
              <span class="modal-frequent-copy">
                <strong>{{ skill.name }}</strong>
                <span>{{ getSkillUsageMeta(skill) }}</span>
              </span>
              <div class="modal-card-actions">
                <button
                  class="modal-card-use-btn"
                  type="button"
                  :aria-label="`使用${skill.name}`"
                  @click.stop="useSkill(skill.name, skill.id)"
                >
                  <Play :size="13" />
                  <span>使用</span>
                </button>
                <button
                  class="card-more-btn"
                  type="button"
                  :aria-label="`${skill.name} 更多操作`"
                  @click.stop="toggleCardMenu(`modal-frequent-${skill.id}`)"
                >
                  <MoreHorizontal :size="18" />
                </button>
              </div>

              <div v-if="openCardMenuId === `modal-frequent-${skill.id}`" class="card-action-menu" @click.stop>
                <button class="menu-action" type="button" @click="editSkill(skill)">
                  <Pencil :size="15" />
                  <span>编辑</span>
                </button>
                <button class="menu-action" type="button" @click="downloadSkill(skill)">
                  <Download :size="15" />
                  <span>下载</span>
                </button>
                <button class="menu-action" type="button" @click="setSkillOpen(skill, false)">
                  <PowerOff :size="15" />
                  <span>停用技能</span>
                </button>
                <div class="menu-submenu-item">
                  <button class="menu-action submenu-trigger" type="button">
                    <UsersRound :size="15" />
                    <span>发布</span>
                    <ChevronRight :size="14" class="submenu-chevron" />
                  </button>
                  <div class="publish-submenu" role="menu" aria-label="发布范围">
                    <button type="button" @click="publishSkill(skill, 'group')">发布到小组共享</button>
                    <button type="button" @click="publishSkill(skill, 'team')">发布到团队共享</button>
                    <button type="button" @click="publishSkill(skill, 'public')">发布到公共库</button>
                  </div>
                </div>
                <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
                  <Trash2 :size="15" />
                  <span>删除</span>
                </button>
              </div>
            </article>
          </div>
        </section>

        <div v-if="activeListPage === 'personal' && visibleListSkills.length" class="modal-list-heading">
          <strong>全部技能</strong>
          <span>{{ visibleListSkills.length }} 个</span>
        </div>

      <div class="skill-card-grid">
        <article
          v-for="skill in visibleListSkills"
          :key="skill.id"
          class="managed-skill-card"
          :class="{
            'recommendation-card': activeListPage !== 'personal',
            'is-closed': activeListPage === 'personal' && !isSkillEnabled(skill),
            'menu-open': openCardMenuId === skill.id
          }"
          tabindex="0"
          @click="openSkill(skill)"
          @keydown.enter.prevent="openSkill(skill)"
        >
          <div v-if="activeListPage === 'personal'" class="modal-card-actions">
            <button
              v-if="isSkillEnabled(skill)"
              class="modal-card-use-btn"
              type="button"
              :aria-label="`使用${skill.name}`"
              @click.stop="useSkill(skill.name, skill.id)"
            >
              <Play :size="13" />
              <span>使用</span>
            </button>
            <button
              v-else
              class="modal-card-open-btn"
              type="button"
              :aria-label="`启用${skill.name}`"
              @click.stop="setSkillOpen(skill, true)"
            >
              <Power :size="13" />
              <span>启用</span>
            </button>
            <button
              class="card-more-btn"
              type="button"
              :aria-label="`${skill.name} 更多操作`"
              @click.stop="toggleCardMenu(skill.id)"
            >
              <MoreHorizontal :size="18" />
            </button>
          </div>

          <button
            v-if="activeListPage !== 'personal'"
            class="add-skill-btn"
            type="button"
            :disabled="isInstallDisabled(skill)"
            @click.stop="installSkill(skill)"
          >
            <Check v-if="isInstallDisabled(skill)" :size="15" />
            <Plus v-else :size="15" />
            <span>{{ installButtonLabel(skill) }}</span>
          </button>

          <div v-if="activeListPage === 'personal' && openCardMenuId === skill.id" class="card-action-menu" @click.stop>
            <button class="menu-action" type="button" @click="editSkill(skill)">
              <Pencil :size="15" />
              <span>编辑</span>
            </button>
            <button class="menu-action" type="button" @click="downloadSkill(skill)">
              <Download :size="15" />
              <span>下载</span>
            </button>
            <button class="menu-action" type="button" @click="setSkillOpen(skill, !isSkillEnabled(skill))">
              <Power v-if="!isSkillEnabled(skill)" :size="15" />
              <PowerOff v-else :size="15" />
              <span>{{ isSkillEnabled(skill) ? '停用技能' : '启用技能' }}</span>
            </button>
            <div class="menu-submenu-item">
              <button class="menu-action submenu-trigger" type="button">
                <UsersRound :size="15" />
                <span>发布</span>
                <ChevronRight :size="14" class="submenu-chevron" />
              </button>
              <div class="publish-submenu" role="menu" aria-label="发布范围">
                <button type="button" @click="publishSkill(skill, 'group')">发布到小组共享</button>
                <button type="button" @click="publishSkill(skill, 'team')">发布到团队共享</button>
                <button type="button" @click="publishSkill(skill, 'public')">发布到公共库</button>
              </div>
            </div>
            <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
              <Trash2 :size="15" />
              <span>删除</span>
            </button>
          </div>

          <div class="skill-card-avatar" :style="getSkillAvatarStyle(skill)" aria-hidden="true"></div>
          <div class="skill-card-copy">
            <div class="skill-card-title-row">
              <h3>{{ skill.name }}</h3>
              <span v-if="activeListPage === 'personal'" class="skill-state-badge" :class="{ closed: !isSkillEnabled(skill) }">
                {{ isSkillEnabled(skill) ? '已启用' : '已停用' }}
              </span>
            </div>
            <p>{{ skill.description }}</p>
          </div>
        </article>
      </div>
      </template>

      <template v-if="selectedSkill">
        <header class="detail-header">
          <button class="detail-title-btn" type="button" @click="backToList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>{{ selectedSkill.name }}</span>
          </button>
          <div class="detail-actions">
            <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
            <button v-if="selectedSkillIsAdded && selectedSkillIsEnabled" class="use-skill-btn" type="button" @click="useSkill()">去使用</button>
            <button
              v-else-if="selectedSkillIsAdded && selectedSkill"
              class="use-skill-btn add-detail-btn"
              type="button"
              @click="setSkillOpen(selectedSkill, true)"
            >
              启用技能
            </button>
            <button v-else class="use-skill-btn add-detail-btn" type="button" @click="addSkill(selectedSkill)">
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
              aria-label="编辑当前文件"
              title="编辑当前文件"
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

        <div class="skill-detail-shell">
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
                  <button class="tree-child" type="button" @click="toggleExpanded(folder.key)">
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
      </template>
    </section>
  </div>
</template>

<style scoped>
.skill-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.48);
}

.skill-modal {
  position: relative;
  width: min(940px, calc(100vw - 40px));
  min-height: 412px;
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 28px 32px 30px;
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.skill-modal.detail-mode {
  width: min(1120px, calc(100vw - 40px));
  height: min(700px, calc(100vh - 40px));
  min-height: 0;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.modal-close-btn {
  position: absolute;
  top: 26px;
  right: 28px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--text-strong);
}

.modal-close-btn:hover {
  background: var(--surface-soft);
}

.modal-title-row {
  min-height: 34px;
  display: flex;
  align-items: center;
  padding-right: 48px;
  margin-bottom: 18px;
}

.modal-command-bar,
.modal-source-switcher,
.modal-result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  padding-right: 48px;
}

.modal-command-bar {
  min-height: 40px;
  justify-content: space-between;
  padding-right: 0;
  margin-bottom: 22px;
}

.modal-source-switcher {
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 20px;
  padding-bottom: 0;
  border-bottom: 0;
}

.modal-result-toolbar {
  margin: 0 0 20px;
}

.modal-header h2,
.modal-create-heading {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.2;
}

.modal-search-control {
  width: 100%;
  min-width: 0;
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  max-width: none;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.modal-search-control:focus-within {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.modal-search-control svg {
  flex-shrink: 0;
}

.modal-search-control input {
  width: 100%;
  min-width: 0;
  color: var(--text-main);
  background: transparent;
  font-size: 13.5px;
}

.modal-search-control input::placeholder {
  color: var(--text-muted);
}

.modal-status {
  display: block;
  margin: 8px 42px 0 0;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.modal-tabs {
  display: inline-flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  overflow-x: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  scrollbar-width: none;
}

.modal-tabs::-webkit-scrollbar {
  display: none;
}

.modal-tab {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1;
}

.modal-tab strong {
  min-width: auto;
  height: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 11px;
  font-weight: 700;
}

.modal-tab:hover {
  color: var(--primary-hover);
  background: transparent;
}

.modal-tab.active {
  gap: 8px;
  padding: 0 12px;
  color: var(--text-strong);
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.modal-tab.active strong {
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--text-strong);
  background: var(--card-bg);
}

.modal-result-title {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.modal-result-title strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-result-title span {
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 650;
}

.modal-source-actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.modal-sort-segment {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.modal-sort-segment button {
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 650;
}

.modal-sort-segment button.active,
.modal-sort-segment button:hover {
  color: var(--text-main);
  background: var(--surface-soft);
}

.modal-create-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 13px;
  font-weight: 680;
  line-height: 1;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-color) 16%, transparent);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.modal-create-btn:hover {
  transform: translateY(-1px);
  color: var(--on-primary);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.list-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-strong);
  font: inherit;
}

.list-back-btn:hover {
  color: var(--primary-color);
}

.create-skill-panel {
  margin-top: 8px;
  padding: 22px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--surface-soft);
}

.create-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.create-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 650;
}

.create-field-wide {
  grid-column: 1 / -1;
}

.create-field textarea,
.create-field select {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-main);
  background: var(--card-bg);
  font: inherit;
  font-weight: 400;
}

.create-field textarea {
  min-height: 132px;
  resize: vertical;
  padding: 12px;
  line-height: 1.55;
}

.create-field select {
  height: 40px;
  padding: 0 12px;
}

.create-field textarea:focus,
.create-field select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.create-error {
  margin: 14px 0 0;
  color: var(--danger-color, #dc2626);
  font-size: 13px;
  font-weight: 650;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.create-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.modal-frequent-section {
  margin: 6px 0 0;
}

.modal-frequent-header,
.modal-list-heading {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 12px;
}

.modal-frequent-header strong,
.modal-list-heading strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-frequent-header span,
.modal-list-heading span {
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 650;
}

.modal-frequent-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.modal-frequent-item {
  position: relative;
  min-width: 0;
  min-height: 84px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 14px 120px 14px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--surface-soft);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.modal-frequent-item:hover {
  border-color: var(--primary-border);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.modal-frequent-item.menu-open {
  z-index: 30;
}

.modal-frequent-item svg {
  color: var(--primary-color);
}

.modal-card-use-btn,
.modal-card-open-btn {
  min-width: 58px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary-color) 14%, transparent);
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.modal-card-use-btn:hover {
  color: var(--on-primary);
  background: var(--primary-hover);
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.modal-card-use-btn svg {
  color: currentColor;
}

.modal-card-open-btn {
  border-color: var(--border-color);
  color: var(--text-strong);
  background: var(--card-bg);
  box-shadow: none;
}

.modal-card-open-btn:hover {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.modal-card-open-btn svg {
  color: currentColor;
}

.modal-frequent-avatar {
  width: 38px;
  height: 38px;
  overflow: hidden;
  border-radius: 8px;
  background-color: transparent;
  background-repeat: no-repeat;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.modal-frequent-copy {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.modal-frequent-copy strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 720;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-frequent-copy span {
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 650;
  line-height: 1;
}

.modal-list-heading {
  margin-top: 20px;
}

.skill-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 0;
}

.empty-list {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0 0;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  color: var(--text-secondary);
  background: var(--surface-muted);
  font-size: 14px;
  font-weight: 650;
}

.managed-skill-card {
  position: relative;
  min-height: 104px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  padding: 16px 124px 16px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.managed-skill-card:hover {
  border-color: var(--primary-border);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.managed-skill-card.menu-open {
  z-index: 30;
}

.managed-skill-card.is-closed {
  background: var(--card-bg);
}

.managed-skill-card.is-closed .skill-card-avatar,
.managed-skill-card.is-closed .skill-card-copy p {
  opacity: 0.72;
}

.managed-skill-card.recommendation-card {
  padding-right: 98px;
}

.modal-card-actions {
  position: absolute;
  top: 50%;
  right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transform: translateY(-50%);
}

.modal-card-use-btn,
.modal-card-open-btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.skill-card-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
  background-color: transparent;
  background-repeat: no-repeat;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.skill-card-copy {
  min-width: 0;
  padding-top: 1px;
}

.skill-card-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 9px;
}

.managed-skill-card h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 720;
  line-height: 1.18;
  letter-spacing: 0;
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

.managed-skill-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-more-btn {
  position: absolute;
  top: 50%;
  right: 14px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 18%, var(--border-color));
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 7%, var(--card-bg));
  transform: translateY(-50%);
}

.modal-card-actions .card-more-btn {
  position: static;
  transform: none;
}

.card-more-btn:hover {
  border-color: color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 11%, var(--card-bg));
}

.add-skill-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 58px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
}

.add-skill-btn:hover {
  background: var(--primary-hover);
}

.add-skill-btn:disabled {
  color: var(--text-secondary);
  background: var(--border-color);
  cursor: default;
}

.card-action-menu {
  position: absolute;
  top: calc(50% + 22px);
  right: 14px;
  z-index: 40;
  width: 176px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
}

.card-action-menu button {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 10px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  text-align: left;
}

.card-action-menu button svg {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.card-action-menu button:hover {
  background: var(--surface-soft);
}

.menu-submenu-item {
  position: relative;
}

.submenu-trigger .submenu-chevron {
  margin-left: auto;
}

.publish-submenu {
  position: absolute;
  top: -8px;
  left: calc(100% + 8px);
  z-index: 45;
  min-width: 168px;
  display: none;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
}

.menu-submenu-item:hover .publish-submenu,
.menu-submenu-item:focus-within .publish-submenu {
  display: block;
}

.publish-submenu button {
  min-height: 36px;
}

.card-action-menu button.danger {
  color: var(--diff-removed);
}

.card-action-menu button.danger svg {
  color: var(--diff-removed);
}

.card-action-menu button.danger:hover {
  background: var(--diff-removed-soft);
}

.modal-close-btn:focus-visible,
.modal-tab:focus-visible,
.modal-create-btn:focus-visible,
.modal-frequent-item:focus-visible,
.modal-card-use-btn:focus-visible,
.modal-card-open-btn:focus-visible,
.list-back-btn:focus-visible,
.card-more-btn:focus-visible,
.add-skill-btn:focus-visible,
.card-action-menu button:focus-visible,
.managed-skill-card:focus-visible,
.detail-title-btn:focus-visible,
.use-skill-btn:focus-visible,
.edit-cancel-btn:focus-visible,
.edit-save-btn:focus-visible,
.detail-icon-btn:focus-visible,
.tree-heading:focus-visible,
.tree-child:focus-visible,
.tree-file:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.detail-mode > .modal-close-btn {
  top: 20px;
  right: 20px;
}

.detail-header {
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 58px 0 24px;
}

.detail-title-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 650;
  line-height: 1;
}

.detail-title-btn:hover {
  color: var(--primary-color);
}

.back-chevron {
  transform: rotate(180deg);
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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

.skill-detail-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  margin: 0 24px 24px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--card-bg);
}

.detail-tree {
  min-height: 0;
  overflow: auto;
  padding: 18px 18px 24px;
  border-right: 1px solid var(--border-color);
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
  overflow: hidden;
}

.doc-header {
  height: 54px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid var(--border-color);
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
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0;
  color: var(--text-strong);
}

.doc-pre,
.doc-editor {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
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

.doc-pre.file-markdown,
.doc-pre.file-template {
  font-family: inherit;
  font-size: 15px;
  line-height: 1.78;
}

.doc-editor {
  display: block;
  resize: none;
  height: 100%;
  min-height: 100%;
  border-radius: 0;
  box-shadow: inset 0 0 0 2px var(--primary-soft-strong);
}

.doc-content hr {
  height: 1px;
  margin: 0 0 34px;
  border: 0;
  background: var(--border-color);
}

.doc-content h4 {
  margin: 0 0 14px;
  font-size: 20px;
  line-height: 1.55;
  font-weight: 750;
}

.doc-content h5 {
  margin: 36px 0 16px;
  font-size: 20px;
  line-height: 1.3;
  font-weight: 750;
}

.doc-content p {
  margin: 0 0 18px;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.65;
}

.doc-content code {
  padding: 2px 8px;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: inherit;
}

@media (max-width: 900px) {
  .skill-modal {
    min-height: auto;
    padding: 24px 22px 28px;
  }

  .modal-close-btn {
    top: 18px;
    right: 18px;
  }

  .modal-command-bar,
  .modal-source-switcher,
  .modal-result-toolbar {
    align-items: flex-start;
    flex-direction: column;
    padding-right: 40px;
  }

  .modal-result-toolbar {
    align-items: stretch;
  }

  .modal-tabs,
  .modal-search-control {
    width: 100%;
  }

  .modal-tabs {
    gap: 14px;
  }

  .modal-search-control {
    min-width: 0;
  }

  .modal-frequent-list {
    grid-template-columns: 1fr;
  }

  .skill-card-grid {
    grid-template-columns: 1fr;
  }

  .skill-modal.detail-mode {
    width: calc(100vw - 32px);
    height: calc(100vh - 32px);
  }

  .skill-detail-shell {
    grid-template-columns: 180px minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .skill-modal-backdrop {
    padding: 12px;
  }

  .skill-modal {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    border-radius: 18px;
  }

  .modal-command-bar,
  .modal-source-switcher,
  .modal-result-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .modal-tab,
  .modal-create-btn {
    min-height: 38px;
    font-size: 14px;
  }

  .managed-skill-card {
    min-height: 108px;
    padding: 18px 116px 18px 18px;
  }

  .managed-skill-card h3 {
    margin-bottom: 14px;
    font-size: 16px;
  }

  .managed-skill-card p {
    font-size: 13.5px;
  }

  .skill-modal.detail-mode {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
  }

  .detail-header {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    padding: 24px 58px 16px 18px;
  }

  .skill-detail-shell {
    flex: 1 1 auto;
    min-height: 0;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    margin: 0 16px 18px;
  }

  .detail-tree {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .doc-content {
    padding: 0;
  }

  .doc-pre,
  .doc-editor {
    padding: 24px 18px 34px;
  }

  .doc-content h4,
  .doc-content h5 {
    font-size: 17px;
  }

  .doc-content p {
    font-size: 14px;
  }
}
</style>
