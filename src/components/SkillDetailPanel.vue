<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Pencil,
} from 'lucide-vue-next';
import {
  addPersonalSkill,
  isSkillAvailable,
  isRecommendedSkill,
  type SkillCatalogItem,
  type SkillFile,
} from '../data/skillCatalog';

const props = withDefaults(
  defineProps<{
    skill: SkillCatalogItem;
    layout?: 'page' | 'modal';
  }>(),
  {
    layout: 'page',
  },
);

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'use', skillName?: string): void;
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

const activeFileId = ref('');
const expandedTreeKeys = ref<Record<string, boolean>>({});
const editMode = ref(false);
const editBuffer = ref('');
const fileDrafts = ref<Record<string, string>>({});
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

watch(
  () => props.skill,
  (skill) => resetDetailState(skill),
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

.detail-back-btn:focus-visible,
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

@media (max-width: 900px) {
  .skill-detail-shell,
  .page-layout .skill-detail-shell {
    grid-template-columns: 180px minmax(0, 1fr);
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
}
</style>
