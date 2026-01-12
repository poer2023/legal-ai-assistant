<script setup lang="ts">
import { ref } from 'vue';
import {
  ChevronLeft,
  FileCheck,
  Search,
  ShieldCheck,
  Zap,
  CheckCircle,
  FileSearch,
  AlertCircle
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const selectedDocumentType = ref('判决书');
const reviewRequirements = ref('');
const uploadedDocument = ref<File | null>(null);

const documentTypes = ['判决书', '裁定书', '调解书', '决定书', '通知书', '令', '其他'];

const templateTypes = [
  { icon: FileCheck, label: '文书审查', active: true },
  { icon: FileSearch, label: '合同审查' },
  { icon: ShieldCheck, label: '合规校验' },
];

const features = [
  '深层次挖掘文书潜在法律漏洞',
  '自动校验法律法规适用准确性',
  '全面审查事实描述与证据逻辑',
  '支持自定义审查维度及重点项',
  '输出结构化的专业审查结论',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleDocumentUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedDocument.value = target.files[0];
  }
};

const handleSubmit = () => {
  console.log('Submitting:', {
    documentType: selectedDocumentType.value,
    reviewRequirements: reviewRequirements.value,
    document: uploadedDocument.value?.name
  });
  // Navigate to confirm page
  router.push({ 
    name: 'agent-generic-confirm',
    query: {
      type: '文书审查',
      next: 'document-review-result',
      file: uploadedDocument.value?.name || selectedDocumentType.value
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
          <FileCheck :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">文书审查</h1>
          <p class="form-subtitle">深度透视法律文书，确保每一处细节都合法、合规、严密</p>
        </div>
      </div>

      <div class="form-content">
        <!-- Document Upload -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 上传待审文书
          </label>
          <div class="template-upload-cards">
            <label class="upload-card">
              <input type="file" @change="handleDocumentUpload" accept=".pdf,.doc,.docx" hidden />
              <div class="card-icon upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">点击上传需要审查的文书</div>
              <div class="card-subtitle">支持DOCX、PDF等格式</div>
              <span v-if="uploadedDocument" class="uploaded-file-name">✅ {{ uploadedDocument.name }}</span>
            </label>
          </div>
        </div>

        <!-- Document Type Selector -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 文书类型
          </label>
          <div class="option-selector">
            <button
              v-for="docType in documentTypes"
              :key="docType"
              class="option-btn"
              :class="{ active: selectedDocumentType === docType }"
              @click="selectedDocumentType = docType"
            >
              {{ docType }}
            </button>
          </div>
        </div>

        <!-- Review Requirements -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 审查要求
          </label>
          <textarea
            v-model="reviewRequirements"
            class="form-textarea"
            placeholder="请输入您的具体审查要求，如：重点审查赔偿数额计算、事实认定逻辑、法律适用准确性等"
            maxlength="1000"
            rows="6"
          ></textarea>
          <span class="char-count textarea-count">{{ reviewRequirements.length }} / 1000</span>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
          <button class="submit-btn" @click="handleSubmit">
            开始审查
          </button>
        </div>
      </div>
    </main>

    <!-- Right Info Card -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="info-icon">🔍</div>
        <h3 class="info-title">文书审查</h3>
        <p class="info-desc">AI智能辅助，全方位把关法律文书的核心质量</p>
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
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 8px;
}

.required {
  color: #2563eb;
  margin-right: 2px;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #334155;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s;
}

.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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

/* Option Selector */
.option-selector {
  display: flex;
  gap: 12px;
}

.option-selector.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.option-btn.wide {
  flex: 1;
  justify-content: center;
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
  background: #eff6ff;
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
</style>
