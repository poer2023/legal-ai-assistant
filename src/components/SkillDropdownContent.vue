<script setup lang="ts">
import { computed } from 'vue';
import {
  MessageCirclePlus,
  SlidersHorizontal,
} from 'lucide-vue-next';
import type { SkillCatalogItem } from '../data/skillCatalog';
import { availableSkills } from '../data/skillCatalog';
import { getTemplatesForSkill, type SkillTemplateOption } from '../data/legalAssets';

export type SkillDropdownSelection = string | {
  skillName: string;
  template: SkillTemplateOption;
};

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

const templateMap = computed(() => {
  return new Map(availableSkills.value.map((skill) => [skill.id, getTemplatesForSkill(skill)]));
});

const templatesForSkill = (skill: SkillCatalogItem) => templateMap.value.get(skill.id) ?? [];

const filteredSkills = computed(() => {
  const keyword = props.inlineQuery.trim().toLowerCase();

  if (!keyword) return availableSkills.value.filter((skill) => !hiddenDefaultSkillIds.has(skill.id));

  return availableSkills.value.filter((skill) => {
    const templates = templatesForSkill(skill);
    const searchable = [
      skill.name,
      skill.id,
      skill.description,
      ...templates.flatMap((template) => [
        template.name,
        template.docType,
        template.source,
        template.preview,
        ...template.requiredFields,
        ...template.tags,
      ]),
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
            <span v-if="templatesForSkill(skill).length" class="format-count">
              模板×{{ templatesForSkill(skill).length }}
            </span>
          </span>
          <span class="skill-desc">{{ skill.description }}</span>
        </div>
      </article>

      <p v-if="filteredSkills.length === 0" class="empty-tip">没有匹配的技能或格式模板</p>
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
  color: #475569;
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
  background: #cbd5e1;
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
  color: #475569;
  transition: background-color 0.15s;
}

.skill-item:hover {
  background: #f8fafc;
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
  color: #334155;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.format-count {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
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

.empty-tip {
  margin: 8px 10px 10px;
  color: #94a3b8;
  font-size: 13px;
}

.skill-divider {
  flex-shrink: 0;
  height: 1px;
  margin: 7px 2px;
  background: #eef2f7;
}

.skill-footer-actions {
  position: static;
  flex-shrink: 0;
  padding-top: 2px;
  background: #ffffff;
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
.skill-main:focus-visible,
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
