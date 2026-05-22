import { computed, ref } from 'vue';
import { getCurrentOrganizationId, getOrganizationScopedStorageKey } from './orgSession';

const WORKSPACE_STORAGE_KEY = 'legal-demo-workspaces-v1';
const ACTIVE_WORKSPACE_STORAGE_KEY = 'legal-demo-active-workspace-v1';
const DELETED_WORKSPACE_STORAGE_KEY = 'legal-demo-deleted-workspaces-v1';

export const DEFAULT_WORKSPACE_ID = 'workspace-general';
export const STANDALONE_WORKSPACE_ID = 'workspace-standalone';

export type WorkspaceItem = {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
  pinned?: boolean;
  source?: 'manual' | 'local-folder';
};

const createDefaultWorkspace = (): WorkspaceItem => ({
  id: DEFAULT_WORKSPACE_ID,
  name: '法律技能创建',
  description: '默认技能创建工作区',
  createdAt: '2026-01-01T00:00:00.000Z',
  source: 'manual',
});

const getSafeStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const getWorkspaceStorageKey = () => getOrganizationScopedStorageKey(WORKSPACE_STORAGE_KEY);
const getActiveWorkspaceStorageKey = () => getOrganizationScopedStorageKey(ACTIVE_WORKSPACE_STORAGE_KEY);
const getDeletedWorkspaceStorageKey = () => getOrganizationScopedStorageKey(DELETED_WORKSPACE_STORAGE_KEY);

const normalizeWorkspaceName = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 28 ? normalized.slice(0, 28) : normalized;
};

export const normalizeWorkspaceId = (value: unknown) => {
  if (typeof value !== 'string') return DEFAULT_WORKSPACE_ID;
  const normalized = value.trim();
  return normalized || DEFAULT_WORKSPACE_ID;
};

export const isStandaloneWorkspaceId = (workspaceId: string | null | undefined) =>
  workspaceId === STANDALONE_WORKSPACE_ID;

const createWorkspaceId = (name: string) => {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return `workspace-${normalized || Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
};

const isWorkspaceItem = (value: unknown): value is WorkspaceItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<WorkspaceItem>;
  return Boolean(
    typeof item.id === 'string'
    && item.id.trim()
    && typeof item.name === 'string'
    && item.name.trim()
    && typeof item.createdAt === 'string'
  );
};

const normalizeWorkspaceItem = (item: WorkspaceItem): WorkspaceItem => ({
  id: normalizeWorkspaceId(item.id),
  name: normalizeWorkspaceName(item.name) || '未命名工作空间',
  createdAt: item.createdAt,
  description: typeof item.description === 'string' && item.description.trim()
    ? item.description.trim().slice(0, 48)
    : undefined,
  ...(item.pinned === true ? { pinned: true } : {}),
  source: item.source === 'local-folder' ? 'local-folder' : 'manual',
});

const readDeletedWorkspaceIds = () => {
  const storage = getSafeStorage();
  if (!storage) return new Set<string>();

  try {
    const parsed = JSON.parse(storage.getItem(getDeletedWorkspaceStorageKey()) || '[]');
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set<string>();
  }
};

const persistDeletedWorkspaceIds = (ids: Set<string>) => {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(getDeletedWorkspaceStorageKey(), JSON.stringify([...ids]));
};

const sortWorkspaces = (items: WorkspaceItem[]) => {
  return [...items].sort((left, right) => {
    if (left.pinned && !right.pinned) return -1;
    if (right.pinned && !left.pinned) return 1;
    if (left.id === DEFAULT_WORKSPACE_ID) return -1;
    if (right.id === DEFAULT_WORKSPACE_ID) return 1;
    return Date.parse(left.createdAt) - Date.parse(right.createdAt);
  });
};

const mergeDefaultWorkspace = (items: WorkspaceItem[]) => {
  const defaultWorkspace = createDefaultWorkspace();
  const itemsById = new Map<string, WorkspaceItem>();
  const deletedWorkspaceIds = readDeletedWorkspaceIds();

  if (!deletedWorkspaceIds.has(defaultWorkspace.id)) {
    itemsById.set(defaultWorkspace.id, defaultWorkspace);
  }

  items.forEach((item) => {
    const normalized = normalizeWorkspaceItem(item);
    if (normalized.id === STANDALONE_WORKSPACE_ID) return;
    if (deletedWorkspaceIds.has(normalized.id)) return;
    if (normalized.id === DEFAULT_WORKSPACE_ID) {
      itemsById.set(normalized.id, {
        ...normalized,
        name: defaultWorkspace.name,
        description: normalized.description || defaultWorkspace.description,
      });
      return;
    }
    itemsById.set(normalized.id, normalized);
  });

  return sortWorkspaces([...itemsById.values()]);
};

const readWorkspaces = () => {
  const storage = getSafeStorage();
  if (!storage) return [createDefaultWorkspace()];

  try {
    const parsed = JSON.parse(storage.getItem(getWorkspaceStorageKey()) || '[]');
    const items = Array.isArray(parsed) ? parsed.filter(isWorkspaceItem) : [];
    return mergeDefaultWorkspace(items);
  } catch {
    return [createDefaultWorkspace()];
  }
};

const readActiveWorkspaceId = (items: WorkspaceItem[]) => {
  const storage = getSafeStorage();
  const stored = storage?.getItem(getActiveWorkspaceStorageKey()) || '';
  if (stored === STANDALONE_WORKSPACE_ID) return STANDALONE_WORKSPACE_ID;
  if (items.some((item) => item.id === stored)) return stored;
  return items[0]?.id ?? STANDALONE_WORKSPACE_ID;
};

const workspaceItems = ref<WorkspaceItem[]>(readWorkspaces());
const activeWorkspaceId = ref(readActiveWorkspaceId(workspaceItems.value));
let loadedOrganizationId = getCurrentOrganizationId();

const persistWorkspaces = () => {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(getWorkspaceStorageKey(), JSON.stringify(workspaceItems.value));
};

const persistActiveWorkspace = () => {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(getActiveWorkspaceStorageKey(), activeWorkspaceId.value);
};

const refreshForCurrentOrganization = () => {
  const organizationId = getCurrentOrganizationId();
  if (organizationId === loadedOrganizationId) return;
  loadedOrganizationId = organizationId;
  workspaceItems.value = readWorkspaces();
  activeWorkspaceId.value = readActiveWorkspaceId(workspaceItems.value);
};

export const syncWorkspacesForCurrentOrganization = () => {
  loadedOrganizationId = getCurrentOrganizationId();
  workspaceItems.value = readWorkspaces();
  activeWorkspaceId.value = readActiveWorkspaceId(workspaceItems.value);
};

export const getActiveWorkspaceId = () => {
  refreshForCurrentOrganization();
  return activeWorkspaceId.value || DEFAULT_WORKSPACE_ID;
};

export const getWorkspaceById = (workspaceId: string | null | undefined) => {
  refreshForCurrentOrganization();
  const id = normalizeWorkspaceId(workspaceId);
  return workspaceItems.value.find((item) => item.id === id) ?? null;
};

export const getWorkspaceDisplayName = (workspaceId: string | null | undefined) => {
  if (workspaceId === STANDALONE_WORKSPACE_ID) return '不指定工作区';
  return getWorkspaceById(workspaceId)?.name ?? '法律技能创建';
};

export const useWorkspaces = () => {
  refreshForCurrentOrganization();

  const workspaces = computed(() => workspaceItems.value);
  const activeWorkspace = computed(() =>
    activeWorkspaceId.value === STANDALONE_WORKSPACE_ID
      ? null
      : workspaceItems.value.find((item) => item.id === activeWorkspaceId.value) ?? workspaceItems.value[0] ?? null
  );

  const setActiveWorkspace = (workspaceId: string) => {
    refreshForCurrentOrganization();
    if (workspaceId === STANDALONE_WORKSPACE_ID) {
      activeWorkspaceId.value = STANDALONE_WORKSPACE_ID;
      persistActiveWorkspace();
      return true;
    }

    const normalizedId = normalizeWorkspaceId(workspaceId);
    if (!workspaceItems.value.some((item) => item.id === normalizedId)) return false;
    activeWorkspaceId.value = normalizedId;
    persistActiveWorkspace();
    return true;
  };

  const createWorkspace = (
    name: string,
    options: { description?: string; source?: WorkspaceItem['source'] } = {},
  ) => {
    refreshForCurrentOrganization();
    const normalizedName = normalizeWorkspaceName(name);
    if (!normalizedName) return null;

    const existing = workspaceItems.value.find((item) => item.name === normalizedName);
    if (existing) {
      activeWorkspaceId.value = existing.id;
      persistActiveWorkspace();
      return existing;
    }

    const item: WorkspaceItem = {
      id: createWorkspaceId(normalizedName),
      name: normalizedName,
      createdAt: new Date().toISOString(),
      description: options.description?.trim().slice(0, 48) || undefined,
      source: options.source === 'local-folder' ? 'local-folder' : 'manual',
    };

    workspaceItems.value = mergeDefaultWorkspace([...workspaceItems.value, item]);
    activeWorkspaceId.value = item.id;
    persistWorkspaces();
    persistActiveWorkspace();
    return item;
  };

  const renameWorkspace = (workspaceId: string, name: string) => {
    refreshForCurrentOrganization();
    const normalizedId = normalizeWorkspaceId(workspaceId);
    const normalizedName = normalizeWorkspaceName(name);
    if (!normalizedName || normalizedId === STANDALONE_WORKSPACE_ID) return null;

    const existingIndex = workspaceItems.value.findIndex((item) => item.id === normalizedId);
    const existing = workspaceItems.value[existingIndex];
    if (existingIndex < 0 || !existing) return null;

    const sameNameWorkspace = workspaceItems.value.find((item) =>
      item.id !== normalizedId && item.name === normalizedName
    );
    if (sameNameWorkspace) return sameNameWorkspace;

    const updated = normalizeWorkspaceItem({
      ...existing,
      name: normalizedName,
    });
    workspaceItems.value.splice(existingIndex, 1, updated);
    workspaceItems.value = sortWorkspaces(workspaceItems.value);
    persistWorkspaces();
    return updated;
  };

  const updateWorkspace = (
    workspaceId: string,
    patch: Partial<Pick<WorkspaceItem, 'description' | 'source'>>,
  ) => {
    refreshForCurrentOrganization();
    const normalizedId = normalizeWorkspaceId(workspaceId);
    if (normalizedId === STANDALONE_WORKSPACE_ID) return null;

    const existingIndex = workspaceItems.value.findIndex((item) => item.id === normalizedId);
    const existing = workspaceItems.value[existingIndex];
    if (existingIndex < 0 || !existing) return null;

    const updated = normalizeWorkspaceItem({
      ...existing,
      ...patch,
    });
    workspaceItems.value.splice(existingIndex, 1, updated);
    workspaceItems.value = sortWorkspaces(workspaceItems.value);
    persistWorkspaces();
    return updated;
  };

  const toggleWorkspacePinned = (workspaceId: string) => {
    refreshForCurrentOrganization();
    const normalizedId = normalizeWorkspaceId(workspaceId);
    if (normalizedId === STANDALONE_WORKSPACE_ID) return null;

    const existingIndex = workspaceItems.value.findIndex((item) => item.id === normalizedId);
    const existing = workspaceItems.value[existingIndex];
    if (existingIndex < 0 || !existing) return null;

    const updated = normalizeWorkspaceItem({
      ...existing,
      pinned: !existing.pinned,
    });
    workspaceItems.value.splice(existingIndex, 1, updated);
    workspaceItems.value = sortWorkspaces(workspaceItems.value);
    persistWorkspaces();
    return updated;
  };

  const deleteWorkspace = (workspaceId: string) => {
    refreshForCurrentOrganization();
    const normalizedId = normalizeWorkspaceId(workspaceId);
    if (normalizedId === STANDALONE_WORKSPACE_ID) return false;

    const existing = workspaceItems.value.some((item) => item.id === normalizedId);
    if (!existing) return false;

    if (normalizedId === DEFAULT_WORKSPACE_ID) {
      const deletedWorkspaceIds = readDeletedWorkspaceIds();
      deletedWorkspaceIds.add(DEFAULT_WORKSPACE_ID);
      persistDeletedWorkspaceIds(deletedWorkspaceIds);
    }

    workspaceItems.value = workspaceItems.value.filter((item) => item.id !== normalizedId);
    if (activeWorkspaceId.value === normalizedId) {
      activeWorkspaceId.value = workspaceItems.value[0]?.id ?? STANDALONE_WORKSPACE_ID;
      persistActiveWorkspace();
    }
    persistWorkspaces();
    return true;
  };

  return {
    activeWorkspace,
    activeWorkspaceId,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    setActiveWorkspace,
    toggleWorkspacePinned,
    updateWorkspace,
    workspaces,
  };
};
