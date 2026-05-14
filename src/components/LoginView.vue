<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, Smartphone } from 'lucide-vue-next';
import legalLogo from '../assets/legal-logo.png';
import { NO_ORGANIZATION_DEMO_PHONE, useOrgSession } from '../stores/orgSession';

const route = useRoute();
const router = useRouter();
const { login, normalizePhone } = useOrgSession();

const phone = ref('');
const code = ref('');
const errorMessage = ref('');
const codeMessage = ref('');
const isSubmitting = ref(false);

const normalizedPhone = computed(() => normalizePhone(phone.value));
const canSubmit = computed(() => normalizedPhone.value.length === 11 && code.value.trim().length > 0);

const getRedirectTarget = () => {
  const redirect = route.query.redirect;
  if (typeof redirect !== 'string' || !redirect || redirect.startsWith('/login')) return '/';
  return redirect;
};

const handlePhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  phone.value = normalizePhone(target.value);
};

const handleSendCode = () => {
  errorMessage.value = '';
  if (normalizedPhone.value.length !== 11) {
    errorMessage.value = '请输入 11 位手机号';
    return;
  }
  codeMessage.value = '验证码已发送';
};

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  const result = login(normalizedPhone.value, code.value);
  if (!result.ok) {
    errorMessage.value = result.message || '手机号或验证码不正确';
    isSubmitting.value = false;
    return;
  }

  await router.replace({
    name: 'org-select',
    query: {
      redirect: getRedirectTarget(),
    },
  });
};
</script>

<template>
  <main class="login-page">
    <section class="login-panel" aria-label="手机号登录">
      <div class="brand-row">
        <span class="brand-logo">
          <img :src="legalLogo" alt="涌见AI" />
        </span>
        <span class="brand-name">涌见AI 法律版</span>
      </div>

      <div class="panel-heading">
        <h1>手机号登录</h1>
        <p>登录后选择组织进入工作台</p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>手机号</span>
          <input
            :value="phone"
            inputmode="numeric"
            autocomplete="tel"
            maxlength="11"
            placeholder="请输入手机号"
            @input="handlePhoneInput"
          />
        </label>

        <label class="field">
          <span>短信验证码</span>
          <div class="code-field">
            <input
              v-model="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="请输入验证码"
            />
            <button type="button" @click="handleSendCode">获取验证码</button>
          </div>
        </label>

        <div class="form-message" :class="{ error: errorMessage }">
          {{ errorMessage || codeMessage || `验证码固定为 112233；无团队演示账号 ${NO_ORGANIZATION_DEMO_PHONE}` }}
        </div>

        <button class="submit-button" type="submit" :disabled="!canSubmit || isSubmitting">
          <Smartphone :size="18" />
          <span>{{ isSubmitting ? '登录中' : '登录并选择组织' }}</span>
          <ArrowRight :size="18" />
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(248, 250, 252, 0) 42%),
    var(--bg-color);
}

.login-panel {
  width: min(420px, 100%);
  padding: 32px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
}

.brand-logo {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--primary-soft);
  overflow: hidden;
}

.brand-logo img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.brand-name {
  color: var(--text-strong);
  font-size: 15px;
  font-weight: 650;
}

.panel-heading {
  margin-bottom: 26px;
}

.panel-heading h1 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 650;
}

.panel-heading p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
}

.field input {
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-strong);
  font-size: 15px;
}

.field input:focus {
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
}

.code-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.code-field button {
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.code-field button:hover {
  background: var(--primary-soft);
}

.form-message {
  min-height: 20px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 20px;
}

.form-message.error {
  color: var(--diff-removed);
}

.submit-button {
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  background: var(--primary-color);
  color: var(--on-primary);
  font-size: 15px;
  font-weight: 650;
}

.submit-button:disabled {
  cursor: not-allowed;
  background: var(--text-muted);
}

.submit-button:not(:disabled):hover {
  background: var(--primary-hover);
}

@media (max-width: 520px) {
  .login-page {
    align-items: stretch;
    padding: 0;
  }

  .login-panel {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .code-field {
    grid-template-columns: 1fr;
  }
}
</style>
