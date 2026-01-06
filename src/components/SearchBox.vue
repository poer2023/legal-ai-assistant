<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { ref } from 'vue';

const searchQuery = ref('');
</script>

<template>
  <div class="search-container">
    <div class="search-box">
      <Search :size="18" class="search-icon" />
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="搜索智能体、知识库、文书..."
        class="search-input"
      />
    </div>
    <button class="search-btn">搜索智能体</button>
  </div>
</template>

<style scoped>
.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border-radius: 6px;
  padding: 4px;
  height: 48px;
}

.search-box {
  display: flex;
  align-items: center;
  padding: 0 12px;
  width: 320px;
  height: 100%;
}

.search-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0 10px;
  font-size: 14px;
  color: #334155;
  background: transparent;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-btn {
  background: #3366ff;
  color: white;
  padding: 0 20px;
  height: 100%;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.search-btn:hover {
  background: #254eda;
}

.search-btn:active {
  transform: translateY(0);
}
</style>
