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
  background: var(--primary-soft);
}

.agent-icon-word .agent-icon-glyph {
  left: 17px;
  top: 13px;
  width: 20px;
  height: 25px;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--primary-color) 0%, var(--primary-color) 100%);
  box-shadow:
    -7px 7px 0 -1px var(--primary-hover),
    5px -5px 0 -2px rgba(255, 255, 255, 0.75);
}

.agent-icon-word .agent-icon-glyph::before {
  left: -6px;
  top: 6px;
  width: 15px;
  height: 16px;
  border-radius: 3px;
  background: var(--primary-hover);
  box-shadow: 0 4px 8px rgba(14, 90, 200, 0.28);
}

.agent-icon-word .agent-icon-glyph::after {
  left: -2px;
  top: 8px;
  color: var(--on-primary);
  content: "W";
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}

.agent-icon-writing {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 100%);
  box-shadow: inset 0 -1px 0 rgba(18, 42, 118, 0.16);
}

.agent-icon-writing .agent-icon-glyph {
  left: 14px;
  top: 12px;
  width: 21px;
  height: 26px;
  border-radius: 4px;
  background: var(--warning-soft);
  box-shadow: 5px 1px 0 -1px var(--primary-border);
}

.agent-icon-writing .agent-icon-glyph::before {
  left: 4px;
  top: 6px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--warning-color);
  box-shadow:
    0 8px 0 var(--focus-ring),
    8px 0 0 var(--warning-color),
    8px 8px 0 var(--focus-ring);
}

.agent-icon-writing .agent-icon-glyph::after {
  right: -5px;
  bottom: -3px;
  width: 8px;
  height: 22px;
  border-radius: 5px;
  background: linear-gradient(180deg, var(--warning-border) 0 32%, var(--card-bg) 32% 50%, var(--focus-ring) 50% 100%);
  transform: rotate(28deg);
  box-shadow: 0 3px 7px rgba(30, 64, 175, 0.25);
}

.agent-icon-pencil {
  background: var(--warning-border);
}

.agent-icon-pencil .agent-icon-glyph {
  left: 12px;
  top: 13px;
  width: 28px;
  height: 12px;
  border-radius: 7px;
  background: linear-gradient(90deg, var(--focus-ring) 0 58%, var(--card-bg) 58% 72%, var(--warning-color) 72% 100%);
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
  border-left: 9px solid var(--text-secondary);
}

.agent-icon-pencil .agent-icon-glyph::after {
  left: -3px;
  top: 0;
  width: 5px;
  height: 12px;
  border-radius: 6px 0 0 6px;
  background: var(--primary-border);
}

.agent-icon-grid {
  background: var(--primary-soft);
}

.agent-icon-grid .agent-icon-glyph {
  left: 12px;
  top: 12px;
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: linear-gradient(135deg, var(--focus-ring), var(--skill-color));
  box-shadow:
    12px 0 0 var(--focus-ring),
    24px 0 0 var(--focus-ring),
    0 12px 0 var(--primary-border),
    12px 12px 0 var(--focus-ring),
    24px 12px 0 var(--skill-color),
    0 24px 0 var(--primary-border),
    12px 24px 0 var(--focus-ring),
    24px 24px 0 var(--focus-ring);
}

.agent-icon-network {
  background: linear-gradient(135deg, var(--diff-added-soft) 0%, var(--diff-added-soft) 100%);
}

.agent-icon-network .agent-icon-glyph {
  left: 12px;
  top: 12px;
  width: 24px;
  height: 25px;
  border-radius: 8px 8px 11px 11px;
  background: linear-gradient(180deg, var(--diff-added) 0%, var(--diff-added) 100%);
  box-shadow: 0 8px 14px rgba(5, 150, 105, 0.24);
  clip-path: polygon(50% 0, 88% 14%, 88% 52%, 50% 100%, 12% 52%, 12% 14%);
}

.agent-icon-network .agent-icon-glyph::before {
  left: 6px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--card-bg);
  box-shadow:
    8px -3px 0 var(--card-bg),
    10px 9px 0 var(--diff-added-border);
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
  background: linear-gradient(135deg, var(--warning-soft) 0%, var(--warning-soft) 100%);
}

.agent-icon-flow .agent-icon-glyph {
  left: 9px;
  top: 22px;
  width: 30px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--warning-color) 0%, var(--warning-color) 100%);
  box-shadow: 0 8px 14px rgba(217, 119, 6, 0.22);
}

.agent-icon-flow .agent-icon-glyph::before {
  left: 2px;
  top: -10px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--warning-color);
  box-shadow:
    10px 10px 0 var(--warning-color),
    21px 0 0 var(--warning-color);
}

.agent-icon-flow .agent-icon-glyph::after {
  right: -2px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-top: 4px solid var(--warning-color);
  border-right: 4px solid var(--warning-color);
  transform: rotate(45deg);
}

.agent-icon-equity {
  background: linear-gradient(135deg, var(--skill-soft) 0%, var(--skill-soft) 100%);
}

.agent-icon-equity .agent-icon-glyph {
  left: 20px;
  top: 10px;
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: var(--skill-color);
  box-shadow:
    -11px 15px 0 var(--skill-color),
    11px 15px 0 var(--skill-color),
    -11px 28px 0 var(--skill-soft),
    11px 28px 0 var(--skill-color);
}

.agent-icon-equity .agent-icon-glyph::before {
  left: -7px;
  top: 8px;
  width: 22px;
  height: 22px;
  border-left: 2px solid var(--skill-color);
  border-right: 2px solid var(--skill-color);
  border-top: 2px solid var(--skill-color);
}

.agent-icon-equity .agent-icon-glyph::after {
  left: -7px;
  top: 23px;
  width: 22px;
  height: 2px;
  background: var(--skill-soft);
}

.agent-icon-review {
  background: linear-gradient(135deg, var(--diff-added-soft) 0%, var(--diff-added-soft) 100%);
}

.agent-icon-review .agent-icon-glyph {
  left: 13px;
  top: 10px;
  width: 22px;
  height: 28px;
  border-radius: 5px;
  background: linear-gradient(180deg, var(--card-bg) 0%, var(--diff-added-soft) 100%);
  box-shadow:
    0 8px 14px rgba(22, 163, 74, 0.18),
    inset 0 0 0 2px var(--diff-added);
}

.agent-icon-review .agent-icon-glyph::before {
  left: 6px;
  top: 8px;
  width: 10px;
  height: 2px;
  border-radius: 999px;
  background: var(--diff-added-border);
  box-shadow:
    0 6px 0 var(--diff-added-border),
    0 12px 0 var(--diff-added-border);
}

.agent-icon-review .agent-icon-glyph::after {
  right: -5px;
  bottom: 3px;
  width: 14px;
  height: 8px;
  border-left: 4px solid var(--diff-added);
  border-bottom: 4px solid var(--diff-added);
  transform: rotate(-45deg);
}
</style>
