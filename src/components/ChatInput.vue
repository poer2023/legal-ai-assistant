<script setup lang="ts">
import { ref } from 'vue';
import {
  Globe,
  GraduationCap,
  BrainCircuit,
  Scale,
  ChevronDown,
  Image,
  Paperclip,
  Send,
  Check
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const inputValue = ref('');
const showSearchDropdown = ref(false);

// Multi-select mode: users can enable multiple search modes
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
  // Keep dropdown open for multi-selection
};

const toggleSearchDropdown = () => {
  showSearchDropdown.value = !showSearchDropdown.value;
};

const isEnabled = (modeId: string) => {
  return enabledSearchModes.value.has(modeId);
};

// Close dropdown when clicking outside
const closeDropdown = () => {
  showSearchDropdown.value = false;
};
</script>

<template>
  <div class="chat-input-container" @click.self="closeDropdown">
    <div class="knowledge-base-selector">
      <BrainCircuit :size="16" class="kb-icon-brain" />
      <span class="kb-text">知识库</span>
      <ChevronDown :size="14" class="kb-chevron" />
    </div>

    <textarea
      v-model="inputValue"
      class="chat-textarea"
      placeholder="想了解什么知识，快来问问我！Shift+Enter/Ctrl+Enter换行"
      @click="closeDropdown"
    ></textarea>

    <div class="input-actions">
      <div class="left-actions">
        <div class="action-pill">
          <span class="pill-text">深度思考(R1)</span>
          <div class="pill-dot"></div>
        </div>

        <!-- Search Mode Selector - All 4 icons visible -->
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

      <div class="right-actions">
        <Image :size="20" class="tool-icon" />
        <Paperclip :size="20" class="tool-icon" />
        <button class="send-btn" :class="{ active: inputValue.length > 0 }">
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-input-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #60a5fa;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.05);
  position: relative;
  transition: all 0.3s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.chat-input-container:focus-within {
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.1);
}

.knowledge-base-selector {
  position: absolute;
  top: -40px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #dbeafe;
  font-size: 13px;
  color: #1e3a8a;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}

.kb-icon-brain {
  color: #3b82f6;
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
}

.chat-textarea::placeholder {
  color: #94a3b8;
}

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

.search-mode-selector:hover {
  background: #e2e8f0;
}

.selected-icons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mode-icon {
  color: #94a3b8;
  transition: color 0.2s;
}

.mode-icon.active {
  color: #3b82f6;
}

.selector-chevron {
  color: #64748b;
}

/* Dropdown Menu */
.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
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
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.dropdown-item:hover {
  background: #f8fafc;
}

.dropdown-item.selected {
  background: #eff6ff;
}

.dropdown-icon {
  color: #64748b;
}

.dropdown-item.selected .dropdown-icon {
  color: #3b82f6;
}

.dropdown-label {
  flex: 1;
  font-size: 14px;
  color: #334155;
}

.dropdown-item.selected .dropdown-label {
  color: #3b82f6;
  font-weight: 500;
}

.check-icon {
  color: #3b82f6;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tool-icon {
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
}

.tool-icon:hover {
  color: #64748b;
}

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

.send-btn.active:hover {
  background: #2563eb;
}
</style>
