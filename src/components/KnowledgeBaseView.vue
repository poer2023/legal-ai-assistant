<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Check,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from 'lucide-vue-next';

type FileKind = 'pdf' | 'word' | 'markdown' | 'sheet' | 'slide';
type GroupLibrary = {
  id: string;
  name: string;
  count: number;
  folders: string[];
  intro?: string;
  memberIds?: string[];
};
type GroupMember = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  isCurrent?: boolean;
};

const initialGroupLibraries: GroupLibrary[] = [
  { id: 'corporate', name: '团队知识库', count: 6, folders: ['并购项目', '股权激励', '投融资', '治理合规'] },
  { id: 'dispute', name: '非诉讼小组', count: 5, folders: ['商事诉讼', '仲裁案件', '执行线索'] },
  { id: 'compliance', name: '合规风控组', count: 4, folders: ['数据合规', '反垄断', '监管问询'] },
  { id: 'labor', name: '劳动用工组', count: 3, folders: ['劳动争议', '员工手册', '竞业限制'] },
];
const groupLibraries = ref<GroupLibrary[]>(initialGroupLibraries);
const defaultGroupLibrary = initialGroupLibraries[0]!;

const files: Array<{
  id: number;
  title: string;
  size: string;
  words?: string;
  owner: string;
  kind: FileKind;
  compactActions?: boolean;
}> = [
  { id: 1, title: '【企业AI培训销售（ToB）_上海20-35K】上汽项目资料.pdf', size: '188.93KB', owner: '孙启明', kind: 'pdf', compactActions: true },
  { id: 2, title: '解读报告.pdf', size: '254.48KB', owner: '方谨行', kind: 'pdf' },
  { id: 3, title: '朱双林简历.pdf', size: '4.48MB', owner: '朱双林', kind: 'pdf' },
  { id: 4, title: '文件-400MB.docx', size: '400.00MB', owner: '朱双林2', kind: 'word' },
  { id: 5, title: 'test_large_501mb.docx', size: '57.61MB', words: '752.40万字', owner: '朱双林2', kind: 'word' },
  { id: 6, title: '信息系统安全等级保护测评（等保）.docx', size: '60.85KB', words: '2.81万字', owner: '老李', kind: 'word', compactActions: true },
  { id: 7, title: '安全生产许可证示例.pdf', size: '2.93KB', words: '0.01万字', owner: '孙启明', kind: 'pdf', compactActions: true },
  { id: 8, title: '法学院英文宣传手册 20240415', size: '2.4MB', owner: '孙启明', kind: 'pdf', compactActions: true },
  { id: 9, title: '嗯，.md', size: '354B', words: '0.01万字', owner: '孙启明', kind: 'markdown', compactActions: true },
  { id: 10, title: '现在语音输入的话.md', size: '276B', words: '0.01万字', owner: '老李', kind: 'markdown', compactActions: true },
  { id: 11, title: '示例表格_扩展内容.xlsx', size: '5.31KB', words: '0.02万字', owner: '方谨行', kind: 'sheet' },
  { id: 12, title: '示例演示_约200字.pptx', size: '28.94KB', words: '0.01万字', owner: '方谨行', kind: 'slide' },
  { id: 13, title: '1111222.docx', size: '36.25KB', words: '0.01万字', owner: '老李', kind: 'word', compactActions: true },
  { id: 14, title: '示例演示_200字.pptx', size: '28.96KB', words: '0.01万字', owner: '孙启明', kind: 'slide', compactActions: true },
  { id: 15, title: 'die religionsgesprache der reformationszeit.pdf', size: '9.36MB', words: '15.50万字', owner: '1111', kind: 'pdf' },
];

const selectedGroupId = ref(defaultGroupLibrary.id);
const isCreateGroupModalOpen = ref(false);
const newGroupName = ref('');
const newGroupIntro = ref('');
const memberSearchKeyword = ref('');
const selectedMemberIds = ref<Set<string>>(new Set(['me']));

const groupMembers: GroupMember[] = [
  { id: 'me', name: '188****2830（我）', phone: '188****2830', avatar: '1', isCurrent: true },
  { id: 'creator', name: '创建者', phone: '18836821691', avatar: '创' },
  { id: 'u585697', name: '585697', phone: '18627585697', avatar: '5' },
  { id: 'u700187', name: '700187', phone: '18917001878', avatar: '7' },
  { id: 'laoli', name: '老李', phone: '18930126633', avatar: '老' },
  { id: 'zhushuanglin2', name: '朱双林2', phone: '13290041843', avatar: '朱' },
  { id: 'baozi', name: '包子', phone: '15021202690', avatar: '包' },
  { id: 'jieyu', name: '洁玉', phone: '15755569042', avatar: '洁' },
  { id: 'u1111', name: '1111', phone: '18917001801', avatar: '1' },
  { id: 'heili', name: '黑莉', phone: '18108127692', avatar: '黑' },
];

const activeGroup = computed(() =>
  groupLibraries.value.find((group) => group.id === selectedGroupId.value) ?? defaultGroupLibrary
);

const visibleFolders = computed(() => activeGroup.value.folders);
const visibleFiles = computed(() => {
  const groupIndex = Math.max(0, groupLibraries.value.findIndex((group) => group.id === activeGroup.value.id));
  const start = (groupIndex * 3) % files.length;
  return files.slice(start, start + activeGroup.value.count);
});
const searchPlaceholder = computed(() => `搜索${activeGroup.value.name}文件名、文件夹名称`);

const groupNameCount = computed(() => newGroupName.value.length);
const groupIntroCount = computed(() => newGroupIntro.value.length);
const selectedMemberCount = computed(() => selectedMemberIds.value.size);
const canCreateGroup = computed(() => newGroupName.value.trim().length > 0 && selectedMemberCount.value >= 2);
const filteredGroupMembers = computed(() => {
  const keyword = memberSearchKeyword.value.trim().toLowerCase();
  if (!keyword) return groupMembers;
  return groupMembers.filter((member) =>
    [member.name, member.phone].join(' ').toLowerCase().includes(keyword),
  );
});

const openCreateGroupModal = () => {
  newGroupName.value = '';
  newGroupIntro.value = '';
  memberSearchKeyword.value = '';
  selectedMemberIds.value = new Set(['me']);
  isCreateGroupModalOpen.value = true;
};

const closeCreateGroupModal = () => {
  isCreateGroupModalOpen.value = false;
};

const toggleGroupMember = (member: GroupMember) => {
  if (member.isCurrent) return;
  const nextSelected = new Set(selectedMemberIds.value);
  if (nextSelected.has(member.id)) {
    nextSelected.delete(member.id);
  } else {
    nextSelected.add(member.id);
  }
  selectedMemberIds.value = nextSelected;
};

const createGroup = () => {
  if (!canCreateGroup.value) return;
  const trimmedName = newGroupName.value.trim();
  const id = `group-${Date.now()}`;
  groupLibraries.value = [
    ...groupLibraries.value,
    {
      id,
      name: trimmedName,
      count: 0,
      folders: ['共享文件', '项目资料', '协作底稿'],
      intro: newGroupIntro.value.trim(),
      memberIds: Array.from(selectedMemberIds.value),
    },
  ];
  selectedGroupId.value = id;
  closeCreateGroupModal();
};

const kindLabel: Record<FileKind, string> = {
  pdf: 'PDF',
  word: 'W',
  markdown: 'M',
  sheet: 'X',
  slide: 'P',
};
</script>

<template>
  <div class="knowledge-page">
    <section class="library-pane" aria-label="知识库文件管理">
      <div class="library-body">
        <div class="library-switcher">
          <nav class="group-tabs" aria-label="小组知识库">
            <button
              v-for="group in groupLibraries"
              :key="group.id"
              class="group-tab"
              :class="{ active: selectedGroupId === group.id }"
              type="button"
              @click="selectedGroupId = group.id"
            >
              {{ group.name }}
            </button>
            <button class="group-create-tab" type="button" @click="openCreateGroupModal">
              <Plus :size="12" />
              <span>新建小组</span>
            </button>
          </nav>
        </div>

        <div class="search-row">
          <label class="library-search">
            <Search :size="15" />
            <input type="text" :placeholder="searchPlaceholder" />
            <button class="search-button" type="button">搜索</button>
          </label>
          <button class="add-button" type="button">
            <Plus :size="14" />
            <span>添加文件</span>
            <ChevronDown :size="12" />
          </button>
        </div>

        <div class="folder-row" aria-label="知识库文件夹">
          <button v-for="folder in visibleFolders" :key="folder" class="folder-card" type="button">
            <span class="folder-icon" aria-hidden="true"></span>
            <span>{{ folder }}</span>
          </button>
        </div>

        <div class="file-list" aria-label="知识库文件列表">
          <article v-for="file in visibleFiles" :key="file.id" class="file-row">
            <span class="file-type" :class="`file-type-${file.kind}`">{{ kindLabel[file.kind] }}</span>
            <h3>{{ file.title }}</h3>
            <div class="file-meta">
              <span>{{ file.size }}</span>
              <span v-if="file.words">{{ file.words }}</span>
              <span>创建者 {{ file.owner }}</span>
            </div>
            <div class="file-actions">
              <button v-if="file.compactActions" type="button" aria-label="更多操作">
                <MoreHorizontal :size="18" />
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <div
      v-if="isCreateGroupModalOpen"
      class="group-modal-backdrop"
      role="presentation"
      @click.self="closeCreateGroupModal"
    >
      <section class="group-create-modal" role="dialog" aria-modal="true" aria-labelledby="group-create-title">
        <header class="group-create-header">
          <div>
            <strong id="group-create-title">新建小组</strong>
            <span>创建后会同步生成一个小组知识库</span>
          </div>
          <button type="button" aria-label="关闭新建小组" @click="closeCreateGroupModal">
            <X :size="18" />
          </button>
        </header>

        <div class="group-modal-section">
          <h3>基本信息</h3>
          <label class="group-form-field">
            <span class="field-label-row">
              <span class="field-title"><strong>*</strong> 小组名称</span>
              <small>{{ groupNameCount }}/15</small>
            </span>
            <input
              v-model="newGroupName"
              maxlength="15"
              type="text"
              placeholder="请输入 1-15 字的小组名称"
            />
          </label>
          <label class="group-form-field">
            <span class="field-label-row">
              <span class="field-title">小组简介</span>
              <small>{{ groupIntroCount }}/30</small>
            </span>
            <textarea
              v-model="newGroupIntro"
              maxlength="30"
              rows="3"
              placeholder="简要描述小组的职责或目标（30 字以内）"
            ></textarea>
          </label>
        </div>

        <div class="group-modal-section member-section">
          <div class="member-section-header">
            <div>
              <h3>添加成员</h3>
              <p>至少选择 2 人（包含自己）</p>
            </div>
            <label class="member-search">
              <Search :size="15" />
              <input v-model="memberSearchKeyword" type="text" placeholder="搜索成员姓名或手机号后4位" />
              <button type="button">搜索</button>
            </label>
          </div>

          <div class="member-table" role="table" aria-label="小组成员列表">
            <div class="member-table-row member-table-head" role="row">
              <span role="columnheader">成员姓名</span>
              <span role="columnheader">手机号</span>
              <span role="columnheader">选择</span>
            </div>
            <button
              v-for="member in filteredGroupMembers"
              :key="member.id"
              class="member-table-row"
              type="button"
              role="row"
              :class="{ selected: selectedMemberIds.has(member.id), locked: member.isCurrent }"
              @click="toggleGroupMember(member)"
            >
              <span class="member-name-cell" role="cell">
                <span class="member-avatar">{{ member.avatar }}</span>
                <span>{{ member.name }}</span>
              </span>
              <span role="cell">{{ member.phone }}</span>
              <span class="member-check-cell" role="cell">
                <span class="member-check" aria-hidden="true">
                  <Check v-if="selectedMemberIds.has(member.id)" :size="13" />
                </span>
              </span>
            </button>
          </div>
        </div>

        <footer class="group-create-footer">
          <span>已选 {{ selectedMemberCount }} 人</span>
          <div>
            <button class="group-cancel-button" type="button" @click="closeCreateGroupModal">取消</button>
            <button class="group-create-button" type="button" :disabled="!canCreateGroup" @click="createGroup">
              <Plus :size="16" />
              立即创建
            </button>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.knowledge-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--bg, var(--bg-color));
  color: var(--ink-900, var(--text-strong));
}

.library-pane {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
  background: var(--bg, var(--bg-color));
}

.library-body {
  box-sizing: border-box;
  width: min(100%, 1120px);
  min-width: 0;
  margin: 0 auto;
  padding: 28px 32px 40px;
}

.library-switcher {
  margin-bottom: 18px;
}

.group-tabs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.group-tab,
.group-create-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.group-tab {
  border: 1px solid var(--line, var(--border-color));
  background: var(--bg-panel, var(--card-bg));
  color: var(--ink-700, var(--text-secondary));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.group-tab.active {
  border-color: color-mix(in srgb, var(--accent, var(--primary-color)) 34%, var(--line, var(--border-color)));
  background: var(--accent-tint, var(--primary-soft));
  color: var(--accent, var(--primary-color));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent, var(--primary-color)) 18%, transparent);
}

.group-create-tab {
  border: 1px dashed var(--line-strong, var(--border-color));
  background: transparent;
  color: var(--ink-700, var(--text-secondary));
}

.group-create-tab svg {
  width: 14px;
  height: 14px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.library-search {
  position: relative;
  width: min(600px, 100%);
  height: 40px;
  display: flex;
  align-items: center;
  color: var(--ink-400, var(--text-muted));
}

.library-search svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.library-search input {
  width: 100%;
  height: 40px;
  padding: 0 64px 0 36px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 10px;
  background: var(--bg-panel, var(--card-bg));
  color: var(--ink-900, var(--text-main));
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.library-search input::placeholder {
  color: var(--ink-400, var(--text-muted));
}

.library-search input:focus {
  border-color: var(--ink-900, var(--primary-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-900, var(--text-strong)) 8%, transparent);
}

.search-button {
  position: absolute;
  right: 4px;
  top: 50%;
  height: 30px;
  transform: translateY(-50%);
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: var(--bg-soft, var(--surface-soft));
  color: var(--ink-700, var(--text-secondary));
  font-size: 12.5px;
  cursor: pointer;
}

.add-button {
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: var(--ink-900, var(--primary-color));
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.folder-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 22px 34px;
  margin-bottom: 26px;
}

.folder-card {
  width: 92px;
  min-height: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-900, var(--text-strong));
  font-size: 13px;
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
}

.folder-card:hover {
  background: color-mix(in srgb, var(--ink-900, var(--text-strong)) 3.5%, transparent);
}

.folder-card span:last-child {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-icon {
  position: relative;
  width: 34px;
  height: 24px;
  margin-top: 2px;
  display: block;
  border: 1px solid #d7b36f;
  border-radius: 4px;
  background: linear-gradient(180deg, #e9ca89 0%, #dcb36d 100%);
  box-shadow: inset 0 -1px 0 rgba(133, 90, 24, 0.12);
}

.folder-icon::before {
  content: '';
  position: absolute;
  left: 2px;
  top: -5px;
  width: 16px;
  height: 7px;
  border: 1px solid #d7b36f;
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
  background: #e2bd78;
}

.file-list {
  padding-top: 6px;
  border-top: 1px solid var(--line, var(--border-color));
}

.file-row {
  min-width: 0;
  min-height: 58px;
  display: grid;
  grid-template-columns: 32px minmax(180px, 1fr) auto 28px;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  background: transparent;
  cursor: default;
  transition: background-color 0.12s ease;
}

.file-row:hover {
  background: var(--bg-panel, var(--card-bg));
}

.file-type {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--bg-soft, var(--surface-soft));
  color: var(--ink-700, var(--text-secondary));
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.file-type-word,
.file-type-sheet,
.file-type-slide {
  font-size: 11px;
}

.file-type-markdown {
  font-size: 10px;
}

.file-row h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--ink-900, var(--text-strong));
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.file-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--ink-500, var(--text-muted));
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.file-actions {
  width: 28px;
  display: flex;
  justify-content: center;
}

.file-actions button {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-500, var(--text-muted));
  cursor: pointer;
}

.file-actions button:hover {
  background: var(--bg-soft, var(--surface-soft));
  color: var(--ink-900, var(--text-strong));
}

.group-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: var(--bg-veil, rgba(15, 23, 42, 0.28));
}

.group-create-modal {
  width: min(896px, calc(100vw - 56px));
  max-height: min(760px, calc(100vh - 56px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: var(--bg, var(--bg-color));
  box-shadow: var(--sh-elev, var(--shadow-popover));
}

.group-create-header {
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line, var(--border-color));
  background: var(--bg-panel, var(--card-bg));
}

.group-create-header div {
  display: grid;
  gap: 4px;
}

.group-create-header strong {
  color: var(--ink-900, var(--text-strong));
  font-size: 17px;
  font-weight: 600;
}

.group-create-header span {
  color: var(--ink-500, var(--text-muted));
  font-size: 13px;
}

.group-create-header button {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-500, var(--text-muted));
  cursor: pointer;
}

.group-create-header button:hover {
  background: var(--bg-soft, var(--surface-soft));
  color: var(--ink-900, var(--text-strong));
}

.group-modal-section {
  margin: 16px 20px 0;
  padding: 18px 24px 20px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 12px;
  background: var(--bg-panel, var(--card-bg));
}

.group-modal-section h3 {
  margin: 0 0 14px;
  color: var(--ink-900, var(--text-strong));
  font-size: 15px;
  font-weight: 600;
}

.group-form-field {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--ink-700, var(--text-secondary));
  font-size: 14px;
  font-weight: 500;
}

.field-title {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.field-title strong {
  color: var(--danger, var(--diff-removed));
  line-height: 1;
}

.field-label-row small {
  flex-shrink: 0;
  color: var(--ink-500, var(--text-muted));
  font-size: 12px;
  font-weight: 500;
}

.group-form-field input,
.group-form-field textarea {
  width: 100%;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 8px;
  background: var(--bg-panel, var(--card-bg));
  color: var(--ink-900, var(--text-main));
  font-size: 14px;
}

.group-form-field input {
  height: 38px;
  padding: 0 12px;
}

.group-form-field textarea {
  resize: none;
  min-height: 92px;
  padding: 10px 12px;
  line-height: 1.55;
}

.group-form-field input:focus,
.group-form-field textarea:focus {
  border-color: var(--ink-900, var(--primary-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-900, var(--text-strong)) 8%, transparent);
}

.member-section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
  overflow: hidden;
}

.member-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}

.member-section-header > div {
  min-width: 0;
}

.member-section-header h3 {
  margin-bottom: 4px;
}

.member-section-header p {
  margin: 0;
  color: var(--ink-500, var(--text-muted));
  font-size: 13px;
}

.member-search {
  width: 314px;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px 3px 10px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 8px;
  color: var(--ink-500, var(--text-muted));
  background: var(--bg-panel, var(--card-bg));
}

.member-search input {
  min-width: 0;
  flex: 1;
  height: 100%;
  color: var(--ink-900, var(--text-main));
  font-size: 13px;
}

.member-search button {
  width: 52px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: var(--ink-900, var(--primary-color));
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.member-table {
  min-height: 0;
  max-height: 304px;
  overflow-y: auto;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 8px;
}

.member-table-row {
  width: 100%;
  min-height: 41px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(150px, 0.8fr) 86px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid var(--line, var(--border-color));
  background: transparent;
  color: var(--ink-900, var(--text-main));
  font-size: 14px;
  text-align: left;
}

.member-table-row:last-child {
  border-bottom: 0;
}

.member-table-head {
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 37px;
  background: var(--bg-soft, var(--surface-soft));
  color: var(--ink-700, var(--text-secondary));
  font-weight: 600;
}

button.member-table-row {
  cursor: pointer;
}

button.member-table-row:hover {
  background: var(--bg-soft, var(--surface-soft));
}

.member-table-row.locked {
  cursor: default;
}

.member-table-row.selected {
  background: var(--accent-tint, var(--primary-soft));
}

.member-name-cell {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.member-avatar {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--bg-soft, var(--surface-soft));
  color: var(--ink-700, var(--text-secondary));
  font-size: 12px;
  font-weight: 600;
}

.member-check-cell {
  display: flex;
  justify-content: center;
}

.member-check {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 999px;
  color: var(--accent-700, var(--primary-hover));
  background: var(--bg-panel, var(--card-bg));
}

.member-table-row.selected .member-check {
  border-color: var(--accent, var(--primary-color));
  background: var(--accent-tint, var(--primary-soft));
}

.group-create-footer {
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px 20px;
  color: var(--ink-700, var(--text-secondary));
  font-size: 14px;
}

.group-create-footer > div {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.group-cancel-button,
.group-create-button {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.group-cancel-button {
  border: 1px solid var(--line, var(--border-color));
  background: var(--bg-panel, var(--card-bg));
  color: var(--ink-700, var(--text-secondary));
}

.group-create-button {
  border: 0;
  background: var(--ink-900, var(--primary-color));
  color: #fff;
}

.group-create-button:disabled {
  background: var(--ink-300, var(--surface-soft));
  color: var(--ink-500, var(--text-muted));
  cursor: not-allowed;
}

@media (max-width: 1180px) {
  .library-body {
    padding: 20px 24px 34px;
  }

  .folder-row {
    gap: 18px 24px;
  }

  .file-row {
    grid-template-columns: 32px minmax(140px, 1fr) auto 28px;
    gap: 10px;
  }

  .file-meta {
    gap: 8px;
  }
}

@media (max-width: 760px) {
  .library-body {
    padding: 18px 16px 28px;
  }

  .group-tabs {
    gap: 10px;
  }

  .group-tab,
  .group-create-tab {
    min-height: 34px;
    padding: 0 12px;
    border-radius: 9px;
    font-size: 13px;
  }

  .search-row {
    align-items: stretch;
    flex-direction: column;
  }

  .library-search {
    width: 100%;
  }

  .add-button {
    align-self: flex-start;
  }

  .file-row {
    grid-template-columns: 32px minmax(0, 1fr) 28px;
  }

  .file-meta {
    grid-column: 2 / -1;
    flex-wrap: wrap;
  }

  .member-section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .member-search {
    width: 100%;
  }

  .member-table-row {
    grid-template-columns: minmax(160px, 1fr) minmax(120px, 0.8fr) 54px;
  }
}
</style>
