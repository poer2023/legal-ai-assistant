<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  FileText, 
  Loader2
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const agentType = computed(() => route.query.type as string || '写作中');
const nextRoute = computed(() => route.query.next as string || 'agents');

const progress = ref(0);
const currentStep = ref(0);
let timer: ReturnType<typeof setInterval>;

const steps = [
  '正在解析文档内容',
  'AI 智能提取要素',
  '生成专业法律建议',
  '整理最终报告文档'
];

onMounted(() => {
  // Simulate progress
  timer = setInterval(() => {
    if (progress.value < 40) {
      progress.value += 1;
    } else if (progress.value < 80) {
      progress.value += 0.2;
    }
    
    // Update steps based on progress
    if (progress.value > 25) currentStep.value = 1;
    if (progress.value > 50) currentStep.value = 2;
    if (progress.value > 75) currentStep.value = 3;
    
  }, 100);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const handleSkip = () => {
  // Navigate to the actual result page
  // We need to resolve the route name. The query param 'next' should be the route name.
  router.push({ name: nextRoute.value });
};
</script>

<template>
  <div class="processing-page">
    <header class="page-header">
      <div class="header-icon">
        <FileText :size="20" />
      </div>
      <div class="header-content">
        <h1 class="page-title">{{ agentType }}</h1>
        <p class="page-desc">请耐心等待，AI正在为您{{ agentType }}</p>
      </div>
    </header>

    <main class="main-content">
      <div class="status-card">
        <h2 class="status-title">任务进度</h2>
        
        <!-- Current Step Active Display -->
        <div class="active-step">
          <div class="step-icon-wrapper">
            <Loader2 :size="20" class="spinner" />
          </div>
          <div class="step-info">
            <div class="step-name">{{ steps[currentStep] || '处理中...' }}</div>
            <div class="step-sub">处理中</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section">
          <div class="progress-labels">
            <span>处理进度</span>
            <span>正在进行第 {{ currentStep + 1 }} 步 / 共 {{ steps.length }} 步</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="tips-card">
        <p>完成任务大约需要10分钟左右，后续可在 <a href="#">个人中心-使用记录</a> 中查看；遇到复杂任务或排队情况可能需要等待更久，感谢理解~</p>
        
        <div class="manual-action">
           <button class="skip-btn" @click="handleSkip">
             进入结果页 (测试用)
           </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.processing-page {
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

.status-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  border: 1px solid #e2e8f0;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 24px 0;
}

.active-step {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 32px;
}

.step-icon-wrapper {
  width: 32px;
  height: 32px;
  background: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.spinner {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.step-sub {
  font-size: 12px;
  color: #64748b;
}

.progress-section {
  margin-top: 16px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.progress-track {
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #e2e8f0; /* Default gray for skeleton feel? Or active blue? Screenshot shows greyish bar? */
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
  transition: width 0.3s ease;
}

.tips-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  text-align: center;
}

.tips-card a {
  color: #2563eb;
  text-decoration: none;
}

.manual-action {
  margin-top: 24px;
}

.skip-btn {
  background: white;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.skip-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
</style>
