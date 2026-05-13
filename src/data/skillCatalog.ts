import { computed, ref } from 'vue';
import {
  nonLitigationDocuments,
  type NonLitigationDocument,
} from './nonLitigationDocuments';
import { curatedLegalSkills } from './curatedLegalSkills';

export type SkillFileType = 'markdown' | 'typescript' | 'json' | 'yaml';

export type SkillFile = {
  id: string;
  name: string;
  path: string;
  type: SkillFileType;
  content: string;
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
  status?: 'draft' | 'active';
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

const legalWorkflowSkills: SkillCatalogItem[] = nonLitigationDocuments.map((document) => ({
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
}));

export const allSkills: SkillCatalogItem[] = [...legalWorkflowSkills, ...curatedLegalSkills];

export const defaultSkills: SkillCatalogItem[] = [];

export const recommendedSkills: SkillCatalogItem[] = curatedLegalSkills;

export const officialRecommendedSkills = recommendedSkills;

const personalSkillStorageKey = 'legal-version-added-recommended-skill-ids';
const teamMarketSkillStorageKey = 'legal-version-team-market-skill-ids';
const customSkillStorageKey = 'legal-version-custom-skills';
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
    const raw = window.localStorage.getItem(storageKey);
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

const normalizeCustomSkillStatus = (status: unknown): 'draft' | 'active' =>
  status === 'draft' ? 'draft' : 'active';

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
    const skills = normalizeCustomSkills(JSON.parse(window.localStorage.getItem(customSkillStorageKey) || '[]'));
    writeStoredCustomSkills(skills);
    return skills;
  } catch {
    return [];
  }
};

const writeStoredCustomSkills = (skills: SkillCatalogItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(customSkillStorageKey, JSON.stringify(skills));
};

const writeStoredSkillIds = (storageKey: string, ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
};

const personalSkillIds = ref<string[]>(
  [],
);

const teamMarketSkillIds = ref<string[]>(
  normalizeTeamMarketSkillIds([
    ...initialTeamMarketSkillIds,
    ...readStoredSkillIds(teamMarketSkillStorageKey, normalizeTeamMarketSkillIds, initialTeamMarketSkillIds),
    ...readStoredSkillIds(personalSkillStorageKey, normalizeTeamMarketSkillIds),
  ]),
);

writeStoredSkillIds(personalSkillStorageKey, []);
writeStoredSkillIds(teamMarketSkillStorageKey, teamMarketSkillIds.value);

const customSkills = ref<SkillCatalogItem[]>(readStoredCustomSkills());
const hasLoadedRemoteCustomSkills = ref(false);
let remoteCustomSkillLoadPromise: Promise<void> | null = null;

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

export const personalSkills = computed<SkillCatalogItem[]>(() =>
  dedupeSkills([
    ...customSkills.value.filter((skill) => skill.scope !== 'team'),
  ]),
);

export const teamMarketSkills = computed<SkillCatalogItem[]>(() =>
  dedupeSkills([
    ...skillsByIds(teamMarketSkillIds.value),
    ...customSkills.value.filter((skill) => skill.scope === 'team'),
  ]),
);

export const availableSkills = computed<SkillCatalogItem[]>(() => [
  ...dedupeSkills([...personalSkills.value, ...teamMarketSkills.value]),
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
  if (teamMarketSkillIds.value.includes(skillId)) return false;

  const nextIds = normalizeTeamMarketSkillIds([...teamMarketSkillIds.value, skillId]);
  teamMarketSkillIds.value = nextIds;
  writeStoredSkillIds(teamMarketSkillStorageKey, nextIds);
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

export const publishSkillToTeamMarket = (skillId: string) => {
  const customSkill = customSkills.value.find((skill) => skill.id === skillId);
  if (customSkill) {
    upsertCustomSkill({ ...customSkill, scope: 'team', status: 'active' });
    return true;
  }

  if (!allSkillIds.has(skillId)) return false;
  if (teamMarketSkillIds.value.includes(skillId)) return false;

  const nextIds = normalizeTeamMarketSkillIds([...teamMarketSkillIds.value, skillId]);
  teamMarketSkillIds.value = nextIds;
  writeStoredSkillIds(teamMarketSkillStorageKey, nextIds);
  return true;
};

export const persistCustomSkillNow = async (skill: SkillCatalogItem) => {
  if (typeof window === 'undefined') return skill;

  const response = await fetch('/api/skills', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(skill),
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

  void fetch(`/api/skills?id=${encodeURIComponent(skill.id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(skill),
  }).catch(() => {
    // localStorage is the product fallback when the remote store is unavailable.
  });
};

const deleteCustomSkillRemote = (skillId: string) => {
  if (typeof window === 'undefined') return;

  void fetch(`/api/skills?id=${encodeURIComponent(skillId)}`, {
    method: 'DELETE',
  }).catch(() => {
    // localStorage is the product fallback when the remote store is unavailable.
  });
};

export const loadCustomSkills = async () => {
  if (typeof window === 'undefined') return;
  if (hasLoadedRemoteCustomSkills.value) return;

  remoteCustomSkillLoadPromise ??= fetch('/api/skills')
    .then(async (response) => {
      if (!response.ok) return;
      const data = await response.json().catch(() => null) as { skills?: unknown[] } | null;
      const remoteSkills = normalizeCustomSkills(data?.skills);
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
      hasLoadedRemoteCustomSkills.value = true;
    });

  await remoteCustomSkillLoadPromise;
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

export const getSkillsByIds = (ids: string[]) =>
  ids
    .map((id) => getSkillByNameOrId(id))
    .filter((skill): skill is SkillCatalogItem => Boolean(skill));

export const markSkillUsed = (skillId: string) => {
  const skill = customSkills.value.find((item) => item.id === skillId);
  if (!skill) return;

  upsertCustomSkill({
    ...skill,
    lastUsedAt: new Date().toISOString(),
    usageCount: (skill.usageCount ?? 0) + 1,
  });
};

export const resetRecommendedSkillsForTests = () => {
  personalSkillIds.value = [];
  teamMarketSkillIds.value = normalizeTeamMarketSkillIds(initialTeamMarketSkillIds);
  writeStoredSkillIds(personalSkillStorageKey, []);
  writeStoredSkillIds(teamMarketSkillStorageKey, teamMarketSkillIds.value);
};

export const defaultSkillCount = defaultSkills.length;
