<script setup lang="ts">
const navItems = [
  { label: '个人信息', path: '/profile/basic', active: true },
  { label: '提问记录', path: '/profile/questions', active: false },
  { label: '使用记录', path: '/profile/creations', active: false },
];

const accountRows = [
  { label: '昵称', value: '892830', hasAction: false },
  { label: '用户ID', value: '2000516763502120962', hasAction: true },
  { label: '绑定手机号', value: '18852892830', hasAction: false },
  { label: '密码', value: '修改密码', hasAction: false },
];
</script>

<template>
  <div class="profile-page">
    <main class="profile-main">
      <header class="profile-header">
        <h1>个人信息</h1>
        <p>管理您的个人信息和账户设置</p>
      </header>

      <section class="info-list" aria-label="个人信息">
        <div v-for="row in accountRows" :key="row.label" class="info-row">
          <span class="info-label">{{ row.label }}</span>
          <strong class="info-value">{{ row.value }}</strong>
          <button v-if="row.hasAction" class="icon-action" aria-label="更多操作"></button>
        </div>
      </section>
    </main>

    <nav class="profile-links" aria-label="个人中心导航">
      <a
        v-for="item in navItems"
        :key="item.label"
        :href="item.path"
        class="profile-link"
        :class="{ active: item.active }"
      >
        {{ item.label }}
      </a>
      <button class="more-entry">更多</button>
    </nav>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.profile-main {
  width: min(760px, calc(100% - 72px));
  margin: 0 auto;
  padding: 46px 0 24px;
}

.profile-header {
  margin-bottom: 26px;
}

.profile-header h1 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 28px;
  font-weight: 700;
}

.profile-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.info-list {
  background: transparent;
}

.info-row {
  position: relative;
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) 40px;
  align-items: center;
  min-height: 70px;
  border-bottom: 1px solid var(--border-soft);
}

.info-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.info-value {
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 500;
  word-break: break-word;
}

.icon-action {
  justify-self: end;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--text-muted);
}

.icon-action::before {
  content: '...';
  display: block;
  line-height: 18px;
  font-size: 18px;
  font-weight: 700;
}

.icon-action:hover {
  background: var(--border-soft);
}

.profile-links {
  width: min(760px, calc(100% - 72px));
  margin: 6px auto 0;
  padding: 18px 0 28px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-link,
.more-entry {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.profile-link {
  padding: 0 2px;
}

.profile-link.active {
  color: var(--primary-color);
  font-weight: 600;
}

.more-entry {
  margin-left: auto;
  padding: 0 12px;
  color: var(--text-secondary);
}

.profile-link:hover,
.more-entry:hover {
  color: var(--primary-color);
}

@media (max-width: 720px) {
  .profile-main,
  .profile-links {
    width: calc(100% - 28px);
  }

  .profile-main {
    padding-top: 28px;
  }

  .info-row {
    grid-template-columns: 96px minmax(0, 1fr) 32px;
  }
}
</style>
