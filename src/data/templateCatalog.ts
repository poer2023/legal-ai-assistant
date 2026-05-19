import { ref } from 'vue';
import type { TemplateAsset, TemplateDocumentSection } from './legalAssets';
import { getCurrentOrganizationId, getOrganizationScopedStorageKey } from '../stores/orgSession';

export type TemplatePublishDestination = 'group' | 'team' | 'public';
export type TemplatePublishDestinationInput = TemplatePublishDestination | TemplatePublishDestination[];

export type TemplatePublishSettings = {
  destinations: TemplatePublishDestination[];
  groupIds: string[];
  pricing: 'free' | 'paid';
  price: string;
  tags: string[];
  publishedAt: string;
};

export type TemplatePublishOptions = {
  destination?: TemplatePublishDestination;
  destinations?: TemplatePublishDestinationInput;
  groupIds?: string[];
  pricing?: 'free' | 'paid';
  price?: string;
  tags?: string[];
};

export type TemplateExtractionState = 'idle' | 'reading' | 'analyzing' | 'done' | 'error';

export type TemplateOriginalFile = {
  fileName: string;
  fileSize: number;
  fileType: string;
  originalText: string;
};

export type TemplateRecord = {
  template: TemplateAsset;
  originalFile?: TemplateOriginalFile;
  extractionState?: TemplateExtractionState;
  extractionMessage?: string;
  publishDestinations?: TemplatePublishDestination[];
  publishSettings?: TemplatePublishSettings;
};

const customTemplateStorageKey = 'legal-version-custom-templates';
const templateOriginalFilesStorageKey = 'legal-version-template-original-files';
const templateExtractionStatesStorageKey = 'legal-version-template-extraction-states';
const templateExtractionMessagesStorageKey = 'legal-version-template-extraction-messages';
const templatePublishDestinationsStorageKey = 'legal-version-template-publish-destinations';
const templatePublishSettingsStorageKey = 'legal-version-template-publish-settings';

const isTemplatePublishDestination = (destination: unknown): destination is TemplatePublishDestination =>
  destination === 'group' || destination === 'team' || destination === 'public';

export const normalizeTemplatePublishDestinationList = (
  destinations: unknown,
): TemplatePublishDestination[] => {
  const values = Array.isArray(destinations) ? destinations : [destinations];
  return Array.from(new Set(values.filter(isTemplatePublishDestination)));
};

const normalizeStringList = (value: unknown, limit = 20) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim()),
  )).slice(0, limit);
};

const normalizeTemplateSection = (section: unknown): TemplateDocumentSection | null => {
  if (!section || typeof section !== 'object') return null;
  const item = section as Partial<TemplateDocumentSection>;
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) return null;

  const table = item.table && typeof item.table === 'object'
    ? {
        headers: normalizeStringList(item.table.headers, 12),
        rows: Array.isArray(item.table.rows)
          ? item.table.rows
              .filter((row) => Array.isArray(row))
              .map((row) => (row as unknown[]).map((cell) => (typeof cell === 'string' ? cell.trim() : String(cell ?? '').trim())).filter(Boolean))
              .filter((row) => row.length)
          : [],
      }
    : null;

  return {
    title,
    ...(normalizeStringList(item.paragraphs, 20).length ? { paragraphs: normalizeStringList(item.paragraphs, 20) } : {}),
    ...(normalizeStringList(item.items, 20).length ? { items: normalizeStringList(item.items, 20) } : {}),
    ...(table?.headers.length && table.rows.length ? { table } : {}),
  };
};

const normalizeTemplate = (template: unknown): TemplateAsset | null => {
  if (!template || typeof template !== 'object') return null;
  const item = template as Partial<TemplateAsset>;
  if (
    typeof item.id !== 'string'
    || typeof item.name !== 'string'
    || typeof item.preview !== 'string'
  ) {
    return null;
  }

  const documentSections = Array.isArray(item.documentSections)
    ? item.documentSections.map(normalizeTemplateSection).filter((section): section is TemplateDocumentSection => Boolean(section))
    : [];

  return {
    id: item.id,
    name: item.name,
    docType: typeof item.docType === 'string' && item.docType.trim() ? item.docType : '自定义模板',
    source: typeof item.source === 'string' && item.source.trim() ? item.source : '自建模板',
    applicableSkills: normalizeStringList(item.applicableSkills),
    agent: typeof item.agent === 'string' && item.agent.trim() ? item.agent : '模板助手',
    requiredFields: normalizeStringList(item.requiredFields),
    preview: item.preview,
    routeName: typeof item.routeName === 'string' && item.routeName.trim() ? item.routeName : 'templates',
    tags: normalizeStringList(item.tags),
    updatedAt: typeof item.updatedAt === 'string' && item.updatedAt.trim()
      ? item.updatedAt
      : new Date().toISOString().slice(0, 10),
    ...(documentSections.length ? { documentSections } : {}),
  };
};

const normalizeOriginalFile = (file: unknown): TemplateOriginalFile | undefined => {
  if (!file || typeof file !== 'object') return undefined;
  const item = file as Partial<TemplateOriginalFile>;
  if (typeof item.fileName !== 'string' || typeof item.originalText !== 'string') return undefined;

  return {
    fileName: item.fileName,
    fileSize: typeof item.fileSize === 'number' ? Math.max(0, item.fileSize) : 0,
    fileType: typeof item.fileType === 'string' ? item.fileType : '',
    originalText: item.originalText,
  };
};

const normalizeExtractionState = (state: unknown): TemplateExtractionState =>
  state === 'reading' || state === 'analyzing' || state === 'done' || state === 'error'
    ? state
    : 'idle';

const normalizePublishSettings = (
  value: unknown,
  fallbackDestinations: unknown = [],
): TemplatePublishSettings | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Partial<TemplatePublishSettings>;
  const pricing = item.pricing === 'paid' ? 'paid' : 'free';
  const publishedAt = typeof item.publishedAt === 'string' && !Number.isNaN(Date.parse(item.publishedAt))
    ? new Date(item.publishedAt).toISOString()
    : new Date().toISOString();

  return {
    destinations: normalizeTemplatePublishDestinationList(item.destinations ?? fallbackDestinations),
    groupIds: normalizeStringList(item.groupIds),
    pricing,
    price: pricing === 'paid' && typeof item.price === 'string' ? item.price.replace(/[^\d.]/g, '') : '',
    tags: normalizeStringList(item.tags, 3),
    publishedAt,
  };
};

const createPublishSettings = (
  input: TemplatePublishDestinationInput | TemplatePublishOptions,
): TemplatePublishSettings => {
  const options = typeof input === 'object' && !Array.isArray(input)
    ? input as TemplatePublishOptions
    : { destinations: input as TemplatePublishDestinationInput };
  const destinations = normalizeTemplatePublishDestinationList(options.destinations ?? options.destination ?? []);
  const pricing = options.pricing === 'paid' ? 'paid' : 'free';

  return {
    destinations,
    groupIds: destinations.includes('group') ? normalizeStringList(options.groupIds) : [],
    pricing,
    price: pricing === 'paid' && typeof options.price === 'string' ? options.price.replace(/[^\d.]/g, '') : '',
    tags: normalizeStringList(options.tags, 3),
    publishedAt: new Date().toISOString(),
  };
};

const readJsonRecord = <T>(storageKey: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(getOrganizationScopedStorageKey(storageKey)) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJsonRecord = (storageKey: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getOrganizationScopedStorageKey(storageKey), JSON.stringify(value));
};

const readStoredTemplates = () => {
  const parsed = readJsonRecord<unknown[]>(customTemplateStorageKey, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeTemplate).filter((template): template is TemplateAsset => Boolean(template));
};

const readStoredOriginalFiles = () => {
  const parsed = readJsonRecord<Record<string, unknown>>(templateOriginalFilesStorageKey, {});
  return Object.entries(parsed).reduce<Record<string, TemplateOriginalFile>>((files, [templateId, file]) => {
    const normalized = normalizeOriginalFile(file);
    if (templateId && normalized) files[templateId] = normalized;
    return files;
  }, {});
};

const readStoredExtractionStates = () => {
  const parsed = readJsonRecord<Record<string, unknown>>(templateExtractionStatesStorageKey, {});
  return Object.entries(parsed).reduce<Record<string, TemplateExtractionState>>((states, [templateId, state]) => {
    if (templateId) states[templateId] = normalizeExtractionState(state);
    return states;
  }, {});
};

const readStoredStringRecord = (storageKey: string) => {
  const parsed = readJsonRecord<Record<string, unknown>>(storageKey, {});
  return Object.entries(parsed).reduce<Record<string, string>>((messages, [templateId, message]) => {
    if (templateId && typeof message === 'string') messages[templateId] = message;
    return messages;
  }, {});
};

const readStoredPublishDestinations = () => {
  const parsed = readJsonRecord<Record<string, unknown>>(templatePublishDestinationsStorageKey, {});
  return Object.entries(parsed).reduce<Record<string, TemplatePublishDestination[]>>((destinations, [templateId, value]) => {
    const normalized = normalizeTemplatePublishDestinationList(value);
    if (templateId && normalized.length) destinations[templateId] = normalized;
    return destinations;
  }, {});
};

const readStoredPublishSettings = () => {
  const parsed = readJsonRecord<Record<string, unknown>>(templatePublishSettingsStorageKey, {});
  return Object.entries(parsed).reduce<Record<string, TemplatePublishSettings>>((settings, [templateId, value]) => {
    const normalized = normalizePublishSettings(value);
    if (templateId && normalized) settings[templateId] = normalized;
    return settings;
  }, {});
};

export const customTemplateAssets = ref<TemplateAsset[]>(readStoredTemplates());
export const originalFilesByTemplateId = ref<Record<string, TemplateOriginalFile>>(readStoredOriginalFiles());
export const extractionStateByTemplateId = ref<Record<string, TemplateExtractionState>>(readStoredExtractionStates());
export const extractionMessageByTemplateId = ref<Record<string, string>>(
  readStoredStringRecord(templateExtractionMessagesStorageKey),
);

const templatePublishDestinations = ref<Record<string, TemplatePublishDestination[]>>(
  readStoredPublishDestinations(),
);
const templatePublishSettings = ref<Record<string, TemplatePublishSettings>>(
  readStoredPublishSettings(),
);
const loadedRemoteTemplateOrganizationIds = new Set<string>();
const remoteTemplateLoadPromises = new Map<string, Promise<void>>();

const persistTemplatesLocal = () => {
  writeJsonRecord(customTemplateStorageKey, customTemplateAssets.value);
  writeJsonRecord(templateOriginalFilesStorageKey, originalFilesByTemplateId.value);
  writeJsonRecord(templateExtractionStatesStorageKey, extractionStateByTemplateId.value);
  writeJsonRecord(templateExtractionMessagesStorageKey, extractionMessageByTemplateId.value);
  writeJsonRecord(templatePublishDestinationsStorageKey, templatePublishDestinations.value);
  writeJsonRecord(templatePublishSettingsStorageKey, templatePublishSettings.value);
};

const getTemplatesApiUrl = (
  organizationId: string,
  params: Record<string, string> = {},
) => {
  const searchParams = new URLSearchParams({
    orgId: organizationId,
    ...params,
  });
  return `/api/templates?${searchParams.toString()}`;
};

const toRecord = (template: TemplateAsset): TemplateRecord => ({
  template,
  originalFile: originalFilesByTemplateId.value[template.id],
  extractionState: extractionStateByTemplateId.value[template.id] ?? 'idle',
  extractionMessage: extractionMessageByTemplateId.value[template.id] ?? '',
  publishDestinations: templatePublishDestinations.value[template.id] ?? [],
  publishSettings: templatePublishSettings.value[template.id],
});

const applyRecords = (records: TemplateRecord[]) => {
  const nextTemplates: TemplateAsset[] = [];
  const nextOriginalFiles: Record<string, TemplateOriginalFile> = {};
  const nextExtractionStates: Record<string, TemplateExtractionState> = {};
  const nextExtractionMessages: Record<string, string> = {};
  const nextPublishDestinations: Record<string, TemplatePublishDestination[]> = {};
  const nextPublishSettings: Record<string, TemplatePublishSettings> = {};
  const seen = new Set<string>();

  records.forEach((record) => {
    const template = normalizeTemplate(record.template);
    if (!template || seen.has(template.id)) return;
    seen.add(template.id);
    nextTemplates.push(template);

    const originalFile = normalizeOriginalFile(record.originalFile);
    if (originalFile) nextOriginalFiles[template.id] = originalFile;

    nextExtractionStates[template.id] = normalizeExtractionState(record.extractionState);
    if (typeof record.extractionMessage === 'string' && record.extractionMessage.trim()) {
      nextExtractionMessages[template.id] = record.extractionMessage;
    }

    const destinations = normalizeTemplatePublishDestinationList(record.publishDestinations);
    if (destinations.length) nextPublishDestinations[template.id] = destinations;

    const settings = normalizePublishSettings(record.publishSettings, destinations);
    if (settings) nextPublishSettings[template.id] = settings;
  });

  customTemplateAssets.value = nextTemplates;
  originalFilesByTemplateId.value = nextOriginalFiles;
  extractionStateByTemplateId.value = nextExtractionStates;
  extractionMessageByTemplateId.value = nextExtractionMessages;
  templatePublishDestinations.value = {
    ...templatePublishDestinations.value,
    ...nextPublishDestinations,
  };
  templatePublishSettings.value = {
    ...templatePublishSettings.value,
    ...nextPublishSettings,
  };
  persistTemplatesLocal();
};

const persistTemplateRemote = (record: TemplateRecord) => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;

  void fetch(getTemplatesApiUrl(organizationId, { id: record.template.id }), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...record,
      organizationId,
    }),
  }).catch(() => {
    // localStorage remains the product fallback when the remote store is unavailable.
  });
};

const deleteTemplateRemote = (templateId: string) => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;

  void fetch(getTemplatesApiUrl(organizationId, { id: templateId }), {
    method: 'DELETE',
  }).catch(() => {
    // localStorage remains the product fallback when the remote store is unavailable.
  });
};

export const loadCustomTemplates = async () => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;
  if (loadedRemoteTemplateOrganizationIds.has(organizationId)) return;

  if (!remoteTemplateLoadPromises.has(organizationId)) {
    remoteTemplateLoadPromises.set(organizationId, fetch(getTemplatesApiUrl(organizationId))
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json().catch(() => null) as { records?: TemplateRecord[] } | null;
        if (getCurrentOrganizationId() !== organizationId) return;
        if (Array.isArray(data?.records) && data.records.length) {
          applyRecords(data.records);
        } else if (customTemplateAssets.value.length) {
          customTemplateAssets.value.forEach((template) => persistTemplateRemote(toRecord(template)));
        }
      })
      .catch(() => {
        // Keep the local copy as the available demo/runtime source.
      })
      .finally(() => {
        loadedRemoteTemplateOrganizationIds.add(organizationId);
      }));
  }

  await remoteTemplateLoadPromises.get(organizationId);
};

export const syncTemplateCatalogForCurrentOrganization = () => {
  customTemplateAssets.value = readStoredTemplates();
  originalFilesByTemplateId.value = readStoredOriginalFiles();
  extractionStateByTemplateId.value = readStoredExtractionStates();
  extractionMessageByTemplateId.value = readStoredStringRecord(templateExtractionMessagesStorageKey);
  templatePublishDestinations.value = readStoredPublishDestinations();
  templatePublishSettings.value = readStoredPublishSettings();
};

export const upsertCustomTemplate = (
  template: TemplateAsset,
  options: {
    originalFile?: TemplateOriginalFile;
    extractionState?: TemplateExtractionState;
    extractionMessage?: string;
    publishDestinations?: TemplatePublishDestination[];
    publishSettings?: TemplatePublishSettings;
    persist?: boolean;
  } = {},
) => {
  const normalized = normalizeTemplate(template);
  if (!normalized) return null;

  const existingIndex = customTemplateAssets.value.findIndex((item) => item.id === normalized.id);
  if (existingIndex >= 0) {
    customTemplateAssets.value.splice(existingIndex, 1, normalized);
  } else {
    customTemplateAssets.value = [normalized, ...customTemplateAssets.value];
  }

  if (options.originalFile) {
    originalFilesByTemplateId.value = {
      ...originalFilesByTemplateId.value,
      [normalized.id]: options.originalFile,
    };
  }

  if (options.extractionState) {
    extractionStateByTemplateId.value = {
      ...extractionStateByTemplateId.value,
      [normalized.id]: options.extractionState,
    };
  }

  if (typeof options.extractionMessage === 'string') {
    extractionMessageByTemplateId.value = {
      ...extractionMessageByTemplateId.value,
      [normalized.id]: options.extractionMessage,
    };
  }

  if (options.publishDestinations?.length) {
    templatePublishDestinations.value = {
      ...templatePublishDestinations.value,
      [normalized.id]: normalizeTemplatePublishDestinationList(options.publishDestinations),
    };
  }

  if (options.publishSettings) {
    templatePublishSettings.value = {
      ...templatePublishSettings.value,
      [normalized.id]: options.publishSettings,
    };
  }

  persistTemplatesLocal();
  if (options.persist !== false) {
    persistTemplateRemote(toRecord(normalized));
  }
  return normalized;
};

export const deleteCustomTemplate = (templateId: string) => {
  const nextTemplates = customTemplateAssets.value.filter((template) => template.id !== templateId);
  if (nextTemplates.length === customTemplateAssets.value.length) return false;

  const { [templateId]: _originalFile, ...nextOriginalFiles } = originalFilesByTemplateId.value;
  const { [templateId]: _state, ...nextStates } = extractionStateByTemplateId.value;
  const { [templateId]: _message, ...nextMessages } = extractionMessageByTemplateId.value;
  const { [templateId]: _destinations, ...nextDestinations } = templatePublishDestinations.value;
  const { [templateId]: _settings, ...nextSettings } = templatePublishSettings.value;

  customTemplateAssets.value = nextTemplates;
  originalFilesByTemplateId.value = nextOriginalFiles;
  extractionStateByTemplateId.value = nextStates;
  extractionMessageByTemplateId.value = nextMessages;
  templatePublishDestinations.value = nextDestinations;
  templatePublishSettings.value = nextSettings;
  persistTemplatesLocal();
  deleteTemplateRemote(templateId);
  return true;
};

export const getTemplatePublishDestinations = (templateId: string) =>
  templatePublishDestinations.value[templateId] ?? [];

export const getTemplatePublishSettings = (templateId: string) =>
  templatePublishSettings.value[templateId];

export const hasTemplatePublishDestination = (
  templateId: string,
  destination: TemplatePublishDestination,
) => getTemplatePublishDestinations(templateId).includes(destination);

export const publishTemplateToMarket = (
  templateId: string,
  destination: TemplatePublishDestinationInput | TemplatePublishOptions,
) => {
  const settings = createPublishSettings(destination);
  if (!templateId || !settings.destinations.length) return false;

  const previousDestinations = getTemplatePublishDestinations(templateId);
  templatePublishDestinations.value = {
    ...templatePublishDestinations.value,
    [templateId]: settings.destinations,
  };
  templatePublishSettings.value = {
    ...templatePublishSettings.value,
    [templateId]: settings,
  };
  persistTemplatesLocal();

  const customTemplate = customTemplateAssets.value.find((template) => template.id === templateId);
  if (customTemplate) {
    persistTemplateRemote(toRecord(customTemplate));
  }

  return previousDestinations.join('|') !== settings.destinations.join('|');
};
