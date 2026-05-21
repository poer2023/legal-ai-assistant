<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import {
  Camera,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Plus,
} from 'lucide-vue-next';
import {
  isSkillEnabled,
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

type DetailPanelMode = 'docs' | 'info';
type MarkdownListItem = {
  text: string;
  todo?: boolean;
  checked?: boolean;
};
type MarkdownBlock =
  | { kind: 'heading'; depth: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: MarkdownListItem[] }
  | { kind: 'space' };

const activeFileId = ref('');
const expandedTreeKeys = ref<Record<string, boolean>>({});
const editMode = ref(false);
const editBuffer = ref('');
const fileDrafts = ref<Record<string, string>>({});
const unsavedFileKeys = ref<Set<string>>(new Set());
const detailPanelMode = ref<DetailPanelMode>('docs');
const basicIconInputRef = ref<HTMLInputElement | null>(null);
const basicInfoDraft = ref({
  iconDataUrl: '',
  name: '',
  description: '',
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
const currentFileKey = computed(() =>
  activeFile.value ? `${props.skill.id}:${activeFile.value.id}` : ''
);

const panelClass = computed(() => `${props.layout}-layout`);
const selectedSkillIsEnabled = computed(() => isSkillEnabled(props.skill));
const displayName = computed(() => basicInfoDraft.value.name || props.skill.name);
const displayDescription = computed(() => basicInfoDraft.value.description || props.skill.description);
const displayIconUrl = computed(() => basicInfoDraft.value.iconDataUrl || props.skill.iconDataUrl || '');
const iconFallback = computed(() => displayName.value.trim().slice(0, 1).toUpperCase() || '技');
const isMarkdownFile = computed(() => (activeFile.value?.type ?? 'markdown') === 'markdown');

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

const stripFrontmatter = (content: string) => {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.startsWith('---\n')
    ? normalized.replace(/^---\n[\s\S]*?\n---\n?/, '')
    : normalized;
};

const parseMarkdown = (content: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  let activeList: { ordered: boolean; items: MarkdownListItem[] } | null = null;

  const flushList = () => {
    if (!activeList) return;
    blocks.push({ kind: 'list', ordered: activeList.ordered, items: activeList.items });
    activeList = null;
  };

  stripFrontmatter(content).split('\n').forEach((rawLine) => {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    let match = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      flushList();
      blocks.push({ kind: 'heading', depth: (match[1] ?? '#').length, text: (match[2] ?? '').trim() });
      return;
    }

    match = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (match) {
      if (!activeList || activeList.ordered) {
        flushList();
        activeList = { ordered: false, items: [] };
      }
      activeList.items.push({
        text: (match[2] ?? '').trim(),
        todo: true,
        checked: (match[1] ?? '').toLowerCase() === 'x',
      });
      return;
    }

    match = trimmed.match(/^[-*•]\s+(.+)$/);
    if (match) {
      if (!activeList || activeList.ordered) {
        flushList();
        activeList = { ordered: false, items: [] };
      }
      activeList.items.push({ text: (match[1] ?? '').trim() });
      return;
    }

    match = trimmed.match(/^\d+\.\s+(.+)$/);
    if (match) {
      if (!activeList || !activeList.ordered) {
        flushList();
        activeList = { ordered: true, items: [] };
      }
      activeList.items.push({ text: (match[1] ?? '').trim() });
      return;
    }

    if (!trimmed) {
      flushList();
      if (blocks[blocks.length - 1]?.kind !== 'space') {
        blocks.push({ kind: 'space' });
      }
      return;
    }

    flushList();
    blocks.push({ kind: 'paragraph', text: trimmed });
  });

  flushList();
  return blocks.filter((block, index, items) =>
    block.kind !== 'space' || (index > 0 && index < items.length - 1)
  );
};

const markdownBlocks = computed(() => parseMarkdown(activeFileContent.value));

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
  fileDrafts.value = {};
  unsavedFileKeys.value = new Set();
  basicInfoDraft.value = {
    iconDataUrl: skill.iconDataUrl || '',
    name: skill.name,
    description: skill.description,
  };

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

const setDetailPanelMode = (mode: DetailPanelMode) => {
  if (mode === detailPanelMode.value) return;
  detailPanelMode.value = mode;
};

const stashCurrentEditBuffer = () => {
  if (!editMode.value || !currentFileKey.value || !activeFile.value) return;
  const key = currentFileKey.value;
  fileDrafts.value = {
    ...fileDrafts.value,
    [key]: editBuffer.value,
  };
  const next = new Set(unsavedFileKeys.value);
  if (editBuffer.value !== activeFile.value.content) {
    next.add(key);
  } else {
    next.delete(key);
  }
  unsavedFileKeys.value = next;
};

const selectFile = (file: SkillFile) => {
  if (activeFile.value?.id === file.id) {
    detailPanelMode.value = 'docs';
    return;
  }
  stashCurrentEditBuffer();
  editMode.value = false;
  editBuffer.value = '';
  detailPanelMode.value = 'docs';
  activeFileId.value = file.id;
};

const chooseBasicIcon = () => {
  basicIconInputRef.value?.click();
};

const handleBasicIconUpload = (event: Event) => {
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
    basicInfoDraft.value = {
      ...basicInfoDraft.value,
      iconDataUrl: reader.result,
    };
  };
  reader.readAsDataURL(file);
};

const saveBasicInfo = () => {
  const name = basicInfoDraft.value.name.trim();
  const description = basicInfoDraft.value.description.trim();
  if (!name || !description) {
    setStatus('请补全技能名称和简要描述');
    return;
  }

  const updatedSkill = upsertCustomSkill({
    ...props.skill,
    name,
    description,
    iconDataUrl: basicInfoDraft.value.iconDataUrl,
    status: props.skill.status || 'active',
  });

  if (!updatedSkill) {
    setStatus('保存失败');
    return;
  }

  emit('updated', updatedSkill);
  setStatus('基本信息已保存');
};

const startEditMode = () => {
  if (!activeFile.value || !currentFileKey.value) return;

  detailPanelMode.value = 'docs';
  editBuffer.value = activeFileContent.value;
  editMode.value = true;
};

const saveEdit = () => {
  if (!activeFile.value || !currentFileKey.value) return;

  const targetFileId = activeFile.value.id;
  const updatedFiles = props.skill.files.map((file) =>
    file.id === targetFileId ? { ...file, content: editBuffer.value } : file
  );
  const updatedSkill = upsertCustomSkill({
    ...props.skill,
    files: updatedFiles,
    status: props.skill.status || 'active',
  });

  if (!updatedSkill) {
    setStatus('保存失败');
    return;
  }

  fileDrafts.value = {
    ...fileDrafts.value,
    [currentFileKey.value]: editBuffer.value,
  };
  const nextUnsaved = new Set(unsavedFileKeys.value);
  nextUnsaved.delete(currentFileKey.value);
  unsavedFileKeys.value = nextUnsaved;
  editMode.value = false;
  emit('updated', updatedSkill);
  setStatus('当前文件已保存');
};

const cancelEdit = () => {
  editBuffer.value = '';
  editMode.value = false;
  setStatus('已取消编辑');
};

const hasBasicInfoChanges = computed(() => {
  return (
    basicInfoDraft.value.name.trim() !== (props.skill.name ?? '').trim() ||
    basicInfoDraft.value.description.trim() !== (props.skill.description ?? '').trim() ||
    (basicInfoDraft.value.iconDataUrl || '') !== (props.skill.iconDataUrl || '')
  );
});

const hasActiveEditDirty = computed(() => {
  if (!editMode.value || !activeFile.value) return false;
  return editBuffer.value !== activeFile.value.content;
});

const hasUnsavedChanges = computed(
  () => hasBasicInfoChanges.value || hasActiveEditDirty.value || unsavedFileKeys.value.size > 0
);

const handleCancel = () => {
  if (hasUnsavedChanges.value) {
    const ok = window.confirm('当前修改尚未保存，离开后改动将丢失，确定要离开吗？');
    if (!ok) return;
  }
  editMode.value = false;
  editBuffer.value = '';
  unsavedFileKeys.value = new Set();
  emit('back');
};

const handleSave = () => {
  if (detailPanelMode.value === 'info') {
    saveBasicInfo();
    return;
  }
  if (editMode.value) {
    saveEdit();
    return;
  }
  setStatus('当前技能已保存');
};

const handleTreeAdd = () => {
  setStatus('请在创建流程中新增技能文件');
};

watch(
  () => props.skill,
  (skill) => resetDetailState(skill),
  { immediate: true },
);

watch(
  () => props.skill.id,
  () => {
    detailPanelMode.value = 'docs';
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
        <button class="detail-back-btn" type="button" aria-label="返回技能列表" @click="handleCancel">
          <ChevronRight :size="17" class="back-chevron" />
        </button>
        <span class="detail-skill-icon" aria-hidden="true">
          <img v-if="displayIconUrl" :src="displayIconUrl" alt="" />
          <FileText v-else :size="20" :stroke-width="1.6" />
        </span>
        <div class="detail-title-copy">
          <div class="detail-title-row">
            <h2>{{ displayName }}</h2>
            <span class="skill-state-badge" :class="{ closed: !selectedSkillIsEnabled }">
              {{ selectedSkillIsEnabled ? '已启用' : '已停用' }}
            </span>
          </div>
          <p>{{ displayDescription }}</p>
        </div>
      </div>
      <div class="detail-actions">
        <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
        <button class="edit-cancel-btn" type="button" @click="handleCancel">取消</button>
        <button class="edit-save-btn" type="button" @click="handleSave">保存</button>
      </div>
    </header>

    <nav class="detail-tabs" role="tablist" aria-label="技能详情视图">
      <button
        type="button"
        role="tab"
        :class="{ active: detailPanelMode === 'docs' }"
        :aria-selected="detailPanelMode === 'docs'"
        @click="setDetailPanelMode('docs')"
      >
        技能文档
      </button>
      <button
        type="button"
        role="tab"
        :class="{ active: detailPanelMode === 'info' }"
        :aria-selected="detailPanelMode === 'info'"
        @click="setDetailPanelMode('info')"
      >
        基本信息
      </button>
    </nav>

    <div v-if="detailPanelMode === 'docs'" class="skill-detail-shell">
      <aside class="detail-tree" aria-label="技能文件">
        <button
          v-if="rootFile"
          class="tree-file root-file"
          :class="{ active: activeFile?.id === rootFile.id }"
          type="button"
          @click="selectFile(rootFile)"
        >
          <FileText :size="15" :stroke-width="1.7" />
          <span>{{ rootFile.name }}</span>
          <em>技能定义</em>
        </button>

        <div v-for="group in treeGroups" :key="group.key" class="tree-group">
          <div class="tree-heading-row">
            <button class="tree-heading" type="button" @click="toggleExpanded(group.key)">
              <ChevronDown v-if="isExpanded(group.key)" :size="14" />
              <ChevronRight v-else :size="14" />
              <Folder :size="15" :stroke-width="1.7" />
              <span>{{ group.label }}</span>
              <em>{{ group.files.length + group.folders.reduce((count, folder) => count + folder.files.length, 0) }}</em>
            </button>
            <button class="tree-add-btn" type="button" aria-label="新增技能文件" @click="handleTreeAdd">
              <Plus :size="13" :stroke-width="2" />
            </button>
          </div>

          <template v-if="isExpanded(group.key)">
            <button
              v-for="file in group.files"
              :key="file.id"
              class="tree-file nested"
              :class="{ active: activeFile?.id === file.id }"
              type="button"
              @click="selectFile(file)"
            >
              <FileText :size="14" :stroke-width="1.7" />
              <span>{{ file.name }}</span>
            </button>

            <div v-for="folder in group.folders" :key="folder.key" class="tree-folder">
              <button
                class="tree-child"
                type="button"
                @click="toggleExpanded(folder.key)"
              >
                <ChevronDown v-if="isExpanded(folder.key)" :size="14" />
                <ChevronRight v-else :size="14" />
                <Folder :size="14" :stroke-width="1.7" />
                <span>{{ folder.label }}</span>
                <em>{{ folder.files.length }}</em>
              </button>

              <template v-if="isExpanded(folder.key)">
                <button
                  v-for="file in folder.files"
                  :key="file.id"
                  class="tree-file folder-file"
                  :class="{ active: activeFile?.id === file.id }"
                  type="button"
                  @click="selectFile(file)"
                >
                  <FileText :size="14" :stroke-width="1.7" />
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
            <FileText :size="15" :stroke-width="1.7" />
            <span class="doc-path-name">{{ activeFileName }}</span>
            <span v-if="activeFileParentPath" class="doc-path-parent">· {{ activeFileParentPath }}</span>
          </div>

          <div class="doc-mode-switch" role="tablist" aria-label="文档查看方式">
            <button
              type="button"
              role="tab"
              :class="{ active: !editMode }"
              :aria-selected="!editMode"
              @click="editMode ? setStatus('请先保存或取消当前文件编辑') : undefined"
            >
              预览
            </button>
            <button
              type="button"
              role="tab"
              :class="{ active: editMode }"
              :aria-selected="editMode"
              @click="startEditMode"
            >
              编辑
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

          <div v-else-if="isMarkdownFile" class="doc-rendered">
            <template v-for="(block, index) in markdownBlocks" :key="`${block.kind}-${index}`">
              <h1 v-if="block.kind === 'heading' && block.depth === 1">{{ block.text }}</h1>
              <h2 v-else-if="block.kind === 'heading' && block.depth === 2">{{ block.text }}</h2>
              <h3 v-else-if="block.kind === 'heading'">{{ block.text }}</h3>
              <p v-else-if="block.kind === 'paragraph'">{{ block.text }}</p>
              <ol v-else-if="block.kind === 'list' && block.ordered">
                <li v-for="item in block.items" :key="item.text">{{ item.text }}</li>
              </ol>
              <ul v-else-if="block.kind === 'list'">
                <li v-for="item in block.items" :key="item.text" :class="{ todo: item.todo }">
                  <input v-if="item.todo" type="checkbox" :checked="item.checked" disabled />
                  <span>{{ item.text }}</span>
                </li>
              </ul>
              <div v-else class="doc-space" aria-hidden="true"></div>
            </template>
          </div>

          <pre v-else class="doc-pre">{{ activeFileContent }}</pre>
        </article>
      </main>
    </div>

    <section v-else class="basic-info-shell" aria-label="技能基本信息">
      <div class="basic-info-panel">
        <div class="basic-icon-field">
          <span class="field-label">技能图标</span>
          <button
            type="button"
            class="basic-icon-upload"
            aria-label="上传技能图标"
            @click="chooseBasicIcon"
          >
            <img v-if="basicInfoDraft.iconDataUrl" :src="basicInfoDraft.iconDataUrl" alt="" />
            <Camera v-else :size="22" :stroke-width="1.6" />
          </button>
          <input
            ref="basicIconInputRef"
            class="basic-icon-input"
            type="file"
            accept="image/*"
            @change="handleBasicIconUpload"
          />
          <span class="upload-hint">{{ basicInfoDraft.iconDataUrl ? '更换图标' : '上传图标' }}</span>
        </div>

        <div class="basic-form-fields">
          <label class="basic-field">
            <span class="field-label">技能名称</span>
            <input v-model="basicInfoDraft.name" type="text" maxlength="40" />
          </label>

          <label class="basic-field">
            <span class="field-label">简要描述</span>
            <textarea v-model="basicInfoDraft.description" rows="4" maxlength="200"></textarea>
          </label>
          <span class="description-count">{{ basicInfoDraft.description.length }}/200</span>
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
  color: var(--ink-700, var(--text-main));
  font-family: var(--font-sans, 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif);
}

.skill-detail-panel.page-layout {
  flex: 1;
  min-height: 0;
}

.detail-header {
  min-height: 64px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 0 0 14px;
}

.modal-layout .detail-header {
  padding: 0 58px 14px 24px;
}

.detail-title-area {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-back-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  color: var(--ink-500, var(--text-secondary));
  background: transparent;
}

.detail-back-btn:hover {
  color: var(--ink-900, var(--text-strong));
  background: var(--bg-soft, var(--surface-muted));
}

.back-chevron {
  transform: rotate(180deg);
}

.detail-skill-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 11px;
  background: var(--bg-soft, var(--surface-muted));
  color: var(--ink-500, var(--text-secondary));
}

.detail-skill-icon img,
.basic-icon-upload img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  color: var(--ink-900, var(--text-strong));
  font-family: var(--font-serif, 'Noto Serif SC', 'Songti SC', 'STSong', Georgia, serif);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-state-badge {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  color: var(--accent-700, var(--primary-hover));
  background: var(--accent-tint, var(--primary-soft));
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.skill-state-badge.closed {
  color: var(--ink-500, var(--text-muted));
  background: var(--bg-soft, var(--surface-muted));
}

.detail-title-copy p {
  max-width: 760px;
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--ink-500, var(--text-secondary));
  font-size: 12.5px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 3px;
}

.detail-status {
  color: var(--accent-700, var(--primary-hover));
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
}

.edit-cancel-btn,
.edit-save-btn {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.edit-cancel-btn {
  border: 1px solid var(--line, var(--border-color));
  color: var(--ink-900, var(--text-strong));
  background: var(--bg-panel, var(--card-bg));
}

.edit-cancel-btn:hover {
  background: var(--bg-soft, var(--surface-muted));
}

.edit-save-btn {
  border: 1px solid var(--ink-900, var(--text-strong));
  color: #fff;
  background: var(--ink-900, var(--text-strong));
}

.edit-save-btn:hover {
  background: #000;
}

.detail-tabs {
  display: flex;
  align-items: center;
  gap: 26px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--line, var(--border-color));
}

.detail-tabs button {
  height: 40px;
  padding: 0;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  margin-bottom: -1px;
  color: var(--ink-500, var(--text-secondary));
  background: transparent;
  font-size: 13.5px;
  font-weight: 500;
}

.detail-tabs button:hover,
.detail-tabs button.active {
  color: var(--ink-900, var(--text-strong));
}

.detail-tabs button.active {
  border-bottom-color: var(--accent, var(--primary-color));
  font-weight: 600;
}

.skill-detail-shell {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 12px;
  background: var(--bg-panel, var(--card-bg));
}

.modal-layout .skill-detail-shell {
  height: calc(min(700px, 100vh - 40px) - 118px);
  margin: 0 24px 24px;
  border-radius: 16px;
}

.detail-tree {
  min-height: 0;
  overflow: auto;
  padding: 14px 8px 14px 14px;
  border-right: 1px solid var(--line, var(--border-color));
  background: var(--bg-panel, var(--card-bg));
}

.tree-group + .tree-group {
  margin-top: 4px;
}

.tree-heading-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26px;
  align-items: center;
  gap: 4px;
}

.tree-heading,
.tree-child,
.tree-file {
  width: 100%;
  min-width: 0;
  min-height: 31px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  color: var(--ink-700, var(--text-main));
  background: transparent;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.3;
  text-align: left;
}

.tree-heading {
  font-weight: 500;
}

.tree-child {
  padding-left: 20px;
}

.tree-file.root-file {
  margin-bottom: 8px;
}

.tree-file.nested {
  padding-left: 28px;
}

.tree-file.folder-file {
  padding-left: 44px;
}

.tree-heading:hover,
.tree-child:hover,
.tree-file:hover,
.tree-file.active {
  background: var(--bg-soft, var(--surface-muted));
}

.tree-file.active {
  color: var(--ink-900, var(--text-strong));
  font-weight: 500;
}

.tree-heading span,
.tree-child span,
.tree-file span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-heading svg,
.tree-child svg,
.tree-file svg {
  flex: 0 0 auto;
  color: var(--ink-500, var(--text-secondary));
}

.tree-heading em,
.tree-child em,
.tree-file em {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--ink-400, var(--text-muted));
  font-size: 11.5px;
  font-style: normal;
  font-weight: 400;
  line-height: 1;
}

.tree-add-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: var(--ink-400, var(--text-muted));
  background: transparent;
}

.tree-add-btn:hover {
  color: var(--ink-700, var(--text-main));
  background: var(--bg-soft, var(--surface-muted));
}

.detail-doc {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel, var(--card-bg));
}

.doc-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 22px;
  border-bottom: 1px solid var(--line, var(--border-color));
  background: var(--bg, var(--bg-color));
}

.doc-path {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  color: var(--ink-900, var(--text-strong));
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.doc-path svg {
  flex: 0 0 auto;
  color: var(--ink-500, var(--text-secondary));
}

.doc-path-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-path-parent {
  overflow: hidden;
  color: var(--ink-400, var(--text-muted));
  font-size: 12px;
  text-overflow: ellipsis;
}

.doc-mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px;
  border-radius: 7px;
  background: var(--bg-soft, var(--surface-muted));
}

.doc-mode-switch button {
  height: 30px;
  padding: 0 13px;
  border: 0;
  border-radius: 6px;
  color: var(--ink-500, var(--text-secondary));
  background: transparent;
  font-size: 12px;
  font-weight: 500;
}

.doc-mode-switch button.active {
  color: var(--ink-900, var(--text-strong));
  background: var(--bg-panel, var(--card-bg));
  box-shadow: 0 1px 2px rgba(26, 22, 20, 0.05);
}

.doc-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  color: var(--ink-900, var(--text-strong));
  background: var(--bg-panel, var(--card-bg));
}

.doc-rendered {
  max-width: 720px;
  padding: 30px 40px 60px;
}

.doc-rendered h1,
.doc-rendered h2 {
  margin: 0;
  color: var(--ink-900, var(--text-strong));
  font-family: var(--font-serif, 'Noto Serif SC', 'Songti SC', 'STSong', Georgia, serif);
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0;
}

.doc-rendered h1 {
  font-size: 24px;
  margin-bottom: 28px;
}

.doc-rendered h2 {
  font-size: 20px;
  margin-top: 34px;
  margin-bottom: 12px;
}

.doc-rendered h3 {
  margin: 24px 0 10px;
  color: var(--ink-900, var(--text-strong));
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.doc-rendered p {
  margin: 8px 0;
  color: var(--ink-700, var(--text-main));
  font-size: 13.5px;
  line-height: 1.78;
}

.doc-rendered ol,
.doc-rendered ul {
  margin: 8px 0 0;
  padding-left: 22px;
  color: var(--ink-700, var(--text-main));
  font-size: 13.5px;
  line-height: 1.8;
}

.doc-rendered li + li {
  margin-top: 2px;
}

.doc-rendered li.todo {
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: disc;
}

.doc-rendered li.todo input {
  width: 14px;
  height: 14px;
  margin: 0 2px 0 0;
  accent-color: var(--accent, var(--primary-color));
}

.doc-space {
  height: 10px;
}

.doc-pre,
.doc-editor {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 24px 28px 46px;
  border: 0;
  outline: none;
  background: var(--bg-panel, var(--card-bg));
  color: var(--ink-900, var(--text-strong));
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.doc-editor {
  display: block;
  resize: none;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent, var(--primary-color)) 18%, transparent);
}

.basic-info-shell {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.basic-info-panel {
  width: min(720px, 100%);
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 24px;
  padding: 28px 32px 32px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 14px;
  background: var(--bg-panel, var(--card-bg));
}

.basic-icon-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.field-label {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}

.basic-icon-upload {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  border: 1.5px dashed var(--line-strong, var(--primary-border));
  border-radius: 14px;
  color: var(--ink-500, var(--text-secondary));
  background: var(--bg-soft, var(--surface-muted));
}

.basic-icon-upload:hover {
  color: var(--accent-700, var(--primary-hover));
  border-color: var(--accent, var(--primary-color));
  background: var(--accent-tint, var(--primary-soft));
}

.basic-icon-input {
  display: none;
}

.upload-hint {
  margin-top: 8px;
  color: var(--ink-400, var(--text-muted));
  font-size: 12px;
  line-height: 1.3;
  text-align: center;
}

.basic-form-fields {
  min-width: 0;
}

.basic-field {
  display: block;
}

.basic-field + .basic-field {
  margin-top: 18px;
}

.basic-field input,
.basic-field textarea {
  width: 100%;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 9px;
  color: var(--ink-900, var(--text-strong));
  background: var(--bg-panel, var(--card-bg));
  font-size: 14px;
  line-height: 1.55;
}

.basic-field input {
  height: 40px;
  padding: 0 14px;
}

.basic-field textarea {
  min-height: 112px;
  padding: 12px 14px;
  resize: vertical;
}

.basic-field input:focus,
.basic-field textarea:focus {
  border-color: var(--ink-900, var(--text-strong));
  box-shadow: 0 0 0 3px rgba(26, 22, 20, 0.08);
}

.description-count {
  display: block;
  margin-top: 8px;
  color: var(--ink-400, var(--text-muted));
  font-size: 12px;
  line-height: 1;
  text-align: right;
}

.detail-back-btn:focus-visible,
.edit-cancel-btn:focus-visible,
.edit-save-btn:focus-visible,
.detail-tabs button:focus-visible,
.tree-heading:focus-visible,
.tree-child:focus-visible,
.tree-file:focus-visible,
.tree-add-btn:focus-visible,
.doc-mode-switch button:focus-visible,
.basic-icon-upload:focus-visible {
  outline: 2px solid var(--focus-ring, var(--accent, var(--primary-color)));
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .skill-detail-shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .doc-rendered {
    padding: 26px 30px 52px;
  }
}

@media (max-width: 720px) {
  .detail-header {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-actions {
    justify-content: flex-end;
  }

  .skill-detail-shell {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .detail-tree {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--line, var(--border-color));
  }

  .basic-info-panel {
    grid-template-columns: 1fr;
  }

  .basic-icon-field {
    align-items: flex-start;
  }
}
</style>
