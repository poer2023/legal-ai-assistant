<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Check,
  ChevronRight,
  Download,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  Puzzle,
  Search,
  Trash2,
  UsersRound,
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
  type SkillPublishDestination,
} from '../data/skillCatalog';
import { getSkillAvatarStyle } from '../data/skillAvatars';
import {
  getSkillAuthorAvatarStyle as resolveSkillAuthorAvatarStyle,
  getSkillAuthorAvatarText as resolveSkillAuthorAvatarText,
  getSkillAuthorName as resolveSkillAuthorName,
  hasSkillAuthorAvatarImage,
  shouldShowSkillAuthor as resolveShouldShowSkillAuthor,
} from '../data/profileIdentity';
import { useOrgSession } from '../stores/orgSession';
import LibraryTypeDropdown from './LibraryTypeDropdown.vue';
import SkillDetailPanel from './SkillDetailPanel.vue';
import { useToast } from '../stores/toast';

type SkillMode = 'personal' | 'group-shared' | 'team-shared' | 'public-hub' | 'recommended';

const skillMode = ref<SkillMode>('personal');
const searchKeyword = ref('');
const selectedCategory = ref('全部');
const openCardMenuId = ref<string | null>(null);
const selectedSkill = ref<SkillCatalogItem | null>(null);
const detailStartEditKey = ref('');
const route = useRoute();
const router = useRouter();
const { showToast } = useToast();
const { currentUser } = useOrgSession();

const utilitySkillIds = new Set(['docx', 'pdf', 'xlsx']);
const sourceModeCopy: Record<SkillMode, {
  name: string;
  emptyTitle: string;
  emptyDescription: string;
}> = {
  personal: {
    name: '个人',
    emptyTitle: '暂无个人技能',
    emptyDescription: '可以从官方、共享资源或市场（hub）中安装，也可以直接创建一个新技能。',
  },
  'group-shared': {
    name: '小组',
    emptyTitle: '暂无小组共享技能',
    emptyDescription: '小组成员发布后，会出现在这里供组内安装使用。',
  },
  'team-shared': {
    name: '团队',
    emptyTitle: '暂无团队共享技能',
    emptyDescription: '发布到团队的技能会在这里展示，团队成员可以安装到自己的技能库。',
  },
  'public-hub': {
    name: '市场（hub）',
    emptyTitle: '暂无市场技能',
    emptyDescription: '公开发布后的技能会进入市场（hub），所有使用者都可以发现和安装。',
  },
  recommended: {
    name: '官方',
    emptyTitle: '暂无官方推荐技能',
    emptyDescription: '官方推荐内容上线后会按类型展示在这里。',
  },
};

const sortSkillsForLibrary = (skills: SkillCatalogItem[]) =>
  [...skills].sort((left, right) => {
    const leftIsUtility = utilitySkillIds.has(left.id);
    const rightIsUtility = utilitySkillIds.has(right.id);
    if (leftIsUtility === rightIsUtility) return 0;
    return leftIsUtility ? 1 : -1;
  });

const activeSkills = computed(() =>
  sortSkillsForLibrary(
    {
      personal: personalSkills.value,
      'group-shared': catalogGroupSharedSkills.value,
      'team-shared': teamSharedSkills.value,
      'public-hub': catalogPublicHubSkills.value,
      recommended: officialRecommendedSkills,
    }[skillMode.value],
  ),
);

const sourceTabs = computed(() => [
  { key: 'personal' as const, name: sourceModeCopy.personal.name, count: personalSkills.value.length },
  { key: 'group-shared' as const, name: sourceModeCopy['group-shared'].name, count: catalogGroupSharedSkills.value.length },
  { key: 'team-shared' as const, name: sourceModeCopy['team-shared'].name, count: teamSharedSkills.value.length },
  { key: 'recommended' as const, name: sourceModeCopy.recommended.name, count: officialRecommendedSkills.length },
  { key: 'public-hub' as const, name: sourceModeCopy['public-hub'].name, count: catalogPublicHubSkills.value.length },
]);

const activeModeCopy = computed(() => sourceModeCopy[skillMode.value]);
const shouldShowCategoryFilter = computed(() => skillMode.value === 'recommended');
const isPersonalMode = computed(() => skillMode.value === 'personal');

const categoryTabs = computed(() => {
  const counts = new Map<string, number>();
  activeSkills.value.forEach((skill) => {
    counts.set(skill.category, (counts.get(skill.category) ?? 0) + 1);
  });

  return [
    { name: '全部', count: activeSkills.value.length },
    ...Array.from(counts, ([name, count]) => ({ name, count })).sort((left, right) =>
      left.name.localeCompare(right.name, 'zh-Hans-CN'),
    ),
  ];
});

const visibleSkills = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return activeSkills.value.filter((skill) => {
    const matchesCategory =
      !shouldShowCategoryFilter.value ||
      selectedCategory.value === '全部' ||
      skill.category === selectedCategory.value;
    const searchable = [
      skill.name,
      skill.description,
      skill.category,
      ...skill.tags,
      ...skill.files.map((file) => `${file.name} ${file.path}`),
    ]
      .join(' ')
      .toLowerCase();

    return matchesCategory && (!keyword || searchable.includes(keyword));
  });
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
  selectedCategory.value = '全部';
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

const shouldBlockSkillDetail = () => skillMode.value === 'recommended' || skillMode.value === 'public-hub';

const openSkill = (skill: SkillCatalogItem) => {
  if (shouldBlockSkillDetail()) return;
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
  void router.push({
    name: 'home',
    query: {
      composerAction: 'skill',
      composerTick: Date.now().toString(),
    },
  });
};

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addPersonalSkill(skill.id);
  showToast(didAdd ? `${skill.name} 已安装到我的技能` : `${skill.name} 已在我的技能中`);
};

const installSharedSkill = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'recommended') {
    addSkill(skill);
    return;
  }

  showToast(`${skill.name} 已安装到我的技能`);
};

const handlePrimarySkillAction = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'personal') {
    selectSkill(skill);
    return;
  }

  installSharedSkill(skill);
};

const getPrimarySkillActionLabel = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'personal') return isSkillEnabled(skill) ? '使用' : '启用';
  if (skillMode.value === 'recommended' && isSkillAdded(skill)) return '已安装';
  return '安装';
};

const isPrimarySkillActionDisabled = (skill: SkillCatalogItem) =>
  skillMode.value === 'recommended' && isSkillAdded(skill);

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

const publishSkill = (skill: SkillCatalogItem, destination: SkillPublishDestination) => {
  const didPublish = publishSkillToTeamMarket(skill.id, destination);
  openCardMenuId.value = null;
  const label = publishDestinationLabels[destination];
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

const shouldShowSkillAuthor = (skill: SkillCatalogItem) => resolveShouldShowSkillAuthor(skill, currentUser.value);
const getSkillAuthorName = (skill: SkillCatalogItem) => resolveSkillAuthorName(skill, currentUser.value);
const getSkillAuthorAvatarText = (skill: SkillCatalogItem) => resolveSkillAuthorAvatarText(skill, currentUser.value);
const getSkillAuthorAvatarStyle = (skill: SkillCatalogItem) => resolveSkillAuthorAvatarStyle(skill, currentUser.value);

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
  if (
    value === 'personal' ||
    value === 'group-shared' ||
    value === 'team-shared' ||
    value === 'public-hub' ||
    value === 'recommended'
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

  if (routeSkillMode === 'recommended' || routeSkillMode === 'public-hub') {
    clearDetail();
    openCardMenuId.value = null;
    return;
  }

  const skill = findSkillForRoute(skillId);
  if (!skill) return;

  selectedCategory.value = '全部';
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
        <header class="market-topbar">
          <span class="market-kicker">技能市场</span>
          <button
            class="create-skill-btn"
            type="button"
            @click="triggerCreateSkill"
          >
            <Plus :size="16" />
            <span>创建技能</span>
          </button>
        </header>

        <section class="market-hero" aria-labelledby="skill-market-title">
          <h1 id="skill-market-title">全面增强你的法律 AI Agent</h1>
          <p>安装、创建和共享可复用技能，让问答、审查、写作和知识调用进入稳定工作流。</p>
        </section>

        <div class="market-controls">
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
              <strong>{{ tab.count }}</strong>
            </button>
          </nav>

          <label class="search-control market-search">
            <Search :size="17" />
            <input v-model="searchKeyword" type="text" placeholder="搜索技能" />
          </label>
        </div>

        <div v-if="!isPersonalMode" class="result-toolbar">
          <div class="result-title">
            <strong>{{ activeModeCopy.name }}</strong>
            <span>{{ visibleSkills.length }} 个技能</span>
          </div>
          <div class="toolbar-actions">
            <LibraryTypeDropdown
              v-if="shouldShowCategoryFilter"
              v-model="selectedCategory"
              :options="categoryTabs"
              label="类型"
            />

            <div v-else class="sort-segment" aria-label="排序">
              <button class="active" type="button">最近更新</button>
              <button type="button">安装量</button>
            </div>
          </div>
        </div>
      </template>

      <section class="content-section" :class="{ 'detail-content-section': isDetailOpen }" aria-label="技能库管理">
        <template v-if="!selectedSkill">
          <section
            v-if="isPersonalMode && mostUsedPersonalSkills.length"
            class="frequent-skills-section"
            aria-label="最常使用技能"
          >
            <header class="frequent-section-header">
              <strong>最常使用</strong>
              <span>按使用频率排序</span>
            </header>

            <div class="frequent-skill-grid">
              <article
                v-for="skill in mostUsedPersonalSkills"
                :key="`frequent-${skill.id}`"
                class="frequent-skill-item"
                :class="{ 'menu-open': openCardMenuId === `frequent-${skill.id}` }"
                role="button"
                tabindex="0"
                @click="openSkill(skill)"
                @keydown.enter.prevent="openSkill(skill)"
              >
                <span class="frequent-avatar" :style="getSkillAvatarStyle(skill)" aria-hidden="true"></span>
                <span class="frequent-copy">
                  <strong>{{ skill.name }}</strong>
                  <span>{{ getSkillUsageMeta(skill) }}</span>
                  <span v-if="shouldShowSkillAuthor(skill)" class="skill-author-meta">
                    <span class="skill-author-avatar" :style="getSkillAuthorAvatarStyle(skill)">
                      <span v-if="!hasSkillAuthorAvatarImage(skill, currentUser)">{{ getSkillAuthorAvatarText(skill) }}</span>
                    </span>
                    <span>{{ getSkillAuthorName(skill) }}</span>
                  </span>
                </span>
                <div class="card-actions">
                  <button
                    class="card-use-btn"
                    type="button"
                    :aria-label="`使用${skill.name}`"
                    @click.stop="selectSkill(skill)"
                  >
                    <Play :size="13" />
                    <span>使用</span>
                  </button>
                  <button
                    class="card-more-btn"
                    type="button"
                    :aria-label="`${skill.name} 更多操作`"
                    @click.stop="toggleCardMenu(`frequent-${skill.id}`)"
                  >
                    <MoreHorizontal :size="18" />
                  </button>
                </div>

                <div v-if="openCardMenuId === `frequent-${skill.id}`" class="card-action-menu" @click.stop>
                  <button
                    class="menu-action"
                    type="button"
                    @click="editSkill(skill)"
                  >
                    <Pencil :size="15" />
                    <span>编辑</span>
                  </button>
                  <button class="menu-action" type="button" @click="downloadSkill(skill)">
                    <Download :size="15" />
                    <span>下载</span>
                  </button>
                  <button class="menu-action" type="button" @click="setSkillOpen(skill, false)">
                    <PowerOff :size="15" />
                    <span>停用技能</span>
                  </button>
                  <div class="menu-submenu-item">
                    <button class="menu-action submenu-trigger" type="button">
                      <UsersRound :size="15" />
                      <span>发布</span>
                      <ChevronRight :size="14" class="submenu-chevron" />
                    </button>
                    <div class="publish-submenu" role="menu" aria-label="发布范围">
                      <button type="button" @click="publishSkill(skill, 'group')">发布到小组</button>
                      <button type="button" @click="publishSkill(skill, 'team')">发布到团队</button>
                      <button type="button" @click="publishSkill(skill, 'public')">发布到市场</button>
                    </div>
                  </div>
                  <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
                    <Trash2 :size="15" />
                    <span>删除</span>
                  </button>
                </div>
              </article>
            </div>
          </section>

          <div v-if="isPersonalMode && visibleSkills.length" class="list-section-heading">
            <strong>全部技能</strong>
            <span>{{ visibleSkills.length }} 个</span>
          </div>

          <div v-if="visibleSkills.length" class="card-grid">
            <article
              v-for="skill in visibleSkills"
              :key="skill.id"
              class="managed-card"
              :class="{
                'recommend-card': skillMode !== 'personal',
                'preview-disabled': shouldBlockSkillDetail(),
                'is-closed': skillMode === 'personal' && !isSkillEnabled(skill),
                'menu-open': openCardMenuId === `skill-${skill.id}`
              }"
              :tabindex="shouldBlockSkillDetail() ? undefined : 0"
              @click="openSkill(skill)"
              @keydown.enter.prevent="openSkill(skill)"
            >
              <div v-if="skillMode === 'personal'" class="card-actions">
                <button
                  v-if="isSkillEnabled(skill)"
                  class="card-use-btn"
                  type="button"
                  :aria-label="`使用${skill.name}`"
                  @click.stop="selectSkill(skill)"
                >
                  <Play :size="13" />
                  <span>使用</span>
                </button>
                <button
                  v-else
                  class="card-open-btn"
                  type="button"
                  :aria-label="`启用${skill.name}`"
                  @click.stop="setSkillOpen(skill, true)"
                >
                  <Power :size="13" />
                  <span>启用</span>
                </button>
                <button
                  class="card-more-btn"
                  type="button"
                  :aria-label="`${skill.name} 更多操作`"
                  @click.stop="toggleCardMenu(`skill-${skill.id}`)"
                >
                  <MoreHorizontal :size="18" />
                </button>
              </div>
              <button
                v-if="skillMode !== 'personal'"
                class="add-btn"
                type="button"
                :disabled="isPrimarySkillActionDisabled(skill)"
                @click.stop="handlePrimarySkillAction(skill)"
              >
                <Check v-if="isPrimarySkillActionDisabled(skill)" :size="15" />
                <Plus v-else :size="15" />
                <span>{{ getPrimarySkillActionLabel(skill) }}</span>
              </button>

              <div v-if="openCardMenuId === `skill-${skill.id}`" class="card-action-menu" @click.stop>
                <button
                  class="menu-action"
                  type="button"
                  @click="editSkill(skill)"
                >
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
                  <span>{{ isSkillEnabled(skill) ? '停用技能' : '启用技能' }}</span>
                </button>
                <div class="menu-submenu-item">
                  <button class="menu-action submenu-trigger" type="button">
                    <UsersRound :size="15" />
                    <span>发布</span>
                    <ChevronRight :size="14" class="submenu-chevron" />
                  </button>
                  <div class="publish-submenu" role="menu" aria-label="发布范围">
                    <button type="button" @click="publishSkill(skill, 'group')">发布到小组</button>
                    <button type="button" @click="publishSkill(skill, 'team')">发布到团队</button>
                    <button type="button" @click="publishSkill(skill, 'public')">发布到市场</button>
                  </div>
                </div>
                <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
                  <Trash2 :size="15" />
                  <span>删除</span>
                </button>
              </div>

              <div class="card-avatar" :style="getSkillAvatarStyle(skill)" aria-hidden="true"></div>
              <div class="card-copy">
                <div class="card-title-row">
                  <h3>{{ skill.name }}</h3>
                </div>
                <div class="card-meta-row">
                  <span v-if="skillMode === 'personal'" class="skill-state-badge" :class="{ closed: !isSkillEnabled(skill) }">
                    {{ isSkillEnabled(skill) ? '已启用' : '已停用' }}
                  </span>
                  <span v-if="shouldShowSkillAuthor(skill)" class="skill-author-meta">
                    <span class="skill-author-avatar" :style="getSkillAuthorAvatarStyle(skill)">
                      <span v-if="!hasSkillAuthorAvatarImage(skill, currentUser)">{{ getSkillAuthorAvatarText(skill) }}</span>
                    </span>
                    <span>{{ getSkillAuthorName(skill) }}</span>
                  </span>
                </div>
                <p>{{ skill.description }}</p>
              </div>
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
  background: var(--card-bg);
}

.managed-card.is-closed .card-avatar,
.managed-card.is-closed .card-copy p {
  opacity: 0.72;
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
  display: inline-flex;
  align-items: center;
  gap: 5px;
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
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--primary-color) 18%, var(--border-color));
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 7%, var(--card-bg));
}

.card-more-btn:hover {
  border-color: color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 11%, var(--card-bg));
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
  top: 58px;
  right: 14px;
  z-index: 40;
  min-width: 176px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: var(--shadow-popover);
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
.managed-card:focus-visible,
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
    font-size: 24px;
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
</style>
