import { computed, ref } from 'vue';
import { docxLegalResearchMock } from '../data/docxLegalResearchMock';

const STORAGE_KEY = 'legal-demo-chat-history';
const MAX_HISTORY_ITEMS = 20;
const DOCX_MOCK_HISTORY_ID = 'mock-docx-nda';
const LEGACY_NDA_MOCK_HISTORY_ID = 'mock-nda-default';

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
};

const createInitialHistory = (): ChatHistoryItem[] => [
  createDocxMockHistoryItem(),
  {
    id: 'mock-labor-default',
    title: '劳动赔偿怎么算？',
    prompt: '劳动赔偿怎么算？',
    createdAt: '昨天 16:20',
  },
];

const normalizePrompt = (prompt: string) => prompt.replace(/\s+/g, ' ').trim();

function createDocxMockHistoryItem(): ChatHistoryItem {
  return {
    id: DOCX_MOCK_HISTORY_ID,
    title: '生成保密协议',
    prompt: normalizePrompt(docxLegalResearchMock.userPrompt),
    createdAt: docxLegalResearchMock.createdAt,
    mock: 'docx',
  };
}

const ensureDocxMockHistory = (items: ChatHistoryItem[]) => {
  const docxMockItem = createDocxMockHistoryItem();
  const docxPrompt = normalizePrompt(docxMockItem.prompt);
  const keptItems = items.filter((item) => {
    if (item.id === DOCX_MOCK_HISTORY_ID || item.id === LEGACY_NDA_MOCK_HISTORY_ID) return false;
    return normalizePrompt(item.prompt) !== docxPrompt;
  });

  return [docxMockItem, ...keptItems].slice(0, MAX_HISTORY_ITEMS);
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

const formatHistoryTime = () => {
  const date = new Date();
  const time = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `今天 ${time}`;
};

const createTitleFromPrompt = (prompt: string) => {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (!normalized) return '新法律咨询';
  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
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
          historyItems.value = ensureDocxMockHistory(normalizedItems);
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

    return historyItems.value.find((item) => item.id === historyId)
      ?? historyItems.value.find((item) => normalizedPrompt && item.prompt === normalizedPrompt)
      ?? null;
  };

  const getCachedConversation = (historyId?: string | null, prompt?: string | null) => {
    const item = findHistoryItem(historyId, prompt);
    return item?.answer?.content.trim() ? item : null;
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
        title: existing.mock === 'docx' ? existing.title : createTitleFromPrompt(normalizedPrompt),
        createdAt: existing.mock === 'docx' ? existing.createdAt : formatHistoryTime(),
      };
      historyItems.value.unshift(updated);
      persistHistory();
      persistRemoteHistoryItem(updated);
      return updated;
    }

    const item: ChatHistoryItem = {
      id: createId(),
      title: createTitleFromPrompt(normalizedPrompt),
      prompt: normalizedPrompt,
      createdAt: formatHistoryTime(),
    };

    historyItems.value = [item, ...historyItems.value].slice(0, MAX_HISTORY_ITEMS);
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
      title: existing.mock === 'docx' ? existing.title : createTitleFromPrompt(normalizedPrompt),
      prompt: normalizedPrompt,
      answer,
    };

    historyItems.value.splice(existingIndex, 1);
    historyItems.value.unshift(updated);
    historyItems.value = historyItems.value.slice(0, MAX_HISTORY_ITEMS);
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
    updateConversationAnswer,
  };
};
