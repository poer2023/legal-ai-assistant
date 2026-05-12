<script setup lang="ts">
import { Check, Palette } from 'lucide-vue-next';
import { useTheme } from '../../stores/theme';
import type { ThemeId } from '../../data/themes';

const { currentThemeId, setTheme, themeOptions } = useTheme();

const handleThemeSelect = (themeId: ThemeId) => {
  setTheme(themeId);
};
</script>

<template>
  <div class="team-theme-page">
    <header class="theme-page-header">
      <div class="theme-header-icon">
        <Palette :size="22" />
      </div>
      <div>
        <div class="theme-kicker">团队外观</div>
        <h1>主题切换</h1>
        <p>保留原版主题，并提供多套新增浅色主题作为可切换配色。</p>
      </div>
    </header>

    <section class="theme-grid" aria-label="主题列表">
      <button
        v-for="theme in themeOptions"
        :key="theme.id"
        class="theme-card"
        :class="{ active: currentThemeId === theme.id }"
        type="button"
        @click="handleThemeSelect(theme.id)"
      >
        <div class="theme-card-topline">
          <span class="theme-card-title">{{ theme.name }}</span>
          <span v-if="currentThemeId === theme.id" class="active-mark">
            <Check :size="15" />
            当前
          </span>
        </div>

        <p>{{ theme.description }}</p>

        <div class="theme-preview" :style="{ '--preview-accent': theme.theme.accent, '--preview-ink': theme.theme.ink, '--preview-surface': theme.theme.surface }">
          <span class="preview-sidebar"></span>
          <span class="preview-main">
            <span class="preview-title"></span>
            <span class="preview-line"></span>
            <span class="preview-action"></span>
          </span>
        </div>

        <dl class="theme-meta">
          <div>
            <dt>Accent</dt>
            <dd>{{ theme.theme.accent }}</dd>
          </div>
          <div>
            <dt>Ink</dt>
            <dd>{{ theme.theme.ink }}</dd>
          </div>
          <div>
            <dt>Surface</dt>
            <dd>{{ theme.theme.surface }}</dd>
          </div>
        </dl>
      </button>
    </section>
  </div>
</template>

<style scoped>
.team-theme-page {
  width: 100%;
  max-width: 940px;
  color: var(--text-main);
}

.theme-page-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 24px;
  margin-bottom: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}

.theme-header-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 14px;
  background: var(--primary-soft);
  color: var(--primary-color);
}

.theme-kicker {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.theme-page-header h1 {
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 760;
  line-height: 1.2;
}

.theme-page-header p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 288px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background: var(--card-bg);
  color: var(--text-main);
  text-align: left;
  box-shadow: var(--shadow-soft);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.theme-card:hover,
.theme-card.active {
  border-color: var(--primary-border);
  box-shadow: var(--shadow-card);
}

.theme-card:hover {
  transform: translateY(-1px);
}

.theme-card:focus {
  outline: none;
}

.theme-card:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.theme-card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.theme-card-title {
  color: var(--text-strong);
  font-size: 17px;
  font-weight: 750;
}

.active-mark {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.theme-card p {
  min-height: 44px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.theme-preview {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  min-height: 108px;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--preview-surface);
}

.preview-sidebar {
  background: color-mix(in srgb, var(--preview-accent) 12%, var(--preview-surface));
  border-right: 1px solid color-mix(in srgb, var(--preview-accent) 22%, var(--preview-surface));
}

.preview-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
  padding: 20px;
}

.preview-title,
.preview-line,
.preview-action {
  display: block;
  border-radius: 999px;
}

.preview-title {
  width: 54%;
  height: 10px;
  background: var(--preview-ink);
}

.preview-line {
  width: 78%;
  height: 8px;
  background: color-mix(in srgb, var(--preview-ink) 28%, var(--preview-surface));
}

.preview-action {
  width: 92px;
  height: 24px;
  background: var(--preview-accent);
}

.theme-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: auto 0 0;
}

.theme-meta div {
  min-width: 0;
  padding: 9px;
  border-radius: 8px;
  background: var(--surface-muted);
}

.theme-meta dt {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.theme-meta dd {
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .theme-grid {
    grid-template-columns: 1fr;
  }
}
</style>
