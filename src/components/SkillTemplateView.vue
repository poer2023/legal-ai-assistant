<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Check,
  Download,
  Info,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Sparkles,
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
import SkillDetailPanel from './SkillDetailPanel.vue';
import SkillManageModal from './SkillManageModal.vue';

type SkillMode = 'personal' | 'team-market' | 'recommended';

const skillMode = ref<SkillMode>('personal');
const statusMessage = ref('');
const openCardMenuId = ref<string | null>(null);
const selectedSkill = ref<SkillCatalogItem | null>(null);
const showSkillManageModal = ref(false);
let statusTimer: ReturnType<typeof setTimeout> | null = null;
const router = useRouter();

const utilitySkillIds = new Set(['docx', 'pdf', 'xlsx']);

const sortSkillsForLibrary = (skills: SkillCatalogItem[]) =>
  [...skills].sort((left, right) => {
    const leftIsUtility = utilitySkillIds.has(left.id);
    const rightIsUtility = utilitySkillIds.has(right.id);
    if (leftIsUtility === rightIsUtility) return 0;
    return leftIsUtility ? 1 : -1;
  });

const visibleSkills = computed(() =>
  sortSkillsForLibrary(
    {
      personal: personalSkills.value,
      'team-market': teamMarketSkills.value,
      recommended: officialRecommendedSkills,
    }[skillMode.value],
  ),
);

const isDetailOpen = computed(() => Boolean(selectedSkill.value));

const activeSubtitle = computed(() => {
  if (skillMode.value === 'team-market') return '团队共享中的技能对全员可见，可直接使用，也可添加到自己的技能库';
  if (skillMode.value === 'recommended') return '从推荐技能中挑选常用工作流，一键添加后即可使用';
  return '这里是已添加和创建的可复用技能';
});

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

const clearDetail = () => {
  selectedSkill.value = null;
};

const setSkillMode = (mode: SkillMode) => {
  skillMode.value = mode;
  openCardMenuId.value = null;
  clearDetail();
};

const selectSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  setStatus(`${skill.name} 已选择`);
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
  showSkillManageModal.value = true;
};

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addPersonalSkill(skill.id);
  setStatus(didAdd ? `${skill.name} 已添加` : `${skill.name} 已添加`);
};

const publishSkill = (skill: SkillCatalogItem) => {
  const didPublish = publishSkillToTeamMarket(skill.id);
  openCardMenuId.value = null;
  setStatus(didPublish ? `${skill.name} 已共享至团队` : `${skill.name} 已共享至团队`);
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

const downloadSkill = (skill: SkillCatalogItem) => {
  openCardMenuId.value = null;
  downloadText(`${skill.name}-skill-bundle.md`, createSkillBundleContent(skill));
};

const editSkill = (skill: SkillCatalogItem) => {
  openSkill(skill);
};

const deleteSkill = (skill: SkillCatalogItem) => {
  const didRemove = removePersonalSkill(skill.id);
  openCardMenuId.value = null;
  setStatus(didRemove ? `${skill.name} 已删除` : '默认技能不可删除');
};

const useSkillFromDetail = (skillName?: string) => {
  const skill = selectedSkill.value;
  setStatus(`${skillName ?? skill?.name ?? '技能'} 已选择`);
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

const useSkillNameFromModal = (skillName?: string) => {
  if (!skillName) return;
  void router.push({
    name: 'home',
    query: {
      composerAction: 'use-skill',
      skillName,
      composerTick: Date.now().toString(),
    },
  });
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

onMounted(() => {
  document.addEventListener('click', closeCardMenuOnOutsideClick);
});

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  document.removeEventListener('click', closeCardMenuOnOutsideClick);
});
</script>

<template>
  <div class="skill-template-view" :class="{ 'detail-view': isDetailOpen }">
    <main class="library-shell" :class="{ 'detail-shell': isDetailOpen }">
      <header v-if="!isDetailOpen" class="page-header">
        <span class="page-icon" aria-hidden="true">
          <Sparkles :size="22" />
        </span>
        <h1>技能库</h1>
      </header>

      <section class="content-section" :class="{ 'detail-content-section': isDetailOpen }" aria-label="技能库管理">
        <template v-if="!selectedSkill">
          <header class="section-header">
            <div class="section-toolbar">
              <p class="section-subtitle">
                <span>{{ activeSubtitle }}</span>
                <Info :size="17" :stroke-width="2" />
              </p>
              <span v-if="statusMessage" class="status-text">{{ statusMessage }}</span>

              <div class="mode-tabs" aria-label="技能分类">
                <button
                  class="mode-tab"
                  :class="{ active: skillMode === 'personal' }"
                  type="button"
                  @click="setSkillMode('personal')"
                >
                  我的技能
                </button>
                <button
                  class="mode-tab"
                  :class="{ active: skillMode === 'team-market' }"
                  type="button"
                  @click="setSkillMode('team-market')"
                >
                  团队共享
                </button>
                <button
                  class="mode-tab"
                  :class="{ active: skillMode === 'recommended' }"
                  type="button"
                  @click="setSkillMode('recommended')"
                >
                  推荐
                </button>
                <button
                  class="mode-tab"
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
              :class="{ 'recommend-card': skillMode !== 'personal', 'menu-open': openCardMenuId === `skill-${skill.id}` }"
              tabindex="0"
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
                <button class="menu-action" type="button" @click="editSkill(skill)">
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

              <h3>{{ skill.name }}</h3>
              <p>{{ skill.description }}</p>
            </article>
          </div>
        </template>

        <SkillDetailPanel
          v-else-if="selectedSkill"
          class="library-detail-panel"
          :skill="selectedSkill"
          layout="page"
          @back="backToList"
          @use="useSkillFromDetail"
        />
      </section>

    </main>

    <SkillManageModal
      v-if="showSkillManageModal"
      start-in-create
      @close="showSkillManageModal = false"
      @use="useSkillNameFromModal"
    />
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
  max-width: 900px;
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
  gap: 14px;
  margin-bottom: 14px;
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
  margin: 4px 0 18px;
}

.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.section-subtitle {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.35;
}

.section-subtitle svg {
  flex-shrink: 0;
  color: var(--text-muted);
}

.status-text {
  margin-left: auto;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.mode-tabs {
  display: flex;
  align-items: center;
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

.mode-tab.active {
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
}

.mode-tab.active:hover {
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 0;
}

.managed-card {
  position: relative;
  min-height: 142px;
  padding: 20px 48px 24px 20px;
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

.managed-card.menu-open {
  z-index: 30;
}

.managed-card.recommend-card {
  padding-right: 104px;
}

.managed-card h3 {
  margin: 0 0 14px;
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
.mode-tab:focus-visible,
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

  .section-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .status-text {
    margin-left: 0;
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

  .page-header h1 {
    font-size: 21px;
  }
}
</style>
