<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Info,
  LayoutTemplate,
  MoreHorizontal,
  Sparkles,
} from 'lucide-vue-next';
import { getTemplatesForSkill, type SkillTemplateOption } from '../data/legalAssets';
import {
  addRecommendedSkill,
  availableSkills,
  isAddedRecommendedSkill,
  isRecommendedSkill,
  recommendedSkills,
  type SkillCatalogItem,
} from '../data/skillCatalog';
import SkillDetailPanel from './SkillDetailPanel.vue';

type SkillMode = 'added' | 'recommended';

const skillMode = ref<SkillMode>('added');
const statusMessage = ref('');
const openCardMenuId = ref<string | null>(null);
const selectedSkill = ref<SkillCatalogItem | null>(null);
let statusTimer: ReturnType<typeof setTimeout> | null = null;
const router = useRouter();

const utilitySkillIds = new Set(['docx', 'pdf', 'xlsx']);

const addedSkills = computed(() => availableSkills.value);

const sortSkillsForLibrary = (skills: SkillCatalogItem[]) =>
  [...skills].sort((left, right) => {
    const leftIsUtility = utilitySkillIds.has(left.id);
    const rightIsUtility = utilitySkillIds.has(right.id);
    if (leftIsUtility === rightIsUtility) return 0;
    return leftIsUtility ? 1 : -1;
  });

const visibleSkills = computed(() =>
  sortSkillsForLibrary(skillMode.value === 'recommended' ? recommendedSkills : addedSkills.value),
);

const isDetailOpen = computed(() => Boolean(selectedSkill.value));

const activeSubtitle = computed(() => {
  if (skillMode.value === 'recommended') return '图中业务技能已上架，可直接在输入框和技能菜单中使用';
  return '将法律工作流、输出格式模板和校验规则转化为可复用技能';
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
  void router.push({
    name: 'home',
    query: {
      composerAction: 'skill',
      composerSource: 'library',
      composerTick: Date.now().toString(),
    },
  });
};

const addSkill = (skill: SkillCatalogItem) => {
  const didAdd = addRecommendedSkill(skill.id);
  setStatus(didAdd ? `${skill.name} 已添加` : `${skill.name} 已在技能列表中`);
};

const useSkillFromDetail = (skillName?: string) => {
  setStatus(`${skillName ?? selectedSkill.value?.name ?? '技能'} 已选择`);
};

const useTemplateFromDetail = (template: SkillTemplateOption) => {
  setStatus(`${template.name} 格式模板已选择`);
};

const isSkillAdded = (skill: SkillCatalogItem) =>
  !isRecommendedSkill(skill.id) || isAddedRecommendedSkill(skill.id);

const skillTemplates = (skill: SkillCatalogItem) => getTemplatesForSkill(skill);

const toggleCardMenu = (id: string) => {
  openCardMenuId.value = openCardMenuId.value === id ? null : id;
};

onBeforeUnmount(() => {
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
});
</script>

<template>
  <div class="skill-template-view" :class="{ 'detail-view': isDetailOpen }">
    <main class="library-shell" :class="{ 'detail-shell': isDetailOpen }">
      <header class="page-header" :class="{ compact: isDetailOpen }">
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
                  :class="{ active: skillMode === 'added' }"
                  type="button"
                  @click="setSkillMode('added')"
                >
                  已添加
                </button>
                <button
                  class="mode-tab recommend-entry"
                  :class="{ active: skillMode === 'recommended' }"
                  type="button"
                  @click="setSkillMode('recommended')"
                >
                  推荐技能
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
              :class="{ 'recommend-card': skillMode === 'recommended' }"
              tabindex="0"
              @click="openSkill(skill)"
              @keydown.enter.prevent="openSkill(skill)"
            >
              <button
                v-if="skillMode === 'added'"
                class="card-more-btn"
                type="button"
                :aria-label="`${skill.name} 更多操作`"
                @click.stop="toggleCardMenu(`skill-${skill.id}`)"
              >
                <MoreHorizontal :size="20" />
              </button>
              <button
                v-else
                class="add-btn"
                type="button"
                :disabled="isSkillAdded(skill)"
                @click.stop="addSkill(skill)"
              >
                {{ isSkillAdded(skill) ? '已上架' : '添加' }}
              </button>

              <div v-if="openCardMenuId === `skill-${skill.id}`" class="card-action-menu" @click.stop>
                <button type="button" @click="openSkill(skill)">查看详情</button>
                <button type="button" @click="selectSkill(skill)">选择技能</button>
                <button type="button" @click="triggerCreateSkill">创建技能</button>
              </div>

              <h3>{{ skill.name }}</h3>
              <p>{{ skill.description }}</p>
              <div v-if="skillTemplates(skill).length" class="card-template-row" aria-label="模板">
                <span class="format-count">
                  <LayoutTemplate :size="13" />
                  模板×{{ skillTemplates(skill).length }}
                </span>
                <span
                  v-for="template in skillTemplates(skill).slice(0, 2)"
                  :key="template.id"
                  class="template-chip"
                >
                  {{ template.name }}
                </span>
              </div>
              <span class="card-count">{{ skill.files.length }} 个文件</span>
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
          @use-template="useTemplateFromDetail"
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
  background: #f8fafc;
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
  border: 1px solid #dbe4f0;
  border-radius: 12px;
  color: #2563eb;
  background: #ffffff;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
}

.page-header.compact .page-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.page-header h1 {
  margin: 0;
  color: #0f172a;
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
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  background: #ffffff;
  color: #475569;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  transition: border-color 0.16s, background-color 0.16s, color 0.16s, box-shadow 0.16s;
}

.kind-tab strong {
  margin-left: auto;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 750;
}

.kind-tab:hover,
.kind-tab.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.kind-tab.active {
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.12);
}

.kind-tab.active strong {
  color: #2563eb;
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
  color: #171717;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.35;
}

.section-subtitle svg {
  flex-shrink: 0;
  color: #8c8c8c;
}

.status-text {
  margin-left: auto;
  color: #2563eb;
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
  color: #111827;
  background: #f4f4f4;
  font-size: 14px;
  font-weight: 650;
  line-height: 1;
}

.mode-tab:hover {
  background: #e9e9e9;
}

.mode-tab.active {
  color: #ffffff;
  background: #151515;
}

.mode-tab.recommend-entry {
  color: #1d4ed8;
  background: #dbeafe;
}

.mode-tab.recommend-entry.active,
.mode-tab.recommend-entry:hover {
  color: #1d4ed8;
  background: #bfdbfe;
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
  padding: 20px 48px 42px 20px;
  border: 1px solid #dedede;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.managed-card:hover {
  border-color: #c6d3e6;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.managed-card.recommend-card {
  padding-right: 104px;
}

.managed-card h3 {
  margin: 0 0 14px;
  color: #151515;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: 0;
}

.managed-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #707070;
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-template-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.format-count,
.template-chip {
  height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 160px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.format-count {
  color: #2563eb;
  background: #eff6ff;
}

.format-count svg {
  flex-shrink: 0;
}

.template-chip {
  overflow: hidden;
  color: #475569;
  background: #f1f5f9;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-count {
  position: absolute;
  right: 20px;
  bottom: 16px;
  color: #8c8c8c;
  font-size: 13px;
  font-weight: 400;
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
  color: #707070;
}

.card-more-btn:hover {
  background: #f5f5f5;
}

.add-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  min-width: 58px;
  height: 30px;
  padding: 0 12px;
  border-radius: 9px;
  color: #ffffff;
  background: #2563eb;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
}

.add-btn:hover {
  background: #1d4ed8;
}

.add-btn:disabled {
  color: #8c8c8c;
  background: #f4f4f4;
  cursor: default;
}

.card-action-menu {
  position: absolute;
  top: 44px;
  right: 14px;
  z-index: 5;
  min-width: 112px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.card-action-menu button {
  width: 100%;
  min-height: 32px;
  padding: 0 9px;
  border-radius: 7px;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.card-action-menu button:hover {
  background: #f8fafc;
}

.kind-tab:focus-visible,
.mode-tab:focus-visible,
.managed-card:focus-visible,
.card-more-btn:focus-visible,
.card-action-menu button:focus-visible,
.add-btn:focus-visible {
  outline: 2px solid #60a5fa;
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
