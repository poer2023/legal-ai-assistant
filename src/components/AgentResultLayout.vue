<script setup lang="ts">
import {
  ChevronLeft,
  Download,
  Clock,
  RotateCcw,
  RotateCw,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Image as ImageIcon,
  Zap,
  AlignLeft, 
  List
} from 'lucide-vue-next';

interface OutlineItem {
  id: string;
  title: string;
  level?: number;
}

interface Props {
  // Page Header Props
  title: string;
  badge: string;
  badgeClass?: string; // For custom colors: 'bg-blue-50 text-blue-600'
  saveStatus?: string;
  
  // Controls State
  canUndo?: boolean;
  canRedo?: boolean;
  
  // Outline Data
  outlineItems?: OutlineItem[];
}

const props = withDefaults(defineProps<Props>(), {
  saveStatus: '已保存',
  canUndo: false,
  canRedo: false,
  badgeClass: 'badge-default',
  outlineItems: () => []
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'export'): void;
  (e: 'addToKb'): void;
  (e: 'outlineClick', id: string): void;
}>();

const handleOutlineClick = (id: string) => {
  emit('outlineClick', id);
  // Optional: Auto-scroll logic if not handled by parent
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
</script>

<template>
  <div class="agent-result-layout">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button class="back-circle-btn" @click="emit('back')">
          <ChevronLeft :size="20" />
        </button>

        <div class="header-info-group">
          <span class="header-badge" :class="badgeClass">{{ badge }}</span>
          <div class="header-content">
            <h1 class="page-title">{{ title }}</h1>
            <span class="save-status">{{ saveStatus }}</span>
            <div class="header-actions">
               <button class="icon-action-btn" title="历史记录">
                 <Clock :size="14" />
               </button>
               <button 
                class="icon-action-btn" 
                :class="{ disabled: !canUndo }"
                :disabled="!canUndo"
                @click="emit('undo')"
                title="撤销"
              >
                 <RotateCcw :size="14" />
               </button>
               <button 
                class="icon-action-btn" 
                :class="{ disabled: !canRedo }"
                :disabled="!canRedo"
                @click="emit('redo')"
                title="重做"
              >
                 <RotateCw :size="14" />
               </button>
            </div>
          </div>
        </div>
      </div>

      <div class="header-right">
        <!-- Toolbar Items directly in Header for better space usage, matching design if needed, 
             but typically Toolbar is below. The image shows Toolbar in the header line or just below?
             Checking image: Toolbar is separate line below header. 
             Wait, looking at the image provided (Step 0):
             Top row: Back Button | [Badge] [Title] [Saved] [Undo/Redo] | [Toolbar Icons] | [Export] [Add to KB]
             Actually, the image shows:
             Left: < (Back)
             Center-ish Left: [论文助手](Badge) [产品设计的本..(Title)] [已保存] [History] [Undo] [Redo] | [Text] [H1] [H2] [H3] [B] [I] [U] [Table] [Img]
             Right: [Export Word] [Add to KB]
             
             So the Toolbar is MERGED into the Header in the design!
             Let's adjust to match the reference image closely.
        -->
        <div class="toolbar-inline">
            <div class="divider-vertical"></div>
            <button class="tool-btn-icon" title="字体"><Type :size="16" /></button>
            <button class="tool-btn-icon" title="标题1"><Heading1 :size="16" /></button>
            <button class="tool-btn-icon" title="标题2"><Heading2 :size="16" /></button>
            <button class="tool-btn-icon" title="标题3"><Heading3 :size="16" /></button>
            <button class="tool-btn-icon" title="加粗"><Bold :size="16" /></button>
            <button class="tool-btn-icon" title="斜体"><Italic :size="16" /></button>
            <button class="tool-btn-icon" title="下划线"><Underline :size="16" /></button>
             <button class="tool-btn-icon" title="表格"><AlignLeft :size="16" /></button> <!-- Using AlignLeft as placeholder for Table icon if needed or just use icon -->
            <button class="tool-btn-icon" title="插入图片"><ImageIcon :size="16" /></button>
        </div>

        <div class="action-buttons">
            <button class="primary-btn" @click="emit('export')">
            <span class="btn-text">导出Word</span>
            </button>
            <button class="secondary-btn" @click="emit('addToKb')">
            <Zap :size="14" />
            <span class="btn-text">加入知识库</span>
            </button>
        </div>
      </div>
    </header>

    <div class="main-body">
      <!-- Left Sidebar: Outline -->
      <aside class="left-sidebar">
        <div class="sidebar-title">大纲</div>
        <div class="outline-list">
          <div 
            v-for="item in outlineItems" 
            :key="item.id"
            class="outline-item"
            :class="[`level-${item.level || 1}`]"
            @click="handleOutlineClick(item.id)"
          >
            {{ item.title }}
          </div>
        </div>
      </aside>

      <!-- Center Content -->
      <main class="center-content">
        <slot></slot>
      </main>

      <!-- Right Sidebar: AI Tools -->
      <aside class="right-sidebar">
         <div class="sidebar-section">
            <div class="section-header">
                <span class="icon-box blue"><Zap :size="14" /></span>
                <div class="text-group">
                    <h3>AI文本编辑</h3>
                    <p>选中文字后，点击对应文本编辑工具</p>
                </div>
            </div>
            
            <div class="tool-grid">
               <button class="tool-chip">改写</button>
               <button class="tool-chip">扩写</button>
               <button class="tool-chip">续写</button>
               <button class="tool-chip">翻译</button>
            </div>
         </div>

         <div class="sidebar-section">
            <div class="section-header">
                <span class="icon-box purple"><ImageIcon :size="14" /></span> <!-- Placeholder for Multimodal -->
                <div class="text-group">
                    <h3>多模态AI生成</h3>
                    <p>选中文字后，点击对应多模态生成工具</p>
                </div>
            </div>
            
            <div class="multimodal-grid">
               <div class="mm-item blue-bg">
                 <ImageIcon :size="20" class="mm-icon" />
                 <span>示意图</span>
               </div>
               <div class="mm-item purple-bg">
                 <!-- Chart Icon -->
                 <span class="mm-text-icon">📊</span>
                 <span>图表</span>
               </div>
               <div class="mm-item blue-light-bg">
                 <ImageIcon :size="20" class="mm-icon" />
                 <span>图片</span>
               </div>
               <div class="mm-item indigo-bg">
                  <span class="mm-text-icon">▦</span>
                 <span>表格</span>
               </div>
               <div class="mm-item orange-bg">
                 <span class="mm-text-icon">∑</span>
                 <span>公式</span>
               </div>
            </div>
         </div>

         <div class="sidebar-section">
            <div class="section-header">
                <span class="icon-box green"><Zap :size="14" /></span>
                <div class="text-group">
                    <h3>学术优化</h3>
                </div>
            </div>
            
            <div class="tool-grid three-col">
               <button class="tool-chip-square blue">
                 <span class="icon-wrap">🔍</span>
                 <span>学术搜索</span>
               </button>
               <button class="tool-chip-square orange">
                 <span class="icon-wrap">📝</span>
                 <span>文献格式</span>
               </button>
               <button class="tool-chip-square green">
                 <span class="icon-wrap">📊</span>
                 <span>图表排序</span>
               </button>
            </div>
         </div>

        <div class="sidebar-section">
            <div class="section-header no-icon">
                <span class="icon-box orange-simple">PPT</span>
                <h3>文档转PPT</h3>
            </div>
            
             <div class="ppt-promo-card">
                 <div class="promo-row">
                    <span class="blue-text">⚡ 智能匹配</span>
                    <span class="sub">100%忠于原文内容生成</span>
                 </div>
                 <div class="promo-row">
                    <span class="blue-text">🖼️ 专业排版</span>
                    <span class="sub">海量模板选择，专业图示效果</span>
                 </div>
                 <div class="promo-row">
                    <span class="blue-text">⏱️ 省时省力</span>
                    <span class="sub">只需几分钟，演讲、汇报轻松搞定</span>
                 </div>
             </div>

             <button class="ppt-gen-btn">
                立即生成专业PPT 👆
             </button>
             <p class="tiny-note">内容由AI生成</p>
         </div>

      </aside>
    </div>
  </div>
</template>

<style scoped>
.agent-result-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-muted);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* --- Header --- */
.page-header {
  height: 64px;
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-circle-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.back-circle-btn:hover { background: var(--surface-soft); }

.header-info-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
}
.badge-default { background: var(--primary-soft); color: var(--primary-color); }

.header-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-strong);
  margin: 0;
}

.save-status {
    font-size: 12px;
    color: var(--text-muted);
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
}

.icon-action-btn {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
}
.icon-action-btn:hover { background: var(--surface-soft); color: var(--text-main); }
.icon-action-btn.disabled { opacity: 0.3; cursor: not-allowed; }

/* --- Header Right / Toolbar --- */
.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.toolbar-inline {
    display: flex;
    align-items: center;
    gap: 2px;
}

.divider-vertical {
    width: 1px;
    height: 20px;
    background: var(--border-color);
    margin: 0 12px;
}

.tool-btn-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 4px;
    cursor: pointer;
}
.tool-btn-icon:hover { background: var(--surface-soft); color: var(--primary-color); }

.action-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: 12px;
}

.primary-btn {
    background: var(--primary-color); /* Per stylesheet approximate */
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
}
.primary-btn:hover { background: var(--primary-hover); }

.secondary-btn {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-main);
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
}
.secondary-btn:hover { background: var(--surface-muted); }


/* --- Main Body --- */
.main-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

/* Left Sidebar */
.left-sidebar {
    width: 240px;
    background: var(--surface-muted); /* Slightly darker than main bg or white? Image looks like sidebar is white or very light gray */
    background: var(--card-bg);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow-y: auto;
}

.sidebar-title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 20px;
    color: var(--text-strong);
}

.outline-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.outline-item {
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 0;
    line-height: 1.5;
}
.outline-item:hover { color: var(--primary-color); }
.level-1 { font-weight: 500; color: var(--text-main); }
.level-2 { padding-left: 12px; font-size: 12px; }

/* Center Content */
.center-content {
    flex: 1;
    overflow-y: auto;
    padding: 30px 40px;
    display: flex;
    justify-content: center;
    background: var(--surface-muted);
}

/* Right Sidebar */
.right-sidebar {
    width: 280px;
    background: var(--card-bg);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow-y: auto;
    gap: 24px;
}

.sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-header {
    display: flex;
    gap: 10px;
}
.section-header.no-icon {
    align-items: center;
}

.icon-box {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.icon-box.blue { background: var(--primary-soft); color: var(--primary-color); }
.icon-box.purple { background: var(--skill-soft); color: var(--skill-color); }
.icon-box.green { background: var(--diff-added-soft); color: var(--diff-added); }
.icon-box.orange-simple { background: none; color: var(--warning-color); font-weight: 800; font-size: 12px; border: 1px solid var(--warning-soft); width: 28px; height: 18px; border-radius: 4px; padding: 0 4px; width: auto; justify-content: center; display: inline-flex; }


.text-group h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-strong);
}
.text-group p {
    margin: 2px 0 0 0;
    font-size: 11px;
    color: var(--text-secondary);
}

.tool-grid {
    display: flex;
    gap: 8px;
}
.tool-grid.three-col {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
}

.tool-chip {
    flex: 1;
    background: var(--surface-soft);
    border: none;
    padding: 6px;
    border-radius: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
}
.tool-chip:hover { background: var(--border-color); color: var(--text-strong); }

.multimodal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.mm-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary);
}
.mm-item.blue-bg { background: var(--primary-soft); color: var(--primary-hover); }
.mm-item.purple-bg { background: var(--skill-soft); color: var(--skill-color); }
.mm-item.blue-light-bg { background: var(--primary-soft); color: var(--primary-hover); }
.mm-item.indigo-bg { background: var(--primary-soft); color: var(--skill-color); }
.mm-item.orange-bg { background: var(--warning-soft); color: var(--warning-color); }

.mm-text-icon { font-size: 16px; font-weight: bold; }

.tool-chip-square {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: var(--surface-muted);
    border: 1px solid var(--surface-soft);
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
}
.tool-chip-square.blue { background: var(--primary-soft); border-color: var(--primary-soft-strong); color: var(--primary-hover); }
.tool-chip-square.orange { background: var(--warning-soft); border-color: var(--warning-soft); color: var(--warning-color); }
.tool-chip-square.green { background: var(--diff-added-soft); border-color: var(--diff-added-soft); color: var(--diff-added); }
.tool-chip-square span { font-size: 11px; }
.icon-wrap { font-size: 16px; margin-bottom: 2px; }

.ppt-promo-card {
    background: var(--primary-soft);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.promo-row {
    display: flex;
    gap: 8px;
    align-items: baseline;
}
.blue-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--primary-color);
    white-space: nowrap;
}
.sub {
    font-size: 11px;
    color: var(--text-secondary);
    transform: scale(0.9);
    transform-origin: left;
}

.ppt-gen-btn {
    background: linear-gradient(90deg, var(--focus-ring) 0%, var(--focus-ring) 100%);
    color: white;
    border: none;
    padding: 10px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
}
.ppt-gen-btn:hover { opacity: 0.9; }

.tiny-note {
    font-size: 10px;
    color: var(--text-muted);
    text-align: center;
    margin: 4px 0 0 0;
}
</style>
