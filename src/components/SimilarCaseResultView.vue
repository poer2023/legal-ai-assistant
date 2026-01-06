<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AgentResultLayout from './AgentResultLayout.vue';

const router = useRouter();

// 类案检索报告内容
const reportContent = ref({
  title: '类案检索报告',
  caseTitle: '房屋买卖合同违约纠纷',
  reportNo: 'LAJ-2024-0156',
  date: '2024年12月30日',

  sections: [
    {
      id: 'section-1',
      title: '一、案件基本情况',
      content: `本案系原告与被告因房屋买卖合同纠纷诉至法院。原告主张被告违约拒不交房，要求继续履行合同并支付违约金。被告辩称因不可抗力及政策原因导致延期交房，不构成违约。

案件争议焦点为：
1. 被告延期交房是否构成违约；
2. 原告请求继续履行合同是否应予支持；
3. 违约金的计算标准及合理性。

经检索，共发现5起高度相似案例，相似度在80%以上，现将检索结果及裁判规则分析如下。`
    },
    {
      id: 'section-2',
      title: '二、相似案例检索结果',
      content: `（一）张某与李某房屋买卖合同纠纷案
案号：(2024)京0105民初1234号
审理法院：北京市朝阳区人民法院
裁判日期：2024年3月15日
相似度：92%

基本案情：卖方无正当理由逾期6个月未交付房屋，买方诉请继续履行合同并支付违约金。

裁判要点：
1. 卖方未能证明存在不可抗力或其他免责事由，构成违约；
2. 买方有权要求继续履行合同；
3. 违约金按照合同约定的每日万分之三计算，未超过合理限度。

判决结果：判决被告在判决生效后30日内交付房屋，并支付违约金50万元。

（二）王某诉某房地产公司房屋买卖合同纠纷案
案号：(2023)沪01民终5678号
审理法院：上海市第一中级人民法院
裁判日期：2023年11月20日
相似度：88%

基本案情：开发商逾期交房超过合理期限，买方要求解除合同并返还购房款。

裁判要点：
1. 逾期交房超过合同约定的合理期限，买方有权解除合同；
2. 开发商应返还购房款并支付相应利息；
3. 买方因延期交房产生的租房等实际损失应予赔偿。

判决结果：维持原判，支持买方解除合同并返还购房款200万元及利息。

（三）赵某与某置业公司商品房买卖合同纠纷案
案号：(2024)粤0106民初2345号
审理法院：广州市天河区人民法院
裁判日期：2024年1月10日
相似度：85%

基本案情：因房屋质量问题严重影响居住，买方要求开发商承担违约责任并支付违约金。

裁判要点：
1. 房屋质量问题构成违约，开发商应承担修复义务；
2. 未及时修复影响居住使用的，应支付违约金；
3. 违约金数额应综合考虑违约程度和实际损失。

判决结果：判决开发商在3个月内完成修复，并支付违约金30万元及维修期间的租房费用。

（四）陈某诉某房产公司房屋买卖合同纠纷案
案号：(2023)浙0110民初3456号
审理法院：杭州市余杭区人民法院
裁判日期：2023年9月25日
相似度：83%

基本案情：合同条款存在歧义，双方对交房标准产生争议。

裁判要点：
1. 合同条款存在歧义的，应作出不利于提供格式条款一方的解释；
2. 开发商未充分履行告知义务，应承担相应责任；
3. 双方应本着诚信原则协商解决分歧。

判决结果：判决双方协商补充协议，开发商承担部分责任并支付补偿款15万元。

（五）刘某与某地产集团房屋买卖合同纠纷案
案号：(2023)粤0304民初4567号
审理法院：深圳市福田区人民法院
裁判日期：2023年7月18日
相似度：80%

基本案情：逾期交房未达到解除合同条件，买方要求继续履行并支付违约金。

裁判要点：
1. 逾期时间虽较长但未严重影响合同目的，不支持解除合同；
2. 买方要求继续履行合同的请求合理，应予支持；
3. 违约金应按日计算至实际交房之日。

判决结果：判决开发商继续履行合同并支付逾期交房违约金，按日万分之三计算至实际交房之日。`
    },
    {
      id: 'section-3',
      title: '三、法律依据分析',
      content: `（一）《中华人民共和国民法典》第五百七十七条
当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。

适用说明：本条是违约责任的基本规定。在房屋买卖合同中，卖方未按约定时间交付房屋，构成违约，应承担相应的违约责任。买方有权选择要求继续履行或者解除合同。

（二）《中华人民共和国民法典》第五百八十五条
当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金，也可以约定因违约产生的损失赔偿额的计算方法。约定的违约金低于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以增加；约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。

适用说明：违约金条款是房屋买卖合同的重要内容。司法实践中，一般认为违约金不超过实际损失的30%为合理范围。逾期交房的违约金通常按日计算，每日万分之一至万分之五较为常见。

（三）《最高人民法院关于审理商品房买卖合同纠纷案件适用法律若干问题的解释》第十五条
根据《民法典》第五百六十三条的规定，出卖人迟延交付房屋或者买受人迟延支付购房款，经催告后在三个月的合理期限内仍未履行，解除权人请求解除合同的，应予支持，但当事人另有约定的除外。法律没有规定或者当事人没有约定，经对方当事人催告后，解除权行使的合理期限为三个月。对方当事人没有催告的，解除权应当在解除权发生之日起一年内行使；逾期不行使的，解除权消灭。

适用说明：本条规定了商品房买卖合同的解除条件。逾期交房超过合理期限（通常为三个月）且经催告仍不履行的，买方有权解除合同。但如果逾期时间较短或未经催告，则不能轻易解除合同。`
    },
    {
      id: 'section-4',
      title: '四、裁判趋势分析',
      content: `（一）裁判结果统计
根据检索到的5个相似案例统计：
- 原告完全胜诉：3件（60%）
- 原告部分胜诉：2件（40%）
- 被告胜诉：0件（0%）

（二）裁判倾向总结
1. 支持继续履行比例高
在卖方违约但未达到严重影响合同目的的情况下，法院倾向于支持买方要求继续履行合同的请求，保护交易稳定性。

2. 违约金计算标准相对统一
法院普遍认可合同约定的违约金条款，但会对过高的违约金进行调整。逾期交房违约金通常按日计算，每日万分之一至万分之五，年化利率约3.65%至18.25%。

3. 实际损失需要举证
买方主张实际损失（如租房费用、利息损失等）的，应提供充分证据证明损失的真实性和合理性。

4. 免责事由审查严格
卖方主张不可抗力或政策原因的，法院审查较为严格，要求提供充分证据证明因果关系，且应证明已采取合理措施减少损失。

（三）影响裁判的关键因素
1. 违约时间长短：逾期时间越长，违约程度越严重，越倾向于支持买方请求；
2. 合同约定明确性：合同条款越明确，越有利于守约方主张权利；
3. 催告履行情况：买方是否履行催告义务及催告期限的长短；
4. 违约原因：卖方延期交房的具体原因，是否存在免责事由；
5. 违约金合理性：约定的违约金是否过分高于或低于实际损失。`
    },
    {
      id: 'section-5',
      title: '五、诉讼策略建议',
      content: `（一）诉讼请求建议
1. 主请求：要求被告继续履行合同，在指定期限内交付房屋；
2. 备选请求：如被告确实无法履行，可请求解除合同并返还购房款及利息；
3. 违约金请求：按照合同约定或法定标准计算违约金，建议按日万分之三计算；
4. 实际损失请求：因延期交房导致的租房费用、利息损失等实际损失。

（二）证据准备清单
1. 基础证据：
   - 房屋买卖合同原件及所有补充协议
   - 购房款支付凭证（银行转账记录、收据等）
   - 房屋交付时间的约定证据

2. 违约证据：
   - 催告函及送达证明（EMS快递单、签收记录等）
   - 被告承认延期交房的书面材料或录音证据
   - 延期交房的时间计算依据

3. 损失证据：
   - 租房合同及租金支付凭证
   - 银行贷款利息证明
   - 其他因延期交房产生的合理费用凭证

4. 答辩准备：
   - 针对被告可能提出的不可抗力抗辩，准备反驳材料
   - 针对被告可能提出的政策原因抗辩，准备相关政策文件的正确解读

（三）诉讼时机选择
1. 最佳时机：延期交房超过合同约定的交付期限后，立即发送催告函，催告期满（建议30-60日）后提起诉讼；
2. 诉讼时效：注意三年诉讼时效期间，从知道或应当知道权利被侵害之日起计算；
3. 证据保全：及时对现场情况、往来沟通记录等进行证据保全。

（四）和解谈判建议
1. 谈判筹码：
   - 强调法院支持继续履行的裁判倾向
   - 列举相似案例的判决结果
   - 计算违约金的具体数额

2. 和解方案：
   - 明确交房时间表和违约责任
   - 适当降低违约金以换取快速交房
   - 要求提供履约担保或保证金

3. 注意事项：
   - 和解协议应明确具体可执行
   - 保留诉讼权利，设置履行期限
   - 建议进行司法确认或公证`
    },
    {
      id: 'section-6',
      title: '六、风险提示',
      content: `（一）诉讼风险
1. 时效风险：应在诉讼时效期间内主张权利，避免超过三年诉讼时效；
2. 举证风险：实际损失需要充分举证，否则可能无法得到支持；
3. 违约金调整风险：如请求的违约金过高，法院可能主动调整；
4. 执行风险：胜诉后被告无履行能力或转移财产，导致判决难以执行。

（二）策略风险
1. 解除合同风险：如选择解除合同，可能面临房价上涨损失；如选择继续履行，可能面临长期等待；
2. 证据不足风险：催告程序不规范可能影响解除权的行使；
3. 诉求过高风险：请求金额过高可能增加诉讼成本和举证难度。

（三）成本预算
1. 律师费：根据诉讼标的额，按照当地律师收费标准，预估3-5万元；
2. 诉讼费：按照诉讼标的额，根据《诉讼费用交纳办法》计算；
3. 时间成本：一审程序通常6个月左右，如涉及二审需再增加3-6个月；
4. 其他费用：公证费、鉴定费、差旅费等。

（四）后续行动建议
1. 立即委托律师审查案件材料，评估胜诉可能性；
2. 完善证据材料，特别是催告函的发送和保存；
3. 及时启动诉讼程序，避免诉讼时效问题；
4. 考虑申请财产保全，防止被告转移资产；
5. 保持与被告沟通，探索和解可能性。`
    },
    {
      id: 'section-7',
      title: '七、结论',
      content: `综合以上类案检索和分析，本案具有以下特点：

1. 案件类型典型，相似案例较多，裁判规则相对明确；
2. 根据类案裁判趋势，原告胜诉可能性较大（78%的原告胜诉率）；
3. 法院倾向于支持继续履行合同，同时支持合理的违约金请求；
4. 关键在于证明被告违约事实、履行催告义务、违约金合理性。

建议原告：
1. 尽快完善证据材料，特别是催告函的送达证明；
2. 合理设定违约金请求，避免过高导致法院调整；
3. 做好诉讼和和解两手准备，根据案件进展灵活调整策略；
4. 注意诉讼时效和财产保全，保护自身合法权益。

本报告仅供参考，具体诉讼策略应结合案件实际情况，在专业律师指导下确定。`
    }
  ]
});

// 历史记录
interface HistoryState {
  sectionContents: Record<string, string>;
}
const historyStack = ref<HistoryState[]>([]);
const historyIndex = ref(-1);

const saveHistory = () => {
  const snapshot: HistoryState = {
    sectionContents: {}
  };
  reportContent.value.sections.forEach(s => {
    snapshot.sectionContents[s.id] = s.content;
  });

  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  historyStack.value.push(snapshot);
  historyIndex.value++;
};

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    const state = historyStack.value[historyIndex.value];
    if (state) restoreHistory(state);
  }
};

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    const state = historyStack.value[historyIndex.value];
    if (state) restoreHistory(state);
  }
};

const restoreHistory = (state: HistoryState) => {
  reportContent.value.sections.forEach(section => {
    const content = state.sectionContents[section.id];
    if (content !== undefined) {
      section.content = content;
    }
  });
};

const goBack = () => {
  router.back();
};

const exportResult = () => {
  alert('导出功能开发中...');
};

const addToKnowledgeBase = () => {
  alert('加入知识库功能开发中...');
};

const outlineItems = computed(() => {
  return reportContent.value.sections.map(s => ({
    id: s.id,
    title: s.title,
    level: 1
  }));
});

// 初始化历史记录
saveHistory();
</script>

<template>
  <AgentResultLayout
    title="类案检索报告"
    badge="类案检索"
    badge-class="badge-default"
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
      <!-- Page 1: Title & Section 1-2 -->
      <div class="doc-page">
        <div class="page-content">
          <!-- Report Header -->
          <div class="report-header">
            <h1 class="report-title">{{ reportContent.title }}</h1>
            <div class="report-meta">
              <p>案由：{{ reportContent.caseTitle }}</p>
              <p>报告编号：{{ reportContent.reportNo }}</p>
              <p>出具日期：{{ reportContent.date }}</p>
            </div>
          </div>

          <!-- Sections 1-2 -->
          <div
            v-for="section in reportContent.sections.slice(0, 2)"
            :key="section.id"
            class="report-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 1 页</span>
        </div>
      </div>

      <!-- Page 2: Section 3 -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="section in reportContent.sections.slice(2, 3)"
            :key="section.id"
            class="report-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 2 页</span>
        </div>
      </div>

      <!-- Page 3: Section 4 -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="section in reportContent.sections.slice(3, 4)"
            :key="section.id"
            class="report-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 3 页</span>
        </div>
      </div>

      <!-- Page 4: Section 5-6 -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="section in reportContent.sections.slice(4, 6)"
            :key="section.id"
            class="report-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 4 页</span>
        </div>
      </div>

      <!-- Page 5: Section 7 -->
      <div class="doc-page">
        <div class="page-content">
          <div
            v-for="section in reportContent.sections.slice(6)"
            :key="section.id"
            class="report-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <pre class="section-text">{{ section.content }}</pre>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 5 页</span>
        </div>
      </div>
    </div>
  </AgentResultLayout>
</template>

<style scoped>
/* Page Layout Styles */
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
  padding: 80px 96px;
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
  border-top: 1px solid #f3f4f6;
  margin-top: auto;
}

.page-number {
  font-size: 12px;
  color: #9ca3af;
}

/* Report Header */
.report-header {
  text-align: center;
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.report-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 20px 0;
}

.report-meta {
  font-size: 14px;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.report-meta p {
  margin: 0;
}

/* Report Sections */
.report-section {
  margin-bottom: 36px;
  scroll-margin-top: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.section-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.9;
  text-align: justify;
}

.section-text {
  font-family: inherit;
  white-space: pre-wrap;
  margin: 0;
}
</style>
