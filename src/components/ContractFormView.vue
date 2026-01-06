<script setup lang="ts">
import { ref } from 'vue';
import { 
  ChevronLeft, 
  FileText, 
  ScanLine, 
  Languages, 
  PenTool, 
  FileEdit, 
  Mail, 
  ClipboardList,
  Search,
  X
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const theme = ref('');
const auxiliaryInfo = ref('');
const selectedLanguage = ref('zh');
const myIdentity = ref('甲方'); // Default self identity
const contractParties = ref([
  { role: '甲方', name: '' },
  { role: '乙方', name: '' }
]);
const selectedPosition = ref('中立');
const uploadedFile = ref<File | null>(null);

const addParty = () => {
  contractParties.value.push({ role: '', name: '' });
};

const removeParty = (index: number) => {
  if (contractParties.value.length > 2) {
    contractParties.value.splice(index, 1);
  }
};

const templateTypes = [
  { icon: FileText, label: '合同起草', active: true },
  { icon: ScanLine, label: '扫描件解析' },
  { icon: Languages, label: '文档翻译' },
  { icon: PenTool, label: 'AI在线改稿' },
];

const moreTemplates = [
  { icon: FileEdit, label: '民事起诉状' },
  { icon: Mail, label: '书信函件' },
  { icon: ClipboardList, label: '申请书' },
];

const features = [
  '一键写作，500-1000字',
  '格式规范、内容专业',
  '保障当事人合法权益',
  '适用于各类合同协议文本',
  '支持中英文',
];

const goBack = () => {
  router.push({ name: 'agents' });
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    uploadedFile.value = target.files[0];
  }
};

const handleSubmit = () => {
  console.log('Submitting:', {
    theme: theme.value,
    auxiliaryInfo: auxiliaryInfo.value,
    language: selectedLanguage.value,
    myIdentity: myIdentity.value,
    parties: contractParties.value,
    position: selectedPosition.value,
    file: uploadedFile.value?.name
  });

  // 跳转到结果页面
  router.push({ name: 'contract-draft-result' });
};
</script>

<template>
  <div class="contract-form-page">
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
          <FileText :size="20" />
        </div>
        <div class="form-title-area">
          <h1 class="form-title">合同起草</h1>
          <p class="form-subtitle">常见合同协议文本，解决你的日常法律需求</p>
        </div>
      </div>

      <div class="form-content">
        <!-- Theme Input -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 主题
          </label>
          <input 
            v-model="theme"
            type="text" 
            class="form-input" 
            placeholder="请输入清晰准确的合同协议主题，如：车位租赁合同（必填）"
            maxlength="100"
          />
          <span class="char-count">{{ theme.length }} / 100</span>
        </div>

        <!-- Contract Parties -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 合同主体
            <button class="add-party-btn" @click="addParty">+ 增加主体</button>
          </label>
          
          <div class="parties-list">
            <div v-for="(party, index) in contractParties" :key="index" class="party-item">
               <div class="party-role-input">
                  <input v-model="party.role" placeholder="角色 (如: 甲方)" class="form-input small" />
               </div>
               <div class="party-name-input">
                  <input v-model="party.name" placeholder="名称 (如: xx公司)" class="form-input" />
               </div>
               <button v-if="contractParties.length > 2" class="remove-btn" @click="removeParty(index)">
                 <X :size="14" />
               </button>
            </div>
          </div>
          
          <div class="identity-selector-wrapper">
             <span class="sub-label">我是：</span>
             <div class="option-selector">
                <button 
                  v-for="(party, idx) in contractParties" 
                  :key="idx"
                  class="option-btn small-btn"
                  :class="{ active: myIdentity === party.role }"
                  @click="myIdentity = party.role"
                  :disabled="!party.role"
                >
                  {{ party.role || '未命名' }}
                </button>
             </div>
          </div>
        </div>

        <!-- Position Strength Selector -->
        <div class="form-group">
          <label class="form-label">
            <span class="required">*</span> 强弱地位
          </label>
          <div class="option-selector three-col">
            <button 
              class="option-btn"
              :class="{ active: selectedPosition === '强势' }"
              @click="selectedPosition = '强势'"
            >
              <span class="option-tag strong">强</span>
              强势
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedPosition === '中立' }"
              @click="selectedPosition = '中立'"
            >
              <span class="option-tag neutral">中</span>
              中立
            </button>
            <button 
              class="option-btn"
              :class="{ active: selectedPosition === '弱势' }"
              @click="selectedPosition = '弱势'"
            >
              <span class="option-tag weak">弱</span>
              弱势
            </button>
          </div>
        </div>

        <!-- Auxiliary Info -->
        <div class="form-group">
          <label class="form-label">辅助信息</label>
          <textarea 
            v-model="auxiliaryInfo"
            class="form-textarea" 
            placeholder="建议输入合同协议书的签约背景、当事人各方基本信息、主要合同内容、争议解决方式等的具体信息，输入越清晰具体，AI越能准确理解你的创作要求（非必填）"
            maxlength="5000"
            rows="5"
          ></textarea>
          <span class="char-count textarea-count">{{ auxiliaryInfo.length }} / 5000</span>
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



        <!-- Template Upload -->
        <div class="form-group">
          <label class="form-label">指定模版</label>
          <div class="template-upload-cards">
            <!-- Upload Card -->
            <label class="upload-card">
              <input type="file" @change="handleFileUpload" accept=".doc,.docx,.pdf" hidden />
              <div class="card-icon upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="card-title">点击上传合同模版</div>
              <div class="card-subtitle">支持拖拽文件到此处上传</div>
              <span v-if="uploadedFile" class="uploaded-file-name">✅ {{ uploadedFile.name }}</span>
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
              <div class="card-title">从知识库中选择合同模版</div>
            </div>
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
        <div class="info-icon">📄</div>
        <h3 class="info-title">合同起草</h3>
        <p class="info-desc">常见合同协议文本，解决你的日常法律需求</p>
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
.contract-form-page {
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

.option-btn.wide {
  flex: 1;
  justify-content: flex-start;
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

.option-icon {
  font-size: 16px;
}

.option-code {
  font-weight: 600;
  color: #2563eb;
}

.add-party-btn {
  float: right;
  font-size: 12px;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
}

.add-party-btn:hover {
  text-decoration: underline;
}

.parties-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.party-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.party-role-input {
  width: 120px;
}

.party-name-input {
  flex: 1;
}

.form-input.small {
  padding: 8px 12px;
}

.remove-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.remove-btn:hover {
  color: #ef4444;
}

.identity-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.sub-label {
  font-size: 13px;
  color: #64748b;
}

.option-btn.small-btn {
  padding: 6px 12px;
  min-width: 60px;
  justify-content: center;
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

.option-tag.strong {
  background: #fef2f2;
  color: #ef4444;
}

.option-btn.active .option-tag.strong {
  background: #ef4444;
  color: white;
}

.option-tag.neutral {
  background: #f0fdf4;
  color: #22c55e;
}

.option-btn.active .option-tag.neutral {
  background: #22c55e;
  color: white;
}

.option-tag.weak {
  background: #fefce8;
  color: #eab308;
}

.option-btn.active .option-tag.weak {
  background: #eab308;
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
