import { computed, ref } from 'vue';
import {
  nonLitigationDocuments,
  type NonLitigationDocument,
} from './nonLitigationDocuments';
import { curatedLegalSkills } from './curatedLegalSkills';
import { getMockSkillAuthor } from './mockSkillAuthors';
import { getCurrentOrganizationId, getOrganizationScopedStorageKey } from '../stores/orgSession';

export type SkillFileType = 'markdown' | 'typescript' | 'json' | 'yaml';

export type SkillFile = {
  id: string;
  name: string;
  path: string;
  type: SkillFileType;
  content: string;
};

export type SkillStatus = 'draft' | 'active';

export type SkillPublishDestination = 'group' | 'team' | 'public';
type SkillPublishDestinationInput = SkillPublishDestination | SkillPublishDestination[];

export type SkillPublishSettings = {
  destinations: SkillPublishDestination[];
  groupIds: string[];
  pricing: 'free' | 'paid';
  price: string;
  tags: string[];
  publishedAt: string;
};

export type SkillPublishOptions = {
  destination?: SkillPublishDestination;
  destinations?: SkillPublishDestinationInput;
  groupIds?: string[];
  pricing?: 'free' | 'paid';
  price?: string;
  tags?: string[];
};

export type SkillCatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  routeName: string;
  tags: string[];
  files: SkillFile[];
  source?: 'default' | 'recommended' | 'custom';
  scope?: 'personal' | 'team';
  status?: SkillStatus;
  iconDataUrl?: string;
  publisherName?: string;
  publisherAvatarUrl?: string;
  useProfileIdentity?: boolean;
  publishDestinations?: SkillPublishDestination[];
  publishSettings?: SkillPublishSettings;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
  usageCount?: number;
};

const renderBullets = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const renderNumbered = (items: string[]) => items.map((item, index) => `${index + 1}. ${item}`).join('\n');

const renderSkillMarkdown = (document: NonLitigationDocument) => `---
name: ${document.id}
description: >-
  ${document.skillName}：${document.scenario}
---

# ${document.skillName}

${document.preview}

## 触发场景

${document.scenario}

## 输入信息

${document.inputs}

## 工作流

${renderNumbered(document.workflow)}

## 输出要求

${document.output}

## 核心检查点

${renderBullets(document.qualityChecks)}

## 边界规则

${renderBullets(document.guardrails)}

## 需要时读取

- references/${document.id}-rules.md：字段口径、审查重点和复核规则。`;

const renderReferenceMarkdown = (document: NonLitigationDocument) => `# ${document.name}规则

## 阶段

${document.phase}

## 适用场景

${document.scenario}

## 必备字段

${renderBullets(document.requiredFields)}

## 核心内容

${renderBullets(document.focus)}

## 复核要点

${renderBullets(document.qualityChecks)}

## 风险边界

${renderBullets(document.guardrails)}

## 输出口径

${document.output}`;

const createSkillFiles = (document: NonLitigationDocument): SkillFile[] => [
  {
    id: `${document.id}-skill`,
    name: 'SKILL.md',
    path: 'SKILL.md',
    type: 'markdown',
    content: renderSkillMarkdown(document),
  },
  {
    id: `${document.id}-rules`,
    name: `${document.id}-rules.md`,
    path: `references/${document.id}-rules.md`,
    type: 'markdown',
    content: renderReferenceMarkdown(document),
  },
];

const legalWorkflowSkills: SkillCatalogItem[] = nonLitigationDocuments.map((document) => {
  const author = getMockSkillAuthor(document.id);

  return {
    id: document.id,
    name: document.skillName,
    description: document.preview,
    category: document.category,
    routeName: document.routeName,
    tags: document.tags,
    files: createSkillFiles(document),
    source: 'default',
    scope: 'team',
    status: 'active',
    publisherName: author.name,
    publisherAvatarUrl: author.avatarUrl,
    useProfileIdentity: false,
  };
});

export const allSkills: SkillCatalogItem[] = [...legalWorkflowSkills, ...curatedLegalSkills];

export const defaultSkills: SkillCatalogItem[] = [];

export const recommendedSkills: SkillCatalogItem[] = curatedLegalSkills;

export const officialRecommendedSkills = recommendedSkills;

const personalSkillStorageKey = 'legal-version-added-recommended-skill-ids';
const teamMarketSkillStorageKey = 'legal-version-team-market-skill-ids';
const customSkillStorageKey = 'legal-version-custom-skills';
const skillUsageStatsStorageKey = 'legal-version-skill-usage-stats';
const disabledSkillIdsStorageKey = 'legal-version-disabled-skill-ids';
const skillPublishDestinationsStorageKey = 'legal-version-skill-publish-destinations';
const skillPublishSettingsStorageKey = 'legal-version-skill-publish-settings';
const recommendedSkillIds = new Set(recommendedSkills.map((skill) => skill.id));
const defaultSkillIds = new Set(defaultSkills.map((skill) => skill.id));
const allSkillIds = new Set(allSkills.map((skill) => skill.id));
const skillMap = new Map(allSkills.map((skill) => [skill.id, skill]));

const legacyLegalWorkflowSkillIds = legalWorkflowSkills.map((skill) => skill.id);
const initialTeamMarketSkillIds = legacyLegalWorkflowSkillIds;

const normalizePersonalSkillIds = (ids: string[]) =>
  Array.from(new Set(ids.filter((id) => recommendedSkillIds.has(id))));

const normalizeTeamMarketSkillIds = (ids: string[]) =>
  Array.from(new Set(ids.filter((id) => allSkillIds.has(id))));

const readStoredSkillIds = (
  storageKey: string,
  normalize: (ids: string[]) => string[],
  fallbackIds: string[] = [],
) => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getOrganizationScopedStorageKey(storageKey));
    if (!raw) return normalize(fallbackIds);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalize(parsed.filter((item) => typeof item === 'string')) : normalize(fallbackIds);
  } catch {
    return normalize(fallbackIds);
  }
};

const normalizeSkillFileType = (type: unknown): SkillFileType => {
  if (type === 'typescript' || type === 'json' || type === 'yaml') return type;
  return 'markdown';
};

const normalizeCustomSkillScope = (scope: unknown): 'personal' | 'team' =>
  scope === 'personal' ? 'personal' : 'team';

const normalizeCustomSkillStatus = (status: unknown): SkillStatus =>
  status === 'draft' ? 'draft' : 'active';

const isSkillPublishDestination = (destination: unknown): destination is SkillPublishDestination =>
  destination === 'group' || destination === 'team' || destination === 'public';

const normalizeSkillPublishDestination = (destination: unknown): SkillPublishDestination =>
  isSkillPublishDestination(destination) ? destination : 'team';

const normalizeSkillPublishDestinationList = (destinations: unknown): SkillPublishDestination[] => {
  const values = Array.isArray(destinations) ? destinations : [destinations];
  const normalized = values.filter(isSkillPublishDestination);
  return Array.from(new Set(normalized.length ? normalized : ['team']));
};

const normalizeStringList = (value: unknown, limit = 20) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim()),
  )).slice(0, limit);
};

const normalizePublishSettings = (
  value: unknown,
  fallbackDestinations: unknown = ['team'],
): SkillPublishSettings | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Partial<SkillPublishSettings>;
  const pricing = item.pricing === 'paid' ? 'paid' : 'free';
  const publishedAt = typeof item.publishedAt === 'string' && !Number.isNaN(Date.parse(item.publishedAt))
    ? new Date(item.publishedAt).toISOString()
    : new Date().toISOString();

  return {
    destinations: normalizeSkillPublishDestinationList(item.destinations ?? fallbackDestinations),
    groupIds: normalizeStringList(item.groupIds),
    pricing,
    price: pricing === 'paid' && typeof item.price === 'string' ? item.price.replace(/[^\d.]/g, '') : '',
    tags: normalizeStringList(item.tags, 3),
    publishedAt,
  };
};

const createPublishSettings = (
  input: SkillPublishDestinationInput | SkillPublishOptions,
): SkillPublishSettings => {
  const options = typeof input === 'object' && !Array.isArray(input)
    ? input as SkillPublishOptions
    : { destinations: input as SkillPublishDestinationInput };
  const destinations = normalizeSkillPublishDestinationList(options.destinations ?? options.destination ?? 'team');
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

const normalizeCustomSkill = (skill: unknown): SkillCatalogItem | null => {
  if (!skill || typeof skill !== 'object') return null;
  const item = skill as Partial<SkillCatalogItem>;
  const files = Array.isArray(item.files)
    ? item.files.reduce<SkillFile[]>((normalizedFiles, file) => {
        if (!file || typeof file !== 'object') return normalizedFiles;
        const candidate = file as Partial<SkillFile>;
        if (
          typeof candidate.id !== 'string' ||
          typeof candidate.name !== 'string' ||
          typeof candidate.path !== 'string' ||
          typeof candidate.content !== 'string'
        ) {
          return normalizedFiles;
        }

        normalizedFiles.push({
          id: candidate.id,
          name: candidate.name,
          path: candidate.path,
          type: normalizeSkillFileType(candidate.type),
          content: candidate.content,
        });
        return normalizedFiles;
      }, [])
    : [];

  if (
    typeof item.id !== 'string' ||
    typeof item.name !== 'string' ||
    typeof item.description !== 'string' ||
    !files.length
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: typeof item.category === 'string' && item.category.trim() ? item.category : '自建技能',
    routeName: typeof item.routeName === 'string' && item.routeName.trim() ? item.routeName : 'chat',
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    files,
    source: 'custom',
    scope: normalizeCustomSkillScope(item.scope),
    status: normalizeCustomSkillStatus(item.status),
    iconDataUrl: typeof item.iconDataUrl === 'string' ? item.iconDataUrl : undefined,
    publisherName: typeof item.publisherName === 'string' ? item.publisherName : undefined,
    publisherAvatarUrl: typeof item.publisherAvatarUrl === 'string' ? item.publisherAvatarUrl : undefined,
    useProfileIdentity: typeof item.useProfileIdentity === 'boolean' ? item.useProfileIdentity : true,
    publishDestinations: normalizeSkillPublishDestinationList(item.publishDestinations),
    publishSettings: normalizePublishSettings(item.publishSettings, item.publishDestinations),
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
    lastUsedAt: typeof item.lastUsedAt === 'string' ? item.lastUsedAt : undefined,
    usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0,
  };
};

const normalizeCustomSkills = (skills: unknown) => {
  if (!Array.isArray(skills)) return [];

  const seen = new Set<string>();
  return skills.reduce<SkillCatalogItem[]>((items, skill) => {
    const normalized = normalizeCustomSkill(skill);
    if (!normalized || seen.has(normalized.id) || allSkillIds.has(normalized.id)) return items;
    seen.add(normalized.id);
    items.push(normalized);
    return items;
  }, []);
};

const readStoredCustomSkills = () => {
  if (typeof window === 'undefined') return [];

  try {
    const skills = normalizeCustomSkills(JSON.parse(window.localStorage.getItem(getOrganizationScopedStorageKey(customSkillStorageKey)) || '[]'));
    writeStoredCustomSkills(skills);
    return skills;
  } catch {
    return [];
  }
};

const writeStoredCustomSkills = (skills: SkillCatalogItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getOrganizationScopedStorageKey(customSkillStorageKey), JSON.stringify(skills));
};

const writeStoredSkillIds = (storageKey: string, ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getOrganizationScopedStorageKey(storageKey), JSON.stringify(ids));
};

const normalizeDisabledSkillIds = (ids: string[]) =>
  Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim())));

const readStoredDisabledSkillIds = () =>
  readStoredSkillIds(disabledSkillIdsStorageKey, normalizeDisabledSkillIds);

const writeStoredDisabledSkillIds = (ids: string[]) => {
  writeStoredSkillIds(disabledSkillIdsStorageKey, normalizeDisabledSkillIds(ids));
};

const normalizeSkillPublishDestinations = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, SkillPublishDestination[]>>(
    (destinations, [skillId, destination]) => {
      if (!skillId) return destinations;
      destinations[skillId] = normalizeSkillPublishDestinationList(destination);
      return destinations;
    },
    {},
  );
};

const readStoredSkillPublishDestinations = () => {
  if (typeof window === 'undefined') return {};

  try {
    return normalizeSkillPublishDestinations(JSON.parse(window.localStorage.getItem(getOrganizationScopedStorageKey(skillPublishDestinationsStorageKey)) || '{}'));
  } catch {
    return {};
  }
};

const writeStoredSkillPublishDestinations = (destinations: Record<string, SkillPublishDestination[]>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getOrganizationScopedStorageKey(skillPublishDestinationsStorageKey), JSON.stringify(destinations));
};

const normalizeStoredPublishSettings = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, SkillPublishSettings>>(
    (settings, [skillId, item]) => {
      const normalized = normalizePublishSettings(item);
      if (skillId && normalized) {
        settings[skillId] = normalized;
      }
      return settings;
    },
    {},
  );
};

const readStoredSkillPublishSettings = () => {
  if (typeof window === 'undefined') return {};

  try {
    return normalizeStoredPublishSettings(JSON.parse(window.localStorage.getItem(getOrganizationScopedStorageKey(skillPublishSettingsStorageKey)) || '{}'));
  } catch {
    return {};
  }
};

const writeStoredSkillPublishSettings = (settings: Record<string, SkillPublishSettings>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getOrganizationScopedStorageKey(skillPublishSettingsStorageKey), JSON.stringify(settings));
};

type SkillUsageStat = {
  usageCount: number;
  lastUsedAt: string;
};

const normalizeSkillUsageStats = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, SkillUsageStat>>((stats, [skillId, item]) => {
    if (!skillId || !item || typeof item !== 'object') return stats;
    const candidate = item as Partial<SkillUsageStat>;
    if (typeof candidate.usageCount !== 'number' || typeof candidate.lastUsedAt !== 'string') return stats;
    stats[skillId] = {
      usageCount: Math.max(0, candidate.usageCount),
      lastUsedAt: candidate.lastUsedAt,
    };
    return stats;
  }, {});
};

const readStoredSkillUsageStats = () => {
  if (typeof window === 'undefined') return {};

  try {
    return normalizeSkillUsageStats(JSON.parse(window.localStorage.getItem(getOrganizationScopedStorageKey(skillUsageStatsStorageKey)) || '{}'));
  } catch {
    return {};
  }
};

const writeStoredSkillUsageStats = (stats: Record<string, SkillUsageStat>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getOrganizationScopedStorageKey(skillUsageStatsStorageKey), JSON.stringify(stats));
};

const personalSkillIds = ref<string[]>(
  readStoredSkillIds(personalSkillStorageKey, normalizePersonalSkillIds),
);

const teamMarketSkillIds = ref<string[]>(
  normalizeTeamMarketSkillIds([
    ...initialTeamMarketSkillIds,
    ...readStoredSkillIds(teamMarketSkillStorageKey, normalizeTeamMarketSkillIds, initialTeamMarketSkillIds),
  ]),
);

writeStoredSkillIds(teamMarketSkillStorageKey, teamMarketSkillIds.value);

const customSkills = ref<SkillCatalogItem[]>(readStoredCustomSkills());
const skillUsageStats = ref<Record<string, SkillUsageStat>>(readStoredSkillUsageStats());
const disabledSkillIds = ref<string[]>(readStoredDisabledSkillIds());
const skillPublishDestinations = ref<Record<string, SkillPublishDestination[]>>(readStoredSkillPublishDestinations());
const skillPublishSettings = ref<Record<string, SkillPublishSettings>>(readStoredSkillPublishSettings());
const loadedRemoteCustomSkillOrganizationIds = new Set<string>();
const remoteCustomSkillLoadPromises = new Map<string, Promise<void>>();

const getSkillsApiUrl = (
  organizationId: string,
  params: Record<string, string> = {},
) => {
  const searchParams = new URLSearchParams({
    orgId: organizationId,
    ...params,
  });
  return `/api/skills?${searchParams.toString()}`;
};

const skillsByIds = (ids: string[]) =>
  ids
    .map((id) => skillMap.get(id))
    .filter((skill): skill is SkillCatalogItem => Boolean(skill));

const dedupeSkills = (skills: SkillCatalogItem[]) => {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    if (seen.has(skill.id)) return false;
    seen.add(skill.id);
    return true;
  });
};

const withUsageStats = (skill: SkillCatalogItem) => {
  const usageStat = skillUsageStats.value[skill.id];
  if (!usageStat) return skill;

  return {
    ...skill,
    usageCount: Math.max(skill.usageCount ?? 0, usageStat.usageCount),
    lastUsedAt: usageStat.lastUsedAt || skill.lastUsedAt,
  };
};

const getCatalogSkillById = (skillId: string) =>
  customSkills.value.find((skill) => skill.id === skillId) ?? skillMap.get(skillId) ?? null;

const setSkillDisabled = (skillId: string, disabled: boolean) => {
  const nextIds = disabled
    ? normalizeDisabledSkillIds([...disabledSkillIds.value, skillId])
    : normalizeDisabledSkillIds(disabledSkillIds.value.filter((id) => id !== skillId));

  disabledSkillIds.value = nextIds;
  writeStoredDisabledSkillIds(nextIds);
};

export const isSkillEnabled = (skill: Pick<SkillCatalogItem, 'id' | 'status'>) =>
  skill.status === 'active' && !disabledSkillIds.value.includes(skill.id);

export const personalSkills = computed<SkillCatalogItem[]>(() =>
  dedupeSkills([
    ...skillsByIds(personalSkillIds.value),
    ...customSkills.value.filter((skill) => skill.scope !== 'team'),
  ]).map(withUsageStats),
);

export const teamMarketSkills = computed<SkillCatalogItem[]>(() =>
  dedupeSkills([
    ...skillsByIds(teamMarketSkillIds.value),
    ...customSkills.value.filter((skill) => skill.scope === 'team'),
  ]).map(withUsageStats),
);

export const getSkillPublishDestination = (skillId: string): SkillPublishDestination =>
  getSkillPublishDestinations(skillId)[0] ?? 'team';

export const getSkillPublishDestinations = (skillId: string): SkillPublishDestination[] => {
  const storedDestinations = skillPublishDestinations.value[skillId];
  if (storedDestinations?.length) return storedDestinations;
  const skillDestinations = getCatalogSkillById(skillId)?.publishDestinations;
  return skillDestinations?.length ? skillDestinations : ['team'];
};

export const getSkillPublishSettings = (skillId: string): SkillPublishSettings | undefined =>
  skillPublishSettings.value[skillId] ?? getCatalogSkillById(skillId)?.publishSettings;

const hasSkillPublishDestination = (skillId: string, destination: SkillPublishDestination) =>
  getSkillPublishDestinations(skillId).includes(destination);

export const groupSharedSkills = computed<SkillCatalogItem[]>(() =>
  teamMarketSkills.value.filter((skill) => hasSkillPublishDestination(skill.id, 'group')),
);

export const teamSharedSkills = computed<SkillCatalogItem[]>(() =>
  teamMarketSkills.value.filter((skill) => hasSkillPublishDestination(skill.id, 'team')),
);

export const publicHubSkills = computed<SkillCatalogItem[]>(() =>
  dedupeSkills([
    ...teamMarketSkills.value.filter((skill) => hasSkillPublishDestination(skill.id, 'public')),
    ...officialRecommendedSkills,
  ]),
);

export const availableSkills = computed<SkillCatalogItem[]>(() => [
  ...dedupeSkills([...personalSkills.value, ...teamMarketSkills.value]).filter(isSkillEnabled),
]);

export const registeredSkillNames = computed(
  () =>
    new Set([
      ...availableSkills.value.map((skill) => skill.name),
      ...availableSkills.value.map((skill) => skill.id),
      'skill-creator',
      'template-creator',
    ]),
);

export const isRegisteredSkillName = (skillName: string) => registeredSkillNames.value.has(skillName);

export const isRecommendedSkill = (skillId: string) => recommendedSkillIds.has(skillId);

export const isPersonalSkill = (skillId: string) =>
  (recommendedSkillIds.has(skillId) && personalSkillIds.value.includes(skillId)) ||
  customSkills.value.some((skill) => skill.id === skillId && skill.scope !== 'team');

export const isTeamMarketSkill = (skillId: string) =>
  teamMarketSkillIds.value.includes(skillId) ||
  customSkills.value.some((skill) => skill.id === skillId && skill.scope === 'team');

export const isSkillAvailable = (skillId: string) => isPersonalSkill(skillId) || isTeamMarketSkill(skillId);

export const isAddedRecommendedSkill = isSkillAvailable;

export const addPersonalSkill = (skillId: string) => {
  if (!recommendedSkillIds.has(skillId)) return false;
  if (personalSkillIds.value.includes(skillId)) return false;

  const nextIds = normalizePersonalSkillIds([...personalSkillIds.value, skillId]);
  personalSkillIds.value = nextIds;
  writeStoredSkillIds(personalSkillStorageKey, nextIds);
  return true;
};

export const addRecommendedSkill = addPersonalSkill;

export const removePersonalSkill = (skillId: string) => {
  const customSkill = customSkills.value.find((skill) => skill.id === skillId);
  if (customSkill) {
    deleteCustomSkill(skillId);
    return true;
  }

  if (!personalSkillIds.value.includes(skillId)) return false;

  const nextIds = normalizePersonalSkillIds(personalSkillIds.value.filter((id) => id !== skillId));
  personalSkillIds.value = nextIds;
  writeStoredSkillIds(personalSkillStorageKey, nextIds);
  return true;
};

export const publishSkillToTeamMarket = (
  skillId: string,
  destination: SkillPublishDestinationInput | SkillPublishOptions = 'team',
) => {
  const publishSettings = createPublishSettings(destination);
  const publishDestinations = publishSettings.destinations;
  const customSkill = customSkills.value.find((skill) => skill.id === skillId);
  if (!customSkill && !allSkillIds.has(skillId)) return false;

  const previousDestinations = skillPublishDestinations.value[skillId] ?? [];
  const wasPublished = customSkill ? customSkill.scope === 'team' : teamMarketSkillIds.value.includes(skillId);
  skillPublishDestinations.value = {
    ...skillPublishDestinations.value,
    [skillId]: publishDestinations,
  };
  skillPublishSettings.value = {
    ...skillPublishSettings.value,
    [skillId]: publishSettings,
  };
  writeStoredSkillPublishDestinations(skillPublishDestinations.value);
  writeStoredSkillPublishSettings(skillPublishSettings.value);
  setSkillDisabled(skillId, false);

  if (customSkill) {
    upsertCustomSkill({
      ...customSkill,
      scope: 'team',
      status: 'active',
      publishDestinations,
      publishSettings,
    });
    return true;
  }

  if (teamMarketSkillIds.value.includes(skillId)) {
    return previousDestinations.join('|') !== publishDestinations.join('|') || !wasPublished;
  }

  const nextIds = normalizeTeamMarketSkillIds([...teamMarketSkillIds.value, skillId]);
  teamMarketSkillIds.value = nextIds;
  writeStoredSkillIds(teamMarketSkillStorageKey, nextIds);
  return true;
};

export const persistCustomSkillNow = async (skill: SkillCatalogItem) => {
  if (typeof window === 'undefined') return skill;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return skill;

  const response = await fetch(getSkillsApiUrl(organizationId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...skill,
      organizationId,
    }),
  });

  const data = await response.json().catch(() => null) as { skill?: SkillCatalogItem; error?: string } | null;
  if (!response.ok) {
    throw new Error(data?.error || `技能持久化失败 (${response.status})`);
  }

  return data?.skill ?? skill;
};

const persistCustomSkillRemote = (skill: SkillCatalogItem) => {
  void persistCustomSkillNow(skill).catch(() => {
    // localStorage is the product fallback when the remote store is unavailable.
  });
};

const patchCustomSkillRemote = (skill: SkillCatalogItem) => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;

  void fetch(getSkillsApiUrl(organizationId, { id: skill.id }), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...skill,
      organizationId,
    }),
  }).catch(() => {
    // localStorage is the product fallback when the remote store is unavailable.
  });
};

const deleteCustomSkillRemote = (skillId: string) => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;

  void fetch(getSkillsApiUrl(organizationId, { id: skillId }), {
    method: 'DELETE',
  }).catch(() => {
    // localStorage is the product fallback when the remote store is unavailable.
  });
};

export const syncSkillCatalogForCurrentOrganization = () => {
  personalSkillIds.value = readStoredSkillIds(personalSkillStorageKey, normalizePersonalSkillIds);
  teamMarketSkillIds.value = normalizeTeamMarketSkillIds([
    ...initialTeamMarketSkillIds,
    ...readStoredSkillIds(teamMarketSkillStorageKey, normalizeTeamMarketSkillIds, initialTeamMarketSkillIds),
  ]);
  writeStoredSkillIds(teamMarketSkillStorageKey, teamMarketSkillIds.value);
  customSkills.value = readStoredCustomSkills();
  skillUsageStats.value = readStoredSkillUsageStats();
  disabledSkillIds.value = readStoredDisabledSkillIds();
  skillPublishDestinations.value = readStoredSkillPublishDestinations();
  skillPublishSettings.value = readStoredSkillPublishSettings();
};

export const loadCustomSkills = async () => {
  if (typeof window === 'undefined') return;
  const organizationId = getCurrentOrganizationId();
  if (!organizationId) return;
  if (loadedRemoteCustomSkillOrganizationIds.has(organizationId)) return;

  if (!remoteCustomSkillLoadPromises.has(organizationId)) {
    remoteCustomSkillLoadPromises.set(organizationId, fetch(getSkillsApiUrl(organizationId))
    .then(async (response) => {
      if (!response.ok) return;
      const data = await response.json().catch(() => null) as { skills?: unknown[] } | null;
      const remoteSkills = normalizeCustomSkills(data?.skills);
      if (getCurrentOrganizationId() !== organizationId) return;
      if (remoteSkills.length) {
        customSkills.value = remoteSkills;
        writeStoredCustomSkills(remoteSkills);
      } else if (customSkills.value.length) {
        customSkills.value.forEach(persistCustomSkillRemote);
      }
    })
    .catch(() => {
      // Keep the local copy as the available demo/runtime source.
    })
    .finally(() => {
      loadedRemoteCustomSkillOrganizationIds.add(organizationId);
    }));
  }

  await remoteCustomSkillLoadPromises.get(organizationId);
};

export const upsertCustomSkill = (skill: SkillCatalogItem, options: { persist?: boolean } = {}) => {
  const normalized = normalizeCustomSkill({
    ...skill,
    source: 'custom',
    updatedAt: new Date().toISOString(),
  });
  if (!normalized) return null;

  const existingIndex = customSkills.value.findIndex((item) => item.id === normalized.id);
  if (existingIndex >= 0) {
    customSkills.value.splice(existingIndex, 1, normalized);
    if (options.persist !== false) {
      patchCustomSkillRemote(normalized);
    }
  } else {
    customSkills.value = [normalized, ...customSkills.value];
    if (options.persist !== false) {
      persistCustomSkillRemote(normalized);
    }
  }

  writeStoredCustomSkills(customSkills.value);
  return normalized;
};

export const deleteCustomSkill = (skillId: string) => {
  const nextSkills = customSkills.value.filter((skill) => skill.id !== skillId);
  if (nextSkills.length === customSkills.value.length) return false;

  customSkills.value = nextSkills;
  writeStoredCustomSkills(nextSkills);
  deleteCustomSkillRemote(skillId);
  return true;
};

export const getSkillByNameOrId = (skillNameOrId: string) => {
  const normalized = skillNameOrId.trim();
  if (!normalized) return null;

  return availableSkills.value.find((skill) => skill.id === normalized || skill.name === normalized) ?? null;
};

export const getAnySkillByNameOrId = (skillNameOrId: string) => {
  const normalized = skillNameOrId.trim();
  if (!normalized) return null;

  return dedupeSkills([...personalSkills.value, ...teamMarketSkills.value, ...allSkills])
    .find((skill) => skill.id === normalized || skill.name === normalized) ?? null;
};

export const getSkillsByIds = (ids: string[]) =>
  ids
    .map((id) => getSkillByNameOrId(id))
    .filter((skill): skill is SkillCatalogItem => Boolean(skill));

export const markSkillUsed = (skillId: string) => {
  const catalogSkill = getCatalogSkillById(skillId);
  if (!catalogSkill || !isSkillEnabled(catalogSkill)) return;

  const now = new Date().toISOString();
  const skill = customSkills.value.find((item) => item.id === skillId);
  const currentStat = skillUsageStats.value[skillId];
  const nextUsageCount = Math.max(currentStat?.usageCount ?? 0, skill?.usageCount ?? 0) + 1;

  skillUsageStats.value = {
    ...skillUsageStats.value,
    [skillId]: {
      usageCount: nextUsageCount,
      lastUsedAt: now,
    },
  };
  writeStoredSkillUsageStats(skillUsageStats.value);

  if (!skill) return;

  upsertCustomSkill({
    ...skill,
    lastUsedAt: now,
    usageCount: nextUsageCount,
  });
};

export const setSkillEnabled = (skillId: string, enabled: boolean) => {
  const customSkill = customSkills.value.find((item) => item.id === skillId);
  setSkillDisabled(skillId, !enabled);

  if (customSkill && enabled && customSkill.status !== 'active') {
    return upsertCustomSkill({
      ...customSkill,
      status: 'active',
    });
  }

  return getCatalogSkillById(skillId);
};

export const resetRecommendedSkillsForTests = () => {
  personalSkillIds.value = [];
  teamMarketSkillIds.value = normalizeTeamMarketSkillIds(initialTeamMarketSkillIds);
  disabledSkillIds.value = [];
  skillPublishDestinations.value = {};
  writeStoredSkillIds(personalSkillStorageKey, []);
  writeStoredSkillIds(teamMarketSkillStorageKey, teamMarketSkillIds.value);
  writeStoredDisabledSkillIds([]);
  writeStoredSkillPublishDestinations({});
};

export const defaultSkillCount = defaultSkills.length;
