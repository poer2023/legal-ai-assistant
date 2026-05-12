<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown, GraduationCap, Search } from 'lucide-vue-next';
import academicSearchFlow from '../assets/academic-search-flow.png';

const searchQuery = ref('');

const featureSteps = [
  '1.海量学术资源搜索',
  '2.一键加入知识库',
  '3.快速学习关键知识点',
  '4.创作便捷引用',
];

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    console.log('Academic search:', searchQuery.value);
  }
};
</script>

<template>
  <div class="academic-search-view">
    <div class="content-wrapper">
      <!-- Title -->
      <h1 class="page-title">学术搜索</h1>

      <div class="search-container">
        <button class="source-select" type="button" aria-label="选择文献来源">
          <span>OA文献</span>
          <ChevronDown :size="13" stroke-width="2" />
        </button>
        <span class="search-divider"></span>
        <input 
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="输入文献主题、关键词、作者等搜索，可一键添加到知识库"
          @keyup.enter="handleSearch"
        />
        <button class="send-btn" type="button" aria-label="搜索" @click="handleSearch">
          <Search :size="22" stroke-width="3" />
        </button>
      </div>

      <div class="feature-steps">
        <template v-for="(step, index) in featureSteps" :key="index">
          <span class="step-item">
            <GraduationCap v-if="index === 0" :size="16" class="step-icon" stroke-width="2.5" />
            {{ step }}
          </span>
          <span v-if="index < featureSteps.length - 1" class="step-arrow" aria-hidden="true"></span>
        </template>
      </div>

      <div class="feature-showcase">
        <img
          class="showcase-image"
          :src="academicSearchFlow"
          alt="学术搜索、一键加入知识库、智能引用参考文献的流程示意"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.academic-search-view {
  flex: 1;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 65px 40px 48px;
  overflow-y: auto;
  background: var(--bg-color);
}

.content-wrapper {
  width: 100%;
  max-width: 1054px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-title {
  font-size: 30px;
  line-height: 1.2;
  font-weight: 800;
  color: var(--primary-color);
  margin: 0 0 40px;
  letter-spacing: 0;
}

.search-container {
  width: 100%;
  min-height: 76px;
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1.5px solid var(--primary-color);
  border-radius: 11px;
  padding: 0 24px 0 35px;
  box-shadow: 0 10px 34px rgba(45, 88, 219, 0.08);
}

.source-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.source-select svg {
  color: var(--text-muted);
  margin-top: 1px;
}

.search-divider {
  width: 1px;
  height: 30px;
  margin: 0 20px 0 19px;
  background: var(--border-color);
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-main);
  background: transparent;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  margin-left: 18px;
  background: var(--border-color);
  border: none;
  border-radius: 9px;
  color: var(--on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.send-btn:hover {
  background: var(--primary-color);
  transform: translateY(-1px);
}

.feature-steps {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 42px;
  flex-wrap: wrap;
  justify-content: center;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  line-height: 1;
  color: var(--text-strong);
  font-weight: 500;
  white-space: nowrap;
}

.step-icon {
  color: var(--primary-color);
  fill: var(--primary-color);
}

.step-arrow {
  position: relative;
  width: 15px;
  height: 8px;
  display: inline-block;
}

.step-arrow::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  width: 14px;
  height: 3px;
  border-radius: 999px;
  background: var(--primary-border);
}

.step-arrow::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 7px solid var(--primary-border);
}

.feature-showcase {
  margin-top: 64px;
  width: 100%;
}

.showcase-image {
  display: block;
  width: min(100%, 1040px);
  height: auto;
  margin: 0 auto;
  user-select: none;
}

@media (max-width: 920px) {
  .academic-search-view {
    padding: 44px 20px 36px;
  }

  .page-title {
    margin-bottom: 28px;
    font-size: 28px;
  }

  .search-container {
    min-height: 64px;
    padding: 0 14px 0 18px;
  }

  .source-select,
  .search-input,
  .step-item {
    font-size: 14px;
  }

  .search-divider {
    margin: 0 12px;
  }

  .feature-steps {
    margin-top: 28px;
  }

  .feature-showcase {
    margin-top: 40px;
  }
}
</style>
