<script setup lang="ts">
import { ref } from 'vue';
import { 
  ChevronLeft, 
  FileDiff,
  Search,
  FileText,
  ScanLine,
  FileCheck2
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const auxiliaryInfo = ref('');
const uploadedDoc1 = ref<File | null>(null);
const uploadedDoc2 = ref<File | null>(null);

const templateTypes = [
  { icon: FileDiff, label: '合同比对', active: true },
  { icon: FileText, label: '合同起草' },
  { icon: ScanLine, label: '扫描件解析' },
];

const features = [
  '快速对比多版本合同条款差异',
  '精准识别每一处细微修改',
  '自动提取新增、删除、修改项',
  '生成直观的对比分析报告',
  '大幅节省人工校对时间',
  '支持一键接受、拒绝或重写',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleDoc1Upload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedDoc1.value = target.files[0];
  }
};

const handleDoc2Upload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedDoc2.value = target.files[0];
  }
};

const handleSubmit = () => {
  // Navigation to result page
  router.push({ name: 'contract-comparison-result' });
};
</script>

<template>
  <div class="comparison-form-page">
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
          <FileDiff :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">合同比对</h1>
          <p class="form-subtitle">智能识别版本差异，快速掌控合同变更细节</p>
        </div>
      </div>

      <div class="form-content">
        <!-- Document Uploads -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 上传合同文档
          </label>
          <div class="template-upload-cards side-by-side">
            <label class="upload-card">
              <input type="file" @change="handleDoc1Upload" accept=".pdf,.doc,.docx" hidden />
              <div class="card-icon upload-icon">
                <FileText :size="24" />
              </div>
              <div class="card-title">基准合同</div>
              <div class="card-subtitle">点击上传基准版本</div>
              <span v-if="uploadedDoc1" class="uploaded-file-name">✅ {{ uploadedDoc1.name }}</span>
            </label>

            <label class="upload-card">
              <input type="file" @change="handleDoc2Upload" accept=".pdf,.doc,.docx" hidden />
              <div class="card-icon upload-icon">
                <FileCheck2 :size="24" />
              </div>
              <div class="card-title">对象合同</div>
              <div class="card-subtitle">点击上传待比对版本</div>
              <span v-if="uploadedDoc2" class="uploaded-file-name">✅ {{ uploadedDoc2.name }}</span>
            </label>
          </div>
        </div>

        <!-- Comparison Requirements -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 比对要求
          </label>
          <textarea 
            v-model="auxiliaryInfo"
            class="form-textarea" 
            placeholder="请输入具体的比对要求，例如：重点关注违约责任条款的变更..."
            maxlength="1000"
            rows="8"
          ></textarea>
          <span class="char-count textarea-count">{{ auxiliaryInfo.length }} / 1000</span>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
          <button class="submit-btn" @click="handleSubmit">
            开始比对
          </button>
        </div>
      </div>
    </main>

    <!-- Right Info Card -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="info-icon">📑</div>
        <h3 class="info-title">合同比对</h3>
        <p class="info-desc">AI动态版本对比，让每一处变更都清晰可见</p>
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
.comparison-form-page {
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

.search-input::placeholder {
  color: #94a3b8;
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

.template-item:hover {
  background: #f1f5f9;
}

.template-item.active {
  background: #eff6ff;
  color: #2563eb;
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

.side-by-side .upload-card {
  flex: 1;
}

.upload-card {
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
</style>
