<script setup lang="ts">
import { BookOpen, Search, Bot, Files } from 'lucide-vue-next';

const guides = [
  {
    icon: Bot,
    title: '智能体使用路径',
    desc: '从首页进入法律智能体市场，选择合同、诉讼、类案、文书等专属应用。'
  },
  {
    icon: Search,
    title: '检索与研究建议',
    desc: '优先用法律搜索与学术搜索收集事实、法条和参考文献，再进入报告型智能体。'
  },
  {
    icon: Files,
    title: '文档处理流程',
    desc: '上传材料前先做脱敏，结果页完成后统一导出 Word 或 PDF 并归档。'
  },
  {
    icon: BookOpen,
    title: '知识沉淀方式',
    desc: '高频法条、模板条款和类案摘要建议进入法律知识库，便于团队复用。'
  }
];
</script>

<template>
  <div class="guide-page">
    <div class="hero">
      <h1>使用攻略</h1>
      <p>以企业版的内容编排方式重新组织，但只保留法律版的使用场景与操作建议。</p>
    </div>

    <div class="guide-grid">
      <article v-for="guide in guides" :key="guide.title" class="guide-card">
        <div class="guide-icon">
          <component :is="guide.icon" :size="18" />
        </div>
        <h2>{{ guide.title }}</h2>
        <p>{{ guide.desc }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.guide-page {
  min-height: 100%;
  padding: 32px;
  background: var(--bg-color);
}

.hero {
  margin-bottom: 24px;
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 24px;
  color: var(--text-strong);
}

.hero p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.guide-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 22px;
  box-shadow: var(--shadow-soft);
}

.guide-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--primary-soft);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.guide-card h2 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--text-strong);
}

.guide-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 768px) {
  .guide-page {
    padding: 20px 16px 24px;
  }

  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
