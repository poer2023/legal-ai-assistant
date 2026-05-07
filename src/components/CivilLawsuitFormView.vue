<script setup lang="ts">
import { ref } from 'vue';
import { 
  ChevronLeft, 
  FileText, 
  ScanLine, 
  PenTool, 
  FileEdit, 
  Mail, 
  ClipboardList,
  Search
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const lawsuitPurpose = ref('');
const auxiliaryInfo = ref('');
const uploadedEvidence = ref<File | null>(null);
const uploadedTemplate = ref<File | null>(null);

const templateTypes = [
  { icon: FileEdit, label: '民事起诉状', active: true },
  { icon: ScanLine, label: '扫描件解析' },
  { icon: PenTool, label: '论文助手' },
];

const moreTemplates = [
  { icon: FileText, label: '合同协议' },
  { icon: Mail, label: '书信函件' },
  { icon: ClipboardList, label: '申请书' },
];

const features = [
  '一键写作民事起诉状',
  '格式专业、内容准确',
  '诉讼请求、事实理由',
  'AI原创，可直接放心使用',
  '适用于各类民事纠纷',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleEvidenceUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedEvidence.value = target.files[0];
  }
};

const handleTemplateUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedTemplate.value = target.files[0];
  }
};

const handleSubmit = () => {
  console.log('Submitting:', {
    purpose: lawsuitPurpose.value,
    auxiliaryInfo: auxiliaryInfo.value,
    evidence: uploadedEvidence.value?.name,
    template: uploadedTemplate.value?.name
  });

  // 构建订单信息用于确认页展示
  const orderItems = [
    { label: '诉讼目的', value: lawsuitPurpose.value || '未指定' },
  ];
  if (auxiliaryInfo.value) {
    orderItems.push({ label: '案件信息', value: auxiliaryInfo.value.slice(0, 50) + (auxiliaryInfo.value.length > 50 ? '...' : '') });
  }
  
  router.push({ 
    name: 'agent-generic-confirm',
    query: {
      type: '民事起诉状',
      next: 'civil-lawsuit-result',
      file: uploadedEvidence.value?.name || uploadedTemplate.value?.name || lawsuitPurpose.value,
      order: JSON.stringify(orderItems)
    }
  });
};
</script>

<template>
  <div class="lawsuit-form-page">
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
          <FileEdit :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">民事起诉状</h1>
          <p class="form-subtitle">你的AI律师，帮你撰写专业的民事起诉状</p>
        </div>
      </div>
      <div class="form-content">
        <!-- Lawsuit Purpose Input -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 诉讼请求
          </label>
          <input 
            v-model="lawsuitPurpose"
            type="text" 
            class="form-input" 
            placeholder="请输入明确的诉讼请求，如：解除婚姻关系、平分夫妻共同财产、要求被告赔偿损失等"
            maxlength="100"
          />
          <span class="char-count">{{ lawsuitPurpose.length }} / 100</span>
        </div>

        <!-- Case Description -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 案情陈述
          </label>
          <textarea 
            v-model="auxiliaryInfo"
            class="form-textarea" 
            placeholder="请详细描述案件事实和理由，包括：原被告基本信息、纠纷起因、事情经过、造成的损害后果等。描述越详细，起诉状越专业准确。"
            maxlength="2000"
            rows="8"
          ></textarea>
          <span class="char-count textarea-count">{{ auxiliaryInfo.length }} / 2000</span>
        </div>

        <!-- Evidence Upload -->
        <div class="form-group">
          <label class="form-label">上传证据</label>
          <div class="template-upload-cards">
            <label class="upload-card">
              <input type="file" @change="handleEvidenceUpload" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx" hidden />
              <div class="card-icon upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">点击上传证据材料</div>
              <div class="card-subtitle">支持合同、聊天记录、转账凭证等</div>
              <span v-if="uploadedEvidence" class="uploaded-file-name">✅ {{ uploadedEvidence.name }}</span>
            </label>
          </div>
        </div>



        <!-- Template Upload -->
        <div class="form-group">
          <label class="form-label">指定模版</label>
          <div class="template-upload-cards">
            <label class="upload-card">
              <input type="file" @change="handleTemplateUpload" accept=".doc,.docx,.pdf" hidden />
              <div class="card-icon upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">点击上传起诉状模版</div>
              <div class="card-subtitle">支持拖拽文件到此处上传</div>
              <span v-if="uploadedTemplate" class="uploaded-file-name">✅ {{ uploadedTemplate.name }}</span>
            </label>
            
            <div class="upload-card knowledge-card">
              <div class="card-icon knowledge-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8 11H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M11 8V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="card-title">从知识库中选择起诉状模版</div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="submit-container">
          <button class="submit-btn" @click="handleSubmit">
            生成起诉状
          </button>
        </div>
      </div>
    </main>

    <!-- Right Info Card -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="info-icon">📋</div>
        <h3 class="info-title">民事起诉状</h3>
        <p class="info-desc">你的AI律师，帮你撰写专业的民事起诉状</p>
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
.lawsuit-form-page {
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
  color: #ef4444;
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
  background: #1d4ed8;
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
  gap: 10px;
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

.option-tag {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.option-btn.active .option-tag {
  background: #2563eb;
  color: white;
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
