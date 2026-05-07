<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Info,
  MoreHorizontal,
  Pencil,
  X,
} from 'lucide-vue-next';
import {
  addRecommendedSkill,
  availableSkills,
  isAddedRecommendedSkill,
  isRecommendedSkill,
  recommendedSkills,
  type SkillCatalogItem,
  type SkillFile,
} from '../data/skillCatalog';

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'create'): void;
  (event: 'use', skillName?: string): void;
}>();

const selectedSkill = ref<SkillCatalogItem | null>(null);
const activeListPage = ref<'default' | 'recommended'>('default');
const activeFileId = ref('');
const expandedTreeKeys = ref<Record<string, boolean>>({});
const editMode = ref(false);
const editBuffer = ref('');
const fileDrafts = ref<Record<string, string>>({});
const statusMessage = ref('');
const openCardMenuId = ref<string | null>(null);
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

const listSkills = computed(() => availableSkills.value);
const recommendationList = computed(() => recommendedSkills);
const isRecommendedListPage = computed(() => activeListPage.value === 'recommended');
const visibleListSkills = computed(() => (isRecommendedListPage.value ? recommendationList.value : listSkills.value));

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

const selectedSkillIsRecommended = computed(() =>
  selectedSkill.value ? isRecommendedSkill(selectedSkill.value.id) : false
);

const selectedSkillIsAdded = computed(() =>
  selectedSkill.value ? !selectedSkillIsRecommended.value || isAddedRecommendedSkill(selectedSkill.value.id) : false
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

const openRecommendedList = () => {
  activeListPage.value = 'recommended';
  selectedSkill.value = null;
  activeFileId.value = '';
  editMode.value = false;
  editBuffer.value = '';
  openCardMenuId.value = null;
};

const backToDefaultList = () => {
  activeListPage.value = 'default';
  selectedSkill.value = null;
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
  activeFileId.value = '';
  editMode.value = false;
  editBuffer.value = '';
};

const toggleCardMenu = (skillId: string) => {
  openCardMenuId.value = openCardMenuId.value === skillId ? null : skillId;
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

const copySkillName = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  void copyText(`/${skill.name}`, skill.name);
};

const isSkillAdded = (skill: SkillCatalogItem) => !isRecommendedSkill(skill.id) || isAddedRecommendedSkill(skill.id);

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addRecommendedSkill(skill.id);
  setStatus(didAdd ? `${skill.name} 已添加` : `${skill.name} 已在技能列表中`);
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
  editMode.value = false;
  setStatus('当前文件已保存');
};

const cancelEdit = () => {
  editBuffer.value = '';
  editMode.value = false;
  setStatus('已取消编辑');
};

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
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
          <button v-if="isRecommendedListPage" class="list-back-btn" type="button" @click="backToDefaultList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>推荐技能</span>
          </button>
          <span v-else>技能</span>
        </h2>
        <div class="modal-toolbar">
          <p class="modal-subtitle">
            <span>
              {{
                isRecommendedListPage
                  ? '选择法律问答、写作和搜索场景的通用技能，添加后才会进入输入框'
                  : '将法律工作流、文书模板和校验规则转化为可复用技能'
              }}
            </span>
            <Info :size="17" :stroke-width="2" />
          </p>
          <span v-if="statusMessage" class="modal-status">{{ statusMessage }}</span>
          <div v-if="!isRecommendedListPage" class="modal-tabs" aria-label="技能分类">
            <button
              class="modal-tab recommend-entry"
              type="button"
              @click="openRecommendedList"
            >
              推荐技能
            </button>
            <button
              class="modal-tab"
              type="button"
              @click="createSkill"
            >
              创建技能
            </button>
          </div>
        </div>
      </header>

      <div v-if="!selectedSkill" class="skill-card-grid">
        <article
          v-for="skill in visibleListSkills"
          :key="skill.id"
          class="managed-skill-card"
          :class="{ 'recommendation-card': isRecommendedListPage }"
          tabindex="0"
          @click="openSkill(skill)"
          @keydown.enter.prevent="openSkill(skill)"
        >
          <button
            v-if="!isRecommendedListPage"
            class="card-more-btn"
            type="button"
            :aria-label="`${skill.name} 更多操作`"
            @click.stop="toggleCardMenu(skill.id)"
          >
            <MoreHorizontal :size="20" />
          </button>

          <button
            v-if="isRecommendedListPage"
            class="add-skill-btn"
            type="button"
            :disabled="isSkillAdded(skill)"
            @click.stop="addSkill(skill)"
          >
            {{ isSkillAdded(skill) ? '已添加' : '添加' }}
          </button>

          <div v-if="!isRecommendedListPage && openCardMenuId === skill.id" class="card-action-menu" @click.stop>
            <button type="button" @click="openSkill(skill)">查看详情</button>
            <button type="button" @click="useSkill(skill.name)">去使用</button>
            <button type="button" @click="copySkillName(skill)">复制指令</button>
          </div>

          <h3>{{ skill.name }}</h3>
          <p>{{ skill.description }}</p>
          <span class="skill-file-count">{{ skill.files.length }} 个文件</span>
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
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.skill-modal.detail-mode {
  width: min(1120px, calc(100vw - 40px));
  min-height: min(700px, calc(100vh - 40px));
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
  color: #111827;
}

.modal-close-btn:hover {
  background: #f3f4f6;
}

.modal-header h2 {
  margin: 0 0 20px;
  color: #141414;
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
  color: #171717;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.35;
}

.modal-subtitle svg {
  flex-shrink: 0;
  color: #8c8c8c;
}

.modal-status {
  margin-left: auto;
  color: #2563eb;
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
  color: #111827;
  background: #f4f4f4;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.modal-tab.active {
  color: #ffffff;
  background: #151515;
}

.modal-tab:hover {
  background: #e9e9e9;
}

.modal-tab.active:hover {
  background: #151515;
}

.modal-tab.recommend-entry {
  color: #1d4ed8;
  background: #dbeafe;
}

.modal-tab.recommend-entry:hover {
  background: #bfdbfe;
}

.list-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #111827;
  font: inherit;
}

.list-back-btn:hover {
  color: #2563eb;
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
  border: 1px solid #dedede;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.managed-skill-card:hover {
  border-color: #c6d3e6;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.managed-skill-card.recommendation-card {
  padding-right: 104px;
}

.managed-skill-card h3 {
  margin: 0 0 14px;
  color: #151515;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: 0;
}

.managed-skill-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #707070;
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
  color: #707070;
}

.card-more-btn:hover {
  background: #f5f5f5;
}

.add-skill-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 58px;
  height: 30px;
  padding: 0 12px;
  border-radius: 9px;
  color: #ffffff;
  background: #2563eb;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
}

.add-skill-btn:hover {
  background: #1d4ed8;
}

.add-skill-btn:disabled {
  color: #64748b;
  background: #e2e8f0;
  cursor: default;
}

.card-action-menu {
  position: absolute;
  top: 48px;
  right: 14px;
  z-index: 4;
  width: 112px;
  padding: 6px;
  border: 1px solid #dedede;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.card-action-menu button {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border-radius: 7px;
  color: #333333;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.card-action-menu button:hover {
  background: #f5f5f5;
}

.skill-file-count {
  position: absolute;
  right: 18px;
  bottom: 16px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1;
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
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.detail-mode > .modal-close-btn {
  top: 20px;
  right: 20px;
}

.detail-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 58px 0 24px;
}

.detail-title-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #171717;
  font-size: 18px;
  font-weight: 650;
  line-height: 1;
}

.detail-title-btn:hover {
  color: #2563eb;
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
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.use-skill-btn {
  height: 34px;
  padding: 0 16px;
  border: 1px solid #dedede;
  border-radius: 10px;
  color: #171717;
  font-size: 15px;
  font-weight: 650;
}

.use-skill-btn:hover,
.detail-icon-btn:hover {
  background: #f5f5f5;
}

.add-detail-btn {
  color: #ffffff;
  border-color: #2563eb;
  background: #2563eb;
}

.add-detail-btn:hover {
  background: #1d4ed8;
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
  border: 1px solid #dedede;
  color: #333333;
  background: #ffffff;
}

.edit-cancel-btn:hover {
  background: #f5f5f5;
}

.edit-save-btn {
  color: #ffffff;
  background: #2563eb;
}

.edit-save-btn:hover {
  background: #1d4ed8;
}

.detail-icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #171717;
}

.skill-detail-shell {
  height: calc(min(700px, 100vh - 40px) - 96px);
  min-height: 520px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  margin: 0 24px 24px;
  overflow: hidden;
  border: 1px solid #dedede;
  border-radius: 16px;
  background: #ffffff;
}

.detail-tree {
  overflow: auto;
  padding: 18px 18px 24px;
  border-right: 1px solid #e5e7eb;
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
  color: #333333;
  font-size: 15px;
  line-height: 1;
  text-align: left;
}

.tree-child,
.tree-file {
  width: calc(100% - 22px);
  margin-left: 22px;
  color: #525252;
}

.tree-heading:hover,
.tree-child:hover,
.tree-file:hover {
  background: #f5f7fb;
}

.tree-file.active {
  background: #eff6ff;
  color: #2563eb;
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
  color: #707070;
}

.detail-doc {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.doc-header {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid #e5e7eb;
}

.doc-path {
  min-width: 0;
  display: flex;
  align-items: center;
  flex: 1;
  height: 34px;
  padding: 0 10px;
  overflow: hidden;
  color: #171717;
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-path-parent {
  color: #8c8c8c;
  font-weight: 500;
}

.doc-path-name {
  min-width: 0;
  overflow: hidden;
  color: #171717;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doc-content {
  overflow: auto;
  padding: 0;
  color: #252525;
}

.doc-pre,
.doc-editor {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 34px 28px 46px;
  border: 0;
  outline: none;
  background: #ffffff;
  color: #252525;
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
  min-height: 520px;
  border-radius: 0;
  box-shadow: inset 0 0 0 2px #dbeafe;
}

.doc-content hr {
  height: 1px;
  margin: 0 0 34px;
  border: 0;
  background: #dedede;
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
  color: #252525;
  font-size: 16px;
  line-height: 1.65;
}

.doc-content code {
  padding: 2px 8px;
  border-radius: 5px;
  background: #f5f5f5;
  color: #333333;
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
  }

  .detail-header {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    padding: 24px 58px 16px 18px;
  }

  .skill-detail-shell {
    height: auto;
    min-height: 0;
    grid-template-columns: 1fr;
    margin: 0 16px 18px;
  }

  .detail-tree {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .doc-content {
    max-height: 420px;
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
