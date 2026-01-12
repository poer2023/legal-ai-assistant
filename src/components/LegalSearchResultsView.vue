<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, ChevronDown, ChevronRight } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const searchQuery = ref((route.query.q as string) || '缓刑条件');
const currentPage = ref(1);
const totalPages = 10;

// Active tab state
const activeTab = ref<'cases' | 'regulations'>('cases');

// Search scope options
const searchScope = ref('全文');
const searchScopeOptions = ['全文', '标题', '案号', '当事人', '法官'];
const showScopeDropdown = ref(false);

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
    { label: '北京', count: 1146, value: 'beijing' },
    { label: '天津', count: 1621, value: 'tianjin' },
    { label: '河北省', count: 11046, value: 'hebei' },
    { label: '内蒙古自治区', count: 394, value: 'neimenggu' },
    { label: '吉林省', count: 1325, value: 'jilin' },
    { label: '黑龙江省', count: 528, value: 'heilongjiang' },
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

// Selected filter states - 储存选中的筛选项 {sectionKey: filterValue}
const selectedFilters = ref<Record<string, string>>({});

// 获取已选筛选标签列表
const activeFilterTags = computed(() => {
  const tags: Array<{sectionKey: string; sectionLabel: string; filterLabel: string; filterValue: string}> = [];
  
  for (const section of filterSections.value) {
    const selectedValue = selectedFilters.value[section.key];
    if (selectedValue) {
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
const removeFilter = (sectionKey: string) => {
  delete selectedFilters.value[sectionKey];
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
        :key="tag.sectionKey"
        class="selected-filter-tag"
      >
        {{ tag.sectionLabel }}: {{ tag.filterLabel }}
        <button class="tag-remove" @click="removeFilter(tag.sectionKey)">×</button>
      </div>
      <button class="clear-all-btn" @click="clearAllFilters">清空</button>
    </div>

    <!-- Selected Tags -->
    <div class="selected-tags-bar" v-if="selectedTags.length > 0">
      <span class="tag-label">全文:</span>
      <div
        v-for="tag in selectedTags"
        :key="tag"
        class="selected-tag"
      >
        {{ tag }}
        <button class="tag-remove" @click="removeTag(tag)">×</button>
      </div>
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
              <div
                v-for="filter in (currentFilters as any)[section.key]"
                :key="filter.value"
                class="filter-item"
                :class="{ active: selectedFilters[section.key] === filter.value }"
                @click="selectedFilters[section.key] = filter.value"
              >
                <span class="filter-arrow">▸</span>
                <span class="filter-label">{{ filter.label }} ({{ filter.count }})</span>
              </div>
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

                  <!-- Quick Link Tags -->
                  <div class="quick-tags">
                    <span
                      v-for="(tag, idx) in result.tags"
                      :key="idx"
                      class="quick-tag"
                    >{{ tag }}</span>
                  </div>

                  <!-- Judgment Reason -->
                  <div class="judgment-section" v-if="result.content">
                    <p class="result-excerpt">
                      <span class="judgment-label">本院认为，</span>
                      <span>{{ result.content }}</span>
                    </p>
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
  background: #f0f4fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* Header */
.page-header {
  background: #f0f4fa;
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
  color: #64748b;
  cursor: pointer;
  transition: color 0.2s;
}

.tab-item:hover {
  color: #2563eb;
}

.tab-item.active {
  color: #2563eb;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #2563eb;
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
  border-right: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
}

.scope-label {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.dropdown-icon {
  color: #94a3b8;
}

.scope-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 100px;
}

.scope-option {
  padding: 10px 16px;
  font-size: 14px;
  color: #475569;
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
  background: #f1f5f9;
}

.scope-option.active {
  color: #2563eb;
  background: #eff6ff;
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
  color: #334155;
  background: transparent;
  padding: 8px 0;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: #2563eb;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-btn:hover {
  background: #1d4ed8;
}

.search-in-results {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 13px;
  color: #64748b;
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
  background: #f0f4fa;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.filter-bar-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.selected-filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #2563eb;
  border-radius: 4px;
  font-size: 13px;
  color: #2563eb;
}

.selected-filter-tag .tag-remove {
  background: none;
  border: none;
  padding: 0;
  margin-left: 4px;
  font-size: 14px;
  color: #2563eb;
  cursor: pointer;
  line-height: 1;
}

.selected-filter-tag .tag-remove:hover {
  color: #1d4ed8;
}

.clear-all-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: color 0.2s;
}

.clear-all-btn:hover {
  color: #2563eb;
}

/* Selected Tags Bar */
.selected-tags-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 40px;
  background: #f0f4fa;
  flex-shrink: 0;
}

.tag-label {
  font-size: 13px;
  color: #64748b;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #dbeafe;
  border-radius: 4px;
  font-size: 13px;
  color: #2563eb;
}

.tag-remove {
  background: none;
  border: none;
  padding: 0;
  margin-left: 2px;
  font-size: 14px;
  color: #2563eb;
  cursor: pointer;
  line-height: 1;
}

.tag-remove:hover {
  color: #1d4ed8;
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
  color: #1e293b;
  margin-bottom: 10px;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.section-title:hover {
  color: #2563eb;
}

.section-label {
  font-weight: 600;
}

.collapse-icon {
  color: #94a3b8;
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
  color: #64748b;
  cursor: pointer;
  padding: 3px 0;
  transition: color 0.2s;
}

.filter-item:hover {
  color: #2563eb;
}

.filter-item.active {
  color: #2563eb;
  font-weight: 500;
}

.filter-arrow {
  font-size: 10px;
  color: #94a3b8;
}

.filter-label {
  flex: 1;
}

/* Divider */
.divider-vertical {
  width: 1px;
  background: linear-gradient(to bottom, transparent, #e2e8f0 10%, #e2e8f0 90%, transparent);
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
  color: #64748b;
}

.count-number {
  color: #2563eb;
  font-weight: 600;
}

.sort-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.sort-label {
  font-size: 13px;
  color: #475569;
}

.sort-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 100px;
}

.sort-option {
  padding: 10px 16px;
  font-size: 13px;
  color: #475569;
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
  background: #f1f5f9;
}

.sort-option.active {
  color: #2563eb;
  background: #eff6ff;
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
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.selected {
  background: #f8fafc;
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
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  margin-bottom: 20px;
}

.selected-count {
  font-size: 14px;
  color: #1e40af;
  font-weight: 500;
}

.batch-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #2563eb;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.batch-add-btn:hover {
  background: #1d4ed8;
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
  accent-color: #2563eb;
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
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.add-to-kb-btn:hover {
  background: #f8fafc;
  border-color: #2563eb;
  color: #2563eb;
}

.add-to-kb-btn .btn-icon {
  color: #f59e0b;
}

.result-body {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 10px 0;
  line-height: 1.5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-title:hover {
  color: #2563eb;
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
  background: #d1fae5;
  color: #065f46;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.invalid {
  background: #fee2e2;
  color: #991b1b;
}

.result-meta {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 10px;
}

.meta-separator {
  margin: 0 4px;
  color: #cbd5e1;
}

/* Quick Link Tags */
.quick-tags {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.quick-tag {
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
  transition: color 0.2s;
}

.quick-tag:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* Judgment Section */
.judgment-section {
  margin-top: 8px;
}

.judgment-label {
  font-weight: 600;
  color: #334155;
}

.result-excerpt {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Penalty Details */
.penalty-details {
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  font-size: 14px;
  color: #475569;
  display: flex;
}

.detail-label {
  color: #64748b;
  font-weight: 500;
  min-width: 80px;
}

.detail-value {
  color: #334155;
  flex: 1;
}

.detail-value.amount {
  color: #dc2626;
  font-weight: 600;
}

/* Highlight style for search terms */
:deep(.highlight) {
  color: #dc2626;
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
  color: #64748b;
  cursor: pointer;
}

.pagination-text:hover {
  color: #2563eb;
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
  color: #64748b;
  cursor: pointer;
}

.page-number.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.page-number:hover:not(.active) {
  background: #f1f5f9;
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
  background-color: #cbd5e1;
  border-radius: 3px;
}

.results-scroll-container::-webkit-scrollbar-thumb:hover,
.inner-sidebar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
</style>
