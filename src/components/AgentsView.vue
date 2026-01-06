<script setup lang="ts">
import SearchBox from './SearchBox.vue';
import AppGrid from './AppGrid.vue';
import { Bot } from 'lucide-vue-next';
</script>

<template>
  <div class="agents-view">
    <div class="content-wrapper">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <Bot :size="24" />
          </div>
          <div class="header-text">
            <h1 class="page-title">智能体应用市场</h1>
            <p class="page-subtitle">基于知识库、结合工作流、定制智能体应用</p>
          </div>
        </div>
        <SearchBox />
      </div>

      <!-- All Applications Section -->
      <section class="section">
        <div class="section-header">
          <div class="section-title">
            <span class="title-icon">📋</span>
            <span>全部应用</span>
          </div>
        </div>
        <AppGrid />
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
  margin-bottom: 32px;
  background: #3366ff;
  border-radius: 12px;
  padding: 24px 32px;
  color: white;
  box-shadow: 0 4px 12px rgba(51, 102, 255, 0.15);
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
  color: #3366ff;
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
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
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
  color: #3366ff;
}

.title-icon {
  font-size: 18px;
}
</style>
