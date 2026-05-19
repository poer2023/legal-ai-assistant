import { computed, ref } from 'vue';
import { getCurrentOrganizationId, getOrganizationScopedStorageKey } from './orgSession';

const STORAGE_KEY = 'legal-demo-chat-history';
const MAX_HISTORY_ITEMS = 20;
const DOCX_MOCK_HISTORY_ID = 'mock-docx-nda';
const LEGACY_NDA_MOCK_HISTORY_ID = 'mock-nda-default';
const DEFAULT_CONVERSATION_TITLE = '新会话';

export type ChatHistoryItem = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  answer?: ChatHistoryAnswer;
  mock?: 'docx';
  pinned?: boolean;
};

export type ChatHistoryAnswer = {
  content: string;
  model?: string;
  cachedAt: string;
  createdSkillId?: string;
  thinkingContent?: string;
};

const createInitialHistory = (): ChatHistoryItem[] => [];

const normalizePrompt = (prompt: string) => prompt.replace(/\s+/g, ' ').trim();

const normalizeTitle = (title: string) => {
  const normalized = title.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 38 ? normalized.slice(0, 38) : normalized;
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
    if (left.pinned && !right.pinned) return -1;
    if (right.pinned && !left.pinned) return 1;
    if (left.mock === 'docx' && right.mock !== 'docx') return 1;
    if (right.mock === 'docx' && left.mock !== 'docx') return -1;
    return parseHistoryTimestamp(right.createdAt) - parseHistoryTimestamp(left.createdAt);
  });
};

const removeDeprecatedMockHistory = (items: ChatHistoryItem[]) => {
  const keptItems = items.filter((item) =>
    item.id !== DOCX_MOCK_HISTORY_ID
    && item.id !== LEGACY_NDA_MOCK_HISTORY_ID
    && item.mock !== 'docx'
  );
  return sortHistoryItems(keptItems).slice(0, MAX_HISTORY_ITEMS);
};

const getSafeStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const getHistoryStorageKey = () => getOrganizationScopedStorageKey(STORAGE_KEY);

const getChatHistoryApiUrl = (
  organizationId: string,
  params: Record<string, string> = {},
) => {
  const searchParams = new URLSearchParams({
    orgId: organizationId,
    ...params,
  });
  return `/api/chat-history?${searchParams.toString()}`;
};

const readHistory = (): ChatHistoryItem[] => {
  const storage = getSafeStorage();
  if (!storage) return createInitialHistory();

  const raw = storage.getItem(getHistoryStorageKey());
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
        ...(item.pinned === true ? { pinned: true } : {}),
      });

      return items;
    }, []);

    return removeDeprecatedMockHistory(parsedItems);
  } catch {
    return createInitialHistory();
  }
};

const historyItems = ref<ChatHistoryItem[]>(removeDeprecatedMockHistory(readHistory()));
const loadedRemoteOrganizationIds = new Set<string>();
const remoteHistoryLoadPromises = new Map<string, Promise<void>>();

const persistHistory = () => {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(getHistoryStorageKey(), JSON.stringify(historyItems.value));
};

const persistRemoteHistoryItem = (item: ChatHistoryItem) => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;

  void fetch(getChatHistoryApiUrl(organizationId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...item,
      organizationId,
    }),
  }).catch(() => {
    // Keep the local copy as a fallback when the server-side store is unavailable.
  });
};

const deleteRemoteHistoryItem = (id: string) => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;

  void fetch(getChatHistoryApiUrl(organizationId, { id }), {
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

export const syncHistoryForCurrentOrganization = () => {
  historyItems.value = removeDeprecatedMockHistory(readHistory());
};

export const useChatHistory = () => {
  const recentHistory = computed(() => historyItems.value);

  const loadHistory = async () => {
    if (typeof window === 'undefined') return;
    const organizationId = getCurrentOrganizationId();
    if (!organizationId) return;
    if (loadedRemoteOrganizationIds.has(organizationId)) return;

    if (!remoteHistoryLoadPromises.has(organizationId)) {
      remoteHistoryLoadPromises.set(organizationId, fetch(getChatHistoryApiUrl(organizationId))
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
            ...(item.pinned === true ? { pinned: true } : {}),
          });
          return items;
        }, []);

        if (getCurrentOrganizationId() !== organizationId) return;

        if (normalizedItems.length) {
          const localItemsById = new Map(historyItems.value.map((item) => [item.id, item]));
          const mergedItems = normalizedItems.map((item) => {
            const localItem = localItemsById.get(item.id);
            const localAnswer = localItem?.answer;
            const localPinned = localItem?.pinned === true;
            if (!item.answer || !localAnswer) {
              return localPinned ? { ...item, pinned: true } : item;
            }

            return {
              ...item,
              ...(localPinned ? { pinned: true } : {}),
              answer: {
                ...item.answer,
                createdSkillId: item.answer.createdSkillId || localAnswer.createdSkillId,
                thinkingContent: item.answer.thinkingContent || localAnswer.thinkingContent,
              },
            };
          });
          historyItems.value = removeDeprecatedMockHistory(mergedItems);
          persistHistory();
        }
      })
      .catch(() => {
        // Local storage remains the fallback for offline/local-only runs.
      })
      .finally(() => {
        loadedRemoteOrganizationIds.add(organizationId);
      }));
    }

    await remoteHistoryLoadPromises.get(organizationId);
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
    historyItems.value = removeDeprecatedMockHistory(historyItems.value);
    persistHistory();
    persistRemoteHistoryItem(updated);
    return updated;
  };

  const renameConversation = (historyId: string, title: string) => {
    return updateConversationTitle(historyId, null, title);
  };

  const toggleConversationPinned = (historyId: string) => {
    const existingIndex = historyItems.value.findIndex((item) => item.id === historyId);
    const existing = historyItems.value[existingIndex];
    if (existingIndex < 0 || !existing) return null;

    const updated: ChatHistoryItem = {
      ...existing,
      pinned: !existing.pinned,
    };

    if (!updated.pinned) {
      delete updated.pinned;
    }

    historyItems.value.splice(existingIndex, 1, updated);
    historyItems.value = removeDeprecatedMockHistory(historyItems.value);
    persistHistory();
    persistRemoteHistoryItem(updated);
    return updated;
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

    historyItems.value.splice(existingIndex, 1);
    historyItems.value = removeDeprecatedMockHistory(historyItems.value);
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
      historyItems.value = removeDeprecatedMockHistory([updated, ...historyItems.value]);
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

    historyItems.value = removeDeprecatedMockHistory([item, ...historyItems.value]);
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
    historyItems.value = removeDeprecatedMockHistory(historyItems.value);
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
    toggleConversationPinned,
    deleteConversation,
    updateConversationAnswer,
  };
};
