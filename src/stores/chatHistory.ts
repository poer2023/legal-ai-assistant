import { computed, ref } from 'vue';
import { docxLegalResearchMock } from '../data/docxLegalResearchMock';

const STORAGE_KEY = 'legal-demo-chat-history';
const MAX_HISTORY_ITEMS = 20;
const DOCX_MOCK_HISTORY_ID = 'mock-docx-nda';
const LEGACY_NDA_MOCK_HISTORY_ID = 'mock-nda-default';
const DEFAULT_CONVERSATION_TITLE = '新会话';
const DOCX_MOCK_CREATED_AT = '2000-01-01 00:00';
const HIDDEN_MOCKS_STORAGE_KEY = 'legal-demo-chat-history-hidden-mocks';

export type ChatHistoryItem = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  answer?: ChatHistoryAnswer;
  mock?: 'docx';
};

export type ChatHistoryAnswer = {
  content: string;
  model?: string;
  cachedAt: string;
  createdSkillId?: string;
  thinkingContent?: string;
};

const createInitialHistory = (): ChatHistoryItem[] => [
  createDocxMockHistoryItem(),
];

const normalizePrompt = (prompt: string) => prompt.replace(/\s+/g, ' ').trim();

const normalizeTitle = (title: string) => {
  const normalized = title.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 18 ? normalized.slice(0, 18) : normalized;
};

function createDocxMockHistoryItem(): ChatHistoryItem {
  return {
    id: DOCX_MOCK_HISTORY_ID,
    title: '生成保密协议',
    prompt: normalizePrompt(docxLegalResearchMock.userPrompt),
    createdAt: DOCX_MOCK_CREATED_AT,
    mock: 'docx',
  };
}

const readHiddenMockIds = () => {
  const storage = getSafeStorage();
  if (!storage) return new Set<string>();

  try {
    const parsed = JSON.parse(storage.getItem(HIDDEN_MOCKS_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set<string>();
  }
};

const writeHiddenMockIds = (ids: Set<string>) => {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(HIDDEN_MOCKS_STORAGE_KEY, JSON.stringify([...ids]));
};

const hideMockHistoryItem = (id: string) => {
  const hiddenMockIds = readHiddenMockIds();
  hiddenMockIds.add(id);
  writeHiddenMockIds(hiddenMockIds);
};

const parseHistoryTimestamp = (createdAt: string) => {
  const value = createdAt.trim();
  const directTimestamp = Date.parse(value.includes('T') ? value : value.replace(' ', 'T'));
  if (!Number.isNaN(directTimestamp)) return directTimestamp;

  const relativeMatch = value.match(/^(今天|昨天)\s+(\d{1,2}):(\d{2})$/);
  if (relativeMatch) {
    const date = new Date();
    if (relativeMatch[1] === '昨天') {
      date.setDate(date.getDate() - 1);
    }
    date.setHours(Number(relativeMatch[2]), Number(relativeMatch[3]), 0, 0);
    return date.getTime();
  }

  return 0;
};

const sortHistoryItems = (items: ChatHistoryItem[]) => {
  return [...items].sort((left, right) => {
    if (left.mock === 'docx' && right.mock !== 'docx') return 1;
    if (right.mock === 'docx' && left.mock !== 'docx') return -1;
    return parseHistoryTimestamp(right.createdAt) - parseHistoryTimestamp(left.createdAt);
  });
};

const ensureDocxMockHistory = (items: ChatHistoryItem[]) => {
  const hiddenMockIds = readHiddenMockIds();
  const defaultDocxMockItem = createDocxMockHistoryItem();
  const docxPrompt = normalizePrompt(defaultDocxMockItem.prompt);
  const existingDocxMockItem = items.find((item) => item.id === DOCX_MOCK_HISTORY_ID);
  const keptItems = items.filter((item) => {
    if (item.id === DOCX_MOCK_HISTORY_ID || item.id === LEGACY_NDA_MOCK_HISTORY_ID) return false;
    return hiddenMockIds.has(DOCX_MOCK_HISTORY_ID) || normalizePrompt(item.prompt) !== docxPrompt;
  });

  const sortedItems = sortHistoryItems(keptItems).slice(0, MAX_HISTORY_ITEMS - 1);
  if (hiddenMockIds.has(DOCX_MOCK_HISTORY_ID)) {
    return sortedItems.slice(0, MAX_HISTORY_ITEMS);
  }

  const docxMockItem: ChatHistoryItem = {
    ...defaultDocxMockItem,
    ...(existingDocxMockItem ? { title: existingDocxMockItem.title, answer: existingDocxMockItem.answer } : {}),
    id: DOCX_MOCK_HISTORY_ID,
    prompt: docxPrompt,
    createdAt: DOCX_MOCK_CREATED_AT,
    mock: 'docx',
  };

  return [...sortedItems, docxMockItem].slice(0, MAX_HISTORY_ITEMS);
};

const getSafeStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const readHistory = (): ChatHistoryItem[] => {
  const storage = getSafeStorage();
  if (!storage) return createInitialHistory();

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createInitialHistory();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createInitialHistory();

    const parsedItems = parsed.reduce<ChatHistoryItem[]>((items, item) => {
      if (
        typeof item?.id !== 'string'
        || typeof item?.title !== 'string'
        || typeof item?.prompt !== 'string'
        || typeof item?.createdAt !== 'string'
      ) {
        return items;
      }

      const answer = item.answer && typeof item.answer === 'object'
        && typeof item.answer.content === 'string'
        && item.answer.content.trim()
        && typeof item.answer.cachedAt === 'string'
          ? {
              content: item.answer.content,
              model: typeof item.answer.model === 'string' ? item.answer.model : undefined,
              cachedAt: item.answer.cachedAt,
              createdSkillId: typeof item.answer.createdSkillId === 'string' ? item.answer.createdSkillId : undefined,
              thinkingContent: typeof item.answer.thinkingContent === 'string' ? item.answer.thinkingContent : undefined,
            }
          : undefined;

      items.push({
        id: item.id,
        title: item.title,
        prompt: item.prompt,
        createdAt: item.createdAt,
        ...(answer ? { answer } : {}),
        ...(item.mock === 'docx' ? { mock: 'docx' as const } : {}),
      });

      return items;
    }, []);

    return ensureDocxMockHistory(parsedItems);
  } catch {
    return createInitialHistory();
  }
};

const historyItems = ref<ChatHistoryItem[]>(ensureDocxMockHistory(readHistory()));
const hasLoadedRemoteHistory = ref(false);
let remoteHistoryLoadPromise: Promise<void> | null = null;

const persistHistory = () => {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(historyItems.value));
};

const persistRemoteHistoryItem = (item: ChatHistoryItem) => {
  if (typeof window === 'undefined') return;

  void fetch('/api/chat-history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  }).catch(() => {
    // Keep the local copy as a fallback when the server-side store is unavailable.
  });
};

const deleteRemoteHistoryItem = (id: string) => {
  if (typeof window === 'undefined') return;

  void fetch(`/api/chat-history?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {
    // Local storage remains the source of truth when the remote store is unavailable.
  });
};

const formatHistoryTime = () => {
  return new Date().toISOString();
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const useChatHistory = () => {
  const recentHistory = computed(() => historyItems.value);

  const loadHistory = async () => {
    if (typeof window === 'undefined') return;
    if (hasLoadedRemoteHistory.value) return;

    remoteHistoryLoadPromise ??= fetch('/api/chat-history')
      .then(async (response) => {
        if (!response.ok) return;

        const data = await response.json().catch(() => null) as { items?: ChatHistoryItem[] } | null;
        if (!Array.isArray(data?.items)) return;

        const normalizedItems = data.items.reduce<ChatHistoryItem[]>((items, item) => {
          if (
            typeof item?.id !== 'string'
            || typeof item?.title !== 'string'
            || typeof item?.prompt !== 'string'
            || typeof item?.createdAt !== 'string'
          ) {
            return items;
          }

          items.push({
            id: item.id,
            title: item.title,
            prompt: item.prompt,
            createdAt: item.createdAt,
            ...(item.answer ? { answer: item.answer } : {}),
            ...(item.mock === 'docx' ? { mock: 'docx' as const } : {}),
          });
          return items;
        }, []);

        if (normalizedItems.length) {
          const localItemsById = new Map(historyItems.value.map((item) => [item.id, item]));
          const mergedItems = normalizedItems.map((item) => {
            const localAnswer = localItemsById.get(item.id)?.answer;
            if (!item.answer || !localAnswer) return item;

            return {
              ...item,
              answer: {
                ...item.answer,
                createdSkillId: item.answer.createdSkillId || localAnswer.createdSkillId,
                thinkingContent: item.answer.thinkingContent || localAnswer.thinkingContent,
              },
            };
          });
          const hasRemoteDocxMock = normalizedItems.some((item) => item.id === DOCX_MOCK_HISTORY_ID);
          const localMockItems = hasRemoteDocxMock
            ? []
            : historyItems.value.filter((item) => item.mock === 'docx');
          historyItems.value = ensureDocxMockHistory([...localMockItems, ...mergedItems]);
          persistHistory();
        }
      })
      .catch(() => {
        // Local storage remains the fallback for offline/local-only runs.
      })
      .finally(() => {
        hasLoadedRemoteHistory.value = true;
      });

    await remoteHistoryLoadPromise;
  };

  const findHistoryItem = (historyId?: string | null, prompt?: string | null) => {
    const normalizedPrompt = prompt ? normalizePrompt(prompt) : '';

    const itemById = historyItems.value.find((item) => item.id === historyId);
    if (itemById && (!normalizedPrompt || normalizePrompt(itemById.prompt) === normalizedPrompt)) {
      return itemById;
    }

    return historyItems.value.find((item) => normalizedPrompt && normalizePrompt(item.prompt) === normalizedPrompt)
      ?? null;
  };

  const getCachedConversation = (historyId?: string | null, prompt?: string | null) => {
    const item = findHistoryItem(historyId, prompt);
    return item?.answer?.content.trim() ? item : null;
  };

  const updateConversationTitle = (
    historyId: string | null | undefined,
    prompt: string | null | undefined,
    title: string,
  ) => {
    const nextTitle = normalizeTitle(title);
    if (!nextTitle) return null;

    const existing = findHistoryItem(historyId, prompt);
    if (!existing) return null;

    const existingIndex = historyItems.value.findIndex((item) => item.id === existing.id);
    if (existingIndex < 0) return null;

    const updated: ChatHistoryItem = {
      ...existing,
      title: nextTitle,
    };

    historyItems.value.splice(existingIndex, 1, updated);
    historyItems.value = ensureDocxMockHistory(historyItems.value);
    persistHistory();
    persistRemoteHistoryItem(updated);
    return updated;
  };

  const renameConversation = (historyId: string, title: string) => {
    return updateConversationTitle(historyId, null, title);
  };

  const applyGeneratedConversationTitle = (
    historyId: string | null | undefined,
    prompt: string | null | undefined,
    title: string,
  ) => {
    const existing = findHistoryItem(historyId, prompt);
    if (!existing || existing.mock || normalizeTitle(existing.title) !== DEFAULT_CONVERSATION_TITLE) return null;
    return updateConversationTitle(historyId, prompt, title);
  };

  const deleteConversation = (historyId: string) => {
    const existingIndex = historyItems.value.findIndex((item) => item.id === historyId);
    const existing = historyItems.value[existingIndex];
    if (existingIndex < 0 || !existing) return false;

    if (existing.mock) {
      hideMockHistoryItem(existing.id);
    }
    historyItems.value.splice(existingIndex, 1);
    historyItems.value = ensureDocxMockHistory(historyItems.value);
    persistHistory();
    deleteRemoteHistoryItem(historyId);
    return true;
  };

  const addMockConversation = (prompt: string) => {
    const normalizedPrompt = normalizePrompt(prompt);
    if (!normalizedPrompt) return null;

    const existingIndex = historyItems.value.findIndex((item) => item.prompt === normalizedPrompt);
    if (existingIndex >= 0) {
      const existing = historyItems.value[existingIndex];
      if (!existing) return null;
      historyItems.value.splice(existingIndex, 1);
      const updated: ChatHistoryItem = {
        ...existing,
        title: existing.mock === 'docx' ? existing.title : DEFAULT_CONVERSATION_TITLE,
        createdAt: existing.mock === 'docx' ? existing.createdAt : formatHistoryTime(),
      };
      historyItems.value = ensureDocxMockHistory([updated, ...historyItems.value]);
      persistHistory();
      persistRemoteHistoryItem(updated);
      return updated;
    }

    const item: ChatHistoryItem = {
      id: createId(),
      title: DEFAULT_CONVERSATION_TITLE,
      prompt: normalizedPrompt,
      createdAt: formatHistoryTime(),
    };

    historyItems.value = ensureDocxMockHistory([item, ...historyItems.value]);
    persistHistory();
    persistRemoteHistoryItem(item);
    return item;
  };

  const updateConversationAnswer = (
    historyId: string | null | undefined,
    prompt: string,
    answer: ChatHistoryAnswer,
  ) => {
    const normalizedPrompt = normalizePrompt(prompt);
    if (!normalizedPrompt || !answer.content.trim()) return null;

    let existingIndex = historyItems.value.findIndex((item) => item.id === historyId);
    if (existingIndex < 0) {
      existingIndex = historyItems.value.findIndex((item) => item.prompt === normalizedPrompt);
    }

    if (existingIndex < 0) {
      const item = addMockConversation(normalizedPrompt);
      existingIndex = item ? historyItems.value.findIndex((historyItem) => historyItem.id === item.id) : -1;
    }

    const existing = historyItems.value[existingIndex];
    if (!existing) return null;

    const updated: ChatHistoryItem = {
      ...existing,
      title: existing.mock === 'docx' ? existing.title : normalizeTitle(existing.title) || DEFAULT_CONVERSATION_TITLE,
      prompt: normalizedPrompt,
      answer,
    };

    historyItems.value.splice(existingIndex, 1, updated);
    historyItems.value = ensureDocxMockHistory(historyItems.value);
    persistHistory();
    persistRemoteHistoryItem(updated);
    return updated;
  };

  return {
    recentHistory,
    loadHistory,
    addMockConversation,
    findHistoryItem,
    getCachedConversation,
    updateConversationTitle,
    applyGeneratedConversationTitle,
    renameConversation,
    deleteConversation,
    updateConversationAnswer,
  };
};
