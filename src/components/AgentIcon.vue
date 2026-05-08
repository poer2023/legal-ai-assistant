<script setup lang="ts">
export type AgentIconKind = 'word' | 'writing' | 'pencil' | 'grid' | 'network' | 'flow' | 'equity' | 'review';

withDefaults(defineProps<{
  kind?: AgentIconKind;
}>(), {
  kind: 'word',
});
</script>

<template>
  <span class="agent-icon" :class="`agent-icon-${kind}`" aria-hidden="true">
    <span class="agent-icon-glyph"></span>
  </span>
</template>

<style scoped>
.agent-icon {
  width: 48px;
  height: 48px;
  position: relative;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.agent-icon-glyph,
.agent-icon-glyph::before,
.agent-icon-glyph::after {
  content: "";
  position: absolute;
  display: block;
}

.agent-icon-word {
  background: #eaf4ff;
}

.agent-icon-word .agent-icon-glyph {
  left: 17px;
  top: 13px;
  width: 20px;
  height: 25px;
  border-radius: 3px;
  background: linear-gradient(180deg, #12a9f4 0%, #0c73d9 100%);
  box-shadow:
    -7px 7px 0 -1px #0d52b7,
    5px -5px 0 -2px rgba(255, 255, 255, 0.75);
}

.agent-icon-word .agent-icon-glyph::before {
  left: -6px;
  top: 6px;
  width: 15px;
  height: 16px;
  border-radius: 3px;
  background: #0b55c7;
  box-shadow: 0 4px 8px rgba(14, 90, 200, 0.28);
}

.agent-icon-word .agent-icon-glyph::after {
  left: -2px;
  top: 8px;
  color: #ffffff;
  content: "W";
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}

.agent-icon-writing {
  background: linear-gradient(135deg, #496bea 0%, #3564e7 100%);
  box-shadow: inset 0 -1px 0 rgba(18, 42, 118, 0.16);
}

.agent-icon-writing .agent-icon-glyph {
  left: 14px;
  top: 12px;
  width: 21px;
  height: 26px;
  border-radius: 4px;
  background: #fffaf0;
  box-shadow: 5px 1px 0 -1px #d8e8ff;
}

.agent-icon-writing .agent-icon-glyph::before {
  left: 4px;
  top: 6px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #f97316;
  box-shadow:
    0 8px 0 #60a5fa,
    8px 0 0 #f97316,
    8px 8px 0 #60a5fa;
}

.agent-icon-writing .agent-icon-glyph::after {
  right: -5px;
  bottom: -3px;
  width: 8px;
  height: 22px;
  border-radius: 5px;
  background: linear-gradient(180deg, #ffd84d 0 32%, #ffffff 32% 50%, #60a5fa 50% 100%);
  transform: rotate(28deg);
  box-shadow: 0 3px 7px rgba(30, 64, 175, 0.25);
}

.agent-icon-pencil {
  background: #ffe86a;
}

.agent-icon-pencil .agent-icon-glyph {
  left: 12px;
  top: 13px;
  width: 28px;
  height: 12px;
  border-radius: 7px;
  background: linear-gradient(90deg, #6bb7ff 0 58%, #ffffff 58% 72%, #f59e0b 72% 100%);
  transform: rotate(45deg);
  box-shadow: 0 7px 12px rgba(176, 126, 0, 0.2);
}

.agent-icon-pencil .agent-icon-glyph::before {
  right: -8px;
  top: 2px;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 9px solid #475569;
}

.agent-icon-pencil .agent-icon-glyph::after {
  left: -3px;
  top: 0;
  width: 5px;
  height: 12px;
  border-radius: 6px 0 0 6px;
  background: #93c5fd;
}

.agent-icon-grid {
  background: #eff6ff;
}

.agent-icon-grid .agent-icon-glyph {
  left: 12px;
  top: 12px;
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: linear-gradient(135deg, #7dd3fc, #4f46e5);
  box-shadow:
    12px 0 0 #7dd3fc,
    24px 0 0 #60a5fa,
    0 12px 0 #93c5fd,
    12px 12px 0 #818cf8,
    24px 12px 0 #4f46e5,
    0 24px 0 #bfdbfe,
    12px 24px 0 #60a5fa,
    24px 24px 0 #818cf8;
}

.agent-icon-network {
  background: linear-gradient(135deg, #ccfbf1 0%, #d1fae5 100%);
}

.agent-icon-network .agent-icon-glyph {
  left: 12px;
  top: 12px;
  width: 24px;
  height: 25px;
  border-radius: 8px 8px 11px 11px;
  background: linear-gradient(180deg, #2dd4bf 0%, #059669 100%);
  box-shadow: 0 8px 14px rgba(5, 150, 105, 0.24);
  clip-path: polygon(50% 0, 88% 14%, 88% 52%, 50% 100%, 12% 52%, 12% 14%);
}

.agent-icon-network .agent-icon-glyph::before {
  left: 6px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow:
    8px -3px 0 #ffffff,
    10px 9px 0 #a7f3d0;
}

.agent-icon-network .agent-icon-glyph::after {
  left: 10px;
  top: 10px;
  width: 11px;
  height: 10px;
  border-top: 2px solid rgba(255, 255, 255, 0.86);
  border-right: 2px solid rgba(255, 255, 255, 0.86);
  transform: rotate(32deg);
}

.agent-icon-flow {
  background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
}

.agent-icon-flow .agent-icon-glyph {
  left: 9px;
  top: 22px;
  width: 30px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f97316 0%, #d97706 100%);
  box-shadow: 0 8px 14px rgba(217, 119, 6, 0.22);
}

.agent-icon-flow .agent-icon-glyph::before {
  left: 2px;
  top: -10px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #fb923c;
  box-shadow:
    10px 10px 0 #d97706,
    21px 0 0 #fbbf24;
}

.agent-icon-flow .agent-icon-glyph::after {
  right: -2px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-top: 4px solid #d97706;
  border-right: 4px solid #d97706;
  transform: rotate(45deg);
}

.agent-icon-equity {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
}

.agent-icon-equity .agent-icon-glyph {
  left: 20px;
  top: 10px;
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: #7c3aed;
  box-shadow:
    -11px 15px 0 #a78bfa,
    11px 15px 0 #6d28d9,
    -11px 28px 0 #c4b5fd,
    11px 28px 0 #8b5cf6;
}

.agent-icon-equity .agent-icon-glyph::before {
  left: -7px;
  top: 8px;
  width: 22px;
  height: 22px;
  border-left: 2px solid #a78bfa;
  border-right: 2px solid #a78bfa;
  border-top: 2px solid #a78bfa;
}

.agent-icon-equity .agent-icon-glyph::after {
  left: -7px;
  top: 23px;
  width: 22px;
  height: 2px;
  background: #c4b5fd;
}

.agent-icon-review {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.agent-icon-review .agent-icon-glyph {
  left: 13px;
  top: 10px;
  width: 22px;
  height: 28px;
  border-radius: 5px;
  background: linear-gradient(180deg, #ffffff 0%, #dcfce7 100%);
  box-shadow:
    0 8px 14px rgba(22, 163, 74, 0.18),
    inset 0 0 0 2px #22c55e;
}

.agent-icon-review .agent-icon-glyph::before {
  left: 6px;
  top: 8px;
  width: 10px;
  height: 2px;
  border-radius: 999px;
  background: #86efac;
  box-shadow:
    0 6px 0 #bbf7d0,
    0 12px 0 #bbf7d0;
}

.agent-icon-review .agent-icon-glyph::after {
  right: -5px;
  bottom: 3px;
  width: 14px;
  height: 8px;
  border-left: 4px solid #16a34a;
  border-bottom: 4px solid #16a34a;
  transform: rotate(-45deg);
}
</style>
