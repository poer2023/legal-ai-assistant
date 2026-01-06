<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AgentResultLayout from './AgentResultLayout.vue';

const router = useRouter();

// --- 法律研究报告完整内容 ---
const researchContent = ref({
  title: '人工智能生成内容的著作权法律问题研究',
  subtitle: '——以ChatGPT等生成式人工智能为例',
  author: '法律研究院 研究员',
  date: '2024年12月30日',
  keywords: ['人工智能', 'AIGC', '著作权', '生成式AI', '法律保护'],

  sections: [
    {
      id: 'section-1',
      title: '摘要',
      content: `随着以ChatGPT、Midjourney为代表的生成式人工智能技术的快速发展，AI生成内容（AIGC）在文学、艺术、音乐等领域的应用日益广泛。这一技术进步在为创作带来便利的同时，也引发了著作权法律层面的一系列新问题：AI生成内容是否构成作品？其权利归属如何认定？现行著作权法律制度能否有效应对这些挑战？

本研究报告系统梳理了国内外关于AI生成内容著作权问题的立法、司法实践和学术观点，深入分析了AI生成内容的独创性认定标准、权利主体界定、侵权责任承担等核心法律问题。研究发现，现行著作权法律制度在应对AIGC时面临"独创性认定困难"、"主体资格缺位"、"侵权责任模糊"三大挑战。

报告提出，应当在坚持"人类中心主义"著作权法律理念的基础上，通过"投资激励理论"构建AIGC特殊保护机制，明确AI开发者、使用者、投资者等主体的权利义务关系，完善侵权责任认定标准，以实现创作激励与公共利益的平衡。`
    },
    {
      id: 'section-2',
      title: '一、引言',
      content: `（一）研究背景

2022年以来，以ChatGPT为代表的大型语言模型和以Midjourney为代表的文生图模型相继问世，标志着生成式人工智能进入爆发式发展阶段。据统计，截至2024年，全球AIGC市场规模已达到150亿美元，预计2030年将突破1万亿美元。AI生成的文章、图像、音乐、视频等内容在商业应用、艺术创作、学术研究等领域发挥着越来越重要的作用。

然而，AIGC的快速发展也带来了前所未有的法律挑战。2023年的"AI孙燕姿"事件引发了对AI生成音乐作品著作权的广泛讨论；北京互联网法院审理的"菲林律所诉百度公司"案成为我国首例涉及AI生成文章著作权的案件。这些案例凸显了现行著作权法律制度在应对AIGC时的不适应性。

（二）研究意义

本研究的理论意义在于：第一，厘清AI生成内容在著作权法律框架下的法律定位，丰富著作权客体理论；第二，探讨"独创性"标准在AI时代的适用问题，为著作权法理论创新提供新视角；第三，在人机协作创作常态化背景下，重新审视著作权主体理论。

实践意义在于：第一，为司法实践处理AIGC相关纠纷提供理论支撑和裁判思路；第二，为完善我国著作权法律制度、回应技术发展提出政策建议；第三，为AIGC产业健康发展提供法律保障，平衡创新激励与公共利益。

（三）研究方法

本研究综合运用文献研究法、比较分析法、案例分析法、实证分析法等方法。通过系统梳理国内外相关立法、司法判例和学术文献，分析AIGC著作权问题的理论争议和实践困境；通过比较美国、欧盟、日本等国家和地区的立法和司法实践，总结域外经验和启示；通过对典型案例的深入剖析，揭示法律适用中的难点和问题；通过实证调研，了解AIGC产业发展现状和法律需求。`
    },
    {
      id: 'section-3',
      title: '二、AI生成内容的独创性认定问题',
      content: `（一）传统独创性标准的局限性

根据《著作权法》第3条的规定，作品应当具备独创性。传统理论认为，独创性包含两个要素：一是独立完成，二是表达具有创造性。然而,这一标准在AI生成内容面前遭遇适用困境。

首先，AI生成内容的"独立性"存疑。AI模型的训练依赖于海量数据，生成过程是对训练数据的统计学习和概率预测，难以认定其具有真正意义上的"独立创作"。其次，AI生成内容的"创造性"判断困难。由于缺乏人类的情感、思想和个性表达，AI生成内容往往呈现"技术完美但缺乏灵魂"的特征。

（二）比较法视野下的认定标准

美国版权局在《Compendium of U.S. Copyright Office Practices》中明确指出，完全由AI生成的内容不受版权保护，因为版权法要求作品必须是"人类作者"创作的。英国《版权、外观设计和专利法》第9条第3款规定，对于计算机生成作品，作者为"为创作该作品进行必要安排的人"。

日本在2019年修订的《著作权法》中引入"思想或感情"要件，强调作品必须是"思想或感情的创作性表达"，这在一定程度上排除了纯AI生成内容的可版权性。欧盟《数据库指令》和《版权指令》也坚持"人类作者"原则，但为数据库制作者提供特殊权利保护。

（三）我国司法实践的探索

在"菲林律所诉百度公司"案中，北京互联网法院认为，涉案AI生成文章具备"外在表现形式"和"一定独创性表达"，但最终以"缺乏人的创造性智力投入"为由，认定不构成作品。

在"腾讯诉盈讯科技"案中，深圳市南山区人民法院认为，Dreamwriter生成的证券分析报告虽由软件自动生成，但由于腾讯公司对软件进行了设计、选择和安排，且对生成内容进行了筛选和编辑，可以认定为腾讯公司的作品。

这两个案例体现了司法实践的不同取向：前者强调"人类作者"要求，后者注重"人类智力投入"。这种分歧反映了现行法律框架在应对AI技术时的不确定性。`
    },
    {
      id: 'section-4',
      title: '三、AI生成内容的权利归属问题',
      content: `（一）权利主体的竞争格局

在AIGC的生产链条中，存在多个利益相关方：AI开发者（如OpenAI）、AI使用者（提示词输入者）、训练数据提供者、计算资源提供者等。各方对AI生成内容的权利诉求存在冲突。

AI开发者主张，其投入巨额资金研发模型，应当享有生成内容的权利。使用者主张,其通过创造性提示词引导AI生成特定内容，应被视为共同作者。训练数据提供者则认为，AI生成内容部分来源于其提供的数据，应当享有相应权益。

（二）"投资激励理论"的引入

针对上述争议,有学者提出引入"投资激励理论"。该理论认为，著作权保护的目的不仅在于激励创作，还包括激励投资。对于需要大量投资但创作性较弱的智力成果，可以给予特殊保护。

英国对"计算机生成作品"的处理体现了这一理念：将"为创作作品进行必要安排的人"认定为作者，实质上是对投资者的激励。这为AIGC的权利配置提供了新思路。

（三）权利归属的规则构建

本报告认为，应当建立分层次的权利归属规则：

第一，对于完全由AI自主生成的内容，不赋予著作权，但可以通过邻接权、反不正当竞争法等给予有限保护；

第二，对于人机协作生成的内容，根据人类的智力投入程度判断：若使用者的提示词、选择、编辑等行为达到独创性要求，可认定为使用者的作品；

第三，在合同约定优先的原则下，允许AI开发者和使用者通过协议分配权利。`
    },
    {
      id: 'section-5',
      title: '四、AI生成内容的侵权责任问题',
      content: `（一）训练数据使用的侵权风险

AI模型的训练需要大量文本、图像等数据，这些数据往往受著作权保护。未经许可使用他人作品进行训练是否构成侵权，是当前争议的焦点。

在"Getty Images诉Stability AI"案中，原告指控被告在未经授权的情况下使用其1200万张图片训练AI模型。类似案件在美国、英国等地均有发生，反映了训练数据使用的普遍性侵权风险。

（二）生成内容侵权的责任承担

AI生成内容可能侵犯他人著作权、肖像权、名誉权等权利。"AI孙燕姿"事件即是典型例子：AI学习并模仿特定歌手的声音特征，生成高仿真演唱，引发侵权争议。

责任主体的认定是难点：是AI开发者、使用者,还是平台运营者？参考《民法典》第1195条关于网络服务提供者责任的规定，应当建立"通知-删除"规则和过错责任原则。

（三）合理使用抗辩的适用

部分AI开发者主张，训练数据的使用属于"转换性使用"，符合合理使用的要求。然而，这一主张在司法实践中尚未获得普遍认可。

日本《著作权法》第30条之4规定了"信息分析例外"，允许为信息分析目的使用他人作品。这为训练数据的合法使用提供了路径，值得借鉴。`
    },
    {
      id: 'section-6',
      title: '五、完善我国AIGC著作权保护的建议',
      content: `（一）立法层面的完善

1. 明确AI生成内容的法律定位。建议在《著作权法》修订时，明确规定"作品应当由自然人创作"，同时为AI生成内容提供邻接权或特殊权利保护。

2. 建立训练数据使用的特殊规则。参考日本立法经验，在《著作权法》中增设"机器学习例外"条款，允许为AI训练目的合理使用他人作品，但应设置"商业化使用需获得许可"等限制。

3. 细化侵权责任认定标准。明确AI开发者、使用者、平台等各方的注意义务和责任分担规则。

（二）司法层面的应对

1. 统一裁判标准。通过发布指导性案例、制定司法解释等方式，统一AIGC著作权纠纷的裁判规则。

2. 加强技术事实查明。建立AI技术专家辅助人制度，准确认定AI生成过程中的人类智力投入程度。

3. 探索新型救济方式。对于AIGC侵权，可以考虑采用禁令、过滤算法、补偿金等多元化救济手段。

（三）行业自律与技术治理

1. 推动行业协会制定AIGC伦理准则和行业标准，规范训练数据的获取和使用。

2. 鼓励AI开发者采用"可解释AI"技术，提高生成过程的透明度。

3. 建立AIGC内容标识制度，要求标注内容的AI生成属性，保障公众知情权。`
    },
    {
      id: 'section-7',
      title: '六、结论',
      content: `AI生成内容的著作权问题是技术发展对法律制度提出的重大挑战。本研究认为，应当在坚持"人类作者"原则的前提下，通过引入"投资激励理论"、完善邻接权制度、建立特殊保护规则等方式，为AIGC提供适度保护。同时，应当平衡创新激励与公共利益，防止过度保护阻碍技术进步和文化繁荣。

未来的法律制度设计，应当充分考虑AI技术的发展趋势，既要回应现实问题，又要为未来留有空间。通过立法、司法、行业自律的协同治理，构建适应人工智能时代的著作权法律体系，是当前亟待解决的重要课题。

本研究的局限性在于，AI技术仍在快速发展，法律实践尚在探索阶段，许多问题的答案还不够明确。未来研究可以进一步关注AI人格理论、数据权属、算法责任等前沿问题，为AIGC的法律规制提供更加系统和深入的理论支撑。`
    }
  ],

  references: [
    '1. 吴汉东.人工智能时代的制度安排与法律规制[J].法律科学,2017(5):128-136.',
    '2. 梁志文.论人工智能创造物的法律保护[J].法律科学,2017(5):147-155.',
    '3. 王迁.论人工智能生成的内容在著作权法中的定性[J].法律科学,2017(5):137-146.',
    '4. 熊琦.人工智能生成内容的著作权问题研究[J].知识产权,2022(1):3-14.',
    '5. U.S. Copyright Office. Compendium of U.S. Copyright Office Practices (3rd ed. 2021).',
    '6. Copyright, Designs and Patents Act 1988 (UK).',
    '7. 北京互联网法院(2019)京0491民初16607号民事判决书.',
    '8. 深圳市南山区人民法院(2019)粤0305民初14010号民事判决书.'
  ]
});

// --- State ---
interface HistoryState {
  sectionContents: Record<string, string>;
}
const historyStack = ref<HistoryState[]>([]);
const historyIndex = ref(-1);

// 保存当前状态到历史记录
const saveHistory = () => {
  const snapshot: HistoryState = {
    sectionContents: {}
  };
  researchContent.value.sections.forEach(s => {
    snapshot.sectionContents[s.id] = s.content;
  });

  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  historyStack.value.push(snapshot);
  historyIndex.value++;
};

// 撤销/重做计算属性
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
  researchContent.value.sections.forEach(section => {
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
  return researchContent.value.sections.map(s => ({
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
    title="AI生成内容著作权研究"
    badge="法律研究报告"
    badge-class="badge-success"
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
      <!-- Page 1: Title & Abstract -->
      <div class="doc-page">
        <div class="page-content">
          <!-- Research Header -->
          <div class="research-header">
            <h1 class="research-title">{{ researchContent.title }}</h1>
            <h2 class="research-subtitle">{{ researchContent.subtitle }}</h2>
            <div class="research-meta">
              <p class="author">{{ researchContent.author }}</p>
              <p class="date">{{ researchContent.date }}</p>
            </div>
            <div class="keywords">
              <span class="keyword-label">关键词：</span>
              <span class="keyword-list">{{ researchContent.keywords.join('；') }}</span>
            </div>
          </div>

          <!-- First Section (Abstract) -->
          <div
            v-for="section in researchContent.sections.slice(0, 1)"
            :key="section.id"
            class="research-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <p class="section-text">{{ section.content }}</p>
            </div>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 1 页</span>
        </div>
      </div>

      <!-- Page 2-N: Content Sections -->
      <div
        v-for="(pageSection, pageIdx) in [
          researchContent.sections.slice(1, 3),
          researchContent.sections.slice(3, 5),
          researchContent.sections.slice(5, 7)
        ]"
        :key="`page-${pageIdx}`"
        class="doc-page"
      >
        <div class="page-content">
          <div
            v-for="section in pageSection"
            :key="section.id"
            class="research-section"
            :id="section.id"
          >
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="section-content">
              <p class="section-text">{{ section.content }}</p>
            </div>
          </div>

          <!-- References on last page -->
          <div v-if="pageIdx === 2" class="references-section">
            <h2 class="references-title">参考文献</h2>
            <ol class="references-list">
              <li
                v-for="(ref, idx) in researchContent.references"
                :key="idx"
                class="reference-item"
              >
                {{ ref }}
              </li>
            </ol>
          </div>
        </div>
        <div class="page-footer">
          <span class="page-number">第 {{ pageIdx + 2 }} 页</span>
        </div>
      </div>
    </div>
  </AgentResultLayout>
</template>

<style scoped>
/* Custom Badge for warning style */
:deep(.badge-success) {
  background: #f0fdf4;
  color: #16a34a;
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

/* Research Header */
.research-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.research-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.research-subtitle {
  font-size: 18px;
  color: #4b5563;
  margin: 0 0 24px 0;
  font-weight: 400;
}

.research-meta {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
  color: #6b7280;
  font-size: 14px;
}

.keywords {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  display: inline-block;
  text-align: left;
}

.keyword-label {
  font-weight: 600;
  color: #374151;
}

.keyword-list {
  color: #4b5563;
}

/* Research Sections */
.research-section {
  margin-bottom: 24px;
  scroll-margin-top: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.section-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
  text-align: justify;
}

.section-text {
  white-space: pre-wrap;
  margin: 0;
}

/* References */
.references-section {
  margin-top: auto; /* Push to bottom if needed */
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.references-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
}

.references-list {
  padding-left: 0;
  list-style: none;
}

.reference-item {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
  line-height: 1.5;
}
</style>
