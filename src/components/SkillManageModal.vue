<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Info,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
  UsersRound,
  X,
} from 'lucide-vue-next';
import {
  addPersonalSkill,
  isSkillAvailable,
  officialRecommendedSkills,
  personalSkills,
  publishSkillToTeamMarket,
  removePersonalSkill,
  teamMarketSkills,
  upsertCustomSkill,
  type SkillCatalogItem,
  type SkillFile,
} from '../data/skillCatalog';
import { createSkillWithSkillCreator } from '../services/skillCreator';

const props = withDefaults(defineProps<{
  startInCreate?: boolean;
}>(), {
  startInCreate: false,
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'create'): void;
  (event: 'use', skillName?: string): void;
}>();

const selectedSkill = ref<SkillCatalogItem | null>(null);
const activeListPage = ref<'personal' | 'team-market' | 'recommended'>('personal');
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

const isRecommendedListPage = computed(() => activeListPage.value === 'recommended');
const isTeamMarketListPage = computed(() => activeListPage.value === 'team-market');
const visibleListSkills = computed(() =>
  ({
    personal: personalSkills.value,
    'team-market': teamMarketSkills.value,
    recommended: officialRecommendedSkills,
  })[activeListPage.value],
);

const activeListTitle = computed(() => {
  if (isTeamMarketListPage.value) return '团队共享';
  if (isRecommendedListPage.value) return '推荐';
  return '我的技能';
});

const activeListSubtitle = computed(() => {
  if (isTeamMarketListPage.value) return '团队共享中的技能对全员可见，可直接使用，也可添加到自己的技能库。';
  if (isRecommendedListPage.value) return '从推荐技能中挑选常用工作流，一键添加后即可使用。';
  return '这里是已添加和创建的可复用技能。';
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

const setListPage = (page: 'personal' | 'team-market' | 'recommended') => {
  activeListPage.value = page;
  selectedSkill.value = null;
  isCreateMode.value = false;
  activeFileId.value = '';
  editMode.value = false;
  editBuffer.value = '';
  openCardMenuId.value = null;
};

const backToDefaultList = () => {
  setListPage('personal');
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

const requestCreateSkill = () => {
  emit('create');
};

const useSkill = (skillName?: string) => {
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

const useSkillFromMenu = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  useSkill(skill.name);
};

const editSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  openSkill(skill);
};

const isSkillAdded = (skill: SkillCatalogItem) => isSkillAvailable(skill.id);

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addPersonalSkill(skill.id);
  setStatus(didAdd ? `${skill.name} 已添加` : `${skill.name} 已添加`);
};

const publishSkill = (skill: SkillCatalogItem) => {
  const didPublish = publishSkillToTeamMarket(skill.id);
  openCardMenuId.value = null;
  setStatus(didPublish ? `${skill.name} 已共享至团队` : `${skill.name} 已共享至团队`);
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
      status: 'active',
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

  activeListPage.value = savedSkill.scope === 'team' ? 'team-market' : 'personal';
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
        <h2 id="skill-modal-title">
          <button v-if="isCreateMode" class="list-back-btn" type="button" @click="backToList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>创建技能</span>
          </button>
          <button v-else-if="activeListPage !== 'personal'" class="list-back-btn" type="button" @click="backToDefaultList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>{{ activeListTitle }}</span>
          </button>
          <span v-else>{{ activeListTitle }}</span>
        </h2>
        <div v-if="!isCreateMode" class="modal-toolbar">
          <p class="modal-subtitle">
            <span>{{ activeListSubtitle }}</span>
            <Info :size="17" :stroke-width="2" />
          </p>
          <span v-if="statusMessage" class="modal-status">{{ statusMessage }}</span>
          <div class="modal-tabs" aria-label="技能分类">
            <button
              class="modal-tab"
              :class="{ active: activeListPage === 'personal' }"
              type="button"
              @click="setListPage('personal')"
            >
              我的技能
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeListPage === 'team-market' }"
              type="button"
              @click="setListPage('team-market')"
            >
              团队共享
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeListPage === 'recommended' }"
              type="button"
              @click="setListPage('recommended')"
            >
              推荐
            </button>
            <button
              class="modal-tab"
              type="button"
              @click.stop="requestCreateSkill"
            >
              创建技能
            </button>
          </div>
        </div>
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

      <div v-if="!selectedSkill && !isCreateMode" class="skill-card-grid">
        <article
          v-for="skill in visibleListSkills"
          :key="skill.id"
          class="managed-skill-card"
          :class="{ 'recommendation-card': activeListPage !== 'personal', 'menu-open': openCardMenuId === skill.id }"
          tabindex="0"
          @click="useSkill(skill.name)"
          @keydown.enter.prevent="useSkill(skill.name)"
        >
          <button
            v-if="activeListPage === 'personal'"
            class="card-more-btn"
            type="button"
            :aria-label="`${skill.name} 更多操作`"
            @click.stop="toggleCardMenu(skill.id)"
          >
            <MoreHorizontal :size="20" />
          </button>

          <button
            v-if="activeListPage !== 'personal'"
            class="add-skill-btn"
            type="button"
            :disabled="isSkillAdded(skill)"
            @click.stop="addSkill(skill)"
          >
            <Check v-if="isSkillAdded(skill)" :size="15" />
            <Plus v-else :size="15" />
            <span>{{ isSkillAdded(skill) ? '已添加' : '添加' }}</span>
          </button>

          <div v-if="activeListPage === 'personal' && openCardMenuId === skill.id" class="card-action-menu" @click.stop>
            <button class="menu-action" type="button" @click="useSkillFromMenu(skill)">
              <Play :size="15" />
              <span>使用技能</span>
            </button>
            <button class="menu-action" type="button" @click="editSkill(skill)">
              <Pencil :size="15" />
              <span>编辑</span>
            </button>
            <button class="menu-action" type="button" @click="downloadSkill(skill)">
              <Download :size="15" />
              <span>下载</span>
            </button>
            <button class="menu-action" type="button" @click="publishSkill(skill)">
              <UsersRound :size="15" />
              <span>共享至团队</span>
            </button>
            <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
              <Trash2 :size="15" />
              <span>删除</span>
            </button>
          </div>

          <h3>{{ skill.name }}</h3>
          <p>{{ skill.description }}</p>
        </article>
      </div>

      <template v-if="selectedSkill">
        <header class="detail-header">
          <button class="detail-title-btn" type="button" @click="backToList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>{{ selectedSkill.name }}</span>
          </button>
          <div class="detail-actions">
            <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
            <button v-if="selectedSkillIsAdded" class="use-skill-btn" type="button" @click="useSkill()">去使用</button>
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
  width: min(820px, calc(100vw - 40px));
  min-height: 412px;
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 24px 32px 28px;
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
  top: 20px;
  right: 24px;
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

.modal-header h2 {
  margin: 0 0 20px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.modal-subtitle {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.35;
}

.modal-subtitle svg {
  flex-shrink: 0;
  color: var(--text-muted);
}

.modal-status {
  margin-left: auto;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.modal-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.modal-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 10px;
  color: var(--text-strong);
  background: var(--surface-soft);
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.modal-tab.active {
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
}

.modal-tab:hover {
  background: var(--surface-soft);
}

.modal-tab.active:hover {
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
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

.skill-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.managed-skill-card {
  position: relative;
  min-height: 108px;
  padding: 20px 48px 18px 20px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
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

.managed-skill-card.recommendation-card {
  padding-right: 104px;
}

.managed-skill-card h3 {
  margin: 0 0 12px;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: 0;
}

.managed-skill-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.card-more-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-secondary);
}

.card-more-btn:hover {
  background: var(--surface-soft);
}

.add-skill-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 58px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 9px;
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
  top: 48px;
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

  .modal-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .modal-tabs {
    width: 100%;
    justify-content: flex-start;
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

  .modal-subtitle {
    font-size: 14px;
  }

  .modal-tab {
    min-height: 38px;
    font-size: 14px;
  }

  .managed-skill-card {
    min-height: 108px;
    padding: 18px 46px 18px 18px;
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
