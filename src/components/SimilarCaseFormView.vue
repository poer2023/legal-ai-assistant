<script setup lang="ts">
import { ref } from 'vue';
import {
  ChevronLeft,
  SearchCheck,
  Search,
  FileCheck,
  FileSearch,
  Upload,
  Database,
  HelpCircle
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

// 表单数据
const caseTitle = ref('');
const materialSource = ref('ai'); // ai | manual
const uploadedDocuments = ref<File[]>([]);
const selectedKnowledgeFiles = ref<string[]>([]);
const auxiliaryInfo = ref('');
const reportLanguage = ref('zh'); // zh | en
const reportLength = ref('medium'); // short | medium

const templateTypes = [
  { icon: SearchCheck, label: '类案检索报告', active: true },
  { icon: FileCheck, label: '文书审查' },
  { icon: FileSearch, label: '合同审查' },
];

const features = [
  '智能匹配相似案例判决',
  '自动提取裁判要点和规则',
  '分析判决趋势和倾向',
  '生成专业类案检索报告',
  '支持多维度案例筛选',
];

const knowledgeBaseFiles = [
  '张某与李某房屋买卖合同纠纷案.pdf',
  '王某诉某房地产公司案件材料.docx',
  '赵某商品房买卖合同纠纷.pdf',
  '陈某房产纠纷案例汇编.pdf',
  '刘某与某地产集团纠纷案.docx',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleDocumentUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    uploadedDocuments.value = [...uploadedDocuments.value, ...Array.from(target.files)];
  }
};

const removeDocument = (index: number) => {
  uploadedDocuments.value.splice(index, 1);
};

const toggleKnowledgeFile = (file: string) => {
  const index = selectedKnowledgeFiles.value.indexOf(file);
  if (index > -1) {
    selectedKnowledgeFiles.value.splice(index, 1);
  } else {
    selectedKnowledgeFiles.value.push(file);
  }
};

const clearTitle = () => {
  caseTitle.value = '';
};

const clearAuxiliary = () => {
  auxiliaryInfo.value = '';
};

const handleSubmit = () => {
  console.log('Submitting:', {
    caseTitle: caseTitle.value,
    materialSource: materialSource.value,
    uploadedDocuments: uploadedDocuments.value.map(f => f.name),
    selectedKnowledgeFiles: selectedKnowledgeFiles.value,
    auxiliaryInfo: auxiliaryInfo.value,
    reportLanguage: reportLanguage.value,
    reportLength: reportLength.value
  });
  
  // 构建订单信息用于确认页展示
  const lengthMap: Record<string, string> = { 'short': '短（约4000字）', 'medium': '中（约8000字）' };
  const orderItems = [
    { label: '案件标题', value: caseTitle.value || '未指定' },
    { label: '报告语言', value: reportLanguage.value === 'zh' ? '中文' : '英文' },
    { label: '报告长度', value: lengthMap[reportLength.value] || reportLength.value },
  ];
  
  router.push({ 
    name: 'agent-generic-confirm',
    query: {
      type: '类案检索报告',
      next: 'similar-case-result',
      file: `案件：${caseTitle.value}`,
      order: JSON.stringify(orderItems)
    }
  });
};
</script>

<template>
  <div class="review-form-page">
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
          <SearchCheck :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">类案检索报告</h1>
          <p class="form-subtitle">智能检索相似案例，分析裁判规则，生成专业类案报告</p>
        </div>
      </div>

      <div class="form-content">
        <!-- 案件标题 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 案件标题
          </label>
          <div class="input-with-clear">
            <input
              v-model="caseTitle"
              type="text"
              class="form-input"
              placeholder="请输入案件标题，如：张某与李某房屋买卖合同纠纷案"
              maxlength="100"
            />
            <button v-if="caseTitle" class="clear-btn" @click="clearTitle">清空</button>
          </div>
          <span class="char-count">{{ caseTitle.length }} / 100</span>
        </div>

        <!-- 案件材料 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 案件材料
            <HelpCircle :size="14" class="help-icon" />
          </label>
          <div class="option-cards two-cols">
            <div
              class="option-card"
              :class="{ active: materialSource === 'ai' }"
              @click="materialSource = 'ai'"
            >
              AI智能
            </div>
            <div
              class="option-card"
              :class="{ active: materialSource === 'manual' }"
              @click="materialSource = 'manual'"
            >
              手动上传
            </div>
          </div>

          <!-- 手动上传区域 -->
          <div v-if="materialSource === 'manual'" class="upload-section">
            <p class="upload-tip">
              为保证检索质量，所选文件内如包含图片、图表、音视频等不会进行学习；<br>
              最多可选50个文件，支持.pdf,.PDF格式
            </p>

            <div class="upload-cards">
              <label class="upload-card">
                <input type="file" @change="handleDocumentUpload" accept=".pdf,.doc,.docx" hidden multiple />
                <Upload :size="28" class="upload-icon" />
                <div class="card-title">点击上传案件原文</div>
                <div class="card-subtitle">支持拖拽文件到此处上传</div>
              </label>

              <div class="upload-card knowledge-card" @click="materialSource = 'knowledge'">
                <Database :size="28" class="upload-icon" />
                <div class="card-title">从知识库中选择文档</div>
              </div>
            </div>

            <!-- 已上传文件列表 -->
            <div v-if="uploadedDocuments.length > 0" class="uploaded-list">
              <div v-for="(doc, index) in uploadedDocuments" :key="index" class="uploaded-item">
                <span class="file-name">{{ doc.name }}</span>
                <button class="remove-btn" @click="removeDocument(index)">×</button>
              </div>
            </div>

            <!-- 知识库文件选择 -->
            <div class="knowledge-list">
              <div
                v-for="file in knowledgeBaseFiles"
                :key="file"
                class="knowledge-item"
                :class="{ selected: selectedKnowledgeFiles.includes(file) }"
                @click="toggleKnowledgeFile(file)"
              >
                <span class="checkbox">{{ selectedKnowledgeFiles.includes(file) ? '✓' : '' }}</span>
                <span class="file-name">{{ file }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 辅助信息 -->
        <div class="form-group">
          <label class="form-label">辅助信息</label>
          <div class="textarea-wrapper">
            <textarea
              v-model="auxiliaryInfo"
              class="form-textarea"
              placeholder="请补充以下信息以提高检索精度（选填）：&#10;1. 案由：如民间借贷纠纷、买卖合同纠纷、劳动争议等&#10;2. 我方身份：原告/被告&#10;3. 争议焦点：如借款本金及利息认定、合同效力争议等&#10;4. 期望检索方向：如近3年判例、特定地区法院等"
              maxlength="5000"
              rows="7"
            ></textarea>
            <button v-if="auxiliaryInfo" class="clear-btn textarea-clear" @click="clearAuxiliary">清空</button>
          </div>
          <span class="char-count">{{ auxiliaryInfo.length }} / 5000</span>
        </div>


        <!-- 报告语言 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 报告语言
          </label>
          <div class="option-cards two-cols">
            <div
              class="option-card with-prefix"
              :class="{ active: reportLanguage === 'zh' }"
              @click="reportLanguage = 'zh'"
            >
              <span class="prefix">中</span>
              中文
            </div>
            <div
              class="option-card with-prefix"
              :class="{ active: reportLanguage === 'en' }"
              @click="reportLanguage = 'en'"
            >
              <span class="prefix">En</span>
              英文
            </div>
          </div>
        </div>

        <!-- 报告长度 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 报告长度（英文减半）
          </label>
          <div class="option-cards two-cols">
            <div
              class="option-card with-prefix"
              :class="{ active: reportLength === 'short' }"
              @click="reportLength = 'short'"
            >
              <span class="prefix">短</span>
              短（约4000字）
            </div>
            <div
              class="option-card with-prefix"
              :class="{ active: reportLength === 'medium' }"
              @click="reportLength = 'medium'"
            >
              <span class="prefix">中</span>
              中（约8000字）
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
          <button class="submit-btn" @click="handleSubmit">
            生成类案检索报告
          </button>
        </div>
      </div>
    </main>

    <!-- Right Info Card -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="info-icon">🔍</div>
        <h3 class="info-title">类案检索报告</h3>
        <p class="info-desc">AI智能检索，快速定位相似案例和裁判规则</p>
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
.review-form-page {
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
  margin-bottom: 10px;
}

.required {
  color: #2563eb;
}

.help-icon {
  color: #94a3b8;
  cursor: help;
}

/* Input with Clear */
.input-with-clear {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  padding: 12px 70px 12px 16px;
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

.clear-btn {
  position: absolute;
  right: 12px;
  padding: 4px 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
}

.clear-btn:hover {
  color: #64748b;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
}

/* Option Cards */
.option-cards {
  display: grid;
  gap: 12px;
}

.option-cards.two-cols {
  grid-template-columns: repeat(2, 1fr);
}

.option-cards.three-cols {
  grid-template-columns: repeat(3, 1fr);
}

.option-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.option-card.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.option-card.with-prefix {
  justify-content: flex-start;
  padding-left: 16px;
}

.option-card .prefix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.option-card.active .prefix {
  background: #dbeafe;
  color: #2563eb;
}

/* Upload Section */
.upload-section {
  margin-top: 16px;
}

.upload-tip {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 16px 0;
}

.upload-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.upload-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 24px;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  background: #fafbfc;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-card:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.upload-icon {
  color: #3b82f6;
}

.upload-card .card-title {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.upload-card .card-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.knowledge-card {
  border-style: solid;
  background: white;
}

/* Uploaded List */
.uploaded-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uploaded-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f0fdf4;
  border-radius: 8px;
}

.uploaded-item .file-name {
  font-size: 13px;
  color: #16a34a;
}

.remove-btn {
  width: 20px;
  height: 20px;
  background: #dcfce7;
  border: none;
  border-radius: 50%;
  color: #16a34a;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: #bbf7d0;
}

/* Knowledge List */
.knowledge-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.knowledge-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.knowledge-item:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.knowledge-item.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.knowledge-item .checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #2563eb;
  font-weight: bold;
}

.knowledge-item.selected .checkbox {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.knowledge-item .file-name {
  font-size: 13px;
  color: #334155;
}

/* Textarea */
.textarea-wrapper {
  position: relative;
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
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s;
}

.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.textarea-clear {
  top: 12px;
  right: 12px;
}

/* Submit */
.submit-container {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-bottom: 40px;
}

.submit-btn {
  min-width: 200px;
  padding: 14px 48px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.submit-btn:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
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
