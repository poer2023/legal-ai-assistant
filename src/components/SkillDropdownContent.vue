<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Puzzle,
  Search,
} from 'lucide-vue-next';
import { availableSkills, type SkillCatalogItem } from '../data/skillCatalog';

export type SkillDropdownSelection = string;

type SkillDropdownItem = Pick<SkillCatalogItem, 'id' | 'name' | 'description'> & {
  selection: string;
};

const props = withDefaults(defineProps<{
  inlineQuery?: string;
  showSearch?: boolean;
  showCreate?: boolean;
  showManage?: boolean;
}>(), {
  inlineQuery: '',
  showSearch: false,
  showCreate: true,
  showManage: true,
});

const searchKeyword = ref('');

const emit = defineEmits<{
  (event: 'select', selection?: SkillDropdownSelection): void;
  (event: 'manage'): void;
}>();

const hiddenDefaultSkillIds = new Set(['docx', 'pdf', 'xlsx']);

const builtInCommandSkills: SkillDropdownItem[] = [
  {
    id: 'skill-creator',
    name: 'skill-creator',
    description: '创建一个可复用的法律工作流技能。',
    selection: 'skill-creator',
  },
];

const skillItems = computed<SkillDropdownItem[]>(() => [
  ...builtInCommandSkills,
  ...availableSkills.value
    .filter((skill) => !hiddenDefaultSkillIds.has(skill.id))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      selection: skill.name,
    })),
]);

const filterKeywords = computed(() =>
  [props.inlineQuery, props.showSearch ? searchKeyword.value : '']
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

const filteredSkills = computed(() => {
  const keywords = filterKeywords.value;
  if (!keywords.length) return skillItems.value;

  return skillItems.value.filter((skill) => {
    const searchable = [
      skill.name,
      skill.id,
      skill.description,
    ]
      .join(' ')
      .toLowerCase();

    return keywords.every((keyword) => searchable.includes(keyword));
  });
});

const selectSkill = (skill: SkillDropdownItem) => {
  emit('select', skill.selection);
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
    <label v-if="showSearch" class="skill-search">
      <Search :size="15" />
      <input v-model="searchKeyword" type="text" placeholder="搜索技能、描述" />
    </label>

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
        <Puzzle :size="16" :stroke-width="2.2" class="skill-row-icon" />
        <span>创建技能</span>
      </button>

      <button class="skill-footer-row" type="button" @click.stop="manageSkills">
        <Puzzle :size="16" :stroke-width="2.2" class="skill-row-icon" />
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

.skill-search {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 9px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  background: var(--bg-color);
  flex-shrink: 0;
}

.skill-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 13px;
}

.skill-search input::placeholder {
  color: var(--text-muted);
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

.skill-search:focus-within,
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
