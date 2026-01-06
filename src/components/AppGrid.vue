<script setup lang="ts">
import { FileText, Scale, BookOpen, FolderSearch, FileSearch, FileDiff, PenTool, FileCheck, Mic, SearchCheck } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const agents = [
  {
    id: 1,
    name: '合同起草',
    description: '快速生成各类合同协议，支持多种合同模板',
    icon: FileText,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'contract-form'
  },
  {
    id: 2,
    name: '民事起诉状',
    description: '民事诉讼起诉书智能生成，格式规范专业',
    icon: Scale,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'civil-lawsuit-form'
  },
  {
    id: 3,
    name: '法律研究报告',
    description: '深度法律问题研究分析，生成专业报告',
    icon: BookOpen,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'legal-research-form'
  },
  {
    id: 4,
    name: '证据清单整理',
    description: '证据材料智能整理归档，构建证据链条',
    icon: FolderSearch,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'evidence-list-form'
  },
  {
    id: 5,
    name: '录音证据整理',
    description: '录音内容智能转写分析，提取关键证据信息',
    icon: Mic,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'audio-evidence-form'
  },
  {
    id: 6,
    name: '合同审查',
    description: '合同条款风险审查分析，识别潜在问题',
    icon: FileSearch,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'contract-review-form'
  },
  {
    id: 7,
    name: '合同比对',
    description: '多版本合同对比分析，标注差异要点',
    icon: FileDiff,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'contract-comparison-form'
  },
  {
    id: 8,
    name: '文书写作',
    description: '各类法律文书智能起草，专业规范',
    icon: PenTool,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'document-writing-form'
  },
  {
    id: 9,
    name: '文书审查',
    description: '法律文书审核校对，确保内容准确',
    icon: FileCheck,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'document-review-form'
  },
  {
    id: 10,
    name: '文档纠错',
    description: '法律文书拼写、格式、术语多重纠错',
    icon: FileCheck,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'document-correction-form'
  },
  {
    id: 11,
    name: '类案检索报告',
    description: '智能检索相似案例，生成专业类案分析报告',
    icon: SearchCheck,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    routeName: 'similar-case-form'
  }
];

const handleCardClick = (agent: any) => {
  if (agent.routeName) {
    router.push({ name: agent.routeName });
  }
};
</script>

<template>
  <div class="app-grid">
    <div 
      v-for="agent in agents" 
      :key="agent.id"
      class="app-card"
      :class="{ clickable: agent.routeName }"
      @click="handleCardClick(agent)"
    >
      <div class="card-header">
        <div class="app-icon" :style="{ backgroundColor: agent.bgColor }">
          <component :is="agent.icon" :size="22" :style="{ color: agent.color }" />
        </div>
        <h3 class="app-name">{{ agent.name }}</h3>
      </div>
      <p class="app-description">{{ agent.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.app-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .app-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .app-grid {
    grid-template-columns: 1fr;
  }
}

.app-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid #f1f5f9;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.08); /* Blue-tinted shadow */
  border-color: #dbeafe;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.app-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.app-description {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
