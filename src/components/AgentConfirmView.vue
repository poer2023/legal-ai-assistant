<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  FileText, 
  ChevronLeft,
  CheckCircle2,
  FileCheck
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// Query Params
const agentType = computed(() => route.query.type as string || '智能体');
const nextRoute = computed(() => route.query.next as string || 'agents');
// Optional: Pass simple JSON via query for order info? Or just mock based on type.
// For now, we'll use a generic display with some mocked data to match the screenshot style.
const fileName = computed(() => route.query.file as string || '未命名文档.docx');

const goBack = () => {
  router.back();
};

const handleConfirm = () => {
  router.push({
    name: 'agent-generic-processing',
    query: {
      type: agentType.value,
      next: nextRoute.value
    }
  });
};

// Parse order info from query params (passed by form)
const orderInfo = computed(() => {
  const orderParam = route.query.order as string;
  if (orderParam) {
    try {
      return JSON.parse(orderParam) as Array<{ label: string; value: string }>;
    } catch {
      return [];
    }
  }
  return [];
});

// Dynamic button text
const confirmButtonText = computed(() => {
  const type = agentType.value;
  if (type.includes('写作') || type.includes('起草')) return '确认写作';
  if (type.includes('审查') || type.includes('纠错')) return '确认审查';
  if (type.includes('对比')) return '确认对比';
  if (type.includes('检索') || type.includes('研究')) return '确认生成';
  if (type.includes('整理')) return '确认整理';
  return '确认提交';
});

// Dynamic page description
const pageDescription = computed(() => {
  const type = agentType.value;
  return `请确认订单信息并立即开始${type}任务`;
});


</script>

<template>
  <div class="confirm-page">
    <header class="page-header">
      <div class="header-icon">
        <FileText :size="20" />
      </div>
      <div class="header-content">
        <h1 class="page-title">确认订单</h1>
        <p class="page-desc">{{ pageDescription }}</p>
      </div>
    </header>

    <main class="main-content">
      <!-- Order Info Card -->
      <div class="info-card" v-if="orderInfo.length > 0">
        <div class="card-header">
          <h2 class="card-title">订单信息</h2>
          <button class="edit-btn" @click="goBack">返回修改</button>
        </div>
        
        <div class="info-grid">
          <div class="info-item" v-for="(item, index) in orderInfo" :key="index">
            <span class="label">{{ item.label }}：</span>
            <span class="value">{{ item.value }}</span>
          </div>
        </div>
      </div>

      <!-- Background Document Card -->
      <div class="document-section">
        <h3 class="section-label">背景文档</h3>
        <div class="document-card">
          <div class="checkbox">
            <CheckCircle2 :size="18" class="check-icon" />
          </div>
          <span class="doc-name">{{ fileName }}</span>
          <span class="doc-size">共1889字</span>
        </div>
      </div>
    </main>

    <footer class="page-footer">
      <button class="confirm-btn" @click="handleConfirm">
        {{ confirmButtonText }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.confirm-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
}

.page-header {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: #eff6ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.page-desc {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0 0;
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.edit-btn {
  font-size: 13px;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
}

.edit-btn:hover {
  text-decoration: underline;
}

.info-grid {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  font-size: 14px;
}

.label {
  color: #64748b;
  width: 80px;
}

.value {
  color: #1e293b;
  font-weight: 500;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin: 0 0 12px 0;
}

.document-card {
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.checkbox {
  width: 20px;
  height: 20px;
  background: #2563eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.doc-name {
  flex: 1;
  font-size: 14px;
  color: #1e293b;
}

.doc-size {
  font-size: 13px;
  color: #64748b;
}

.page-footer {
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 16px 24px;
  display: flex;
  justify-content: center;
}

.confirm-btn {
  background: #5b7fff; /* Matching screenshot purple-ish blue */
  color: white;
  border: none;
  padding: 12px 48px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
}

.confirm-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
