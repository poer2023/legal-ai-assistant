<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router'; // Added router import
import { 
  MessageSquare, 
  Map, 
  BookOpen, 
  Plus, 
  History, 
  Copy, 
  Trash2, 
  Globe, 
  Database, 
  GraduationCap, 
  ChevronRight,
  Image as ImageIcon,
  Paperclip,
  Send,
  ExternalLink,
  BrainCircuit,
  Scale,
  ChevronDown,
  Check
} from 'lucide-vue-next';

const router = useRouter(); // Init router

// Mock Data
const questionTitle = ref('如何认定竞业限制协议的效力？');
const questionTime = ref('2024-12-30 14:30');

// Chat Input Logic
const inputValue = ref('');
const showSearchDropdown = ref(false);
const enabledSearchModes = ref<Set<string>>(new Set(['legal']));

const searchModes = [
  { id: 'legal', label: '法律搜索', icon: Scale },
  { id: 'web', label: '联网搜索', icon: Globe },
  { id: 'academic', label: '学术搜索', icon: GraduationCap },
  { id: 'knowledge', label: '知识库搜索', icon: BrainCircuit },
];

const toggleSearchMode = (modeId: string) => {
  if (enabledSearchModes.value.has(modeId)) {
    enabledSearchModes.value.delete(modeId);
  } else {
    enabledSearchModes.value.add(modeId);
  }
};

const toggleSearchDropdown = () => {
  showSearchDropdown.value = !showSearchDropdown.value;
};

const isEnabled = (modeId: string) => {
  return enabledSearchModes.value.has(modeId);
};

const closeDropdown = () => {
  showSearchDropdown.value = false;
};

// References Data - Updated with Legal Search
const references = [
  {
    type: 'kb',
    title: '劳动合同法第二十三条、第二十四条释义',
    content: '《中华人民共和国劳动合同法》第二十三条：用人单位与劳动者可以在劳动合同中约定保守用人单位的商业秘密和与知识产权相关的保密事项...',
    id: 1
  },
  {
    type: 'legal',
    title: '（2023）京01民终1234号：张某与北京某科技公司竞业限制纠纷案',
    content: '本院认为，劳动者离职后，用人单位已按月支付竞业限制补偿金，劳动者应当履行竞业限制义务。张某入职竞争对手公司，违反了竞业限制协议...',
    id: 5 // Corresponds to mockup case
  },
  {
    type: 'web',
    title: '最高人民法院关于审理劳动争议案件适用法律问题的解释（一）',
    content: '第三十六条 当事人在劳动合同或者保密协议中约定了竞业限制条款，但未约定解除或者终止劳动合同后给予劳动者经济补偿，劳动者履行了竞业限制义务...',
    id: 2
  },
  {
    type: 'legal',
    title: '《中华人民共和国劳动合同法》第二十四条',
    content: '竞业限制的人员限于用人单位的高级管理人员、高级技术人员和其他负有保密义务的人员。竞业限制的范围、地域、期限由用人单位与劳动者约定...',
    id: 105 // Corresponds to mockup law
  },
  {
    type: 'kb',
    title: '竞业限制纠纷典型案例：张某诉某科技公司案',
    content: '...法院认为，虽然双方签订了竞业限制协议，但公司未按照约定支付经济补偿金超过三个月，劳动者有权请求解除竞业限制协议...',
    id: 3
  },
  {
    type: 'web',
    title: '竞业限制协议效力的司法审查要点',
    content: '司法实践中，审查竞业限制协议效力主要关注：主体资格是否适格、限制范围是否合理、经济补偿是否到位...',
    id: 4
  }
];

const handleRefClick = (refItem: any) => {
  if (refItem.type === 'legal') {
    router.push({
      name: 'legal-document-detail',
      params: { id: refItem.id },
      query: { highlight: refItem.content } // Pass content for highlighting
    });
  }
};

const steps = [
  { icon: Database, text: '知识库搜索', detail: '竞业限制 效力认定' },
  { icon: GraduationCap, text: '学术搜索', detail: '竞业限制协议 司法解释' },
  { icon: Globe, text: '联网搜索', detail: '最高法 竞业限制 典型案例' }
];

const answerContent = `
<p>竞业限制协议的效力认定主要依据《中华人民共和国劳动合同法》及相关司法解释。以下是认定其效力的核心要点：</p>

<h3>1. 主体资格适格 (Article 24)</h3>
<p>竞业限制的人员限于用人单位的<strong>高级管理人员、高级技术人员和其他负有保密义务的人员</strong>。对于普通员工，若不掌握核心商业秘密，即便签订了竞业限制协议，也可能因主体不适格而被认定无效。</p>

<h3>2. 经济补偿的约定与履行 (Article 23)</h3>
<p>用人单位在竞业限制期限内必须按月给予劳动者经济补偿。若协议未约定经济补偿，或者用人单位未按约定支付补偿金达到一定期限（通常为3个月），劳动者有权请求解除竞业限制协议。</p>

<h3>3. 限制范围与期限的合理性 (Article 24)</h3>
<ul>
  <li><strong>范围：</strong> 竞业限制的范围、地域、期限由用人单位与劳动者约定，不得违反法律、法规的规定。</li>
  <li><strong>期限：</strong> 竞业限制期限不得超过<strong>二年</strong>。超过二年的部分无效。</li>
</ul>

<h3>4. 深度思考</h3>
<p>实践中，常出现"隐性竞业限制"或"霸王条款"的情况。法院在审理时，会基于<strong>公平原则</strong>平衡用人单位的商业秘密保护与劳动者的就业权。例如，若协议约定的违约金过高，法院有权予以调整。</p>

<p>综上所述，一份有效的竞业限制协议必须同时满足主体适格、约定明确、补偿到位且期限合法等条件。</p>
`;
</script>

<template>
  <div class="ai-qna-layout" @click="closeDropdown">
    <!-- Main Content -->
    <main class="local-main-content">
      <!-- Header -->
      <header class="qna-header">
        <div class="header-left">
          <div class="msg-icon">
            <MessageSquare :size="20" />
          </div>
          <div class="header-text">
            <h1 class="header-title">{{ questionTitle }}</h1>
            <span class="header-time">{{ questionTime }}</span>
          </div>
        </div>
      </header>

      <!-- Chat Container -->
      <div class="chat-container">
        <!-- User Question -->
        <div class="message-row user">
          <div class="message-bubble user-bubble">
            {{ questionTitle }}
          </div>
        </div>
        
        <!-- AI Answer -->
        <div class="message-row ai">
          <div class="ai-avatar-area">
             <div class="ai-avatar">
               <img src="https://api.dicebear.com/7.x/bottts/svg?seed=law" alt="AI" />
             </div>
          </div>
          
          <div class="message-content">
             <div class="answer-status-bar">
               <span class="status-tag">
                 <span class="check-icon">✓</span> 已完成回答
               </span>
               <div class="status-actions">
                 <button class="status-btn"><Copy :size="14" /> 复制</button>
                 <button class="status-btn"><Trash2 :size="14" /> 删除</button>
                 <button class="status-btn">参考来源 <ChevronRight :size="14" /></button>
               </div>
             </div>

             <!-- Reasoning/Steps -->
             <div class="reasoning-area">
                <div class="reasoning-summary">
                   <p>产品设计的本质涉及设计理念、用户需求、功能实现与美学平衡等多个层面。我将从核心定义出发，结合经典理论与实际案例，探讨其根本目标与方法论，帮助理解产品设计在现代创新中的关键作用。</p>
                </div>
                
                <div class="steps-list">
                   <div v-for="(step, idx) in steps" :key="idx" class="step-item">
                      <span class="step-name"><component :is="step.icon" :size="14" /> {{ step.text }}</span>
                      <span class="step-detail">{{ step.detail }}</span>
                      <span class="step-status">已获取</span>
                   </div>
                </div>
             </div>

             <!-- Main Answer Text -->
             <div class="answer-text" v-html="answerContent"></div>

             <div class="answer-footer">
                <div class="footer-actions">
                   <button class="footer-btn"><Plus :size="16" /> 新提问</button>
                   <button class="footer-btn"><History :size="16" /> 提问记录</button>
                </div>
             </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area-wrapper">
         <div class="input-box">
             <textarea 
                v-model="inputValue" 
                class="chat-textarea" 
                placeholder="想了解什么法律知识，快来问问我！Shift+Enter/Ctrl+Enter换行"
                @click.stop="closeDropdown"
            ></textarea>
            
             <div class="input-actions">
                <!-- Left Actions -->
                <div class="left-actions">
                   <div class="action-pill">
                      <span class="pill-text">深度思考(R1)</span>
                      <div class="pill-dot"></div>
                   </div>

                    <!-- Search Mode Selector -->
                    <div class="search-mode-selector" @click.stop="toggleSearchDropdown">
                        <div class="selected-icons">
                            <component
                            v-for="mode in searchModes"
                            :key="mode.id"
                            :is="mode.icon"
                            :size="18"
                            class="mode-icon"
                            :class="{ active: isEnabled(mode.id) }"
                            />
                        </div>
                        <ChevronDown :size="14" class="selector-chevron" />

                        <!-- Dropdown Menu -->
                        <div v-if="showSearchDropdown" class="search-dropdown">
                            <div
                            v-for="mode in searchModes"
                            :key="mode.id"
                            class="dropdown-item"
                            :class="{ selected: isEnabled(mode.id) }"
                            @click.stop="toggleSearchMode(mode.id)"
                            >
                            <component :is="mode.icon" :size="16" class="dropdown-icon" />
                            <span class="dropdown-label">{{ mode.label }}</span>
                            <Check v-if="isEnabled(mode.id)" :size="16" class="check-icon" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Actions -->
                <div class="right-actions">
                    <ImageIcon :size="20" class="tool-icon" />
                    <Paperclip :size="20" class="tool-icon" />
                    <button class="send-btn" :class="{ active: inputValue.length > 0 }">
                    <Send :size="18" />
                    </button>
                </div>
             </div>
         </div>
      </div>
    </main>

    <!-- Right Sidebar: References -->
    <aside class="references-sidebar">
      <div class="ref-header">
         <span class="ref-title">参考来源</span>
         <span class="ref-count">{{ references.length }}篇</span>
      </div>

      <div class="ref-list">
         <div 
           v-for="ref in references" 
           :key="ref.id" 
           class="ref-card"
           :class="{ 'clickable': ref.type === 'legal' }"
           @click="handleRefClick(ref)"
         >
            <div class="ref-card-header">
               <span class="ref-icon">
                  <Database v-if="ref.type === 'kb'" :size="14" color="#2563eb" />
                  <Scale v-else-if="ref.type === 'legal'" :size="14" color="#7c3aed" />
                  <Globe v-else :size="14" color="#0ea5e9" />
               </span>
               <span class="ref-source-name">
                 {{ ref.type === 'kb' ? '知识库' : ref.type === 'legal' ? '法律搜索' : '互联网' }}
               </span>
            </div>
            <h4 class="ref-card-title">{{ ref.title }}</h4>
            <p class="ref-card-content">{{ ref.content }}</p>
            <button class="add-kb-btn">
               <Plus :size="12" /> 加入知识库
            </button>
         </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.ai-qna-layout {
  display: flex;
  height: 100%;
  width: 100%;
  background: #f8fafc;
  overflow: hidden;
}

/* Local Main Content */
.local-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0; 
}

/* Header */
.qna-header {
  height: 60px;
  background: white; 
  display: flex;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #f1f5f9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.msg-icon {
  width: 32px;
  height: 32px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.header-time {
  font-size: 11px;
  color: #94a3b8;
}

/* Chat Container */
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 40px 240px 40px; 
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.message-row {
  display: flex;
  width: 100%;
}

.message-row.user {
  justify-content: flex-end;
}

.user-bubble {
  background: #eff6ff;
  color: #1e40af;
  padding: 12px 20px;
  border-radius: 12px 12px 2px 12px;
  font-size: 15px;
  max-width: 80%;
  font-weight: 500;
}

.message-row.ai {
  gap: 16px;
  align-items: flex-start;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: #eff6ff;
}
.ai-avatar img { width: 100%; height: 100%; }

.message-content {
  flex: 1;
  max-width: 800px; 
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answer-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}
.check-icon { color: #2563eb; }

.status-actions {
  display: flex;
  gap: 12px;
}

.status-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
}
.status-btn:hover { color: #2563eb; }

/* Reasoning Area */
.reasoning-area {
  background: #f8fafc;
  border-left: 3px solid #e2e8f0;
  padding: 12px 20px;
  border-radius: 0 8px 8px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reasoning-summary p {
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.step-name {
  color: #2563eb;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.step-detail {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  color: #475569;
}

.step-status {
  margin-left: auto;
  color: #94a3b8;
}

/* Answer Text */
.answer-text {
  font-size: 15px;
  line-height: 1.8;
  color: #1e293b;
}

:deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 10px 0;
  color: #0f172a;
}

:deep(p) { margin: 0 0 12px 0; }
:deep(ul) { padding-left: 20px; margin-bottom: 12px; }
:deep(li) { margin-bottom: 6px; }

.answer-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}
.footer-actions {
  display: flex;
  gap: 16px;
}
.footer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}
.footer-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

/* Input Area */
.input-area-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 40px;
  background: linear-gradient(180deg, rgba(248,250,252,0) 0%, #f8fafc 40%);
  pointer-events: none;
}

.input-box {
  pointer-events: auto;
  background: white;
  border: 1px solid #60a5fa;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.05);
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 200px;
  position: relative;
  transition: all 0.3s ease;
}

.input-box:focus-within {
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.1);
}

.chat-textarea {
  width: 100%;
  flex: 1;
  border: none;
  resize: none;
  font-size: 15px;
  line-height: 1.6;
  color: #334155;
  outline: none;
  background: transparent;
  padding: 0;
  margin-bottom: 20px;
  font-family: inherit;
}
.chat-textarea::placeholder { color: #94a3b8; }

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Action Pill */
.action-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #eff6ff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #3b82f6;
  font-weight: 500;
  cursor: pointer;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #22c55e;
}

/* Search Mode Selector */
.search-mode-selector {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.search-mode-selector:hover { background: #e2e8f0; }

.selected-icons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mode-icon {
  color: #94a3b8;
  transition: color 0.2s;
}
.mode-icon.active { color: #3b82f6; }

.selector-chevron { color: #64748b; }

/* Dropdown Menu */
.search-dropdown {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: 100;
  min-width: 160px;
  padding: 8px;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s;
}
.dropdown-item:hover { background: #f8fafc; }
.dropdown-item.selected { background: #eff6ff; }

.dropdown-icon { color: #64748b; }
.dropdown-item.selected .dropdown-icon { color: #3b82f6; }

.dropdown-label {
  flex: 1;
  font-size: 14px;
  color: #334155;
  white-space: nowrap;
}
.dropdown-item.selected .dropdown-label {
  color: #3b82f6;
  font-weight: 500;
}

.check-icon { color: #3b82f6; }

/* Right Tools */
.tool-icon {
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
}
.tool-icon:hover { color: #64748b; }

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #cbd5e1;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  transition: all 0.2s;
}
.send-btn.active {
  background: #3b82f6;
  cursor: pointer;
}
.send-btn.active:hover { background: #2563eb; }

/* Right Sidebar */
.references-sidebar {
  width: 280px;
  background: white;
  border-left: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
}

.ref-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ref-title {
  font-weight: 600;
  color: #1e293b;
}
.ref-count {
  font-size: 12px;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 10px;
  color: #64748b;
}

.ref-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.ref-card {
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  transition: all 0.2s;
}
.ref-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-color: #e2e8f0;
}

.ref-card.clickable {
  cursor: pointer;
}
.ref-card.clickable:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.ref-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
}
.ref-source-name { color: #64748b; }

.ref-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  line-height: 1.4;
}

.ref-card-content {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.add-kb-btn {
  margin-top: 4px;
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
}
.add-kb-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
</style>
