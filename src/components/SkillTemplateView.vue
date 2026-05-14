<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Check,
  Download,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Puzzle,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-vue-next';
import {
  addPersonalSkill,
  isSkillAvailable,
  officialRecommendedSkills,
  personalSkills,
  publishSkillToTeamMarket,
  removePersonalSkill,
  teamMarketSkills,
  type SkillCatalogItem,
} from '../data/skillCatalog';
import { getSkillAvatarStyle } from '../data/skillAvatars';
import LibraryTypeDropdown from './LibraryTypeDropdown.vue';
import SkillDetailPanel from './SkillDetailPanel.vue';
import { useToast } from '../stores/toast';

type SkillMode = 'personal' | 'team-market' | 'recommended';

const skillMode = ref<SkillMode>('personal');
const searchKeyword = ref('');
const selectedCategory = ref('全部');
const openCardMenuId = ref<string | null>(null);
const selectedSkill = ref<SkillCatalogItem | null>(null);
const detailStartEditKey = ref('');
const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const utilitySkillIds = new Set(['docx', 'pdf', 'xlsx']);

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
      'team-market': teamMarketSkills.value,
      recommended: officialRecommendedSkills,
    }[skillMode.value],
  ),
);

const sourceTabs = computed(() => [
  { key: 'personal' as const, name: '我的技能', count: personalSkills.value.length },
  { key: 'team-market' as const, name: '团队共享', count: teamMarketSkills.value.length },
  { key: 'recommended' as const, name: '官方推荐', count: officialRecommendedSkills.length },
]);

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
    const matchesCategory = selectedCategory.value === '全部' || skill.category === selectedCategory.value;
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
  openCardMenuId.value = null;
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

const openSkill = (skill: SkillCatalogItem) => {
  if (skillMode.value === 'recommended') return;
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
  showToast(didAdd ? `${skill.name} 已添加到我的技能` : `${skill.name} 已在我的技能中`);
};

const publishSkill = (skill: SkillCatalogItem) => {
  const didPublish = publishSkillToTeamMarket(skill.id);
  openCardMenuId.value = null;
  showToast(didPublish ? `${skill.name} 已共享至团队` : `${skill.name} 已在团队共享中`);
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
  showToast(`${skillName ?? skill?.name ?? '技能'} 已选择`);
  if (!skill) return;

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
  if (value === 'personal' || value === 'team-market' || value === 'recommended') return value;
  return null;
};

const findSkillForRoute = (skillId: string) =>
  [
    ...personalSkills.value,
    ...teamMarketSkills.value,
    ...officialRecommendedSkills,
  ].find((skill) => skill.id === skillId) ?? null;

const openRouteSkill = () => {
  const skillId = typeof route.query.skillId === 'string' ? route.query.skillId : '';
  if (!skillId) return;

  const routeSkillMode = normalizeSkillMode(route.query.skillMode);
  if (routeSkillMode) {
    skillMode.value = routeSkillMode;
  }

  if (routeSkillMode === 'recommended') {
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
    teamMarketSkills.value.length,
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
      <header v-if="!isDetailOpen" class="page-header">
        <div class="page-title-group">
          <span class="page-icon" aria-hidden="true">
            <Puzzle :size="22" />
          </span>
          <h1>技能库</h1>
        </div>

        <label class="search-control page-search">
          <Search :size="17" />
          <input v-model="searchKeyword" type="text" placeholder="搜索技能、描述、标签" />
        </label>
      </header>

      <section class="content-section" :class="{ 'detail-content-section': isDetailOpen }" aria-label="技能库管理">
        <template v-if="!selectedSkill">
          <header class="section-header">
            <div class="source-toolbar">
              <div class="source-leading">
                <div class="mode-tabs" aria-label="技能来源">
                  <button
                    v-for="tab in sourceTabs"
                    :key="tab.key"
                    class="mode-tab"
                    :class="{ active: skillMode === tab.key }"
                    type="button"
                    @click="setSkillMode(tab.key)"
                  >
                    <span>{{ tab.name }}</span>
                    <strong>{{ tab.count }}</strong>
                  </button>
                </div>
              </div>

              <div class="source-actions">
                <LibraryTypeDropdown v-model="selectedCategory" :options="categoryTabs" label="类型" />

                <button
                  class="create-mode-tab"
                  type="button"
                  @click="triggerCreateSkill"
                >
                  创建技能
                </button>
              </div>
            </div>
          </header>

          <div class="card-grid">
            <article
              v-for="skill in visibleSkills"
              :key="skill.id"
              class="managed-card"
              :class="{
                'recommend-card': skillMode !== 'personal',
                'preview-disabled': skillMode === 'recommended',
                'menu-open': openCardMenuId === `skill-${skill.id}`
              }"
              :tabindex="skillMode === 'recommended' ? undefined : 0"
              @click="openSkill(skill)"
              @keydown.enter.prevent="openSkill(skill)"
            >
              <button
                v-if="skillMode === 'personal'"
                class="card-more-btn"
                type="button"
                :aria-label="`${skill.name} 更多操作`"
                @click.stop="toggleCardMenu(`skill-${skill.id}`)"
              >
                <MoreHorizontal :size="20" />
              </button>
              <button
                v-else-if="skillMode === 'recommended'"
                class="add-btn"
                type="button"
                :disabled="isSkillAdded(skill)"
                @click.stop="addSkill(skill)"
              >
                <Check v-if="isSkillAdded(skill)" :size="15" />
                <Plus v-else :size="15" />
                <span>{{ isSkillAdded(skill) ? '已添加' : '添加' }}</span>
              </button>
              <button
                v-else
                class="add-btn"
                type="button"
                :disabled="isSkillAdded(skill)"
                @click.stop="addSkill(skill)"
              >
                <Check v-if="isSkillAdded(skill)" :size="15" />
                <Plus v-else :size="15" />
                <span>{{ isSkillAdded(skill) ? '已添加' : '添加' }}</span>
              </button>

              <div v-if="openCardMenuId === `skill-${skill.id}`" class="card-action-menu" @click.stop>
                <button class="menu-action" type="button" @click="selectSkill(skill)">
                  <Play :size="15" />
                  <span>使用技能</span>
                </button>
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
                <button class="menu-action" type="button" @click="publishSkill(skill)">
                  <UsersRound :size="15" />
                  <span>共享至团队</span>
                </button>
                <button class="menu-action danger" type="button" @click="deleteSkill(skill)">
                  <Trash2 :size="15" />
                  <span>删除</span>
                </button>
              </div>

              <div class="card-avatar" :style="getSkillAvatarStyle(skill)" aria-hidden="true"></div>
              <div class="card-copy">
                <h3>{{ skill.name }}</h3>
                <p>{{ skill.description }}</p>
              </div>
            </article>
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
  height: 100%;
  overflow-y: auto;
  padding: 24px 32px 40px;
  background: var(--bg-color);
}

.skill-template-view.detail-view {
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

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;
}

.page-title-group {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.page-header.compact {
  gap: 12px;
  margin-bottom: 12px;
}

.page-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--primary-color);
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}

.page-header.compact .page-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.page-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0;
}

.page-header.compact h1 {
  font-size: 22px;
}

.kind-tabs {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-shell .kind-tabs {
  margin-bottom: 12px;
}

.kind-tab {
  min-width: 112px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  transition: border-color 0.16s, background-color 0.16s, color 0.16s, box-shadow 0.16s;
}

.kind-tab strong {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 750;
}

.kind-tab:hover,
.kind-tab.active {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-color);
}

.kind-tab.active {
  box-shadow: 0 10px 26px color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.kind-tab.active strong {
  color: var(--primary-color);
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

.section-header {
  display: grid;
  gap: 10px;
  margin: 4px 0 18px;
}

.search-control {
  width: min(520px, 50%);
  min-width: 360px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-secondary);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.page-search {
  width: min(520px, 46%);
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

.source-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.source-leading {
  min-width: 0;
}

.source-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mode-tabs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.mode-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 10px;
  color: var(--text-strong);
  background: var(--surface-muted);
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.mode-tab:hover {
  background: var(--surface-soft);
}

.mode-tab strong {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
}

.mode-tab.active {
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
}

.mode-tab.active:hover {
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
}

.mode-tab.active strong {
  color: var(--primary-hover);
}

.create-mode-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 14px;
  border: 1px solid var(--primary-color);
  border-radius: 10px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary-color) 11%, transparent);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.create-mode-tab:hover {
  transform: translateY(-1px);
  color: var(--on-primary);
  background: var(--primary-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--primary-color) 15%, transparent);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 0;
}

.managed-card {
  position: relative;
  min-height: 110px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 16px 48px 16px 16px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.managed-card:hover {
  border-color: var(--primary-border);
  box-shadow: var(--shadow-card);
  transform: translateY(-1px);
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
  padding-right: 104px;
}

.card-avatar {
  width: 46px;
  height: 46px;
  overflow: hidden;
  border-radius: 11px;
  background-color: transparent;
  background-repeat: no-repeat;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.card-copy {
  min-width: 0;
  padding-top: 1px;
}

.managed-card h3 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: 0;
}

.managed-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-more-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-secondary);
}

.card-more-btn:hover {
  background: var(--surface-muted);
}

.add-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 58px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 9px;
  color: var(--on-primary);
  background: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
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
  top: 44px;
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

.card-action-menu button.danger {
  color: var(--diff-removed);
}

.card-action-menu button.danger svg {
  color: var(--diff-removed);
}

.card-action-menu button.danger:hover {
  background: var(--diff-removed-soft);
}

.kind-tab:focus-visible,
.search-control:focus-within,
.mode-tab:focus-visible,
.create-mode-tab:focus-visible,
.managed-card:focus-visible,
.card-more-btn:focus-visible,
.card-action-menu button:focus-visible,
.add-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (max-width: 980px) {
  .skill-template-view {
    padding: 18px 16px 28px;
  }

  .source-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .source-leading,
  .mode-tabs {
    width: 100%;
  }

  .source-actions {
    width: 100%;
    align-items: stretch;
    flex-wrap: wrap;
  }

  .search-control {
    width: 100%;
    min-width: 0;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .kind-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mode-tabs {
    flex-wrap: wrap;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .create-mode-tab {
    width: 100%;
    justify-content: center;
  }

  .page-header h1 {
    font-size: 21px;
  }
}
</style>
