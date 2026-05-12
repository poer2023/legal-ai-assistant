<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDown, Search } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const searchQuery = ref('');
const activeTab = ref<'cases' | 'regulations'>('cases');
const isFocused = ref(false);
const isFilterOpen = ref(false);
const regulationField = ref<'全文' | '标题'>('标题');

const fieldOptions = ['全文', '标题'] as const;

const placeholder = computed(() => {
  return activeTab.value === 'cases'
    ? '请输入司法案例关键词...'
    : '请输入法律法规关键词...';
});

const setActiveTab = (tab: 'cases' | 'regulations') => {
  activeTab.value = tab;
  isFilterOpen.value = false;
};

const selectField = (field: '全文' | '标题') => {
  regulationField.value = field;
  isFilterOpen.value = false;
};

const handleSearch = () => {
  const query = searchQuery.value.trim();
  if (!query) {
    return;
  }

  router.push({
    name: 'legal-search-results',
    query: { q: query, tab: activeTab.value, field: regulationField.value },
  });
};
</script>

<template>
  <div class="legal-search-view">
    <div class="content-wrapper">
      <nav class="tab-navigation" aria-label="法律搜索分类">
        <button
          class="tab-item"
          :class="{ active: activeTab === 'cases' }"
          @click="setActiveTab('cases')"
        >
          司法案例
        </button>
        <button
          class="tab-item"
          :class="{ active: activeTab === 'regulations' }"
          @click="setActiveTab('regulations')"
        >
          法律法规
        </button>
      </nav>

      <div
        class="search-container"
        :class="{
          focused: isFocused,
          'regulation-mode': activeTab === 'regulations',
          'dropdown-open': isFilterOpen,
        }"
      >
        <div v-if="activeTab === 'regulations'" class="field-select-wrap">
          <button
            class="field-select"
            type="button"
            :aria-expanded="isFilterOpen"
            aria-label="选择搜索字段"
            @click.stop="isFilterOpen = !isFilterOpen"
          >
            <span class="selector-label">{{ regulationField }}</span>
            <ChevronDown :size="14" :stroke-width="1.8" class="selector-chevron" />
          </button>

          <div v-if="isFilterOpen" class="field-dropdown">
            <button
              v-for="field in fieldOptions"
              :key="field"
              class="field-option"
              :class="{ active: regulationField === field }"
              type="button"
              @mousedown.prevent="selectField(field)"
            >
              {{ field }}
            </button>
          </div>
        </div>

        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="placeholder"
          @keyup.enter="handleSearch"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <button class="search-btn" :disabled="!searchQuery.trim()" @click="handleSearch">
          <Search :size="23" :stroke-width="2.8" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-search-view {
  min-height: 100%;
  display: flex;
  justify-content: center;
  background: var(--bg-color);
}

.content-wrapper {
  width: min(848px, calc(100% - 48px));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 206px;
}

.tab-navigation {
  display: flex;
  align-items: center;
  gap: 34px;
  margin-bottom: 29px;
}

.tab-item {
  position: relative;
  padding: 0 0 12px;
  color: var(--text-main);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0;
}

.tab-item.active {
  color: var(--primary-color);
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 999px;
  background: var(--primary-color);
}

.search-container {
  position: relative;
  width: 100%;
  height: 76px;
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--primary-border);
  border-radius: 11px;
  padding: 0 24px 0 26px;
  box-shadow: none;
}

.search-container.focused {
  border-color: var(--primary-color);
}

.search-container.regulation-mode {
  border-color: var(--primary-color);
}

.field-select-wrap {
  position: relative;
  flex: 0 0 101px;
  height: 100%;
  display: flex;
  align-items: center;
}

.field-select {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 13px;
  padding: 0 10px;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 400;
  line-height: 1;
}

.search-container.dropdown-open .selector-label {
  color: var(--text-muted);
}

.selector-chevron {
  color: var(--text-muted);
}

.field-dropdown {
  position: absolute;
  top: 62px;
  left: 2px;
  z-index: 20;
  width: 86px;
  padding: 4px;
  border: 1px solid rgba(229, 232, 238, 0.9);
  border-radius: 7px;
  background: var(--card-bg);
  box-shadow: 0 16px 30px rgba(30, 41, 59, 0.14);
}

.field-option {
  width: 100%;
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 4px;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 400;
  line-height: 1;
  text-align: left;
}

.field-option.active {
  background: var(--primary-soft);
  color: var(--text-strong);
  font-weight: 700;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 74px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  font-weight: 400;
  color: var(--text-main);
  line-height: 74px;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  border-radius: 9px;
  background: var(--border-color);
  color: var(--on-primary);
}

.search-btn:disabled {
  background: var(--border-color);
  color: var(--on-primary);
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .content-wrapper {
    width: calc(100% - 28px);
    padding-top: 96px;
  }

  .tab-navigation {
    margin-bottom: 28px;
  }

  .tab-item {
    font-size: 22px;
  }

  .search-container {
    height: 68px;
    padding-left: 18px;
    padding-right: 18px;
  }

  .field-select-wrap {
    flex-basis: 92px;
  }

  .search-input {
    height: 66px;
    line-height: 66px;
  }
}
</style>
