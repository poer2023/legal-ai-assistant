<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AgentResultLayout from './AgentResultLayout.vue';

const router = useRouter();

// Mock 证据清单数据
const evidenceList = ref([
  {
    id: 1,
    name: '原告张三身份证复印件',
    source: '原告提供',
    proves: '原告身份信息',
    pageStart: 1,
    pageEnd: 1
  },
  {
    id: 2,
    name: '被告李四身份证复印件',
    source: '被告提供',
    proves: '被告身份信息',
    pageStart: 2,
    pageEnd: 2
  },
  {
    id: 3,
    name: '结婚证复印件',
    source: '原告提供',
    proves: '原告与被告于2018年5月20日登记结婚',
    pageStart: 3,
    pageEnd: 3
  },
  {
    id: 4,
    name: '户口簿复印件',
    source: '原告提供',
    proves: '原被告于2019年8月15日生育一子张小明',
    pageStart: 4,
    pageEnd: 4
  },
  {
    id: 5,
    name: '房产证复印件',
    source: '原告提供',
    proves: '位于某市某区某路123号的房产为夫妻共同财产，市场价值约200万元',
    pageStart: 5,
    pageEnd: 6
  },
  {
    id: 6,
    name: '银行流水清单',
    source: '原告提供',
    proves: '被告在婚姻存续期间转移夫妻共同财产约50万元',
    pageStart: 7,
    pageEnd: 10
  },
  {
    id: 7,
    name: '微信聊天记录截图',
    source: '原告提供',
    proves: '被告存在婚外情行为的事实',
    pageStart: 11,
    pageEnd: 15
  },
  {
    id: 8,
    name: '证人王某证言',
    source: '原告提供',
    proves: '夫妻因感情不合已分居两年',
    pageStart: 16,
    pageEnd: 16
  }
]);

const caseInfo = ref({
  litigationType: '民事诉讼',
  caseReason: '离婚纠纷',
  plaintiffName: '张三',
  defendantName: '李四'
});

const outlineItems = computed(() => {
  return evidenceList.value.map((item, index) => ({
    id: `evidence-${item.id}`,
    title: `${index + 1}. ${item.name}`,
    level: 1
  }));
});

const goBack = () => {
  router.back();
};

const exportResult = () => {
  alert('导出功能开发中...');
};

const addToKnowledgeBase = () => {
  alert('加入知识库功能开发中...');
};

const formatPageRange = (start: number, end: number) => {
  return start === end ? String(start) : `${start}-${end}`;
};

// Undo/Redo Stub (Can be implemented if needed, currently just placeholders to match layout)
const canUndo = ref(false);
const canRedo = ref(false);
const undo = () => {};
const redo = () => {};

</script>

<template>
  <AgentResultLayout
    title="证据清单"
    :badge="caseInfo.caseReason"
    badge-class="badge-blue"
    :outline-items="outlineItems"
    :can-undo="canUndo"
    :can-redo="canRedo"
    @back="goBack"
    @undo="undo"
    @redo="redo"
    @export="exportResult"
    @add-to-kb="addToKnowledgeBase"
  >
    <div class="doc-container">
      <div class="doc-page">
        <div class="page-content">
          <!-- Document Header -->
          <div class="doc-header">
            <h1 class="doc-title">证据清单目录</h1>
            <div class="doc-meta">
                <p>案由：{{ caseInfo.caseReason }}</p>
                <p>当事人：{{ caseInfo.plaintiffName }} 诉 {{ caseInfo.defendantName }}</p>
            </div>
          </div>

          <!-- Evidence Table -->
          <div class="table-container">
            <table class="evidence-table">
              <thead>
                <tr>
                  <th class="col-no">序号</th>
                  <th class="col-name">证据名称</th>
                  <th class="col-source">证据来源</th>
                  <th class="col-proves">证明目的</th>
                  <th class="col-page">页码</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                    v-for="(item, index) in evidenceList" 
                    :key="item.id"
                    :id="`evidence-${item.id}`"
                    class="evidence-row"
                >
                  <td class="col-no">{{ index + 1 }}</td>
                  <td class="col-name">{{ item.name }}</td>
                  <td class="col-source">{{ item.source }}</td>
                  <td class="col-proves">{{ item.proves }}</td>
                  <td class="col-page">{{ formatPageRange(item.pageStart, item.pageEnd) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="page-footer">
            <span class="page-number">第 1 页</span>
        </div>
      </div>
    </div>
  </AgentResultLayout>
</template>

<style scoped>
:deep(.badge-blue) {
    background: var(--primary-soft);
    color: var(--primary-color);
}

/* Base Layout */
.doc-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.doc-page {
  background: white;
  min-height: 1123px; /* A4 Ratio */
  width: 794px; /* Fixed A4 Width */
  flex-shrink: 0;
  padding: 60px 80px; /* Slightly less padding for table */
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid var(--surface-soft);
  margin-top: auto;
}

.page-number {
  font-size: 12px;
  color: var(--text-muted);
}

/* Document Header */
.doc-header {
  text-align: center;
  margin-bottom: 40px;
}

.doc-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-strong);
  letter-spacing: 4px;
  margin: 0 0 16px 0;
}

.doc-meta {
    font-size: 14px;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* Table Styles */
.table-container {
    width: 100%;
}

.evidence-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  border: 2px solid var(--text-main); /* Thicker outer border */
}

.evidence-table th,
.evidence-table td {
  border: 1px solid var(--text-secondary);
  padding: 12px 10px;
  text-align: left;
  vertical-align: middle;
  color: var(--text-main);
}

.evidence-table th {
  background: var(--surface-muted);
  font-weight: 600;
  text-align: center;
  color: var(--text-strong);
  border-bottom: 2px solid var(--text-main);
}

.evidence-row {
    scroll-margin-top: 20px;
}

/* Column Widths */
.col-no {
  width: 50px;
  text-align: center !important;
}

.col-name {
  width: 180px;
  font-weight: 500;
}

.col-source {
  width: 90px;
  text-align: center !important;
}

.col-proves {
  /* Auto width */
  text-align: justify;
  line-height: 1.6;
}

.col-page {
  width: 70px;
  text-align: center !important;
}
</style>
