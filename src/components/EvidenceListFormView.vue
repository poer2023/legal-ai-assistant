<script setup lang="ts">
import { ref } from 'vue';
import { 
  ChevronLeft, 
  FileText, 
  FileEdit, 
  Mail, 
  ClipboardList,
  Search,
  FolderSearch,
  Scale,
  Gavel,
  ShieldCheck,
  X,
  FileImage,
  FileAudio,
  FileSpreadsheet,
  File
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const selectedLitigationType = ref('民事诉讼');
const caseReason = ref('');
const plaintiffName = ref('');
const defendantName = ref('');
const auxiliaryInfo = ref('');
const uploadedFiles = ref<File[]>([]);

// 文件类型图标映射
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return FileImage;
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return FileAudio;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['doc', 'docx', 'pdf', 'txt'].includes(ext)) return FileText;
  return File;
};

// 文件大小格式化
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 获取文件扩展名
const getFileExtension = (fileName: string) => {
  return fileName.split('.').pop()?.toUpperCase() || 'FILE';
};

const templateTypes = [
  { icon: FolderSearch, label: '证据清单整理', active: true },
  { icon: FileEdit, label: '民事起诉状' },
  { icon: Gavel, label: '刑事起诉状' },
];

const moreTemplates = [
  { icon: FileText, label: '合同协议' },
  { icon: Mail, label: '书信函件' },
  { icon: ClipboardList, label: '申请书' },
];

const features = [
  '智能识别证据材料关键信息',
  '自动生成规范化证据清单',
  '构建完整证据链条',
  '支持多种文件格式解析',
  '大幅提升案件准备效率',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleEvidenceUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    // 添加新文件到数组
    const newFiles = Array.from(target.files);
    uploadedFiles.value = [...uploadedFiles.value, ...newFiles];
    // 清空input以便再次选择相同文件
    target.value = '';
  }
};

const removeFile = (index: number) => {
  uploadedFiles.value.splice(index, 1);
};

const handleSubmit = () => {
  console.log('Submitting:', { 
    litigationType: selectedLitigationType.value,
    caseReason: caseReason.value,
    plaintiffName: plaintiffName.value,
    defendantName: defendantName.value,
    auxiliaryInfo: auxiliaryInfo.value,
    files: uploadedFiles.value.map(f => f.name)
  });
  
  // 构建订单信息用于确认页展示
  const orderItems = [
    { label: '诉讼类型', value: selectedLitigationType.value },
    { label: '案由', value: caseReason.value || '未指定' },
  ];
  if (plaintiffName.value) {
    orderItems.push({ label: '原告', value: plaintiffName.value });
  }
  if (defendantName.value) {
    orderItems.push({ label: '被告', value: defendantName.value });
  }
  if (uploadedFiles.value.length > 0) {
    orderItems.push({ label: '证据数量', value: `${uploadedFiles.value.length} 份` });
  }
  
  router.push({ 
    name: 'agent-generic-confirm',
    query: {
      type: '证据清单整理',
      next: 'evidence-list-result',
      file: uploadedFiles.value.length > 0 ? `共 ${uploadedFiles.value.length} 个文件` : caseReason.value,
      order: JSON.stringify(orderItems)
    }
  });
};
</script>

<template>
  <div class="evidence-form-page">
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
          <FolderSearch :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">证据清单整理</h1>
          <p class="form-subtitle">智能整理证据材料，自动生成专业证据清单</p>
        </div>
      </div>

      <div class="form-content">
        <!-- 诉讼类型 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 诉讼类型
          </label>
          <div class="option-selector three-col">
            <button 
              class="option-btn"
              :class="{ active: selectedLitigationType === '民事诉讼' }"
              @click="selectedLitigationType = '民事诉讼'"
            >
              <Scale :size="16" />
              民事诉讼
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedLitigationType === '刑事诉讼' }"
              @click="selectedLitigationType = '刑事诉讼'"
            >
              <Gavel :size="16" />
              刑事诉讼
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedLitigationType === '行政诉讼' }"
              @click="selectedLitigationType = '行政诉讼'"
            >
              <ShieldCheck :size="16" />
              行政诉讼
            </button>
          </div>
        </div>

        <!-- 案由 -->
        <div class="form-group">
          <label class="form-label">案由（可选）</label>
          <input 
            v-model="caseReason"
            type="text" 
            class="form-input" 
            placeholder="如：离婚纠纷、合同纠纷、人身损害赔偿纠纷等"
            maxlength="50"
          />
        </div>

        <!-- 原告和被告 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 当事人信息
          </label>
          <div class="two-col-inputs">
            <div class="input-wrapper">
              <label class="sub-label">原告名称</label>
              <input 
                v-model="plaintiffName"
                type="text" 
                class="form-input" 
                placeholder="请输入原告名称"
                maxlength="50"
              />
            </div>
            <div class="input-wrapper">
              <label class="sub-label">被告名称</label>
              <input 
                v-model="defendantName"
                type="text" 
                class="form-input" 
                placeholder="请输入被告名称"
                maxlength="50"
              />
            </div>
          </div>
        </div>

        <!-- 上传证据 -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 上传证据
            <span class="file-count" v-if="uploadedFiles.length > 0">(已上传 {{ uploadedFiles.length }} 个文件)</span>
          </label>
          
          <!-- 上传区域 -->
          <div class="upload-area">
            <label class="upload-dropzone">
              <input type="file" @change="handleEvidenceUpload" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.txt" multiple hidden />
              <div class="dropzone-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="dropzone-text">点击或拖拽上传证据材料</div>
              <div class="dropzone-hint">支持图片、PDF、Word、Excel、音频等格式，可多选</div>
            </label>
          </div>
          
          <!-- 文件列表 -->
          <div class="file-list" v-if="uploadedFiles.length > 0">
            <div 
              v-for="(file, index) in uploadedFiles" 
              :key="index" 
              class="file-item"
            >
              <div class="file-icon">
                <component :is="getFileIcon(file.name)" :size="18" />
              </div>
              <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-meta">
                  <span class="file-type">{{ getFileExtension(file.name) }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
              </div>
              <button class="file-remove" @click="removeFile(index)">
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- 辅助信息 -->
        <div class="form-group">
          <label class="form-label">补充说明（可选）</label>
          <textarea 
            v-model="auxiliaryInfo"
            class="form-textarea" 
            placeholder="请输入案情背景或特殊整理要求"
            maxlength="1000"
            rows="4"
          ></textarea>
          <span class="char-count textarea-count">{{ auxiliaryInfo.length }} / 1000</span>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
          <button class="submit-btn" @click="handleSubmit">
            开始智能整理
          </button>
        </div>
      </div>
    </main>

    <!-- Right Info Card -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="info-icon">📋</div>
        <h3 class="info-title">证据清单整理</h3>
        <p class="info-desc">智能识别、自动归档，打造滴水不漏的证据链</p>
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
.evidence-form-page {
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

.two-col-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
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

/* 新的上传区域样式 */
.file-count {
  font-weight: 400;
  color: #2563eb;
  font-size: 13px;
  margin-left: 8px;
}

.upload-area {
  margin-bottom: 16px;
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  background: #fafbfc;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.upload-dropzone:hover {
  border-color: #2563eb;
  background: #f0f7ff;
}

.dropzone-icon {
  width: 56px;
  height: 56px;
  background: #eff6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  margin-bottom: 12px;
}

.dropzone-text {
  font-size: 15px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 4px;
}

.dropzone-hint {
  font-size: 13px;
  color: #94a3b8;
}

/* 文件列表样式 */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s;
}

.file-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.file-icon {
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.file-type {
  font-size: 11px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.file-size {
  font-size: 12px;
  color: #94a3b8;
}

.file-remove {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.file-remove:hover {
  background: #fee2e2;
  color: #ef4444;
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
