import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../components/HomeView.vue';
import AgentsView from '../components/AgentsView.vue';
import LegalSearchView from '../components/LegalSearchView.vue';
import LegalSearchResultsView from '../components/LegalSearchResultsView.vue';
import LegalDocumentDetailView from '../components/LegalDocumentDetailView.vue';
import AcademicSearchView from '../components/AcademicSearchView.vue';
import ContractFormView from '../components/ContractFormView.vue';
import ContractDraftResultView from '../components/ContractDraftResultView.vue';
import CivilLawsuitFormView from '../components/CivilLawsuitFormView.vue';
import CivilLawsuitResultView from '../components/CivilLawsuitResultView.vue';
import LegalResearchFormView from '../components/LegalResearchFormView.vue';
import LegalResearchResultView from '../components/LegalResearchResultView.vue';
import EvidenceListFormView from '../components/EvidenceListFormView.vue';
import DocumentCorrectionFormView from '../components/DocumentCorrectionFormView.vue';
import DocumentCorrectionResultView from '../components/DocumentCorrectionResultView.vue';
import ContractReviewFormView from '../components/ContractReviewFormView.vue';
import ContractReviewResultView from '../components/ContractReviewResultView.vue';
import ContractCompareFormView from '../components/ContractCompareFormView.vue';
import ContractCompareResultView from '../components/ContractCompareResultView.vue';
import DocumentWritingFormView from '../components/DocumentWritingFormView.vue';
import DocumentReviewFormView from '../components/DocumentReviewFormView.vue';
import DocumentReviewResultView from '../components/DocumentReviewResultView.vue';
import EvidenceListResultView from '../components/EvidenceListResultView.vue';
import AudioEvidenceFormView from '../components/AudioEvidenceFormView.vue';
import AudioEvidenceResultView from '../components/AudioEvidenceResultView.vue';
import SimilarCaseFormView from '../components/SimilarCaseFormView.vue';
import SimilarCaseResultView from '../components/SimilarCaseResultView.vue';
import AiQnaView from '../components/AiQnaView.vue';

// Placeholder views - can be replaced with actual components later
const PlaceholderView = {
  template: `
    <div class="placeholder-view">
      <h1>{{ $route.meta.title }}</h1>
      <p>此页面正在建设中...</p>
    </div>
  `,
};

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '首页' }
  },
  {
    path: '/chat',
    name: 'chat',
    component: AiQnaView,
    meta: { title: 'AI提问' }
  },
  {
    path: '/agent',
    name: 'agents',
    component: AgentsView,
    meta: { title: '智能体' }
  },
  {
    path: '/agent/contract',
    name: 'contract-form',
    component: ContractFormView,
    meta: { title: '合同起草' }
  },
  {
    path: '/agent/contract/result',
    name: 'contract-draft-result',
    component: ContractDraftResultView,
    meta: { title: '合同起草结果', fullScreen: true }
  },
  {
    path: '/agent/civil-lawsuit',
    name: 'civil-lawsuit-form',
    component: CivilLawsuitFormView,
    meta: { title: '民事起诉状' }
  },
  {
    path: '/agent/civil-lawsuit/result',
    name: 'civil-lawsuit-result',
    component: CivilLawsuitResultView,
    meta: { title: '民事起诉状结果', fullScreen: true }
  },
  {
    path: '/agent/legal-research',
    name: 'legal-research-form',
    component: LegalResearchFormView,
    meta: { title: '论文助手' }
  },
  {
    path: '/agent/legal-research/result',
    name: 'legal-research-result',
    component: LegalResearchResultView,
    meta: { title: '法律研究报告', fullScreen: true }
  },
  {
    path: '/agent/evidence-list',
    name: 'evidence-list-form',
    component: EvidenceListFormView,
    meta: { title: '证据清单整理' }
  },
  {
    path: '/agent/evidence-list/result',
    name: 'evidence-list-result',
    component: EvidenceListResultView,
    meta: { title: '证据清单', fullScreen: true }
  },
  {
    path: '/agent/document-correction',
    name: 'document-correction-form',
    component: DocumentCorrectionFormView,
    meta: { title: '文档纠错' }
  },
  {
    path: '/agent/document-correction/result',
    name: 'document-correction-result',
    component: DocumentCorrectionResultView,
    meta: { title: '文档纠错结果', fullScreen: true }
  },
  {
    path: '/agent/contract-review',
    name: 'contract-review-form',
    component: ContractReviewFormView,
    meta: { title: '合同审查' }
  },
  {
    path: '/agent/contract-review/result',
    name: 'contract-review-result',
    component: ContractReviewResultView,
    meta: { title: '合同审查报告', fullScreen: true }
  },
  {
    path: '/agent/contract-comparison',
    name: 'contract-comparison-form',
    component: ContractCompareFormView,
    meta: { title: '合同比对' }
  },
  {
    path: '/agent/contract-comparison/result',
    name: 'contract-comparison-result',
    component: ContractCompareResultView,
    meta: { title: '合同比对结果', fullScreen: true }
  },
  {
    path: '/agent/document-writing',
    name: 'document-writing-form',
    component: DocumentWritingFormView,
    meta: { title: '文书写作' }
  },
  {
    path: '/agent/document-review',
    name: 'document-review-form',
    component: DocumentReviewFormView,
    meta: { title: '文书审查' }
  },
  {
    path: '/agent/document-review/result',
    name: 'document-review-result',
    component: DocumentReviewResultView,
    meta: { title: '文书审查结果', fullScreen: true }
  },
  {
    path: '/agent/audio-evidence',
    name: 'audio-evidence-form',
    component: AudioEvidenceFormView,
    meta: { title: '录音证据整理' }
  },
  {
    path: '/agent/audio-evidence/result',
    name: 'audio-evidence-result',
    component: AudioEvidenceResultView,
    meta: { title: '录音证据整理报告', fullScreen: true }
  },
  {
    path: '/agent/similar-case',
    name: 'similar-case-form',
    component: SimilarCaseFormView,
    meta: { title: '类案检索报告' }
  },
  {
    path: '/agent/similar-case/result',
    name: 'similar-case-result',
    component: SimilarCaseResultView,
    meta: { title: '类案检索报告', fullScreen: true }
  },
  {
    path: '/legal-search',
    name: 'legal-search',
    component: LegalSearchView,
    meta: { title: '法律搜索' }
  },
  {
    path: '/legal-search/results',
    name: 'legal-search-results',
    component: LegalSearchResultsView,
    meta: { title: '法律搜索结果' }
  },
  {
    path: '/legal-search/document/:id',
    name: 'legal-document-detail',
    component: LegalDocumentDetailView,
    meta: { title: '裁判文书详情', fullScreen: true }
  },
  {
    path: '/search',
    name: 'search',
    component: AcademicSearchView,
    meta: { title: '学术搜索' }
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: PlaceholderView,
    meta: { title: '知识库' }
  },
  {
    path: '/team',
    name: 'team',
    component: PlaceholderView,
    meta: { title: '团队管理' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: PlaceholderView,
    meta: { title: '个人中心' }
  },
  {
    path: '/agent/generic/confirm',
    name: 'agent-generic-confirm',
    component: () => import('../components/AgentConfirmView.vue'),
    meta: { title: '确认订单' }
  },
  {
    path: '/agent/generic/processing',
    name: 'agent-generic-processing',
    component: () => import('../components/AgentProcessingView.vue'),
    meta: { title: '正在处理' }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
