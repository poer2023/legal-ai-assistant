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
        <p>任务完成大约需要 1-10 分钟，后续可在 <a href="#">个人中心-使用记录</a> 中查看；遇到复杂任务或排队情况可能需要等待更久，感谢理解~</p>
        
        <div class="manual-action">
           <!-- Manual Skip Button as requested -->
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
  background: var(--bg-color);
}

.page-header {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: var(--primary-soft);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.page-desc {
  font-size: 12px;
  color: var(--text-secondary);
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
  border: 1px solid var(--border-color);
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 24px 0;
}

.active-step {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-color);
  border-radius: 8px;
  margin-bottom: 32px;
}

.step-icon-wrapper {
  width: 32px;
  height: 32px;
  background: var(--primary-color);
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
  color: var(--text-main);
}

.step-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.progress-section {
  margin-top: 16px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.progress-track {
  height: 6px;
  background: var(--surface-soft);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--border-color); /* Default gray for skeleton feel? Or active blue? Screenshot shows greyish bar? */
  background: linear-gradient(90deg, var(--primary-color) 0%, var(--focus-ring) 100%);
  transition: width 0.3s ease;
}

.tips-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  text-align: center;
}

.tips-card a {
  color: var(--primary-color);
  text-decoration: none;
}

.manual-action {
  margin-top: 24px;
}

.skip-btn {
  background: white;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.skip-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
</style>
