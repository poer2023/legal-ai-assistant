<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  LayoutTemplate,
  Pencil,
} from 'lucide-vue-next';
import {
  getTemplatesForSkill,
  type SkillTemplateOption,
  type TemplateDocumentSection,
} from '../data/legalAssets';
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
  (event: 'use-template', template: SkillTemplateOption): void;
}>();

type TreeFolder = {
  key: string;
  label: string;
  files: SkillFile[];
  templates: SkillTemplateOption[];
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
const activeTemplateId = ref('');
let statusTimer: ReturnType<typeof setTimeout> | null = null;

const selectedFiles = computed(() => props.skill.files ?? []);
const skillTemplates = computed(() => getTemplatesForSkill(props.skill));
const externalSkillTemplates = computed(() =>
  skillTemplates.value.filter((template) => template.origin === 'asset')
);
const activeTemplate = computed(
  () => skillTemplates.value.find((template) => template.id === activeTemplateId.value) ?? null
);

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

const activeFileTemplate = computed(() => {
  const file = activeFile.value;
  if (!file || file.type !== 'template' || activeTemplate.value) return null;
  return skillTemplates.value.find((template) => template.filePath === file.path) ?? null;
});

const selectedTemplateOption = computed(() => activeTemplate.value ?? activeFileTemplate.value);

const activeFileParentPath = computed(() => {
  const path = activeFile.value?.path ?? '';
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? `${path.slice(0, lastSlash)}/` : '';
});

const activeFileName = computed(() => activeFile.value?.name ?? '');

const activeDocumentParentPath = computed(() =>
  selectedTemplateOption.value ? '格式模板/' : activeFileParentPath.value
);

const activeDocumentName = computed(() =>
  selectedTemplateOption.value ? selectedTemplateOption.value.name : activeFileName.value
);

const getMarkdownTemplateTitle = (file: SkillFile) => {
  const heading = file.content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^#\s+/.test(line));

  return heading?.replace(/^#\s+/, '').trim() || file.name.replace(/\.(md|markdown|txt)$/i, '');
};

const shouldHideDuplicateTemplateFile = (file: SkillFile) => {
  if (file.type !== 'template') return false;
  const fileTitle = getMarkdownTemplateTitle(file);
  return skillTemplates.value.some(
    (template) => template.filePath !== file.path && template.name === fileTitle
  );
};

const treeGroups = computed<TreeGroup[]>(() => {
  type FolderBucket = { files: SkillFile[]; templates: SkillTemplateOption[] };
  type GroupBucket = { files: SkillFile[]; folderMap: Map<string, FolderBucket> };

  const groupMap = new Map<string, GroupBucket>();
  const ensureGroup = (label: string) => {
    const group = groupMap.get(label) ?? { files: [], folderMap: new Map<string, FolderBucket>() };
    groupMap.set(label, group);
    return group;
  };
  const ensureFolder = (group: GroupBucket, label: string) => {
    const folder = group.folderMap.get(label) ?? { files: [], templates: [] };
    group.folderMap.set(label, folder);
    return folder;
  };

  selectedFiles.value
    .filter((file) => file.path !== 'SKILL.md' && !shouldHideDuplicateTemplateFile(file))
    .forEach((file) => {
      const parts = file.path.split('/');
      const groupName = parts[0] ?? 'files';
      const folderName = parts.length > 2 ? parts[1] : '';
      const group = ensureGroup(groupName);

      if (folderName) {
        ensureFolder(group, folderName).files.push(file);
      } else {
        group.files.push(file);
      }
    });

  if (externalSkillTemplates.value.length) {
    ensureFolder(ensureGroup('assets'), 'templates').templates = externalSkillTemplates.value;
  }

  return Array.from(groupMap.entries()).map(([label, group]) => ({
    key: `group:${label}`,
    label,
    files: group.files,
    folders: Array.from(group.folderMap.entries()).map(([folderLabel, folder]) => ({
      key: `folder:${label}/${folderLabel}`,
      label: folderLabel,
      files: folder.files,
      templates: folder.templates,
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

const templateSectionsToMarkdown = (template: SkillTemplateOption) => {
  if (template.content) return template.content;

  const lines = [
    `# ${template.name}`,
    '',
    `类型：${template.docType}`,
    `来源：${template.source}`,
    `适用技能：${template.applicableSkills.join('、')}`,
    '',
    '## 填写字段',
    ...template.requiredFields.map((field) => `- ${field}`),
    '',
    '## 适用场景',
    template.preview,
  ];

  template.documentSections?.forEach((section) => {
    lines.push('', `## ${section.title}`);
    section.paragraphs?.forEach((paragraph) => lines.push(paragraph));
    section.items?.forEach((item) => lines.push(`- ${item}`));
    if (section.table) {
      lines.push(`| ${section.table.headers.join(' | ')} |`);
      lines.push(`| ${section.table.headers.map(() => '---').join(' | ')} |`);
      section.table.rows.forEach((row) => lines.push(`| ${row.join(' | ')} |`));
    }
  });

  if (template.tags.length) {
    lines.push('', '## 标签', template.tags.map((tag) => `#${tag}`).join(' '));
  }

  return lines.join('\n');
};

const activeTemplateContent = computed(() => {
  const template = activeTemplate.value;
  return template ? templateSectionsToMarkdown(template) : '';
});

const createFallbackDocumentSections = (template: SkillTemplateOption): TemplateDocumentSection[] => [
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
    title: '适用技能',
    items: template.applicableSkills,
  },
];

const selectedTemplateDocumentSections = computed<TemplateDocumentSection[]>(() => {
  const template = selectedTemplateOption.value;
  if (!template) return [];
  return template.documentSections ?? createFallbackDocumentSections(template);
});

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
  activeTemplateId.value = '';

  const nextExpanded: Record<string, boolean> = {};
  if (getTemplatesForSkill(skill).some((template) => template.origin === 'asset')) {
    nextExpanded['group:assets'] = true;
    nextExpanded['folder:assets/templates'] = true;
  }
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

const getFileTemplateOption = (file: SkillFile) =>
  file.type === 'template'
    ? skillTemplates.value.find((template) => template.filePath === file.path)
    : null;

const getTreeFileName = (file: SkillFile) =>
  getFileTemplateOption(file)?.name ?? (file.type === 'template' ? getMarkdownTemplateTitle(file) : file.name);

const getTreeFolderName = (label: string) =>
  label === 'templates' ? '模板' : label;

const selectFile = (file: SkillFile) => {
  activeFileId.value = file.id;
  activeTemplateId.value = '';
  editMode.value = false;
  editBuffer.value = '';
};

const selectTemplateOption = (template: SkillTemplateOption) => {
  activeTemplateId.value = template.id;
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
  if (activeTemplate.value) {
    void copyText(activeTemplateContent.value, activeTemplate.value.name);
    return;
  }
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

const useTemplate = (template: SkillTemplateOption) => {
  emit('use-template', template);
  setStatus(`${template.name} 格式模板已选择`);
};

const useSelectedTemplate = () => {
  if (!selectedTemplateOption.value) return;
  useTemplate(selectedTemplateOption.value);
};

const startEditMode = () => {
  if (activeTemplate.value || !activeFile.value || !currentFileKey.value) return;

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
          v-else-if="!activeTemplate"
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
          :class="{ active: !activeTemplate && activeFile?.id === rootFile.id }"
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
              :class="{ active: !activeTemplate && activeFile?.id === file.id, 'template-file-node': file.type === 'template' }"
              type="button"
              @click="selectFile(file)"
            >
              <LayoutTemplate v-if="file.type === 'template'" :size="15" />
              <FileText v-else :size="15" />
              <span>{{ getTreeFileName(file) }}</span>
            </button>

            <div v-for="folder in group.folders" :key="folder.key" class="tree-folder">
              <button
                class="tree-child"
                :class="{ 'template-child': folder.label === 'templates' }"
                type="button"
                @click="toggleExpanded(folder.key)"
              >
                <ChevronDown v-if="isExpanded(folder.key)" :size="15" />
                <ChevronRight v-else :size="15" />
                <span>{{ getTreeFolderName(folder.label) }}</span>
              </button>

              <template v-if="isExpanded(folder.key)">
                <button
                  v-for="file in folder.files"
                  :key="file.id"
                  class="tree-file nested"
                  :class="{ active: !activeTemplate && activeFile?.id === file.id, 'template-file-node': file.type === 'template' }"
                  type="button"
                  @click="selectFile(file)"
                >
                  <LayoutTemplate v-if="file.type === 'template'" :size="15" />
                  <FileText v-else :size="15" />
                  <span>{{ getTreeFileName(file) }}</span>
                </button>

                <button
                  v-for="template in folder.templates"
                  :key="template.id"
                  class="tree-file nested template-node"
                  :class="{ active: activeTemplate?.id === template.id }"
                  type="button"
                  @click="selectTemplateOption(template)"
                >
                  <LayoutTemplate :size="15" />
                  <span>{{ template.name }}</span>
                </button>
              </template>
            </div>
          </template>
        </div>
      </aside>

      <main class="detail-doc">
        <header class="doc-header">
          <div class="doc-path" aria-label="当前文件路径">
            <span v-if="activeDocumentParentPath" class="doc-path-parent">{{ activeDocumentParentPath }}</span>
            <span class="doc-path-name">{{ activeDocumentName }}</span>
          </div>

          <div class="doc-actions">
            <button
              v-if="selectedTemplateOption"
              class="use-template-inline-btn"
              type="button"
              @click="useSelectedTemplate"
            >
              采用模板
            </button>
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
          <div v-else-if="selectedTemplateOption" class="template-document-preview">
            <article class="template-word-page">
              <section class="template-doc-cover">
                <div class="template-doc-kicker">{{ selectedTemplateOption.docType }}</div>
                <h1>{{ selectedTemplateOption.name }}</h1>
                <div class="template-doc-meta">
                  <div>
                    <span>来源</span>
                    <strong>{{ selectedTemplateOption.source }}</strong>
                  </div>
                  <div>
                    <span>关联技能</span>
                    <strong>{{ selectedTemplateOption.agent }}</strong>
                  </div>
                  <div>
                    <span>更新时间</span>
                    <strong>{{ selectedTemplateOption.updatedAt }}</strong>
                  </div>
                </div>
              </section>

              <section
                v-for="section in selectedTemplateDocumentSections"
                :key="`${selectedTemplateOption.id}-${section.title}`"
                class="template-doc-section"
              >
                <h2>{{ section.title }}</h2>
                <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
                <ul v-if="section.items?.length" class="template-doc-list">
                  <li v-for="item in section.items" :key="item">{{ item }}</li>
                </ul>
                <table v-if="section.table" class="template-doc-table">
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
          </div>
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
  color: #475569;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px #e2e8f0;
}

.detail-back-btn:hover {
  color: #2563eb;
  background: #eff6ff;
  box-shadow: inset 0 0 0 1px #bfdbfe;
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
  color: #0f172a;
  font-size: 20px;
  font-weight: 760;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-title-copy p {
  max-width: 680px;
  margin: 6px 0 0;
  color: #64748b;
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
  min-height: 520px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #dedede;
  background: #ffffff;
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
  border-color: #e2e8f0;
  border-radius: 12px;
}

.detail-tree {
  min-height: 0;
  overflow: auto;
  padding: 18px 18px 24px;
  border-right: 1px solid #e5e7eb;
  background: #fbfdff;
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

.tree-child.template-child {
  color: #1d4ed8;
  background: #eff6ff;
}

.template-node,
.tree-file.template-file-node {
  color: #1d4ed8;
}

.template-node:hover,
.tree-file.template-file-node:hover {
  background: #eff6ff;
}

.tree-file.active.template-node,
.tree-file.active.template-file-node {
  background: #dbeafe;
  color: #1d4ed8;
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
  color: #2563eb;
  background: #dbeafe;
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
  color: #707070;
}

.detail-doc {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.doc-header {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid #e5e7eb;
  background: #fbfdff;
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

.use-template-inline-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 9px;
  color: #ffffff;
  background: #2563eb;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.use-template-inline-btn:hover {
  background: #1d4ed8;
}

.doc-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 0;
  color: #252525;
  background: #ffffff;
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

.doc-pre.pluggable-template {
  background: #fbfdff;
}

.template-document-preview {
  min-height: 100%;
  padding: 28px 30px 44px;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0) 24px),
    #f3f6fa;
}

.template-word-page {
  width: min(720px, 100%);
  min-height: 900px;
  margin: 0 auto;
  padding: 56px 64px 72px;
  background: #ffffff;
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.11);
  color: #111827;
  font-family: "Times New Roman", "Songti SC", "SimSun", serif;
}

.template-doc-cover {
  margin-bottom: 34px;
}

.template-doc-kicker {
  margin-bottom: 14px;
  color: #64748b;
  font-size: 14px;
  text-align: center;
}

.template-word-page h1 {
  margin: 0 0 28px;
  color: #111827;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.template-doc-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid #d1d5db;
}

.template-doc-meta div {
  min-height: 68px;
  padding: 14px 14px 12px;
  border-right: 1px solid #d1d5db;
}

.template-doc-meta div:last-child {
  border-right: 0;
}

.template-doc-meta span {
  display: block;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.2;
}

.template-doc-meta strong {
  display: block;
  color: #111827;
  font-size: 15px;
  line-height: 1.3;
}

.template-doc-section {
  scroll-margin-top: 24px;
}

.template-doc-section + .template-doc-section {
  margin-top: 32px;
}

.template-word-page h2 {
  margin: 0 0 14px;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
}

.template-word-page p,
.template-doc-list {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
  line-height: 1.85;
}

.template-word-page p + p {
  margin-top: 8px;
}

.template-doc-list {
  padding-left: 22px;
}

.template-doc-list li + li {
  margin-top: 4px;
}

.template-doc-table {
  width: 100%;
  margin-top: 14px;
  border-collapse: collapse;
  color: #111827;
  font-size: 15px;
  line-height: 1.55;
}

.template-doc-table th,
.template-doc-table td {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  text-align: left;
  vertical-align: top;
}

.template-doc-table th {
  background: #f3f4f6;
  font-weight: 700;
}

.doc-editor {
  display: block;
  resize: none;
  min-height: 520px;
  border-radius: 0;
  box-shadow: inset 0 0 0 2px #dbeafe;
}

.detail-back-btn:focus-visible,
.use-skill-btn:focus-visible,
.edit-cancel-btn:focus-visible,
.edit-save-btn:focus-visible,
.detail-icon-btn:focus-visible,
.use-template-inline-btn:focus-visible,
.tree-heading:focus-visible,
.tree-child:focus-visible,
.tree-file:focus-visible {
  outline: 2px solid #60a5fa;
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
    border-bottom: 1px solid #e5e7eb;
  }

  .doc-pre,
  .doc-editor {
    min-height: 460px;
    padding: 24px 18px 34px;
  }
}
</style>
