<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  FileText,
  Filter,
  Layers,
  Library,
  Search,
  X,
} from 'lucide-vue-next';
import { templateAssets, type TemplateAsset } from '../data/legalAssets';

const searchKeyword = ref('');
const selectedDocType = ref('全部');
const selectedSource = ref('全部');
const selectedSkill = ref('全部');
const selectedTemplate = ref<TemplateAsset | null>(null);

const docTypes = computed(() => ['全部', ...new Set(templateAssets.map((template) => template.docType))]);
const sources = computed(() => ['全部', ...new Set(templateAssets.map((template) => template.source))]);
const skillOptions = computed(() => [
  '全部',
  ...new Set(templateAssets.flatMap((template) => template.applicableSkills)),
]);
const templateFilePath = (template: TemplateAsset) => `assets/templates/${template.id}.md`;
const templatesBySkill = computed(() => {
  const counts = new Map<string, number>();
  templateAssets.forEach((template) => {
    template.applicableSkills.forEach((skillName) => {
      counts.set(skillName, (counts.get(skillName) ?? 0) + 1);
    });
  });
  return counts;
});
const multiTemplateSkillCount = computed(
  () => Array.from(templatesBySkill.value.values()).filter((count) => count > 1).length,
);

const filteredTemplates = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return templateAssets.filter((template) => {
    const matchesDocType = selectedDocType.value === '全部' || template.docType === selectedDocType.value;
    const matchesSource = selectedSource.value === '全部' || template.source === selectedSource.value;
    const matchesSkill =
      selectedSkill.value === '全部' || template.applicableSkills.includes(selectedSkill.value);
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

    return matchesDocType && matchesSource && matchesSkill && (!keyword || searchable.includes(keyword));
  });
});

const openTemplate = (template: TemplateAsset) => {
  selectedTemplate.value = template;
};
</script>

<template>
  <div class="templates-view">
    <div class="templates-wrapper">
      <header class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <Library :size="24" />
          </div>
          <div>
            <h1 class="page-title">法律模板文件</h1>
            <p class="page-subtitle">合同、尽调、法律意见等标准文书模板文件</p>
          </div>
        </div>

        <label class="search-box">
          <Search :size="18" />
          <input v-model="searchKeyword" type="text" placeholder="搜索模板、字段、适用场景" />
        </label>
      </header>

      <section class="summary-grid">
        <article class="summary-card">
          <span>模板文件总数</span>
          <strong>{{ templateAssets.length }}</strong>
        </article>
        <article class="summary-card">
          <span>多模板技能</span>
          <strong>{{ multiTemplateSkillCount }}</strong>
        </article>
        <article class="summary-card">
          <span>文档类型</span>
          <strong>{{ docTypes.length - 1 }}</strong>
        </article>
      </section>

      <section class="filter-panel">
        <div class="filter-heading">
          <Filter :size="16" />
          <span>筛选模板文件</span>
        </div>

        <div class="filter-group">
          <label>文档类型</label>
          <select v-model="selectedDocType">
            <option v-for="docType in docTypes" :key="docType" :value="docType">{{ docType }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>来源</label>
          <select v-model="selectedSource">
            <option v-for="source in sources" :key="source" :value="source">{{ source }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>适用技能</label>
          <select v-model="selectedSkill">
            <option v-for="skill in skillOptions" :key="skill" :value="skill">{{ skill }}</option>
          </select>
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <div class="section-title">
            <Layers :size="18" />
            <span>法律模板卡片</span>
          </div>
          <span class="result-count">{{ filteredTemplates.length }} 项</span>
        </div>

        <div class="template-grid">
          <article v-for="template in filteredTemplates" :key="template.id" class="template-card">
            <div class="card-topline">
              <span class="type-pill">{{ template.docType }}</span>
              <span class="source-label">{{ template.source }}</span>
            </div>
            <h2>{{ template.name }}</h2>
            <p>{{ template.preview }}</p>

            <div class="card-meta">
              <span>
                <BookOpenCheck :size="14" />
                {{ template.agent }}
              </span>
              <span>
                <CalendarDays :size="14" />
                {{ template.updatedAt }}
              </span>
            </div>

            <div class="file-path-row">
              <FileText :size="14" />
              <span>{{ templateFilePath(template) }}</span>
            </div>

            <div class="field-list">
              <span v-for="field in template.requiredFields.slice(0, 4)" :key="field">{{ field }}</span>
            </div>

            <div class="card-actions">
              <button class="ghost-btn" @click="openTemplate(template)">预览</button>
              <button class="primary-btn" @click="openTemplate(template)">查看详情</button>
            </div>
          </article>
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <div class="section-title">
            <FileText :size="18" />
            <span>法律模板文件</span>
          </div>
        </div>

        <div class="template-table">
          <div class="table-head">
            <span>模板文件</span>
            <span>类型</span>
            <span>关联技能</span>
            <span>来源</span>
            <span>更新时间</span>
            <span>操作</span>
          </div>
          <div v-for="template in filteredTemplates" :key="`row-${template.id}`" class="table-row">
            <div class="template-name">
              <strong>{{ template.name }}</strong>
              <span>{{ templateFilePath(template) }}</span>
            </div>
            <span>{{ template.docType }}</span>
            <span>{{ template.agent }}</span>
            <span>{{ template.source }}</span>
            <span>{{ template.updatedAt }}</span>
            <div class="row-actions">
              <button class="ghost-btn" @click="openTemplate(template)">预览</button>
              <button class="primary-btn" @click="openTemplate(template)">查看</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="selectedTemplate" class="drawer-backdrop" @click.self="selectedTemplate = null">
      <aside class="detail-drawer">
        <button class="close-btn" aria-label="关闭模板预览" @click="selectedTemplate = null">
          <X :size="20" />
        </button>
        <span class="type-pill">{{ selectedTemplate.docType }}</span>
        <h2>{{ selectedTemplate.name }}</h2>
        <p class="drawer-intro">{{ selectedTemplate.preview }}</p>

        <div class="detail-section">
          <h3>模板文件</h3>
          <div class="file-badge">
            <FileText :size="15" />
            <span>{{ templateFilePath(selectedTemplate) }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>适用技能</h3>
          <div class="inline-list">
            <span v-for="skill in selectedTemplate.applicableSkills" :key="skill">
              <CheckCircle2 :size="14" />
              {{ skill }}
            </span>
          </div>
        </div>

        <div class="detail-section">
          <h3>所需字段</h3>
          <div class="field-list expanded">
            <span v-for="field in selectedTemplate.requiredFields" :key="field">{{ field }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>标签</h3>
          <div class="tag-row">
            <span v-for="tag in selectedTemplate.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>

        <button class="drawer-primary" @click="selectedTemplate = null">
          关闭预览
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.templates-view {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 24px 32px 40px;
  background: var(--bg-color);
}

.templates-wrapper {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  margin-bottom: 18px;
  color: white;
  background: linear-gradient(135deg, var(--diff-added) 0%, var(--primary-color) 100%);
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(15, 118, 110, 0.16);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--diff-added);
  background: white;
  border-radius: 12px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0;
}

.page-subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.86);
  font-size: 14px;
  line-height: 1.5;
}

.search-box {
  height: 44px;
  min-width: 340px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--primary-color);
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.summary-card {
  padding: 18px 20px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: white;
}

.summary-card span {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 24px;
}

.filter-panel {
  display: grid;
  grid-template-columns: auto repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
  padding: 16px;
  margin-bottom: 28px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: white;
}

.filter-heading,
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.filter-heading {
  align-self: center;
  padding-right: 6px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.filter-group label {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.filter-group select {
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: white;
  color: var(--text-main);
  padding: 0 10px;
  font-size: 13px;
  outline: 0;
}

.section-block {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.result-count {
  color: var(--text-secondary);
  font-size: 13px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.template-card {
  display: flex;
  min-height: 292px;
  flex-direction: column;
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: white;
  transition: all 0.2s ease;
}

.template-card:hover,
.table-row:hover {
  border-color: var(--primary-border);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.card-topline,
.card-meta,
.card-actions,
.row-actions {
  display: flex;
  align-items: center;
}

.card-topline {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--diff-added);
  background: var(--diff-added-soft);
  font-size: 12px;
  font-weight: 700;
}

.source-label {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.template-card h2,
.detail-drawer h2 {
  margin: 0;
  color: var(--text-strong);
  font-weight: 700;
  letter-spacing: 0;
}

.template-card h2 {
  font-size: 18px;
}

.template-card p,
.drawer-intro {
  color: var(--text-secondary);
  line-height: 1.65;
}

.template-card p {
  flex: 1;
  margin: 10px 0 16px;
  font-size: 14px;
}

.card-meta {
  gap: 12px;
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 13px;
}

.card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.file-path-row,
.file-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text-secondary);
  background: var(--surface-muted);
  border: 1px solid var(--border-soft);
}

.file-path-row {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.file-path-row svg,
.file-badge svg {
  flex-shrink: 0;
  color: var(--primary-color);
}

.file-path-row span,
.file-badge span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-list,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-list {
  margin: 14px 0 16px;
}

.field-list span,
.tag-row span {
  padding: 5px 8px;
  border-radius: 7px;
  color: var(--text-secondary);
  background: var(--surface-soft);
  font-size: 12px;
}

.field-list.expanded {
  margin: 0;
}

.card-actions,
.row-actions {
  gap: 10px;
}

.ghost-btn,
.primary-btn,
.drawer-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 13px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}

.ghost-btn {
  color: var(--text-secondary);
  background: white;
  border: 1px solid var(--border-color);
}

.primary-btn,
.drawer-primary {
  color: white;
  background: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.template-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(260px, 1.6fr) 120px 150px 110px 110px 140px;
  gap: 14px;
  align-items: center;
}

.table-head {
  padding: 0 16px 4px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.table-row {
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: white;
  color: var(--text-secondary);
  font-size: 13px;
}

.template-name {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.template-name strong {
  color: var(--text-strong);
  font-size: 14px;
}

.template-name span {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.28);
}

.detail-drawer {
  width: min(460px, 100vw);
  height: 100%;
  overflow-y: auto;
  padding: 28px;
  background: white;
  box-shadow: -20px 0 40px rgba(15, 23, 42, 0.18);
}

.close-btn {
  float: right;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: 8px;
  background: var(--bg-color);
}

.detail-drawer h2 {
  clear: both;
  margin-top: 18px;
  font-size: 22px;
}

.drawer-intro {
  margin: 12px 0 24px;
  font-size: 14px;
}

.detail-section {
  padding: 16px 0;
  border-top: 1px solid var(--border-color);
}

.detail-section h3 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 14px;
}

.file-badge {
  min-height: 38px;
  padding: 0 11px;
  border-radius: 8px;
  font-size: 13px;
}

.inline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-list span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.drawer-primary {
  width: 100%;
  min-height: 44px;
  margin-top: 18px;
}

button {
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

@media (max-width: 1180px) {
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-panel {
    grid-template-columns: 1fr 1fr;
  }

  .filter-heading {
    grid-column: 1 / -1;
  }

  .template-table {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .table-head,
  .table-row {
    min-width: 980px;
  }
}

@media (max-width: 760px) {
  .templates-view {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 0;
  }

  .summary-grid,
  .template-grid,
  .filter-panel {
    grid-template-columns: 1fr;
  }
}
</style>
