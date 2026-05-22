<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const searchQuery = ref('');
const activeTab = ref<'cases' | 'regulations'>('cases');
const isFocused = ref(false);

const popularSearches = [
  '股权代持效力',
  '对赌协议无效',
  '劳动合同竞业限制',
  '跨境数据传输',
  '上市公司信披',
  '商标抢注',
  '刑事合规',
  '投资者适当性',
  '并购重组',
];

const placeholder = computed(() => {
  return activeTab.value === 'cases'
    ? '请输入司法案例关键词...'
    : '请输入法律法规关键词...';
});

const setActiveTab = (tab: 'cases' | 'regulations') => {
  activeTab.value = tab;
};

const handleSearch = () => {
  const query = searchQuery.value.trim();
  if (!query) {
    return;
  }

  router.push({
    name: 'legal-search-results',
    query: { q: query, tab: activeTab.value },
  });
};

const handlePopularSearch = (keyword: string) => {
  searchQuery.value = keyword;
  handleSearch();
};
</script>

<template>
  <div class="legal-search-view">
    <section class="legal-search-panel" aria-labelledby="legal-search-title">
      <h1 id="legal-search-title" class="page-title">法律搜索</h1>

      <nav class="legal-search-tabs" aria-label="法律搜索分类">
        <button
          class="legal-search-tab"
          :class="{ active: activeTab === 'cases' }"
          type="button"
          @click="setActiveTab('cases')"
        >
          司法案例
        </button>
        <button
          class="legal-search-tab"
          :class="{ active: activeTab === 'regulations' }"
          type="button"
          @click="setActiveTab('regulations')"
        >
          法律法规
        </button>
      </nav>

      <form
        class="search-container"
        :class="{ focused: isFocused }"
        role="search"
        @submit.prevent="handleSearch"
      >
        <Search :size="18" :stroke-width="1.8" class="search-prefix-icon" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="placeholder"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <button class="search-btn" type="submit">
          搜索
        </button>
      </form>

      <div class="popular-searches">
        <p class="popular-label">常用检索</p>
        <div class="popular-list" aria-label="常用检索">
          <button
            v-for="keyword in popularSearches"
            :key="keyword"
            class="popular-tag"
            type="button"
            @click="handlePopularSearch(keyword)"
          >
            {{ keyword }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.legal-search-view {
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: var(--bg-color);
  padding: 40px 48px 64px;
}

.legal-search-panel {
  width: min(900px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-title {
  margin: 0 0 31px;
  color: var(--ink-900, var(--text-strong));
  font-family: var(--font-serif, inherit);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0;
}

.legal-search-tabs {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  border-bottom: 1px solid var(--line, var(--border-color));
}

.legal-search-tab {
  position: relative;
  padding: 0 0 16px;
  color: var(--ink-500, var(--text-secondary));
  font-size: 14px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0;
  transition: color 0.15s ease;
}

.legal-search-tab:hover,
.legal-search-tab.active {
  color: var(--ink-900, var(--text-strong));
}

.legal-search-tab.active {
  font-weight: 500;
}

.legal-search-tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: var(--r-pill, 999px);
  background: var(--accent, var(--primary-color));
}

.search-container {
  position: relative;
  width: 100%;
  height: 58px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  background: var(--bg-panel, var(--card-bg));
  border: 1px solid var(--line-strong, var(--primary-border));
  border-radius: var(--r-pill, 999px);
  padding: 0 5px 0 20px;
  box-shadow: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.search-container.focused {
  border-color: var(--ink-900, var(--primary-color));
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ink-900, var(--text-strong)) 4%, transparent);
}

.search-prefix-icon {
  flex: 0 0 auto;
  color: var(--ink-500, var(--text-muted));
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 56px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-weight: 400;
  color: var(--ink-900, var(--text-main));
  line-height: 56px;
}

.search-input::placeholder {
  color: var(--ink-500, var(--text-muted));
}

.search-btn {
  width: 61px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 61px;
  border-radius: 10px;
  background: var(--ink-900, var(--primary-color));
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  transition: background-color 0.15s ease;
}

.search-btn:hover {
  background: var(--ink-800, var(--primary-hover));
}

.popular-searches {
  width: 100%;
  margin-top: 35px;
}

.popular-label {
  margin: 0 0 14px;
  color: var(--ink-500, var(--text-muted));
  font-size: 12px;
  font-weight: 400;
  line-height: 1.2;
}

.popular-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 11px;
}

.popular-tag {
  height: 31px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid var(--line-strong, var(--border-color));
  border-radius: var(--r-pill, 999px);
  background: transparent;
  color: var(--ink-700, var(--text-main));
  font-size: 13px;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.popular-tag:hover {
  border-color: var(--accent, var(--primary-color));
  background: var(--accent-tint, var(--primary-soft));
  color: var(--ink-900, var(--text-strong));
}

@media (max-width: 640px) {
  .legal-search-view {
    padding: 36px 16px 48px;
  }

  .page-title {
    margin-bottom: 28px;
    font-size: 26px;
  }

  .legal-search-tabs {
    gap: 24px;
  }

  .legal-search-tab {
    padding-bottom: 14px;
  }

  .search-container {
    height: 54px;
    margin-top: 22px;
    gap: 9px;
    padding-left: 16px;
  }

  .search-input {
    height: 52px;
    font-size: 13px;
    line-height: 52px;
  }

  .search-btn {
    width: 56px;
    height: 36px;
    flex-basis: 56px;
  }

  .popular-searches {
    margin-top: 30px;
  }

  .popular-tag {
    height: 30px;
    padding: 0 12px;
    font-size: 12.5px;
  }
}
</style>
