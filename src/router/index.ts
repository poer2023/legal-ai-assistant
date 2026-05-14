import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../components/LoginView.vue';
import OrgSelectView from '../components/OrgSelectView.vue';
import HomeView from '../components/HomeView.vue';
import AgentsView from '../components/AgentsView.vue';
import SkillTemplateView from '../components/SkillTemplateView.vue';
import TemplatesView from '../components/TemplatesView.vue';
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
import KnowledgeBaseView from '../components/KnowledgeBaseView.vue';
import TeamManageView from '../components/TeamManageView.vue';
import TeamOverviewView from '../components/TeamOverviewView.vue';
import TeamSectionShellView from '../components/team/TeamSectionShellView.vue';
import TeamConsultingOpsView from '../components/team/TeamConsultingOpsView.vue';
import TeamThemeView from '../components/team/TeamThemeView.vue';
import ProfileView from '../components/ProfileView.vue';
import GuideView from '../components/GuideView.vue';
import InvestigationAgentDemoView from '../components/InvestigationAgentDemoView.vue';
import { useOrgSession } from '../stores/orgSession';

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
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: '登录', fullScreen: true, public: true }
  },
  {
    path: '/org/select',
    name: 'org-select',
    component: OrgSelectView,
    meta: { title: '管理我的组织' }
  },
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
    meta: { title: '法律咨询' }
  },
  {
    path: '/create',
    alias: '/agent',
    name: 'agents',
    component: AgentsView,
    meta: { title: '智能体' }
  },
  {
    path: '/skills',
    name: 'skills',
    component: SkillTemplateView,
    meta: { title: '技能库' }
  },
  {
    path: '/templates',
    name: 'templates',
    component: TemplatesView,
    meta: { title: '模板库' }
  },
  {
    path: '/create/policy_advisory_report',
    name: 'policy-advisory-report-form',
    component: LegalResearchFormView,
    meta: { title: '咨政报告' }
  },
  {
    path: '/create/similar_case_analysis_report',
    name: 'similar-case-analysis-report-form',
    component: SimilarCaseFormView,
    meta: { title: '类案分析报告' }
  },
  {
    path: '/create/document_review',
    name: 'prod-document-review-form',
    component: DocumentReviewFormView,
    meta: { title: '文书审查' }
  },
  {
    path: '/create/legal_research_report',
    name: 'prod-legal-research-report-form',
    component: LegalResearchFormView,
    meta: { title: '法律研究报告' }
  },
  {
    path: '/create/indict',
    name: 'prod-indict-form',
    component: CivilLawsuitFormView,
    meta: { title: '民事起诉书' }
  },
  {
    path: '/create/legal_doc_writing',
    name: 'prod-legal-doc-writing-form',
    component: DocumentWritingFormView,
    meta: { title: '文书写作' }
  },
  {
    path: '/create/document_proofreading',
    name: 'prod-document-proofreading-form',
    component: DocumentCorrectionFormView,
    meta: { title: '文档纠错' }
  },
  {
    path: '/create/missive',
    name: 'missive-form',
    component: DocumentWritingFormView,
    meta: { title: '公文写作' }
  },
  {
    path: '/create/manuscript_review',
    name: 'manuscript-review-form',
    component: DocumentReviewFormView,
    meta: { title: '文稿审查' }
  },
  {
    path: '/create/manuscript_polishing',
    name: 'manuscript-polishing-form',
    component: DocumentWritingFormView,
    meta: { title: '文稿润色' }
  },
  {
    path: '/create/contract_compare',
    name: 'prod-contract-compare-form',
    component: ContractCompareFormView,
    meta: { title: '合同比对' }
  },
  {
    path: '/create/contract',
    name: 'prod-contract-form',
    component: ContractFormView,
    meta: { title: '合同协议' }
  },
  {
    path: '/create/paper',
    name: 'paper-form',
    component: LegalResearchFormView,
    meta: { title: '论文助手' }
  },
  {
    path: '/create/contract_review',
    name: 'prod-contract-review-form',
    component: ContractReviewFormView,
    meta: { title: '合同审查' }
  },
  {
    path: '/create/civil_complaint_drafting',
    name: 'civil-complaint-drafting-form',
    component: CivilLawsuitFormView,
    meta: { title: '民事起诉状' }
  },
  {
    path: '/create/contract_drafting',
    name: 'contract-drafting-form',
    component: ContractFormView,
    meta: { title: '合同起草' }
  },
  {
    path: '/create/investigation/:agentKey',
    name: 'investigation-agent-demo',
    component: InvestigationAgentDemoView,
    meta: { title: '核查智能体 Demo' }
  },
  {
    path: '/create/:agentSlug',
    name: 'prod-generic-agent',
    component: () => import('../components/AgentConfirmView.vue'),
    meta: { title: '智能体确认' }
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
    path: '/law',
    alias: '/legal-search',
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
    path: '/scholar',
    alias: '/search',
    name: 'search',
    component: AcademicSearchView,
    meta: { title: '学术搜索' }
  },
  {
    path: '/library',
    alias: '/knowledge',
    name: 'knowledge',
    component: KnowledgeBaseView,
    meta: { title: '知识库' }
  },
  {
    path: '/guide',
    name: 'guide',
    component: GuideView,
    meta: { title: '使用攻略' }
  },
  {
    path: '/team',
    name: 'team',
    component: TeamManageView,
    meta: { title: '团队管理' },
    children: [
      { path: '', name: 'team-overview', component: TeamOverviewView, meta: { title: '团队概览' } },
      { path: 'members', name: 'team-members', component: TeamSectionShellView, props: { section: 'members' }, meta: { title: '成员管理' } },
      { path: 'group', alias: 'groups', name: 'team-groups', component: TeamSectionShellView, props: { section: 'groups' }, meta: { title: '小组管理' } },
      { path: 'agent', alias: 'agents', name: 'team-agents', component: TeamSectionShellView, props: { section: 'agents' }, meta: { title: '智能体管理' } },
      { path: 'consulting-ops', name: 'team-consulting-ops', component: TeamConsultingOpsView, meta: { title: '咨询运营分析' } },
      { path: 'consulting-analysis', name: 'team-consulting-analysis', component: TeamConsultingOpsView, meta: { title: '咨询运营分析' } },
      { path: 'theme', name: 'team-theme', component: TeamThemeView, meta: { title: '主题切换' } },
      { path: 'miniprogram', name: 'team-miniprogram', component: TeamSectionShellView, props: { section: 'miniprogram' }, meta: { title: '小程序管理' } },
    ]
  },
  {
    path: '/profile',
    alias: ['/profile/questions', '/profile/creations'],
    name: 'profile',
    component: ProfileView,
    meta: { title: '个人中心' }
  },
  {
    path: '/profile/basic',
    name: 'profile-basic',
    component: ProfileView,
    meta: { title: '个人信息' }
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

router.beforeEach((to) => {
  const { currentOrganization, hasActiveOrganization, isAuthenticated } = useOrgSession();
  const isPublicRoute = to.meta.public === true;

  if (!isAuthenticated.value && !isPublicRoute) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (
    isAuthenticated.value
    && !hasActiveOrganization.value
    && to.name !== 'org-select'
    && to.name !== 'login'
  ) {
    return {
      name: 'org-select',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (isAuthenticated.value && hasActiveOrganization.value && to.name === 'login') {
    return { name: 'home' };
  }

  if (
    isAuthenticated.value
    && hasActiveOrganization.value
    && String(to.path).startsWith('/team')
    && currentOrganization.value?.role !== '管理员'
  ) {
    return { name: 'home' };
  }

  return true;
});

export default router;
