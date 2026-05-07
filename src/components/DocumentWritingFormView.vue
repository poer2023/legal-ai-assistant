<script setup lang="ts">
import { ref } from 'vue';
import { 
  ChevronLeft, 
  PenTool,
  Search,
  FileText,
  FileEdit,
  HelpCircle
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

// Form state
const topic = ref('');
const outlineMode = ref('AI智能');
const backgroundDocMode = ref('无');
const auxiliaryInfo = ref('');
const language = ref('中文');
const selectedLength = ref('超短');
const uploadedTemplate = ref<File | null>(null);
const uploadedBackground = ref<File | null>(null);

const templateTypes = [
  { icon: PenTool, label: '文书写作', active: true },
  { icon: FileEdit, label: '起草合规' },
  { icon: FileText, label: '证据清单' },
];

const features = [
  '智能生成各类法律文书初稿',
  '自动适配正式法律公文格式',
  '精准提取案情核心要点',
  '支持多种写作风格切换',
  '显著提高法律文书起草效率',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleTemplateUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedTemplate.value = target.files[0];
  }
};

const handleBackgroundUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedBackground.value = target.files[0];
  }
};

const clearTopic = () => {
  topic.value = '';
};

const clearAuxiliary = () => {
  auxiliaryInfo.value = '';
};

const handleSubmit = () => {
  console.log('Submitting:', { 
    topic: topic.value,
    outlineMode: outlineMode.value,
    backgroundDocMode: backgroundDocMode.value,
    auxiliaryInfo: auxiliaryInfo.value,
    language: language.value,
    length: selectedLength.value,
    template: uploadedTemplate.value?.name,
    background: uploadedBackground.value?.name
  });

  // 构建订单信息用于确认页展示
  const lengthMap: Record<string, string> = { '超短': '约700字', '短': '约2000字', '中': '约4000字', '长': '约8000字' };
  const orderItems = [
    { label: '主题', value: topic.value || '未指定' },
    { label: '写作大纲', value: outlineMode.value },
    { label: '语言', value: language.value },
    { label: '篇幅长度', value: lengthMap[selectedLength.value] || selectedLength.value },
  ];
  
  router.push({ 
    name: 'agent-generic-confirm',
    query: {
      type: '文书写作',
      next: 'document-writing-result',
      file: topic.value,
      order: JSON.stringify(orderItems)
    }
  });
};
</script>

<template>
  <div class="writing-form-page">
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
    </aside>

    <!-- Main Form Area -->
    <main class="form-main">
      <div class="form-header">
        <div class="form-icon">
          <PenTool :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">文书写作</h1>
          <p class="form-subtitle">AI执笔，为您起草专业规范的各类法律文书</p>
        </div>
      </div>
      <div class="form-content">
        <!-- 主题 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 主题
          </label>
          <div class="input-with-action">
            <input 
              v-model="topic"
              type="text"
              class="form-input"
              placeholder="请输入清晰准确的文书主题，如：关于XX事项的律师函/起诉状/答辩状/代理词（必填）"
              maxlength="100"
            />
            <button class="clear-btn" @click="clearTopic" v-if="topic">清空</button>
          </div>
          <span class="char-count">{{ topic.length }} / 100</span>
        </div>

        <!-- 写作大纲 -->
        <div class="form-group">
          <label class="form-label">
            写作大纲 
            <HelpCircle :size="14" class="help-icon" />
          </label>
          <div class="option-selector two-col">
            <button 
              class="option-btn"
              :class="{ active: outlineMode === 'AI智能' }"
              @click="outlineMode = 'AI智能'"
            >
              AI智能
            </button>
            <button 
              class="option-btn"
              :class="{ active: outlineMode === '指定大纲' }"
              @click="outlineMode = '指定大纲'"
            >
              指定大纲
            </button>
          </div>
        </div>

        <!-- 背景文档 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 背景文档 
            <HelpCircle :size="14" class="help-icon" />
          </label>
          <div class="option-selector two-col">
            <button 
              class="option-btn"
              :class="{ active: backgroundDocMode === '无' }"
              @click="backgroundDocMode = '无'"
            >
              无
            </button>
            <label class="option-btn upload-option" :class="{ active: backgroundDocMode === '手动上传' }">
              <input type="file" @change="handleBackgroundUpload" hidden />
              <span @click="backgroundDocMode = '手动上传'">手动上传</span>
            </label>
          </div>
          <span v-if="uploadedBackground" class="uploaded-hint">✅ 已上传: {{ uploadedBackground.name }}</span>
        </div>

        <!-- 辅助信息 -->
        <div class="form-group">
          <label class="form-label">辅助信息</label>
          <div class="textarea-wrapper">
            <textarea 
              v-model="auxiliaryInfo"
              class="form-textarea" 
              placeholder="建议输入写作辅助信息，如：案件背景、当事人信息、核心诉求、关键证据等具体内容，输入越清晰具体，AI越能更好地理解你的创作需求（非必填）"
              maxlength="5000"
              rows="6"
            ></textarea>
            <button class="clear-btn textarea-clear" @click="clearAuxiliary" v-if="auxiliaryInfo">清空</button>
          </div>
          <span class="char-count textarea-count">{{ auxiliaryInfo.length }} / 5000</span>
        </div>

        <!-- 写作语言 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 写作语言
          </label>
          <div class="option-selector two-col">
            <button 
              class="option-btn lang-btn"
              :class="{ active: language === '中文' }"
              @click="language = '中文'"
            >
              <span class="lang-tag cn">中</span>
              中文
            </button>
            <button 
              class="option-btn lang-btn"
              :class="{ active: language === '英文' }"
              @click="language = '英文'"
            >
              <span class="lang-tag en">En</span>
              英文
            </button>
          </div>
        </div>

        <!-- 篇幅长度 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 篇幅长度（英文减半）
          </label>
          <div class="option-selector four-col">
            <button 
              class="option-btn"
              :class="{ active: selectedLength === '超短' }"
              @click="selectedLength = '超短'"
            >
              <span class="option-tag xs">超短</span>
              约700字
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedLength === '短' }"
              @click="selectedLength = '短'"
            >
              <span class="option-tag s">短</span>
              约2000字
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedLength === '中' }"
              @click="selectedLength = '中'"
            >
              <span class="option-tag m">中</span>
              约4000字
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedLength === '长' }"
              @click="selectedLength = '长'"
            >
              <span class="option-tag l">长</span>
              约8000字
            </button>
          </div>
        </div>

        <!-- 指定模版 -->
        <div class="form-group">
          <label class="form-label">指定模版</label>
          <div class="template-upload-cards">
            <!-- Upload Card -->
            <label class="upload-card">
              <input type="file" @change="handleTemplateUpload" accept=".doc,.docx,.pdf" hidden />
              <div class="card-icon upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">点击上传文书模版</div>
              <div class="card-subtitle">支持拖拽文件到此处上传</div>
              <span v-if="uploadedTemplate" class="uploaded-file-name">✅ {{ uploadedTemplate.name }}</span>
            </label>
            
            <!-- Select from Knowledge Base Card -->
            <div class="upload-card knowledge-card">
              <div class="card-icon knowledge-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 11H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M11 8V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="card-title">从知识库中选择文书模版</div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
          <button class="submit-btn" @click="handleSubmit">
            开始写作
          </button>
        </div>
      </div>
    </main>

    <!-- Right Info Card -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="info-icon">✍️</div>
        <h3 class="info-title">文书写作</h3>
        <p class="info-desc">AI执笔，为您精准输出每一份法律文书</p>
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
.writing-form-page {
  display: flex;
  height: 100%;
  background: #f8fafc;
}

/* Template Sidebar */
.template-sidebar {
  width: 200px;
  background: white;
  border-right: 1px solid #e2e8f0;
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
  background: #eff6ff;
  border: none;
  border-radius: 6px;
  color: #2563eb;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #dbeafe;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.search-icon {
  color: #94a3b8;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 12px;
  color: #475569;
}

.template-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 12px;
  color: #94a3b8;
  padding: 8px 0 4px 0;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
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
  background: #eff6ff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.form-subtitle {
  font-size: 13px;
  color: #64748b;
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
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 8px;
}

.required {
  color: #2563eb;
}

.help-icon {
  color: #94a3b8;
  cursor: help;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #334155;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input::placeholder {
  color: #94a3b8;
}

.input-with-action {
  position: relative;
}

.clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.clear-btn:hover {
  color: #64748b;
}

.textarea-wrapper {
  position: relative;
}

.textarea-clear {
  top: 12px;
  transform: none;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  padding-right: 60px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #334155;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.6;
  transition: all 0.2s;
}

.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea::placeholder {
  color: #94a3b8;
}

.char-count {
  position: absolute;
  right: 12px;
  bottom: -20px;
  font-size: 12px;
  color: #94a3b8;
}

.textarea-count {
  bottom: 8px;
  right: 16px;
}

/* Option Selector */
.option-selector {
  display: flex;
  gap: 12px;
}

.option-selector.two-col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.option-selector.four-col {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.option-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.upload-option {
  cursor: pointer;
}

.uploaded-hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #22c55e;
}

/* Language Tags */
.lang-btn {
  justify-content: flex-start;
  padding-left: 16px;
}

.lang-tag {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.lang-tag.cn {
  background: #dbeafe;
  color: #2563eb;
}

.lang-tag.en {
  background: #fef3c7;
  color: #d97706;
}

/* Option Tags */
.option-tag {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 2px 8px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.option-btn.active .option-tag {
  background: #2563eb;
  color: white;
}

.option-tag.xs { background: #dbeafe; color: #2563eb; }
.option-tag.s { background: #fef3c7; color: #d97706; }
.option-tag.m { background: #fce7f3; color: #db2777; }
.option-tag.l { background: #f3e8ff; color: #9333ea; }

.option-btn.active .option-tag.xs { background: #2563eb; color: white; }
.option-btn.active .option-tag.s { background: #d97706; color: white; }
.option-btn.active .option-tag.m { background: #db2777; color: white; }
.option-btn.active .option-tag.l { background: #9333ea; color: white; }

/* Template Upload Cards */
.template-upload-cards {
  display: flex;
  gap: 16px;
}

.upload-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  min-height: 140px;
}

.upload-card:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.upload-icon {
  background: #eff6ff;
  color: #2563eb;
}

.knowledge-icon {
  background: #eff6ff;
  color: #2563eb;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.uploaded-file-name {
  margin-top: 8px;
  font-size: 12px;
  color: #22c55e;
}

/* Submit Button */
.submit-container {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-bottom: 40px;
}

.submit-btn {
  width: 200px;
  padding: 14px 48px;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover {
  background: #1e40af;
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
  color: #1e293b;
  margin: 0 0 8px 0;
}

.info-desc {
  font-size: 13px;
  color: #64748b;
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
  color: #475569;
  padding: 6px 0;
}

.bullet {
  color: #2563eb;
  font-size: 8px;
}
</style>
