<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
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
import { useOrgSession } from '../stores/orgSession';
import SkillCreateModal from './SkillCreateModal.vue';
import SkillDetailPanel from './SkillDetailPanel.vue';
import { useToast } from '../stores/toast';

type SkillMode = 'personal' | 'group-shared' | 'team-shared' | 'official' | 'market' | 'public-hub' | 'recommended';
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

const skillMode = ref<SkillMode>('personal');
const searchKeyword = ref('');
const selectedStatusFilter = ref<SkillStatusFilter>('all');
const selectedRecommendedSort = ref<RecommendedSortFilter>('popular');
const openCardMenuId = ref<string | null>(null);
const selectedSkill = ref<SkillCatalogItem | null>(null);
const showSkillCreateModal = ref(false);
const detailStartEditKey = ref('');
const route = useRoute();
const router = useRouter();
const { showToast } = useToast();
const { currentUser, currentOrganization } = useOrgSession();

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

const sourceModeCopy: Record<SkillMode, {
  name: string;
  emptyTitle: string;
  emptyDescription: string;
}> = {
  personal: {
    name: '个人',
    emptyTitle: '暂无个人技能',
    emptyDescription: '可以从官方、市场或共享资源中订阅，也可以直接创建一个新技能。',
  },
  'group-shared': {
    name: '小组',
    emptyTitle: '暂无小组共享技能',
    emptyDescription: '小组成员发布后，会出现在这里供组内订阅使用。',
  },
  'team-shared': {
    name: '团队',
    emptyTitle: '暂无团队共享技能',
    emptyDescription: '发布到团队的技能会在这里展示，团队成员可以订阅到自己的技能库。',
  },
  official: {
    name: '官方',
    emptyTitle: '暂无官方技能',
    emptyDescription: '官方维护的技能会展示在这里。',
  },
  market: {
    name: '市场',
    emptyTitle: '暂无市场技能',
    emptyDescription: '公开发布后的技能会进入市场，所有使用者都可以发现和订阅。',
  },
  'public-hub': {
    name: '市场',
    emptyTitle: '暂无市场技能',
    emptyDescription: '公开发布后的技能会进入市场，所有使用者都可以发现和订阅。',
  },
  recommended: {
    name: '官方',
    emptyTitle: '暂无官方技能',
    emptyDescription: '官方维护的技能会展示在这里。',
  },
};

const sortSkillsForLibrary = (skills: SkillCatalogItem[]) =>
  [...skills].sort((left, right) => {
    const leftIsUtility = utilitySkillIds.has(left.id);
    const rightIsUtility = utilitySkillIds.has(right.id);
    if (leftIsUtility === rightIsUtility) return 0;
    return leftIsUtility ? 1 : -1;
  });

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

const marketSkills = computed(() =>
  dedupeSkillsById([
    ...standaloneSourceSkillPool.value.filter((skill) => getStandalonePresentation(skill)?.source === 'market'),
    ...catalogPublicHubSkills.value.filter((skill) => skill.source !== 'recommended'),
  ]),
);

const activeSkills = computed(() =>
  sortSkillsForLibrary(
    {
      personal: personalSkills.value,
      'group-shared': catalogGroupSharedSkills.value,
      'team-shared': teamSharedSkills.value,
      official: officialSkills.value,
      market: marketSkills.value,
      'public-hub': marketSkills.value,
      recommended: officialSkills.value,
    }[skillMode.value],
  ),
);

const sourceTabs = computed(() => [
  { key: 'personal' as const, name: sourceModeCopy.personal.name, count: personalSkills.value.length },
  { key: 'group-shared' as const, name: sourceModeCopy['group-shared'].name, count: catalogGroupSharedSkills.value.length },
  { key: 'team-shared' as const, name: sourceModeCopy['team-shared'].name, count: teamSharedSkills.value.length },
  { key: 'official' as const, name: sourceModeCopy.official.name, count: officialSkills.value.length },
  { key: 'market' as const, name: sourceModeCopy.market.name, count: marketSkills.value.length },
]);

const activeModeCopy = computed(() => sourceModeCopy[skillMode.value]);
const isPersonalMode = computed(() => skillMode.value === 'personal');

const getSkillStatusKind = (skill: SkillCatalogItem): Exclude<SkillStatusFilter, 'all'> =>
  isSkillDisplayEnabled(skill) ? 'enabled' : 'inactive';

const statusFilterOptions = computed(() => {
  const counts = activeSkills.value.reduce<Record<Exclude<SkillStatusFilter, 'all'>, number>>(
    (nextCounts, skill) => {
      nextCounts[getSkillStatusKind(skill)] += 1;
      return nextCounts;
    },
    { inactive: 0, enabled: 0 },
  );

  return [
    { key: 'all' as const, label: '全部', count: activeSkills.value.length },
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

const visibleSkills = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  const filteredSkills = activeSkills.value.filter((skill) => {
    const matchesStatus =
      !isPersonalMode.value ||
      selectedStatusFilter.value === 'all' ||
      getSkillStatusKind(skill) === selectedStatusFilter.value;
    const presentation = getStandalonePresentation(skill);
    const searchable = [
      getSkillSearchText(skill),
      presentation?.title ?? '',
      presentation?.description ?? '',
      ...(presentation?.deliverables.map((deliverable) => deliverable.name) ?? []),
    ].join(' ').toLowerCase();

    return matchesStatus && (!keyword || searchable.includes(keyword));
  });

  const collapsedSkills = collapseStandaloneDuplicates(filteredSkills);
  if (skillMode.value === 'official' || skillMode.value === 'market' || skillMode.value === 'recommended' || skillMode.value === 'public-hub') {
    return sortRecommendedSkills(collapsedSkills);
  }
  return sortSkillsForDisplay(collapsedSkills);
});

const isDetailOpen = computed(() => Boolean(selectedSkill.value));

const getUsedAtTime = (skill: SkillCatalogItem) => {
  if (!skill.lastUsedAt) return 0;
  const time = Date.parse(skill.lastUsedAt);
  return Number.isNaN(time) ? 0 : time;
};

const mostUsedPersonalSkills = computed(() => {
  const activePersonalSkills = personalSkills.value.filter(isSkillEnabled);
  const originalIndex = new Map(activePersonalSkills.map((skill, index) => [skill.id, index]));
  return [...activePersonalSkills]
    .sort((left, right) => {
      const usageDelta = (right.usageCount ?? 0) - (left.usageCount ?? 0);
      if (usageDelta) return usageDelta;

      const timeDelta = getUsedAtTime(right) - getUsedAtTime(left);
      if (timeDelta) return timeDelta;

      return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
    })
    .slice(0, 4);
});

const getSkillUsageMeta = (skill: SkillCatalogItem) =>
  isSkillEnabled(skill)
    ? skill.usageCount && skill.usageCount > 0 ? `${skill.usageCount} 次使用` : '可直接调用'
    : '已停用，启用后可调用';

const clearDetail = () => {
  selectedSkill.value = null;
};

const setSkillMode = (mode: SkillMode) => {
  skillMode.value = mode;
  selectedStatusFilter.value = 'all';
  openCardMenuId.value = null;
  clearDetail();
};

const selectSkill = (skill: SkillCatalogItem) => {
  if (!isSkillEnabled(skill)) {
    showToast(`${skill.name} 已停用，请先启用后再使用`, { tone: 'warning' });
    return;
  }

  openCardMenuId.value = null;
  markSkillUsed(skill.id);
  showToast(`${skill.name} 已选择`);
  void router.push({
    name: 'home',
    query: {
      composerAction: 'use-skill',
      skillName: skill.name,
      composerTick: Date.now().toString(),
    },
  });
};

const isSubscriptionMode = computed(() => skillMode.value !== 'personal');

const shouldBlockSkillDetail = (skill: SkillCatalogItem) =>
  isSubscriptionMode.value && !isSkillAdded(skill);

const openSkill = (skill: SkillCatalogItem) => {
  if (shouldBlockSkillDetail(skill)) {
    showToast(`请先订阅「${getSkillDisplayName(skill)}」后查看或使用`, { tone: 'warning' });
    return;
  }
  selectedSkill.value = skill;
  openCardMenuId.value = null;
};

const backToList = () => {
  clearDetail();
  openCardMenuId.value = null;
};

const triggerCreateSkill = () => {
  openCardMenuId.value = null;
  clearDetail();
  showSkillCreateModal.value = true;
};

const handleSkillCreated = (skill: SkillCatalogItem) => {
  showSkillCreateModal.value = false;
  skillMode.value = skill.scope === 'team' ? 'team-shared' : 'personal';
  selectedStatusFilter.value = 'all';
  selectedSkill.value = skill;
  openCardMenuId.value = null;
  showToast(`${skill.name} 已创建`);
};

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addPersonalSkill(skill.id);
  showToast(didAdd ? `${getSkillDisplayName(skill)} 已订阅到我的技能` : `${getSkillDisplayName(skill)} 已在我的技能中`);
};

const subscribeSharedSkill = (skill: SkillCatalogItem) => {
  addSkill(skill);
};

const handlePrimarySkillAction = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'personal' || isSkillAdded(skill)) {
    selectSkill(skill);
    return;
  }

  subscribeSharedSkill(skill);
};

const handlePersonalSkillAction = (skill: SkillCatalogItem) => {
  if (isSkillEnabled(skill)) {
    selectSkill(skill);
    return;
  }

  setSkillOpen(skill, true);
};

const getPrimarySkillActionLabel = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'personal') return isSkillDisplayEnabled(skill) ? '使用' : '启用';
  if (isSkillAdded(skill)) return '使用';
  return '订阅';
};

const isPrimarySkillActionDisabled = (_skill: SkillCatalogItem) => false;

const setSkillOpen = (skill: SkillCatalogItem, enabled: boolean) => {
  const updatedSkill = setSkillEnabled(skill.id, enabled);
  if (selectedSkill.value?.id === skill.id && updatedSkill) {
    selectedSkill.value = updatedSkill;
  }
  openCardMenuId.value = null;
  showToast(`${skill.name} 已${enabled ? '启用' : '停用'}`);
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
    showToast('请选择至少一个小组', { tone: 'warning' });
    return;
  }
  if (publishDialogDestination.value === 'public' && publishDialogPricing.value === 'paid' && !publishDialogPrice.value) {
    showToast('请填写市场定价', { tone: 'warning' });
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
  showToast(didPublish ? `${skill.name} 已发布到${label}` : `${skill.name} 已在${label}中`);
};

const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`${filename} 已下载`);
};

const createSkillBundleContent = (skill: SkillCatalogItem) =>
  skill.files.map((file) => `# ${file.path}\n\n${file.content}`).join('\n\n---\n\n');

const downloadSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  downloadText(`${skill.name}-skill-bundle.md`, createSkillBundleContent(skill));
};

const editSkill = (skill: SkillCatalogItem) => {
  openSkill(skill);
  detailStartEditKey.value = `${skill.id}:${Date.now()}`;
};

const deleteSkill = (skill: SkillCatalogItem) => {
  const didRemove = removePersonalSkill(skill.id);
  openCardMenuId.value = null;
  showToast(didRemove ? `${skill.name} 已删除` : '默认技能不可删除', {
    tone: didRemove ? 'success' : 'warning',
  });
};

const useSkillFromDetail = (skillName?: string) => {
  const skill = selectedSkill.value;
  if (!skill) return;
  if (!isSkillEnabled(skill)) {
    showToast(`${skill.name} 已停用，请先启用后再使用`, { tone: 'warning' });
    return;
  }

  showToast(`${skillName ?? skill.name} 已选择`);
  markSkillUsed(skill.id);

  void router.push({
    name: 'home',
    query: {
      composerAction: 'use-skill',
      skillName: skill.name,
      composerTick: Date.now().toString(),
    },
  });
};

const handleSkillUpdated = (skill: SkillCatalogItem) => {
  selectedSkill.value = skill;
};

const isSkillAdded = (skill: SkillCatalogItem) => isSkillAvailable(skill.id);

const shouldShowSkillAuthor = (skill: SkillCatalogItem) =>
  Boolean(getStandalonePresentation(skill)) || resolveShouldShowSkillAuthor(skill, currentUser.value);

const getSkillDisplayName = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.title ?? skill.name;

const getSkillDisplayDescription = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.description ?? skill.description;

const getSkillAuthorName = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.creator ?? resolveSkillAuthorName(skill, currentUser.value);

const getSkillAuthorAvatarText = (skill: SkillCatalogItem) =>
  getStandalonePresentation(skill)?.creator.slice(0, 1) ?? resolveSkillAuthorAvatarText(skill, currentUser.value);

const hasSkillDisplayAuthorAvatarImage = (skill: SkillCatalogItem) =>
  !getStandalonePresentation(skill) && hasSkillAuthorAvatarImage(skill, currentUser.value);

const getSkillAuthorAvatarStyle = (skill: SkillCatalogItem) => {
  if (getStandalonePresentation(skill)) {
    return {
      background: 'var(--skill-ink)',
      color: 'var(--on-primary)',
    };
  }

  return resolveSkillAuthorAvatarStyle(skill, currentUser.value);
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

const getStableIndex = (value: string, total: number) => {
  if (!total) return 0;
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % total;
};

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

const getSkillSourceLabel = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'official') return '来自 官方';
  if (skillMode.value === 'market' || skillMode.value === 'public-hub') return '来自 市场';
  if (skillMode.value === 'recommended') return '来自 官方';

  const presentation = getStandalonePresentation(skill);
  if (presentation) return `来自 ${standaloneSourceLabels[presentation.source]}`;

  if (skillMode.value === 'personal') return '来自 个人';
  if (skillMode.value === 'group-shared') return '来自 小组';
  if (skillMode.value === 'team-shared') return '来自 团队';
  if (skill.source === 'recommended') return '来自 官方';
  return '来自 官方';
};

const getSkillSourceClass = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'official' || skillMode.value === 'recommended') return 'source-official';
  if (skillMode.value === 'market' || skillMode.value === 'public-hub') return 'source-market';

  const presentation = getStandalonePresentation(skill);
  if (presentation?.source === 'mine') return 'source-personal';
  if (presentation?.source === 'group') return 'source-group-shared';
  if (presentation?.source === 'team') return 'source-team-shared';
  if (presentation?.source === 'official') return 'source-official';
  if (presentation?.source === 'market') return 'source-market';
  return `source-${skillMode.value}`;
};

const getSkillSourceIcon = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'official' || skillMode.value === 'recommended') return ShieldCheck;
  if (skillMode.value === 'market' || skillMode.value === 'public-hub') return Store;

  const source = getStandalonePresentation(skill)?.source;
  if (source === 'mine' || (!source && skillMode.value === 'personal')) return UserRound;
  if (source === 'official' || source === 'market') return ShieldCheck;
  if (source === 'team' || (!source && skillMode.value === 'team-shared')) return Landmark;
  return UsersRound;
};

const getSkillAuthorFirm = (skill: SkillCatalogItem) => {
  const presentation = getStandalonePresentation(skill);
  if (presentation) return presentation.firm;

  if (skill.source === 'custom' && skill.scope !== 'team') {
    return currentUser.value?.firmShortName || currentOrganization.value?.shortName || '个人工作区';
  }

  if (skillMode.value === 'official' || skillMode.value === 'recommended' || skill.source === 'recommended') {
    return '涌见官方';
  }

  if (skillMode.value === 'market' || skillMode.value === 'public-hub') {
    return '技能市场';
  }

  return firmOptions[getStableIndex(`${skill.id}:${skill.category}:firm`, firmOptions.length)] ?? '涌见律所';
};

const getSkillStateLabel = (skill: SkillCatalogItem) => {
  const statusKind = getSkillStatusKind(skill);
  if (statusKind === 'enabled') return '已启用';
  return '未启用';
};

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

const toggleCardMenu = (id: string) => {
  openCardMenuId.value = openCardMenuId.value === id ? null : id;
};

const closeCardMenuOnOutsideClick = (event: MouseEvent) => {
  if (!openCardMenuId.value) return;
  const target = event.target;
  if (target instanceof Element && target.closest('.card-action-menu, .card-more-btn')) return;
  openCardMenuId.value = null;
};

const normalizeSkillMode = (value: unknown): SkillMode | null => {
  if (value === 'team-market') return 'team-shared';
  if (value === 'public-hub') return 'market';
  if (value === 'recommended') return 'official';
  if (value === 'official' || value === 'market') return value;
  if (
    value === 'personal' ||
    value === 'group-shared' ||
    value === 'team-shared'
  ) return value;
  return null;
};

const findSkillForRoute = (skillId: string) =>
  [
    ...personalSkills.value,
    ...catalogGroupSharedSkills.value,
    ...teamSharedSkills.value,
    ...catalogPublicHubSkills.value,
    ...officialRecommendedSkills,
  ].find((skill) => skill.id === skillId) ?? null;

const openRouteSkill = () => {
  const routeSkillMode = normalizeSkillMode(route.query.skillMode);
  if (routeSkillMode) {
    skillMode.value = routeSkillMode;
  }

  const skillId = typeof route.query.skillId === 'string' ? route.query.skillId : '';
  if (!skillId) return;

  if (routeSkillMode === 'official' || routeSkillMode === 'market' || routeSkillMode === 'recommended' || routeSkillMode === 'public-hub') {
    clearDetail();
    openCardMenuId.value = null;
    return;
  }

  const skill = findSkillForRoute(skillId);
  if (!skill) return;

  selectedSkill.value = skill;
  openCardMenuId.value = null;

  if (route.query.edit === '1') {
    detailStartEditKey.value = `${skill.id}:${String(route.query.skillTick ?? Date.now())}`;
  }
};

onMounted(() => {
  document.addEventListener('click', closeCardMenuOnOutsideClick);
});

watch(
  () => [
    route.query.skillId,
    route.query.skillMode,
    route.query.edit,
    route.query.skillTick,
    personalSkills.value.length,
    catalogGroupSharedSkills.value.length,
    teamSharedSkills.value.length,
    catalogPublicHubSkills.value.length,
  ],
  openRouteSkill,
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener('click', closeCardMenuOnOutsideClick);
});
</script>

<template>
  <div class="skill-template-view" :class="{ 'detail-view': isDetailOpen }">
    <main class="library-shell" :class="{ 'detail-shell': isDetailOpen }">
      <template v-if="!selectedSkill">
        <section class="market-hero" aria-labelledby="skill-market-title">
          <h1 id="skill-market-title">沉淀律师的经验技能，让 AI 像你一样工作</h1>

          <div class="market-command-row">
            <label class="search-control market-search">
              <Search :size="17" />
              <input v-model="searchKeyword" type="text" placeholder="搜索技能、描述、标签" />
            </label>

            <button class="create-skill-btn" type="button" @click="triggerCreateSkill">
              <Plus :size="16" />
              <span>创建技能</span>
            </button>
          </div>

          <div class="market-filter-stack">
            <nav class="source-tabs" aria-label="技能来源">
              <button
                v-for="tab in sourceTabs"
                :key="tab.key"
                class="source-tab"
                :class="{ active: skillMode === tab.key }"
                type="button"
                @click="setSkillMode(tab.key)"
              >
                <span>{{ tab.name }}</span>
              </button>
            </nav>

            <div v-if="isPersonalMode" class="status-filter-row">
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

            <div v-else-if="skillMode === 'official' || skillMode === 'market'" class="recommended-sort-row">
              <nav class="recommended-sort-tabs" aria-label="技能排序">
                <button
                  v-for="option in recommendedSortOptions"
                  :key="option.key"
                  class="recommended-sort-tab"
                  :data-active="selectedRecommendedSort === option.key"
                  type="button"
                  @click="selectedRecommendedSort = option.key"
                >
                  {{ option.label }}
                </button>
              </nav>
            </div>
          </div>
        </section>
      </template>

      <section class="content-section" :class="{ 'detail-content-section': isDetailOpen }" aria-label="技能库管理">
        <template v-if="!selectedSkill">
          <div v-if="visibleSkills.length" class="card-grid">
            <article
              v-for="skill in visibleSkills"
              :key="skill.id"
              class="managed-card"
              :class="{
                'recommend-card': skillMode !== 'personal',
                'preview-disabled': shouldBlockSkillDetail(skill),
                'is-closed': skillMode === 'personal' && !isSkillEnabled(skill),
                'menu-open': openCardMenuId === `skill-${skill.id}`
              }"
              :tabindex="shouldBlockSkillDetail(skill) ? undefined : 0"
              @click="openSkill(skill)"
              @keydown.enter.prevent="openSkill(skill)"
            >
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
                  <span v-if="shouldShowSkillAuthor(skill)" class="skill-author-line">
                    <span class="skill-author-avatar" :style="getSkillAuthorAvatarStyle(skill)">
                      <span v-if="!hasSkillDisplayAuthorAvatarImage(skill)">{{ getSkillAuthorAvatarText(skill) }}</span>
                    </span>
                    <strong>{{ getSkillAuthorName(skill) }}</strong>
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
                    v-if="skillMode === 'personal' && isSkillDisplayEnabled(skill)"
                    class="card-use-btn"
                    type="button"
                    :aria-label="`使用${getSkillDisplayName(skill)}`"
                    @click.stop="handlePersonalSkillAction(skill)"
                  >
                    <span>使用</span>
                  </button>
                  <button
                    v-else-if="skillMode === 'personal'"
                    class="card-open-btn"
                    type="button"
                    :aria-label="`启用${getSkillDisplayName(skill)}`"
                    @click.stop="setSkillOpen(skill, true)"
                  >
                    <span>启用</span>
                  </button>
                  <button
                    v-else
                    class="add-btn"
                    type="button"
                    :disabled="isPrimarySkillActionDisabled(skill)"
                    @click.stop="handlePrimarySkillAction(skill)"
                  >
                    <Check v-if="isPrimarySkillActionDisabled(skill)" :size="14" />
                    <Plus v-else-if="getPrimarySkillActionLabel(skill) === '订阅'" :size="14" />
                    <span>{{ getPrimarySkillActionLabel(skill) }}</span>
                  </button>
                  <button
                    v-if="skillMode === 'personal'"
                    class="card-more-btn"
                    type="button"
                    :aria-label="`${getSkillDisplayName(skill)} 更多操作`"
                    :aria-expanded="openCardMenuId === `skill-${skill.id}`"
                    @click.stop="toggleCardMenu(`skill-${skill.id}`)"
                  >
                    <MoreHorizontal :size="18" />
                  </button>

                  <div v-if="openCardMenuId === `skill-${skill.id}`" class="card-action-menu" @click.stop>
                    <button
                      class="menu-action"
                      type="button"
                      @click="editSkill(skill)"
                    >
                      <Pencil :size="14" />
                      <span>编辑</span>
                    </button>
                    <button class="menu-action" type="button" @click="downloadSkill(skill)">
                      <Download :size="14" />
                      <span>下载</span>
                    </button>
                    <button class="menu-action" type="button" @click="setSkillOpen(skill, !isSkillEnabled(skill))">
                      <Power v-if="!isSkillEnabled(skill)" :size="14" />
                      <PowerOff v-else :size="14" />
                      <span>{{ isSkillEnabled(skill) ? '停用' : '启用' }}</span>
                    </button>
                    <button class="menu-action" type="button" @click="openPublishDialog(skill)">
                      <UsersRound :size="14" />
                      <span>发布</span>
                    </button>
                    <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
                      <Trash2 :size="14" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              </footer>
            </article>
          </div>

          <div v-else class="empty-state">
            <span class="empty-icon" aria-hidden="true">
              <Puzzle :size="22" />
            </span>
            <h3>{{ activeModeCopy.emptyTitle }}</h3>
            <p>{{ activeModeCopy.emptyDescription }}</p>
            <button type="button" @click="triggerCreateSkill">
              <Plus :size="16" />
              <span>创建技能</span>
            </button>
          </div>
        </template>

        <SkillDetailPanel
          v-else-if="selectedSkill"
          class="library-detail-panel"
          :skill="selectedSkill"
          layout="page"
          :start-edit-key="detailStartEditKey"
          @back="backToList"
          @use="useSkillFromDetail"
          @updated="handleSkillUpdated"
        />
      </section>

    </main>

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

    <SkillCreateModal
      v-if="showSkillCreateModal"
      @close="showSkillCreateModal = false"
      @created="handleSkillCreated"
    />
  </div>
</template>

<style scoped>
.skill-template-view {
  flex: 1;
  min-height: 100%;
  overflow: visible;
  padding: 22px 32px 48px;
  background: var(--bg-color);
}

.skill-template-view.detail-view {
  height: 100%;
  overflow: hidden;
  padding-bottom: 8px;
}

.library-shell {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  transition: max-width 0.18s ease;
}

.library-shell.detail-shell {
  max-width: 1180px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.market-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 36px;
  margin-bottom: 46px;
}

.market-kicker {
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 750;
  line-height: 1.2;
}

.market-hero {
  max-width: 760px;
  margin: 0 auto 42px;
  text-align: center;
}

.market-hero h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 32px;
  font-weight: 760;
  line-height: 1.22;
  letter-spacing: 0;
}

.market-hero p {
  max-width: 620px;
  margin: 18px auto 0;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.65;
  letter-spacing: 0;
}

.market-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}

.search-control {
  width: 100%;
  min-width: 0;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.search-control:focus-within {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.search-control svg {
  flex-shrink: 0;
}

.search-control input {
  width: 100%;
  min-width: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
}

.search-control input::placeholder {
  color: var(--text-muted);
}

.create-skill-btn,
.empty-state button,
.frequent-skill-item,
.card-use-btn,
.card-open-btn,
.sort-segment button,
.source-tab,
.card-action-menu button {
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.create-skill-btn {
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
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-color) 16%, transparent);
}

.create-skill-btn:hover {
  transform: translateY(-1px);
  color: var(--on-primary);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.empty-state button:hover {
  transform: translateY(-1px);
  color: var(--on-primary);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.source-tabs {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  min-width: 0;
  overflow-x: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  scrollbar-width: none;
}

.source-tabs::-webkit-scrollbar {
  display: none;
}

.source-tab {
  min-width: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.source-tab span {
  white-space: nowrap;
}

.source-tab strong {
  min-width: auto;
  height: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.source-tab:hover {
  color: var(--primary-hover);
  background: transparent;
}

.source-tab.active {
  gap: 8px;
  padding: 0 12px;
  color: var(--text-strong);
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.source-tab.active strong {
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--text-strong);
  background: var(--card-bg);
}

.content-section {
  min-height: 360px;
}

.content-section.detail-content-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.library-detail-panel {
  flex: 1;
  min-height: 0;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: -8px 0 18px;
}

.result-title {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.result-title strong {
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.result-title span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
}

.frequent-skills-section {
  margin: 0 0 28px;
}

.frequent-section-header,
.list-section-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.frequent-section-header strong,
.list-section-heading strong {
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.frequent-section-header span,
.list-section-heading span {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
}

.frequent-skill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.frequent-skill-item {
  position: relative;
  min-width: 0;
  min-height: 92px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
}

.frequent-skill-item:hover {
  border-color: var(--primary-border);
  box-shadow: var(--shadow-card);
  transform: translateY(-1px);
}

.frequent-skill-item.menu-open {
  z-index: 30;
}

.frequent-skill-item svg {
  color: var(--primary-color);
}

.card-use-btn,
.card-open-btn {
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
}

.card-use-btn:hover {
  color: var(--on-primary);
  background: var(--primary-hover);
  box-shadow: 0 10px 22px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.card-use-btn svg {
  color: currentColor;
}

.card-open-btn {
  border-color: var(--border-color);
  color: var(--text-strong);
  background: var(--card-bg);
  box-shadow: none;
}

.card-open-btn:hover {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.card-open-btn svg {
  color: currentColor;
}

.frequent-avatar {
  width: 40px;
  height: 40px;
  overflow: hidden;
  border-radius: 8px;
  background-color: transparent;
  background-repeat: no-repeat;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.frequent-copy {
  min-width: 0;
  display: grid;
  grid-template-rows: 18px 16px 18px;
  gap: 3px;
}

.frequent-copy strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 720;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.frequent-copy span {
  color: var(--text-muted);
  font-size: 12.5px;
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

.skill-author-meta > span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.list-section-heading {
  margin-top: 2px;
}

.toolbar-actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.sort-segment {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

.sort-segment button {
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 650;
}

.sort-segment button.active,
.sort-segment button:hover {
  color: var(--text-main);
  background: var(--surface-soft);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 0;
}

.managed-card {
  position: relative;
  min-height: 118px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-soft);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.managed-card:hover {
  border-color: var(--primary-border);
  box-shadow: var(--shadow-card);
  transform: translateY(-1px);
}

.managed-card.is-closed {
  background: var(--surface-soft);
}

.managed-card.is-closed .card-avatar,
.managed-card.is-closed .card-copy p {
  opacity: 1;
}

.managed-card.preview-disabled {
  cursor: default;
}

.managed-card.preview-disabled:hover {
  border-color: var(--border-color);
  box-shadow: none;
  transform: none;
}

.managed-card.menu-open {
  z-index: 30;
}

.managed-card.recommend-card {
  grid-template-columns: 40px minmax(0, 1fr) auto;
}

.card-actions {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  grid-column: 3;
  grid-row: 1;
  align-self: center;
  justify-self: end;
  padding-left: 4px;
}

.card-use-btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.card-avatar {
  grid-column: 1;
  grid-row: 1;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border-radius: 8px;
  background-color: transparent;
  background-repeat: no-repeat;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.card-copy {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  display: grid;
  grid-template-rows: 20px 17px minmax(38px, auto);
  gap: 4px;
  padding-top: 0;
}

.card-title-row {
  min-width: 0;
  display: block;
  align-items: center;
  margin: 0;
}

.card-meta-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.managed-card h3 {
  min-width: 0;
  margin: 0;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 720;
  line-height: 20px;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title-row h3 {
  margin: 0;
}

.skill-state-badge {
  flex-shrink: 0;
  align-self: center;
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--primary-color);
  background: var(--primary-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 13px;
}

.skill-state-badge.closed {
  color: var(--text-muted);
  background: var(--surface-muted);
}

.managed-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-more-btn {
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
}

.card-more-btn:hover {
  background: var(--bg-soft, var(--surface-muted));
  color: var(--ink-900, var(--text-strong));
}

.add-btn {
  grid-column: 3;
  grid-row: 1;
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
  align-self: center;
  justify-self: end;
}

.add-btn:hover {
  background: var(--primary-hover);
}

.add-btn:disabled {
  color: var(--text-muted);
  background: var(--surface-muted);
  cursor: default;
}

.card-action-menu {
  position: absolute;
  top: auto;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 40;
  min-width: 148px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.card-action-menu button {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  border-radius: 7px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 500;
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
  background: rgba(26, 22, 20, 0.42);
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
  box-shadow: var(--shadow-popover);
}

.menu-submenu-item:hover .publish-submenu,
.menu-submenu-item:focus-within .publish-submenu {
  display: block;
}

.publish-submenu button {
  min-height: 36px;
}

.card-action-menu button.danger {
  margin-top: 4px;
  border-top: 1px solid var(--border-color);
  border-radius: 0 0 7px 7px;
  color: var(--diff-removed);
}

.card-action-menu button.danger svg {
  color: var(--diff-removed);
}

.card-action-menu button.danger:hover {
  background: var(--diff-removed-soft);
}

.empty-state {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  text-align: center;
}

.empty-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--primary-color);
  background: var(--primary-soft);
}

.empty-state h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 700;
}

.empty-state p {
  max-width: 360px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.empty-state button {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 13px;
  font-weight: 700;
}

.search-control:focus-within,
.source-tab:focus-visible,
.create-skill-btn:focus-visible,
.frequent-skill-item:focus-visible,
.card-use-btn:focus-visible,
.sort-segment button:focus-visible,
.card-more-btn:focus-visible,
.add-btn:focus-visible,
.card-action-menu button:focus-visible,
.empty-state button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (max-width: 1040px) {
  .skill-template-view {
    padding: 18px 16px 28px;
  }

  .market-topbar {
    margin-bottom: 36px;
  }

  .market-hero {
    margin-bottom: 32px;
  }

  .market-hero h1 {
    font-size: 28px;
  }

  .market-controls {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .source-tabs {
    width: 100%;
    gap: 16px;
  }

  .result-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .market-topbar {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 28px;
  }

  .market-hero {
    text-align: left;
  }

  .market-hero h1 {
    font-size: clamp(20px, 6.2vw, 24px);
  }

  .create-skill-btn {
    width: 100%;
  }

  .source-tab {
    justify-content: center;
  }

  .frequent-skill-grid {
    grid-template-columns: 1fr;
  }

  .managed-card {
    grid-template-columns: 40px minmax(0, 1fr) auto;
  }
}

/* Reference-driven skill library layout. Kept after the legacy block so the
   existing detail panel behavior stays intact while the listing is refreshed. */
.skill-template-view {
  padding: 28px 36px 52px;
  background: var(--bg-color);
  color: var(--text-main);
}

.skill-template-view.detail-view {
  height: 100%;
  overflow: hidden;
  padding: 18px 28px 10px;
}

.library-shell {
  max-width: 1240px;
}

.library-shell.detail-shell {
  max-width: 1180px;
}

.market-hero {
  max-width: none;
  margin: 0 0 24px;
  text-align: left;
}

.market-hero h1 {
  margin: 0 0 18px;
  color: var(--text-strong);
  font-family: var(--font-serif, 'Songti SC', 'STSong', 'SimSun', Georgia, serif);
  font-size: 28px;
  font-weight: 650;
  line-height: 1.35;
}

.market-command-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.search-control.market-search {
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--card-bg);
  color: var(--text-secondary);
  box-shadow: var(--shadow-soft);
}

.search-control.market-search:focus-within {
  border-color: color-mix(in srgb, var(--primary-color) 46%, var(--border-color));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.search-control.market-search input {
  color: var(--text-strong);
  font-size: 13.5px;
}

.search-control.market-search input::placeholder {
  color: var(--text-muted);
}

.create-skill-btn {
  height: 44px;
  min-width: 110px;
  padding: 0 16px;
  border: 1px solid var(--text-strong);
  border-radius: 9px;
  background: var(--text-strong);
  color: var(--on-primary);
  box-shadow: none;
  font-size: 13px;
  font-weight: 650;
}

.create-skill-btn:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--text-strong) 88%, var(--primary-color));
  border-color: color-mix(in srgb, var(--text-strong) 88%, var(--primary-color));
  box-shadow: var(--shadow-card);
}

.market-filter-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.source-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  overflow-x: auto;
  padding: 0;
  background: transparent;
  border: 0;
  scrollbar-width: none;
}

.source-tabs::-webkit-scrollbar {
  display: none;
}

.source-tab {
  height: 34px;
  padding: 0 1px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 560;
}

.source-tab:hover {
  color: var(--text-strong);
  background: color-mix(in srgb, var(--surface-muted) 74%, transparent);
}

.source-tab.active {
  padding: 0 16px;
  border-color: color-mix(in srgb, var(--primary-color) 16%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 9%, var(--card-bg));
  color: var(--primary-hover);
  box-shadow: none;
}

.status-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  flex-wrap: wrap;
}

.status-filter-btn {
  height: 30px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 560;
}

.status-filter-btn:hover {
  background: var(--surface-muted);
  color: var(--text-strong);
}

.status-filter-btn.active {
  background: var(--text-strong);
  color: var(--on-primary);
}

.recommended-sort-row {
  display: flex;
  align-items: center;
  min-height: 34px;
}

.recommended-sort-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--surface-muted);
}

.recommended-sort-tab {
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 560;
  white-space: nowrap;
}

.recommended-sort-tab[data-active='true'] {
  background: var(--card-bg);
  color: var(--text-strong);
  box-shadow: 0 1px 2px rgba(26, 22, 20, 0.06);
}

.content-section {
  min-height: 360px;
}

.content-section.detail-content-section {
  flex: 1;
  min-height: 0;
}

.card-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.managed-card {
  position: relative;
  min-width: 0;
  min-height: 266px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 19px 18px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-main);
  cursor: pointer;
  box-shadow: none;
}

.managed-card:hover {
  border-color: color-mix(in srgb, var(--text-strong) 18%, var(--border-color));
  box-shadow: var(--shadow-card);
  transform: translateY(-1px);
}

.managed-card.preview-disabled {
  cursor: default;
}

.managed-card.is-closed {
  background: var(--card-bg);
}

.managed-card.menu-open {
  z-index: 40;
}

.card-main-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

.card-avatar {
  --skill-tone: var(--primary-color);
  --skill-tone-bg: color-mix(in srgb, var(--primary-color) 12%, var(--surface-muted));
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: var(--skill-tone-bg);
  color: var(--skill-tone);
  background-image: none;
}

.card-avatar.tone-2 {
  --skill-tone: var(--text-main);
  --skill-tone-bg: color-mix(in srgb, var(--text-main) 10%, var(--surface-muted));
}

.card-avatar.tone-3 {
  --skill-tone: var(--warning-color);
  --skill-tone-bg: color-mix(in srgb, var(--warning-color) 13%, var(--card-bg));
}

.card-avatar.tone-4 {
  --skill-tone: var(--diff-added);
  --skill-tone-bg: color-mix(in srgb, var(--diff-added) 12%, var(--card-bg));
}

.card-avatar.tone-5 {
  --skill-tone: var(--diff-removed);
  --skill-tone-bg: color-mix(in srgb, var(--diff-removed) 11%, var(--card-bg));
}

.card-avatar.tone-6 {
  --skill-tone: var(--focus-ring);
  --skill-tone-bg: color-mix(in srgb, var(--focus-ring) 14%, var(--card-bg));
}

.card-copy {
  min-width: 0;
  display: block;
  grid-column: auto;
  grid-row: auto;
  grid-template-rows: none;
  gap: 0;
  padding-top: 0;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.card-title-row h3 {
  min-width: 0;
  margin: 0;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 720;
  line-height: 1.35;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}

.skill-state-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 21px;
  padding: 0 7px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--diff-added) 11%, var(--card-bg));
  color: color-mix(in srgb, var(--diff-added) 76%, var(--text-strong));
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
}

.skill-state-badge.inactive {
  background: color-mix(in srgb, var(--warning-color) 13%, var(--card-bg));
  color: color-mix(in srgb, var(--warning-color) 78%, var(--text-strong));
}

.skill-state-badge.disabled {
  background: var(--surface-muted);
  color: var(--text-muted);
}

.card-copy p {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 430;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-author-line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.2;
}

.skill-author-line strong {
  color: var(--text-strong);
  font-weight: 650;
}

.skill-author-avatar {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  background-color: var(--text-strong);
  background-position: center;
  background-size: cover;
  color: var(--on-primary);
  font-size: 10px;
  font-weight: 700;
}

.file-chip-row {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  margin-top: auto;
}

.file-chip {
  min-width: 0;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 29px;
  padding: 0 9px;
  border: 1px solid color-mix(in srgb, var(--text-main) 10%, var(--border-color));
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-muted) 74%, var(--card-bg));
  color: var(--text-main);
  font-size: 12px;
  white-space: nowrap;
}

.file-chip strong {
  color: var(--primary-hover);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: .02em;
}

.file-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-chip.file-json strong,
.file-chip.file-yaml strong,
.file-chip.file-yml strong {
  color: var(--warning-color);
}

.file-chip.file-md strong,
.file-chip.file-markdown strong {
  color: var(--primary-hover);
}

.file-chip.file-ts strong,
.file-chip.file-typescript strong {
  color: color-mix(in srgb, var(--diff-added) 80%, var(--text-strong));
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 13px;
  border-top: 1px solid var(--border-color);
}

.source-badge {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 25px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.source-personal {
  background: color-mix(in srgb, var(--primary-color) 8%, var(--surface-muted));
  color: color-mix(in srgb, var(--primary-hover) 76%, var(--text-strong));
}

.source-group-shared,
.source-team-shared {
  background: color-mix(in srgb, var(--diff-added) 10%, var(--surface-muted));
  color: color-mix(in srgb, var(--diff-added) 72%, var(--text-strong));
}

.source-recommended,
.source-official {
  background: color-mix(in srgb, var(--diff-removed) 9%, var(--surface-muted));
  color: color-mix(in srgb, var(--diff-removed) 76%, var(--text-strong));
}

.source-public-hub,
.source-market {
  background: color-mix(in srgb, var(--warning-color) 10%, var(--surface-muted));
  color: color-mix(in srgb, var(--warning-color) 78%, var(--text-strong));
}

.card-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.card-use-btn,
.card-open-btn,
.add-btn {
  min-width: 62px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  border: 1px solid var(--text-strong);
  border-radius: 8px;
  background: var(--text-strong);
  color: var(--on-primary);
  box-shadow: none;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.card-use-btn:hover,
.card-open-btn:hover,
.add-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--text-strong) 88%, var(--primary-color));
  border-color: color-mix(in srgb, var(--text-strong) 88%, var(--primary-color));
}

.card-open-btn,
.add-btn {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

.add-btn:disabled {
  cursor: not-allowed;
  border-color: var(--border-color);
  background: var(--surface-muted);
  color: var(--text-muted);
}

.card-more-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-500, var(--text-secondary));
  cursor: pointer;
}

.card-more-btn:hover {
  background: var(--bg-soft, var(--surface-muted));
  color: var(--ink-900, var(--text-strong));
}

.card-action-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 50;
  min-width: 148px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.menu-action,
.publish-submenu button {
  width: 100%;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 13px;
  text-align: left;
}

.menu-action:hover,
.publish-submenu button:hover {
  background: var(--surface-muted);
  color: var(--text-strong);
}

.menu-action.danger {
  color: var(--diff-removed);
}

.menu-submenu-item {
  position: relative;
}

.submenu-chevron {
  margin-left: auto;
}

.publish-submenu {
  position: absolute;
  top: -6px;
  right: calc(100% + 8px);
  min-width: 136px;
  display: none;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
}

.menu-submenu-item:hover .publish-submenu {
  display: block;
}

.empty-state {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
  background: color-mix(in srgb, var(--card-bg) 74%, var(--surface-muted));
  color: var(--text-secondary);
}

.empty-state h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 17px;
}

.empty-state p {
  max-width: 440px;
  margin: 0;
  text-align: center;
  line-height: 1.6;
}

.empty-state button {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 4px;
  padding: 0 14px;
  border-radius: 8px;
  background: var(--text-strong);
  color: var(--on-primary);
}

.source-tab:focus-visible,
.status-filter-btn:focus-visible,
.recommended-sort-tab:focus-visible,
.create-skill-btn:focus-visible,
.card-use-btn:focus-visible,
.card-open-btn:focus-visible,
.card-more-btn:focus-visible,
.add-btn:focus-visible,
.card-action-menu button:focus-visible,
.empty-state button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary-color) 70%, transparent);
  outline-offset: 2px;
}

@media (max-width: 1180px) {
  .skill-template-view {
    padding: 24px 24px 40px;
  }

  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .skill-template-view {
    padding: 20px 16px 32px;
  }

  .market-hero h1 {
    font-size: clamp(20px, 6.2vw, 24px);
  }

  .market-command-row {
    grid-template-columns: 1fr;
  }

  .create-skill-btn {
    width: 100%;
  }

  .source-tabs {
    gap: 14px;
    flex-wrap: wrap;
    overflow-x: visible;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .managed-card {
    min-height: 0;
    overflow-x: hidden;
    padding-inline: 14px;
  }

  .card-main-row {
    grid-template-columns: 1fr !important;
    gap: 10px;
  }

  .card-avatar {
    width: 54px;
    height: 54px;
    border-radius: 12px;
  }

  .card-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .card-title-row h3 {
    overflow-wrap: anywhere;
  }

  .skill-author-line {
    align-items: flex-start;
    flex-wrap: wrap;
    line-height: 1.35;
  }

  .file-chip {
    width: 100%;
  }

  .card-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .source-badge,
  .card-actions {
    width: 100%;
  }

  .card-actions > button {
    flex: 1;
  }
}

/* LawAgents standalone alignment. These overrides map the extracted source
   tokens onto the app's five theme palettes without hard-coding one theme. */
.skill-template-view {
  --skill-page-bg: var(--bg, var(--bg-color));
  --skill-panel: var(--bg-panel, var(--card-bg));
  --skill-paper: var(--bg-soft, var(--surface-muted));
  --skill-paper-deep: var(--bg-sunk, var(--surface-soft));
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
  min-width: 0;
  background: var(--skill-page-bg);
  color: var(--skill-ink-soft);
  font-family: var(--font-sans, 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif);
}

.skill-template-view:not(.detail-view) {
  padding: 32px 36px 60px;
}

.skill-template-view.detail-view {
  padding: 18px 28px 10px;
}

.library-shell:not(.detail-shell) {
  max-width: 1240px;
}

.market-hero {
  margin: 0 0 18px;
}

.market-hero h1 {
  margin: 0 0 18px;
  color: var(--skill-ink);
  font-family: var(--font-serif, 'Songti SC', 'STSong', 'SimSun', Georgia, serif);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0;
}

.market-command-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.search-control.market-search {
  flex: 1 1 720px;
  max-width: 920px;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--skill-line);
  border-radius: var(--skill-radius-md);
  background: var(--skill-panel);
  color: var(--skill-faint);
  box-shadow: none;
}

.search-control.market-search:focus-within {
  border-color: var(--skill-line-strong);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--skill-accent) 10%, transparent);
}

.search-control.market-search input {
  color: var(--skill-ink);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0;
}

.search-control.market-search input::placeholder {
  color: var(--skill-faint);
}

.create-skill-btn {
  height: 44px;
  min-width: 110px;
  padding: 0 16px;
  border: 1px solid var(--skill-ink);
  border-radius: var(--skill-radius-md);
  background: var(--skill-ink);
  color: var(--on-primary);
  box-shadow: none;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
}

.create-skill-btn:hover {
  border-color: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
  background: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
  box-shadow: var(--skill-shadow-card);
  transform: translateY(-1px);
}

.market-filter-stack {
  gap: 14px;
}

.source-tabs {
  gap: 8px;
  flex-wrap: wrap;
  overflow: visible;
}

.source-tab {
  height: 34px;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: var(--skill-radius-md);
  background: transparent;
  color: var(--skill-ink-soft);
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: 0;
}

.source-tab:hover {
  background: var(--skill-paper);
  color: var(--skill-ink);
}

.source-tab.active {
  border-color: color-mix(in srgb, var(--skill-accent) 15%, var(--skill-line));
  background: var(--skill-accent-soft);
  color: var(--skill-accent-strong);
}

.status-filter-row {
  gap: 4px;
  min-height: 30px;
}

.status-filter-btn {
  height: 30px;
  padding: 5px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--skill-ink-soft);
  font-size: 12.5px;
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

.recommended-sort-row {
  min-height: 34px;
}

.recommended-sort-tabs {
  padding: 3px;
  border-radius: 999px;
  background: var(--skill-paper);
}

.recommended-sort-tab {
  height: 28px;
  padding: 0 14px;
  border-radius: 999px;
  color: var(--skill-muted);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
}

.recommended-sort-tab:hover {
  color: var(--skill-ink);
}

.recommended-sort-tab[data-active='true'] {
  background: var(--skill-panel);
  color: var(--skill-ink);
  box-shadow: 0 1px 2px rgba(26, 22, 20, 0.06);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.managed-card {
  min-width: 0;
  min-height: 265px;
  align-items: stretch;
  padding: 18px;
  border: 1px solid var(--skill-line);
  border-radius: var(--skill-radius-lg);
  background: var(--skill-panel);
  box-shadow: none;
  color: var(--skill-ink-soft);
  gap: 14px;
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

.managed-card:focus {
  outline: none;
}

.managed-card.preview-disabled:hover {
  border-color: var(--skill-line);
  box-shadow: none;
  transform: none;
}

.managed-card.is-closed {
  background: var(--skill-panel);
}

.card-main-row {
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.card-avatar,
.card-avatar.tone-neutral,
.card-avatar[class*="tone-"] {
  width: 64px;
  height: 64px;
  border-radius: var(--skill-radius-lg);
  background: var(--skill-paper);
  color: var(--skill-ink-soft);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.card-avatar svg {
  width: 34px;
  height: 34px;
}

.card-title-row {
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-title-row h3 {
  color: var(--skill-ink);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

.skill-state-badge {
  height: auto;
  padding: 2px 8px;
  border-radius: 5px;
  background: var(--skill-accent-soft);
  color: var(--skill-accent-strong);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0;
}

.skill-state-badge.inactive,
.skill-state-badge.disabled {
  background: var(--skill-paper);
  color: var(--skill-muted);
}

.card-copy p {
  margin: 5px 0 0;
  color: var(--skill-muted);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: 0;
}

.skill-author-line {
  margin-top: 8px;
  gap: 7px;
  color: var(--skill-faint);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
}

.skill-author-line strong {
  color: var(--skill-ink);
  font-weight: 500;
}

.skill-author-avatar {
  width: 20px;
  height: 20px;
  background-color: var(--skill-ink);
  color: var(--on-primary);
}

.file-chip-row {
  gap: 6px;
  min-height: 29px;
  margin-top: auto;
}

.file-chip {
  height: 28px;
  gap: 6px;
  padding: 4px 8px 4px 6px;
  border: 1px solid var(--skill-line);
  border-radius: 6px;
  background: var(--skill-paper);
  color: var(--skill-ink-soft);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
}

.file-chip strong {
  padding: 1px 5px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--skill-panel) 72%, var(--skill-paper));
  color: var(--primary-hover);
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
}

.file-chip span {
  max-width: 138px;
  color: var(--skill-ink-soft);
}

.file-chip.file-xlsx strong,
.file-chip.file-json strong,
.file-chip.file-yaml strong,
.file-chip.file-yml strong {
  color: color-mix(in srgb, var(--diff-added) 82%, var(--skill-ink));
}

.file-chip.file-md strong,
.file-chip.file-markdown strong {
  color: var(--primary-hover);
}

.card-footer {
  width: 100%;
  min-width: 0;
  margin-top: 0;
  padding-top: 12px;
  border-top: 1px solid var(--skill-line);
}

.source-badge,
.source-personal,
.source-group-shared,
.source-team-shared,
.source-official,
.source-market,
.source-recommended,
.source-public-hub {
  height: 25px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--skill-paper);
  color: var(--skill-ink-soft);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0;
}

.card-actions {
  gap: 4px;
  margin-left: auto;
}

.card-use-btn,
.card-open-btn,
.add-btn {
  min-width: 62px;
  height: 32px;
  padding: 0 18px;
  border: 1px solid var(--skill-ink);
  border-radius: 8px;
  background: var(--skill-ink);
  color: var(--on-primary);
  box-shadow: none;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
}

.card-open-btn,
.add-btn {
  border-color: var(--skill-accent);
  background: var(--skill-accent);
}

.card-use-btn:hover,
.card-open-btn:hover,
.add-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
  background: color-mix(in srgb, var(--skill-ink) 88%, var(--skill-accent));
}

.add-btn:disabled {
  border-color: var(--skill-line);
  background: var(--skill-paper);
  color: var(--skill-muted);
}

.card-more-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--skill-muted);
  cursor: pointer;
}

.card-more-btn:hover {
  background: var(--skill-paper);
  color: var(--skill-ink);
}

.card-action-menu {
  top: auto;
  right: 0;
  bottom: calc(100% + 8px);
  width: 148px;
  min-width: 148px;
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
  height: 34px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--skill-ink);
  font-size: 13px;
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

.empty-state {
  border-color: var(--skill-line);
  border-radius: var(--skill-radius-lg);
  background: var(--skill-panel);
}

.source-tab:focus-visible,
.status-filter-btn:focus-visible,
.recommended-sort-tab:focus-visible,
.search-control.market-search:focus-within,
.create-skill-btn:focus-visible,
.card-use-btn:focus-visible,
.card-open-btn:focus-visible,
.card-more-btn:focus-visible,
.add-btn:focus-visible,
.card-action-menu button:focus-visible,
.empty-state button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--skill-accent) 72%, transparent);
  outline-offset: 2px;
}

@media (max-width: 1180px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .skill-template-view:not(.detail-view) {
    padding: 20px 16px 32px;
  }

  .market-hero h1 {
    font-size: 24px;
  }

  .market-command-row {
    align-items: stretch;
    flex-direction: column;
  }

  .search-control.market-search {
    flex-basis: auto;
    max-width: none;
  }

  .create-skill-btn {
    width: 100%;
  }

  .card-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .managed-card {
    min-height: 0;
  }

  .card-main-row {
    grid-template-columns: 54px minmax(0, 1fr) !important;
    align-items: start;
    gap: 12px;
  }

  .card-avatar,
  .card-avatar.tone-neutral,
  .card-avatar[class*="tone-"] {
    width: 54px;
    height: 54px;
    border-radius: 12px;
  }

  .card-avatar svg {
    width: 30px;
    height: 30px;
  }

  .card-footer {
    align-items: center;
    flex-direction: row;
  }

  .source-badge {
    width: auto;
  }

  .card-actions {
    width: auto;
  }

  .card-actions > button {
    flex: 0 0 auto;
  }
}

@media (max-width: 430px) {
  .card-main-row {
    grid-template-columns: 1fr !important;
  }

  .card-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .source-badge,
  .card-actions {
    width: 100%;
  }

  .card-actions > button {
    flex: 1;
  }
}
</style>
