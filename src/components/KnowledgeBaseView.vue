<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Check,
  ChevronDown,
  Copy,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  Trash2,
  X,
} from 'lucide-vue-next';

type FileKind = 'pdf' | 'word' | 'markdown' | 'sheet' | 'slide';
type LibraryScope = 'team' | 'personal' | 'hidden' | 'group';
type GroupLibrary = {
  id: string;
  name: string;
  count: number;
  folders: string[];
  intro?: string;
  memberIds?: string[];
};
type GroupMember = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  isCurrent?: boolean;
};

const folders = ['企业并购', '知识产权', '未成年儿童保护', '民政部', '法律类案', '123', '测试'];

const initialGroupLibraries: GroupLibrary[] = [
  { id: 'corporate', name: '公司业务组', count: 6, folders: ['并购项目', '股权激励', '投融资', '治理合规'] },
  { id: 'dispute', name: '争议解决组', count: 5, folders: ['类案检索', '证据材料', '诉讼策略', '执行线索'] },
  { id: 'compliance', name: '合规风控组', count: 4, folders: ['数据合规', '广告合规', '内控制度', '监管问询'] },
  { id: 'labor', name: '劳动用工组', count: 3, folders: ['员工手册', '竞业限制', '用工争议', '社保福利'] },
];
const groupLibraries = ref<GroupLibrary[]>(initialGroupLibraries);
const defaultGroupLibrary = initialGroupLibraries[0]!;

const files: Array<{
  id: number;
  title: string;
  size: string;
  words?: string;
  owner: string;
  kind: FileKind;
  compactActions?: boolean;
}> = [
  { id: 1, title: '【企业AI培训销售（ToB）_上海 20-35K】宗旭浩 10年以上.pdf', size: '188.93KB', owner: '创建者', kind: 'pdf', compactActions: true },
  { id: 2, title: '解读报告.pdf', size: '254.48KB', owner: '创建者', kind: 'pdf', compactActions: true },
  { id: 3, title: '朱双林简历.pdf', size: '4.48MB', owner: '创建者', kind: 'pdf', compactActions: true },
  { id: 4, title: '文件-400MB.docx', size: '400.00MB', owner: '朱双林2', kind: 'word', compactActions: true },
  { id: 5, title: 'test_large_501mb.docx', size: '57.61MB', words: '752.40万字', owner: '朱双林2', kind: 'word', compactActions: true },
  { id: 6, title: '信息系统安全等级保护测评（等保2.0）项目_(1).docx', size: '60.85KB', words: '2.81万字', owner: '创建者', kind: 'word', compactActions: true },
  { id: 7, title: '安全生产许可证示例.pdf', size: '2.93KB', words: '0.01万字', owner: '创建者', kind: 'pdf', compactActions: true },
  { id: 8, title: '安全生产许可证示例.pdf', size: '2.93KB', words: '0.01万字', owner: '创建者', kind: 'pdf', compactActions: true },
  { id: 9, title: '嗯，.md', size: '354B', words: '0.01万字', owner: '创建者', kind: 'markdown', compactActions: true },
  { id: 10, title: '现在语音输入的话.md', size: '276B', words: '0.01万字', owner: '老李', kind: 'markdown', compactActions: true },
  { id: 11, title: '示例表格_扩展内容.xlsx', size: '5.31KB', words: '0.02万字', owner: '创建者', kind: 'sheet', compactActions: true },
  { id: 12, title: '示例演示_约200字.pptx', size: '28.94KB', words: '0.01万字', owner: '创建者', kind: 'slide', compactActions: true },
  { id: 13, title: '1111222.docx', size: '36.25KB', words: '0.01万字', owner: '创建者', kind: 'word', compactActions: true },
  { id: 14, title: '示例演示_200字.pptx', size: '28.96KB', words: '0.01万字', owner: '创建者', kind: 'slide', compactActions: true },
  { id: 15, title: 'die religionsgesprache der reformationszeit -- herausgegeben von gerhard muller.pdf', size: '9.36MB', words: '15.50万字', owner: '1111', kind: 'pdf', compactActions: true },
];

const selectedLibraryScope = ref<LibraryScope>('team');
const selectedGroupId = ref(defaultGroupLibrary.id);
const isCreateGroupModalOpen = ref(false);
const newGroupName = ref('');
const newGroupIntro = ref('');
const memberSearchKeyword = ref('');
const selectedMemberIds = ref<Set<string>>(new Set(['me']));

const groupMembers: GroupMember[] = [
  { id: 'me', name: '188****2830（我）', phone: '188****2830', avatar: '1', isCurrent: true },
  { id: 'creator', name: '创建者', phone: '18836821691', avatar: '创' },
  { id: 'u585697', name: '585697', phone: '18627585697', avatar: '5' },
  { id: 'u700187', name: '700187', phone: '18917001878', avatar: '7' },
  { id: 'laoli', name: '老李', phone: '18930126633', avatar: '老' },
  { id: 'zhushuanglin2', name: '朱双林2', phone: '13290041843', avatar: '朱' },
  { id: 'baozi', name: '包子', phone: '15021202690', avatar: '包' },
  { id: 'jieyu', name: '洁玉', phone: '15755569042', avatar: '洁' },
  { id: 'u1111', name: '1111', phone: '18917001801', avatar: '1' },
  { id: 'heili', name: '黑莉', phone: '18108127692', avatar: '黑' },
];

const libraryModeCopy: Record<LibraryScope, {
  name: string;
  searchPlaceholder: string;
  composerPlaceholder: string;
}> = {
  team: {
    name: '团队知识库',
    searchPlaceholder: '搜索团队文件名、文件夹名称',
    composerPlaceholder: '对团队知识库进行提问',
  },
  personal: {
    name: '个人知识库',
    searchPlaceholder: '搜索个人文件名、文件夹名称',
    composerPlaceholder: '对个人知识库进行提问',
  },
  hidden: {
    name: '隐藏知识库',
    searchPlaceholder: '搜索隐藏文件名、文件夹名称',
    composerPlaceholder: '对隐藏知识库进行提问',
  },
  group: {
    name: '小组知识库',
    searchPlaceholder: '搜索小组文件名、文件夹名称',
    composerPlaceholder: '对小组知识库进行提问',
  },
};

const libraryScopeTabs = computed(() => [
  { key: 'team' as const, name: libraryModeCopy.team.name, count: files.length },
  { key: 'personal' as const, name: libraryModeCopy.personal.name, count: 8 },
  { key: 'hidden' as const, name: libraryModeCopy.hidden.name, count: 3 },
  {
    key: 'group' as const,
    name: libraryModeCopy.group.name,
    count: groupLibraries.value.reduce((total, group) => total + group.count, 0),
  },
]);

const activeGroup = computed(() =>
  groupLibraries.value.find((group) => group.id === selectedGroupId.value) ?? defaultGroupLibrary
);

const activeLibraryCopy = computed(() => libraryModeCopy[selectedLibraryScope.value]);
const visibleFolders = computed(() => {
  if (selectedLibraryScope.value === 'group') return activeGroup.value.folders;
  if (selectedLibraryScope.value === 'personal') return ['我的合同库', '个人类案', '常用法规', '写作素材', '收藏文件'];
  if (selectedLibraryScope.value === 'hidden') return ['保密项目', '敏感底稿', '内部审批'];
  return folders;
});
const visibleFiles = computed(() => {
  if (selectedLibraryScope.value === 'personal') return files.slice(0, 8);
  if (selectedLibraryScope.value === 'hidden') return files.slice(2, 5);
  if (selectedLibraryScope.value === 'group') {
    const groupIndex = Math.max(0, groupLibraries.value.findIndex((group) => group.id === activeGroup.value.id));
    const start = (groupIndex * 3) % files.length;
    return files.slice(start, start + activeGroup.value.count);
  }
  return files;
});
const searchPlaceholder = computed(() =>
  selectedLibraryScope.value === 'group'
    ? `搜索${activeGroup.value.name}文件名、文件夹名称`
    : activeLibraryCopy.value.searchPlaceholder
);
const composerPlaceholder = computed(() =>
  selectedLibraryScope.value === 'group'
    ? `对${activeGroup.value.name}知识库进行提问`
    : activeLibraryCopy.value.composerPlaceholder
);

const setLibraryScope = (scope: LibraryScope) => {
  selectedLibraryScope.value = scope;
};

const groupNameCount = computed(() => newGroupName.value.length);
const groupIntroCount = computed(() => newGroupIntro.value.length);
const selectedMemberCount = computed(() => selectedMemberIds.value.size);
const canCreateGroup = computed(() => newGroupName.value.trim().length > 0 && selectedMemberCount.value >= 2);
const filteredGroupMembers = computed(() => {
  const keyword = memberSearchKeyword.value.trim().toLowerCase();
  if (!keyword) return groupMembers;
  return groupMembers.filter((member) =>
    [member.name, member.phone].join(' ').toLowerCase().includes(keyword),
  );
});

const openCreateGroupModal = () => {
  newGroupName.value = '';
  newGroupIntro.value = '';
  memberSearchKeyword.value = '';
  selectedMemberIds.value = new Set(['me']);
  isCreateGroupModalOpen.value = true;
};

const closeCreateGroupModal = () => {
  isCreateGroupModalOpen.value = false;
};

const toggleGroupMember = (member: GroupMember) => {
  if (member.isCurrent) return;
  const nextSelected = new Set(selectedMemberIds.value);
  if (nextSelected.has(member.id)) {
    nextSelected.delete(member.id);
  } else {
    nextSelected.add(member.id);
  }
  selectedMemberIds.value = nextSelected;
};

const createGroup = () => {
  if (!canCreateGroup.value) return;
  const trimmedName = newGroupName.value.trim();
  const id = `group-${Date.now()}`;
  groupLibraries.value = [
    ...groupLibraries.value,
    {
      id,
      name: trimmedName,
      count: 0,
      folders: ['共享文件', '项目资料', '协作底稿'],
      intro: newGroupIntro.value.trim(),
      memberIds: Array.from(selectedMemberIds.value),
    },
  ];
  selectedLibraryScope.value = 'group';
  selectedGroupId.value = id;
  closeCreateGroupModal();
};

const kindLabel: Record<FileKind, string> = {
  pdf: 'PDF',
  word: 'W',
  markdown: '',
  sheet: 'X',
  slide: 'P',
};

const isReferenceDrawerOpen = ref(false);

const referenceSources = [
  {
    id: 1,
    title: '安全生产许可证示例.pdf',
    excerpt: '该文件为中建华南工程有限公司的安全生产许可证信息，许可范围为建筑施工，由广东省住房和城乡建设厅于2022年8月15日核发。',
  },
  {
    id: 2,
    title: '安全生产许可证示例.pdf',
    excerpt: '该文件为中建华南工程有限公司的安全生产许可证信息，许可范围为建筑施工，有效期至2025年8月14日，当前状态显示已过期。',
  },
];
</script>

<template>
  <div class="knowledge-page" :class="{ 'with-source-drawer': isReferenceDrawerOpen }">
    <section class="library-section">
      <div class="library-body">
        <div class="library-switcher">
          <nav class="library-tabs" aria-label="知识库类型">
            <button
              v-for="tab in libraryScopeTabs"
              :key="tab.key"
              class="library-tab"
              :class="{ active: selectedLibraryScope === tab.key }"
              type="button"
              @click="setLibraryScope(tab.key)"
            >
              <span>{{ tab.name }}</span>
              <strong>{{ tab.count }}</strong>
            </button>
          </nav>

          <nav v-if="selectedLibraryScope === 'group'" class="group-tabs" aria-label="小组知识库">
            <button
              v-for="group in groupLibraries"
              :key="group.id"
              class="group-tab"
              :class="{ active: selectedGroupId === group.id }"
              type="button"
              @click="selectedGroupId = group.id"
            >
              <span>{{ group.name }}</span>
              <strong>{{ group.count }}</strong>
            </button>
            <button class="group-create-tab" type="button" @click="openCreateGroupModal">
              <Plus :size="14" />
              <span>新建小组</span>
            </button>
          </nav>
        </div>

        <div class="search-row">
          <label class="library-search">
            <span class="search-icon-shell">
              <Search :size="19" />
            </span>
            <input type="text" :placeholder="searchPlaceholder" />
            <button class="search-button">搜索</button>
          </label>
          <button class="add-button">
            <Plus :size="18" />
            <span>添加文件</span>
            <ChevronDown :size="16" />
          </button>
        </div>

        <div class="folder-row">
          <button v-for="folder in visibleFolders" :key="folder" class="folder-card">
            <span class="folder-icon" aria-hidden="true"></span>
            <span>{{ folder }}</span>
          </button>
        </div>

        <div class="file-list">
          <article v-for="file in visibleFiles" :key="file.id" class="file-row">
            <span class="file-type" :class="`file-type-${file.kind}`">{{ kindLabel[file.kind] }}</span>
            <h3>{{ file.title }}</h3>
            <div class="file-meta">
              <span>{{ file.size }}</span>
              <span v-if="file.words">{{ file.words }}</span>
              <span>{{ file.owner }}</span>
            </div>
            <div class="file-actions">
              <button v-if="file.compactActions" aria-label="查看文件">
                <Search :size="19" />
              </button>
              <button aria-label="更多操作">
                <MoreHorizontal :size="20" />
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <div class="column-divider" aria-hidden="true"></div>

    <section class="answer-panel">
      <div class="answer-scroll">
        <div class="user-message">
          <div class="question-bubble">
            <p>安全生产许可证示例内容是什么</p>
            <div class="question-actions">
              <button><Copy :size="13" />复制</button>
              <button><Trash2 :size="13" />删除</button>
            </div>
          </div>
        </div>

        <article class="answer-card mock-answer-card">
          <header class="answer-card-header">
            <button class="answer-status-button">
              已完成回答
              <ChevronDown :size="14" />
            </button>
            <button
              class="reference-button"
              :class="{ active: isReferenceDrawerOpen }"
              type="button"
              @click="isReferenceDrawerOpen = !isReferenceDrawerOpen"
            >
              <Share2 :size="14" />
              参考来源
              <span>›</span>
            </button>
          </header>

          <div class="answer-content mock-answer-content">
            <div class="reasoning-timeline">
              <div class="timeline-node">
                <p>
                  用户想了解安全生产许可证的具体内容示例，需要查找相关文件中记载的标准内容或模板信息。我将从知识库中检索与安全生产许可证相关的文档元信息，并提取其中可能包含的正文片段，以获取实际内容示例。
                </p>
                <div class="tool-step">
                  <strong>查询文件信息</strong>
                  <span>安全生产许可证 示例内容</span>
                  <small>已搜索到 2 篇知识库文档</small>
                </div>
                <div class="tool-step">
                  <strong>知识库搜索</strong>
                  <span>安全生产许可证 包含哪些内容</span>
                  <small>已读取到 0 个知识点</small>
                </div>
                <div class="tool-step">
                  <strong>知识库搜索</strong>
                  <span>安全生产许可证 样本信息</span>
                  <small>已读取到 0 个知识点</small>
                </div>
              </div>

              <div class="timeline-node">
                <p>已获取安全生产许可证的示例文件信息，包含签发单位、许可范围、有效期及状态等具体内容，但用户需求为“示例内容”，当前结果即为实际样本，无需进一步检索。</p>
              </div>

              <div class="timeline-node">
                <p>正在整理搜索到的参考资料。在对上述资料进行分析筛选后，我挑选出了与问题最相关的 2 条重要参考来源。下面我就结合这些内容，来正式回答用户的问题。</p>
              </div>

              <div class="timeline-node last">
                <p>
                  深度思考<br />
                  好的，用户问的是“安全生产许可证示例内容是什么”。看起来用户可能是在办理相关业务，或者在学习相关法规，需要了解一个具体的许可证长什么样，里面都会包含哪些关键信息。用户可能不只是想要一个简单的项目列表，而是希望理解每个项目的含义和重要性，这样他才能在实际中应用这些知识。
                </p>
              </div>
            </div>

            <p>
              嗯，用户提供的资料里有两份文件，内容基本一致，都是关于中建华南工程有限公司的安全生产许可证。从这些资料来看，许可证的核心信息包括企业名称、许可范围、发证机关、许可证编号、有效期和当前状态。不过，当前日期是2026年4月27日，而许可证的有效期到2025年8月14日，所以状态显示“已过期”，这个信息很重要，因为它揭示了许可证的动态性和时效性。
            </p>
            <p>
              用户可能没有明确说出来的深层需求是：他不仅想知道许可证上有什么，还想知道这些内容为什么重要，以及在实际中如何判断和使用这些信息。比如，他看到“已过期”可能会疑惑这意味着什么，或者想知道编号的规则有什么讲究。
            </p>
            <p>
              所以，我的回答不能只是机械地罗列文件中的条目。我要把这些信息组织成一个有逻辑、有深度的解释。我可以从回答这个问题开始：一份安全生产许可证的示例内容到底是什么？然后，我要解释这些内容背后的逻辑和实际意义，比如每个字段的作用，以及像“已过期”这样的状态对企业的实际影响。
            </p>

            <p>
              一份《安全生产许可证》的核心内容，是证明企业具备法定安全生产条件、允许其在特定范围内开展生产经营活动的法定合规凭证。它并非一份简单的证书，而是一个包含多重关键信息、具有明确法律效力和时效性的文件系统 <span class="bubble">1</span> <span class="bubble">2</span>。
            </p>
            <p>
              以下，我将以您提供的“中建华南工程有限公司”的许可证信息为例，深入拆解其典型内容构成、各要素的实际意义，并解释如何解读其状态。
            </p>

            <h3>一、许可证的核心信息构成与解读</h3>
            <p>基于示例文件，一份标准的安全生产许可证通常包含以下六个关键维度，每个维度都承载着特定的法律和管理意义：</p>

            <p class="numbered-title">1. 持证主体（企业名称）</p>
            <ul>
              <li><strong>内容示例：</strong>中建华南工程有限公司 <span class="bubble">1</span> <span class="bubble">2</span>。</li>
              <li><strong>深层意义：</strong>这是法律责任的直接承担者。许可证与工商营业执照上的名称必须完全一致，确保监管的精准指向。任何以该企业名义从事的生产活动，其安全责任均由此主体承担。</li>
            </ul>

            <p class="numbered-title">2. 许可范围</p>
            <ul>
              <li><strong>内容示例：</strong>建筑施工 <span class="bubble">1</span> <span class="bubble">2</span>。</li>
              <li><strong>深层意义：</strong>这是对企业安全生产资质的精准限定，它表明该企业仅被确认为“建筑施工”领域满足了安全条件。如果该企业跨界从事矿山、危险化学品生产等其他高危行业，即使持有此证也属无证非法经营。这体现了安全生产管理的专业性和细分性。</li>
            </ul>

            <p class="numbered-title">3. 发证机关</p>
            <ul>
              <li><strong>内容示例：</strong>广东省住房和城乡建设厅 <span class="bubble">1</span> <span class="bubble">2</span>。</li>
              <li><strong>深层意义：</strong>体现了行业归口管理和属地监管原则。在中国，不同行业的安全生产许可证由相应的行业主管部门颁发，如建筑施工由住建部门负责，危险化学品由应急管理部门负责。这明确了日常监管和行政处罚的权责主体。</li>
            </ul>

            <p class="numbered-title">4. 许可证编号</p>
            <ul>
              <li><strong>内容示例：</strong>（粤）JZ安许证字[2022]009876 <span class="bubble">1</span> <span class="bubble">2</span>。</li>
              <li>
                <strong>深层意义：</strong>这是许可证的“身份证号”，具有唯一性和可追溯性。其编码通常包含：
                <ul>
                  <li>（粤）：代表省份（广东省）。</li>
                  <li>JZ：常代表行业类别（如“JZ”可能指“建筑”）。</li>
                  <li>安许证字：即“安全生产许可证字”。</li>
                  <li>[2022]：代表批准发证的年份。</li>
                  <li>009876：是该年度内的序列号。</li>
                </ul>
              </li>
              <li>通过编号，监管部门和合作方可以快速识别其合法性和基本信息。</li>
            </ul>

            <p class="numbered-title">5. 有效期</p>
            <ul>
              <li><strong>内容示例：</strong>2022年8月15日至2025年8月14日 <span class="bubble">1</span> <span class="bubble">2</span>。</li>
              <li><strong>深层意义：</strong>这是证书的“生命周期”，强制企业进行周期性安全管理复盘。安全生产条件不是一劳永逸的，企业的人员、设备、管理体系会发生变化。设置有效期（通常为3年），是为了驱动企业在到期前重新接受审查，确保其持续符合安全标准。</li>
            </ul>

            <p class="numbered-title">6. 当前状态（基于示例的延伸分析）</p>
            <ul>
              <li><strong>内容示例：</strong>文件明确指出“当前状态显示已过期” <span class="bubble">1</span> <span class="bubble">2</span>。</li>
              <li><strong>深层意义：</strong>这是最具动态和风险警示意义的信息。结合当前日期（2026年4月27日），该证书有效期（2025年8月14日）已过。这意味着：</li>
              <li>法律上，该企业自2025年8月15日起，已丧失从事建筑施工活动的安全生产合法资质。</li>
              <li>实践中，企业必须立即停止相关生产经营活动，否则将面临严厉处罚（如高额罚款、责令停产停业）。</li>
              <li>企业需立即启动续期申请程序，重新接受主管部门的全面安全生产条件审查，合格后方能获得新证。</li>
            </ul>

            <h3>二、从示例中获得的实践启示</h3>
            <p>这个具体的示例（一个已过期的许可证）比一个“有效”的示例更具教育意义，它揭示了几个常被忽视的关键点：</p>
            <ul>
              <li><strong>许可证是动态的，而非静态的：</strong>企业不能将许可证视为永久性“奖状”，而必须将其作为需要主动维护和更新的合规文件。设立到期前提醒是基本管理动作。</li>
              <li><strong>“状态”高于“持有”：</strong>在业务合作、供应链审核、政府核查中，查验方不仅要看企业“有没有”证，更要核验证书的有效期和状态。一个过期的证书在法律上等同于无证。</li>
              <li><strong>续期的严肃性：</strong>续期并非简单走形式，而是一次新的、完整的资格审查。如果企业在有效期内发生重大安全事故或安全管理严重滑坡，很可能无法通过续期审查。</li>
            </ul>

            <hr />
            <p class="closing-copy">
              如果您需要，我可以根据这个示例，为您进一步解释企业申请安全生产许可证通常需要满足哪些具体条件（如安全投入、规章制度、人员配备等），或者梳理一下证书过期后企业重新申请合规的具体流程和风险。
              <span class="ai-tag">AI</span>
            </p>
          </div>

          <div class="answer-actions">
            <button><Copy :size="14" />复制</button>
            <button><Trash2 :size="14" />删除</button>
            <button><Share2 :size="14" />分享</button>
            <button><Plus :size="14" />加入知识库</button>
          </div>
        </article>
      </div>

    </section>

    <div class="qa-dock">
      <div class="qa-toolbar">
        <button><Plus :size="14" />新提问</button>
        <button>↻ 提问记录</button>
      </div>
      <div class="qa-composer">
        <textarea :placeholder="composerPlaceholder"></textarea>
        <div class="composer-actions">
          <button aria-label="语音输入"><Mic :size="21" /></button>
          <button class="send-button" aria-label="发送">
            <Send :size="23" />
          </button>
        </div>
      </div>
      <p>回复的内容由AI生成，非人工编辑；其内容准确性和完整性无法保证，不代表我们的态度和观点。</p>
    </div>

    <aside v-if="isReferenceDrawerOpen" class="source-drawer" aria-label="参考来源">
      <header class="source-drawer-header">
        <div>
          <strong>参考来源</strong>
          <span>{{ referenceSources.length }}篇</span>
        </div>
        <button type="button" aria-label="关闭参考来源" @click="isReferenceDrawerOpen = false">
          <X :size="18" />
        </button>
      </header>

      <div class="source-list">
        <article v-for="source in referenceSources" :key="source.id" class="source-card">
          <div class="source-card-title">
            <Share2 :size="16" />
            <strong>知识库文档</strong>
          </div>
          <h4>{{ source.id }}.{{ source.title }}</h4>
          <p>{{ source.excerpt }}</p>
        </article>
      </div>
    </aside>

    <div
      v-if="isCreateGroupModalOpen"
      class="group-modal-backdrop"
      role="presentation"
      @click.self="closeCreateGroupModal"
    >
      <section class="group-create-modal" role="dialog" aria-modal="true" aria-labelledby="group-create-title">
        <header class="group-create-header">
          <div>
            <strong id="group-create-title">新建小组</strong>
            <span>创建后会同步生成一个小组知识库</span>
          </div>
          <button type="button" aria-label="关闭新建小组" @click="closeCreateGroupModal">
            <X :size="18" />
          </button>
        </header>

        <div class="group-modal-section">
          <h3>基本信息</h3>
          <label class="group-form-field">
            <span class="field-label-row">
              <span class="field-title"><strong>*</strong> 小组名称</span>
              <small>{{ groupNameCount }}/15</small>
            </span>
            <input
              v-model="newGroupName"
              maxlength="15"
              type="text"
              placeholder="请输入 1-15 字的小组名称"
            />
          </label>
          <label class="group-form-field">
            <span class="field-label-row">
              <span class="field-title">小组简介</span>
              <small>{{ groupIntroCount }}/30</small>
            </span>
            <textarea
              v-model="newGroupIntro"
              maxlength="30"
              rows="3"
              placeholder="简要描述小组的职责或目标（30 字以内）"
            ></textarea>
          </label>
        </div>

        <div class="group-modal-section member-section">
          <div class="member-section-header">
            <div>
              <h3>添加成员</h3>
              <p>至少选择 2 人（包含自己）</p>
            </div>
            <label class="member-search">
              <Search :size="15" />
              <input v-model="memberSearchKeyword" type="text" placeholder="搜索成员姓名或手机号后4位" />
              <button type="button">搜索</button>
            </label>
          </div>

          <div class="member-table" role="table" aria-label="小组成员列表">
            <div class="member-table-row member-table-head" role="row">
              <span role="columnheader">成员姓名</span>
              <span role="columnheader">手机号</span>
              <span role="columnheader">选择</span>
            </div>
            <button
              v-for="member in filteredGroupMembers"
              :key="member.id"
              class="member-table-row"
              type="button"
              role="row"
              :class="{ selected: selectedMemberIds.has(member.id), locked: member.isCurrent }"
              @click="toggleGroupMember(member)"
            >
              <span class="member-name-cell" role="cell">
                <span class="member-avatar">{{ member.avatar }}</span>
                <span>{{ member.name }}</span>
              </span>
              <span role="cell">{{ member.phone }}</span>
              <span class="member-check-cell" role="cell">
                <span class="member-check" aria-hidden="true">
                  <Check v-if="selectedMemberIds.has(member.id)" :size="13" />
                </span>
              </span>
            </button>
          </div>
        </div>

        <footer class="group-create-footer">
          <span>已选 {{ selectedMemberCount }} 人</span>
          <div>
            <button class="group-cancel-button" type="button" @click="closeCreateGroupModal">取消</button>
            <button class="group-create-button" type="button" :disabled="!canCreateGroup" @click="createGroup">
              <Plus :size="16" />
              立即创建
            </button>
          </div>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.knowledge-page {
  display: grid;
  grid-template-columns: minmax(600px, 1fr) 8px minmax(420px, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  min-width: 1028px;
  padding: 0;
  overflow: hidden;
  background: var(--primary-soft);
}

.knowledge-page.with-source-drawer {
  grid-template-columns: minmax(600px, 1fr) 8px minmax(420px, 1fr) 340px;
  min-width: 1368px;
}

.library-section {
  grid-column: 1;
  grid-row: 1 / 3;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--primary-soft);
}

.add-button {
  height: var(--knowledge-control-height, 36px);
  min-width: 116px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 9px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--primary-color) 96%, white) 0%, var(--primary-color) 100%);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  box-shadow:
    0 5px 12px color-mix(in srgb, var(--primary-color) 14%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.library-body {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 10px 0 17px;
  background: var(--primary-soft);
}

.library-switcher {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  padding-right: 16px;
}

.library-tabs,
.group-tabs {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
}

.library-tabs::-webkit-scrollbar,
.group-tabs::-webkit-scrollbar {
  display: none;
}

.library-tabs {
  gap: 10px;
}

.group-tabs {
  gap: 8px;
  min-height: 32px;
}

.library-tab,
.group-tab {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;
}

.library-tab {
  position: relative;
  height: 36px;
  gap: 6px;
  padding: 0 6px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 14px;
  font-weight: 650;
  border: 1px solid transparent;
}

.library-tab span,
.group-tab span {
  white-space: nowrap;
}

.library-tab strong {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.library-tab:hover {
  color: var(--primary-hover);
}

.library-tab.active {
  border-color: color-mix(in srgb, var(--primary-color) 36%, var(--border-color));
  gap: 8px;
  padding: 0 12px 0 18px;
  color: var(--primary-hover);
  background: var(--primary-soft-strong);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 18%, transparent),
    0 4px 10px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.library-tab.active::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 999px;
  background: var(--primary-color);
}

.library-tab.active strong {
  min-width: 22px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--primary-hover);
  background: var(--card-bg);
}

.group-tab {
  height: 30px;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-weight: 650;
}

.group-tab strong {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.group-tab:hover,
.group-tab.active {
  border-color: var(--primary-border);
  color: var(--primary-hover);
  background: var(--card-bg);
}

.group-tab.active {
  background: var(--primary-soft-strong);
}

.group-create-tab {
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 5px;
  padding: 0 11px;
  border: 1px dashed color-mix(in srgb, var(--primary-color) 42%, var(--border-color));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 750;
}

.group-create-tab:hover {
  border-style: solid;
  background: var(--card-bg);
}

.search-row {
  --knowledge-control-height: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-right: 16px;
}

.library-search {
  height: var(--knowledge-control-height);
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--card-bg) 88%, var(--primary-soft));
  box-shadow: none;
  overflow: hidden;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease;
}

.library-search:focus-within {
  border-color: color-mix(in srgb, var(--primary-color) 42%, var(--border-color));
  background: var(--card-bg);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--primary-color) 9%, transparent);
}

.search-icon-shell {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
}

.library-search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
}

.library-search input::placeholder {
  color: var(--text-muted);
}

.search-button {
  align-self: center;
  width: 54px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 7px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  box-shadow: none;
}

.search-button:hover {
  background: var(--primary-soft);
  color: var(--primary-color);
}

.folder-row {
  min-height: 105px;
  display: grid;
  grid-template-columns: repeat(7, minmax(66px, 1fr));
  gap: 10px;
  align-items: start;
  padding: 0 16px 14px 9px;
  border-bottom: 1px solid rgba(190, 205, 232, 0.9);
}

.folder-card {
  min-width: 0;
  height: 84px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
}

.folder-icon {
  position: relative;
  width: 44px;
  height: 34px;
  margin-top: 1px;
  display: block;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--warning-border) 0%, var(--warning-border) 100%);
  box-shadow: inset 0 -1px 0 rgba(160, 111, 10, 0.08);
}

.folder-icon::before {
  content: '';
  position: absolute;
  left: 0;
  top: -5px;
  width: 21px;
  height: 9px;
  border-radius: 3px 3px 0 0;
  background: var(--warning-color);
}

.file-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 17px 16px 22px 0;
  scrollbar-color: var(--primary-border) transparent;
  scrollbar-width: thin;
}

.file-list::-webkit-scrollbar {
  width: 5px;
}

.file-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--primary-border);
}

.file-row {
  min-width: 0;
  min-height: 40px;
  display: grid;
  grid-template-columns: 26px minmax(180px, 1fr) auto auto 60px;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0 11px 0 17px;
  border: 1px solid rgba(226, 232, 240, 0.75);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.02);
}

.file-type {
  width: 18px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--on-primary);
  font-size: 8px;
  font-weight: 900;
  line-height: 1;
}

.file-type-pdf {
  background: var(--diff-removed);
}

.file-type-word {
  background: var(--primary-color);
  font-size: 10px;
}

.file-type-markdown {
  position: relative;
  background: var(--text-muted);
}

.file-type-markdown::before,
.file-type-markdown::after {
  content: '';
  position: absolute;
  left: 5px;
  right: 5px;
  height: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
}

.file-type-markdown::before {
  top: 7px;
}

.file-type-markdown::after {
  top: 12px;
}

.file-type-sheet {
  background: var(--diff-added);
  font-size: 10px;
}

.file-type-slide {
  background: var(--warning-color);
  font-size: 10px;
}

.file-row h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 800;
  line-height: 40px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.file-meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.file-actions {
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.file-actions button {
  width: 24px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.column-divider {
  grid-column: 2;
  grid-row: 1 / 3;
  height: 100%;
  background: var(--primary-soft);
  border-left: 1px solid rgba(199, 213, 238, 0.8);
  border-right: 1px solid rgba(199, 213, 238, 0.45);
}

.answer-panel {
  grid-column: 3;
  grid-row: 1;
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--primary-soft);
}

.answer-scroll {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 32px 12px 26px;
  scrollbar-color: var(--primary-border) transparent;
  scrollbar-width: thin;
}

.answer-scroll::-webkit-scrollbar {
  width: 5px;
}

.answer-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--primary-border);
}

.answer-card {
  min-height: 704px;
  padding: 0 30px 14px;
  border-radius: 13px 13px 0 0;
  background: var(--card-bg);
  color: var(--text-main);
}

.user-message {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.question-bubble {
  max-width: 260px;
  padding: 14px 15px 12px;
  border-radius: 13px 13px 0 13px;
  background: var(--primary-soft);
  color: var(--text-main);
}

.question-bubble p {
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
}

.question-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.question-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: inherit;
  font-size: inherit;
}

.answer-card-header {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 10px;
}

.answer-status-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.reference-button {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border-radius: 9px;
  background: var(--bg-color);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 700;
}

.reference-button.active,
.reference-button:hover {
  background: var(--primary-soft);
  color: var(--text-secondary);
}

.reference-button svg {
  color: var(--primary-color);
}

.answer-content {
  font-size: 16px;
  line-height: 1.72;
}

.answer-content p {
  margin: 0 0 12px;
}

.numbered-title {
  margin: 18px 0 5px !important;
  color: var(--text-strong);
  font-weight: 800;
}

.answer-content h3 {
  margin: 28px 0 10px;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 900;
  line-height: 1.35;
}

.answer-content ul {
  margin: 0 0 4px;
  padding-left: 36px;
}

.answer-content ul ul {
  margin-top: 2px;
  padding-left: 28px;
  list-style-type: circle;
}

.answer-content li {
  margin: 5px 0;
}

.answer-content strong {
  font-weight: 900;
}

.process-list {
  position: relative;
  margin: 3px 0 12px !important;
  padding-left: 24px !important;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.66;
}

.process-list li {
  margin: 0 !important;
}

.reasoning-timeline {
  margin: 2px 0 16px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.68;
}

.timeline-node {
  position: relative;
  padding: 0 0 21px 28px;
}

.timeline-node::before {
  content: '';
  position: absolute;
  top: 7px;
  left: 3px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--border-color);
}

.timeline-node::after {
  content: '';
  position: absolute;
  top: 18px;
  bottom: 6px;
  left: 5px;
  width: 1px;
  background: var(--border-color);
}

.timeline-node.last::after {
  display: none;
}

.timeline-node p {
  margin: 0 0 10px;
}

.tool-step {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 18px;
  row-gap: 4px;
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.35;
}

.tool-step strong {
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 900;
}

.tool-step span {
  justify-self: start;
  padding: 4px 13px;
  border-radius: 7px;
  background: var(--surface-muted);
  color: var(--text-secondary);
}

.tool-step small {
  grid-column: 1 / -1;
  margin-left: 94px;
  color: var(--text-muted);
  font-size: 13px;
}

.mock-answer-content > ul:not(.process-list) {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.74;
}

.mock-answer-content > p {
  color: var(--text-main);
}

.bubble {
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 1px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
}

.answer-content hr {
  height: 1px;
  margin: 13px 0 10px;
  border: 0;
  background: var(--text-strong);
}

.closing-copy {
  margin-bottom: 12px !important;
}

.ai-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 21px;
  min-width: 25px;
  margin-left: 4px;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
}

.answer-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1;
}

.answer-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: inherit;
  font-size: inherit;
}

.qa-dock {
  grid-column: 3;
  grid-row: 2;
  min-height: 0;
  box-sizing: border-box;
  padding: 0 10px 8px 12px;
  background: var(--primary-soft);
}

.qa-toolbar {
  height: 42px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 9px;
  padding-right: 0;
}

.qa-toolbar button {
  height: 34px;
  min-width: 96px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 14px;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.06);
}

.qa-composer {
  position: relative;
  height: 108px;
  border: 1px solid var(--primary-border);
  border-radius: 11px;
  background: var(--card-bg);
  overflow: hidden;
}

.qa-composer textarea {
  width: 100%;
  height: 100%;
  resize: none;
  padding: 13px 84px 14px 12px;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.5;
}

.qa-composer textarea::placeholder {
  color: var(--text-muted);
}

.composer-actions {
  position: absolute;
  right: 12px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
  color: var(--text-secondary);
}

.composer-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.send-button {
  width: 35px;
  height: 35px;
  border-radius: 11px;
  background: var(--border-color);
  color: var(--on-primary) !important;
}

.qa-dock p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
}

.source-drawer {
  grid-column: 4;
  grid-row: 1 / 3;
  min-width: 0;
  height: 100%;
  padding: 18px 16px;
  border-left: 1px solid var(--border-color);
  background: var(--bg-color);
  box-shadow: -8px 0 18px rgba(64, 88, 128, 0.08);
}

.source-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.source-drawer-header div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.source-drawer-header strong {
  color: var(--text-main);
  font-size: 16px;
  font-weight: 800;
}

.source-drawer-header span {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.source-drawer-header button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--text-muted);
}

.source-drawer-header button:hover {
  background: var(--border-soft);
  color: var(--text-secondary);
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.source-card {
  padding: 17px 18px 18px;
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 0 2px 9px rgba(45, 70, 110, 0.06);
}

.source-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--text-main);
}

.source-card-title svg {
  color: var(--primary-color);
}

.source-card-title strong {
  font-size: 14px;
  font-weight: 900;
}

.source-card h4 {
  margin: 0 0 9px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.source-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.75;
}

.group-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: rgba(15, 23, 42, 0.28);
}

.group-create-modal {
  width: min(896px, calc(100vw - 56px));
  max-height: min(760px, calc(100vh - 56px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: var(--primary-soft);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}

.group-create-header {
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(203, 213, 225, 0.75);
  background: var(--card-bg);
}

.group-create-header div {
  display: grid;
  gap: 4px;
}

.group-create-header strong {
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 850;
}

.group-create-header span {
  color: var(--text-muted);
  font-size: 13px;
}

.group-create-header button {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--text-muted);
}

.group-create-header button:hover {
  background: var(--surface-soft);
  color: var(--text-secondary);
}

.group-modal-section {
  margin: 16px 20px 0;
  padding: 18px 24px 20px;
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: 0 2px 10px rgba(45, 70, 110, 0.06);
}

.group-modal-section h3 {
  position: relative;
  margin: 0 0 14px;
  padding-left: 10px;
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 850;
}

.group-modal-section h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 3px;
  border-radius: 999px;
  background: var(--primary-color);
}

.group-form-field {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 750;
}

.field-title {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.field-title strong {
  color: var(--diff-removed);
  line-height: 1;
}

.field-label-row small {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
}

.group-form-field input,
.group-form-field textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 14px;
}

.group-form-field input {
  height: 38px;
  padding: 0 12px;
}

.group-form-field textarea {
  resize: none;
  min-height: 92px;
  padding: 10px 12px;
  line-height: 1.55;
}

.group-form-field input:focus,
.group-form-field textarea:focus {
  border-color: var(--primary-border);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 10%, transparent);
}

.member-section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
  overflow: hidden;
}

.member-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}

.member-section-header > div {
  min-width: 0;
}

.member-section-header h3 {
  margin-bottom: 4px;
}

.member-section-header p {
  margin: 0;
  padding-left: 10px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 650;
}

.member-search {
  width: 314px;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px 3px 10px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  color: var(--text-muted);
  background: var(--card-bg);
}

.member-search input {
  min-width: 0;
  flex: 1;
  height: 100%;
  color: var(--text-main);
  font-size: 13px;
}

.member-search button {
  width: 52px;
  height: 28px;
  border-radius: 7px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 750;
}

.member-table {
  min-height: 0;
  max-height: 304px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.member-table-row {
  width: 100%;
  min-height: 41px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(150px, 0.8fr) 86px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.82);
  color: var(--text-main);
  font-size: 14px;
  text-align: left;
}

.member-table-row:last-child {
  border-bottom: 0;
}

.member-table-head {
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 37px;
  background: color-mix(in srgb, var(--surface-soft) 72%, var(--card-bg));
  color: var(--text-secondary);
  font-weight: 800;
}

button.member-table-row:hover {
  background: var(--primary-soft);
}

.member-table-row.locked {
  cursor: default;
}

.member-table-row.selected {
  background: color-mix(in srgb, var(--primary-soft) 66%, var(--card-bg));
}

.member-name-cell {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 9px;
}

.member-avatar {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--primary-soft-strong);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 850;
}

.member-check-cell {
  display: flex;
  justify-content: center;
}

.member-check {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: var(--primary-color);
  background: var(--card-bg);
}

.member-table-row.selected .member-check {
  border-color: color-mix(in srgb, var(--primary-color) 45%, var(--border-color));
  background: var(--primary-soft-strong);
}

.group-create-footer {
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.group-create-footer > div {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.group-cancel-button,
.group-create-button {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 750;
}

.group-cancel-button {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
}

.group-create-button {
  min-width: 116px;
  background: var(--primary-color);
  color: var(--on-primary);
}

.group-create-button:disabled {
  background: var(--surface-muted);
  color: var(--text-muted);
  cursor: not-allowed;
}

@media (max-width: 1180px) {
  .knowledge-page {
    grid-template-columns: minmax(540px, 1fr) 8px minmax(390px, 0.85fr);
    min-width: 938px;
  }

  .knowledge-page.with-source-drawer {
    grid-template-columns: minmax(540px, 1fr) 8px minmax(390px, 0.85fr) 320px;
    min-width: 1258px;
  }

  .folder-row {
    gap: 6px;
  }

  .file-row {
    grid-template-columns: 24px minmax(150px, 1fr) auto auto 54px;
    padding-left: 12px;
  }

}
</style>
