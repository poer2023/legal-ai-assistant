<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, ChevronDown, Send } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const searchQuery = ref('');
const activeTab = ref<'cases' | 'regulations'>('cases');
const isFocused = ref(false);

// Search scope options
const searchScope = ref('全文');
const caseScopeOptions = ['全文', '标题', '案号'];
const regulationScopeOptions = ['标题', '全文', '发文字号'];

const searchScopeOptions = computed(() => {
  return activeTab.value === 'cases' ? caseScopeOptions : regulationScopeOptions;
});
const showScopeDropdown = ref(false);

// 监听 tab 切换，自动设置默认搜索范围
watch(activeTab, (newTab) => {
  searchScope.value = newTab === 'cases' ? '全文' : '标题';
});

const handleSearch = () => {
  router.push({ 
    name: 'legal-search-results',
    query: { q: searchQuery.value || '民间借贷', tab: activeTab.value }
  });
};

const selectSearchScope = (scope: string) => {
  searchScope.value = scope;
  showScopeDropdown.value = false;
};

</script>

<template>
  <div class="legal-search-view">
    <!-- Subtle decorative orb -->
    <div class="bg-orb"></div>
    
    <div class="content-wrapper">
      <!-- Title -->
      <h1 class="page-title">法律搜索</h1>

      <!-- Underline Tab Navigation -->
      <nav class="tab-navigation">
        <button 
          class="tab-item" 
          :class="{ active: activeTab === 'cases' }"
          @click="activeTab = 'cases'"
        >
          司法案例
        </button>
        <button 
          class="tab-item" 
          :class="{ active: activeTab === 'regulations' }"
          @click="activeTab = 'regulations'"
        >
          法律法规
        </button>
        <!-- Animated underline indicator -->
        <div 
          class="tab-indicator" 
          :style="{ 
            transform: activeTab === 'cases' ? 'translateX(0)' : 'translateX(calc(100% + 32px))' 
          }"
        ></div>
      </nav>

      <!-- Search Box -->
      <div 
        class="search-container" 
        :class="{ focused: isFocused }"
      >
        <!-- Scope Dropdown -->
        <div class="search-scope-wrapper" @click="showScopeDropdown = !showScopeDropdown">
          <span class="scope-label">{{ searchScope }}</span>
          <ChevronDown :size="16" class="dropdown-icon" :class="{ rotated: showScopeDropdown }" />
          
          <Transition name="fade-slide">
            <div v-if="showScopeDropdown" class="scope-dropdown">
              <div 
                v-for="option in searchScopeOptions" 
                :key="option"
                class="scope-option"
                :class="{ active: searchScope === option }"
                @click.stop="selectSearchScope(option)"
              >
                {{ option }}
              </div>
            </div>
          </Transition>
        </div>

        <div class="divider"></div>

        <input 
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="请输入案由、关键词、案号或法规名称"
          @keyup.enter="handleSearch"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <button class="send-btn" @click="handleSearch">
          <Send :size="18" />
        </button>
      </div>

      <!-- Database Stats -->
      <Transition name="fade" mode="out-in">
        <div class="stats-text" :key="activeTab">
          <span v-if="activeTab === 'cases'">本数据库已收录司法案例 <span class="stats-number">159,280,920</span> 篇</span>
          <span v-else>本数据库已收录法律法规 <span class="stats-number">1,927,651</span> 篇</span>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
.legal-search-view {
  position: relative;
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  background: #f5f6fa;
}

/* Subtle decorative orb in top-right */
.bg-orb {
  position: absolute;
  top: -120px;
  right: -80px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 15vh; /* Slightly higher */
}

.page-title {
  font-size: 34px;
  font-weight: 600;
  color: #2563eb;
  margin: 0 0 48px 0;
  letter-spacing: -0.5px;
}

/* Underline Tab Navigation */
.tab-navigation {
  position: relative;
  display: flex;
  gap: 32px;
  margin-bottom: 40px;
}

.tab-item {
  position: relative;
  padding: 10px 8px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 500;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.25s ease;
}

.tab-item:hover {
  color: #64748b;
}

.tab-item.active {
  color: #2563eb;
  font-weight: 600;
}

/* Animated sliding underline */
.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  width: calc((100% - 32px) / 2); /* Account for gap */
  height: 2px;
  background: #2563eb;
  border-radius: 2px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Search Container */
.search-container {
  width: 100%;
  max-width: 680px;
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  padding: 12px 16px 12px 0;
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.search-container.focused {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12), 0 8px 32px -8px rgba(37, 99, 235, 0.15);
  transform: scale(1.01);
}

.search-scope-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  cursor: pointer;
  user-select: none;
  height: 100%;
  min-width: 90px;
  justify-content: center;
}

.scope-label {
  font-size: 15px;
  color: #334155;
  font-weight: 500;
}

.dropdown-icon {
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

.scope-dropdown {
  position: absolute;
  top: calc(100% + 16px);
  left: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.12);
  z-index: 100;
  min-width: 120px;
  padding: 8px;
}

.scope-option {
  padding: 10px 14px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  text-align: left;
  transition: all 0.15s ease;
}

.scope-option:hover {
  background: #f8fafc;
  color: #1e293b;
}

.scope-option.active {
  color: #2563eb;
  background: #eff6ff;
  font-weight: 500;
}

.divider {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
  margin-right: 16px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #1e293b;
  background: transparent;
  padding: 8px 0;
}

.search-input::placeholder {
  color: #94a3b8;
}

.send-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  border-radius: 12px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px -2px rgba(37, 99, 235, 0.35);
}

.send-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px -2px rgba(37, 99, 235, 0.45);
}

.send-btn:active {
  transform: translateY(0);
}

/* Database Stats */
.stats-text {
  margin-top: 28px;
  font-size: 13px;
  color: #94a3b8;
  letter-spacing: 0.2px;
}

.stats-number {
  color: #2563eb;
  font-weight: 600;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
