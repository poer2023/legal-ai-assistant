<script setup lang="ts">
import { ref } from 'vue';
import { 
  ChevronLeft, 
  FileText, 
  ScanLine, 
  PenTool, 
  FileEdit, 
  BookOpen,
  Lightbulb,
  Search
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const title = ref('');
const auxiliaryInfo = ref('');
const selectedOutline = ref('ai');
const selectedStyle = ref('学术风格');
const selectedReference = ref('ai');
const selectedLanguage = ref('zh');
const selectedLength = ref('8000');

const templateTypes = [
  { icon: PenTool, label: '法律研究报告', active: true },
  { icon: FileEdit, label: '民事起诉状' },
  { icon: ScanLine, label: '扫描件解析' },
];

const moreTemplates = [
  { icon: BookOpen, label: '论文大纲' },
  { icon: FileText, label: '文章撰述' },
  { icon: Lightbulb, label: '设计说明书' },
];

const features = [
  '文笔质量高、专业全面',
  '联网+知识库检索参考资料',
  '可指定大纲、参考文献',
  '格式规范、满足学术要求',
  'AI原创、仅供参考',
  '禁止作为毕业、发表使用',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleSubmit = () => {
  console.log('Submitting:', {
    title: title.value,
    auxiliaryInfo: auxiliaryInfo.value,
    outline: selectedOutline.value,
    style: selectedStyle.value,
    reference: selectedReference.value,
    language: selectedLanguage.value,
    length: selectedLength.value
  });

  // 构建订单信息用于确认页展示
  const lengthMap: Record<string, string> = { '4000': '约4000字', '8000': '约8000字', '15000': '约15000字' };
  const orderItems = [
    { label: '研究主题', value: title.value || '未指定' },
    { label: '写作风格', value: selectedStyle.value },
    { label: '语言', value: selectedLanguage.value === 'zh' ? '中文' : '英文' },
    { label: '篇幅长度', value: lengthMap[selectedLength.value] || selectedLength.value },
  ];
  
  router.push({ 
    name: 'agent-generic-confirm',
    query: {
      type: '法律研究报告',
      next: 'legal-research-result',
      file: title.value,
      order: JSON.stringify(orderItems)
    }
  });
};

const handleFileUpload = () => {
  // TODO: Implement file upload logic
  console.log('File upload clicked');
};

const handleKnowledgeSelect = () => {
  // TODO: Implement knowledge base selection
  console.log('Knowledge base selection clicked');
};
</script>

<template>
  <div class="research-form-page">
    <!-- Left Sidebar: Template Types -->
    <aside class="template-sidebar">
      <button class="back-btn" @click="goBack">
        <ChevronLeft :size="16" />
        <span>返回智能体应用市场</span>
      </button>

      <div class="search-box">
        <Search :size="14" class="search-icon" />
        <input type="text" placeholder="搜索其它写作类型" class="search-input" />
      </div>

      <div class="template-section">
        <div class="section-title">最近使用</div>
        <div 
          v-for="(item, index) in templateTypes" 
          :key="index"
          class="template-item"
          :class="{ active: item.active }"
        >
          <component :is="item.icon" :size="16" class="item-icon" />
          <span>{{ item.label }}</span>
        </div>
      </div>

      <div class="template-section">
        <div class="section-title">你可能需要</div>
        <div 
          v-for="(item, index) in moreTemplates" 
          :key="index"
          class="template-item"
        >
          <component :is="item.icon" :size="16" class="item-icon" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </aside>

    <!-- Main Form Area -->
    <main class="form-main">
      <div class="form-header">
        <div class="form-icon">
          <PenTool :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">法律研究报告</h1>
          <p class="form-subtitle">基于专业知识库的法律研究专家</p>
        </div>
      </div>
      <div class="form-content">
        <!-- Title Input -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 标题
          </label>
          <input 
            v-model="title"
            type="text" 
            class="form-input" 
            placeholder="请输入清晰准确的标题，如：儿童心理健康与原生家庭环境关系研究（必填）"
            maxlength="150"
          />
          <span class="char-count">{{ title.length }} / 150</span>
        </div>

        <!-- Outline Selector -->
        <div class="form-group">
          <label class="form-label">
            写作大纲 <span class="label-hint">ⓘ</span>
          </label>
          <div class="option-selector">
            <button 
              class="option-btn wide"
              :class="{ active: selectedOutline === 'ai' }"
              @click="selectedOutline = 'ai'"
            >
              AI智能
            </button>
            <button 
              class="option-btn wide"
              :class="{ active: selectedOutline === 'custom' }"
              @click="selectedOutline = 'custom'"
            >
              指定大纲
            </button>
          </div>
        </div>

        <!-- Writing Style Selector -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 写作风格 <span class="label-hint">ⓘ</span>
          </label>
          <div class="option-selector style-grid">
            <button 
              class="option-btn"
              :class="{ active: selectedStyle === '学术风格' }"
              @click="selectedStyle = '学术风格'"
            >
              <span class="option-tag academic">学</span>
              学术风格
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedStyle === '实务风格' }"
              @click="selectedStyle = '实务风格'"
            >
              <span class="option-tag practical">实</span>
              实务风格
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedStyle === '简明风格' }"
              @click="selectedStyle = '简明风格'"
            >
              <span class="option-tag concise">简</span>
              简明风格
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedStyle === '论证风格' }"
              @click="selectedStyle = '论证风格'"
            >
              <span class="option-tag argument">论</span>
              论证风格
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedStyle === '综述风格' }"
              @click="selectedStyle = '综述风格'"
            >
              <span class="option-tag review">综</span>
              综述风格
            </button>
          </div>
        </div>

        <!-- Reference Selector -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 参考文献 <span class="label-hint">ⓘ</span>
          </label>
          <div class="option-selector">
            <button 
              class="option-btn wide"
              :class="{ active: selectedReference === 'ai' }"
              @click="selectedReference = 'ai'"
            >
              AI智能
            </button>
            <button 
              class="option-btn wide"
              :class="{ active: selectedReference === 'manual' }"
              @click="selectedReference = 'manual'"
            >
              手动上传
            </button>
          </div>
          
          <!-- Manual Upload Panel -->
          <div v-if="selectedReference === 'manual'" class="upload-panel">
            <div class="upload-boxes">
              <div class="upload-box" @click="handleFileUpload">
                <div class="upload-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="17,8 12,3 7,8" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="upload-title">点击上传文献原文</div>
                <div class="upload-hint">支持拖拽文件到此处上传</div>
              </div>
              
              <div class="upload-box" @click="handleKnowledgeSelect">
                <div class="upload-icon knowledge">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="var(--warning-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="3.27,6.96 12,12.01 20.73,6.96" stroke="var(--warning-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="22.08" x2="12" y2="12" stroke="var(--warning-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="upload-title">从知识库中选择文档</div>
              </div>
            </div>
          </div>
        </div>



        <!-- Auxiliary Info -->
        <div class="form-group">
          <label class="form-label">辅助信息</label>
          <textarea 
            v-model="auxiliaryInfo"
            class="form-textarea" 
            placeholder="建议输入论文的创作辅助信息，以便于AI更准确地理解你的创作需求，如：论文关键词、核心观点、最新数据等（非必填）"
            maxlength="2000"
            rows="5"
          ></textarea>
          <span class="char-count textarea-count">{{ auxiliaryInfo.length }} / 2000</span>
        </div>

        <!-- Language Selector -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 写作语言
          </label>
          <div class="option-selector">
            <button 
              class="option-btn wide"
              :class="{ active: selectedLanguage === 'zh' }"
              @click="selectedLanguage = 'zh'"
            >
              <span class="option-icon">🇨🇳</span>
              中文
            </button>
            <button 
              class="option-btn wide"
              :class="{ active: selectedLanguage === 'en' }"
              @click="selectedLanguage = 'en'"
            >
              <span class="option-code">En</span>
              英文
            </button>
          </div>
        </div>

        <!-- Length Selector -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 篇幅长度（英文减半）
          </label>
          <div class="option-selector three-col">
            <button 
              class="option-btn"
              :class="{ active: selectedLength === '4000' }"
              @click="selectedLength = '4000'"
            >
              <span class="option-tag">短</span>
              短（约 4000字）
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedLength === '8000' }"
              @click="selectedLength = '8000'"
            >
              <span class="option-tag">中</span>
              中（约 8000字）
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedLength === '20000' }"
              @click="selectedLength = '20000'"
            >
              <span class="option-tag">长</span>
              长（约 20000字）
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
          <button class="submit-btn" @click="handleSubmit">
            写作
          </button>
        </div>
      </div>
    </main>

    <!-- Right Info Card -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="info-icon">📝</div>
        <h3 class="info-title">法律研究报告</h3>
        <p class="info-desc">基于专业知识库的论文专家</p>
        <ul class="feature-list">
          <li v-for="(feature, index) in features" :key="index">
            <span class="bullet">●</span>
            {{ feature }}
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.research-form-page {
  display: flex;
  height: 100%;
  background: var(--bg-color);
}

/* Template Sidebar */
.template-sidebar {
  width: 200px;
  background: white;
  border-right: 1px solid var(--border-color);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: var(--primary-soft);
  border: none;
  border-radius: 6px;
  color: var(--primary-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--primary-soft-strong);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.search-icon {
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  color: var(--text-secondary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.template-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 0 4px 0;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  background: var(--surface-soft);
}

.template-item.active {
  background: var(--primary-soft);
  color: var(--primary-color);
  font-weight: 500;
}

.item-icon {
  flex-shrink: 0;
}

/* Main Form */
.form-main {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.form-icon {
  width: 40px;
  height: 40px;
  background: var(--primary-soft);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.form-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.form-content {
  max-width: 100%;
  padding-right: 40px;
}

.form-group {
  margin-bottom: 24px;
  position: relative;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 8px;
}

.required {
  color: var(--diff-removed);
  margin-right: 2px;
}

.label-hint {
  color: var(--text-muted);
  font-size: 12px;
  margin-left: 4px;
  cursor: help;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s;
}

.form-textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea::placeholder {
  color: var(--text-muted);
}

.char-count {
  position: absolute;
  right: 12px;
  bottom: -20px;
  font-size: 12px;
  color: var(--text-muted);
}

.textarea-count {
  bottom: 8px;
}

.option-selector {
  display: flex;
  gap: 12px;
}

.option-selector.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.option-selector.style-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.option-selector.style-grid .option-btn {
  flex: 0 0 calc(33.333% - 12px);
  min-width: 140px;
}

@media (max-width: 900px) {
  .option-selector.style-grid .option-btn {
    flex: 0 0 calc(50% - 8px);
  }
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn.wide {
  flex: 1;
  justify-content: center;
}

.option-btn:hover {
  border-color: var(--border-color);
  background: var(--bg-color);
}

.option-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-soft);
  color: var(--primary-color);
}

.option-icon {
  font-size: 16px;
}

.option-code {
  font-weight: 600;
  color: var(--primary-color);
}

.option-tag {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  background: var(--primary-soft);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.option-btn.active .option-tag {
  background: var(--primary-color);
  color: white;
}

.option-tag.academic {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.option-btn.active .option-tag.academic {
  background: var(--primary-color);
  color: white;
}

.option-tag.practical {
  background: var(--warning-soft);
  color: var(--warning-color);
}

.option-btn.active .option-tag.practical {
  background: var(--warning-color);
  color: white;
}

.option-tag.concise {
  background: var(--diff-added-soft);
  color: var(--diff-added);
}

.option-btn.active .option-tag.concise {
  background: var(--diff-added);
  color: white;
}

.option-tag.argument {
  background: var(--skill-soft);
  color: var(--skill-color);
}

.option-btn.active .option-tag.argument {
  background: var(--skill-color);
  color: white;
}

.option-tag.review {
  background: var(--diff-removed-soft);
  color: var(--diff-removed);
}

.option-btn.active .option-tag.review {
  background: var(--diff-removed);
  color: white;
}

.submit-container {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-bottom: 40px;
}

.submit-btn {
  width: 200px;
  padding: 14px 48px;
  background: var(--primary-color);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover {
  background: var(--primary-hover);
}

/* Upload Panel */
.upload-panel {
  margin-top: 16px;
}

.upload-boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: white;
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 140px;
}

.upload-box:hover {
  border-color: var(--primary-color);
  background: var(--bg-color);
}

.upload-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-soft);
  border-radius: 12px;
  margin-bottom: 12px;
}

.upload-icon.knowledge {
  background: var(--warning-soft);
}

.upload-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-muted);
}

/* Info Sidebar */
.info-sidebar {
  width: 280px;
  padding: 24px;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.info-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 8px 0;
}

.info-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 6px 0;
}

.bullet {
  color: var(--primary-color);
  font-size: 8px;
}
</style>
