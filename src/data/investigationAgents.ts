export const investigationAgentKeys = [
  'network-verification',
  'fund-flow',
  'equity-penetration',
] as const;

export type InvestigationAgentKey = typeof investigationAgentKeys[number];
export type RiskTone = 'critical' | 'warning' | 'good' | 'info';

export type InvestigationMetric = {
  label: string;
  value: string;
  hint: string;
  tone: RiskTone;
};

export type InvestigationFinding = {
  id: string;
  title: string;
  severity: string;
  body: string;
  evidence: string;
  recommendation: string;
  tone: RiskTone;
};

export type InvestigationRelation = {
  source: string;
  target: string;
  label: string;
};

export type InvestigationTimelineItem = {
  time: string;
  title: string;
  detail: string;
  tone: RiskTone;
};

export type InvestigationTable = {
  columns: string[];
  rows: string[][];
};

export type InvestigationAgentDemo = {
  key: InvestigationAgentKey;
  name: string;
  tagline: string;
  description: string;
  subjectLabel: string;
  materialLabel: string;
  materialPlaceholder: string;
  sample: {
    subject: string;
    material: string;
    notes: string;
  };
  focusOptions: string[];
  steps: string[];
  metrics: InvestigationMetric[];
  findings: InvestigationFinding[];
  relations: InvestigationRelation[];
  timeline: InvestigationTimelineItem[];
  evidenceTable: InvestigationTable;
  recommendations: string[];
};

export const investigationAgents: Record<InvestigationAgentKey, InvestigationAgentDemo> = {
  'network-verification': {
    key: 'network-verification',
    name: '网络核查',
    tagline: '公开线索、舆情信息与关联风险一屏汇总',
    description: '用于演示主体网络信息、公开风险、涉诉舆情和关联主体线索的快速核查流程。',
    subjectLabel: '核查主体',
    materialLabel: '已掌握线索',
    materialPlaceholder: '例如：公司名称、统一社会信用代码、主要人员、关联交易背景、已有网页线索等',
    sample: {
      subject: '上海星瀚数科有限公司',
      material:
        '客户提供：合作方报价异常偏低，项目经理曾使用个人邮箱沟通；另有供应商反馈该主体与多家公司共用联系电话。',
      notes: '展示重点：主体画像、负面舆情、司法执行、关联企业共用要素。',
    },
    focusOptions: ['工商公开信息', '裁判文书/执行', '舆情与招投标', '关联企业'],
    steps: ['读取主体资料', '检索公开登记与涉诉线索', '归并联系人与地址网络', '生成核查摘要'],
    metrics: [
      { label: '综合风险', value: '76/100', hint: '建议进入人工复核', tone: 'critical' },
      { label: '命中线索', value: '14条', hint: '含4条高优先级', tone: 'warning' },
      { label: '关联主体', value: '9家', hint: '3家共用电话或地址', tone: 'info' },
      { label: '核查耗时', value: '38秒', hint: '演示 mock 结果', tone: 'good' },
    ],
    findings: [
      {
        id: 'network-1',
        title: '多家公司共用联系电话与注册地址',
        severity: '高',
        body: '主体与3家贸易类公司存在电话、邮箱和办公地址重合，且其中2家公司近期出现经营异常记录。',
        evidence: '登记信息、招投标公告、历史联系方式交叉匹配',
        recommendation: '要求对方补充实际经营地址、项目联系人授权文件及关联关系说明。',
        tone: 'critical',
      },
      {
        id: 'network-2',
        title: '近期出现项目履约负面舆情',
        severity: '中',
        body: '近90天内出现2条围绕交付延期和售后争议的公开投诉，内容与当前合作标的具备相似性。',
        evidence: '公开投诉平台与行业论坛快照',
        recommendation: '在合同中提高交付验收标准，并加入分阶段付款与违约触发条款。',
        tone: 'warning',
      },
      {
        id: 'network-3',
        title: '核心人员历史任职交叉',
        severity: '中',
        body: '法定代表人与疑似实际业务负责人曾共同任职于一家被列入经营异常的企业。',
        evidence: '公开任职记录与历史工商变更',
        recommendation: '补充核验实际控制人、业务负责人和签约授权链路。',
        tone: 'warning',
      },
    ],
    relations: [
      { source: '上海星瀚数科有限公司', target: '星瀚供应链管理', label: '共用电话' },
      { source: '上海星瀚数科有限公司', target: '杭州辰陆贸易', label: '历史地址重合' },
      { source: '项目经理邮箱', target: '苏州海拓咨询', label: '邮箱域名关联' },
      { source: '法定代表人', target: '经营异常企业', label: '历史任职' },
    ],
    timeline: [
      { time: '2026-04-12', title: '招投标公告命中共用联系人', detail: '联系人手机与关联贸易公司一致。', tone: 'warning' },
      { time: '2026-03-28', title: '售后争议投诉', detail: '投诉内容涉及交付延期、响应不及时。', tone: 'warning' },
      { time: '2025-11-03', title: '注册地址变更', detail: '迁入与关联公司相同园区地址。', tone: 'info' },
    ],
    evidenceTable: {
      columns: ['线索类型', '命中内容', '风险等级', '建议动作'],
      rows: [
        ['共用要素', '电话、邮箱、地址交叉命中', '高', '补充关联关系说明'],
        ['舆情线索', '交付争议与售后投诉', '中', '加强验收与付款约束'],
        ['人员关系', '核心人员历史任职交叉', '中', '核验授权链路'],
      ],
    },
    recommendations: [
      '将合作方列入增强尽调名单，签约前完成授权链和实控人复核。',
      '合同中设置分阶段交付、分阶段付款、资料留存和审计配合条款。',
      '保留全部公开网页快照与沟通记录，形成客户可复核的线索附件。',
    ],
  },
  'fund-flow': {
    key: 'fund-flow',
    name: '资金流向',
    tagline: '交易路径、异常分拆与回流线索可视化',
    description: '用于演示交易流水、账户路径、异常流转和疑似回流的前端分析体验。',
    subjectLabel: '资金核查对象',
    materialLabel: '交易材料摘要',
    materialPlaceholder: '例如：银行流水区间、付款主体、收款账户、交易说明、重点关注日期等',
    sample: {
      subject: '青岚地产项目专项账户',
      material:
        '客户提供：2026年1月至3月项目款流水，部分供应商付款在48小时内拆分转入个人账户，疑似存在资金回流。',
      notes: '展示重点：多级转账路径、拆分交易、关联账户、异常时间窗口。',
    },
    focusOptions: ['资金闭环', '异常拆分', '关联交易', '个人账户回流'],
    steps: ['读取流水字段', '识别同日与短周期交易', '聚合账户关系路径', '输出异常流向摘要'],
    metrics: [
      { label: '异常风险', value: '82/100', hint: '存在疑似回流链路', tone: 'critical' },
      { label: '交易笔数', value: '126笔', hint: '演示样本流水', tone: 'info' },
      { label: '重点账户', value: '7个', hint: '含3个个人账户', tone: 'warning' },
      { label: '可疑金额', value: '¥486万', hint: '占样本31.4%', tone: 'critical' },
    ],
    findings: [
      {
        id: 'fund-1',
        title: '供应商收款后短周期拆分转出',
        severity: '高',
        body: '两家供应商在收到项目款后48小时内向多个个人账户拆分转账，金额与收款金额存在高度贴合。',
        evidence: '交易流水时间戳、金额分布与收款账户匹配',
        recommendation: '调取供应商合同、发票、履约凭证，并要求解释拆分付款商业原因。',
        tone: 'critical',
      },
      {
        id: 'fund-2',
        title: '疑似关联账户对敲',
        severity: '高',
        body: '项目账户、咨询公司和材料供应商之间出现多笔整额往返交易，备注高度模板化。',
        evidence: '整额转账、重复备注、交易间隔小于24小时',
        recommendation: '对交易背景进行穿透核验，重点关注合同真实性与资金用途。',
        tone: 'critical',
      },
      {
        id: 'fund-3',
        title: '尾款流向自然人账户',
        severity: '中',
        body: '部分尾款经中间账户流向自然人账户，且自然人与项目经理存在通讯录交集。',
        evidence: '账户路径、备注字段和联系人线索',
        recommendation: '补充自然人账户身份核验，冻结后续同类付款审批。',
        tone: 'warning',
      },
    ],
    relations: [
      { source: '专项账户', target: '启明材料', label: '项目款 320万' },
      { source: '启明材料', target: '个人账户A', label: '48小时内拆分' },
      { source: '启明材料', target: '个人账户B', label: '48小时内拆分' },
      { source: '咨询公司', target: '专项账户', label: '整额回转' },
    ],
    timeline: [
      { time: '2026-01-16', title: '首笔大额供应商付款', detail: '启明材料收款320万。', tone: 'info' },
      { time: '2026-01-17', title: '短周期拆分转出', detail: '向3个个人账户分拆转出214万。', tone: 'critical' },
      { time: '2026-03-04', title: '整额往返交易', detail: '咨询服务费在24小时内回转。', tone: 'critical' },
    ],
    evidenceTable: {
      columns: ['异常类型', '命中规则', '涉及金额', '处置建议'],
      rows: [
        ['短周期拆分', '收款后48小时内多账户转出', '¥214万', '调取履约凭证'],
        ['整额回转', '同金额24小时内往返', '¥128万', '核验交易背景'],
        ['个人账户承接', '中间账户转个人', '¥144万', '身份与授权复核'],
      ],
    },
    recommendations: [
      '对高风险账户设置付款暂停和人工审批，避免扩大资金损失。',
      '按账户路径整理证据包，形成“付款-拆分-回流”链路说明。',
      '补齐合同、发票、验收、物流和付款审批文件，交叉验证交易真实性。',
    ],
  },
  'equity-penetration': {
    key: 'equity-penetration',
    name: '股权穿透核查',
    tagline: '股权结构、实控人和关联企业关系穿透展示',
    description: '用于演示股权层级、实际控制人、疑似代持和关联企业风险的客户展示流程。',
    subjectLabel: '目标企业',
    materialLabel: '股权材料摘要',
    materialPlaceholder: '例如：目标公司名称、股东名册、历史变更、投资主体、疑似实控人等',
    sample: {
      subject: '北京鼎衡控股有限公司',
      material:
        '客户提供：目标公司拟作为投资合作方，股东层级较多，历史上曾频繁转让股权，并存在员工持股平台。',
      notes: '展示重点：最终受益人、控制路径、历史变更、关联企业风险。',
    },
    focusOptions: ['最终受益人', '疑似代持', '对外投资', '历史变更'],
    steps: ['读取股东层级', '穿透自然人与持股平台', '识别控制权与关联企业', '输出结构化风险报告'],
    metrics: [
      { label: '穿透层级', value: '5层', hint: '含2个持股平台', tone: 'warning' },
      { label: '最终受益人', value: '3人', hint: '一人疑似实控', tone: 'info' },
      { label: '关联企业', value: '18家', hint: '6家需关注', tone: 'warning' },
      { label: '控制风险', value: '68/100', hint: '建议增强披露', tone: 'warning' },
    ],
    findings: [
      {
        id: 'equity-1',
        title: '持股平台集中表决权安排',
        severity: '高',
        body: '员工持股平台通过合伙协议将表决权集中至同一自然人，实控影响高于名义持股比例。',
        evidence: '合伙企业工商信息、历史出资变更和表决权约定摘要',
        recommendation: '要求披露一致行动、表决权委托和实际控制人承诺函。',
        tone: 'critical',
      },
      {
        id: 'equity-2',
        title: '历史股权转让频率偏高',
        severity: '中',
        body: '近24个月发生4次股权转让，部分转让价格与注册资本出资比例不匹配。',
        evidence: '工商变更记录与出资比例比对',
        recommendation: '核验转让协议、价款支付凭证和税务完税资料。',
        tone: 'warning',
      },
      {
        id: 'equity-3',
        title: '关联企业存在被执行记录',
        severity: '中',
        body: '疑似实控人控制的两家关联企业存在小额被执行记录，虽金额不高但需要披露。',
        evidence: '人员任职、对外投资与执行公开信息',
        recommendation: '在投资协议中加入重大事项披露与持续更新义务。',
        tone: 'warning',
      },
    ],
    relations: [
      { source: '北京鼎衡控股', target: '鼎衡员工持股平台', label: '持股28%' },
      { source: '鼎衡员工持股平台', target: '王某', label: '执行事务合伙人' },
      { source: '北京鼎衡控股', target: '宁波启航投资', label: '持股34%' },
      { source: '王某', target: '上海承运科技', label: '疑似控制' },
    ],
    timeline: [
      { time: '2026-02-21', title: '新增员工持股平台', detail: '持股平台成为第二大股东。', tone: 'info' },
      { time: '2025-12-09', title: '股权转让价格异常', detail: '转让价格与出资比例不匹配。', tone: 'warning' },
      { time: '2025-05-18', title: '关联企业执行记录', detail: '疑似实控人关联企业出现被执行记录。', tone: 'warning' },
    ],
    evidenceTable: {
      columns: ['核查维度', '发现事项', '风险等级', '建议动作'],
      rows: [
        ['控制路径', '表决权集中至自然人王某', '高', '披露一致行动安排'],
        ['历史变更', '24个月内4次股权转让', '中', '核验价款支付'],
        ['关联企业', '2家企业有被执行记录', '中', '加入持续披露义务'],
      ],
    },
    recommendations: [
      '签约前要求目标企业提交完整股权结构图、表决权安排和实控人声明。',
      '将历史股权转让价款、税务凭证和工商档案列为尽调附件。',
      '投资协议中加入控制权变动、关联交易和重大诉讼的持续披露条款。',
    ],
  },
};

export const investigationAgentOrder = investigationAgentKeys.map((key) => investigationAgents[key]);
