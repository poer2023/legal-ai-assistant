<script setup lang="ts">
import { computed, ref } from 'vue';
import { Library, Plus, Search } from 'lucide-vue-next';
import { defaultTemplateAssets, type TemplateAsset } from '../data/legalAssets';

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

const emit = defineEmits<{
  (event: 'select', template: TemplateAsset): void;
  (event: 'create'): void;
  (event: 'manage'): void;
}>();

const searchKeyword = ref('');

const filteredTemplates = computed(() => {
  const keywordSource = props.showSearch ? searchKeyword.value : props.inlineQuery;
  const keyword = keywordSource.trim().toLowerCase();

  if (!keyword) {
    return defaultTemplateAssets;
  }

  return defaultTemplateAssets
    .filter((template) => {
      const searchableParts = props.showSearch
        ? [
            template.name,
            template.docType,
            template.source,
            template.agent,
            template.preview,
            ...template.applicableSkills,
            ...template.requiredFields,
            ...template.tags,
          ]
        : [template.name];

      return searchableParts
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    })
    .slice(0, 12);
});

const selectTemplate = (template: TemplateAsset) => {
  emit('select', template);
};

const createTemplate = () => {
  emit('create');
};

const manageTemplates = () => {
  emit('manage');
};
</script>

<template>
  <div class="template-dropdown-content">
    <label v-if="showSearch" class="template-search">
      <Search :size="15" />
      <input v-model="searchKeyword" type="text" placeholder="搜索模板、字段、适用场景" />
    </label>

    <section class="template-list" aria-label="模板">
      <button
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-item"
        type="button"
        @click.stop="selectTemplate(template)"
      >
        <span class="template-main">
          <span class="template-name">{{ template.name }}</span>
          <span class="template-desc">{{ template.docType }} / {{ template.applicableSkills.join('、') }}</span>
        </span>
      </button>

      <p v-if="filteredTemplates.length === 0" class="empty-tip">没有匹配的模板</p>
    </section>

    <div v-if="showManage" class="template-divider" aria-hidden="true"></div>

    <button
      v-if="showManage && showCreate"
      class="template-footer-row"
      type="button"
      @click.stop="createTemplate"
    >
      <Plus :size="16" :stroke-width="2.2" class="template-row-icon" />
      <span>新建模版</span>
    </button>

    <button v-if="showManage" class="template-footer-row" type="button" @click.stop="manageTemplates">
      <Library :size="16" :stroke-width="2.2" class="template-row-icon" />
      <span>管理模版</span>
    </button>
  </div>
</template>

<style scoped>
.template-dropdown-content {
  color: #475569;
}

.template-search {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 9px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  background: #f8fafc;
}

.template-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1e293b;
  font-size: 13px;
}

.template-list {
  max-height: 292px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.template-item {
  width: 100%;
  border-radius: 8px;
  text-align: left;
}

.template-item:hover {
  background: #f8fafc;
}

.template-main {
  min-width: 0;
  min-height: 50px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px 10px;
  color: #475569;
}

.template-name {
  width: 100%;
  overflow: hidden;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-desc {
  width: 100%;
  overflow: hidden;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tip {
  margin: 8px 10px 10px;
  color: #94a3b8;
  font-size: 13px;
}

.template-divider {
  height: 1px;
  margin: 7px 2px;
  background: #eef2f7;
}

.template-footer-row {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  text-align: left;
}

.template-footer-row:hover {
  background: #f8fafc;
}

.template-row-icon {
  flex-shrink: 0;
  color: #64748b;
}

.template-search:focus-within,
.template-item:focus-visible,
.template-footer-row:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}
</style>
