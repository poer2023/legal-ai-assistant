<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  FileText,
  Library,
  Search,
} from 'lucide-vue-next';
import { templateAssets, type TemplateAsset } from '../data/legalAssets';
import TemplateDetailPanel from './TemplateDetailPanel.vue';

const searchKeyword = ref('');
const selectedCategory = ref('全部');
const selectedTemplate = ref<TemplateAsset | null>(null);

const templateFilePath = (template: TemplateAsset) => `assets/templates/${template.id}.md`;
const isDetailOpen = computed(() => Boolean(selectedTemplate.value));
const categoryTabs = computed(() => {
  const counts = new Map<string, number>();
  templateAssets.forEach((template) => {
    counts.set(template.docType, (counts.get(template.docType) ?? 0) + 1);
  });

  return [
    { name: '全部', count: templateAssets.length },
    ...Array.from(counts, ([name, count]) => ({ name, count })),
  ];
});

const filteredTemplates = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return templateAssets.filter((template) => {
    const matchesCategory = selectedCategory.value === '全部' || template.docType === selectedCategory.value;
    const searchable = [
      template.name,
      template.docType,
      template.source,
      template.agent,
      template.preview,
      ...template.requiredFields,
      ...template.applicableSkills,
      ...template.tags,
    ]
      .join(' ')
      .toLowerCase();

    return matchesCategory && (!keyword || searchable.includes(keyword));
  });
});

const setCategory = (categoryName: string) => {
  selectedCategory.value = categoryName;
};

const openTemplate = (template: TemplateAsset) => {
  selectedTemplate.value = template;
};

const backToList = () => {
  selectedTemplate.value = null;
};

const resetFilters = () => {
  searchKeyword.value = '';
};
</script>

<template>
  <div class="templates-view" :class="{ 'detail-view': isDetailOpen }">
    <main class="templates-shell" :class="{ 'detail-shell': isDetailOpen }">
      <TemplateDetailPanel
        v-if="selectedTemplate"
        class="template-page-detail"
        :template="selectedTemplate"
        layout="page"
        @back="backToList"
      />

      <template v-else>
        <header class="page-header">
          <span class="page-icon" aria-hidden="true">
            <Library :size="22" />
          </span>
          <h1>模板库</h1>
        </header>

        <section class="content-section" aria-label="模板库管理">
          <header class="section-header">
            <div class="section-toolbar">
              <p class="section-subtitle">合同、尽调、法律意见等标准文书模板文件</p>

              <label class="search-control">
                <Search :size="17" />
                <input v-model="searchKeyword" type="text" placeholder="搜索模板、字段、适用场景" />
              </label>
            </div>
          </header>

          <nav class="category-tabs" aria-label="模板分类">
            <button
              v-for="tab in categoryTabs"
              :key="tab.name"
              class="category-tab"
              :class="{ active: selectedCategory === tab.name }"
              type="button"
              @click="setCategory(tab.name)"
            >
              <span>{{ tab.name }}</span>
              <strong>{{ tab.count }}</strong>
            </button>
          </nav>

          <section class="template-section" aria-label="模板文件列表">
            <div class="list-heading">
              <div class="list-title">
                <FileText :size="18" />
                <span>法律模板文件</span>
              </div>
              <span class="result-count">{{ filteredTemplates.length }} 项</span>
            </div>

            <div v-if="filteredTemplates.length" class="template-grid">
              <article
                v-for="template in filteredTemplates"
                :key="template.id"
                class="managed-template-card"
                :title="`${template.name}\n${templateFilePath(template)}`"
                tabindex="0"
                @click="openTemplate(template)"
                @keydown.enter.prevent="openTemplate(template)"
              >
                <div class="thumbnail-page" aria-hidden="true">
                  <div class="thumbnail-topline">
                    <FileText :size="12" />
                    <span>{{ template.docType }}</span>
                  </div>
                  <strong>{{ template.name }}</strong>
                  <span class="thumb-line wide"></span>
                  <span class="thumb-line"></span>
                  <span class="thumb-line short"></span>
                  <div class="thumbnail-table">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>

                <div class="tile-caption">
                  <h2>{{ template.name }}</h2>
                  <div class="tile-meta">
                    <span>{{ template.source }}</span>
                    <span>{{ template.updatedAt }}</span>
                  </div>
                </div>
              </article>
            </div>

            <div v-else class="empty-state">
              <FileText :size="22" />
              <strong>未找到匹配模板</strong>
              <span>调整分类或关键词后再试。</span>
              <button class="reset-btn active" type="button" @click="resetFilters">清空搜索</button>
            </div>
          </section>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.templates-view {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 24px 32px 40px;
  background: var(--bg-color);
  color: var(--text-main);
}

.templates-view.detail-view {
  overflow: hidden;
  padding-bottom: 8px;
}

.templates-shell {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  transition: max-width 0.18s ease;
}

.templates-shell.detail-shell {
  max-width: 1180px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.template-page-detail {
  flex: 1;
  min-height: 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
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

.page-header h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0;
}

.content-section {
  min-height: 360px;
}

.section-header {
  margin: 4px 0 16px;
}

.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.section-subtitle {
  min-width: 0;
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.35;
}

.search-control {
  width: min(380px, 100%);
  height: 40px;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
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

.category-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.category-tab {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.category-tab strong {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
}

.category-tab:hover,
.category-tab.active {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-color);
}

.category-tab.active {
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.category-tab.active strong {
  color: var(--primary-color);
}

.list-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.reset-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.reset-btn {
  border: 1px solid var(--border-color);
  background: var(--surface-muted);
  color: var(--text-main);
}

.reset-btn:not(:disabled):hover,
.reset-btn.active {
  border-color: var(--primary-border);
  background: var(--primary-soft);
  color: var(--primary-color);
  transform: translateY(-1px);
}

.reset-btn:disabled {
  color: var(--text-muted);
  cursor: default;
  opacity: 0.62;
}

.template-section {
  min-width: 0;
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.result-count {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 20px 18px;
}

.managed-template-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease;
}

.managed-template-card:hover {
  transform: translateY(-1px);
}

.managed-template-card:focus {
  outline: none;
}

.managed-template-card:focus-visible,
.category-tab:focus-visible,
.reset-btn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.thumbnail-page {
  width: min(116px, 100%);
  min-height: 154px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-self: center;
  padding: 14px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--text-strong) 10%, transparent);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.managed-template-card:hover .thumbnail-page {
  border-color: var(--primary-border);
  box-shadow: 0 16px 34px color-mix(in srgb, var(--primary-color) 16%, transparent);
}

.thumbnail-topline {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--primary-color);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.thumbnail-topline svg {
  flex-shrink: 0;
}

.thumbnail-topline span,
.thumbnail-page strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thumbnail-page strong {
  color: var(--text-strong);
  font-size: 11px;
  font-weight: 750;
  line-height: 1.2;
}

.thumb-line {
  width: 82%;
  height: 5px;
  display: block;
  border-radius: 999px;
  background: var(--border-soft);
}

.thumb-line.wide {
  width: 100%;
}

.thumb-line.short {
  width: 58%;
}

.thumbnail-table {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  margin-top: auto;
}

.thumbnail-table span {
  min-height: 18px;
  border: 1px solid var(--border-soft);
  border-radius: 3px;
  background: var(--surface-muted);
}

.tile-caption {
  min-width: 0;
  padding: 0 4px;
}

.tile-caption h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-meta {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.2;
}

.tile-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-meta span + span::before {
  content: '';
  width: 3px;
  height: 3px;
  display: inline-block;
  margin: 0 6px 2px 0;
  border-radius: 50%;
  background: var(--text-muted);
}

.empty-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-bg);
  color: var(--text-secondary);
  text-align: center;
}

.empty-state svg {
  color: var(--primary-color);
}

.empty-state strong {
  color: var(--text-strong);
  font-size: 16px;
}

.empty-state span {
  font-size: 13px;
}

@media (max-width: 900px) {
  .templates-view {
    padding: 18px 16px 28px;
  }

  .section-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .search-control {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .template-grid {
    grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
    gap: 16px 12px;
  }

  .page-header h1 {
    font-size: 21px;
  }

  .thumbnail-page {
    min-height: 134px;
    padding: 12px 10px;
  }
}
</style>
