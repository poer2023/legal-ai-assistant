<script setup lang="ts">
import { ref } from 'vue';
import { Search, RefreshCw, ChevronDown } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const searchQuery = ref('');
const activeTab = ref<'cases' | 'regulations' | 'penalties'>('cases');

// Search scope options
const searchScope = ref('全文');
const searchScopeOptions = ['全文', '标题', '案号', '当事人', '法官'];
const showScopeDropdown = ref(false);

// Sample questions by tab
const caseSampleQuestions = [
  '我家房屋因被认定为违章建筑遭城管部门强拆，但未收到任何书面通知',
  '试用期可以通过二次约定延长吗',
  '满足哪些条件可以判缓刑',
  '满足哪些条件可以退一赔三',
];

const regulationSampleQuestions = [
  '中华人民共和国民法典',
  '劳动合同法关于试用期的规定',
  '刑法关于缓刑的适用条件',
  '消费者权益保护法退一赔三',
];

const penaltySampleQuestions = [
  '环境保护行政处罚案例',
  '食品安全违法处罚标准',
  '安全生产违法行为处罚',
  '税务违法行为行政处罚',
];

const getSampleQuestions = () => {
  switch (activeTab.value) {
    case 'cases':
      return caseSampleQuestions;
    case 'regulations':
      return regulationSampleQuestions;
    case 'penalties':
      return penaltySampleQuestions;
    default:
      return caseSampleQuestions;
  }
};

const handleSearch = () => {
  router.push({ 
    name: 'legal-search-results',
    query: { q: searchQuery.value || '缓刑条件', tab: activeTab.value }
  });
};

const handleQuestionClick = (question: string) => {
  searchQuery.value = question;
  handleSearch();
};

const selectSearchScope = (scope: string) => {
  searchScope.value = scope;
  showScopeDropdown.value = false;
};



const getPlaceholder = () => {
  switch (activeTab.value) {
    case 'cases':
      return '请输入司法案例关键词';
    case 'regulations':
      return '请输入法律法规关键词';
    case 'penalties':
      return '请输入行政处罚关键词';
    default:
      return '请输入搜索关键词';
  }
};
</script>

<template>
  <div class="legal-search-view">
    <div class="content-wrapper">
      <!-- Title Section -->
      <div class="title-section">
        <h1 class="page-title">
          法律检索，<span class="highlight">智能化检索法规和案例</span>
        </h1>
        <p class="subtitle">输入搜索内容检索相关司法案例、法律法规、行政处罚信息</p>
      </div>

      <!-- Tab Navigation - Matching Results Page Style -->
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
        <button 
          class="tab-item" 
          :class="{ active: activeTab === 'penalties' }"
          @click="activeTab = 'penalties'"
        >
          行政处罚
        </button>
      </nav>

      <!-- Search Container - Matching Results Page Style -->
      <div class="search-container">
        <!-- Search Scope Dropdown -->
        <div class="search-scope-wrapper" @click="showScopeDropdown = !showScopeDropdown">
          <span class="scope-label">{{ searchScope }}</span>
          <ChevronDown :size="16" class="dropdown-icon" />
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
        </div>
        
        <div class="search-input-wrapper">
          <input 
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="getPlaceholder()"
            @keyup.enter="handleSearch"
          />
        </div>
        
        <button class="search-btn" @click="handleSearch">
          <Search :size="16" />
          <span>检索</span>
        </button>
      </div>

      <!-- Sample Questions -->
      <div class="suggestions-section">
        <div class="suggestions-header">
          <span class="suggestions-title">试试这么搜：</span>
          <button class="refresh-btn">
            <RefreshCw :size="14" />
            <span>换一批</span>
          </button>
        </div>
        <div class="suggestions-grid">
          <div 
            v-for="(question, index) in getSampleQuestions()" 
            :key="index"
            class="suggestion-card"
            @click="handleQuestionClick(question)"
          >
            <span class="suggestion-icon">🔍</span>
            <span class="suggestion-text">{{ question }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-number">9,999+</span>
          <span class="stat-label">司法案例</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">5,000+</span>
          <span class="stat-label">法律法规</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-number">3,000+</span>
          <span class="stat-label">行政处罚</span>
        </div>
      </div>
    </div>

    <!-- Footer Disclaimer -->
    <div class="footer-disclaimer">
      服务生成的所有内容均由人工智能模型生成，其生成内容的准确性和完整性无法保证，不能代表我们的态度和观点。
    </div>
  </div>
</template>

<style scoped>
.legal-search-view {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  position: relative;
  overflow-y: auto;
  background: #f0f4fa;
}

.content-wrapper {
  width: 100%;
  max-width: 800px;
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title-section {
  text-align: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.highlight {
  color: #2563eb;
}

.subtitle {
  font-size: 15px;
  color: #64748b;
  margin: 0;
}

/* Tab Navigation - Matching Results Page */
.tab-navigation {
  display: flex;
  gap: 32px;
  margin-bottom: 24px;
}

.tab-item {
  position: relative;
  padding: 8px 4px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: color 0.2s;
}

.tab-item:hover {
  color: #2563eb;
}

.tab-item.active {
  color: #2563eb;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #2563eb;
  border-radius: 1px;
}

/* Search Container - Matching Results Page */
.search-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0;
  background: white;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.search-scope-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border-right: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
}

.scope-label {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.dropdown-icon {
  color: #94a3b8;
}

.scope-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 100px;
}

.scope-option {
  padding: 10px 16px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: background-color 0.2s;
}

.scope-option:first-child {
  border-radius: 8px 8px 0 0;
}

.scope-option:last-child {
  border-radius: 0 0 8px 8px;
}

.scope-option:hover {
  background: #f1f5f9;
}

.scope-option.active {
  color: #2563eb;
  background: #eff6ff;
}

.search-input-wrapper {
  flex: 1;
  padding: 0 16px;
}

.search-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 15px;
  color: #334155;
  background: transparent;
  padding: 12px 0;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  background: #2563eb;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-btn:hover {
  background: #1d4ed8;
}

/* Suggestions Section */
.suggestions-section {
  width: 100%;
  margin-top: 40px;
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.suggestions-title {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  color: #2563eb;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.suggestion-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-card:hover {
  background: #f8fafc;
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.suggestion-icon {
  font-size: 14px;
  opacity: 0.6;
}

.suggestion-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Quick Stats */
.quick-stats {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-top: 48px;
  padding: 24px 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #e2e8f0;
}

/* Footer */
.footer-disclaimer {
  position: absolute;
  bottom: 24px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}
</style>
