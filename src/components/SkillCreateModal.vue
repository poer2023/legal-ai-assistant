<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowRight, Camera, FileText, Plus, X } from 'lucide-vue-next';
import {
  upsertCustomSkill,
  type SkillCatalogItem,
  type SkillFile,
} from '../data/skillCatalog';

type CreateScope = 'personal' | 'team';
type ReferenceFileKind = 'seeds' | 'tpls' | 'refs';

type AttachedReferenceFile = {
  id: string;
  kind: ReferenceFileKind;
  name: string;
  size: number;
  type: string;
  content: string;
};

type ReferenceUploadRow = {
  key: ReferenceFileKind;
  title: string;
  meta: string;
  hint: string;
  accept: string;
};

const props = withDefaults(defineProps<{
  defaultScope?: CreateScope;
  submissionMode?: 'save' | 'chat';
}>(), {
  defaultScope: 'personal',
  submissionMode: 'save',
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'created', skill: SkillCatalogItem): void;
  (event: 'start-chat', prompt: string): void;
}>();

const referenceRows: ReferenceUploadRow[] = [
  {
    key: 'seeds',
    title: '种子文件',
    meta: '强烈推荐 · 2-3 份',
    hint: '你过往做过的、能代表你做事方式的真实输出文档（脱敏后）。例如：修订过的同类合同、写过的法律意见书定稿。AI 会反向学习你的工作方式、文风、术语与引用习惯。',
    accept: '.doc,.docx,.pdf,.md,.txt',
  },
  {
    key: 'tpls',
    title: '交付模板',
    meta: '可选',
    hint: '技能每次执行时输出物应遵循的标准格式（骨架 + 占位符）。一次任务可能产出多份模板，可一并上传。如未上传，AI 会从种子文件中反推骨架。',
    accept: '.doc,.docx,.xlsx,.pptx,.pdf,.md,.txt',
  },
  {
    key: 'refs',
    title: '检索文件',
    meta: '可选',
    hint: '执行任务时供 AI 实时检索的规则文档、合规清单、案例库、行业手册等。技能运行时会按需引用，但不学习其行文风格。',
    accept: '.doc,.docx,.xlsx,.pdf,.md,.txt',
  },
];

const referenceLabelMap: Record<ReferenceFileKind, string> = {
  seeds: '种子文件',
  tpls: '交付模板',
  refs: '检索文件',
};

const skillName = ref('');
const skillDescription = ref('');
const skillDetail = ref('');
const skillIconDataUrl = ref('');
const saveScope = ref<CreateScope>(props.defaultScope);
const attachedFiles = ref<AttachedReferenceFile[]>([]);
const activeFileKind = ref<ReferenceFileKind>('seeds');
const fileInputRef = ref<HTMLInputElement | null>(null);
const iconInputRef = ref<HTMLInputElement | null>(null);
const formError = ref('');

const canSubmit = computed(() => Boolean(skillName.value.trim() && skillDescription.value.trim()));

const activeFileAccept = computed(() => {
  return referenceRows.find((row) => row.key === activeFileKind.value)?.accept ?? '*';
});

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const normalizeFileStem = (value: string) =>
  normalizeSlug(value.replace(/\.[^.]+$/, '')) || `file-${Date.now()}`;

const yamlQuote = (value: string) => JSON.stringify(value.replace(/\n+/g, ' ').trim());

const renderBulletList = (items: string[]) =>
  items.length ? items.map((item) => `- ${item}`).join('\n') : '- 暂未提供。';

const filesForKind = (kind: ReferenceFileKind) =>
  attachedFiles.value.filter((file) => file.kind === kind);

const groupedReferenceNames = (kind: ReferenceFileKind) =>
  filesForKind(kind).map((file) => `${file.name}（${referenceLabelMap[kind]}）`);

const renderSkillMarkdown = (skillId: string) => {
  const seedNames = groupedReferenceNames('seeds');
  const templateNames = groupedReferenceNames('tpls');
  const referenceNames = groupedReferenceNames('refs');
  const allFileNames = [...seedNames, ...templateNames, ...referenceNames];
  const detail = skillDetail.value.trim() || '按用户输入的业务目标、材料和输出要求，生成可复用的法律工作流。';

  return `---
name: ${skillId}
description: ${yamlQuote(skillDescription.value)}
---

# ${skillName.value.trim()}

## 技能简介
${skillDescription.value.trim()}

## 创建要求
${detail}

## 输入材料
${renderBulletList([
  '用户在对话中提供的事实、目标、限制条件和交付要求。',
  ...allFileNames.map((name) => `创建参考：${name}`),
])}

## 工作流
1. 先确认用户目标、适用场景、材料范围和输出格式。
2. 读取用户提供的事实、上传文件摘要和交付模板说明。
3. 结合种子文件反推用户的工作方式、文风、术语和引用习惯。
4. 按创建要求拆解任务步骤，识别关键法律问题、风险点和缺失信息。
5. 按输出要求生成结果，并把待确认事项、依据位置和风险等级单独列明。
6. 在结尾提示人工复核重点，避免把未提供材料当作已审阅事实。

## 输出要求
按背景、问题、分析、风险、建议、待确认事项输出；如已上传交付模板，优先遵循模板的骨架和占位符。

## 参考文件分类
### 种子文件
${renderBulletList(seedNames)}

### 交付模板
${renderBulletList(templateNames)}

### 检索文件
${renderBulletList(referenceNames)}

## 边界规则
- 不编造未提供的事实、文件内容、法规条文或案例。
- 种子文件只用于学习工作方式和表达习惯，不代表运行时已审阅原文。
- 交付模板只约束输出结构，不代表必须调用模板库。
- 检索文件仅作为创建参考，运行时仍需用户明确提供或授权引用具体材料。
- 高风险结论、最终法律意见和对外文件必须提示律师复核。

## 需要时读取
- references/checklist.md：执行前后核对清单。
- references/output-patterns.md：稳定输出结构和写法。
${attachedFiles.value.length ? '- references/files.md：创建时上传的参考文件摘要或文本。' : ''}`;
};

const renderReferenceFilesMarkdown = () => [
  '# 上传参考文件',
  ...referenceRows.flatMap((row) => {
    const files = filesForKind(row.key);
    if (!files.length) {
      return [`## ${row.title}`, '暂无上传。'];
    }
    return [
      `## ${row.title}`,
      ...files.map((file) => [
        `### ${file.name}`,
        `- 类型：${file.type || '未知'}`,
        `- 大小：${formatFileSize(file.size)}`,
        '',
        file.content || '该文件无法读取为文本，已记录文件名和元信息。',
      ].join('\n')),
    ];
  }),
].join('\n\n');

const trimPromptFileContent = (content: string) => {
  const normalized = content.trim();
  if (!normalized) return '该文件无法读取为文本，已记录文件名和元信息。';
  const limit = 6000;
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}\n\n[内容较长，已截取前 ${limit} 字符作为创建参考]`
    : normalized;
};

const renderSkillCreatorChatPrompt = () => {
  const lines = [
    '/skill-creator',
    '',
    '我想创建一个可复用的技能，请先基于以下信息判断是否足够；如果还缺关键信息，请继续通过选择题或补充问题与我确认；如果已经足够，再进入技能创建。',
    '',
    `技能名称：${skillName.value.trim()}`,
    `简要描述：${skillDescription.value.trim()}`,
    `保存范围：${saveScope.value === 'team' ? '团队' : '个人'}`,
  ];

  if (skillDetail.value.trim()) {
    lines.push('', `创建要求：${skillDetail.value.trim()}`);
  }

  if (attachedFiles.value.length) {
    lines.push('', '参考文件：');
    attachedFiles.value.forEach((file) => {
      lines.push(
        '',
        `## ${referenceLabelMap[file.kind]}：${file.name}`,
        `文件类型：${file.type || '未知'}`,
        `文件大小：${formatFileSize(file.size)}`,
        '',
        trimPromptFileContent(file.content),
      );
    });
  }

  return lines.join('\n').trim();
};

const buildSkillFiles = (skillId: string): SkillFile[] => {
  const files: SkillFile[] = [
    {
      id: `${skillId}-skill`,
      name: 'SKILL.md',
      path: 'SKILL.md',
      type: 'markdown',
      content: renderSkillMarkdown(skillId),
    },
    {
      id: `${skillId}-checklist`,
      name: 'checklist.md',
      path: 'references/checklist.md',
      type: 'markdown',
      content: `# ${skillName.value.trim()}检查清单

## 启动前
- 用户目标、适用场景和交付物是否明确。
- 输入材料是否足以支撑输出；不足时先列待补充信息。
- 是否存在需要专项律师复核的高风险事项。

## 执行中
- 每个结论是否能对应事实、材料位置或用户描述。
- 风险描述是否写明影响、建议动作和待确认事项。
- 输出是否遵循交付模板或用户指定格式。

## 输出前
- 删除空泛建议，保留可执行动作。
- 标注假设、限制和需要人工复核的部分。
- 不把关联文件或模板描述成已经被完整审阅的事实。`,
    },
    {
      id: `${skillId}-output-patterns`,
      name: 'output-patterns.md',
      path: 'references/output-patterns.md',
      type: 'markdown',
      content: `# ${skillName.value.trim()}输出模式

## 推荐结构
按背景、问题、分析、风险、建议、待确认事项输出；如用户指定格式或上传交付模板，以用户格式为准。

## 表格字段
| 事项 | 依据 | 风险等级 | 影响 | 建议动作 | 待确认事项 |
| --- | --- | --- | --- | --- | --- |

## 写法要求
- 结论句说明“基于目前材料”。
- 风险必须具体，不写只有原则的提示。
- 建议动作要能落到条款、流程、材料、证据或沟通口径。`,
    },
  ];

  if (attachedFiles.value.length) {
    files.push({
      id: `${skillId}-files`,
      name: 'files.md',
      path: 'references/files.md',
      type: 'markdown',
      content: renderReferenceFilesMarkdown(),
    });

    attachedFiles.value.forEach((file, index) => {
      if (!file.content) return;
      files.push({
        id: `${skillId}-uploaded-${index}`,
        name: `${normalizeFileStem(file.name)}.md`,
        path: `references/uploads/${file.kind}-${normalizeFileStem(file.name)}.md`,
        type: 'markdown',
        content: `# ${file.name}\n\n类型：${referenceLabelMap[file.kind]}\n\n${file.content}`,
      });
    });
  }

  return files;
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getFileExtension = (name: string) =>
  name.split('.').pop()?.trim().toLowerCase() || '';

const textFileExtensions = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'json',
  'yaml',
  'yml',
  'xml',
  'html',
  'htm',
  'rtf',
]);

const isTextReadableFile = (file: File) =>
  file.type.startsWith('text/') || textFileExtensions.has(getFileExtension(file.name));

const looksLikeBinaryText = (content: string) => {
  const sample = content.slice(0, 1200);
  if (!sample) return false;
  if (sample.startsWith('PK\u0003\u0004') || sample.includes('\u0000')) return true;
  const suspiciousChars = Array.from(sample).filter((char) => {
    const code = char.charCodeAt(0);
    return char === '\uFFFD' || (code < 32 && ![9, 10, 13].includes(code));
  }).length;
  return suspiciousChars / sample.length > 0.04;
};

const inflateRawDeflate = async (bytes: Uint8Array) => {
  const DecompressionStreamCtor = (globalThis as typeof globalThis & {
    DecompressionStream?: new(format: string) => DecompressionStream;
  }).DecompressionStream;

  if (!DecompressionStreamCtor) return null;

  try {
    const buffer = bytes.slice().buffer as ArrayBuffer;
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStreamCtor('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
};

const decodeXmlText = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const extractDocxText = async (file: File) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(data.buffer);
  const decoder = new TextDecoder();
  let offset = 0;

  while (offset + 30 < data.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;
    const path = decoder.decode(data.slice(nameStart, nameEnd));

    if (path === 'word/document.xml' && compressedSize > 0 && dataEnd <= data.length) {
      const compressed = data.slice(dataStart, dataEnd);
      const xmlBytes = method === 0 ? compressed : method === 8 ? await inflateRawDeflate(compressed) : null;
      if (!xmlBytes) return '';
      const xml = decoder.decode(xmlBytes);
      return decodeXmlText(xml)
        .replace(/<w:tab\s*\/>/g, '\t')
        .replace(/<w:br\s*\/>/g, '\n')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    offset = dataEnd > offset ? dataEnd : offset + 4;
  }

  return '';
};

const readReferenceFileContent = async (file: File) => {
  const extension = getFileExtension(file.name);
  if (extension === 'docx') {
    return extractDocxText(file);
  }

  if (!isTextReadableFile(file)) return '';

  const content = await file.text();
  return looksLikeBinaryText(content) ? '' : content;
};

const chooseIcon = () => {
  iconInputRef.value?.click();
};

const handleIconChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      skillIconDataUrl.value = reader.result;
    }
  };
  reader.readAsDataURL(file);
  input.value = '';
};

const chooseFiles = (kind: ReferenceFileKind) => {
  activeFileKind.value = kind;
  window.setTimeout(() => fileInputRef.value?.click(), 0);
};

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (!files.length) return;

  const kind = activeFileKind.value;
  const nextFiles = await Promise.all(files.map(async (file) => {
    let content = '';
    try {
      content = await readReferenceFileContent(file);
    } catch {
      content = '';
    }

    return {
      id: `${kind}-${file.name}-${file.size}-${file.lastModified}`,
      kind,
      name: file.name,
      size: file.size,
      type: file.type,
      content,
    };
  }));

  const existingIds = new Set(attachedFiles.value.map((file) => file.id));
  attachedFiles.value = [
    ...attachedFiles.value,
    ...nextFiles.filter((file) => !existingIds.has(file.id)),
  ];
  input.value = '';
};

const removeFile = (fileId: string) => {
  attachedFiles.value = attachedFiles.value.filter((file) => file.id !== fileId);
};

const submitCreate = () => {
  if (!canSubmit.value) {
    formError.value = '请填写技能名称和简要描述';
    return;
  }

  if (props.submissionMode === 'chat') {
    emit('start-chat', renderSkillCreatorChatPrompt());
    return;
  }

  const baseSlug = normalizeSlug(skillName.value) || `custom-skill-${Date.now()}`;
  const skillId = `custom-${baseSlug}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const tags = Array.from(new Set([
    '自定义技能',
    '创建技能',
    ...referenceRows
      .filter((row) => filesForKind(row.key).length)
      .map((row) => row.title),
  ].filter(Boolean)));

  const skill = upsertCustomSkill({
    id: skillId,
    name: skillName.value.trim(),
    description: skillDescription.value.trim(),
    category: '自定义技能',
    routeName: 'skills',
    tags,
    files: buildSkillFiles(skillId),
    source: 'custom',
    scope: saveScope.value,
    status: 'active',
    iconDataUrl: skillIconDataUrl.value || undefined,
    createdAt: now,
    updatedAt: now,
  });

  if (!skill) {
    formError.value = '技能保存失败，请检查表单内容';
    return;
  }

  emit('created', skill);
};
</script>

<template>
  <div class="skill-create-backdrop" @click.self="emit('close')">
    <section
      class="skill-create-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-create-title"
      @keydown.escape.stop.prevent="emit('close')"
    >
      <div class="skill-create-scroll">
        <header class="skill-create-header">
          <div>
            <h2 id="skill-create-title">创建技能</h2>
            <p>先填写最关键的几项信息，再进入对话——AI 会基于你的资料一步步与你共创。</p>
          </div>
          <button class="skill-create-exit" type="button" aria-label="退出创建技能" @click="emit('close')">
            <span>退出</span>
            <X :size="14" />
          </button>
        </header>

        <div class="skill-create-steps" aria-label="创建步骤">
          <div class="step-item active">
            <span class="step-index">1</span>
            <span>填写基本信息</span>
          </div>
          <div class="step-line" />
          <div class="step-item pending">
            <span class="step-index">2</span>
            <span>与 AI 对话共创</span>
          </div>
        </div>

        <section class="basic-info-grid" aria-label="填写基本信息">
          <div class="icon-upload-group">
            <label class="field-label">技能图标</label>
            <button class="icon-upload-button" type="button" @click="chooseIcon">
              <img v-if="skillIconDataUrl" :src="skillIconDataUrl" alt="" />
              <Camera v-else :size="22" stroke-width="1.5" />
            </button>
            <input ref="iconInputRef" class="file-input" type="file" accept="image/*" @change="handleIconChange" />
            <span class="icon-upload-hint">{{ skillIconDataUrl ? '点击更换' : '点击上传' }}</span>
          </div>

          <div class="basic-field-stack">
            <label class="create-field">
              <span>技能名称 <em>*</em></span>
              <input
                v-model="skillName"
                type="text"
                maxlength="40"
                placeholder="例：供应商合同审查、SPA 起草、客户法律咨询答复"
              />
            </label>

            <label class="create-field">
              <span>简要描述 <em>*</em></span>
              <textarea
                v-model="skillDescription"
                rows="2"
                maxlength="200"
                placeholder="一两句话说明这个技能能完成什么任务、面向什么场景"
              ></textarea>
            </label>
            <div class="character-counter">{{ skillDescription.length }}/200</div>
          </div>
        </section>

        <section class="create-section" aria-label="创建要求">
          <label class="create-field">
            <span>创建要求</span>
            <textarea
              v-model="skillDetail"
              rows="4"
              placeholder="告诉 AI 你对这个技能的关键要求 —— 例如：执业方向、目标客户、想沉淀的工作流程要点、风险红线、文风偏好等。AI 会带着这些上下文与你对话。"
            ></textarea>
          </label>
          <p class="field-help">选填，但写得越具体，对话阶段越能直奔主题。</p>
        </section>

        <section class="create-section" aria-label="上传参考文件">
          <div class="reference-heading">
            <strong>上传参考文件</strong>
            <span>非必选 · 3 种类型按需上传</span>
          </div>

          <div class="reference-list">
            <article v-for="row in referenceRows" :key="row.key" class="reference-row">
              <div class="reference-row-head">
                <div class="reference-title">
                  <strong>{{ row.title }}</strong>
                  <span>· {{ row.meta }}</span>
                </div>
                <button class="reference-add-button" type="button" @click="chooseFiles(row.key)">
                  <Plus :size="11" stroke-width="2.4" />
                  <span>添加</span>
                </button>
              </div>
              <p>{{ row.hint }}</p>

              <div v-if="filesForKind(row.key).length" class="attached-file-list">
                <button
                  v-for="file in filesForKind(row.key)"
                  :key="file.id"
                  class="attached-file"
                  type="button"
                  @click="removeFile(file.id)"
                >
                  <FileText :size="14" stroke-width="1.7" />
                  <span class="attached-name">{{ file.name }}</span>
                  <span class="attached-size">{{ formatFileSize(file.size) }}</span>
                  <X :size="11" />
                </button>
              </div>
            </article>
          </div>

          <input
            ref="fileInputRef"
            class="file-input"
            type="file"
            multiple
            :accept="activeFileAccept"
            @change="handleFileChange"
          />
        </section>

        <p v-if="formError" class="create-error">{{ formError }}</p>

        <footer class="skill-create-actions">
          <button class="create-cancel" type="button" @click="emit('close')">取消</button>
          <button class="create-submit" type="button" :disabled="!canSubmit" @click="submitCreate">
            <span>开始创建</span>
            <ArrowRight :size="14" />
          </button>
        </footer>
      </div>
    </section>
  </div>
</template>

<style scoped>
.skill-create-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  overflow: auto;
  background: rgba(15, 14, 13, 0.42);
}

.skill-create-modal {
  --create-bg: var(--page-bg, var(--bg-soft, var(--surface-muted)));
  --create-panel: var(--bg-panel, var(--card-bg));
  --create-soft: var(--bg-soft, var(--surface-muted));
  --create-ink: var(--ink-900, var(--text-strong));
  --create-ink-soft: var(--ink-700, var(--text-main));
  --create-muted: var(--ink-500, var(--text-secondary));
  --create-faint: var(--ink-400, var(--text-muted));
  --create-line: var(--line, var(--border-color));
  --create-line-strong: var(--line-strong, var(--primary-border));
  --create-accent: var(--accent, var(--primary-color));
  --create-accent-strong: var(--accent-700, var(--primary-hover));
  --create-radius-md: var(--r-md, 10px);
  --create-radius-lg: var(--r-lg, 14px);
  width: min(780px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: hidden;
  border: 1px solid var(--create-line);
  border-radius: var(--create-radius-lg);
  background: var(--create-bg);
  color: var(--create-ink-soft);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
  font-family: var(--font-sans, 'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif);
}

.skill-create-scroll {
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px 42px 28px;
}

.skill-create-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.skill-create-header h2 {
  margin: 0;
  color: var(--create-ink);
  font-family: var(--font-serif, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'SimSun', Georgia, serif);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

.skill-create-header p {
  margin: 6px 0 0;
  color: var(--create-muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.skill-create-exit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--create-muted);
  font-size: 12px;
}

.skill-create-exit:hover {
  color: var(--create-ink);
}

.skill-create-steps {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
}

.step-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.step-index {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.step-item.active {
  color: var(--create-ink);
  font-size: 12.5px;
  font-weight: 600;
}

.step-item.active .step-index {
  background: var(--create-ink);
  color: var(--on-primary, #fff);
}

.step-item.pending {
  color: var(--create-muted);
  font-size: 12.5px;
  opacity: 0.5;
}

.step-item.pending .step-index {
  border: 1px solid var(--create-line-strong);
  color: var(--create-muted);
  background: transparent;
}

.step-line {
  flex: 1;
  height: 1px;
  background: var(--create-line);
}

.basic-info-grid {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}

.icon-upload-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}

.field-label,
.create-field span {
  display: block;
  margin-bottom: 6px;
  color: var(--create-muted);
  font-size: 12px;
  font-weight: 500;
}

.create-field span {
  color: var(--create-ink-soft);
}

.create-field em {
  color: var(--create-accent);
  font-style: normal;
}

.icon-upload-button {
  width: 62px;
  height: 62px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1.5px dashed var(--create-line-strong);
  border-radius: 12px;
  background: var(--create-soft);
  color: var(--create-muted);
  cursor: pointer;
  padding: 0;
}

.icon-upload-button:hover {
  border-color: var(--create-accent);
  color: var(--create-accent-strong);
}

.icon-upload-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-upload-hint {
  max-width: 62px;
  margin-top: 5px;
  color: var(--create-faint);
  font-size: 11.5px;
  line-height: 1.35;
  text-align: center;
}

.basic-field-stack,
.create-section,
.reference-list {
  min-width: 0;
}

.basic-field-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.create-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.create-field input,
.create-field textarea {
  width: 100%;
  border: 1px solid var(--create-line);
  border-radius: var(--create-radius-md);
  background: var(--create-panel);
  color: var(--create-ink);
  font: inherit;
  font-size: 13px;
}

.create-field input {
  height: 38px;
  padding: 0 12px;
}

.create-field textarea {
  min-height: 76px;
  resize: vertical;
  padding: 10px 12px;
  line-height: 1.55;
}

.create-section .create-field textarea {
  min-height: 96px;
  font-size: 13px;
}

.create-field input::placeholder,
.create-field textarea::placeholder {
  color: var(--create-faint);
}

.create-field input:focus,
.create-field textarea:focus {
  outline: none;
  border-color: var(--create-line-strong);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--create-accent) 10%, transparent);
}

.character-counter {
  margin-top: -9px;
  color: var(--create-faint);
  font-size: 11.5px;
  line-height: 1;
  text-align: right;
}

.create-section {
  margin-bottom: 22px;
}

.field-help {
  margin: 5px 0 0;
  color: var(--create-faint);
  font-size: 11.5px;
  line-height: 1.45;
}

.reference-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 11px;
}

.reference-heading strong {
  color: var(--create-ink);
  font-size: 13.5px;
  font-weight: 600;
}

.reference-heading span,
.reference-title span,
.attached-size {
  color: var(--create-faint);
  font-size: 11.5px;
}

.reference-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reference-row {
  padding: 12px 14px;
  border: 1px solid var(--create-line);
  border-radius: 10px;
  background: var(--create-panel);
}

.reference-row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}

.reference-title {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.reference-title strong {
  color: var(--create-ink);
  font-size: 12.8px;
  font-weight: 600;
}

.reference-add-button {
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 0 10px;
  border: 1px solid var(--create-line-strong);
  border-radius: 7px;
  background: transparent;
  color: var(--create-ink-soft);
  font-size: 12px;
  font-weight: 500;
}

.reference-add-button:hover {
  border-color: var(--create-accent);
  color: var(--create-accent-strong);
  background: color-mix(in srgb, var(--create-accent) 7%, transparent);
}

.reference-row p {
  margin: 0;
  color: var(--create-muted);
  font-size: 12px;
  line-height: 1.5;
}

.attached-file-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
}

.attached-file {
  min-width: 0;
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  border-radius: 7px;
  background: var(--create-soft);
  color: var(--create-muted);
  text-align: left;
}

.attached-file:hover {
  color: var(--create-ink);
}

.attached-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--create-ink-soft);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-input {
  display: none;
}

.create-error {
  margin: -6px 0 12px;
  color: var(--diff-removed, #c2410c);
  font-size: 12.5px;
  font-weight: 600;
}

.skill-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--create-line);
}

.create-cancel,
.create-submit {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 12.8px;
  font-weight: 500;
}

.create-cancel {
  border: 1px solid var(--create-line);
  color: var(--create-ink-soft);
  background: var(--create-panel);
}

.create-submit {
  min-width: 112px;
  border: 1px solid var(--create-ink);
  color: var(--on-primary, #fff);
  background: var(--create-ink);
}

.create-submit:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--create-ink) 88%, var(--create-accent));
  background: color-mix(in srgb, var(--create-ink) 88%, var(--create-accent));
}

.create-submit:disabled {
  border-color: var(--create-line);
  background: var(--create-soft);
  color: var(--create-muted);
  cursor: default;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--create-accent) 72%, transparent);
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .skill-create-scroll {
    padding: 24px 26px 28px;
  }
}

@media (max-width: 640px) {
  .skill-create-backdrop {
    padding: 10px;
  }

  .skill-create-modal {
    width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
  }

  .skill-create-scroll {
    max-height: calc(100vh - 20px);
    padding: 20px 16px 24px;
  }

  .skill-create-header {
    gap: 12px;
    margin-bottom: 18px;
  }

  .skill-create-header h2 {
    font-size: 23px;
  }

  .skill-create-steps {
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 20px;
  }

  .step-line {
    margin-top: 12px;
  }

  .step-item.pending span:last-child {
    display: none;
  }

  .basic-info-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .icon-upload-group {
    width: 62px;
  }

  .reference-row-head,
  .reference-title {
    align-items: flex-start;
  }

  .reference-title {
    flex-direction: column;
    gap: 2px;
  }

  .skill-create-actions {
    flex-direction: column-reverse;
  }

  .create-cancel,
  .create-submit {
    width: 100%;
  }
}
</style>
