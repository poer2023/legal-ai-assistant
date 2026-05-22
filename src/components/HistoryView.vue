<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Check,
  Clock3,
  FolderOpen,
  List,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next';
import { useChatHistory, type ChatHistoryItem } from '../stores/chatHistory';
import {
  normalizeWorkspaceId,
  STANDALONE_WORKSPACE_ID,
  useWorkspaces,
} from '../stores/workspaces';

const router = useRouter();
const {
  recentHistory,
  loadHistory,
  renameConversation,
  toggleConversationPinned,
  deleteConversation,
} = useChatHistory();
const {
  activeWorkspaceId,
  setActiveWorkspace,
  workspaces,
} = useWorkspaces();

const query = ref('');
const openMenuId = ref('');
const renamingId = ref('');
const renameValue = ref('');
const pendingDeleteItem = ref<ChatHistoryItem | null>(null);
const historyViewMode = ref<'timeline' | 'workspace'>('timeline');

type HistoryWorkspaceGroup = {
  id: string;
  name: string;
  meta: string;
  items: ChatHistoryItem[];
};

const normalizedQuery = computed(() => query.value.trim().toLowerCase());
const filteredHistory = computed(() => {
  if (!normalizedQuery.value) return recentHistory.value;

  return recentHistory.value.filter((item) => {
    const haystack = `${item.title} ${item.prompt}`.toLowerCase();
    return haystack.includes(normalizedQuery.value);
  });
});
const pinnedHistory = computed(() => filteredHistory.value.filter((item) => item.pinned));
const unpinnedHistory = computed(() => filteredHistory.value.filter((item) => !item.pinned));
const workspaceHistoryGroups = computed<HistoryWorkspaceGroup[]>(() => {
  const itemsByWorkspace = filteredHistory.value.reduce<Map<string, ChatHistoryItem[]>>((groups, item) => {
    const workspaceId = normalizeWorkspaceId(item.workspaceId);
    groups.set(workspaceId, [...(groups.get(workspaceId) ?? []), item]);
    return groups;
  }, new Map());

  const groups = workspaces.value.map((workspace) => {
    const items = itemsByWorkspace.get(workspace.id) ?? [];
    return {
      id: workspace.id,
      name: workspace.name,
      meta: workspace.description || `${items.length} 条会话`,
      items,
    };
  });

  const standaloneItems = itemsByWorkspace.get(STANDALONE_WORKSPACE_ID) ?? [];
  if (standaloneItems.length || activeWorkspaceId.value === STANDALONE_WORKSPACE_ID) {
    groups.push({
      id: STANDALONE_WORKSPACE_ID,
      name: '不指定工作区',
      meta: `${standaloneItems.length} 条独立会话`,
      items: standaloneItems,
    });
  }

  return groups.filter((group) => group.items.length > 0 || group.id === activeWorkspaceId.value);
});

const formatHistoryTime = (createdAt: string) => {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return createdAt;

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= 0 && diffMs < minute) return '刚刚';
  if (diffMs >= 0 && diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} 分钟前`;
  if (diffMs >= 0 && diffMs < day && date.getDate() === now.getDate()) {
    return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear()
    && date.getMonth() === yesterday.getMonth()
    && date.getDate() === yesterday.getDate()
  ) {
    return '昨天';
  }

  const days = Math.floor(diffMs / day);
  if (days > 0 && days < 7) return `${days} 天前`;
  if (days >= 7 && days < 30) return `${Math.floor(days / 7)} 周前`;

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
};

const closeMenu = () => {
  openMenuId.value = '';
};

const openConversation = (item: ChatHistoryItem) => {
  if (renamingId.value === item.id) return;
  closeMenu();
  const workspaceId = normalizeWorkspaceId(item.workspaceId);
  setActiveWorkspace(workspaceId);

  const queryParams: Record<string, string> = {
    prompt: item.prompt,
    historyId: item.id,
    workspaceId,
  };

  if (item.mock) {
    queryParams.mock = item.mock;
  }

  void router.push({
    name: 'chat',
    query: queryParams,
  });
};

const startNewConversation = () => {
  closeMenu();
  void router.push({ name: 'home' });
};

const toggleMenu = (item: ChatHistoryItem) => {
  openMenuId.value = openMenuId.value === item.id ? '' : item.id;
};

const togglePinned = (item: ChatHistoryItem) => {
  toggleConversationPinned(item.id);
  closeMenu();
};

const startRename = (item: ChatHistoryItem) => {
  renameValue.value = item.title === '新会话' ? '' : item.title;
  renamingId.value = item.id;
  closeMenu();

  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-history-page-rename="true"]');
    input?.focus();
    input?.select();
  });
};

const cancelRename = () => {
  renamingId.value = '';
  renameValue.value = '';
};

const submitRename = (item: ChatHistoryItem) => {
  if (renamingId.value !== item.id) return;

  const nextTitle = renameValue.value.trim();
  if (nextTitle) {
    renameConversation(item.id, nextTitle);
  }

  cancelRename();
};

const requestDelete = (item: ChatHistoryItem) => {
  pendingDeleteItem.value = item;
  closeMenu();
};

const closeDeleteConfirm = () => {
  pendingDeleteItem.value = null;
};

const confirmDelete = () => {
  const item = pendingDeleteItem.value;
  if (!item) return;

  deleteConversation(item.id);
  closeDeleteConfirm();
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    closeMenu();
    return;
  }

  if (target.closest('.history-page-menu') || target.closest('.history-page-more')) return;
  closeMenu();
};

onMounted(() => {
  void loadHistory();
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <section class="history-page">
    <div class="history-page-inner">
      <header class="history-page-header">
        <h1>历史会话</h1>
        <button type="button" class="history-new-btn" @click="startNewConversation">
          <Plus :size="15" />
          <span>新建会话</span>
        </button>
      </header>

      <label class="history-search">
        <Search :size="18" />
        <input v-model="query" type="search" placeholder="搜索会话..." />
      </label>

      <div class="history-view-switch" role="tablist" aria-label="历史会话视图">
        <button
          type="button"
          :class="{ active: historyViewMode === 'timeline' }"
          role="tab"
          @click="historyViewMode = 'timeline'"
        >
          <List :size="15" />
          <span>Timeline</span>
        </button>
        <button
          type="button"
          :class="{ active: historyViewMode === 'workspace' }"
          role="tab"
          @click="historyViewMode = 'workspace'"
        >
          <FolderOpen :size="15" />
          <span>工作区</span>
        </button>
      </div>

      <div v-if="filteredHistory.length === 0" class="history-empty">
        未找到匹配的会话
      </div>

      <template v-else-if="historyViewMode === 'timeline'">
        <section v-if="pinnedHistory.length" class="history-group" aria-label="已置顶">
          <div class="history-group-title">已置顶</div>
          <div class="history-list">
            <article
              v-for="item in pinnedHistory"
              :key="item.id"
              class="history-list-row"
              @click="openConversation(item)"
            >
              <Pin class="history-pin-mark" :size="14" fill="currentColor" />
              <div class="history-row-main">
                <input
                  v-if="renamingId === item.id"
                  v-model="renameValue"
                  class="history-page-rename"
                  data-history-page-rename="true"
                  maxlength="38"
                  @click.stop
                  @keydown.enter.prevent="submitRename(item)"
                  @keydown.esc.prevent="cancelRename"
                  @blur="submitRename(item)"
                />
                <span v-else class="history-row-title" :title="item.title">{{ item.title }}</span>
              </div>
              <time v-if="renamingId !== item.id" class="history-row-time">
                {{ formatHistoryTime(item.createdAt) }}
              </time>
              <div v-if="renamingId !== item.id" class="history-row-actions" @click.stop>
                <button
                  type="button"
                  class="history-page-more"
                  :aria-label="`打开 ${item.title} 的更多操作`"
                  :aria-expanded="openMenuId === item.id"
                  @click="toggleMenu(item)"
                >
                  <MoreHorizontal :size="18" />
                </button>
                <div v-if="openMenuId === item.id" class="history-page-menu" role="menu">
                  <button type="button" role="menuitem" @click="togglePinned(item)">
                    <Pin :size="15" />
                    <span>取消置顶</span>
                  </button>
                  <button type="button" role="menuitem" @click="startRename(item)">
                    <Pencil :size="15" />
                    <span>重命名</span>
                  </button>
                  <button type="button" class="danger" role="menuitem" @click="requestDelete(item)">
                    <Trash2 :size="15" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-if="unpinnedHistory.length" class="history-group" aria-label="最近">
          <div class="history-group-title">最近</div>
          <div class="history-list">
            <article
              v-for="item in unpinnedHistory"
              :key="item.id"
              class="history-list-row"
              @click="openConversation(item)"
            >
              <div class="history-row-main unpinned">
                <input
                  v-if="renamingId === item.id"
                  v-model="renameValue"
                  class="history-page-rename"
                  data-history-page-rename="true"
                  maxlength="38"
                  @click.stop
                  @keydown.enter.prevent="submitRename(item)"
                  @keydown.esc.prevent="cancelRename"
                  @blur="submitRename(item)"
                />
                <span v-else class="history-row-title" :title="item.title">{{ item.title }}</span>
              </div>
              <time v-if="renamingId !== item.id" class="history-row-time">
                {{ formatHistoryTime(item.createdAt) }}
              </time>
              <div v-if="renamingId !== item.id" class="history-row-actions" @click.stop>
                <button
                  type="button"
                  class="history-page-more"
                  :aria-label="`打开 ${item.title} 的更多操作`"
                  :aria-expanded="openMenuId === item.id"
                  @click="toggleMenu(item)"
                >
                  <MoreHorizontal :size="18" />
                </button>
                <div v-if="openMenuId === item.id" class="history-page-menu" role="menu">
                  <button type="button" role="menuitem" @click="togglePinned(item)">
                    <Pin :size="15" />
                    <span>置顶</span>
                  </button>
                  <button type="button" role="menuitem" @click="startRename(item)">
                    <Pencil :size="15" />
                    <span>重命名</span>
                  </button>
                  <button type="button" class="danger" role="menuitem" @click="requestDelete(item)">
                    <Trash2 :size="15" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>

      <template v-else>
        <section
          v-for="group in workspaceHistoryGroups"
          :key="group.id"
          class="history-workspace-section"
          :aria-label="group.name"
        >
          <header class="history-workspace-header">
            <div class="history-workspace-title">
              <FolderOpen :size="18" />
              <div>
                <h2>{{ group.name }}</h2>
                <p>{{ group.meta }}</p>
              </div>
            </div>
            <button
              type="button"
              class="history-workspace-select"
              :class="{ active: activeWorkspaceId === group.id }"
              @click="setActiveWorkspace(group.id)"
            >
              <Check v-if="activeWorkspaceId === group.id" :size="14" />
              <Clock3 v-else-if="group.id === STANDALONE_WORKSPACE_ID" :size="14" />
              <FolderOpen v-else :size="14" />
              <span>{{ activeWorkspaceId === group.id ? '当前' : '切换' }}</span>
            </button>
          </header>
          <div class="history-list">
            <article
              v-for="item in group.items"
              :key="item.id"
              class="history-list-row"
              @click="openConversation(item)"
            >
              <Pin
                v-if="item.pinned"
                class="history-pin-mark"
                :size="14"
                fill="currentColor"
              />
              <div class="history-row-main" :class="{ unpinned: !item.pinned }">
                <input
                  v-if="renamingId === item.id"
                  v-model="renameValue"
                  class="history-page-rename"
                  data-history-page-rename="true"
                  maxlength="38"
                  @click.stop
                  @keydown.enter.prevent="submitRename(item)"
                  @keydown.esc.prevent="cancelRename"
                  @blur="submitRename(item)"
                />
                <span v-else class="history-row-title" :title="item.title">{{ item.title }}</span>
              </div>
              <time v-if="renamingId !== item.id" class="history-row-time">
                {{ formatHistoryTime(item.createdAt) }}
              </time>
              <div v-if="renamingId !== item.id" class="history-row-actions" @click.stop>
                <button
                  type="button"
                  class="history-page-more"
                  :aria-label="`打开 ${item.title} 的更多操作`"
                  :aria-expanded="openMenuId === item.id"
                  @click="toggleMenu(item)"
                >
                  <MoreHorizontal :size="18" />
                </button>
                <div v-if="openMenuId === item.id" class="history-page-menu" role="menu">
                  <button type="button" role="menuitem" @click="togglePinned(item)">
                    <Pin :size="15" />
                    <span>{{ item.pinned ? '取消置顶' : '置顶' }}</span>
                  </button>
                  <button type="button" role="menuitem" @click="startRename(item)">
                    <Pencil :size="15" />
                    <span>重命名</span>
                  </button>
                  <button type="button" class="danger" role="menuitem" @click="requestDelete(item)">
                    <Trash2 :size="15" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>
    </div>

    <div
      v-if="pendingDeleteItem"
      class="history-modal-backdrop"
      role="presentation"
      @click.self="closeDeleteConfirm"
    >
      <section
        class="history-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-page-delete-title"
      >
        <header class="history-delete-head">
          <h2 id="history-page-delete-title">删除会话？</h2>
          <button type="button" aria-label="关闭" @click="closeDeleteConfirm">
            <X :size="18" />
          </button>
        </header>
        <p>
          将永久删除会话
          <strong>「{{ pendingDeleteItem.title }}」</strong>
          ，包含全部消息记录。该操作不可撤销。
        </p>
        <footer class="history-delete-actions">
          <button type="button" class="history-cancel-btn" @click="closeDeleteConfirm">取消</button>
          <button type="button" class="history-delete-btn" @click="confirmDelete">删除</button>
        </footer>
      </section>
    </div>
  </section>
</template>

<style scoped>
.history-page {
  min-height: 100%;
  padding: 38px 56px 60px;
  background: var(--bg, var(--bg-color));
  color: var(--ink-900, var(--text-main));
}

.history-page-inner {
  width: min(100%, 880px);
  margin: 0 auto;
}

.history-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.history-page-header h1 {
  margin: 0;
  color: var(--ink-900, var(--text-strong));
  font-family: var(--font-serif, 'Songti SC', 'STSong', 'SimSun', Georgia, serif);
  font-size: 31px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
}

.history-new-btn,
.history-delete-btn {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  border-radius: 8px;
  border: 0;
  background: var(--ink-900, var(--primary-color));
  color: var(--on-primary, #fff);
  font-size: 14px;
  font-weight: 500;
}

.history-new-btn:hover {
  background: var(--ink-800, var(--primary-hover));
}

.history-search {
  position: relative;
  display: block;
  margin-bottom: 18px;
}

.history-search svg {
  position: absolute;
  left: 16px;
  top: 50%;
  color: var(--ink-400, var(--text-muted));
  transform: translateY(-50%);
}

.history-search input,
.history-page-rename {
  width: 100%;
  border: 1px solid var(--line, var(--border-color));
  background: var(--bg-panel, var(--card-bg));
  color: var(--ink-900, var(--text-main));
  outline: 0;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.history-search input {
  height: 48px;
  padding: 0 16px 0 44px;
  border-radius: 10px;
  font-size: 14px;
}

.history-search input::placeholder {
  color: var(--ink-400, var(--text-muted));
}

.history-search input:focus,
.history-page-rename:focus {
  border-color: var(--ink-900, var(--primary-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-900, var(--primary-color)) 8%, transparent);
}

.history-view-switch {
  width: fit-content;
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(104px, 1fr));
  gap: 4px;
  margin: 0 0 20px;
  padding: 4px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 10px;
  background: var(--bg-panel, var(--card-bg));
}

.history-view-switch button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border-radius: 7px;
  color: var(--ink-500, var(--text-secondary));
  font-size: 13px;
  font-weight: 650;
}

.history-view-switch button.active {
  background: var(--ink-900, var(--primary-color));
  color: var(--on-primary, #fff);
}

.history-group {
  margin-bottom: 18px;
}

.history-group-title {
  margin-bottom: 6px;
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  font-weight: 500;
}

.history-list {
  border-top: 1px solid var(--line, var(--border-color));
}

.history-list-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 57px;
  padding: 0 12px;
  border-bottom: 1px solid var(--line, var(--border-color));
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.history-list-row:hover {
  background: color-mix(in srgb, var(--ink-900, var(--text-strong)) 2%, transparent);
}

.history-pin-mark {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  color: var(--accent, var(--primary-color));
}

.history-row-main {
  min-width: 0;
  flex: 1 1 auto;
}

.history-row-main.unpinned {
  padding-left: 0;
}

.history-row-title {
  display: block;
  overflow: hidden;
  color: var(--ink-900, var(--text-main));
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-row-time {
  flex: 0 0 auto;
  min-width: 82px;
  color: var(--ink-400, var(--text-muted));
  font-size: 13px;
  text-align: right;
}

.history-row-actions {
  position: relative;
  flex: 0 0 auto;
}

.history-page-more {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--ink-400, var(--text-muted));
  opacity: 1;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.history-page-more:hover,
.history-page-more[aria-expanded="true"] {
  background: var(--bg-soft, var(--surface-soft));
  color: var(--ink-700, var(--text-secondary));
}

.history-page-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 20;
  min-width: 144px;
  padding: 6px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 10px;
  background: var(--bg-panel, var(--card-bg));
  box-shadow: var(--shadow-popover, 0 18px 44px rgba(15, 23, 42, 0.16));
}

.history-page-menu button {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 7px;
  color: var(--ink-900, var(--text-main));
  font-size: 13px;
  text-align: left;
}

.history-page-menu button:hover {
  background: var(--bg-soft, var(--surface-soft));
}

.history-page-menu button.danger {
  color: var(--danger, var(--danger-color, #dc2626));
}

.history-page-rename {
  max-width: 480px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 14px;
}

.history-empty {
  padding: 48px 0;
  color: var(--ink-500, var(--text-secondary));
  font-size: 14px;
  text-align: center;
}

.history-workspace-section {
  margin-bottom: 24px;
}

.history-workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px 12px;
}

.history-workspace-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink-900, var(--text-main));
}

.history-workspace-title svg {
  flex: 0 0 auto;
  color: var(--accent, var(--primary-color));
}

.history-workspace-title h2 {
  margin: 0;
  color: var(--ink-900, var(--text-strong));
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
}

.history-workspace-title p {
  margin: 2px 0 0;
  color: var(--ink-400, var(--text-muted));
  font-size: 12px;
}

.history-workspace-select {
  flex: 0 0 auto;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 8px;
  color: var(--ink-500, var(--text-secondary));
  background: var(--bg-panel, var(--card-bg));
  font-size: 13px;
  font-weight: 650;
}

.history-workspace-select:hover,
.history-workspace-select.active {
  border-color: var(--accent, var(--primary-color));
  color: var(--accent, var(--primary-color));
  background: var(--bg-soft, var(--surface-soft));
}

.history-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-veil, rgba(15, 23, 42, 0.36));
}

.history-delete-dialog {
  width: min(100%, 440px);
  overflow: hidden;
  border-radius: 14px;
  background: var(--bg, var(--card-bg));
  box-shadow: var(--shadow-modal, 0 24px 64px rgba(15, 23, 42, 0.22));
}

.history-delete-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line, var(--border-color));
}

.history-delete-head h2 {
  flex: 1;
  margin: 0;
  color: var(--ink-900, var(--text-strong));
  font-size: 18px;
  font-weight: 650;
}

.history-delete-head button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--ink-700, var(--text-secondary));
}

.history-delete-head button:hover,
.history-cancel-btn:hover {
  background: var(--bg-soft, var(--surface-soft));
}

.history-delete-dialog p {
  margin: 0;
  padding: 20px 24px;
  color: var(--ink-700, var(--text-secondary));
  font-size: 14px;
  line-height: 1.65;
}

.history-delete-dialog strong {
  color: var(--ink-900, var(--text-main));
}

.history-delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--line, var(--border-color));
}

.history-cancel-btn {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--ink-700, var(--text-secondary));
  font-size: 14px;
}

.history-delete-btn {
  height: 36px;
  background: var(--danger, var(--danger-color, #dc2626));
}

@media (max-width: 760px) {
  .history-page {
    padding: 24px 18px 44px;
  }

  .history-page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .history-page-header h1 {
    font-size: 27px;
  }

  .history-new-btn {
    width: 100%;
  }

  .history-view-switch {
    width: 100%;
    grid-template-columns: 1fr 1fr;
  }

  .history-workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .history-list-row {
    min-height: 56px;
    padding: 0 4px;
  }

  .history-row-time {
    min-width: 58px;
    font-size: 12px;
  }

  .history-page-more {
    opacity: 1;
  }
}
</style>
