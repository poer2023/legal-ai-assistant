<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ArrowLeft, Download, FolderPlus } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

// Get document ID from route params
const documentId = computed(() => route.params.id as string);

// Determine document type based on ID
const isRegulation = computed(() => {
  const id = parseInt(documentId.value);
  return id >= 100 && id < 200; // 100-199 为法规类文档
});

// 法规类文档 mock 数据
const regulationDocuments: Record<string, any> = {
  '101': {
    title: '中华人民共和国食品安全法',
    documentNumber: '主席令第二十一号',
    issueOrgan: '全国人民代表大会常务委员会',
    issueDate: '2015年4月24日',
    effectiveDate: '2015年10月1日',
    documentType: '法律',
    status: '现行有效',
    category: '行政法',
    chapters: [
      {
        id: 'chapter1',
        title: '第一章 总则',
        articles: [
          {
            number: '第一条',
            content: '为了保证食品安全，保障公众身体健康和生命安全，制定本法。'
          },
          {
            number: '第二条',
            content: '在中华人民共和国境内从事下列活动，应当遵守本法：\n（一）食品生产和加工（以下称食品生产），食品销售和餐饮服务（以下称食品经营）；\n（二）食品添加剂的生产经营；\n（三）用于食品的包装材料、容器、洗涤剂、消毒剂和用于食品生产经营的工具、设备（以下称食品相关产品）的生产经营；\n（四）食品生产经营者使用食品添加剂、食品相关产品；\n（五）食品的贮存和运输；\n（六）对食品、食品添加剂、食品相关产品的安全管理。\n供食用的源于农业的初级产品（以下称食用农产品）的质量安全管理，遵守《中华人民共和国农产品质量安全法》的规定。但是，食用农产品的市场销售、有关质量安全标准的制定、有关安全信息的公布和本法对农业投入品作出规定的，应当遵守本法的规定。'
          },
          {
            number: '第三条',
            content: '食品安全工作实行预防为主、风险管理、全程控制、社会共治，建立科学、严格的监督管理制度。'
          },
          {
            number: '第四条',
            content: '食品生产经营者对其生产经营食品的安全负责。\n食品生产经营者应当依照法律、法规和食品安全标准从事生产经营活动，保证食品安全，诚信自律，对社会和公众负责，接受社会监督，承担社会责任。'
          }
        ]
      },
      {
        id: 'chapter2',
        title: '第二章 食品安全风险监测和评估',
        articles: [
          {
            number: '第十四条',
            content: '国家建立食品安全风险监测制度，对食源性疾病、食品污染以及食品中的有害因素进行监测。\n国务院卫生行政部门会同国务院食品安全监督管理等部门，制定、实施国家食品安全风险监测计划。\n国务院食品安全监督管理部门和其他有关部门获知有关食品安全风险信息后，应当立即核实并向国务院卫生行政部门通报。'
          },
          {
            number: '第十七条',
            content: '国家建立食品安全风险评估制度，运用科学方法，根据食品安全风险监测信息、科学数据以及有关信息，对食品、食品添加剂、食品相关产品中生物性、化学性和物理性危害因素进行风险评估。'
          }
        ]
      },
      {
        id: 'chapter3',
        title: '第三章 食品安全标准',
        articles: [
          {
            number: '第二十四条',
            content: '制定食品安全标准，应当以保障公众身体健康为宗旨，做到科学合理、安全可靠。'
          },
          {
            number: '第二十五条',
            content: '食品安全标准是强制执行的标准。除食品安全标准外，不得制定其他食品强制性标准。'
          },
          {
            number: '第二十六条',
            content: '食品安全标准应当包括下列内容：\n（一）食品、食品添加剂、食品相关产品中的致病性微生物，农药残留、兽药残留、生物毒素、重金属等污染物质以及其他危害人体健康物质的限量规定；\n（二）食品添加剂的品种、使用范围、用量；\n（三）专供婴幼儿和其他特定人群的主辅食品的营养成分要求；\n（四）对与卫生、营养等食品安全要求有关的标签、标志、说明书的要求；\n（五）食品生产经营过程的卫生要求；\n（六）与食品安全有关的质量要求；\n（七）与食品安全有关的食品检验方法与规程；\n（八）其他需要制定为食品安全标准的内容。'
          }
        ]
      },
       {
        id: 'chapter4',
        title: '第四章 食品生产经营',
        articles: [
          {
            number: '第三十三条',
            content: '食品生产经营应当符合食品安全标准，并符合下列要求：\n（一）具有与生产经营的食品品种、数量相适应的食品原料处理和食品加工、包装、贮存等场所，保持该场所环境整洁，并与有毒、有害场所以及其他污染源保持规定的距离；\n（二）具有与生产经营的食品品种、数量相适应的生产经营设备或者设施，有相应的消毒、更衣、盥洗、采光、照明、通风、防腐、防尘、防蝇、防鼠、防虫、洗涤以及处理废水、存放垃圾和废弃物的设备或者设施；\n（三）有专职或者兼职的食品安全专业技术人员、食品安全管理人员和保证食品安全的规章制度；\n（四）具有合理的设备布局和工艺流程，防止待加工食品与直接入口食品、原料与成品交叉污染，避免食品接触有毒物、不洁物；\n（五）餐具、饮具和盛放直接入口食品的容器，使用前应当洗净、消毒，炊具、用具用后应当洗净，保持清洁；\n（六）贮存、运输和装卸食品的容器、工具和设备应当安全、无害，保持清洁，防止食品污染，并符合保证食品安全所需的温度、湿度等特殊要求，不得将食品与有毒、有害物品一同贮存、运输；\n（七）直接入口的食品应当使用无毒、清洁的包装材料、餐具、饮具和容器；\n（八）食品生产经营人员应当保持个人卫生，生产经营食品时，应当将手洗净，穿戴清洁的工作衣、帽等；销售无包装的直接入口食品时，应当使用无毒、清洁的售货工具；\n（九）用水应当符合国家规定的生活饮用水卫生标准；\n（十）使用的洗涤剂、消毒剂应当对人体安全、无害；\n（十一）法律、法规规定的其他要求。'
          }
        ]
      },
      {
         id: 'chapter9',
         title: '第九章 法律责任',
         articles: [
            {
               number: '第一百二十二条',
               content: '违反本法规定，未取得食品生产经营许可从事食品生产经营活动，或者未取得食品添加剂生产许可从事食品添加剂生产活动的，由县级以上人民政府食品安全监督管理部门没收违法所得和违法生产经营的食品、食品添加剂以及用于违法生产经营的工具、设备、原料等物品；违法生产经营的食品、食品添加剂货值金额不足一万元的，并处五万元以上十万元以下罚款；货值金额一万元以上的，并处货值金额十倍以上二十倍以下罚款。'
            }
         ]
      }
    ],
    relatedLaws: [
      {
        name: '《中华人民共和国食品安全法实施条例》',
        content: '为实施《中华人民共和国食品安全法》，制定本条例。对食品生产经营许可、食品安全风险监测和评估、食品安全标准、食品检验、食品进出口等方面作出具体规定。'
      }
    ]
  },
  '105': {
    title: '中华人民共和国劳动合同法',
    documentNumber: '主席令第六十五号',
    issueOrgan: '全国人民代表大会常务委员会',
    issueDate: '2007年6月29日',
    effectiveDate: '2008年1月1日',
    documentType: '法律',
    status: '现行有效',
    category: '劳动法',
    chapters: [
      {
        id: 'chapter1',
        title: '第一章 总则',
        articles: [
             { number: '第一条', content: '为了完善劳动合同制度，明确劳动合同双方当事人的权利和义务，保护劳动者的合法权益，构建和发展和谐稳定的劳动关系，制定本法。' },
             { number: '第二条', content: '中华人民共和国境内的企业、个体经济组织、民办非企业单位等组织（以下称用人单位）与劳动者建立劳动关系，订立、履行、变更、解除或者终止劳动合同，适用本法。' }
        ]
      },
      {
        id: 'chapter2',
        title: '第二章 劳动合同的订立',
        articles: [
             { number: '第二十三条', content: '用人单位与劳动者可以在劳动合同中约定保守用人单位的商业秘密和与知识产权相关的保密事项。\n对负有保密义务的劳动者，用人单位可以在劳动合同或者保密协议中与劳动者约定竞业限制条款，并约定在解除或者终止劳动合同后，在竞业限制期限内按月给予劳动者经济补偿。劳动者违反竞业限制约定的，应当按照约定向用人单位支付违约金。' },
             { number: '第二十四条', content: '竞业限制的人员限于用人单位的高级管理人员、高级技术人员和其他负有保密义务的人员。竞业限制的范围、地域、期限由用人单位与劳动者约定，竞业限制的约定不得违反法律、法规的规定。\n在解除或者终止劳动合同后，前款规定的人员到与本单位生产或者经营同类产品、从事同类业务的有竞争关系的其他用人单位，或者自己开业生产或者经营同类产品、从事同类业务的竞业限制期限，不得超过二年。' },
             { number: '第二十五条', content: '除本法第二十二条和第二十三条规定的情形外，用人单位不得与劳动者约定由劳动者承担违约金。' }
        ]
      }
    ],
    relatedLaws: [
       { name: '《劳动合同法实施条例》', content: '对劳动合同法进行细化补充...' }
    ]
  }
};

// 案例类文档 mock 数据
const caseDocuments: Record<string, any> = {
  '1': {
    title: '张某某生产、销售有毒、有害食品一审刑事判决书',
    caseNumber: '（2021）浙0783刑初1234号',
    court: '浙江省东阳市人民法院',
    date: '2021年09月15日',
    documentType: '刑事判决书',
    trialProcedure: '一审',
    caseType: '生产、销售有毒、有害食品罪',
    referenceLevel: '普通案例',

    parties: {
      appellant: {
        name: '张某某',
        gender: '女',
        birthDate: '1968年8月20日',
        ethnicity: '汉族',
        education: '小学文化',
        occupation: '农民',
        residence: '浙江省东阳市',
        status: '被告人',
      }
    },

    procedureHistory: '浙江省东阳市人民检察院以东检刑诉〔2021〕xxx号起诉书指控被告人张某某犯生产、销售有毒、有害食品罪，于2021年8月20日向本院提起公诉。本院依法组成合议庭，公开开庭审理了本案。东阳市人民检察院指派检察官出庭支持公诉，被告人张某某到庭参加诉讼。现已审理终结。',

    originalFacts: '经审理查明：2019年至2021年6月期间，被告人张某某在浙江省东阳市某菜市场销售自家腌制的腊肉。为防止腊肉生虫，张某某在明知敌敌畏是有毒、有害非食品原料的情况下，多次将农药敌敌畏喷洒在存放于仓库内的腊肉上，并将上述腊肉运至菜市场摊位进行销售。期内，共销售喷洒过敌敌畏的腊肉约70斤，销售金额约2000元。2021年6月15日，东阳市市场监督管理局联合公安机关进行检查时，现场查获并扣押了剩余腊肉。经检测，被扣押的腊肉样品中检出敌敌畏成分，含量为0.3mg/kg。',

    courtOpinion: '本院认为，被告人张某某在生产、销售的食品中掺入有毒、有害的非食品原料，其行为已构成生产、销售有毒、有害食品罪。公诉机关指控的罪名成立。被告人张某某归案后如实供述自己的罪行，且自愿认罪认罚，依法可以从轻处罚。辩护人提出的从轻处罚意见，本院予以采纳。',

    verdict: '一、被告人张某某犯生产、销售有毒、有害食品罪，判处有期徒刑七个月，并处罚金人民币三千元。\n二、禁止被告人张某某在刑罚执行完毕之日或者假释之日起三年内从事食品生产、销售及相关活动。\n三、扣押在案的有毒、有害腊肉予以没收，由扣押机关依法处理。',
    
    relatedLaws: [
      { name: '《中华人民共和国刑法》第一百四十四条', content: '在生产、销售的食品中掺入有毒、有害的非食品原料的，或者销售明知掺有有毒、有害的非食品原料的食品的，处五年以下有期徒刑，并处罚金...' },
      { name: '《中华人民共和国刑法》第六十七条第三款', content: '犯罪嫌疑人虽不具有前两款规定的自首情节，但是如实供述自己罪行的，可以从轻处罚...' }
    ]
  },
  '5': {
    title: '（2023）京01民终1234号：张某与北京某科技公司竞业限制纠纷案',
    caseNumber: '（2023）京01民终1234号',
    court: '北京市第一中级人民法院',
    date: '2023年05月20日',
    documentType: '民事判决书',
    trialProcedure: '二审',
    caseType: '竞业限制纠纷',
    referenceLevel: '典型案例',

    parties: {
      appellant: {
        name: '张某某',
        gender: '男',
        birthDate: '1985年',
        ethnicity: '汉族',
        education: '硕士',
        occupation: '技术总监',
        residence: '北京市海淀区',
        status: '上诉人（原审被告）',
      },
      defender: {
        name: '王律师',
        firm: '北京某律师事务所',
      },
    },

    procedureHistory: '上诉人张某因与被上诉人北京某科技公司竞业限制纠纷一案，不服北京市海淀区人民法院（2022）京0108民初xxxx号民事判决，向本院提起上诉。',

    originalFacts: '一审法院认定：张某于2018年入职某科技公司担任技术总监，双方签订了《保密与竞业限制协议》。协议约定，张某离职后2年内不得加入竞争对手公司，期间公司每月支付补偿金2万元。2022年1月张某离职，公司按月支付了补偿金。2022年3月，张某入职与某科技公司有直接竞争关系的A公司。',

    originalVerdict: '一审法院判决：张某违反竞业限制义务，应返还已支付的补偿金并支付违约金50万元。',

    appealOpinion: '张某上诉称：A公司与某科技公司业务不重合，不构成竞争关系。且违约金过高。',

    courtFindings: '二审经审理查明：A公司与某科技公司均从事人工智能算法开发，业务高度重合。张某在A公司担任核心算法工程师。',

    courtOpinion: '本院认为，劳动者离职后，用人单位已按月支付竞业限制补偿金，劳动者应当履行竞业限制义务。张某入职竞争对手公司，违反了竞业限制协议。关于违约金数额，考虑到张某的工资水平及违约的主观恶意，一审判决数额并无不当。\n综上所述，一审判决认定事实清楚，适用法律正确。',

    verdict: '驳回上诉，维持原判。',

    judges: {
      chief: '审判长 李某',
      members: ['审判员 张某', '审判员 刘某'],
      clerk: '书记员 赵某',
      date: '二〇二三年五月二十日',
    },

    relatedLaws: [
      { name: '《劳动合同法》第二十三条', content: '用人单位与劳动者可以在劳动合同中约定保守用人单位的商业秘密...' },
      { name: '《劳动合同法》第二十四条', content: '竞业限制的人员限于用人单位的高级管理人员...' }
    ]
  },
  'default': {
     title: '示例案例'
  }
};

// 获取当前文档数据
const documentData = computed(() => {
  if (isRegulation.value) {
    return regulationDocuments[documentId.value] || regulationDocuments['101'] || {}; 
  }
  return caseDocuments[documentId.value] || caseDocuments['default'] || {};
});

// 侧边栏及滚动逻辑
const caseSidebarSections = [
  { id: 'caseInfo', label: '案件信息', icon: 'info' },
  { id: 'parties', label: '当事人信息', icon: 'users' },
  { id: 'procedure', label: '审理经过', icon: 'clock' },
  { id: 'originalFacts', label: '原审认定事实', icon: 'file-text' },
  { id: 'originalVerdict', label: '原审判决', icon: 'gavel' },
  { id: 'appealOpinion', label: '上诉意见', icon: 'message' },
  { id: 'courtFindings', label: '本院查明', icon: 'search' },
  { id: 'courtOpinion', label: '本院认为', icon: 'scale' },
  { id: 'verdict', label: '裁判结果', icon: 'check-circle' },
  { id: 'relatedLaws', label: '相关法条', icon: 'book' },
];

const regulationSidebarSections = computed(() => {
  if (!isRegulation.value || !documentData.value.chapters) return [];
  const sections = [
    { id: 'lawInfo', label: '法规信息', icon: 'info' },
  ];
  documentData.value.chapters.forEach((chapter: any) => {
    sections.push({
      id: chapter.id,
      label: chapter.title,
      icon: 'book',
    });
  });
  sections.push({ id: 'relatedLaws', label: '相关法规', icon: 'link' });
  return sections;
});

const sidebarSections = computed(() => {
  return isRegulation.value ? regulationSidebarSections.value : caseSidebarSections;
});

const activeSection = ref('');

const handleScroll = () => {
  const sections = sidebarSections.value.map(s => document.getElementById(s.id));
  const scrollTop = document.querySelector('.document-content')?.scrollTop || 0;

  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];
    const sidebarSection = sidebarSections.value[i];
    if (section && sidebarSection && section.offsetTop - 120 <= scrollTop) {
      activeSection.value = sidebarSection.id;
      break;
    }
  }
};

// Highlighting Logic
const highlightText = () => {
  const queryHighlight = route.query.highlight as string;
  if (!queryHighlight) return;

  const textToHighlight = queryHighlight.substring(0, 50); 

  const contentEl = document.querySelector('.document-body');
  if (!contentEl) return;

  const treeWalker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
  let currentNode = treeWalker.nextNode();
  
  while (currentNode) {
    if (currentNode.textContent && currentNode.textContent.includes(textToHighlight)) {
       const parent = currentNode.parentElement;
       if (parent) {
         parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
         parent.style.backgroundColor = '#fef08a'; 
         parent.style.transition = 'background-color 1s';
         setTimeout(() => {
            parent.style.backgroundColor = 'transparent';
         }, 3000);
       }
       return; 
    }
    currentNode = treeWalker.nextNode();
  }
};

onMounted(async () => {
  const contentEl = document.querySelector('.document-content');
  contentEl?.addEventListener('scroll', handleScroll);
  const firstSection = sidebarSections.value[0];
  if (firstSection) {
    activeSection.value = firstSection.id;
  }
  
  await nextTick();
  highlightText();
});

onUnmounted(() => {
  const contentEl = document.querySelector('.document-content');
  contentEl?.removeEventListener('scroll', handleScroll);
});

const scrollToSection = (sectionId: string) => {
  activeSection.value = sectionId;
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const goBack = () => {
   router.back(); 
};

const downloadDocument = () => alert('文档下载功能开发中...');
const addToKnowledgeBase = () => alert('已添加到知识库');

</script>

<template>
  <div class="document-detail-page">
    <!-- Fixed Action Bar -->
    <header class="action-bar">
      <div class="action-bar-left">
        <button class="back-btn" @click="goBack">
          <ArrowLeft :size="18" />
          <span>返回</span>
        </button>
      </div>
      <div class="action-bar-right">
        <button class="action-btn-secondary" @click="downloadDocument">
          <Download :size="16" />
          下载文書
        </button>
        <button class="action-btn-primary" @click="addToKnowledgeBase">
          <FolderPlus :size="16" />
          添加到知识库
        </button>
      </div>
    </header>

    <div class="main-container">
      <!-- Left Sidebar - Document Outline -->
      <aside class="document-sidebar">
        <div class="sidebar-header">
          <h3>文书目录</h3>
        </div>
        <nav class="sidebar-nav">
          <div
            v-for="section in sidebarSections"
            :key="section.id"
            class="nav-item"
            :class="{ active: activeSection === section.id }"
            @click="scrollToSection(section.id)"
          >
            <span class="nav-label">{{ section.label }}</span>
          </div>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="document-content">
        <!-- 法规类文档展示 -->
        <template v-if="isRegulation">
          <!-- 法规 Header -->
          <div class="document-header" id="lawInfo">
            <h1 class="document-title">{{ documentData.title }}</h1>
            <div class="document-meta">
              <div class="meta-row">
                <span class="meta-item">
                  <span class="meta-label">文号：</span>
                  <span class="meta-value">{{ documentData.documentNumber }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-label">发布机关：</span>
                  <span class="meta-value">{{ documentData.issueOrgan }}</span>
                </span>
              </div>
              <div class="meta-row">
                <span class="meta-item">
                  <span class="meta-label">发布日期：</span>
                  <span class="meta-value">{{ documentData.issueDate }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-label">施行日期：</span>
                  <span class="meta-value">{{ documentData.effectiveDate }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- 法规正文 -->
          <div class="document-body">
            <div
              v-for="chapter in documentData.chapters"
              :key="chapter.id"
              :id="chapter.id"
              class="doc-section"
            >
              <h2 class="section-title">{{ chapter.title }}</h2>
              <div class="articles-list">
                <div
                  v-for="(article, idx) in chapter.articles"
                  :key="idx"
                  class="article-item"
                >
                  <h4 class="article-number">{{ article.number }}</h4>
                  <div class="article-content">
                    <p v-for="(para, pIdx) in article.content.split('\n')" :key="pIdx">{{ para }}</p>
                  </div>
                </div>
              </div>
            </div>
            
             <!-- 相关法规 -->
             <section class="doc-section" id="relatedLaws" v-if="documentData.relatedLaws && documentData.relatedLaws.length">
              <h2 class="section-title">相关法规</h2>
              <div class="related-laws">
                <div v-for="(law, idx) in documentData.relatedLaws" :key="idx" class="law-card">
                  <h4 class="law-name">{{ law.name }}</h4>
                  <p class="law-content">{{ law.content }}</p>
                </div>
              </div>
            </section>
          </div>
        </template>

        <!-- 案例类文档展示 -->
        <template v-else>
          <div class="document-header" id="caseInfo">
            <h1 class="document-title">{{ documentData.title }}</h1>
            <div class="document-meta">
                <div class="meta-row">
                <span class="meta-item">
                    <span class="meta-label">案号：</span>
                    <span class="meta-value">{{ documentData.caseNumber }}</span>
                </span>
                <span class="meta-item">
                    <span class="meta-label">审理法院：</span>
                    <span class="meta-value">{{ documentData.court }}</span>
                </span>
                </div>
            </div>
          </div>

          <div class="document-body">
            <!-- 案例内容 Sections -->
            <section v-if="documentData.parties" class="doc-section" id="parties">
                <h2 class="section-title">当事人信息</h2>
                <div class="parties-info">
                   <div class="party-card">
                      <p><strong>上诉人：</strong>{{ documentData.parties.appellant.name }}</p>
                      <p><strong>性别：</strong>{{ documentData.parties.appellant.gender }}</p>
                      <p><strong>职业：</strong>{{ documentData.parties.appellant.occupation }}</p>
                   </div>
                </div>
            </section>

             <section v-if="documentData.procedureHistory" class="doc-section" id="procedure">
                <h2 class="section-title">审理经过</h2>
                <p>{{ documentData.procedureHistory }}</p>
             </section>
             
             <section v-if="documentData.originalFacts" class="doc-section" id="originalFacts">
                <h2 class="section-title">原审认定事实</h2>
                <p>{{ documentData.originalFacts }}</p>
             </section>

             <section v-if="documentData.courtOpinion" class="doc-section" id="courtOpinion">
                <h2 class="section-title">本院认为</h2>
                <p>{{ documentData.courtOpinion }}</p>
             </section>

             <section v-if="documentData.verdict" class="doc-section" id="verdict">
                <h2 class="section-title">裁判结果</h2>
                <p>{{ documentData.verdict }}</p>
             </section>
          </div>
        </template>

      </main>
    </div>
  </div>
</template>

<style scoped>
.document-detail-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* Action Bar */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
  z-index: 100;
}

.action-bar-left, .action-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover { background: #f5f5f5; border-color: #ccc; }

.action-btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn-primary:hover { background: #1557b0; }

.action-btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn-secondary:hover { background: #f5f5f5; }


.main-container {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* Sidebar */
.document-sidebar {
    width: 260px;
    background: white;
    border-right: 1px solid #e5e5e5;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.sidebar-header {
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
}
.sidebar-header h3 { font-size: 16px; font-weight: 600; color: #333; margin: 0; }

.sidebar-nav { padding: 10px 0; }
.nav-item {
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    border-left: 3px solid transparent;
}
.nav-item:hover { background: #f9f9f9; color: #333; }
.nav-item.active { background: #e8f0fe; color: #1a73e8; border-left-color: #1a73e8; font-weight: 500; }

/* Main Content */
.document-content {
    flex: 1;
    padding: 40px 60px;
    overflow-y: auto;
    background: white;
}

.document-header { 
    margin-bottom: 40px; 
    padding-bottom: 20px; 
    border-bottom: 1px solid #eee; 
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
}

.document-body {
    max-width: 900px;
    margin: 0 auto;
}

.document-title { font-size: 24px; font-weight: 700; color: #333; margin-bottom: 20px; line-height: 1.4; text-align: center; }

.document-meta {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
}
.meta-row { display: flex; gap: 40px; justify-content: center; }
.meta-item { display: flex; gap: 8px; font-size: 13px; }
.meta-label { color: #666; }
.meta-value { color: #333; font-weight: 500; }

.doc-section { margin-bottom: 40px; }
.section-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 16px;
    padding-left: 10px;
    border-left: 4px solid #1a73e8;
}

.articles-list { display: flex; flex-direction: column; gap: 16px; }
.article-item { background: #fff; }
.article-number { font-size: 15px; font-weight: 600; color: #333; margin: 0 0 8px 0; }
.article-content p { font-size: 15px; line-height: 1.8; color: #333; margin: 0 0 8px 0; text-align: justify; }

.parties-info { background: #f8f9fa; padding: 15px; border-radius: 8px; }
.party-card { margin-bottom: 10px; font-size: 14px; line-height: 1.6; }

.related-laws { display: flex; flex-direction: column; gap: 12px; }
.law-card { background: #f8f9fa; padding: 12px; border-radius: 6px; }
.law-name { font-size: 14px; font-weight: 600; margin: 0 0 4px 0; color: #333; }
.law-content { font-size: 13px; color: #666; margin: 0; }
</style>
