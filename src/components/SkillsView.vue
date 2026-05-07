<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowRight,
  Bot,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Search,
  Sparkles,
  X,
} from 'lucide-vue-next';
import { findTemplatesByIds, skillAssets, type SkillAsset } from '../data/legalAssets';

const router = useRouter();

const searchKeyword = ref('');
const selectedCategory = ref('全部');
const selectedSkill = ref<SkillAsset | null>(null);

const categories = computed(() => ['全部', ...new Set(skillAssets.map((skill) => skill.category))]);
const recentSkills = computed(() => skillAssets.filter((skill) => skill.recent));
const featuredSkills = computed(() => skillAssets.filter((skill) => skill.featured));
const totalLinkedTemplates = computed(() => new Set(skillAssets.flatMap((skill) => skill.templateIds)).size);

const filteredSkills = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return skillAssets.filter((skill) => {
    const matchesCategory = selectedCategory.value === '全部' || skill.category === selectedCategory.value;
    const searchable = [
      skill.name,
      skill.category,
      skill.scenario,
      skill.inputs,
      skill.output,
      ...skill.agents,
      ...skill.tags,
    ]
      .join(' ')
      .toLowerCase();

    return matchesCategory && (!keyword || searchable.includes(keyword));
  });
});

const selectedTemplates = computed(() =>
  selectedSkill.value ? findTemplatesByIds(selectedSkill.value.templateIds) : [],
);

const openSkill = (skill: SkillAsset) => {
  selectedSkill.value = skill;
};

const useSkill = (skill: SkillAsset) => {
  router.push({
    name: skill.routeName,
    query: { skillId: skill.id },
  });
};
</script>

<template>
  <div class="skills-view">
    <div class="skills-wrapper">
      <header class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <Sparkles :size="24" />
          </div>
          <div>
            <h1 class="page-title">技能库</h1>
            <p class="page-subtitle">沉淀可复用的法律工作能力，直接带入智能体执行</p>
          </div>
        </div>

        <label class="search-box">
          <Search :size="18" />
          <input v-model="searchKeyword" type="text" placeholder="搜索技能、场景、标签" />
        </label>
      </header>

      <section class="filter-row">
        <div class="filter-title">
          <Filter :size="16" />
          <span>技能分类</span>
        </div>
        <div class="category-list">
          <button
            v-for="category in categories"
            :key="category"
            class="category-btn"
            :class="{ active: selectedCategory === category }"
            @click="selectedCategory = category"
          >
            {{ category }}
          </button>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-card">
          <span>技能总数</span>
          <strong>{{ skillAssets.length }}</strong>
        </article>
        <article class="summary-card">
          <span>推荐技能</span>
          <strong>{{ featuredSkills.length }}</strong>
        </article>
        <article class="summary-card">
          <span>关联模板</span>
          <strong>{{ totalLinkedTemplates }}</strong>
        </article>
      </section>

      <section class="section-block" v-if="recentSkills.length">
        <div class="section-header">
          <div class="section-title">
            <Clock :size="18" />
            <span>最近使用</span>
          </div>
        </div>
        <div class="compact-grid">
          <button
            v-for="skill in recentSkills"
            :key="skill.id"
            class="compact-card"
            @click="useSkill(skill)"
          >
            <span>{{ skill.name }}</span>
            <ArrowRight :size="16" />
          </button>
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <div class="section-title">
            <BookOpen :size="18" />
            <span>推荐技能</span>
          </div>
        </div>
        <div class="skill-grid">
          <article v-for="skill in featuredSkills" :key="skill.id" class="skill-card">
            <div class="card-topline">
              <span class="category-pill">{{ skill.category }}</span>
              <span class="agent-count">{{ skill.agents.length }} 个关联智能体</span>
            </div>
            <h2>{{ skill.name }}</h2>
            <p>{{ skill.scenario }}</p>
            <div class="meta-row">
              <span><Bot :size="14" />{{ skill.agents.join(' / ') }}</span>
            </div>
            <div class="tag-row">
              <span v-for="tag in skill.tags" :key="tag">{{ tag }}</span>
            </div>
            <div class="card-actions">
              <button class="ghost-btn" @click="openSkill(skill)">查看详情</button>
              <button class="primary-btn" @click="useSkill(skill)">
                立即使用
                <ArrowRight :size="15" />
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <div class="section-title">
            <FileText :size="18" />
            <span>全部技能</span>
          </div>
          <span class="result-count">{{ filteredSkills.length }} 项</span>
        </div>

        <div class="asset-list">
          <article v-for="skill in filteredSkills" :key="skill.id" class="asset-row">
            <div class="row-icon">
              <Sparkles :size="19" />
            </div>
            <div class="row-main">
              <div class="row-heading">
                <h3>{{ skill.name }}</h3>
                <span>{{ skill.category }}</span>
              </div>
              <p>{{ skill.scenario }}</p>
              <div class="row-meta">
                <span>输入：{{ skill.inputs }}</span>
                <span>输出：{{ skill.output }}</span>
              </div>
            </div>
            <div class="row-actions">
              <button class="ghost-btn" @click="openSkill(skill)">详情</button>
              <button class="primary-btn" @click="useSkill(skill)">立即使用</button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="selectedSkill" class="drawer-backdrop" @click.self="selectedSkill = null">
      <aside class="detail-drawer">
        <button class="close-btn" aria-label="关闭技能详情" @click="selectedSkill = null">
          <X :size="20" />
        </button>
        <span class="category-pill">{{ selectedSkill.category }}</span>
        <h2>{{ selectedSkill.name }}</h2>
        <p class="drawer-intro">{{ selectedSkill.scenario }}</p>

        <div class="detail-section">
          <h3>输入要求</h3>
          <p>{{ selectedSkill.inputs }}</p>
        </div>

        <div class="detail-section">
          <h3>输出结果</h3>
          <p>{{ selectedSkill.output }}</p>
        </div>

        <div class="detail-section">
          <h3>关联智能体</h3>
          <div class="inline-list">
            <span v-for="agent in selectedSkill.agents" :key="agent">
              <CheckCircle2 :size="14" />
              {{ agent }}
            </span>
          </div>
        </div>

        <div class="detail-section">
          <h3>关联模板</h3>
          <div class="template-links">
            <div v-for="template in selectedTemplates" :key="template.id" class="template-link">
              <strong>{{ template.name }}</strong>
              <span>{{ template.docType }}</span>
            </div>
          </div>
        </div>

        <button class="drawer-primary" @click="useSkill(selectedSkill)">
          立即使用
          <ArrowRight :size="16" />
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.skills-view {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  background: #f8fafc;
  padding: 24px 32px 40px;
}

.skills-wrapper {
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
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 58%, #0f766e 100%);
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.18);
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
  color: #2563eb;
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
  min-width: 320px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  color: #2563eb;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1e293b;
  font-size: 14px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
}

.filter-title,
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.category-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-btn {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
}

.category-btn.active {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 26px;
}

.summary-card {
  padding: 18px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 24px;
}

.section-block {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.result-count {
  color: #64748b;
  font-size: 13px;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.compact-card {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #1e293b;
  background: white;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.compact-card:hover,
.skill-card:hover,
.asset-row:hover {
  border-color: #bfdbfe;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.skill-card {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  transition: all 0.2s ease;
}

.card-topline,
.row-heading,
.row-meta,
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

.category-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  color: #1d4ed8;
  background: #eff6ff;
  font-size: 12px;
  font-weight: 700;
}

.agent-count {
  color: #64748b;
  font-size: 12px;
}

.skill-card h2,
.asset-row h3,
.detail-drawer h2 {
  margin: 0;
  color: #0f172a;
  font-weight: 700;
  letter-spacing: 0;
}

.skill-card h2 {
  font-size: 18px;
}

.skill-card p,
.asset-row p,
.detail-section p,
.drawer-intro {
  color: #64748b;
  line-height: 1.65;
}

.skill-card p {
  flex: 1;
  margin: 10px 0 16px;
  font-size: 14px;
}

.meta-row span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 16px;
}

.tag-row span {
  padding: 5px 8px;
  border-radius: 7px;
  color: #475569;
  background: #f1f5f9;
  font-size: 12px;
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
  color: #475569;
  background: white;
  border: 1px solid #cbd5e1;
}

.primary-btn,
.drawer-primary {
  color: white;
  background: #2563eb;
  border: 1px solid #2563eb;
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asset-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
}

.row-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 10px;
}

.row-heading {
  gap: 10px;
  margin-bottom: 6px;
}

.row-heading h3 {
  font-size: 16px;
}

.row-heading span {
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.asset-row p {
  margin: 0 0 8px;
  font-size: 13px;
}

.row-meta {
  gap: 12px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 12px;
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
  color: #64748b;
  border-radius: 8px;
  background: #f8fafc;
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
  border-top: 1px solid #e2e8f0;
}

.detail-section h3 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 14px;
}

.detail-section p {
  margin: 0;
  font-size: 14px;
}

.inline-list,
.template-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-list span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 13px;
}

.template-link {
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
}

.template-link strong {
  display: block;
  color: #1e293b;
  font-size: 14px;
}

.template-link span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
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

@media (max-width: 1100px) {
  .skill-grid,
  .compact-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .skills-view {
    padding: 16px;
  }

  .page-header,
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 0;
  }

  .summary-grid,
  .skill-grid,
  .compact-grid {
    grid-template-columns: 1fr;
  }

  .asset-row {
    grid-template-columns: 1fr;
  }

  .row-actions {
    justify-content: stretch;
  }

  .row-actions button {
    flex: 1;
  }
}
</style>
