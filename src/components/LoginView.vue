<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';
import LawAgentsLogoIcon from './icons/LawAgentsLogoIcon.vue';
import { useOrgSession } from '../stores/orgSession';
import { useTheme } from '../stores/theme';

const route = useRoute();
const router = useRouter();
const { login, normalizePhone } = useOrgSession();
const { currentThemeId } = useTheme();

const phone = ref('');
const password = ref('');
const errorMessage = ref('');
const codeMessage = ref('');
const isSubmitting = ref(false);
const showPassword = ref(false);
const language = ref<'zh' | 'en'>('zh');

const normalizedPhone = computed(() => normalizePhone(phone.value));
const canSubmit = computed(() => normalizedPhone.value.length === 11 && password.value.trim().length > 0);
const themeClass = computed(() => `login-page--${currentThemeId.value}`);
const isChinese = computed(() => language.value === 'zh');
const copy = computed(() => {
  if (isChinese.value) {
    return {
      brand: '涌见 AI',
      heroTitle: '为法律而造， 因律师而生',
      heroSubtitle: 'Built for Law, with Lawyers.',
      partner: '北大法律人工智能实验室战略合作',
      title: '欢迎登录',
      phoneLabel: '手机号',
      phonePlaceholder: '请输入 11 位手机号',
      passwordLabel: '密码',
      passwordPlaceholder: '首次登录密码为手机号后六位',
      passwordHint: '首次登录密码为手机号后六位。',
      forgot: '忘记密码?',
      login: '登录',
      loggingIn: '登录中',
      phoneError: '请输入 11 位手机号',
      authError: '手机号或密码不正确',
      resetHint: '请联系组织管理员重置密码',
      agreementPrefix: '登录即表示同意',
      service: '服务协议',
      privacy: '隐私政策',
      agreementJoiner: '与',
      copyright: '© 2026 上海涌见科技有限公司',
      showPassword: '显示密码',
      hidePassword: '隐藏密码',
    };
  }

  return {
    brand: 'Yongjian AI',
    heroTitle: 'Built for Law, with Lawyers.',
    heroSubtitle: 'Legal intelligence shaped with practicing lawyers.',
    partner: 'Strategic partner of PKU Legal AI Lab',
    title: 'Welcome back',
    phoneLabel: 'Phone',
    phonePlaceholder: 'Enter 11-digit phone number',
    passwordLabel: 'Password',
    passwordPlaceholder: 'First password is the last 6 digits',
    passwordHint: 'For first login, use the last six digits of your phone number.',
    forgot: 'Forgot?',
    login: 'Sign in',
    loggingIn: 'Signing in',
    phoneError: 'Enter an 11-digit phone number',
    authError: 'Incorrect phone number or password',
    resetHint: 'Contact your organization admin to reset the password',
    agreementPrefix: 'By signing in, you agree to the',
    service: 'Terms',
    privacy: 'Privacy Policy',
    agreementJoiner: 'and',
    copyright: '© 2026 Shanghai Yongjian Technology Co., Ltd.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  };
});

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
    errorMessage.value = copy.value.phoneError;
    return;
  }
  codeMessage.value = copy.value.resetHint;
};

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  const result = login(normalizedPhone.value, password.value);
  if (!result.ok) {
    errorMessage.value = result.message || copy.value.authError;
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
  <main class="login-page" :class="themeClass">
    <section class="login-hero" aria-label="品牌介绍">
      <div class="brand-row">
        <LawAgentsLogoIcon :size="48" :radius="12" />
        <span class="brand-name">{{ copy.brand }}</span>
      </div>

      <div class="hero-copy">
        <h1>{{ copy.heroTitle }}</h1>
        <p>{{ copy.heroSubtitle }}</p>
      </div>

      <p class="hero-partner">{{ copy.partner }}</p>
    </section>

    <section class="login-content" :aria-label="copy.title">
      <div class="language-switch" role="group" aria-label="Language">
        <button type="button" :class="{ active: language === 'zh' }" @click="language = 'zh'">中文</button>
        <button type="button" :class="{ active: language === 'en' }" @click="language = 'en'">EN</button>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <h2>{{ copy.title }}</h2>

        <div class="field">
          <label for="login-phone">{{ copy.phoneLabel }}</label>
          <div class="phone-row">
            <button class="country-code" type="button" aria-label="+86">
              <span class="country-flag" aria-hidden="true"></span>
              <span>+86</span>
            </button>
            <input
              id="login-phone"
              :value="phone"
              inputmode="numeric"
              autocomplete="tel"
              maxlength="11"
              :placeholder="copy.phonePlaceholder"
              @input="handlePhoneInput"
            />
          </div>
        </div>

        <div class="field">
          <div class="label-row">
            <label for="login-password">{{ copy.passwordLabel }}</label>
            <button class="forgot-button" type="button" @click="handleSendCode">{{ copy.forgot }}</button>
          </div>
          <div class="password-field">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              maxlength="32"
              :placeholder="copy.passwordPlaceholder"
            />
            <button
              class="password-toggle"
              type="button"
              :aria-label="showPassword ? copy.hidePassword : copy.showPassword"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="16" />
              <Eye v-else :size="16" />
            </button>
          </div>
          <p class="password-hint">{{ codeMessage || copy.passwordHint }}</p>
        </div>

        <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>

        <button class="submit-button" type="submit" :disabled="!canSubmit || isSubmitting">
          {{ isSubmitting ? copy.loggingIn : copy.login }}
        </button>

        <p class="agreement">
          {{ copy.agreementPrefix }}
          <a href="#" @click.prevent>{{ copy.service }}</a>
          {{ copy.agreementJoiner }}
          <a href="#" @click.prevent>{{ copy.privacy }}</a>。
        </p>
      </form>

      <p class="login-copyright">{{ copy.copyright }}</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  --login-serif: var(--font-serif, 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', 'SimSun', Georgia, serif);
  --login-sans: var(--font-sans, 'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif);
  --login-left-bg:
    radial-gradient(circle at 22% 15%, rgba(76, 57, 38, 0.42), transparent 32%),
    radial-gradient(circle at 54% 86%, rgba(126, 86, 42, 0.44), transparent 38%),
    linear-gradient(135deg, #30261f 0%, #171311 62%, #241b15 100%);
  --login-left-text: #f6efe0;
  --login-left-muted: rgba(246, 239, 224, 0.58);
  --login-right-bg: var(--bg-color);
  --login-panel-text: var(--text-strong);
  --login-label: var(--text-secondary);
  --login-muted: var(--text-muted);
  --login-input-bg: rgba(255, 255, 255, 0.7);
  --login-input-border: var(--border-color);
  --login-input-focus: var(--text-strong);
  --login-link: var(--primary-hover);
  --login-button: var(--primary-color);
  --login-button-hover: var(--primary-hover);
  --login-button-disabled: #aaa6a1;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(520px, 52.1fr) minmax(420px, 47.9fr);
  overflow: auto;
  background: var(--login-right-bg);
  color: var(--login-panel-text);
  font-family: var(--login-sans);
}

.login-page--classic {
  --login-left-bg:
    radial-gradient(circle at 18% 18%, rgba(37, 99, 235, 0.24), transparent 32%),
    radial-gradient(circle at 53% 88%, rgba(146, 122, 84, 0.38), transparent 36%),
    linear-gradient(135deg, #172033 0%, #111827 58%, #283247 100%);
  --login-left-text: #f8fafc;
  --login-left-muted: rgba(226, 232, 240, 0.66);
  --login-right-bg: #f8fafc;
  --login-input-bg: rgba(255, 255, 255, 0.9);
  --login-link: #2453c7;
}

.login-page--codex-theme-v1 {
  --login-left-bg:
    radial-gradient(circle at 19% 17%, rgba(1, 105, 204, 0.28), transparent 29%),
    radial-gradient(circle at 55% 88%, rgba(76, 99, 124, 0.25), transparent 36%),
    linear-gradient(135deg, #191d22 0%, #0d0d0d 64%, #20242a 100%);
  --login-left-text: #ffffff;
  --login-left-muted: rgba(255, 255, 255, 0.56);
  --login-right-bg: #ffffff;
  --login-input-bg: #ffffff;
  --login-button-disabled: #a3a3a3;
  --login-link: #0169cc;
}

.login-page--absolutely-theme-v1 {
  --login-left-bg:
    radial-gradient(circle at 20% 15%, rgba(204, 125, 94, 0.32), transparent 31%),
    radial-gradient(circle at 54% 86%, rgba(138, 101, 83, 0.34), transparent 38%),
    linear-gradient(135deg, #302927 0%, #1e1a18 63%, #3a2d27 100%);
  --login-left-text: #fff7f1;
  --login-left-muted: rgba(255, 247, 241, 0.56);
  --login-right-bg: #f9f9f7;
  --login-input-bg: rgba(255, 255, 255, 0.7);
  --login-link: #a96044;
}

.login-page--happycapy-paper-v1 {
  --login-left-bg:
    radial-gradient(circle at 20% 16%, rgba(255, 107, 74, 0.2), transparent 30%),
    radial-gradient(circle at 55% 86%, rgba(255, 205, 116, 0.28), transparent 36%),
    linear-gradient(135deg, #252321 0%, #111111 64%, #2b2520 100%);
  --login-left-text: #fdfbf7;
  --login-left-muted: rgba(253, 251, 247, 0.58);
  --login-right-bg: #f9f6f1;
  --login-input-bg: #fdfbf7;
  --login-link: #c2410c;
  --login-button-disabled: #aaa6a1;
}

.login-page--lawagents-standalone-v1 {
  --login-left-bg:
    radial-gradient(circle at 15% 12%, rgba(89, 62, 39, 0.4), transparent 30%),
    radial-gradient(circle at 49% 86%, rgba(137, 93, 42, 0.45), transparent 38%),
    linear-gradient(135deg, #2f251e 0%, #1a1513 58%, #271d16 100%);
  --login-left-text: #f6efe0;
  --login-left-muted: rgba(246, 239, 224, 0.58);
  --login-right-bg: #faf7f1;
  --login-input-bg: rgba(255, 255, 255, 0.72);
  --login-link: #c8552e;
  --login-button: #1a1614;
  --login-button-hover: #2d2520;
  --login-button-disabled: #aaa6a1;
}

.login-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: clamp(32px, 3.8vw, 58px) clamp(34px, 6.2vw, 74px) 48px;
  overflow: hidden;
  background: var(--login-left-bg);
  color: var(--login-left-text);
}

.login-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.026) 1px, transparent 1px);
  background-size: 5px 5px;
  opacity: 0.14;
}

.login-hero > * {
  position: relative;
  z-index: 1;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-name {
  color: var(--login-left-text);
  font-family: var(--login-serif);
  font-size: clamp(22px, 1.7vw, 29px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.hero-copy {
  width: min(620px, 100%);
  margin: auto auto auto;
  text-align: center;
}

.hero-copy h1 {
  margin: 0;
  color: var(--login-left-text);
  font-family: var(--login-serif);
  font-size: clamp(38px, 3.05vw, 55px);
  font-weight: 700;
  line-height: 1.28;
  letter-spacing: 0;
}

.hero-copy p {
  margin: 12px 0 0;
  color: var(--login-left-muted);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(17px, 1.25vw, 22px);
  font-style: italic;
  line-height: 1.45;
  letter-spacing: 0;
}

.hero-partner {
  margin: 0;
  color: var(--login-left-muted);
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}

.login-content {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px clamp(34px, 6.1vw, 74px) 80px;
  background: var(--login-right-bg);
}

.language-switch {
  position: absolute;
  top: 24px;
  right: 34px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 32px;
  padding: 3px;
  border: 1px solid var(--login-input-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--login-input-bg) 86%, transparent);
}

.language-switch button {
  min-width: 40px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--login-label);
  font-size: 12px;
  font-weight: 600;
  line-height: 24px;
}

.language-switch button.active {
  background: var(--login-button);
  color: var(--on-primary);
}

.login-form {
  width: min(420px, 100%);
  display: flex;
  flex-direction: column;
  gap: 17px;
}

.login-form h2 {
  margin: 0 0 24px;
  color: var(--login-panel-text);
  font-family: var(--login-serif);
  font-size: clamp(28px, 2.1vw, 34px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.field label,
.label-row label {
  color: var(--login-label);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.phone-row {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 8px;
}

.country-code,
.field input {
  height: 44px;
  border: 1px solid var(--login-input-border);
  border-radius: 8px;
  background: var(--login-input-bg);
  color: var(--login-panel-text);
}

.country-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 10px;
  color: var(--login-label);
  font-size: 13px;
}

.country-flag {
  position: relative;
  width: 14px;
  height: 10px;
  display: inline-block;
  overflow: hidden;
  border-radius: 1px;
  background: #d72f2f;
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.08);
}

.country-flag::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #f7d35d;
}

.field input {
  width: 100%;
  min-width: 0;
  padding: 0 14px;
  font-size: 14px;
  outline: none;
}

.field input:focus {
  border-color: var(--login-input-focus);
  box-shadow: 0 0 0 1px var(--login-input-focus);
}

.field input::placeholder {
  color: var(--login-muted);
}

.forgot-button {
  color: var(--login-link);
  font-size: 13px;
  line-height: 1.2;
}

.password-field {
  position: relative;
}

.password-field input {
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 11px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  color: var(--login-muted);
}

.password-hint {
  min-height: 18px;
  margin: 0;
  color: var(--login-muted);
  font-size: 12px;
  line-height: 18px;
}

.form-message {
  margin: -3px 0 0;
  font-size: 13px;
  line-height: 1.45;
}

.form-message.error {
  color: var(--diff-removed);
}

.submit-button {
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--login-button);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  transition: background 0.16s ease, transform 0.16s ease;
}

.submit-button:disabled {
  cursor: not-allowed;
  background: var(--login-button-disabled);
  color: rgba(255, 255, 255, 0.82);
}

.submit-button:not(:disabled):hover {
  background: var(--login-button-hover);
}

.submit-button:not(:disabled):active {
  transform: translateY(1px);
}

.agreement {
  margin: 16px 0 0;
  color: var(--login-muted);
  font-size: 12px;
  line-height: 1.8;
}

.agreement a {
  color: var(--login-panel-text);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.login-copyright {
  position: absolute;
  bottom: 45px;
  left: 50%;
  width: min(420px, calc(100% - 68px));
  margin: 0;
  transform: translateX(-50%);
  color: var(--login-muted);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-hero {
    min-height: 38vh;
    padding: 30px 28px;
  }

  .hero-copy {
    margin: 52px auto;
  }

  .hero-partner {
    margin-top: auto;
  }

  .login-content {
    min-height: 62vh;
    padding: 88px 28px 84px;
  }

  .login-copyright {
    bottom: 28px;
  }
}

@media (max-width: 560px) {
  .login-hero {
    min-height: 34vh;
    padding: 24px 20px;
  }

  .brand-row {
    gap: 10px;
  }

  .hero-copy {
    margin: 38px auto 30px;
    text-align: left;
  }

  .hero-copy h1 {
    max-width: 10em;
    font-size: 32px;
  }

  .hero-copy p,
  .hero-partner {
    text-align: left;
  }

  .login-content {
    align-items: flex-start;
    min-height: 66vh;
    padding: 80px 20px 82px;
  }

  .language-switch {
    top: 20px;
    right: 20px;
  }

  .login-form {
    width: 100%;
  }

  .phone-row {
    grid-template-columns: 66px minmax(0, 1fr);
    gap: 7px;
  }

  .country-code {
    padding: 0 8px;
  }

  .login-copyright {
    width: calc(100% - 40px);
    bottom: 24px;
  }
}
</style>
