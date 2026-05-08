<script setup lang="ts">
import type { Component } from 'vue';
import { useRouter } from 'vue-router';
import AgentIcon from './AgentIcon.vue';
import type { AgentIconKind } from './AgentIcon.vue';
import SearchBox from './SearchBox.vue';
import type { InvestigationAgentKey } from '../data/investigationAgents';
import {
  Bot,
  Clock,
  LayoutGrid,
  ChevronRight,
  FileText,
  Scale,
  BookOpen,
  FolderSearch,
  Mic,
  FileSearch,
  FileDiff,
  PenTool,
  SearchCheck
} from 'lucide-vue-next';

const router = useRouter();

type AgentCard = {
  id: number;
  name: string;
  description: string;
  icon: Component;
  color: string;
  bgColor: string;
  routeName: string;
  agentKey?: InvestigationAgentKey;
};

const allAgents: AgentCard[] = [
  {
    id: 25,
    name: '网络核查',
    description: '核查主体网络信息、舆情线索与公开关联风险',
    icon: SearchCheck,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'investigation-agent-demo',
    agentKey: 'network-verification'
  },
  {
    id: 26,
    name: '资金流向',
    description: '梳理交易记录、资金路径与异常流转线索',
    icon: FileDiff,
    color: '#0f766e',
    bgColor: '#ecfdf5',
    routeName: 'investigation-agent-demo',
    agentKey: 'fund-flow'
  },
  {
    id: 27,
    name: '股权穿透核查',
    description: '穿透股权结构、实际控制人与关联企业关系',
    icon: LayoutGrid,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'investigation-agent-demo',
    agentKey: 'equity-penetration'
  },
  {
    id: 1,
    name: '咨政报告',
    description: '基于专业知识库的论文专家',
    icon: BookOpen,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'policy-advisory-report-form'
  },
  {
    id: 2,
    name: '类案分析报告',
    description: '文献总结评价，观点深入剖析',
    icon: SearchCheck,
    color: '#0f766e',
    bgColor: '#ecfdf5',
    routeName: 'similar-case-analysis-report-form'
  },
  {
    id: 3,
    name: '文书审查',
    description: '自动识别文书类型，按要求进行针对性审查与修改建议',
    icon: FileSearch,
    color: '#ea580c',
    bgColor: '#fff7ed',
    routeName: 'prod-document-review-form'
  },
  {
    id: 4,
    name: '法律研究报告',
    description: '基于专业知识库的论文专家',
    icon: BookOpen,
    color: '#0f766e',
    bgColor: '#ecfdf5',
    routeName: 'prod-legal-research-report-form'
  },
  {
    id: 5,
    name: '民事起诉书',
    description: '你的AI律师，帮你撰写专业的民事起诉书',
    icon: Scale,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'prod-indict-form'
  },
  {
    id: 6,
    name: '文书写作',
    description: '格式规范，逻辑严谨，拟一篇公文只要几分钟',
    icon: PenTool,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'prod-legal-doc-writing-form'
  },
  {
    id: 7,
    name: '文档纠错',
    description: '仅针对文本格式规范与文字正确性进行纠错，输出可执行修正建议',
    icon: FileSearch,
    color: '#ea580c',
    bgColor: '#fff7ed',
    routeName: 'prod-document-proofreading-form'
  },
  {
    id: 8,
    name: '公文写作',
    description: '格式规范，逻辑严谨，拟一篇公文只要几分钟',
    icon: PenTool,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'missive-form'
  },
  {
    id: 9,
    name: '文稿审查',
    description: '对文稿内容进行规范性与妥当性审查，识别不当表述、潜在风险与需要注意的问题。',
    icon: FileSearch,
    color: '#ea580c',
    bgColor: '#fff7ed',
    routeName: 'manuscript-review-form'
  },
  {
    id: 10,
    name: '职称评选报告',
    description: '职称评选、专业技术总结报告',
    icon: FileText,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'prod-generic-agent'
  },
  {
    id: 11,
    name: '文稿润色',
    description: '在不改变原有观点与事实的前提下，对文稿进行语言润色与表达优化，提升专业性。',
    icon: PenTool,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'manuscript-polishing-form'
  },
  {
    id: 12,
    name: '合同比对',
    description: '对比两份合同差异，输出条款级差异清单与风险提示',
    icon: FileDiff,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'prod-contract-compare-form'
  },
  {
    id: 13,
    name: '合同协议',
    description: '常见合同协议文本，解决你的日常法律需求',
    icon: FileText,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'prod-contract-form'
  },
  {
    id: 14,
    name: '论文助手',
    description: '基于专业知识库的论文专家',
    icon: BookOpen,
    color: '#0f766e',
    bgColor: '#ecfdf5',
    routeName: 'paper-form'
  },
  {
    id: 15,
    name: '合同审查',
    description: '多立场、多强弱视角的智能合同审查与风险提示',
    icon: FileSearch,
    color: '#ea580c',
    bgColor: '#fff7ed',
    routeName: 'prod-contract-review-form'
  },
  {
    id: 16,
    name: '民事起诉状',
    description: '根据诉讼请求与案情陈述，一键生成规范的民事起诉状',
    icon: Scale,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'civil-complaint-drafting-form'
  },
  {
    id: 17,
    name: '合同起草',
    description: '基于模版与业务信息的合同起草助手',
    icon: FileText,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'contract-drafting-form'
  },
  {
    id: 18,
    name: '扫描件解析',
    description: '上传扫描文件，AI智能解析提取文字内容。',
    icon: FolderSearch,
    color: '#0f766e',
    bgColor: '#ecfdf5',
    routeName: 'prod-generic-agent'
  },
  {
    id: 19,
    name: 'PPT',
    description: '一键快速生成，轻松搞定PPT',
    icon: FileText,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'prod-generic-agent'
  },
  {
    id: 20,
    name: '会议纪要',
    description: '每一场会议，都需要一份会议纪要',
    icon: Mic,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'prod-generic-agent'
  },
  {
    id: 21,
    name: '公众号文章',
    description: '写有料文章，找精准粉丝，让创作不再枯竭！',
    icon: PenTool,
    color: '#ea580c',
    bgColor: '#fff7ed',
    routeName: 'prod-generic-agent'
  },
  {
    id: 22,
    name: '设计说明书',
    description: '毕业设计，工业设计、平面设计等各类设计说明书',
    icon: FileText,
    color: '#2563eb',
    bgColor: '#eff6ff',
    routeName: 'prod-generic-agent'
  },
  {
    id: 23,
    name: '论文批改',
    description: '一键给出修改建议，高效便捷',
    icon: BookOpen,
    color: '#0f766e',
    bgColor: '#ecfdf5',
    routeName: 'prod-generic-agent'
  },
  {
    id: 24,
    name: '去AI痕迹',
    description: '文章降重+去“AI”味',
    icon: PenTool,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    routeName: 'prod-generic-agent'
  }
];

const recentAgents = [
  allAgents.find(agent => agent.name === '网络核查')!,
  allAgents.find(agent => agent.name === '资金流向')!,
  allAgents.find(agent => agent.name === '股权穿透核查')!,
];

const writingIconAgents = new Set([
  '民事起诉书',
  '民事起诉状',
  '文书写作',
  '公文写作',
  '会议纪要',
  '职称评选报告',
]);

const pencilIconAgents = new Set([
  '合同协议',
  '合同起草',
  'PPT',
  '公众号文章',
  '设计说明书',
  '去AI痕迹',
]);

const getAgentIconClass = (agentName: string): AgentIconKind => {
  if (agentName === '网络核查') return 'network';
  if (agentName === '资金流向') return 'flow';
  if (agentName === '股权穿透核查') return 'equity';
  if (agentName === '文书审查') return 'review';
  if (writingIconAgents.has(agentName)) return 'writing';
  if (pencilIconAgents.has(agentName)) return 'pencil';
  return 'word';
};

const handleCardClick = (agent: AgentCard) => {
  if (agent.routeName === 'investigation-agent-demo' && agent.agentKey) {
    router.push({ name: agent.routeName, params: { agentKey: agent.agentKey } });
    return;
  }

  if (agent.routeName === 'prod-generic-agent') {
    router.push({ name: agent.routeName, params: { agentSlug: agent.name } });
    return;
  }

  router.push({ name: agent.routeName });
};
</script>

<template>
  <div class="agents-view">
    <div class="content-wrapper">
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <Bot :size="24" />
          </div>
          <div class="header-text">
            <h1 class="page-title">智能体应用市场</h1>
            <p class="page-subtitle">基于知识库，结合工作流，定制智能体应用</p>
          </div>
        </div>
        <SearchBox />
      </div>

      <section class="section">
        <div class="section-header">
          <div class="section-title">
            <Clock :size="18" class="title-icon" />
            <span>最近使用</span>
          </div>
          <button class="section-action" type="button" aria-label="查看智能体使用记录">
            <ChevronRight :size="16" />
            <span>使用记录</span>
          </button>
        </div>
        <div class="agent-grid">
          <button
            v-for="agent in recentAgents"
            :key="`recent-${agent.id}`"
            class="agent-card"
            type="button"
            :aria-label="`打开${agent.name}智能体：${agent.description}`"
            @click="handleCardClick(agent)"
          >
            <AgentIcon :kind="getAgentIconClass(agent.name)" />
            <div class="agent-info">
              <span class="agent-name">{{ agent.name }}</span>
              <span class="agent-desc">{{ agent.description }}</span>
            </div>
          </button>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <div class="section-title">
            <LayoutGrid :size="18" class="title-icon" />
            <span>全部应用</span>
          </div>
        </div>
        <div class="agent-grid">
          <button
            v-for="agent in allAgents"
            :key="agent.id"
            class="agent-card"
            type="button"
            :aria-label="`打开${agent.name}智能体：${agent.description}`"
            @click="handleCardClick(agent)"
          >
            <AgentIcon :kind="getAgentIconClass(agent.name)" />
            <div class="agent-info">
              <span class="agent-name">{{ agent.name }}</span>
              <span class="agent-desc">{{ agent.description }}</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.agents-view {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 24px 32px;
  background: #f8fafc;
}

.content-wrapper {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 12px;
  padding: 24px 32px;
  color: white;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0;
  letter-spacing: 0.3px;
}

.page-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #3b82f6;
}

.title-icon {
  color: #3b82f6;
}

.section-action {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: color 0.2s;
}

.section-action:hover {
  color: #3b82f6;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.agent-card {
  width: 100%;
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  text-align: left;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  border-color: #dbeafe;
}

.agent-card:focus-visible,
.section-action:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 3px;
}

.agent-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.agent-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-desc {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .agent-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .agent-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .agents-view {
    padding: 16px;
  }

  .agent-grid {
    grid-template-columns: 1fr;
  }
}
</style>
