<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Component } from 'vue';
import { useRouter } from 'vue-router';
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  FileSearch,
  FileText,
  Gavel,
  Landmark,
  ListChecks,
  MoreHorizontal,
  Pencil,
  PenLine,
  Plus,
  Power,
  PowerOff,
  Puzzle,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  UserRound,
  UsersRound,
  X,
  Zap,
} from 'lucide-vue-next';
import {
  addPersonalSkill,
  groupSharedSkills as catalogGroupSharedSkills,
  isSkillEnabled,
  isSkillAvailable,
  markSkillUsed,
  officialRecommendedSkills,
  personalSkills,
  publicHubSkills as catalogPublicHubSkills,
  publishSkillToTeamMarket,
  removePersonalSkill,
  setSkillEnabled,
  teamSharedSkills,
  upsertCustomSkill,
  type SkillCatalogItem,
  type SkillFile,
  type SkillPublishDestination,
} from '../data/skillCatalog';
import {
  getSkillAuthorAvatarStyle as resolveSkillAuthorAvatarStyle,
  getSkillAuthorAvatarText as resolveSkillAuthorAvatarText,
  getSkillAuthorName as resolveSkillAuthorName,
  hasSkillAuthorAvatarImage,
  shouldShowSkillAuthor as resolveShouldShowSkillAuthor,
} from '../data/profileIdentity';
import { createSkillWithSkillCreator } from '../services/skillCreator';
import { useOrgSession } from '../stores/orgSession';
import SkillCreateModal from './SkillCreateModal.vue';

const props = withDefaults(defineProps<{
  startInCreate?: boolean;
  createBehavior?: 'inline' | 'emit';
}>(), {
  startInCreate: false,
  createBehavior: 'inline',
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'create', prompt?: string): void;
  (event: 'use', skillName?: string): void;
}>();

const router = useRouter();
const { currentOrganization, currentUser } = useOrgSession();
type SkillListPage = 'personal' | 'group-shared' | 'team-shared' | 'official' | 'market' | 'public-hub' | 'recommended';
type SkillStatusFilter = 'all' | 'inactive' | 'enabled';
type RecommendedSortFilter = 'latest' | 'popular' | 'rated';
type StandaloneSourceKey = 'mine' | 'group' | 'team' | 'official' | 'market';
type StandaloneSkillKind = 'case' | 'draft' | 'ca' | 'reg' | 'spa' | 'data' | 'labor' | 'ipo';

type SkillChipDisplay = {
  id: string;
  name: string;
  kind: string;
  virtual: true;
};

type StandaloneSkillPresentation = {
  id: string;
  order: number;
  title: string;
  description: string;
  kind: StandaloneSkillKind;
  creator: string;
  firm: string;
  source: StandaloneSourceKey;
  enabled: boolean;
  deliverables: Array<{ name: string; kind: 'docx' | 'xlsx' }>;
  match: (skill: SkillCatalogItem, searchable: string) => boolean;
};

const selectedSkill = ref<SkillCatalogItem | null>(null);
const activeListPage = ref<SkillListPage>('personal');
const modalSearchKeyword = ref('');
const selectedStatusFilter = ref<SkillStatusFilter>('all');
const selectedRecommendedSort = ref<RecommendedSortFilter>('popular');
const isCreateMode = ref(false);
const showSkillCreateModal = ref(false);
const activeFileId = ref('');
const expandedTreeKeys = ref<Record<string, boolean>>({});
const editMode = ref(false);
const editBuffer = ref('');
const fileDrafts = ref<Record<string, string>>({});
const statusMessage = ref('');
const openCardMenuId = ref<string | null>(null);
const createBrief = ref('');
const createScenario = ref('合同 / 交易文件');
const createSource = ref('上传或粘贴项目材料');
const createOutput = ref('Word 文书初稿');
const createScope = ref<'personal' | 'team'>('personal');
const createError = ref('');
const isGeneratingDraft = ref(false);
let statusTimer: ReturnType<typeof setTimeout> | null = null;

type TreeFolder = {
  key: string;
  label: string;
  files: SkillFile[];
};

type TreeGroup = {
  key: string;
  label: string;
  files: SkillFile[];
  folders: TreeFolder[];
};

const skillListPageCopy: Record<SkillListPage, { name: string; empty: string }> = {
  personal: { name: '个人', empty: '暂无个人技能' },
  'group-shared': { name: '小组', empty: '暂无小组共享技能' },
  'team-shared': { name: '团队', empty: '暂无团队共享技能' },
  official: { name: '官方', empty: '暂无官方技能' },
  market: { name: '市场', empty: '暂无市场技能' },
  'public-hub': { name: '市场', empty: '暂无市场技能' },
  recommended: { name: '官方', empty: '暂无官方技能' },
};

const utilitySkillIds = new Set(['docx', 'pdf', 'xlsx']);
const standaloneSourceLabels: Record<StandaloneSourceKey, string> = {
  mine: '个人',
  group: '小组',
  team: '团队',
  official: '官方',
  market: '市场',
};

const standaloneSkillPresentations: StandaloneSkillPresentation[] = [
  {
    id: 'case-analysis',
    order: 1,
    title: '类案检索分析报告',
    description: '按当事人与争议焦点检索相似案例，输出裁判规则与胜诉率分析。',
    kind: 'case',
    creator: '顾明远',
    firm: '金杜律师事务所',
    source: 'mine',
    enabled: true,
    deliverables: [{ name: '类案分析报告', kind: 'docx' }, { name: '裁判规则汇总', kind: 'xlsx' }],
    match: (_skill, searchable) => /类案|similar case|class case|case-law|案例检索|裁判规则/.test(searchable),
  },
  {
    id: 'doc-write',
    order: 2,
    title: '法律文书写作',
    description: '按文书类型与司法层级生成结构化初稿，含格式校验与必备要素核对。',
    kind: 'draft',
    creator: '周知行',
    firm: '方达律师事务所',
    source: 'team',
    enabled: true,
    deliverables: [{ name: '文书定稿', kind: 'docx' }, { name: '格式校验报告', kind: 'docx' }],
    match: (skill, searchable) => (
      /legal-document-writing|法律文书写作|文书写作|律所管理文书|律师见证文书|诉讼时间线|常用管理类文书/.test(searchable)
      || skill.id === 'legal-opinion'
      || skill.id === 'legal-memo'
      || skill.id === 'lawyer-letter'
    ) && !/咨询意见起草|legal-consultation|consultation-reply/.test(searchable) && skill.id !== 'contract-drafting',
  },
  {
    id: 'contract',
    order: 3,
    title: '合同审查与红线生成',
    description: '审查商事合同文本，识别关键风险、生成红线修改建议、谈判口径和可交付的修改稿。',
    kind: 'ca',
    creator: '唐予安',
    firm: '君合律师事务所',
    source: 'mine',
    enabled: true,
    deliverables: [{ name: '审查备忘录', kind: 'docx' }, { name: '修订版合同', kind: 'docx' }, { name: '风险点汇总表', kind: 'xlsx' }],
    match: (_skill, searchable) => /合同审查|红线|contract-review|contract review|风险点/.test(searchable),
  },
  {
    id: 'reg-gap',
    order: 4,
    title: '法规差距分析助手',
    description: '输入新规要求与现行业务，自动比对生成差距清单、整改建议与时间路径。',
    kind: 'reg',
    creator: '陆明薇',
    firm: '中伦律师事务所',
    source: 'group',
    enabled: true,
    deliverables: [{ name: '差距清单', kind: 'xlsx' }, { name: '整改路径', kind: 'docx' }],
    match: (_skill, searchable) => /法规差距|监管差距|regulatory gap|gap analysis|整改路径/.test(searchable),
  },
  {
    id: 'spa',
    order: 5,
    title: 'SPA 起草',
    description: '在投融资 / 并购场景下，基于团队知识库中的 SPA 相关材料，辅助生成可复用的初稿。',
    kind: 'spa',
    creator: '孙启明',
    firm: '汉坤律师事务所',
    source: 'mine',
    enabled: false,
    deliverables: [{ name: 'SPA 初稿', kind: 'docx' }, { name: '关键条款清单', kind: 'xlsx' }],
    match: (_skill, searchable) => /spa|股权购买协议|share purchase|投融资并购/.test(searchable),
  },
  {
    id: 'opinion',
    order: 6,
    title: '咨询意见起草',
    description: '基于用户提供的事实材料，自动生成咨询意见草稿，含背景、分析、结论与法规援引。',
    kind: 'draft',
    creator: '宋知夏',
    firm: '海问律师事务所',
    source: 'official',
    enabled: false,
    deliverables: [{ name: '咨询意见书', kind: 'docx' }],
    match: (_skill, searchable) => /咨询意见|legal memo drafter|consultation|意见书|legal-consultation/.test(searchable),
  },
  {
    id: 'data-resp',
    order: 7,
    title: '数据合规事件处置',
    description: '按 PIPL / DSL 输出事件研判、监管通报口径与对外披露模板。',
    kind: 'data',
    creator: '陆明薇',
    firm: '中伦律师事务所',
    source: 'group',
    enabled: true,
    deliverables: [{ name: '事件研判报告', kind: 'docx' }, { name: '监管通报口径', kind: 'docx' }, { name: '对外披露模板', kind: 'docx' }],
    match: (_skill, searchable) => /数据合规|data-incident|data compliance|pipl|dsl|监管通报/.test(searchable),
  },
  {
    id: 'labor',
    order: 8,
    title: '劳动争议证据清单',
    description: '按争议类型与诉求生成证据链清单，对照举证规则补全缺项。',
    kind: 'labor',
    creator: '方谨行',
    firm: '通商律师事务所',
    source: 'market',
    enabled: false,
    deliverables: [{ name: '证据链清单', kind: 'xlsx' }],
    match: (_skill, searchable) => /劳动争议|labou?r|证据链清单|evidence checklist/.test(searchable),
  },
  {
    id: 'ipo-qa',
    order: 9,
    title: 'IPO 反馈意见回复',
    description: '针对交易所反馈意见，分类生成回复要点、底层逻辑与佐证材料指引。',
    kind: 'ipo',
    creator: '周知行',
    firm: '方达律师事务所',
    source: 'team',
    enabled: true,
    deliverables: [{ name: '反馈回复要点', kind: 'docx' }, { name: '底层逻辑梳理', kind: 'docx' }, { name: '佐证材料指引', kind: 'xlsx' }],
    match: (_skill, searchable) => /ipo|反馈回复|补充法律意见|comment-letter|交易所反馈/.test(searchable),
  },
];

const getStableIndex = (value: string, total: number) => {
  if (!total) return 0;
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % total;
};

const getSkillSearchText = (skill: SkillCatalogItem) => [
  skill.id,
  skill.name,
  skill.description,
  skill.category,
  ...skill.tags,
  ...skill.files.map((file) => `${file.name} ${file.path}`),
].join(' ').toLowerCase();

const getStandalonePresentation = (skill: SkillCatalogItem) => {
  const searchable = getSkillSearchText(skill);
  return standaloneSkillPresentations.find((presentation) => presentation.match(skill, searchable)) ?? null;
};

const isSkillDisplayEnabled = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.enabled ?? isSkillEnabled(skill);

const dedupeSkillsById = (skills: SkillCatalogItem[]) => {
  const seen = new Set<string>();
  const deduped: SkillCatalogItem[] = [];
  skills.forEach((skill) => {
    if (seen.has(skill.id)) return;
    seen.add(skill.id);
    deduped.push(skill);
  });
  return deduped;
};

const sortSkillsForLibrary = (skills: SkillCatalogItem[]) =>
  [...skills].sort((left, right) => {
    const leftIsUtility = utilitySkillIds.has(left.id);
    const rightIsUtility = utilitySkillIds.has(right.id);
    if (leftIsUtility === rightIsUtility) return 0;
    return leftIsUtility ? 1 : -1;
  });

const getSkillDisplayOrder = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.order ?? 1000 + getStableIndex(`${skill.id}:${skill.name}`, 1000);

const sortSkillsForDisplay = (skills: SkillCatalogItem[]) =>
  [...skills].sort((left, right) => getSkillDisplayOrder(left) - getSkillDisplayOrder(right));

const collapseStandaloneDuplicates = (skills: SkillCatalogItem[]) => {
  const seenPresentationIds = new Set<string>();
  return skills.filter((skill) => {
    const presentation = getStandalonePresentation(skill);
    if (!presentation) return true;
    if (seenPresentationIds.has(presentation.id)) return false;
    seenPresentationIds.add(presentation.id);
    return true;
  });
};

const standaloneSourceSkillPool = computed(() =>
  dedupeSkillsById([
    ...personalSkills.value,
    ...catalogGroupSharedSkills.value,
    ...teamSharedSkills.value,
    ...officialRecommendedSkills,
    ...catalogPublicHubSkills.value,
  ]),
);

const officialSkills = computed(() =>
  dedupeSkillsById([
    ...standaloneSourceSkillPool.value.filter((skill) => getStandalonePresentation(skill)?.source === 'official'),
    ...officialRecommendedSkills,
  ]),
);

const isOfficialRecommendedSkill = (skill: SkillCatalogItem) =>
  skill.source === 'recommended' || getStandalonePresentation(skill)?.source === 'official';

const marketSkills = computed(() =>
  dedupeSkillsById([
    ...standaloneSourceSkillPool.value.filter((skill) => {
      const presentationSource = getStandalonePresentation(skill)?.source;
      return presentationSource === 'market' || isOfficialRecommendedSkill(skill);
    }),
    ...catalogPublicHubSkills.value,
  ]),
);

const activeListSkills = computed(() =>
  sortSkillsForLibrary({
    personal: personalSkills.value,
    'group-shared': catalogGroupSharedSkills.value,
    'team-shared': teamSharedSkills.value,
    official: officialSkills.value,
    market: marketSkills.value,
    'public-hub': marketSkills.value,
    recommended: officialSkills.value,
  }[activeListPage.value]),
);

const sourceTabs = computed(() => [
  { key: 'personal' as const, name: skillListPageCopy.personal.name, count: personalSkills.value.length },
  { key: 'group-shared' as const, name: skillListPageCopy['group-shared'].name, count: catalogGroupSharedSkills.value.length },
  { key: 'team-shared' as const, name: skillListPageCopy['team-shared'].name, count: teamSharedSkills.value.length },
  { key: 'market' as const, name: skillListPageCopy.market.name, count: marketSkills.value.length },
]);

const getSkillStatusKind = (skill: SkillCatalogItem): Exclude<SkillStatusFilter, 'all'> =>
  isSkillDisplayEnabled(skill) ? 'enabled' : 'inactive';

const statusFilterOptions = computed(() => {
  const counts = activeListSkills.value.reduce<Record<Exclude<SkillStatusFilter, 'all'>, number>>(
    (nextCounts, skill) => {
      nextCounts[getSkillStatusKind(skill)] += 1;
      return nextCounts;
    },
    { inactive: 0, enabled: 0 },
  );

  return [
    { key: 'all' as const, label: '全部', count: activeListSkills.value.length },
    { key: 'inactive' as const, label: '未启用', count: counts.inactive },
    { key: 'enabled' as const, label: '已启用', count: counts.enabled },
  ];
});

const recommendedSortOptions: Array<{ key: RecommendedSortFilter; label: string }> = [
  { key: 'latest', label: '最新上架' },
  { key: 'popular', label: '最多使用' },
  { key: 'rated', label: '最高好评' },
];

const getSkillDateValue = (skill: SkillCatalogItem) => {
  const parsedTime = Date.parse(skill.updatedAt ?? skill.createdAt ?? '');
  return Number.isNaN(parsedTime) ? 0 : parsedTime;
};

const sortRecommendedSkills = (skills: SkillCatalogItem[]) =>
  [...skills].sort((left, right) => {
    if (selectedRecommendedSort.value === 'latest') {
      const dateDelta = getSkillDateValue(right) - getSkillDateValue(left);
      if (dateDelta) return dateDelta;
    }

    if (selectedRecommendedSort.value === 'popular') {
      const usageDelta = (right.usageCount ?? 0) - (left.usageCount ?? 0);
      if (usageDelta) return usageDelta;
    }

    if (selectedRecommendedSort.value === 'rated') {
      const ratingDelta = getStableIndex(`${right.id}:rating`, 1000) - getStableIndex(`${left.id}:rating`, 1000);
      if (ratingDelta) return ratingDelta;
    }

    return getSkillDisplayOrder(left) - getSkillDisplayOrder(right);
  });

const visibleListSkills = computed(() => {
  const keyword = modalSearchKeyword.value.trim().toLowerCase();

  const filteredSkills = activeListSkills.value.filter((skill) => {
    const matchesStatus =
      activeListPage.value !== 'personal' ||
      selectedStatusFilter.value === 'all' ||
      getSkillStatusKind(skill) === selectedStatusFilter.value;
    const presentation = getStandalonePresentation(skill);
    const searchable = [
      getSkillSearchText(skill),
      presentation?.title ?? '',
      presentation?.description ?? '',
      ...(presentation?.deliverables.map((deliverable) => deliverable.name) ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return matchesStatus && (!keyword || searchable.includes(keyword));
  });

  const collapsedSkills = collapseStandaloneDuplicates(filteredSkills);
  if (
    activeListPage.value === 'official'
    || activeListPage.value === 'market'
    || activeListPage.value === 'recommended'
    || activeListPage.value === 'public-hub'
  ) return sortRecommendedSkills(collapsedSkills);
  return sortSkillsForDisplay(collapsedSkills);
});

const shouldShowSkillAuthor = (skill: SkillCatalogItem) => resolveShouldShowSkillAuthor(skill, currentUser.value);
const getSkillAuthorName = (skill: SkillCatalogItem) => resolveSkillAuthorName(skill, currentUser.value);
const getSkillAuthorAvatarText = (skill: SkillCatalogItem) => resolveSkillAuthorAvatarText(skill, currentUser.value);
const getSkillAuthorAvatarStyle = (skill: SkillCatalogItem) => resolveSkillAuthorAvatarStyle(skill, currentUser.value);

const selectedFiles = computed(() => selectedSkill.value?.files ?? []);

const rootFile = computed(() =>
  selectedFiles.value.find((file) => file.path === 'SKILL.md') ?? selectedFiles.value[0] ?? null
);

const activeFile = computed(() => {
  if (!selectedFiles.value.length) return null;
  return selectedFiles.value.find((file) => file.id === activeFileId.value) ?? rootFile.value;
});

const activeFileContent = computed(() => {
  const file = activeFile.value;
  if (!selectedSkill.value || !file) return '';
  return fileDrafts.value[`${selectedSkill.value.id}:${file.id}`] ?? file.content;
});

const activeFileParentPath = computed(() => {
  const path = activeFile.value?.path ?? '';
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? `${path.slice(0, lastSlash)}/` : '';
});

const activeFileName = computed(() => activeFile.value?.name ?? '');

const treeGroups = computed<TreeGroup[]>(() => {
  const groupMap = new Map<string, { files: SkillFile[]; folderMap: Map<string, SkillFile[]> }>();

  selectedFiles.value
    .filter((file) => file.path !== 'SKILL.md')
    .forEach((file) => {
      const parts = file.path.split('/');
      const groupName = parts[0] ?? 'files';
      const folderName = parts.length > 2 ? parts[1] : '';
      const group = groupMap.get(groupName) ?? { files: [], folderMap: new Map<string, SkillFile[]>() };

      if (folderName) {
        const folderFiles = group.folderMap.get(folderName) ?? [];
        folderFiles.push(file);
        group.folderMap.set(folderName, folderFiles);
      } else {
        group.files.push(file);
      }

      groupMap.set(groupName, group);
    });

  return Array.from(groupMap.entries()).map(([label, group]) => ({
    key: `group:${label}`,
    label,
    files: group.files,
    folders: Array.from(group.folderMap.entries()).map(([folderLabel, files]) => ({
      key: `folder:${label}/${folderLabel}`,
      label: folderLabel,
      files,
    })),
  }));
});

const currentFileKey = computed(() =>
  selectedSkill.value && activeFile.value ? `${selectedSkill.value.id}:${activeFile.value.id}` : ''
);

const selectedSkillIsAdded = computed(() =>
  selectedSkill.value ? isSkillAvailable(selectedSkill.value.id) : false
);

const selectedSkillIsEnabled = computed(() =>
  selectedSkill.value ? isSkillEnabled(selectedSkill.value) : false
);

const setStatus = (message: string) => {
  statusMessage.value = message;
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  statusTimer = setTimeout(() => {
    statusMessage.value = '';
    statusTimer = null;
  }, 1800);
};

const isExpanded = (key: string) => expandedTreeKeys.value[key] !== false;

const toggleExpanded = (key: string) => {
  expandedTreeKeys.value = {
    ...expandedTreeKeys.value,
    [key]: !isExpanded(key),
  };
};

const resetDetailState = (skill: SkillCatalogItem) => {
  const firstFile = skill.files.find((file) => file.path === 'SKILL.md') ?? skill.files[0];
  activeFileId.value = firstFile?.id ?? '';
  editMode.value = false;
  editBuffer.value = '';
  openCardMenuId.value = null;

  const nextExpanded: Record<string, boolean> = {};
  skill.files.forEach((file) => {
    const parts = file.path.split('/');
    if (parts[0] && file.path !== 'SKILL.md') {
      nextExpanded[`group:${parts[0]}`] = true;
    }
    if (parts.length > 2) {
      nextExpanded[`folder:${parts[0]}/${parts[1]}`] = true;
    }
  });
  expandedTreeKeys.value = nextExpanded;
};

const setListPage = (page: SkillListPage) => {
  activeListPage.value = page;
  selectedStatusFilter.value = 'all';
  selectedSkill.value = null;
  isCreateMode.value = false;
  activeFileId.value = '';
  editMode.value = false;
  editBuffer.value = '';
  openCardMenuId.value = null;
};

const selectFile = (file: SkillFile) => {
  activeFileId.value = file.id;
  editMode.value = false;
  editBuffer.value = '';
};

const closeModal = () => {
  showSkillCreateModal.value = false;
  emit('close');
};

const createSkill = () => {
  showSkillCreateModal.value = true;
  isCreateMode.value = false;
  selectedSkill.value = null;
  editMode.value = false;
  editBuffer.value = '';
  createError.value = '';
};

const handleCreateSkillAction = () => {
  createSkill();
};

const handleSkillCreateChatStart = (prompt: string) => {
  showSkillCreateModal.value = false;
  isCreateMode.value = false;
  selectedSkill.value = null;
  emit('create', prompt);
};

const handleSkillCreated = (skill: SkillCatalogItem) => {
  showSkillCreateModal.value = false;
  isCreateMode.value = false;
  activeListPage.value = skill.scope === 'team' ? 'team-shared' : 'personal';
  selectedStatusFilter.value = 'all';
  openSkill(skill, { bypassSubscription: true });
  setStatus(`${skill.name} 已创建`);
};

const useSkill = (skillName?: string, skillId?: string) => {
  const skill = skillId
    ? personalSkills.value.find((item) => item.id === skillId)
    : selectedSkill.value;
  if (skill && !isSkillEnabled(skill)) {
    setStatus(`${skill.name} 已停用，请先启用后再使用`);
    return;
  }

  if (skillId) {
    markSkillUsed(skillId);
  } else if (selectedSkill.value) {
    markSkillUsed(selectedSkill.value.id);
  }
  emit('use', skillName ?? selectedSkill.value?.name);
};

const handleListCardClick = (skill: SkillCatalogItem) => {
  if (activeListPage.value === 'personal') {
    useSkill(skill.name, skill.id);
    return;
  }

  openSkill(skill);
};

const isSubscriptionPage = computed(() => activeListPage.value !== 'personal');

const shouldBlockSkillDetail = (skill: SkillCatalogItem) =>
  isSubscriptionPage.value && !isSkillAdded(skill);

const openSkill = (skill: SkillCatalogItem, options: { bypassSubscription?: boolean } = {}) => {
  if (!options.bypassSubscription && shouldBlockSkillDetail(skill)) {
    setStatus(`请先订阅「${getSkillDisplayName(skill)}」后查看或使用`);
    return;
  }

  selectedSkill.value = skill;
  resetDetailState(skill);
};

const backToList = () => {
  selectedSkill.value = null;
  isCreateMode.value = false;
  activeFileId.value = '';
  editMode.value = false;
  editBuffer.value = '';
};

const toggleCardMenu = (skillId: string) => {
  openCardMenuId.value = openCardMenuId.value === skillId ? null : skillId;
};

const closeCardMenuOnOutsideClick = (event: MouseEvent) => {
  if (!openCardMenuId.value) return;
  const target = event.target;
  if (target instanceof Element && target.closest('.card-action-menu, .card-more-btn')) return;
  openCardMenuId.value = null;
};

const copyText = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  setStatus(`${label}已复制`);
};

const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`${filename} 已下载`);
};

const createSkillBundleContent = (skill: SkillCatalogItem) =>
  skill.files.map((file) => `# ${file.path}\n\n${file.content}`).join('\n\n---\n\n');

const copyCurrentFile = () => {
  if (!activeFile.value) return;
  void copyText(activeFileContent.value, activeFile.value.name);
};

const downloadCurrentSkill = () => {
  if (!selectedSkill.value) return;
  downloadText(`${selectedSkill.value.name}-skill-bundle.md`, createSkillBundleContent(selectedSkill.value));
};

const downloadSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  downloadText(`${skill.name}-skill-bundle.md`, createSkillBundleContent(skill));
};

const editSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  closeModal();
  void router.push({
    name: 'skills',
    query: {
      skillMode: activeListPage.value,
      skillId: skill.id,
      edit: '1',
      skillTick: Date.now().toString(),
    },
  });
};

const isSkillAdded = (skill: SkillCatalogItem) => isSkillAvailable(skill.id);

const shouldShowSkillDisplayAuthor = (skill: SkillCatalogItem) =>
  Boolean(getStandalonePresentation(skill)) || shouldShowSkillAuthor(skill);

const getSkillDisplayName = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.title ?? skill.name;

const getSkillDisplayDescription = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.description ?? skill.description;

const getSkillDisplayAuthorName = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.creator ?? getSkillAuthorName(skill);

const getSkillDisplayAuthorAvatarText = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.creator.slice(0, 1) ?? getSkillAuthorAvatarText(skill);

const hasSkillDisplayAuthorAvatarImage = (skill: SkillCatalogItem) =>
  !getStandalonePresentation(skill) && hasSkillAuthorAvatarImage(skill, currentUser.value);

const getSkillDisplayAuthorAvatarStyle = (skill: SkillCatalogItem) => {
  if (getStandalonePresentation(skill)) {
    return {
      background: 'var(--skill-ink)',
      color: 'var(--on-primary)',
    };
  }

  return getSkillAuthorAvatarStyle(skill);
};

const skillIconOptions: Component[] = [
  FileSearch,
  PenLine,
  ShieldCheck,
  Zap,
  Scale,
  Sparkles,
  ListChecks,
  BookOpen,
  ClipboardCheck,
  BriefcaseBusiness,
  Gavel,
  Landmark,
  FileText,
];

const firmOptions = [
  '金杜律师事务所',
  '方达律师事务所',
  '君合律师事务所',
  '中伦律师事务所',
  '汉坤律师事务所',
  '海问律师事务所',
  '通商律师事务所',
  '天元律师事务所',
  '涌见律所',
];

const getSkillIcon = (skill: SkillCatalogItem) => {
  const presentation = getStandalonePresentation(skill);
  if (presentation?.kind === 'case') return FileSearch;
  if (presentation?.kind === 'draft') return FileText;
  if (presentation?.kind === 'ca') return ShieldCheck;
  if (presentation?.kind === 'reg') return Zap;
  if (presentation?.kind === 'spa') return Sparkles;
  if (presentation?.kind === 'data') return BookOpen;
  if (presentation?.kind === 'labor') return ShieldCheck;
  if (presentation?.kind === 'ipo') return Sparkles;

  const searchableName = `${skill.id} ${skill.name} ${skill.category} ${skill.tags.join(' ')}`.toLowerCase();
  if (/case|类案|检索|判例/.test(searchableName)) return FileSearch;
  if (/spa|起草|写作|文书|咨询|意见|draft|write/.test(searchableName)) return PenLine;
  if (/合同|审查|红线|风险|shield|contract/.test(searchableName)) return ShieldCheck;
  if (/法规|监管|差距|合规|reg|watch/.test(searchableName)) return Zap;
  if (/数据|事件|清单|证据|劳动|data|labor|checklist/.test(searchableName)) return ListChecks;
  if (/ipo|反馈|资本|证券/.test(searchableName)) return Sparkles;
  return skillIconOptions[getStableIndex(`${skill.id}:${skill.category}`, skillIconOptions.length)] ?? Sparkles;
};

const getSkillToneClass = (_skill: SkillCatalogItem) => 'tone-neutral';

const isMarketplacePage = computed(() =>
  activeListPage.value === 'official'
  || activeListPage.value === 'market'
  || activeListPage.value === 'recommended'
  || activeListPage.value === 'public-hub'
);

const getSkillSourceLabel = (skill: SkillCatalogItem) => {
  if (isOfficialRecommendedSkill(skill)) return '官方推荐';
  if (activeListPage.value === 'official' || activeListPage.value === 'recommended') return '来自 官方';
  if (activeListPage.value === 'market' || activeListPage.value === 'public-hub') return '来自 市场';

  const presentation = getStandalonePresentation(skill);
  if (presentation) return `来自 ${standaloneSourceLabels[presentation.source]}`;

  if (activeListPage.value === 'personal') return '来自 个人';
  if (activeListPage.value === 'group-shared') return '来自 小组';
  if (activeListPage.value === 'team-shared') return '来自 团队';
  if (skill.source === 'recommended') return '来自 官方';
  return '来自 官方';
};

const getSkillSourceClass = (skill: SkillCatalogItem) => {
  if (isOfficialRecommendedSkill(skill)) return 'source-official';
  if (activeListPage.value === 'official' || activeListPage.value === 'recommended') return 'source-official';
  if (activeListPage.value === 'market' || activeListPage.value === 'public-hub') return 'source-market';

  const presentation = getStandalonePresentation(skill);
  if (presentation?.source === 'mine') return 'source-personal';
  if (presentation?.source === 'group') return 'source-group-shared';
  if (presentation?.source === 'team') return 'source-team-shared';
  if (presentation?.source === 'official') return 'source-official';
  if (presentation?.source === 'market') return 'source-market';
  return `source-${activeListPage.value}`;
};

const getSkillSourceIcon = (skill: SkillCatalogItem) => {
  if (isOfficialRecommendedSkill(skill)) return ShieldCheck;
  if (activeListPage.value === 'market' || activeListPage.value === 'public-hub') return Store;
  if (activeListPage.value === 'official' || activeListPage.value === 'recommended') return ShieldCheck;

  const source = getStandalonePresentation(skill)?.source;
  if (source === 'mine' || (!source && activeListPage.value === 'personal')) return UserRound;
  if (source === 'official' || source === 'market') return ShieldCheck;
  if (source === 'team' || (!source && activeListPage.value === 'team-shared')) return Landmark;
  return UsersRound;
};

const getSkillAuthorFirm = (skill: SkillCatalogItem) => {
  const presentation = getStandalonePresentation(skill);
  if (presentation) return presentation.firm;

  if (skill.source === 'custom' && skill.scope !== 'team') {
    return currentUser.value?.firmShortName || currentOrganization.value?.shortName || '个人工作区';
  }

  if (isOfficialRecommendedSkill(skill)) {
    return '涌见官方';
  }

  if (isMarketplacePage.value || skill.source === 'recommended') {
    return activeListPage.value === 'market' || activeListPage.value === 'public-hub' ? '涌见市场' : '涌见官方';
  }

  return firmOptions[getStableIndex(`${skill.id}:${skill.category}:firm`, firmOptions.length)] ?? '涌见律所';
};

const getSkillStateLabel = (skill: SkillCatalogItem) =>
  getSkillStatusKind(skill) === 'enabled' ? '已启用' : '未启用';

const getSkillFileChips = (skill: SkillCatalogItem) => {
  const presentation = getStandalonePresentation(skill);
  if (presentation) {
    return presentation.deliverables.map<SkillChipDisplay>((deliverable, index) => ({
      id: `${skill.id}-${presentation.id}-${index}`,
      name: deliverable.name,
      kind: deliverable.kind,
      virtual: true,
    }));
  }

  const files = skill.files.filter((file) => file.path !== 'SKILL.md');
  return (files.length ? files : skill.files).slice(0, 3);
};

const getSkillFileTypeLabel = (file: SkillFile | SkillChipDisplay) => {
  if ('virtual' in file) return file.kind.toUpperCase();

  const ext = file.path.split('.').pop()?.toUpperCase() || file.type.toUpperCase();
  if (ext === 'MARKDOWN') return 'MD';
  if (ext === 'YML') return 'YAML';
  return ext;
};

const getSkillFileTypeClass = (file: SkillFile | SkillChipDisplay) =>
  `file-${getSkillFileTypeLabel(file).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const getSkillFileDisplayName = (file: SkillFile | SkillChipDisplay) =>
  file.name.replace(/\.(md|markdown|json|ya?ml|ts)$/i, '');

const getPrimarySkillActionLabel = (skill: SkillCatalogItem) => {
  if (activeListPage.value === 'personal') return isSkillDisplayEnabled(skill) ? '使用' : '启用';
  if (isSkillAdded(skill)) return '使用';
  return '订阅';
};

const isPrimarySkillActionDisabled = (_skill: SkillCatalogItem) => false;

const handlePrimarySkillAction = (skill: SkillCatalogItem) => {
  if (activeListPage.value === 'personal') {
    if (isSkillEnabled(skill)) {
      useSkill(skill.name, skill.id);
      return;
    }
    setSkillOpen(skill, true);
    return;
  }

  if (isSkillAdded(skill)) {
    useSkill(skill.name, skill.id);
    return;
  }

  subscribeSkill(skill);
};

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addPersonalSkill(skill.id);
  setStatus(didAdd ? `${getSkillDisplayName(skill)} 已订阅到我的技能` : `${getSkillDisplayName(skill)} 已在我的技能中`);
};

const subscribeSkill = (skill: SkillCatalogItem) => {
  addSkill(skill);
};

const setSkillOpen = (skill: SkillCatalogItem, enabled: boolean) => {
  const updatedSkill = setSkillEnabled(skill.id, enabled);
  if (selectedSkill.value?.id === skill.id && updatedSkill) {
    selectedSkill.value = updatedSkill;
  }
  openCardMenuId.value = null;
  setStatus(`${skill.name} 已${enabled ? '启用' : '停用'}`);
};

const publishDestinationLabels: Record<SkillPublishDestination, string> = {
  group: '小组',
  team: '团队',
  public: '市场',
};

const publishDialogSkill = ref<SkillCatalogItem | null>(null);
const publishDialogDestination = ref<SkillPublishDestination>('group');
const defaultPublishGroupIds = ['business'];
const publishDialogGroupIds = ref<string[]>([...defaultPublishGroupIds]);
const publishDialogPricing = ref<'free' | 'paid'>('free');
const publishDialogPrice = ref('99');
const publishDialogTags = ref<string[]>([]);

const publishDestinationOptions: Array<{
  id: SkillPublishDestination;
  label: string;
  description: string;
  icon: Component;
}> = [
  { id: 'group', label: '小组', description: '小组成员可在自己的「个人」中订阅使用，免费', icon: UserRound },
  { id: 'team', label: '团队', description: '本律所成员可订阅使用，免费', icon: Building2 },
  { id: 'public', label: '市场', description: '公开发布，全平台律师与企业法务可发现并订阅', icon: Store },
];

const publishGroupOptions = [
  { id: 'business', label: '公司业务组' },
  { id: 'dispute', label: '争议解决组' },
  { id: 'compliance', label: '合规风控组' },
  { id: 'labor', label: '劳动用工组' },
];

const publishMarketTagOptions = [
  '投融资 / 并购',
  '合同审查',
  '尽职调查',
  '合规',
  '数据隐私',
  '劳动用工',
  '知识产权',
  '商事争议',
  '刑事合规',
  '公司治理',
  '税务',
  '跨境',
];

const openPublishDialog = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  publishDialogSkill.value = skill;
  publishDialogDestination.value = 'group';
  publishDialogGroupIds.value = [...defaultPublishGroupIds];
  publishDialogPricing.value = 'free';
  publishDialogPrice.value = '99';
  publishDialogTags.value = [];
};

const closePublishDialog = () => {
  publishDialogSkill.value = null;
};

const selectPublishDialogDestination = (destination: SkillPublishDestination) => {
  publishDialogDestination.value = destination;
  if (destination === 'group' && !publishDialogGroupIds.value.length) {
    publishDialogGroupIds.value = [...defaultPublishGroupIds];
  }
};

const togglePublishDialogGroup = (groupId: string) => {
  publishDialogGroupIds.value = publishDialogGroupIds.value.includes(groupId)
    ? publishDialogGroupIds.value.filter((item) => item !== groupId)
    : [...publishDialogGroupIds.value, groupId];
};

const togglePublishDialogTag = (tag: string) => {
  if (publishDialogTags.value.includes(tag)) {
    publishDialogTags.value = publishDialogTags.value.filter((item) => item !== tag);
    return;
  }
  if (publishDialogTags.value.length >= 3) return;
  publishDialogTags.value = [...publishDialogTags.value, tag];
};

const updatePublishDialogPrice = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  publishDialogPrice.value = (target?.value || '').replace(/\D/g, '');
};

const confirmPublishDialog = () => {
  const skill = publishDialogSkill.value;
  if (!skill) return;
  if (publishDialogDestination.value === 'group' && !publishDialogGroupIds.value.length) {
    setStatus('请选择至少一个小组');
    return;
  }
  if (publishDialogDestination.value === 'public' && publishDialogPricing.value === 'paid' && !publishDialogPrice.value) {
    setStatus('请填写市场定价');
    return;
  }

  const didPublish = publishSkillToTeamMarket(skill.id, {
    destination: publishDialogDestination.value,
    groupIds: publishDialogGroupIds.value,
    pricing: publishDialogPricing.value,
    price: publishDialogPrice.value,
    tags: publishDialogTags.value,
  });
  const label = publishDestinationLabels[publishDialogDestination.value];
  closePublishDialog();
  setStatus(didPublish ? `${skill.name} 已发布到${label}` : `${skill.name} 已在${label}中`);
};

const deleteSkill = (skill: SkillCatalogItem) => {
  const didRemove = removePersonalSkill(skill.id);
  openCardMenuId.value = null;
  setStatus(didRemove ? `${skill.name} 已删除` : '默认技能不可删除');
};

const startEditMode = () => {
  if (!activeFile.value || !currentFileKey.value) return;

  editBuffer.value = activeFileContent.value;
  editMode.value = true;
  setStatus('已进入编辑模式');
};

const saveEdit = () => {
  if (!activeFile.value || !currentFileKey.value) return;

  fileDrafts.value = {
    ...fileDrafts.value,
    [currentFileKey.value]: editBuffer.value,
  };

  if (selectedSkill.value?.source === 'custom') {
    const updatedFiles = selectedSkill.value.files.map((file) =>
      file.id === activeFile.value?.id ? { ...file, content: editBuffer.value } : file
    );
    const updatedSkill = upsertCustomSkill({
      ...selectedSkill.value,
      files: updatedFiles,
      status: selectedSkill.value.status || 'active',
    });
    if (updatedSkill) {
      selectedSkill.value = updatedSkill;
    }
  }

  editMode.value = false;
  setStatus('当前文件已保存');
};

const cancelEdit = () => {
  editBuffer.value = '';
  editMode.value = false;
  setStatus('已取消编辑');
};

const saveGeneratedSkill = (skill: SkillCatalogItem) => {
  const savedSkill = upsertCustomSkill({
    ...skill,
    scope: createScope.value,
    status: 'active',
  });
  if (!savedSkill) return;

  activeListPage.value = savedSkill.scope === 'team' ? 'team-shared' : 'personal';
  isCreateMode.value = false;
  openSkill(savedSkill, { bypassSubscription: true });
  setStatus(`${savedSkill.name} 已创建`);
};

const generateDraft = async () => {
  const brief = createBrief.value.trim();
  if (!brief) {
    createError.value = '请先输入技能需求';
    return;
  }

  isGeneratingDraft.value = true;
  createError.value = '';

  try {
    const draft = await createSkillWithSkillCreator(brief, {
      scenario: createScenario.value,
      source: createSource.value,
      output: createOutput.value,
      scope: createScope.value === 'team' ? '团队共享' : '仅个人使用',
    });
    saveGeneratedSkill(draft);
  } catch (error) {
    createError.value = error instanceof Error ? error.message : '技能生成失败';
  } finally {
    isGeneratingDraft.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeCardMenuOnOutsideClick);
  if (props.startInCreate) {
    createSkill();
  }
});

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  document.removeEventListener('click', closeCardMenuOnOutsideClick);
});
</script>

<template>
  <div class="skill-modal-backdrop" :class="{ 'create-modal-open': showSkillCreateModal }" @click.self="closeModal">
    <section
      v-if="!showSkillCreateModal"
      class="skill-modal"
      :class="{ 'detail-mode': selectedSkill }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-modal-title"
    >
      <button class="modal-close-btn" type="button" aria-label="关闭技能弹窗" @click="closeModal">
        <X :size="24" :stroke-width="2.2" />
      </button>

      <header v-if="!selectedSkill" class="modal-header">
        <div v-if="isCreateMode" class="modal-create-heading">
          <button v-if="isCreateMode" class="list-back-btn" type="button" @click="backToList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>创建技能</span>
          </button>
        </div>
        <template v-else>
          <div class="modal-title-row">
            <h2 id="skill-modal-title">沉淀律师的经验技能，让 AI 像你一样工作</h2>
          </div>

          <div class="modal-command-bar">
            <label class="modal-search-control market-search">
              <Search :size="16" />
              <input v-model="modalSearchKeyword" type="text" placeholder="搜索技能、描述、标签" />
            </label>
            <button
              class="modal-create-btn"
              type="button"
              @click.stop="handleCreateSkillAction"
            >
              <Plus :size="16" />
              创建技能
            </button>
          </div>

          <div class="modal-source-switcher">
            <nav class="modal-tabs" aria-label="技能来源">
              <button
                v-for="tab in sourceTabs"
                :key="tab.key"
                class="modal-tab"
                :class="{ active: activeListPage === tab.key }"
                type="button"
                @click="setListPage(tab.key)"
              >
                <span>{{ tab.name }}</span>
              </button>
            </nav>

            <div v-if="activeListPage === 'personal'" class="modal-status-filter-row">
              <button
                v-for="option in statusFilterOptions"
                :key="option.key"
                class="status-filter-btn"
                :class="{ active: selectedStatusFilter === option.key }"
                type="button"
                @click="selectedStatusFilter = option.key"
              >
                {{ option.label }}
              </button>
            </div>

            <div v-else-if="activeListPage === 'market'" class="modal-recommended-sort-row">
              <nav class="modal-recommended-sort-tabs" aria-label="技能排序">
                <button
                  v-for="option in recommendedSortOptions"
                  :key="option.key"
                  class="modal-recommended-sort-tab"
                  :data-active="selectedRecommendedSort === option.key"
                  type="button"
                  @click="selectedRecommendedSort = option.key"
                >
                  {{ option.label }}
                </button>
              </nav>
            </div>
          </div>
          <span v-if="statusMessage" class="modal-status">{{ statusMessage }}</span>
        </template>
      </header>

      <section v-if="isCreateMode" class="create-skill-panel" aria-label="创建技能">
        <div class="create-form-grid">
          <label class="create-field create-field-wide">
            <span>技能需求</span>
            <textarea
              v-model="createBrief"
              placeholder="例如：创建一个买方并购协议审查技能，重点识别交易结构、陈述保证、交割条件、赔偿责任和目标公司风险。"
            ></textarea>
          </label>

          <label class="create-field">
            <span>工作场景</span>
            <select v-model="createScenario">
              <option>合同 / 交易文件</option>
              <option>尽职调查</option>
              <option>咨询意见</option>
              <option>投融资 / 并购</option>
              <option>基金 / 合规</option>
            </select>
          </label>

          <label class="create-field">
            <span>输入来源</span>
            <select v-model="createSource">
              <option>上传或粘贴项目材料</option>
              <option>团队知识库</option>
              <option>现有模板 / 技能</option>
              <option>纯文字描述规则</option>
            </select>
          </label>

          <label class="create-field">
            <span>稳定输出</span>
            <select v-model="createOutput">
              <option>Word 文书初稿</option>
              <option>审查清单</option>
              <option>风险矩阵 / 问题表</option>
              <option>工作步骤 / 操作规程</option>
              <option>模板 / 条款库</option>
            </select>
          </label>

          <label class="create-field">
            <span>保存范围</span>
            <select v-model="createScope">
              <option value="personal">我的技能</option>
              <option value="team">团队共享</option>
            </select>
          </label>
        </div>

        <p v-if="createError" class="create-error">{{ createError }}</p>

        <div class="create-actions">
          <button class="edit-cancel-btn" type="button" @click="backToList">取消</button>
          <button class="edit-save-btn" type="button" :disabled="isGeneratingDraft" @click="generateDraft">
            {{ isGeneratingDraft ? '生成中...' : '生成并保存技能' }}
          </button>
        </div>
      </section>

      <div v-if="!selectedSkill && !isCreateMode && !visibleListSkills.length" class="empty-list">
        <span class="empty-icon" aria-hidden="true">
          <Puzzle :size="22" />
        </span>
        <h3>{{ skillListPageCopy[activeListPage].empty }}</h3>
        <button type="button" @click="handleCreateSkillAction">
          <Plus :size="16" />
          <span>创建技能</span>
        </button>
      </div>

      <template v-else-if="!selectedSkill && !isCreateMode">
        <div class="card-grid">
          <article
            v-for="skill in visibleListSkills"
            :key="skill.id"
            class="managed-card"
            :class="{
              'recommend-card': activeListPage !== 'personal',
              'preview-disabled': shouldBlockSkillDetail(skill),
              'is-closed': activeListPage === 'personal' && getSkillStatusKind(skill) === 'inactive',
              'menu-open': openCardMenuId === skill.id
            }"
            :tabindex="shouldBlockSkillDetail(skill) ? undefined : 0"
            @click="handleListCardClick(skill)"
            @keydown.enter.prevent="handleListCardClick(skill)"
          >
            <div v-if="activeListPage === 'personal' && openCardMenuId === skill.id" class="card-action-menu" @click.stop>
              <button class="menu-action" type="button" @click="editSkill(skill)">
                <Pencil :size="15" />
                <span>编辑</span>
              </button>
              <button class="menu-action" type="button" @click="downloadSkill(skill)">
                <Download :size="15" />
                <span>下载</span>
              </button>
              <button class="menu-action" type="button" @click="setSkillOpen(skill, !isSkillEnabled(skill))">
                <Power v-if="!isSkillEnabled(skill)" :size="15" />
                <PowerOff v-else :size="15" />
                <span>{{ isSkillEnabled(skill) ? '停用' : '启用' }}</span>
              </button>
              <button class="menu-action" type="button" @click="openPublishDialog(skill)">
                <UsersRound :size="15" />
                <span>发布</span>
              </button>
              <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
                <Trash2 :size="15" />
                <span>删除</span>
              </button>
            </div>

            <div class="card-main-row">
              <div class="card-avatar" :class="getSkillToneClass(skill)" aria-hidden="true">
                <component :is="getSkillIcon(skill)" :size="30" :stroke-width="2" />
              </div>
              <div class="card-copy">
                <div class="card-title-row">
                  <h3>{{ getSkillDisplayName(skill) }}</h3>
                  <span class="skill-state-badge" :class="getSkillStatusKind(skill)">
                    {{ getSkillStateLabel(skill) }}
                  </span>
                </div>
                <p>{{ getSkillDisplayDescription(skill) }}</p>
                <span v-if="shouldShowSkillDisplayAuthor(skill)" class="skill-author-line">
                  <span class="skill-author-avatar" :style="getSkillDisplayAuthorAvatarStyle(skill)">
                    <span v-if="!hasSkillDisplayAuthorAvatarImage(skill)">{{ getSkillDisplayAuthorAvatarText(skill) }}</span>
                  </span>
                  <strong>{{ getSkillDisplayAuthorName(skill) }}</strong>
                  <span>·</span>
                  <span>{{ getSkillAuthorFirm(skill) }}</span>
                </span>
              </div>
            </div>

            <div class="file-chip-row" aria-label="技能文件">
              <span
                v-for="file in getSkillFileChips(skill)"
                :key="file.id"
                class="file-chip"
                :class="getSkillFileTypeClass(file)"
              >
                <strong>{{ getSkillFileTypeLabel(file) }}</strong>
                <span>{{ getSkillFileDisplayName(file) }}</span>
              </span>
            </div>

            <footer class="card-footer">
              <span class="source-badge" :class="getSkillSourceClass(skill)">
                <component :is="getSkillSourceIcon(skill)" :size="13" />
                {{ getSkillSourceLabel(skill) }}
              </span>

              <div class="card-actions">
                <button
                  class="card-use-btn"
                  type="button"
                  :disabled="isPrimarySkillActionDisabled(skill)"
                  :aria-label="`${getPrimarySkillActionLabel(skill)}${getSkillDisplayName(skill)}`"
                  @click.stop="handlePrimarySkillAction(skill)"
                >
                  <Check v-if="isPrimarySkillActionDisabled(skill)" :size="14" />
                  <Plus v-else-if="getPrimarySkillActionLabel(skill) === '订阅'" :size="14" />
                  <span>{{ getPrimarySkillActionLabel(skill) }}</span>
                </button>
                <button
                  v-if="activeListPage === 'personal'"
                  class="card-more-btn"
                  type="button"
                  :aria-label="`${getSkillDisplayName(skill)} 更多操作`"
                  @click.stop="toggleCardMenu(skill.id)"
                >
                  <MoreHorizontal :size="18" />
                </button>
              </div>
            </footer>
          </article>
        </div>
      </template>

      <template v-if="selectedSkill">
        <header class="detail-header">
          <button class="detail-title-btn" type="button" @click="backToList">
            <ChevronRight :size="16" class="back-chevron" />
            <span>{{ selectedSkill.name }}</span>
          </button>
          <div class="detail-actions">
            <span v-if="statusMessage" class="detail-status">{{ statusMessage }}</span>
            <button v-if="selectedSkillIsAdded && selectedSkillIsEnabled" class="use-skill-btn" type="button" @click="useSkill()">去使用</button>
            <button
              v-else-if="selectedSkillIsAdded && selectedSkill"
              class="use-skill-btn add-detail-btn"
              type="button"
              @click="setSkillOpen(selectedSkill, true)"
            >
              启用技能
            </button>
            <button v-else class="use-skill-btn add-detail-btn" type="button" @click="addSkill(selectedSkill)">
              添加
            </button>
            <template v-if="editMode">
              <button class="edit-cancel-btn" type="button" @click="cancelEdit">取消</button>
              <button class="edit-save-btn" type="button" @click="saveEdit">保存</button>
            </template>
            <button
              v-else
              class="detail-icon-btn"
              type="button"
              aria-label="编辑当前文件"
              title="编辑当前文件"
              @click="startEditMode"
            >
              <Pencil :size="18" />
            </button>
            <button
              class="detail-icon-btn"
              type="button"
              aria-label="下载技能包"
              title="下载技能包"
              @click="downloadCurrentSkill"
            >
              <Download :size="18" />
            </button>
          </div>
        </header>

        <div class="skill-detail-shell">
          <aside class="detail-tree" aria-label="技能文件">
            <button
              v-if="rootFile"
              class="tree-file root-file"
              :class="{ active: activeFile?.id === rootFile.id }"
              type="button"
              @click="selectFile(rootFile)"
            >
              <FileText :size="15" />
              <span>{{ rootFile.name }}</span>
            </button>

            <div v-for="group in treeGroups" :key="group.key" class="tree-group">
              <button class="tree-heading" type="button" @click="toggleExpanded(group.key)">
                <ChevronDown v-if="isExpanded(group.key)" :size="15" />
                <ChevronRight v-else :size="15" />
                <span>{{ group.label }}</span>
              </button>

              <template v-if="isExpanded(group.key)">
                <button
                  v-for="file in group.files"
                  :key="file.id"
                  class="tree-file"
                  :class="{ active: activeFile?.id === file.id }"
                  type="button"
                  @click="selectFile(file)"
                >
                  <FileText :size="15" />
                  <span>{{ file.name }}</span>
                </button>

                <div v-for="folder in group.folders" :key="folder.key" class="tree-folder">
                  <button class="tree-child" type="button" @click="toggleExpanded(folder.key)">
                    <ChevronDown v-if="isExpanded(folder.key)" :size="15" />
                    <ChevronRight v-else :size="15" />
                    <span>{{ folder.label }}</span>
                  </button>

                  <template v-if="isExpanded(folder.key)">
                    <button
                      v-for="file in folder.files"
                      :key="file.id"
                      class="tree-file nested"
                      :class="{ active: activeFile?.id === file.id }"
                      type="button"
                      @click="selectFile(file)"
                    >
                      <FileText :size="15" />
                      <span>{{ file.name }}</span>
                    </button>
                  </template>
                </div>
              </template>
            </div>
          </aside>

          <main class="detail-doc">
            <header class="doc-header">
              <div class="doc-path" aria-label="当前文件路径">
                <span v-if="activeFileParentPath" class="doc-path-parent">{{ activeFileParentPath }}</span>
                <span class="doc-path-name">{{ activeFileName }}</span>
              </div>

              <div class="doc-actions">
                <button
                  class="detail-icon-btn"
                  type="button"
                  aria-label="复制当前文件"
                  title="复制当前文件"
                  @click="copyCurrentFile"
                >
                  <Copy :size="17" />
                </button>
              </div>
            </header>

            <article class="doc-content">
              <textarea
                v-if="editMode"
                v-model="editBuffer"
                class="doc-editor"
                spellcheck="false"
                aria-label="编辑当前技能文件"
              ></textarea>
              <pre v-else class="doc-pre" :class="`file-${activeFile?.type ?? 'markdown'}`">{{ activeFileContent }}</pre>
            </article>
          </main>
        </div>
      </template>

      <div v-if="publishDialogSkill" class="publish-dialog-backdrop" @click.self="closePublishDialog">
        <section class="publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-dialog-title">
          <header class="publish-dialog-header">
            <div class="publish-dialog-title-row">
              <h2 id="publish-dialog-title">发布技能</h2>
              <span>{{ publishDialogSkill.name }}</span>
            </div>
            <button class="publish-dialog-close" type="button" aria-label="关闭发布弹窗" @click="closePublishDialog">
              <X :size="22" />
            </button>
          </header>

          <main class="publish-dialog-body">
            <div class="publish-dialog-section-title">分享目的地</div>
            <div class="publish-dialog-destination-grid" role="radiogroup" aria-label="分享目的地">
              <button
                v-for="option in publishDestinationOptions"
                :key="option.id"
                class="publish-dialog-destination-card"
                :class="{ active: publishDialogDestination === option.id }"
                type="button"
                role="radio"
                :aria-checked="publishDialogDestination === option.id"
                @click="selectPublishDialogDestination(option.id)"
              >
                <span class="publish-dialog-card-title">
                  <span class="publish-dialog-card-icon">
                    <component :is="option.icon" :size="18" />
                  </span>
                  <strong>{{ option.label }}</strong>
                </span>
                <p>{{ option.description }}</p>
              </button>
            </div>

            <section v-if="publishDialogDestination === 'group'" class="publish-dialog-groups">
              <div class="publish-dialog-section-title">选择小组（可多选）</div>
              <div class="publish-dialog-chip-list" role="group" aria-label="选择小组">
                <button
                  v-for="group in publishGroupOptions"
                  :key="group.id"
                  class="publish-dialog-chip"
                  :class="{ active: publishDialogGroupIds.includes(group.id) }"
                  type="button"
                  :aria-pressed="publishDialogGroupIds.includes(group.id)"
                  @click="togglePublishDialogGroup(group.id)"
                >
                  <Check v-if="publishDialogGroupIds.includes(group.id)" :size="11" />
                  <span>{{ group.label }}</span>
                </button>
              </div>
            </section>

            <section v-else-if="publishDialogDestination === 'team'" class="publish-dialog-team-card">
              <Building2 :size="18" />
              <div>
                <strong>金杜律师事务所 ・ 涌见律师演示组织</strong>
                <span>21 名成员将能在「团队」分类下订阅此能力</span>
              </div>
            </section>

            <section v-else class="publish-dialog-market">
              <div class="publish-dialog-market-block">
                <div class="publish-dialog-section-title">定价</div>
                <div class="publish-dialog-pricing-row">
                  <button
                    class="publish-dialog-price-option"
                    :class="{ active: publishDialogPricing === 'free' }"
                    type="button"
                    @click="publishDialogPricing = 'free'"
                  >
                    免费
                  </button>
                  <button
                    class="publish-dialog-price-option"
                    :class="{ active: publishDialogPricing === 'paid' }"
                    type="button"
                    @click="publishDialogPricing = 'paid'"
                  >
                    付费
                  </button>
                  <label v-if="publishDialogPricing === 'paid'" class="publish-dialog-price-input">
                    <span>¥</span>
                    <input
                      class="tabular"
                      :value="publishDialogPrice"
                      inputmode="numeric"
                      placeholder="价格"
                      @input="updatePublishDialogPrice"
                    />
                  </label>
                </div>
              </div>

              <div class="publish-dialog-market-block">
                <div class="publish-dialog-section-title">分类标签</div>
                <div class="publish-dialog-chip-list" role="group" aria-label="分类标签">
                  <button
                    v-for="tag in publishMarketTagOptions"
                    :key="tag"
                    class="publish-dialog-chip"
                    :class="{
                      active: publishDialogTags.includes(tag),
                      disabled: publishDialogTags.length >= 3 && !publishDialogTags.includes(tag),
                    }"
                    type="button"
                    :aria-pressed="publishDialogTags.includes(tag)"
                    @click="togglePublishDialogTag(tag)"
                  >
                    <Check v-if="publishDialogTags.includes(tag)" :size="11" />
                    <span>{{ tag }}</span>
                  </button>
                </div>
                <p>至多选 3 个，用于市场分类与搜索</p>
              </div>
            </section>
          </main>

          <footer class="publish-dialog-footer">
            <button class="publish-dialog-cancel" type="button" @click="closePublishDialog">取消</button>
            <button class="publish-dialog-confirm" type="button" @click="confirmPublishDialog">确认发布</button>
          </footer>
        </section>
      </div>
    </section>

    <SkillCreateModal
      v-if="showSkillCreateModal"
      :submission-mode="props.createBehavior === 'emit' ? 'chat' : 'save'"
      @close="showSkillCreateModal = false"
      @created="handleSkillCreated"
      @start-chat="handleSkillCreateChatStart"
    />
  </div>
</template>

<style scoped>
.skill-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.48);
}

.skill-modal-backdrop.create-modal-open {
  background: transparent;
}

.skill-modal {
  position: relative;
  width: min(940px, calc(100vw - 40px));
  min-height: 412px;
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 28px 32px 30px;
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.skill-modal.detail-mode {
  width: min(1120px, calc(100vw - 40px));
  height: min(700px, calc(100vh - 40px));
  min-height: 0;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.modal-close-btn {
  position: absolute;
  top: 26px;
  right: 28px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--text-strong);
}

.modal-close-btn:hover {
  background: var(--surface-soft);
}

.modal-title-row {
  min-height: 34px;
  display: flex;
  align-items: center;
  padding-right: 48px;
  margin-bottom: 18px;
}

.modal-command-bar,
.modal-source-switcher,
.modal-result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  padding-right: 48px;
}

.modal-command-bar {
  min-height: 40px;
  justify-content: space-between;
  padding-right: 0;
  margin-bottom: 22px;
}

.modal-source-switcher {
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 20px;
  padding-bottom: 0;
  border-bottom: 0;
}

.modal-result-toolbar {
  margin: 0 0 20px;
}

.modal-header h2,
.modal-create-heading {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.2;
}

.modal-search-control {
  width: 100%;
  min-width: 0;
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: 1 1 auto;
  max-width: none;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.modal-search-control:focus-within {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.modal-search-control svg {
  flex-shrink: 0;
}

.modal-search-control input {
  width: 100%;
  min-width: 0;
  color: var(--text-main);
  background: transparent;
  font-size: 13.5px;
}

.modal-search-control input::placeholder {
  color: var(--text-muted);
}

.modal-status {
  display: block;
  margin: 8px 42px 0 0;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.modal-tabs {
  display: inline-flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  overflow-x: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  scrollbar-width: none;
}

.modal-tabs::-webkit-scrollbar {
  display: none;
}

.modal-tab {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1;
}

.modal-tab strong {
  min-width: auto;
  height: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 11px;
  font-weight: 700;
}

.modal-tab:hover {
  color: var(--primary-hover);
  background: transparent;
}

.modal-tab.active {
  gap: 8px;
  padding: 0 12px;
  color: var(--text-strong);
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.modal-tab.active strong {
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--text-strong);
  background: var(--card-bg);
}

.modal-result-title {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.modal-result-title strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-result-title span {
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 650;
}

.modal-source-actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.modal-sort-segment {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.modal-sort-segment button {
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 650;
}

.modal-sort-segment button.active,
.modal-sort-segment button:hover {
  color: var(--text-main);
  background: var(--surface-soft);
}

.modal-create-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 13px;
  font-weight: 680;
  line-height: 1;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-color) 16%, transparent);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.modal-create-btn:hover {
  transform: translateY(-1px);
  color: var(--on-primary);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.list-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-strong);
  font: inherit;
}

.list-back-btn:hover {
  color: var(--primary-color);
}

.create-skill-panel {
  margin-top: 8px;
  padding: 22px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--surface-soft);
}

.create-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.create-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 650;
}

.create-field-wide {
  grid-column: 1 / -1;
}

.create-field textarea,
.create-field select {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-main);
  background: var(--card-bg);
  font: inherit;
  font-weight: 400;
}

.create-field textarea {
  min-height: 132px;
  resize: vertical;
  padding: 12px;
  line-height: 1.55;
}

.create-field select {
  height: 40px;
  padding: 0 12px;
}

.create-field textarea:focus,
.create-field select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.create-error {
  margin: 14px 0 0;
  color: var(--danger-color, #dc2626);
  font-size: 13px;
  font-weight: 650;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.create-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.modal-frequent-section {
  margin: 6px 0 0;
}

.modal-frequent-header,
.modal-list-heading {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 12px;
}

.modal-frequent-header strong,
.modal-list-heading strong {
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-frequent-header span,
.modal-list-heading span {
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 650;
}

.modal-frequent-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.modal-frequent-item {
  position: relative;
  min-width: 0;
  min-height: 84px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 14px 120px 14px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  background: var(--surface-soft);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.modal-frequent-item:hover {
  border-color: var(--primary-border);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.modal-frequent-item.menu-open {
  z-index: 30;
}

.modal-frequent-item svg {
  color: var(--primary-color);
}

.modal-card-open-btn {
  min-width: 58px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--primary-color) 14%, transparent);
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.modal-card-open-btn {
  border-color: var(--border-color);
  color: var(--text-strong);
  background: var(--card-bg);
  box-shadow: none;
}

.modal-card-open-btn:hover {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.modal-card-open-btn svg {
  color: currentColor;
}

.modal-frequent-avatar {
  width: 38px;
  height: 38px;
  overflow: hidden;
  border-radius: 8px;
  background-color: transparent;
  background-repeat: no-repeat;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.modal-frequent-copy {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.modal-frequent-copy strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 720;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-frequent-copy span {
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 650;
  line-height: 1;
}

.skill-author-meta {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 650;
  line-height: 1.2;
}

.skill-author-avatar {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 999px;
  color: var(--on-primary);
  background: var(--primary-color);
  background-position: center;
  background-size: cover;
  font-size: 9px;
  font-weight: 800;
}

.skill-author-avatar span {
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: 1;
}

.modal-list-heading {
  margin-top: 20px;
}

.skill-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 0;
}

.empty-list {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0 0;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  color: var(--text-secondary);
  background: var(--surface-muted);
  font-size: 14px;
  font-weight: 650;
}

.managed-skill-card {
  position: relative;
  min-height: 104px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  padding: 16px 124px 16px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.managed-skill-card:hover {
  border-color: var(--primary-border);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.managed-skill-card.menu-open {
  z-index: 30;
}

.managed-skill-card.is-closed {
  background: var(--card-bg);
}

.managed-skill-card.is-closed .skill-card-avatar,
.managed-skill-card.is-closed .skill-card-copy p {
  opacity: 0.72;
}

.managed-skill-card.recommendation-card {
  padding-right: 98px;
}

.modal-card-actions {
  position: absolute;
  top: 50%;
  right: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transform: translateY(-50%);
}

.modal-card-open-btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.skill-card-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
  background-color: transparent;
  background-repeat: no-repeat;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.skill-card-copy {
  min-width: 0;
  padding-top: 1px;
}

.skill-card-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 9px;
}

.skill-card-title-row + .skill-author-meta {
  margin-bottom: 7px;
}

.managed-skill-card h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 720;
  line-height: 1.18;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-state-badge {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.skill-state-badge.closed {
  color: var(--text-muted);
  background: var(--surface-muted);
}

.managed-skill-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-more-btn {
  position: absolute;
  top: 50%;
  right: 14px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-500, var(--text-secondary));
  cursor: pointer;
  transform: translateY(-50%);
}

.modal-card-actions .card-more-btn {
  position: static;
  transform: none;
}

.card-more-btn:hover {
  background: var(--bg-soft, var(--surface-muted));
  color: var(--ink-900, var(--text-strong));
}

.add-skill-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 58px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
}

.add-skill-btn:hover {
  background: var(--primary-hover);
}

.add-skill-btn:disabled {
  color: var(--text-secondary);
  background: var(--border-color);
  cursor: default;
}

.card-action-menu {
  position: absolute;
  top: calc(50% + 22px);
  right: 14px;
  z-index: 40;
  width: 176px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
}

.card-action-menu button {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 10px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  text-align: left;
}

.card-action-menu button svg {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.card-action-menu button:hover {
  background: var(--surface-soft);
}

.publish-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-veil, rgba(15, 23, 42, 0.42));
  backdrop-filter: blur(4px);
}

.publish-dialog {
  width: min(720px, calc(100vw - 48px));
  max-height: min(720px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px;
  background: var(--bg-panel, var(--card-bg));
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.publish-dialog-header {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 24px;
  border-bottom: 1px solid var(--line, var(--border-color));
}

.publish-dialog-title-row {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.publish-dialog-title-row h2 {
  margin: 0;
  color: var(--ink-900, var(--text-strong));
  font-size: 22px;
  font-weight: 650;
  line-height: 1.2;
}

.publish-dialog-title-row span {
  min-width: 0;
  overflow: hidden;
  color: var(--ink-500, var(--text-secondary));
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-dialog-close {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--ink-700, var(--text-main));
}

.publish-dialog-close:hover {
  background: var(--bg-soft, var(--surface-soft));
}

.publish-dialog-body {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  padding: 28px;
}

.publish-dialog-section-title {
  margin-bottom: 6px;
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.4;
}

.publish-dialog-destination-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.publish-dialog-destination-card {
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 12px;
  color: var(--ink-700, var(--text-main));
  background: var(--bg-panel, var(--card-bg));
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.publish-dialog-destination-card:hover,
.publish-dialog-destination-card.active {
  border-color: var(--accent, var(--primary-border));
  background: var(--accent-tint, var(--primary-soft));
}

.publish-dialog-destination-card.active {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent, var(--primary-border)) 54%, transparent);
}

.publish-dialog-card-title {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--ink-900, var(--text-strong));
}

.publish-dialog-card-icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 6px;
  color: var(--ink-700, var(--text-strong));
  background: var(--bg-soft, var(--surface-muted));
}

.publish-dialog-destination-card.active .publish-dialog-card-icon {
  color: #fff;
  background: var(--accent, var(--primary-color));
}

.publish-dialog-card-title strong {
  color: inherit;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
}

.publish-dialog-destination-card.active .publish-dialog-card-title {
  color: var(--accent-700, var(--primary-hover));
}

.publish-dialog-destination-card p {
  margin: 0;
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
}

.publish-dialog-groups {
  display: grid;
  gap: 0;
  margin-bottom: 22px;
}

.publish-dialog-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.publish-dialog-chip {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  color: var(--ink-700, var(--text-main));
  background: var(--bg-soft, var(--surface-muted));
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
}

.publish-dialog-chip.active {
  color: #fff;
  background: var(--ink-900, var(--text-strong));
}

.publish-dialog-chip.disabled {
  opacity: 0.5;
}

.publish-dialog-team-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  padding: 14px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 14px;
  color: var(--ink-500, var(--text-secondary));
  background: var(--bg, var(--surface-soft));
}

.publish-dialog-team-card div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.publish-dialog-team-card strong {
  color: var(--ink-900, var(--text-strong));
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
}

.publish-dialog-team-card span,
.publish-dialog-market p {
  color: var(--ink-500, var(--text-secondary));
  font-size: 12px;
  line-height: 1.5;
}

.publish-dialog-market {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.publish-dialog-market-block {
  min-width: 0;
}

.publish-dialog-pricing-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.publish-dialog-price-option {
  min-height: 40px;
  padding: 10px 16px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 10px;
  color: var(--ink-700, var(--text-main));
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.publish-dialog-price-option.active {
  border-color: var(--accent, var(--primary-border));
  color: var(--accent-700, var(--primary-hover));
  background: var(--accent-tint, var(--primary-soft));
}

.publish-dialog-price-input {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--line, var(--border-color));
  border-radius: 10px;
  background: var(--bg-panel, var(--card-bg));
}

.publish-dialog-price-input span {
  color: var(--ink-500, var(--text-secondary));
  font-size: 13px;
}

.publish-dialog-price-input input {
  width: 80px;
  border: 0;
  outline: 0;
  color: var(--ink-900, var(--text-strong));
  background: transparent;
  font: inherit;
  font-size: 14px;
}

.publish-dialog-market p {
  margin: 6px 0 0;
}

.publish-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 28px;
  border-top: 1px solid var(--line, var(--border-color));
  background: var(--bg, var(--card-bg));
}

.publish-dialog-cancel,
.publish-dialog-confirm {
  min-width: 88px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
}

.publish-dialog-cancel {
  border: 1px solid var(--line, var(--border-color));
  color: var(--ink-900, var(--text-strong));
  background: var(--bg-panel, var(--card-bg));
}

.publish-dialog-confirm {
  color: #fff;
  background: var(--ink-900, var(--text-strong));
}

.menu-submenu-item {
  position: relative;
}

.submenu-trigger .submenu-chevron {
  margin-left: auto;
}

.publish-submenu {
  position: absolute;
  top: -8px;
  left: calc(100% + 8px);
  z-index: 45;
  min-width: 168px;
  display: none;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
}

.menu-submenu-item:hover .publish-submenu,
.menu-submenu-item:focus-within .publish-submenu {
  display: block;
}

.publish-submenu button {
  min-height: 36px;
}

.card-action-menu button.danger {
  color: var(--diff-removed);
}

.card-action-menu button.danger svg {
  color: var(--diff-removed);
}

.card-action-menu button.danger:hover {
  background: var(--diff-removed-soft);
}

.modal-close-btn:focus-visible,
.modal-tab:focus-visible,
.modal-create-btn:focus-visible,
.modal-frequent-item:focus-visible,
.modal-card-open-btn:focus-visible,
.list-back-btn:focus-visible,
.card-more-btn:focus-visible,
.add-skill-btn:focus-visible,
.card-action-menu button:focus-visible,
.managed-skill-card:focus-visible,
.detail-title-btn:focus-visible,
.use-skill-btn:focus-visible,
.edit-cancel-btn:focus-visible,
.edit-save-btn:focus-visible,
.detail-icon-btn:focus-visible,
.tree-heading:focus-visible,
.tree-child:focus-visible,
.tree-file:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.detail-mode > .modal-close-btn {
  top: 20px;
  right: 20px;
}

.detail-header {
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 58px 0 24px;
}

.detail-title-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-strong);
  font-size: 18px;
  font-weight: 650;
  line-height: 1;
}

.detail-title-btn:hover {
  color: var(--primary-color);
}

.back-chevron {
  transform: rotate(180deg);
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-status {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.use-skill-btn {
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 650;
}

.use-skill-btn:hover,
.detail-icon-btn:hover {
  background: var(--surface-soft);
}

.add-detail-btn {
  color: var(--on-primary);
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.add-detail-btn:hover {
  background: var(--primary-hover);
}

.edit-cancel-btn,
.edit-save-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.edit-cancel-btn {
  border: 1px solid var(--border-color);
  color: var(--text-main);
  background: var(--card-bg);
}

.edit-cancel-btn:hover {
  background: var(--surface-soft);
}

.edit-save-btn {
  color: var(--on-primary);
  background: var(--primary-color);
}

.edit-save-btn:hover {
  background: var(--primary-hover);
}

.detail-icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-strong);
}

.skill-detail-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  margin: 0 24px 24px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--card-bg);
}

.detail-tree {
  min-height: 0;
  overflow: auto;
  padding: 18px 18px 24px;
  border-right: 1px solid var(--border-color);
}

.tree-group + .tree-group {
  margin-top: 16px;
}

.tree-heading,
.tree-child,
.tree-file {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 30px;
  padding: 0 6px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1;
  text-align: left;
}

.tree-child,
.tree-file {
  width: calc(100% - 22px);
  margin-left: 22px;
  color: var(--text-secondary);
}

.tree-heading:hover,
.tree-child:hover,
.tree-file:hover {
  background: var(--bg-color);
}

.tree-file.active {
  background: var(--primary-soft);
  color: var(--primary-color);
  font-weight: 650;
}

.tree-file.root-file {
  width: 100%;
  margin: 0 0 16px;
}

.tree-file.nested {
  width: calc(100% - 38px);
  margin-left: 38px;
}

.tree-folder + .tree-folder,
.tree-folder + .tree-file,
.tree-file + .tree-folder {
  margin-top: 2px;
}

.tree-file span,
.tree-child span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-file svg,
.tree-child svg,
.tree-heading svg {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.detail-doc {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.doc-header {
  height: 54px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 0 18px;
  border-bottom: 1px solid var(--border-color);
}

.doc-path {
  min-width: 0;
  display: flex;
  align-items: center;
  flex: 1;
  height: 34px;
  padding: 0 10px;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-path-parent {
  color: var(--text-muted);
  font-weight: 500;
}

.doc-path-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doc-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0;
  color: var(--text-strong);
}

.doc-pre,
.doc-editor {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 34px 28px 46px;
  border: 0;
  outline: none;
  background: var(--card-bg);
  color: var(--text-strong);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
}

.doc-pre.file-markdown,
.doc-pre.file-template {
  font-family: inherit;
  font-size: 15px;
  line-height: 1.78;
}

.doc-editor {
  display: block;
  resize: none;
  height: 100%;
  min-height: 100%;
  border-radius: 0;
  box-shadow: inset 0 0 0 2px var(--primary-soft-strong);
}

.doc-content hr {
  height: 1px;
  margin: 0 0 34px;
  border: 0;
  background: var(--border-color);
}

.doc-content h4 {
  margin: 0 0 14px;
  font-size: 20px;
  line-height: 1.55;
  font-weight: 750;
}

.doc-content h5 {
  margin: 36px 0 16px;
  font-size: 20px;
  line-height: 1.3;
  font-weight: 750;
}

.doc-content p {
  margin: 0 0 18px;
  color: var(--text-strong);
  font-size: 16px;
  line-height: 1.65;
}

.doc-content code {
  padding: 2px 8px;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-main);
  font-family: inherit;
}

@media (max-width: 900px) {
  .skill-modal {
    min-height: auto;
    padding: 24px 22px 28px;
  }

  .modal-close-btn {
    top: 18px;
    right: 18px;
  }

  .modal-command-bar,
  .modal-source-switcher,
  .modal-result-toolbar {
    align-items: flex-start;
    flex-direction: column;
    padding-right: 40px;
  }

  .modal-result-toolbar {
    align-items: stretch;
  }

  .modal-tabs,
  .modal-search-control {
    width: 100%;
  }

  .modal-tabs {
    gap: 14px;
  }

  .modal-search-control {
    min-width: 0;
  }

  .modal-frequent-list {
    grid-template-columns: 1fr;
  }

  .skill-card-grid {
    grid-template-columns: 1fr;
  }

  .skill-modal.detail-mode {
    width: calc(100vw - 32px);
    height: calc(100vh - 32px);
  }

  .skill-detail-shell {
    grid-template-columns: 180px minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .skill-modal-backdrop {
    padding: 12px;
  }

  .skill-modal {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    border-radius: 18px;
  }

  .modal-command-bar,
  .modal-source-switcher,
  .modal-result-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .modal-tab,
  .modal-create-btn {
    min-height: 38px;
    font-size: 14px;
  }

  .managed-skill-card {
    min-height: 108px;
    padding: 18px 116px 18px 18px;
  }

  .managed-skill-card h3 {
    margin-bottom: 14px;
    font-size: 16px;
  }

  .managed-skill-card p {
    font-size: 13.5px;
  }

  .skill-modal.detail-mode {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
  }

  .detail-header {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
    padding: 24px 58px 16px 18px;
  }

  .skill-detail-shell {
    flex: 1 1 auto;
    min-height: 0;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    margin: 0 16px 18px;
  }

  .detail-tree {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  .doc-content {
    padding: 0;
  }

  .doc-pre,
  .doc-editor {
    padding: 24px 18px 34px;
  }

  .doc-content h4,
  .doc-content h5 {
    font-size: 17px;
  }

  .doc-content p {
    font-size: 14px;
  }
}

/* Keep the composer popup visually aligned with the independent skills page.
   These overrides sit last so the existing detail editor remains unchanged. */
.skill-modal {
  --skill-page-bg: var(--bg, var(--bg-color));
  --skill-panel: var(--bg-panel, var(--card-bg));
  --skill-paper: var(--bg-soft, var(--surface-muted));
  --skill-ink: var(--ink-900, var(--text-strong));
  --skill-ink-soft: var(--ink-700, var(--text-main));
  --skill-muted: var(--ink-500, var(--text-secondary));
  --skill-faint: var(--ink-400, var(--text-muted));
  --skill-line: var(--line, var(--border-color));
  --skill-line-strong: var(--line-strong, var(--primary-border));
  --skill-accent: var(--accent, var(--primary-color));
  --skill-accent-strong: var(--accent-700, var(--primary-hover));
  --skill-accent-soft: var(--accent-tint, var(--primary-soft));
  --skill-radius-md: var(--r-md, 10px);
  --skill-radius-lg: var(--r-lg, 14px);
  --skill-shadow-card: var(--sh-2, var(--shadow-card));
  --skill-shadow-popover: var(--sh-elev, var(--shadow-popover));
  font-family: var(--font-sans, 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif);
}

.skill-modal:not(.detail-mode) {
  width: min(900px, calc(100vw - 48px));
  min-height: 0;
  max-height: calc(100vh - 56px);
  padding: 22px 26px 24px;
  border-radius: var(--skill-radius-lg);
  background: var(--skill-page-bg);
  color: var(--skill-ink-soft);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}

.skill-modal:not(.detail-mode) .modal-close-btn {
  top: 18px;
  right: 18px;
  width: 30px;
  height: 30px;
  color: var(--skill-ink);
}

.skill-modal:not(.detail-mode) .modal-close-btn:hover {
  background: var(--skill-paper);
}

.skill-modal:not(.detail-mode) .modal-title-row {
  min-height: 0;
  padding-right: 44px;
  margin-bottom: 12px;
}

.skill-modal:not(.detail-mode) .modal-title-row h2 {
  margin: 0;
  color: var(--skill-ink);
  font-family: var(--font-serif, 'Songti SC', 'STSong', 'SimSun', Georgia, serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.32;
  letter-spacing: 0;
}

.skill-modal:not(.detail-mode) .modal-command-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  margin-bottom: 12px;
  padding-right: 0;
}

.skill-modal:not(.detail-mode) .modal-search-control.market-search {
  flex: 1 1 640px;
  height: 38px;
  max-width: none;
  padding: 0 12px;
  border: 1px solid var(--skill-line);
  border-radius: var(--skill-radius-md);
  background: var(--skill-panel);
  color: var(--skill-faint);
  box-shadow: none;
}

.skill-modal:not(.detail-mode) .modal-search-control.market-search:focus-within {
  border-color: var(--skill-line-strong);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--skill-accent) 10%, transparent);
}

.skill-modal:not(.detail-mode) .modal-search-control.market-search input {
  color: var(--skill-ink);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
}

.skill-modal:not(.detail-mode) .modal-create-btn {
  height: 38px;
  min-width: 104px;
  padding: 0 14px;
  border: 1px solid var(--skill-ink);
  border-radius: var(--skill-radius-md);
  background: var(--skill-ink);
  color: var(--on-primary);
  box-shadow: none;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0;
}

.skill-modal:not(.detail-mode) .modal-create-btn:hover {
  border-color: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
  background: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
  box-shadow: var(--skill-shadow-card);
}

.skill-modal:not(.detail-mode) .modal-source-switcher {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding-right: 0;
}

.skill-modal:not(.detail-mode) .modal-tabs {
  gap: 8px;
  flex-wrap: wrap;
  overflow: visible;
}

.skill-modal:not(.detail-mode) .modal-tab {
  height: 30px;
  padding: 5px 12px;
  border: 1px solid transparent;
  border-radius: var(--skill-radius-md);
  background: transparent;
  color: var(--skill-ink-soft);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
}

.skill-modal:not(.detail-mode) .modal-tab:hover {
  background: var(--skill-paper);
  color: var(--skill-ink);
}

.skill-modal:not(.detail-mode) .modal-tab.active {
  border-color: color-mix(in srgb, var(--skill-accent) 15%, var(--skill-line));
  background: var(--skill-accent-soft);
  color: var(--skill-accent-strong);
  box-shadow: none;
}

.modal-status-filter-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  flex-wrap: wrap;
}

.status-filter-btn {
  height: 28px;
  padding: 4px 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--skill-ink-soft);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}

.status-filter-btn:hover {
  background: var(--skill-paper);
  color: var(--skill-ink);
}

.status-filter-btn.active {
  background: var(--skill-ink);
  color: var(--on-primary);
}

.modal-recommended-sort-row {
  display: flex;
  align-items: center;
  min-height: 30px;
}

.modal-recommended-sort-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: var(--skill-paper);
}

.modal-recommended-sort-tab {
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--skill-muted);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
}

.modal-recommended-sort-tab:hover {
  color: var(--skill-ink);
}

.modal-recommended-sort-tab[data-active='true'] {
  background: var(--skill-panel);
  color: var(--skill-ink);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--skill-ink) 6%, transparent);
}

.skill-modal:not(.detail-mode) .modal-status {
  margin: -4px 0 12px;
  color: var(--skill-accent-strong);
  font-size: 12px;
  font-weight: 500;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
}

.managed-card {
  position: relative;
  min-width: 0;
  min-height: 184px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--skill-line);
  border-radius: var(--skill-radius-lg);
  background: var(--skill-panel);
  color: var(--skill-ink-soft);
  cursor: pointer;
  box-shadow: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.managed-card:hover {
  border-color: var(--skill-line-strong);
  box-shadow: var(--skill-shadow-card);
  transform: translateY(-1px);
}

.managed-card.is-closed {
  background: var(--skill-panel);
}

.managed-card:focus {
  outline: none;
}

.managed-card.menu-open {
  z-index: 40;
}

.card-main-row {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  min-width: 0;
}

.card-avatar,
.card-avatar.tone-neutral,
.card-avatar[class*='tone-'] {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--skill-radius-lg);
  background: var(--skill-paper);
  color: var(--skill-ink-soft);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.card-avatar svg {
  width: 25px;
  height: 25px;
}

.card-copy {
  min-width: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.card-title-row h3 {
  min-width: 0;
  margin: 0;
  color: var(--skill-ink);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

.skill-state-badge {
  display: inline-flex;
  align-items: center;
  height: auto;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--skill-accent-soft);
  color: var(--skill-accent-strong);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0;
}

.skill-state-badge.inactive {
  background: var(--skill-paper);
  color: var(--skill-muted);
}

.card-copy p {
  display: -webkit-box;
  margin: 3px 0 0;
  overflow: hidden;
  color: var(--skill-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.42;
  letter-spacing: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.skill-author-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin-top: 5px;
  color: var(--skill-faint);
  font-size: 11.5px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0;
}

.skill-author-line strong {
  color: var(--skill-ink);
  font-weight: 500;
}

.skill-author-avatar {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 999px;
  background-color: var(--skill-ink);
  background-position: center;
  background-size: cover;
  color: var(--on-primary);
  font-size: 9px;
  font-weight: 700;
}

.file-chip-row {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  margin-top: 0;
}

.file-chip {
  min-width: 0;
  max-width: 100%;
  height: 23px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px 3px 5px;
  border: 1px solid var(--skill-line);
  border-radius: 6px;
  background: var(--skill-paper);
  color: var(--skill-ink-soft);
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
}

.file-chip strong {
  padding: 1px 4px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--skill-panel) 72%, var(--skill-paper));
  color: var(--primary-hover);
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
}

.file-chip span {
  max-width: 118px;
  overflow: hidden;
  color: var(--skill-ink-soft);
  text-overflow: ellipsis;
}

.file-chip.file-xlsx strong,
.file-chip.file-json strong,
.file-chip.file-yaml strong,
.file-chip.file-yml strong {
  color: color-mix(in srgb, var(--diff-added) 82%, var(--skill-ink));
}

.card-footer {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 0;
  padding-top: 8px;
  border-top: 1px solid var(--skill-line);
}

.source-badge,
.source-personal,
.source-group-shared,
.source-team-shared,
.source-recommended,
.source-public-hub,
.source-mine,
.source-group,
.source-team,
.source-official,
.source-market {
  min-width: 0;
  height: 22px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--skill-paper);
  color: var(--skill-ink-soft);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
}

.card-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.card-use-btn,
.card-open-btn,
.add-btn {
  min-width: 54px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 14px;
  border: 1px solid var(--skill-ink);
  border-radius: 8px;
  background: var(--skill-ink);
  color: var(--on-primary);
  box-shadow: none;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}

.card-use-btn:hover,
.card-open-btn:hover,
.add-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
  background: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
}

.card-use-btn:disabled {
  border-color: var(--skill-line);
  background: var(--skill-paper);
  color: var(--skill-muted);
  cursor: default;
}

.card-more-btn {
  position: static;
  top: auto;
  right: auto;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--skill-muted);
  cursor: pointer;
  transform: none;
}

.card-more-btn:hover {
  background: var(--skill-paper);
  color: var(--skill-ink);
}

.card-action-menu {
  top: auto;
  right: 14px;
  bottom: 48px;
  width: 164px;
  min-width: 164px;
  box-sizing: border-box;
  padding: 6px;
  border: 1px solid var(--skill-line);
  border-radius: var(--skill-radius-md);
  background: var(--skill-panel);
  box-shadow: var(--skill-shadow-popover);
  overflow: visible;
}

.menu-action,
.publish-submenu button {
  width: 100%;
  min-height: 32px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--skill-ink);
  font-size: 12.5px;
  font-weight: 400;
  letter-spacing: 0;
}

.menu-action:hover,
.publish-submenu button:hover {
  background: var(--skill-paper);
}

.menu-action svg,
.publish-submenu button svg {
  flex: 0 0 auto;
  color: var(--skill-muted);
}

.menu-action.danger {
  margin-top: 6px;
  background: color-mix(in srgb, var(--diff-removed) 7%, var(--skill-paper));
  color: var(--diff-removed);
}

.menu-action.danger svg {
  color: currentColor;
}

.menu-action.danger:hover {
  background: color-mix(in srgb, var(--diff-removed) 11%, var(--skill-paper));
  color: var(--diff-removed);
}

.publish-submenu {
  border-color: var(--skill-line);
  border-radius: var(--skill-radius-md);
  background: var(--skill-panel);
  box-shadow: var(--skill-shadow-popover);
}

.empty-list {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  padding: 28px;
  border: 1px dashed var(--skill-line);
  border-radius: var(--skill-radius-lg);
  background: var(--skill-panel);
  color: var(--skill-muted);
  text-align: center;
}

.empty-list h3 {
  margin: 0;
  color: var(--skill-ink);
  font-size: 16px;
  font-weight: 600;
}

.empty-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--skill-accent);
  background: var(--skill-accent-soft);
}

.empty-list button {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--skill-ink);
  font-size: 12.5px;
  font-weight: 500;
}

.modal-tab:focus-visible,
.status-filter-btn:focus-visible,
.modal-recommended-sort-tab:focus-visible,
.modal-search-control.market-search:focus-within,
.modal-create-btn:focus-visible,
.card-use-btn:focus-visible,
.card-more-btn:focus-visible,
.card-action-menu button:focus-visible,
.empty-list button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--skill-accent) 72%, transparent);
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .skill-modal:not(.detail-mode) {
    width: calc(100vw - 32px);
    padding: 22px 20px 24px;
  }

  .skill-modal:not(.detail-mode) .modal-command-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .skill-modal:not(.detail-mode) .modal-create-btn {
    width: 100%;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .skill-modal:not(.detail-mode) {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    padding: 20px 16px 22px;
    border-radius: 18px;
  }

  .skill-modal:not(.detail-mode) .modal-title-row h2 {
    font-size: 21px;
  }

  .card-main-row {
    grid-template-columns: 48px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
  }

  .card-avatar,
  .card-avatar.tone-neutral,
  .card-avatar[class*='tone-'] {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .card-footer {
    align-items: center;
    flex-direction: row;
  }
}
</style>
