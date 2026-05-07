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
        placeholder="搜索智能体，如文献综述、PPT…"
        class="search-input"
      />
    </div>
    <button class="search-btn">搜索</button>
  </div>
</template>

<style scoped>
.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border-radius: 12px;
  padding: 6px;
  height: 52px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.search-box {
  display: flex;
  align-items: center;
  padding: 0 16px;
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
  padding: 0 12px;
  font-size: 15px;
  color: #334155;
  background: transparent;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-btn {
  background: #3366ff;
  color: white;
  padding: 0 24px;
  height: 40px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.search-btn:hover {
  background: #254eda;
}

@media (max-width: 768px) {
  .search-container {
    width: 100%;
    height: auto;
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
  }

  .search-btn {
    width: 100%;
    height: 42px;
  }
}
</style>
