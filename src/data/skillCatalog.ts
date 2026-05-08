import { computed, ref } from 'vue';
import {
  defaultDocumentIds,
  getDocumentTemplateEntries,
  getDocumentTemplateIds,
  isDefaultDocument,
  nonLitigationDocuments,
  renderDocumentTemplateMarkdown,
  type NonLitigationDocument,
} from './nonLitigationDocuments';

export type SkillFileType = 'markdown' | 'typescript' | 'json' | 'template';

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
  templateIds: string[];
  tags: string[];
  files: SkillFile[];
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

- references/${document.id}-rules.md：字段口径、审查重点和复核规则。
${getDocumentTemplateEntries(document)
  .map((template) => `- assets/templates/${template.id}.md：${template.name}。`)
  .join('\n')}`;

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
  ...getDocumentTemplateEntries(document).map((template) => ({
    id: `${template.id}-template`,
    name: `${template.id}.md`,
    path: `assets/templates/${template.id}.md`,
    type: 'template' as const,
    content: renderDocumentTemplateMarkdown(document, template),
  })),
];

const legalWorkflowSkills: SkillCatalogItem[] = nonLitigationDocuments.map((document) => ({
  id: document.id,
  name: document.skillName,
  description: document.preview,
  category: document.category,
  routeName: document.routeName,
  templateIds: getDocumentTemplateIds(document),
  tags: document.tags,
  files: createSkillFiles(document),
}));

export const allSkills: SkillCatalogItem[] = legalWorkflowSkills;

export const defaultSkills: SkillCatalogItem[] = legalWorkflowSkills.filter((skill) =>
  isDefaultDocument(skill.id)
);

export const recommendedSkills: SkillCatalogItem[] = legalWorkflowSkills.filter((skill) =>
  !isDefaultDocument(skill.id)
);

export const officialRecommendedSkills = recommendedSkills;

const personalSkillStorageKey = 'legal-version-added-recommended-skill-ids';
const teamMarketSkillStorageKey = 'legal-version-team-market-skill-ids';
const recommendedSkillIds = new Set(recommendedSkills.map((skill) => skill.id));
const defaultSkillIds = new Set(defaultSkills.map((skill) => skill.id));
const allSkillIds = new Set(allSkills.map((skill) => skill.id));
const skillMap = new Map(allSkills.map((skill) => [skill.id, skill]));

const initialTeamMarketSkillIds = [
  'contract-drafting',
  'contract-review-opinion',
  'legal-opinion',
  'legal-memo',
  'due-diligence-report',
  'term-sheet',
];

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

const writeStoredSkillIds = (storageKey: string, ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
};

const personalSkillIds = ref<string[]>(
  readStoredSkillIds(personalSkillStorageKey, normalizePersonalSkillIds),
);

const teamMarketSkillIds = ref<string[]>(
  readStoredSkillIds(teamMarketSkillStorageKey, normalizeTeamMarketSkillIds, initialTeamMarketSkillIds),
);

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
  dedupeSkills([...defaultSkills, ...skillsByIds(personalSkillIds.value)]),
);

export const teamMarketSkills = computed<SkillCatalogItem[]>(() =>
  skillsByIds(teamMarketSkillIds.value),
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
  defaultSkillIds.has(skillId) ||
  (recommendedSkillIds.has(skillId) && personalSkillIds.value.includes(skillId));

export const isTeamMarketSkill = (skillId: string) => teamMarketSkillIds.value.includes(skillId);

export const isSkillAvailable = (skillId: string) => isPersonalSkill(skillId) || isTeamMarketSkill(skillId);

export const isAddedRecommendedSkill = isPersonalSkill;

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
  if (!personalSkillIds.value.includes(skillId)) return false;

  const nextIds = normalizePersonalSkillIds(personalSkillIds.value.filter((id) => id !== skillId));
  personalSkillIds.value = nextIds;
  writeStoredSkillIds(personalSkillStorageKey, nextIds);
  return true;
};

export const publishSkillToTeamMarket = (skillId: string) => {
  if (!allSkillIds.has(skillId)) return false;
  if (teamMarketSkillIds.value.includes(skillId)) return false;

  const nextIds = normalizeTeamMarketSkillIds([...teamMarketSkillIds.value, skillId]);
  teamMarketSkillIds.value = nextIds;
  writeStoredSkillIds(teamMarketSkillStorageKey, nextIds);
  return true;
};

export const resetRecommendedSkillsForTests = () => {
  personalSkillIds.value = [];
  teamMarketSkillIds.value = normalizeTeamMarketSkillIds(initialTeamMarketSkillIds);
  writeStoredSkillIds(personalSkillStorageKey, []);
  writeStoredSkillIds(teamMarketSkillStorageKey, teamMarketSkillIds.value);
};

export const defaultSkillCount = defaultDocumentIds.length;
