<script setup lang="ts">
import {
  MessageCirclePlus,
  SlidersHorizontal,
} from 'lucide-vue-next';
import type { SkillCatalogItem } from '../data/skillCatalog';
import { availableSkills } from '../data/skillCatalog';

const emit = defineEmits<{
  (event: 'select', skillName?: string): void;
  (event: 'manage'): void;
}>();

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
  <div class="skill-dropdown-content">
    <section class="skill-list" aria-label="技能">
      <button
        v-for="skill in availableSkills"
        :key="skill.id"
        class="skill-item"
        type="button"
        @click.stop="selectSkill(skill)"
      >
        <span class="skill-name">{{ skill.name }}</span>
        <span class="skill-desc">{{ skill.description }}</span>
      </button>
    </section>

    <div class="skill-divider" aria-hidden="true"></div>

    <section class="skill-footer-actions" aria-label="技能操作">
      <button class="skill-footer-row" type="button" @click.stop="createSkill">
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
  color: #475569;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-item {
  width: 100%;
  min-height: 50px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: left;
  color: #475569;
  transition: background-color 0.15s;
}

.skill-item:hover {
  background: #f8fafc;
}

.skill-name {
  width: 100%;
  overflow: hidden;
  color: #334155;
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
  color: #94a3b8;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-divider {
  height: 1px;
  margin: 7px 2px;
  background: #eef2f7;
}

.skill-footer-actions {
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
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  text-align: left;
}

.skill-footer-row:hover {
  background: #f8fafc;
}

.skill-row-icon {
  flex-shrink: 0;
  color: #64748b;
}

.skill-item:focus-visible,
.skill-footer-row:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .skill-item {
    min-height: 48px;
  }
}
</style>
