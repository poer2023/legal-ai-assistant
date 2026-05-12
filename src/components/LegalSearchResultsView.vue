<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, ChevronDown, ChevronRight } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const searchQuery = ref((route.query.q as string) || '缓刑条件');
const currentPage = ref(1);
const totalPages = 10;

// Active tab state
const activeTab = ref<'cases' | 'regulations'>('cases');

// Search scope options - 根据 tab 动态变化
const searchScope = ref('全文');
const caseScopeOptions = ['全文', '标题', '案号'];
const regulationScopeOptions = ['标题', '全文', '发文字号'];
const searchScopeOptions = computed(() => {
  return activeTab.value === 'cases' ? caseScopeOptions : regulationScopeOptions;
});
const showScopeDropdown = ref(false);

// 监听 tab 切换，自动设置默认搜索范围
watch(activeTab, (newTab) => {
  searchScope.value = newTab === 'cases' ? '全文' : '标题';
});

// Search in results checkbox
const searchInResults = ref(false);

// Selected tags for quick filter
const selectedTags = ref<string[]>(['缓刑条件']);

// Sort options
const sortBy = ref('相关度');
const sortOptions = ['相关度', '时间降序', '时间升序'];
const showSortDropdown = ref(false);

// ============ 司法案例筛选字段 ============
const casesFilters = {
  referenceLevel: [
    { label: '指导性案例', count: 7, value: 'zhidaoxing' },
    { label: '参考案例', count: 4, value: 'cankao' },
    { label: '典型案例', count: 7, value: 'dianxing' },
    { label: '普通案例', count: 42205, value: 'putong' },
  ],
  caseReason: [
    { label: '刑事案由', count: 39363, value: 'xingshi' },
    { label: '民事案由', count: 649, value: 'minshi' },
    { label: '行政案由', count: 2, value: 'xingzheng' },
  ],
  courtLevel: [
    { label: '初级人民法院', count: 129, value: 'chuji' },
    { label: '中级人民法院', count: 5277, value: 'zhongji' },
    { label: '高级人民法院', count: 24713, value: 'gaoji' },
    { label: '专门人民法院', count: 140, value: 'zhuanmen' },
  ],
  region: [
    { label: '北京市', count: 1146, value: 'beijing', children: [
      { label: '北京市高级人民法院', count: 234, value: 'beijing_gaoyuan' },
      { label: '北京市第一中级人民法院', count: 156, value: 'beijing_yizhong' },
      { label: '北京市第二中级人民法院', count: 178, value: 'beijing_erzhong' },
      { label: '北京市朝阳区人民法院', count: 89, value: 'beijing_chaoyang' },
      { label: '北京市海淀区人民法院', count: 76, value: 'beijing_haidian' },
    ]},
    { label: '上海市', count: 2345, value: 'shanghai', children: [
      { label: '上海市高级人民法院', count: 312, value: 'shanghai_gaoyuan' },
      { label: '上海市第一中级人民法院', count: 245, value: 'shanghai_yizhong' },
      { label: '上海市第二中级人民法院', count: 198, value: 'shanghai_erzhong' },
      { label: '上海市浦东新区人民法院', count: 156, value: 'shanghai_pudong' },
    ]},
    { label: '天津市', count: 1621, value: 'tianjin', children: [
      { label: '天津市高级人民法院', count: 189, value: 'tianjin_gaoyuan' },
      { label: '天津市第一中级人民法院', count: 134, value: 'tianjin_yizhong' },
    ]},
    { label: '河北省', count: 11046, value: 'hebei', children: [
      { label: '河北省高级人民法院', count: 567, value: 'hebei_gaoyuan' },
      { label: '石家庄市中级人民法院', count: 423, value: 'hebei_shijiazhuang' },
      { label: '唐山市中级人民法院', count: 356, value: 'hebei_tangshan' },
    ]},
    { label: '广东省', count: 8934, value: 'guangdong', children: [
      { label: '广东省高级人民法院', count: 456, value: 'guangdong_gaoyuan' },
      { label: '广州市中级人民法院', count: 512, value: 'guangdong_guangzhou' },
      { label: '深圳市中级人民法院', count: 478, value: 'guangdong_shenzhen' },
      { label: '广州市天河区人民法院', count: 234, value: 'guangdong_tianhe' },
    ]},
    { label: '江苏省', count: 7823, value: 'jiangsu', children: [
      { label: '江苏省高级人民法院', count: 389, value: 'jiangsu_gaoyuan' },
      { label: '南京市中级人民法院', count: 345, value: 'jiangsu_nanjing' },
      { label: '苏州市中级人民法院', count: 312, value: 'jiangsu_suzhou' },
    ]},
    { label: '浙江省', count: 6542, value: 'zhejiang', children: [
      { label: '浙江省高级人民法院', count: 278, value: 'zhejiang_gaoyuan' },
      { label: '杭州市中级人民法院', count: 298, value: 'zhejiang_hangzhou' },
      { label: '宁波市中级人民法院', count: 256, value: 'zhejiang_ningbo' },
    ]},
    { label: '山东省', count: 5678, value: 'shandong', children: [
      { label: '山东省高级人民法院', count: 234, value: 'shandong_gaoyuan' },
      { label: '济南市中级人民法院', count: 213, value: 'shandong_jinan' },
      { label: '青岛市中级人民法院', count: 198, value: 'shandong_qingdao' },
    ]},
    { label: '四川省', count: 4532, value: 'sichuan', children: [
      { label: '四川省高级人民法院', count: 189, value: 'sichuan_gaoyuan' },
      { label: '成都市中级人民法院', count: 234, value: 'sichuan_chengdu' },
    ]},
    { label: '湖北省', count: 3987, value: 'hubei', children: [
      { label: '湖北省高级人民法院', count: 167, value: 'hubei_gaoyuan' },
      { label: '武汉市中级人民法院', count: 198, value: 'hubei_wuhan' },
    ]},
  ],
  settlementYear: [
    { label: '2025年', count: 1133, value: '2025' },
    { label: '2024年', count: 1420, value: '2024' },
    { label: '2023年', count: 1399, value: '2023' },
    { label: '2022年', count: 748, value: '2022' },
    { label: '2021年', count: 3123, value: '2021' },
  ],
  trialProcedure: [
    { label: '一审', count: 38741, value: 'yishen' },
    { label: '二审', count: 5186, value: 'ershen' },
    { label: '再审', count: 201, value: 'zaishen' },
    { label: '其他', count: 123, value: 'qita' },
  ],
  documentType: [
    { label: '判决书', count: 38537, value: 'panjue' },
    { label: '裁定书', count: 3629, value: 'caiding' },
    { label: '决定书', count: 5, value: 'jueding' },
    { label: '通知书', count: 77, value: 'tongzhi' },
    { label: '其他', count: 7, value: 'qita' },
  ],
};

// ============ 法律法规筛选字段 ============
const regulationsFilters = {
  hierarchy: [
    { label: '法律', count: 3934, value: 'falv' },
    { label: '司法解释', count: 7854, value: 'sifajieshi' },
    { label: '行政法规', count: 11115, value: 'xingzhengfagui' },
    { label: '部门规章', count: 274864, value: 'bumanguizhang' },
    { label: '军事法规', count: 461, value: 'junshifagui' },
    { label: '党内法规', count: 2610, value: 'dangneifagui' },
    { label: '地方性法规', count: 1549787, value: 'difangxingfagui' },
    { label: '其他', count: 63630, value: 'qita' },
  ],
  effectiveness: [
    { label: '现行有效', count: 1752464, value: 'xianxingyouxiao' },
    { label: '失效', count: 151949, value: 'shixiao' },
    { label: '已被修改', count: 20283, value: 'yibeixiugai' },
    { label: '部分失效', count: 2619, value: 'bufenshixiao' },
    { label: '尚未生效', count: 442, value: 'shangweishengxiao' },
  ],
  region: [
    { label: '北京市', count: 403992, value: 'beijing' },
    { label: '天津市', count: 26305, value: 'tianjin' },
    { label: '河北省', count: 7166, value: 'hebei' },
    { label: '山西省', count: 16634, value: 'shanxi' },
    { label: '内蒙古自治区', count: 8409, value: 'neimenggu' },
    { label: '辽宁省', count: 8028, value: 'liaoning' },
    { label: '吉林省', count: 4794, value: 'jilin' },
    { label: '黑龙江省', count: 7218, value: 'heilongjiang' },
    { label: '上海市', count: 71030, value: 'shanghai' },
  ],
  industry: [
    { label: '农林牧渔', count: 202263, value: 'nonglinmuyu' },
    { label: '基础化工', count: 45433, value: 'jichuhuagong' },
    { label: '钢铁', count: 21030, value: 'gangtie' },
    { label: '有色金属', count: 16310, value: 'yousejinshu' },
    { label: '食品饮料', count: 187935, value: 'shipinyinliao' },
    { label: '纺织服饰', count: 43949, value: 'fangzhifushi' },
    { label: '轻工制造', count: 45763, value: 'qinggongzhizao' },
    { label: '医药生物', count: 80309, value: 'yiyaoshengwu' },
    { label: '公用事业', count: 91149, value: 'gongyongshiye' },
  ],
  sector: [
    { label: '人工智能', count: 18129, value: 'rengongzhineng' },
    { label: '区块链', count: 6542, value: 'qukuanlian' },
    { label: '物联网', count: 26783, value: 'wulianwang' },
    { label: '云计算', count: 21454, value: 'yunjisuan' },
    { label: '元宇宙', count: 503, value: 'yuanyuzhou' },
    { label: '5G', count: 14299, value: '5g' },
    { label: '大数据', count: 53571, value: 'dashuju' },
    { label: '集成电路', count: 11781, value: 'jichengdianlu' },
    { label: '芯片', count: 6176, value: 'xinpian' },
  ],
};

// ============ 行政处罚筛选字段 ============
const penaltiesFilters = {
  penaltyType: [
    { label: '罚款', count: 1245632, value: 'fakuan' },
    { label: '警告', count: 523418, value: 'jinggao' },
    { label: '没收违法所得', count: 182934, value: 'moshouweifahuode' },
    { label: '责令停产停业', count: 45219, value: 'zelingtingchantingye' },
    { label: '暂扣或者吊销许可证', count: 23157, value: 'diaoxiaoxukezheng' },
    { label: '行政拘留', count: 18234, value: 'xingzhengjuliu' },
    { label: '其他', count: 91583, value: 'qita' },
  ],
  department: [
    { label: '市场监督管理', count: 452361, value: 'shichangjiandu' },
    { label: '生态环境', count: 213547, value: 'shengtaihuanjing' },
    { label: '应急管理', count: 156823, value: 'yingjiguanli' },
    { label: '自然资源', count: 98214, value: 'ziranziyuan' },
    { label: '税务', count: 178936, value: 'shuiwu' },
    { label: '住房和城乡建设', count: 124587, value: 'zhufangchengxiang' },
    { label: '交通运输', count: 89652, value: 'jiaotongyunshu' },
    { label: '农业农村', count: 76234, value: 'nongyenongcun' },
    { label: '卫生健康', count: 65123, value: 'weishengjiankang' },
    { label: '其他', count: 234156, value: 'qita' },
  ],
  region: [
    { label: '北京市', count: 125436, value: 'beijing' },
    { label: '上海市', count: 143287, value: 'shanghai' },
    { label: '广东省', count: 234561, value: 'guangdong' },
    { label: '浙江省', count: 187234, value: 'zhejiang' },
    { label: '江苏省', count: 198745, value: 'jiangsu' },
    { label: '山东省', count: 156892, value: 'shandong' },
    { label: '四川省', count: 134567, value: 'sichuan' },
    { label: '湖北省', count: 112345, value: 'hubei' },
    { label: '河南省', count: 98765, value: 'henan' },
  ],
  year: [
    { label: '2025年', count: 45632, value: '2025' },
    { label: '2024年', count: 234156, value: '2024' },
    { label: '2023年', count: 198745, value: '2023' },
    { label: '2022年', count: 176523, value: '2022' },
    { label: '2021年', count: 145698, value: '2021' },
    { label: '2020年', count: 123456, value: '2020' },
  ],
  industry: [
    { label: '农林牧渔', count: 156234, value: 'nonglinmuyu' },
    { label: '基础化工', count: 89543, value: 'jichuhuagong' },
    { label: '食品饮料', count: 234561, value: 'shipinyinliao' },
    { label: '医药生物', count: 167234, value: 'yiyaoshengwu' },
    { label: '商贸零售', count: 198765, value: 'shangmaolingshou' },
    { label: '房地产', count: 87654, value: 'fangdichan' },
    { label: '建筑装饰', count: 123456, value: 'jianzhuzhuangshi' },
    { label: '交通运输', count: 76543, value: 'jiaotongyunshu' },
  ],
  sector: [
    { label: '环境保护', count: 234567, value: 'huanjingbaohu' },
    { label: '安全生产', count: 189234, value: 'anquanshengchan' },
    { label: '食品安全', count: 167890, value: 'shipianquanquan' },
    { label: '金融监管', count: 98765, value: 'jinrongjianguan' },
    { label: '知识产权', count: 56789, value: 'zhishichanquan' },
    { label: '劳动保障', count: 78901, value: 'laodongbaozhang' },
    { label: '消费者权益', count: 112345, value: 'xiaofeizhe' },
  ],
};

// Selected filter states - 储存选中的筛选项 {sectionKey: filterValue[]}
const selectedFilters = ref<Record<string, string[]>>({});

// 切换筛选项选中状态（支持多选）
const toggleFilter = (sectionKey: string, value: string) => {
  if (!selectedFilters.value[sectionKey]) {
    selectedFilters.value[sectionKey] = [];
  }
  const index = selectedFilters.value[sectionKey].indexOf(value);
  if (index > -1) {
    selectedFilters.value[sectionKey].splice(index, 1);
  } else {
    selectedFilters.value[sectionKey].push(value);
  }
};

// 检查筛选项是否选中
const isFilterSelected = (sectionKey: string, value: string) => {
  return selectedFilters.value[sectionKey]?.includes(value) ?? false;
};

// 获取已选筛选标签列表
const activeFilterTags = computed(() => {
  const tags: Array<{sectionKey: string; sectionLabel: string; filterLabel: string; filterValue: string}> = [];
  
  for (const section of filterSections.value) {
    const selectedValues = selectedFilters.value[section.key] || [];
    for (const selectedValue of selectedValues) {
      const filters = (currentFilters.value as any)[section.key];
      const filter = filters?.find((f: any) => f.value === selectedValue);
      if (filter) {
        tags.push({
          sectionKey: section.key,
          sectionLabel: section.label,
          filterLabel: filter.label,
          filterValue: selectedValue
        });
      }
    }
  }
  
  return tags;
});

// 移除单个筛选
const removeFilter = (sectionKey: string, filterValue: string) => {
  if (selectedFilters.value[sectionKey]) {
    const index = selectedFilters.value[sectionKey].indexOf(filterValue);
    if (index > -1) {
      selectedFilters.value[sectionKey].splice(index, 1);
    }
  }
};

// 清空所有筛选
const clearAllFilters = () => {
  selectedFilters.value = {};
};

// Collapsed states for filter sections
const collapsedSections = ref<Record<string, boolean>>({});

const toggleSection = (section: string) => {
  collapsedSections.value[section] = !collapsedSections.value[section];
};

// 根据当前tab获取对应的筛选配置
const currentFilters = computed(() => {
  if (activeTab.value === 'cases') return casesFilters;
  return regulationsFilters;
});

// 当前筛选部分配置
const filterSections = computed(() => {
  if (activeTab.value === 'cases') {
    return [
      { key: 'referenceLevel', label: '参照级别' },
      { key: 'caseReason', label: '案由' },
      { key: 'courtLevel', label: '法院层级' },
      { key: 'region', label: '地域及法院' },
      { key: 'settlementYear', label: '审结年份' },
      { key: 'trialProcedure', label: '审判程序' },
      { key: 'documentType', label: '文书类型' },
    ];
  }
  return [
    { key: 'hierarchy', label: '效力位阶' },
    { key: 'effectiveness', label: '时效性' },
    { key: 'region', label: '地区' },
    { key: 'industry', label: '申万行业' },
    { key: 'sector', label: '产业分类' },
  ];
});

// 总结果数
const totalResults = computed(() => {
  return 9999;
});

// Selected results for batch operations
const selectedResults = ref<number[]>([]);

const toggleResultSelection = (id: number) => {
  const index = selectedResults.value.indexOf(id);
  if (index > -1) {
    selectedResults.value.splice(index, 1);
  } else {
    selectedResults.value.push(id);
  }
};

const isResultSelected = (id: number) => {
  return selectedResults.value.includes(id);
};

const addToKnowledgeBase = (id: number) => {
  console.log('Adding to knowledge base:', id);
  alert(`已添加到知识库`);
};

const addSelectedToKnowledgeBase = () => {
  console.log('Adding selected to knowledge base:', selectedResults.value);
  alert(`已添加 ${selectedResults.value.length} 个项目到知识库`);
  selectedResults.value = [];
};

// 结果卡片内容 tab 状态管理
const resultContentTabs = ref<Record<number, string>>({});

const getResultActiveTab = (resultId: number) => {
  return resultContentTabs.value[resultId] || 'opinion';
};

const setResultActiveTab = (resultId: number, tab: string) => {
  resultContentTabs.value[resultId] = tab;
};

// 地域筛选展开状态
const expandedRegions = ref<Record<string, boolean>>({});

const toggleRegionExpand = (regionValue: string) => {
  expandedRegions.value[regionValue] = !expandedRegions.value[regionValue];
};

const isRegionExpanded = (regionValue: string) => {
  return expandedRegions.value[regionValue] || false;
};

// Mock search results - 司法案例（食品安全主题）
const caseResults = [
  {
    id: 1,
    type: 'case',
    caseType: '刑事一审',
    documentType: '刑事判决书',
    title: '张某某生产、销售有毒、有害食品罪一审刑事判决书',
    court: '北京市朝阳区人民法院',
    caseNumber: '(2024)京0105刑初1234号',
    date: '2024-11-15',
    settleDate: '2024-11-15审结',
    tags: ['本院认为', '裁判结果', '量刑情节'],
    content: '本院认为，被告人张某某在生产、销售的食品中掺入有毒、有害的非食品原料，其行为已构成生产、销售有毒、有害食品罪。被告人在食品生产过程中违法添加工业明胶，严重危害人民群众身体健康，应依法惩处。',
    judgmentResult: '一、被告人张某某犯生产、销售有毒、有害食品罪，判处有期徒刑三年，并处罚金人民币三十万元。\n二、扣押在案的违法所得人民币十五万元予以没收，上缴国库。\n三、扣押在案的作案工具予以没收。',
    historicalDocs: [],
  },
  {
    id: 2,
    type: 'case',
    caseType: '刑事二审',
    documentType: '刑事裁定书',
    title: '李某某生产、销售不符合安全标准的食品罪二审刑事裁定书',
    court: '上海市第一中级人民法院',
    caseNumber: '(2024)沪01刑终567号',
    date: '2024-10-22',
    settleDate: '2024-10-22审结',
    tags: ['本院认为', '裁判结果', '历审文书'],
    content: '本院认为，原审判决认定上诉人李某某生产、销售不符合食品安全标准的食品，足以造成严重食物中毒事故或者其他严重食源性疾病的事实清楚，证据确实、充分，定罪准确，量刑适当。',
    judgmentResult: '驳回上诉，维持原判。\n本裁定为终审裁定。',
    historicalDocs: [
      { title: '李某某生产、销售不符合安全标准的食品罪一审刑事判决书', caseNumber: '(2024)沪0115刑初456号', court: '上海市浦东新区人民法院', date: '2024-08-15' },
    ],
  },
  {
    id: 3,
    type: 'case',
    caseType: '民事一审',
    documentType: '民事判决书',
    title: '王某某与某某食品公司产品责任纠纷一审民事判决书',
    court: '广州市天河区人民法院',
    caseNumber: '(2024)粤0106民初8901号',
    date: '2024-09-18',
    settleDate: '2024-09-18审结',
    tags: ['本院认为', '裁判结果', '赔偿责任'],
    content: '本院认为，被告某某食品公司生产的预包装食品不符合食品安全国家标准，原告因食用该产品造成身体损害，被告应承担产品责任。根据《食品安全法》第一百四十八条规定，判决被告赔偿原告医疗费、精神损害抚慰金等合计人民币35000元。',
    judgmentResult: '一、被告某某食品有限公司于本判决生效之日起十日内赔偿原告王某某医疗费、交通费、营养费共计人民币12000元。\n二、被告某某食品有限公司于本判决生效之日起十日内赔偿原告王某某精神损害抚慰金人民币23000元。\n三、驳回原告王某某的其他诉讼请求。',
    historicalDocs: [
      { title: '王某某与某某食品公司产品责任纠纷二审民事判决书', caseNumber: '(2024)粤0106民织892号', court: '广州市中级人民法院', date: '2024-12-05' },
    ],
  },
  {
    id: 4,
    type: 'case',
    caseType: '刑事一审',
    documentType: '刑事判决书',
    title: '陈某某等人生产、销售伪劣产品罪一审刑事判决书',
    court: '杭州市余杭区人民法院',
    caseNumber: '(2024)浙0110刑初2345号',
    date: '2024-08-30',
    settleDate: '2024-08-30审结',
    tags: ['本院认为', '裁判结果', '共同犯罪'],
    content: '本院认为，被告人陈某某等人以假充真、以次充好，生产销售伪劣食品，销售金额达人民币180万元，其行为已构成生产、销售伪劣产品罪。鉴于被告人到案后如实供述犯罪事实，依法可以从轻处罚。',
    judgmentResult: '一、被告人陈某某犯生产、销售伪劣产品罪，判处有期徒刑七年，并处罚金人民币一百万元。\n二、被告人张某某犯生产、销售伪劣产品罪，判处有期徒刑五年，并处罚金人民币六十万元。\n三、扣押在案的违法所得人民币一百八十万元予以没收。',
    historicalDocs: [
      { title: '陈某某等人生产、销售伪劣产品罪二审刑事裁定书', caseNumber: '(2024)浙01刑织678号', court: '浙江省高级人民法院', date: '2024-11-20' },
    ],
  },
  {
    id: 5,
    type: 'case',
    caseType: '行政一审',
    documentType: '行政判决书',
    title: '某某餐饮公司诉市场监督管理局行政处罚案一审行政判决书',
    court: '深圳市福田区人民法院',
    caseNumber: '(2024)粤0304行初678号',
    date: '2024-07-25',
    settleDate: '2024-07-25审结',
    tags: ['本院认为', '裁判结果', '行政诉讼'],
    content: '本院认为，被告市场监督管理局对原告某某餐饮公司作出的行政处罚决定，认定事实清楚，适用法律正确，程序合法，处罚幅度适当。原告主张其不存在使用过期食品原料的行为，缺乏证据支持，本院不予采信。',
    judgmentResult: '驳回原告某某餐饮管理有限公司的诉讼请求。\n案件受理费人民币50元，由原告某某餐饮管理有限公司负担。',
    historicalDocs: [
      { title: '某某餐饮公司诉市场监督管理局行政处罚案二审行政判决书', caseNumber: '(2024)粤03行绉123号', court: '深圳市中级人民法院', date: '2024-10-18' },
    ],
  },
  {
    id: 6,
    type: 'case',
    caseType: '民事二审',
    documentType: '民事判决书',
    title: '刘某某与某某超市买卖合同纠纷二审民事判决书',
    court: '成都市中级人民法院',
    caseNumber: '(2024)川01民终4567号',
    date: '2024-06-20',
    settleDate: '2024-06-20审结',
    tags: ['本院认为', '裁判结果', '十倍赔偿'],
    content: '本院认为，上诉人某某超市销售的进口食品未标注中文标签，不符合食品安全法的规定。根据《食品安全法》第一百四十八条第二款规定，消费者除要求赔偿损失外，还可以向生产者或者经营者要求支付价款十倍的赔偿金。',
    judgmentResult: '一、撤销成都市武侯区人民法院(2024)川0107民初1234号民事判决。\n二、上诉人某某超市于本判决生效之日起十日内向被上诉人刘某某支付价款十倍赔偿金人民币5800元。',
    historicalDocs: [
      { title: '刘某某与某某超市买卖合同纠纷一审民事判决书', caseNumber: '(2024)川0107民初1234号', court: '成都市武侯区人民法院', date: '2024-04-10' },
    ],
  },
  {
    id: 7,
    type: 'case',
    caseType: '刑事一审',
    documentType: '刑事判决书',
    title: '赵某某销售假冒注册商标的商品罪一审刑事判决书',
    court: '武汉市江汉区人民法院',
    caseNumber: '(2024)鄂0103刑初789号',
    date: '2024-05-15',
    settleDate: '2024-05-15审结',
    tags: ['本院认为', '裁判结果', '商标侵权'],
    content: '本院认为，被告人赵某某明知是假冒注册商标的食品仍予以销售，销售金额达人民币50万元，情节严重，其行为已构成销售假冒注册商标的商品罪。被告人销售的假冒品牌婴幼儿配方奶粉，严重威胁婴幼儿身体健康。',
    judgmentResult: '一、被告人赵某某犯销售假冒注册商标的商品罪，判处有期徒刑三年六个月，并处罚金人民币三十万元。\n二、扣押在案的假冒注册商标商品予以没收并销毁。',
    historicalDocs: [
      { title: '赵某某销售假冒注册商标的商品罪二审刑事裁定书', caseNumber: '(2024)鄂刑绉456号', court: '湖北省高级人民法院', date: '2024-08-25' },
      { title: '赵某某销售假冒注册商标的商品罪再审刑事裁定书', caseNumber: '(2024)鄂刑再12号', court: '湖北省高级人民法院', date: '2024-10-30' },
    ],
  },
  {
    id: 8,
    type: 'case',
    caseType: '民事一审',
    documentType: '民事判决书',
    title: '周某某与某某外卖平台网络服务合同纠纷一审民事判决书',
    court: '南京市鼓楼区人民法院',
    caseNumber: '(2024)苏0106民初3456号',
    date: '2024-04-10',
    settleDate: '2024-04-10审结',
    tags: ['本院认为', '裁判结果', '平台责任'],
    content: '本院认为，被告某某外卖平台未对入驻商家的食品经营资质进行有效审核，导致原告在平台上购买的食品存在安全问题，被告应承担相应的连带责任。根据《电子商务法》相关规定，判决被告赔偿原告损失。',
    judgmentResult: '一、被告某某网络科技有限公司于本判决生效之日起十日内赔偿原告周某某医疗费、误工费等损失共计人民币8500元。\n二、驳回原告周某某的其他诉讼请求。',
    historicalDocs: [
      { title: '周某某与某某外卖平台网络服务合同纠纷二审民事判决书', caseNumber: '(2024)苏01民织1234号', court: '南京市中级人民法院', date: '2024-07-28' },
    ],
  },
  {
    id: 9,
    type: 'case',
    caseType: '刑事一审',
    documentType: '刑事判决书',
    title: '孙某某非法经营罪一审刑事判决书',
    court: '郑州市金水区人民法院',
    caseNumber: '(2024)豫0105刑初901号',
    date: '2024-03-28',
    settleDate: '2024-03-28审结',
    tags: ['本院认为', '裁判结果', '食品经营'],
    content: '本院认为，被告人孙某某未取得食品经营许可证，擅自从事食品生产经营活动，情节严重，扰乱市场秩序，其行为已构成非法经营罪。被告人经营的黑作坊生产环境恶劣，严重威胁食品安全。',
    judgmentResult: '一、被告人孙某某犯非法经营罪，判处有期徒刑二年，缓刑三年，并处罚金人民币十万元。\n二、扣押在案的生产设备、原材料等予以没收。',
    historicalDocs: [
      { title: '孙某某非法经营罪二审刑事裁定书', caseNumber: '(2024)豫刑绉567号', court: '河南省高级人民法院', date: '2024-06-15' },
    ],
  },
  {
    id: 10,
    type: 'case',
    caseType: '民事一审',
    documentType: '民事调解书',
    title: '吴某某与某某学校餐饮服务合同纠纷一审民事调解书',
    court: '西安市雁塔区人民法院',
    caseNumber: '(2024)陕0113民初2234号',
    date: '2024-02-20',
    settleDate: '2024-02-20审结',
    tags: ['调解协议', '食品安全', '学校食堂'],
    content: '经本院主持调解，双方当事人自愿达成协议：被告某某学校向原告吴某某赔偿因学校食堂食品卫生问题造成的医疗费、营养费等损失共计人民币12000元，并承诺加强食堂卫生管理，确保学生用餐安全。',
    judgmentResult: '调解协议内容：\n一、被告某某学校于本调解书生效之日起十日内一次性支付原告吴某某医疗费、营养费、交通费等各项损失共计人民币12000元。\n二、被告某某学校承诺在三十日内对学校食堂进行全面整改，并接受卫生部门的监督检查。\n三、双方当事人就本案再无其他争议。',
    historicalDocs: [
      { title: '吴某某与某某学校餐饮服务合同纠纷诉前调解协议', caseNumber: '陕雁0113调字(2024)0088号', court: '西安市雁塔区人民法院', date: '2024-01-15' },
    ],
  },
];

// Mock search results - 法律法规（食品安全主题）
const regulationResults = [
  {
    id: 101,
    type: 'regulation',
    title: '中华人民共和国食品安全法（2021年修正）',
    category: '法律',
    authority: '全国人大常委会 | 中华人民共和国主席令第81号',
    publishDate: '2021-04-29公布',
    effectiveDate: '2021-04-29施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 102,
    type: 'regulation',
    title: '中华人民共和国食品安全法实施条例（2019年修订）',
    category: '行政法规',
    authority: '国务院 | 国务院令第721号',
    publishDate: '2019-10-11公布',
    effectiveDate: '2019-12-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 103,
    type: 'regulation',
    title: '最高人民法院、最高人民检察院关于办理危害食品安全刑事案件适用法律若干问题的解释',
    category: '司法解释',
    authority: '最高人民法院 最高人民检察院 | 法释〔2021〕24号',
    publishDate: '2021-12-31公布',
    effectiveDate: '2022-01-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 104,
    type: 'regulation',
    title: '食品生产许可管理办法',
    category: '部门规章',
    authority: '国家市场监督管理总局 | 总局令第24号',
    publishDate: '2020-01-02公布',
    effectiveDate: '2020-03-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 105,
    type: 'regulation',
    title: '食品经营许可和备案管理办法',
    category: '部门规章',
    authority: '国家市场监督管理总局 | 总局令第78号',
    publishDate: '2023-06-15公布',
    effectiveDate: '2023-12-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 106,
    type: 'regulation',
    title: '网络餐饮服务食品安全监督管理办法',
    category: '部门规章',
    authority: '国家食品药品监督管理总局 | 总局令第36号',
    publishDate: '2017-11-06公布',
    effectiveDate: '2018-01-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 107,
    type: 'regulation',
    title: '食品安全抽样检验管理办法（2019年修订）',
    category: '部门规章',
    authority: '国家市场监督管理总局 | 总局令第15号',
    publishDate: '2019-08-08公布',
    effectiveDate: '2019-10-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 108,
    type: 'regulation',
    title: '北京市食品安全条例',
    category: '地方性法规',
    authority: '北京市人民代表大会常务委员会',
    publishDate: '2023-09-22公布',
    effectiveDate: '2023-12-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 109,
    type: 'regulation',
    title: '婴幼儿配方乳粉产品配方注册管理办法（2023年修订）',
    category: '部门规章',
    authority: '国家市场监督管理总局 | 总局令第77号',
    publishDate: '2023-11-24公布',
    effectiveDate: '2024-01-01施行',
    status: '现行有效',
    statusClass: 'valid',
  },
  {
    id: 110,
    type: 'regulation',
    title: '食品标识监督管理办法（征求意见稿）',
    category: '部门规章',
    authority: '国家市场监督管理总局',
    publishDate: '2024-06-15公布',
    effectiveDate: '2025-01-01施行',
    status: '尚未生效',
    statusClass: 'pending',
  },
];

// Mock search results - 行政处罚（食品安全主题）
const penaltyResults = [
  {
    id: 201,
    type: 'penalty',
    title: '北京市朝阳区市场监督管理局行政处罚决定书（京朝市监罚字〔2024〕第1234号）',
    penaltyType: '罚款、没收违法所得',
    department: '市场监督管理局',
    region: '北京市朝阳区',
    partyName: '北京某某食品有限公司',
    amount: '150000元',
    reason: '生产经营超过保质期的食品',
    date: '2024-12-15',
    caseNumber: '京朝市监罚字〔2024〕第1234号',
  },
  {
    id: 202,
    type: 'penalty',
    title: '上海市浦东新区市场监督管理局行政处罚决定书（沪浦市监食罚〔2024〕5678号）',
    penaltyType: '罚款、责令停产停业',
    department: '市场监督管理局',
    region: '上海市浦东新区',
    partyName: '上海某某餐饮管理有限公司',
    amount: '200000元',
    reason: '未取得食品经营许可从事食品经营活动',
    date: '2024-11-28',
    caseNumber: '沪浦市监食罚〔2024〕5678号',
  },
  {
    id: 203,
    type: 'penalty',
    title: '广州市天河区市场监督管理局行政处罚决定书（穗天市监罚〔2024〕9012号）',
    penaltyType: '警告、罚款',
    department: '市场监督管理局',
    region: '广州市天河区',
    partyName: '广州某某烘焙店',
    amount: '50000元',
    reason: '经营标签不符合规定的预包装食品',
    date: '2024-12-05',
    caseNumber: '穗天市监罚〔2024〕9012号',
  },
  {
    id: 204,
    type: 'penalty',
    title: '深圳市福田区市场监督管理局行政处罚决定书（深福市监罚〔2024〕3456号）',
    penaltyType: '罚款、吊销许可证',
    department: '市场监督管理局',
    region: '深圳市福田区',
    partyName: '深圳某某食品加工厂',
    amount: '500000元',
    reason: '在食品中添加食品添加剂以外的化学物质',
    date: '2024-10-20',
    caseNumber: '深福市监罚〔2024〕3456号',
  },
  {
    id: 205,
    type: 'penalty',
    title: '杭州市余杭区市场监督管理局行政处罚决定书（杭余市监罚〔2024〕7890号）',
    penaltyType: '罚款',
    department: '市场监督管理局',
    region: '杭州市余杭区',
    partyName: '杭州某某网络科技有限公司',
    amount: '80000元',
    reason: '网络食品交易第三方平台未对入网食品经营者进行实名登记',
    date: '2024-09-15',
    caseNumber: '杭余市监罚〔2024〕7890号',
  },
  {
    id: 206,
    type: 'penalty',
    title: '成都市武侯区市场监督管理局行政处罚决定书（成武市监罚〔2024〕2345号）',
    penaltyType: '警告、罚款',
    department: '市场监督管理局',
    region: '成都市武侯区',
    partyName: '成都某某火锅店',
    amount: '30000元',
    reason: '使用回收食品作为原料生产食品',
    date: '2024-08-22',
    caseNumber: '成武市监罚〔2024〕2345号',
  },
  {
    id: 207,
    type: 'penalty',
    title: '南京市鼓楼区市场监督管理局行政处罚决定书（宁鼓市监罚〔2024〕6789号）',
    penaltyType: '罚款、没收违法所得',
    department: '市场监督管理局',
    region: '南京市鼓楼区',
    partyName: '南京某某乳业有限公司',
    amount: '350000元',
    reason: '生产经营营养成分不符合食品安全标准的婴幼儿配方食品',
    date: '2024-07-18',
    caseNumber: '宁鼓市监罚〔2024〕6789号',
  },
  {
    id: 208,
    type: 'penalty',
    title: '武汉市江汉区市场监督管理局行政处罚决定书（武江市监罚〔2024〕4567号）',
    penaltyType: '罚款',
    department: '市场监督管理局',
    region: '武汉市江汉区',
    partyName: '武汉某某连锁超市有限公司',
    amount: '100000元',
    reason: '销售农药残留超过食品安全标准限量的食用农产品',
    date: '2024-06-25',
    caseNumber: '武江市监罚〔2024〕4567号',
  },
  {
    id: 209,
    type: 'penalty',
    title: '西安市雁塔区市场监督管理局行政处罚决定书（西雁市监罚〔2024〕8901号）',
    penaltyType: '警告、罚款',
    department: '市场监督管理局',
    region: '西安市雁塔区',
    partyName: '西安某某学校食堂',
    amount: '45000元',
    reason: '餐饮服务提供者未按规定制定并实施生产经营过程控制要求',
    date: '2024-05-12',
    caseNumber: '西雁市监罚〔2024〕8901号',
  },
  {
    id: 210,
    type: 'penalty',
    title: '郑州市金水区市场监督管理局行政处罚决定书（郑金市监罚〔2024〕1357号）',
    penaltyType: '罚款、责令停产停业',
    department: '市场监督管理局',
    region: '郑州市金水区',
    partyName: '郑州某某食品配送有限公司',
    amount: '180000元',
    reason: '未按规定建立并遵守进货查验记录、出厂检验记录等制度',
    date: '2024-04-08',
    caseNumber: '郑金市监罚〔2024〕1357号',
  },
];

const currentResults = computed((): any[] => {
  if (activeTab.value === 'cases') return caseResults;
  return regulationResults;
});

const pageNumbers = computed(() => {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }
  return pages;
});

const handleSearch = () => {
  console.log('Searching:', searchQuery.value);
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages) {
    currentPage.value = page;
  }
};

const highlightText = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
};

const removeTag = (tag: string) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tag);
};

const selectSearchScope = (scope: string) => {
  searchScope.value = scope;
  showScopeDropdown.value = false;
};

const selectSortBy = (sort: string) => {
  sortBy.value = sort;
  showSortDropdown.value = false;
};

const goToDocumentDetail = (id: number) => {
  router.push({ name: 'legal-document-detail', params: { id: id.toString() } });
};
</script>

<template>
  <div class="search-results-page">
    <!-- Header Area with Tabs -->
    <header class="page-header">
      <div class="header-content">
        <!-- Tab Navigation -->
        <nav class="tab-navigation">
          <button
            class="tab-item"
            :class="{ active: activeTab === 'cases' }"
            @click="activeTab = 'cases'; selectedResults = []"
          >
            司法案例
          </button>
          <button
            class="tab-item"
            :class="{ active: activeTab === 'regulations' }"
            @click="activeTab = 'regulations'; selectedResults = []"
          >
            法律法规
          </button>
        </nav>

        <!-- Search Container -->
        <div class="search-container">
          <!-- Search Scope Dropdown -->
          <div class="search-scope-wrapper" @click="showScopeDropdown = !showScopeDropdown">
            <span class="scope-label">{{ searchScope }}</span>
            <ChevronDown :size="16" class="dropdown-icon" />
            <div v-if="showScopeDropdown" class="scope-dropdown">
              <div
                v-for="option in searchScopeOptions"
                :key="option"
                class="scope-option"
                :class="{ active: searchScope === option }"
                @click.stop="selectSearchScope(option)"
              >
                {{ option }}
              </div>
            </div>
          </div>

          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              :placeholder="`请输入${activeTab === 'cases' ? '司法案例' : '法律法规'}关键词`"
              @keyup.enter="handleSearch"
            />
          </div>

          <button class="search-btn" @click="handleSearch">
            <Search :size="16" />
            <span>搜索</span>
          </button>

          <label class="search-in-results">
            <input type="checkbox" v-model="searchInResults" />
            <span>在结果中检索</span>
          </label>
        </div>
      </div>
    </header>

    <!-- 已选筛选条件 -->
    <div class="selected-filters-bar" v-if="activeFilterTags.length > 0">
      <span class="filter-bar-label">已选:</span>
      <div
        v-for="tag in activeFilterTags"
        :key="`${tag.sectionKey}-${tag.filterValue}`"
        class="selected-filter-tag"
      >
        {{ tag.sectionLabel }}: {{ tag.filterLabel }}
        <button class="tag-remove" @click="removeFilter(tag.sectionKey, tag.filterValue)">×</button>
      </div>
      <button class="clear-all-btn" @click="clearAllFilters">清空</button>
    </div>



    <div class="main-content">
      <!-- Main White Card Container -->
      <div class="content-card">
        <!-- Inner Sidebar -->
        <aside class="inner-sidebar">
          <div
            v-for="section in filterSections"
            :key="section.key"
            class="sidebar-section"
          >
            <div class="section-title" @click="toggleSection(section.key)">
              <component
                :is="collapsedSections[section.key] ? ChevronRight : ChevronDown"
                :size="16"
                class="collapse-icon"
              />
              <span class="section-label">{{ section.label }}</span>
            </div>
            <div v-show="!collapsedSections[section.key]" class="filter-group">
              <template v-for="filter in (currentFilters as any)[section.key]" :key="filter.value">
                <label
                  class="filter-item"
                  :class="{ active: isFilterSelected(section.key, filter.value) }"
                >
                  <input
                    type="checkbox"
                    :checked="isFilterSelected(section.key, filter.value)"
                    @change="toggleFilter(section.key, filter.value)"
                    class="filter-checkbox"
                  />
                  <span class="filter-label">{{ filter.label }} ({{ filter.count }})</span>
                  <ChevronDown
                    v-if="section.key === 'region' && filter.children"
                    :size="14"
                    class="region-expand-icon"
                    :class="{ expanded: isRegionExpanded(filter.value) }"
                    @click.prevent.stop="toggleRegionExpand(filter.value)"
                  />
                </label>
                <!-- 子级法院列表 -->
                <div
                  v-if="section.key === 'region' && filter.children && isRegionExpanded(filter.value)"
                  class="sub-filter-group"
                >
                  <label
                    v-for="child in filter.children"
                    :key="child.value"
                    class="filter-item sub-item"
                    :class="{ active: isFilterSelected(section.key, child.value) }"
                  >
                    <input
                      type="checkbox"
                      :checked="isFilterSelected(section.key, child.value)"
                      @change="toggleFilter(section.key, child.value)"
                      class="filter-checkbox"
                    />
                    <span class="filter-label">{{ child.label }} ({{ child.count }})</span>
                  </label>
                </div>
              </template>
            </div>
          </div>
        </aside>

        <!-- divider -->
        <div class="divider-vertical"></div>

        <!-- Scrollable Results Area -->
        <main class="results-scroll-container">
          <!-- Results Header -->
          <div class="results-header">
            <div class="results-count">
              为您找到相关结果共 <span class="count-number">{{ totalResults }}+</span> 篇
            </div>
            <div class="sort-wrapper" @click="showSortDropdown = !showSortDropdown">
              <span class="sort-label">{{ sortBy }}</span>
              <ChevronDown :size="14" class="dropdown-icon" />
              <div v-if="showSortDropdown" class="sort-dropdown">
                <div
                  v-for="option in sortOptions"
                  :key="option"
                  class="sort-option"
                  :class="{ active: sortBy === option }"
                  @click.stop="selectSortBy(option)"
                >
                  {{ option }}
                </div>
              </div>
            </div>
          </div>

          <!-- Batch Actions Bar -->
          <div class="batch-actions-bar" v-if="selectedResults.length > 0">
            <span class="selected-count">已选择 {{ selectedResults.length }} 项</span>
            <button class="batch-add-btn" @click="addSelectedToKnowledgeBase">
              <span class="btn-icon">⚡</span>
              批量添加到知识库
            </button>
          </div>

          <div class="results-list">
            <!-- 司法案例结果 -->
            <template v-if="activeTab === 'cases'">
              <article
                v-for="result in currentResults"
                :key="result.id"
                class="result-item"
                :class="{ selected: isResultSelected(result.id) }"
              >
                <!-- Checkbox -->
                <div class="result-checkbox">
                  <input
                    type="checkbox"
                    :checked="isResultSelected(result.id)"
                    @change="toggleResultSelection(result.id)"
                  />
                </div>

                <div class="result-body">
                  <h3 class="result-title" @click="goToDocumentDetail(result.id)">
                    <span v-html="highlightText(result.title, searchQuery)"></span>
                  </h3>

                  <!-- Document Info Row -->
                  <div class="result-meta">
                    <span class="meta-doc-type">{{ result.documentType }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-case-number">{{ result.caseNumber }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-court">{{ result.court }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-date">{{ result.settleDate }}</span>
                  </div>

                  <!-- Content Section with Tabs -->
                  <div class="content-section-wrapper">
                    <div class="content-tabs">
                      <button 
                        class="content-tab" 
                        :class="{ active: getResultActiveTab(result.id) === 'opinion' }"
                        @click="setResultActiveTab(result.id, 'opinion')"
                      >本院认为</button>
                      <button 
                        class="content-tab" 
                        :class="{ active: getResultActiveTab(result.id) === 'judgment' }"
                        @click="setResultActiveTab(result.id, 'judgment')"
                      >裁判结果</button>
                      <button 
                        class="content-tab" 
                        :class="{ active: getResultActiveTab(result.id) === 'history' }"
                        @click="setResultActiveTab(result.id, 'history')"
                      >历审文书</button>
                    </div>
                    <!-- 本院认为 -->
                    <div class="content-body" v-if="getResultActiveTab(result.id) === 'opinion' && result.content">
                      <p class="content-text">
                        <span class="content-label">本院认为，</span>
                        <span>{{ result.content }}</span>
                      </p>
                    </div>
                    <!-- 裁判结果 -->
                    <div class="content-body" v-else-if="getResultActiveTab(result.id) === 'judgment' && result.judgmentResult">
                      <p class="content-text" style="white-space: pre-line;">{{ result.judgmentResult }}</p>
                    </div>
                    <div class="content-body content-empty" v-else-if="getResultActiveTab(result.id) === 'judgment'">
                      <p class="content-text">暂无裁判结果数据</p>
                    </div>
                    <!-- 历审文书 -->
                    <div class="content-body" v-else-if="getResultActiveTab(result.id) === 'history' && result.historicalDocs?.length > 0">
                      <div v-for="(doc, idx) in result.historicalDocs" :key="idx" class="history-doc-item">
                        <span class="history-doc-title">{{ doc.title }}</span>
                        <span class="history-doc-meta">{{ doc.caseNumber }} | {{ doc.court }} | {{ doc.date }}</span>
                      </div>
                    </div>
                    <div class="content-body content-empty" v-else-if="getResultActiveTab(result.id) === 'history'">
                      <p class="content-text">暂无历审文书</p>
                    </div>
                  </div>
                </div>

                <!-- Add to Knowledge Base Button -->
                <div class="result-actions">
                  <button class="add-to-kb-btn" @click="addToKnowledgeBase(result.id)">
                    <span class="btn-icon">⚡</span>
                    添加到知识库
                  </button>
                </div>
              </article>
            </template>

            <!-- 法律法规结果 -->
            <template v-else-if="activeTab === 'regulations'">
              <article
                v-for="result in currentResults"
                :key="result.id"
                class="result-item"
                :class="{ selected: isResultSelected(result.id) }"
              >
                <!-- Checkbox -->
                <div class="result-checkbox">
                  <input
                    type="checkbox"
                    :checked="isResultSelected(result.id)"
                    @change="toggleResultSelection(result.id)"
                  />
                </div>

                <div class="result-body">
                  <h3 class="result-title" @click="goToDocumentDetail(result.id)">
                    <span v-html="highlightText(result.title, searchQuery)"></span>
                    <span
                      class="status-badge"
                      :class="result.statusClass"
                    >{{ result.status }}</span>
                  </h3>

                  <!-- Regulation Info Row -->
                  <div class="result-meta">
                    <span class="meta-category">{{ result.category }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-authority">{{ result.authority }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-date">{{ result.publishDate }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-effective">{{ result.effectiveDate }}</span>
                  </div>
                </div>

                <!-- Add to Knowledge Base Button -->
                <div class="result-actions">
                  <button class="add-to-kb-btn" @click="addToKnowledgeBase(result.id)">
                    <span class="btn-icon">⚡</span>
                    添加到知识库
                  </button>
                </div>
              </article>
            </template>

            <!-- 行政处罚结果 -->
            <template v-else>
              <article
                v-for="result in currentResults"
                :key="result.id"
                class="result-item"
                :class="{ selected: isResultSelected(result.id) }"
              >
                <!-- Checkbox -->
                <div class="result-checkbox">
                  <input
                    type="checkbox"
                    :checked="isResultSelected(result.id)"
                    @change="toggleResultSelection(result.id)"
                  />
                </div>

                <div class="result-body">
                  <h3 class="result-title" @click="goToDocumentDetail(result.id)">
                    <span v-html="highlightText(result.title, searchQuery)"></span>
                  </h3>

                  <!-- Penalty Info Row -->
                  <div class="result-meta">
                    <span class="meta-penalty-type">{{ result.penaltyType }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-department">{{ result.department }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-region">{{ result.region }}</span>
                    <span class="meta-separator">｜</span>
                    <span class="meta-date">{{ result.date }}</span>
                  </div>

                  <!-- Penalty Details -->
                  <div class="penalty-details">
                    <div class="detail-row">
                      <span class="detail-label">当事人：</span>
                      <span class="detail-value">{{ result.partyName }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">违法事由：</span>
                      <span class="detail-value">{{ result.reason }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">处罚金额：</span>
                      <span class="detail-value amount">{{ result.amount }}</span>
                    </div>
                  </div>
                </div>

                <!-- Add to Knowledge Base Button -->
                <div class="result-actions">
                  <button class="add-to-kb-btn" @click="addToKnowledgeBase(result.id)">
                    <span class="btn-icon">⚡</span>
                    添加到知识库
                  </button>
                </div>
              </article>
            </template>
          </div>

          <!-- Pagination -->
          <div class="pagination">
            <span class="pagination-text">上一页</span>
            <div class="page-numbers">
              <button
                v-for="page in pageNumbers"
                :key="page"
                class="page-number"
                :class="{ active: currentPage === page }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
             <span class="pagination-text">下一页</span>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-results-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-soft);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* Header */
.page-header {
  background: var(--surface-soft);
  padding: 16px 40px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 32px;
  border-bottom: none;
}

.tab-item {
  position: relative;
  padding: 8px 4px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.tab-item:hover {
  color: var(--primary-color);
}

.tab-item.active {
  color: var(--primary-color);
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-color);
  border-radius: 1px;
}

/* Search Container */
.search-container {
  display: flex;
  align-items: center;
  gap: 0;
  background: white;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  max-width: 800px;
}

.search-scope-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-right: 1px solid var(--border-color);
  cursor: pointer;
  user-select: none;
}

.scope-label {
  font-size: 14px;
  color: var(--text-main);
  font-weight: 500;
}

.dropdown-icon {
  color: var(--text-muted);
}

.scope-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 100px;
}

.scope-option {
  padding: 10px 16px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.scope-option:first-child {
  border-radius: 8px 8px 0 0;
}

.scope-option:last-child {
  border-radius: 0 0 8px 8px;
}

.scope-option:hover {
  background: var(--surface-soft);
}

.scope-option.active {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.search-input-wrapper {
  flex: 1;
  padding: 0 12px;
}

.search-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--text-main);
  background: transparent;
  padding: 8px 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-btn:hover {
  background: var(--primary-hover);
}

.search-in-results {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.search-in-results input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

/* Selected Filters Bar - 已选筛选条件 */
.selected-filters-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 40px;
  background: var(--surface-soft);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.filter-bar-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.selected-filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  font-size: 13px;
  color: var(--primary-color);
}

.selected-filter-tag .tag-remove {
  background: none;
  border: none;
  padding: 0;
  margin-left: 4px;
  font-size: 14px;
  color: var(--primary-color);
  cursor: pointer;
  line-height: 1;
}

.selected-filter-tag .tag-remove:hover {
  color: var(--primary-hover);
}

.clear-all-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.clear-all-btn:hover {
  color: var(--primary-color);
}

/* Selected Tags Bar */
.selected-tags-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 40px;
  background: var(--surface-soft);
  flex-shrink: 0;
}

.tag-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--primary-soft-strong);
  border-radius: 4px;
  font-size: 13px;
  color: var(--primary-color);
}

.tag-remove {
  background: none;
  border: none;
  padding: 0;
  margin-left: 2px;
  font-size: 14px;
  color: var(--primary-color);
  cursor: pointer;
  line-height: 1;
}

.tag-remove:hover {
  color: var(--primary-hover);
}

/* Main Layout */
.main-content {
  flex: 1;
  padding: 0 40px;
  overflow: hidden;
  display: flex;
}

/* Content Card */
.content-card {
  flex: 1;
  background: white;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.inner-sidebar {
  width: 220px;
  padding: 24px;
  background: white;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 10px;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.section-title:hover {
  color: var(--primary-color);
}

.section-label {
  font-weight: 600;
}

.collapse-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 4px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 3px 0;
  transition: color 0.2s;
}

.filter-item:hover {
  color: var(--primary-color);
}

.filter-item.active {
  color: var(--primary-color);
  font-weight: 500;
}

.filter-checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--primary-color);
  cursor: pointer;
  flex-shrink: 0;
}

.region-expand-icon {
  color: var(--text-muted);
  margin-left: auto;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.region-expand-icon.expanded {
  transform: rotate(180deg);
}

.filter-item:hover .region-expand-icon {
  color: var(--primary-color);
}

.sub-filter-group {
  margin-left: 20px;
  padding-left: 12px;
  border-left: 2px solid var(--border-color);
}

.filter-item.sub-item {
  font-size: 12px;
  color: var(--text-secondary);
}

.filter-label {
  flex: 1;
}

/* Divider */
.divider-vertical {
  width: 1px;
  background: linear-gradient(to bottom, transparent, var(--border-color) 10%, var(--border-color) 90%, transparent);
  margin: 20px 0;
}

/* Results Scroll Container */
.results-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  min-width: 0;
}

/* Results Header */
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.results-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.count-number {
  color: var(--primary-color);
  font-weight: 600;
}

.sort-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.sort-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.sort-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 100px;
}

.sort-option {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.sort-option:first-child {
  border-radius: 8px 8px 0 0;
}

.sort-option:last-child {
  border-radius: 0 0 8px 8px;
}

.sort-option:hover {
  background: var(--surface-soft);
}

.sort-option.active {
  color: var(--primary-color);
  background: var(--primary-soft);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.result-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--surface-soft);
  transition: background-color 0.2s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.selected {
  background: var(--bg-color);
  margin: -8px;
  padding: 8px;
  padding-bottom: 24px;
  border-radius: 8px;
}

/* Batch Actions Bar */
.batch-actions-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--primary-soft);
  border: 1px solid var(--primary-soft-strong);
  border-radius: 8px;
  margin-bottom: 20px;
}

.selected-count {
  font-size: 14px;
  color: var(--primary-hover);
  font-weight: 500;
}

.batch-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary-color);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.batch-add-btn:hover {
  background: var(--primary-hover);
}

.batch-add-btn .btn-icon {
  font-size: 14px;
}

/* Result Checkbox */
.result-checkbox {
  flex-shrink: 0;
  padding-top: 4px;
}

.result-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

/* Result Actions */
.result-actions {
  flex-shrink: 0;
  padding-top: 4px;
}

.add-to-kb-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.add-to-kb-btn:hover {
  background: var(--bg-color);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.add-to-kb-btn .btn-icon {
  color: var(--warning-color);
}

.result-body {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 10px 0;
  line-height: 1.5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-title:hover {
  color: var(--primary-color);
  text-decoration: underline;
}

.status-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none !important;
}

.status-badge.valid {
  background: var(--diff-added-soft);
  color: var(--diff-added);
}

.status-badge.pending {
  background: var(--warning-soft);
  color: var(--warning-color);
}

.status-badge.invalid {
  background: var(--diff-removed-soft);
  color: var(--diff-removed);
}

.result-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.meta-separator {
  margin: 0 4px;
  color: var(--border-color);
}

/* Content Section Wrapper */
.content-section-wrapper {
  margin-top: 12px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.content-tabs {
  display: flex;
  gap: 0;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.content-tab {
  padding: 10px 20px;
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.content-tab:hover {
  color: var(--primary-color);
  background: var(--surface-soft);
}

.content-tab.active {
  color: var(--primary-color);
  font-weight: 600;
}

.content-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-color);
}

.content-body {
  padding: 16px;
}

.content-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-label {
  font-weight: 600;
  color: var(--primary-color);
}

.content-empty {
  color: var(--text-muted);
  font-style: italic;
}

.history-doc-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.history-doc-item:last-child {
  border-bottom: none;
}

.history-doc-title {
  font-size: 14px;
  color: var(--primary-color);
  cursor: pointer;
}

.history-doc-title:hover {
  text-decoration: underline;
}

.history-doc-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Penalty Details */
.penalty-details {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
}

.detail-label {
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 80px;
}

.detail-value {
  color: var(--text-main);
  flex: 1;
}

.detail-value.amount {
  color: var(--diff-removed);
  font-weight: 600;
}

/* Highlight style for search terms */
:deep(.highlight) {
  color: var(--diff-removed);
  font-weight: normal;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
}

.pagination-text {
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.pagination-text:hover {
  color: var(--primary-color);
}

.page-numbers {
  display: flex;
  gap: 8px;
}

.page-number {
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.page-number.active {
  background: var(--primary-soft);
  color: var(--primary-color);
  font-weight: 600;
}

.page-number:hover:not(.active) {
  background: var(--surface-soft);
}

/* Scrollbar styling */
.results-scroll-container::-webkit-scrollbar,
.inner-sidebar::-webkit-scrollbar {
  width: 6px;
}

.results-scroll-container::-webkit-scrollbar-track,
.inner-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.results-scroll-container::-webkit-scrollbar-thumb,
.inner-sidebar::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.results-scroll-container::-webkit-scrollbar-thumb:hover,
.inner-sidebar::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-muted);
}
</style>
