<script setup lang="ts">
import { ref } from 'vue';
import { Send } from 'lucide-vue-next';

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

      <!-- Search Box -->
      <div class="search-container">
        <input 
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索专业学术文献，一键学习使用"
          @keyup.enter="handleSearch"
        />
        <button class="send-btn" @click="handleSearch">
          <Send :size="18" />
        </button>
      </div>

      <!-- Feature Steps -->
      <div class="feature-steps">
        <template v-for="(step, index) in featureSteps" :key="index">
          <span class="step-item">
            <span class="step-dot"></span>
            {{ step }}
          </span>
          <span v-if="index < featureSteps.length - 1" class="step-arrow">→</span>
        </template>
      </div>

      <!-- Feature Showcase (Placeholder for demo images) -->
      <div class="feature-showcase">
        <div class="showcase-container">
          <!-- Left card -->
          <div class="showcase-card left-card">
            <div class="card-header">
              <span class="card-title">学术搜索</span>
            </div>
            <div class="card-body">
              <div class="search-demo">
                <input disabled placeholder="儿童心理健康与家庭功能关联性探索" class="demo-input" />
                <div class="demo-btn"></div>
              </div>
            </div>
          </div>

          <!-- Center card (main) -->
          <div class="showcase-card center-card">
            <div class="card-header blue-header">
              <span>智能引用参考文献</span>
            </div>
            <div class="card-body">
              <p class="card-desc">精选引用推荐文献让论文核心论述，一键插入专业论文</p>
              <button class="demo-action-btn">+ 加入知识库</button>
            </div>
          </div>

          <!-- Right card -->
          <div class="showcase-card right-card">
            <div class="card-header">
              <span>一键加入知识库</span>
              <span class="sub-text">有新创作时智能推荐，高效学习专业文献</span>
            </div>
            <div class="card-body">
              <div class="action-tags">
                <span class="tag">提问</span>
                <span class="tag">翻译</span>
                <span class="tag">思维导图</span>
                <span class="tag">笔记</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.academic-search-view {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 40px;
  overflow-y: auto;
}

.content-wrapper {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #2563eb;
  margin: 0 0 40px 0;
}

.search-container {
  width: 100%;
  max-width: 700px;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: #334155;
  background: transparent;
}

.search-input::placeholder {
  color: #94a3b8;
}

.send-btn {
  width: 36px;
  height: 36px;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover {
  background: #1d4ed8;
}

.feature-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #475569;
}

.step-dot {
  width: 6px;
  height: 6px;
  background: #2563eb;
  border-radius: 50%;
}

.step-arrow {
  color: #94a3b8;
  font-size: 12px;
}

.feature-showcase {
  margin-top: 48px;
  width: 100%;
}

.showcase-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  perspective: 1000px;
}

.showcase-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  overflow: hidden;
  width: 240px;
  transition: transform 0.3s;
}

.left-card {
  transform: rotate(-5deg) translateY(20px);
}

.center-card {
  width: 280px;
  z-index: 2;
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.15);
}

.right-card {
  transform: rotate(5deg) translateY(20px);
}

.card-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.blue-header {
  background: #2563eb;
  color: white;
  border-bottom: none;
}

.sub-text {
  font-size: 11px;
  font-weight: 400;
  color: #64748b;
  display: block;
  margin-top: 4px;
}

.card-body {
  padding: 16px;
}

.search-demo {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 6px;
  padding: 8px 12px;
}

.demo-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 11px;
  color: #64748b;
}

.demo-btn {
  width: 24px;
  height: 24px;
  background: #2563eb;
  border-radius: 6px;
}

.card-desc {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.demo-action-btn {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.action-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
}
</style>
