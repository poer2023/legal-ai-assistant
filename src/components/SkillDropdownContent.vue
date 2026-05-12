<script setup lang="ts">
import { computed } from 'vue';
import {
  MessageCirclePlus,
  SlidersHorizontal,
} from 'lucide-vue-next';
import { availableSkills, type SkillCatalogItem } from '../data/skillCatalog';

export type SkillDropdownSelection = string;

const props = withDefaults(defineProps<{
  inlineQuery?: string;
  showCreate?: boolean;
  showManage?: boolean;
}>(), {
  inlineQuery: '',
  showCreate: true,
  showManage: true,
});

const emit = defineEmits<{
  (event: 'select', selection?: SkillDropdownSelection): void;
  (event: 'manage'): void;
}>();

const hiddenDefaultSkillIds = new Set(['docx', 'pdf', 'xlsx']);

const filteredSkills = computed(() => {
  const keyword = props.inlineQuery.trim().toLowerCase();

  if (!keyword) return availableSkills.value.filter((skill) => !hiddenDefaultSkillIds.has(skill.id));

  return availableSkills.value.filter((skill) => {
    const searchable = [
      skill.name,
      skill.id,
      skill.description,
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(keyword);
  });
});

const selectSkill = (skill: SkillCatalogItem) => {
  emit('select', skill.name);
};

const createSkill = () => {
  emit('select', 'skill-creator');
};

const manageSkills = () => {
  emit('manage');
};
</script>

<template>
  <div class="skill-dropdown-content" :class="{ 'inline-layout': !showManage }">
    <section class="skill-list" aria-label="技能">
      <article
        v-for="skill in filteredSkills"
        :key="skill.id"
        class="skill-item"
        role="button"
        tabindex="0"
        @click="selectSkill(skill)"
        @keydown.enter.self.prevent="selectSkill(skill)"
      >
        <div class="skill-main">
          <span class="skill-heading">
            <span class="skill-name">{{ skill.name }}</span>
          </span>
          <span class="skill-desc">{{ skill.description }}</span>
        </div>
      </article>

      <p v-if="filteredSkills.length === 0" class="empty-tip">没有匹配的技能</p>
    </section>

    <div v-if="showManage" class="skill-divider" aria-hidden="true"></div>

    <section v-if="showManage" class="skill-footer-actions" aria-label="技能操作">
      <button v-if="showCreate" class="skill-footer-row" type="button" @click.stop="createSkill">
        <MessageCirclePlus :size="16" :stroke-width="2.2" class="skill-row-icon" />
        <span>创建技能</span>
      </button>

      <button class="skill-footer-row" type="button" @click.stop="manageSkills">
        <SlidersHorizontal :size="16" :stroke-width="2.2" class="skill-row-icon" />
        <span>管理技能</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.skill-dropdown-content {
  height: min(292px, calc(100vh - 360px));
  display: flex;
  flex-direction: column;
  min-height: 0;
  color: var(--text-secondary);
}

.skill-dropdown-content.inline-layout {
  height: auto;
  max-height: min(300px, calc(100vh - 260px));
}

.skill-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-list::-webkit-scrollbar {
  width: 6px;
}

.skill-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--border-color);
}

.skill-item {
  width: 100%;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 7px 10px;
  border-radius: 8px;
  text-align: left;
  color: var(--text-secondary);
  transition: background-color 0.15s;
}

.skill-item:hover {
  background: var(--bg-color);
}

.skill-main {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
}

.skill-heading {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-desc {
  width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tip {
  margin: 8px 10px 10px;
  color: var(--text-muted);
  font-size: 13px;
}

.skill-divider {
  flex-shrink: 0;
  height: 1px;
  margin: 7px 2px;
  background: var(--border-soft);
}

.skill-footer-actions {
  position: static;
  flex-shrink: 0;
  padding-top: 2px;
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-footer-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  text-align: left;
}

.skill-footer-row:hover {
  background: var(--bg-color);
}

.skill-row-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.skill-item:focus-visible,
.skill-main:focus-visible,
.skill-footer-row:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .skill-item {
    min-height: 48px;
  }
}
</style>
