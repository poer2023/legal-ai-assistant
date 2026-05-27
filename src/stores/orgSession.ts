import { computed, ref } from 'vue';

const SESSION_STORAGE_KEY = 'legal-demo-org-session-v2';
const MOCK_VERIFY_CODE = '112233';
const PUBLIC_DEMO_EMAIL = 'sinder@yongjian.com';
export const NO_ORGANIZATION_DEMO_EMAIL = 'no-org@yongjian.ai';
export const AUTH_FLOW_ENABLED = false;

export type MockOrganization = {
  id: string;
  name: string;
  shortName: string;
  avatarText: string;
  avatarDataUrl?: string;
  description?: string;
  role: string;
  memberCount: number;
  planName: string;
  storageUsage: string;
  questionUsage: string;
};

export type MockUser = {
  id: string;
  email: string;
  phone: string;
  displayName: string;
  avatarText: string;
  avatarDataUrl?: string;
  firmShortName?: string;
  bio?: string;
  yearsInPractice?: string;
  qualification?: string;
  expertise?: string[];
};

type OrgSessionState = {
  user: MockUser | null;
  organizations: MockOrganization[];
  currentOrganizationId: string;
};

const emptyState = (): OrgSessionState => ({
  user: null,
  organizations: [],
  currentOrganizationId: '',
});

const getSafeStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase().slice(0, 128);

const legacyPhoneForEmail = (email: string) => {
  let seed = 0;
  for (const char of email) seed = (seed * 31 + char.charCodeAt(0)) % 100000000;
  return `188${String(seed).padStart(8, '0').slice(0, 8)}`;
};

const emailLocalPart = (email: string) => email.split('@')[0] || email;
const avatarTextForEmail = (email: string) => emailLocalPart(email).slice(0, 1).toUpperCase() || '用';

const avatarTextForName = (displayName: string, email: string) =>
  displayName.trim().slice(0, 1).toUpperCase() || avatarTextForEmail(email);

const createUser = (email: string): MockUser => ({
  id: `user-${email.replace(/[^a-z0-9]+/gi, '-')}`,
  email,
  phone: legacyPhoneForEmail(email),
  displayName: `律师 · ${emailLocalPart(email)}`,
  avatarText: avatarTextForEmail(email),
});

const createOrganizationsForEmail = (email: string): MockOrganization[] => {
  if (email === NO_ORGANIZATION_DEMO_EMAIL) return [];

  const suffix = emailLocalPart(email).replace(/[^a-z0-9]/gi, '').slice(-4) || 'firm';
  const lastDigit = email.length % 10;

  return [
    {
      id: 'org-yongjian-law',
      name: 'XX律师事务所',
      shortName: 'XX团队',
      avatarText: 'X',
      role: '管理员',
      memberCount: 18 + lastDigit,
      planName: '专业版',
      storageUsage: '1.40GB / 100GB',
      questionUsage: '1,040次 / 50,000次',
    },
    {
      id: `org-corporate-legal-${suffix}`,
      name: `${suffix} 企业法务协作组织`,
      shortName: '企业法务',
      avatarText: '法',
      role: '成员',
      memberCount: 6 + (lastDigit % 5),
      planName: '协作版',
      storageUsage: '420MB / 20GB',
      questionUsage: '316次 / 10,000次',
    },
  ];
};

const createPublicDemoState = (): OrgSessionState => {
  const organizations = createOrganizationsForEmail(PUBLIC_DEMO_EMAIL);

  return {
    user: {
      ...createUser(PUBLIC_DEMO_EMAIL),
      id: 'public-demo-user',
      displayName: 'sinder',
      avatarText: 's',
      firmShortName: 'XX律师事务所',
      yearsInPractice: '12',
      qualification: '合伙人',
      expertise: ['跨境投融资', '并购重组', '私募基金'],
    },
    organizations,
    currentOrganizationId: organizations[0]?.id ?? '',
  };
};

const isOrganization = (value: unknown): value is MockOrganization => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MockOrganization>;
  return Boolean(
    item.id
    && item.name
    && item.shortName
    && item.avatarText
    && item.role
    && typeof item.memberCount === 'number'
    && item.planName
    && item.storageUsage
    && item.questionUsage,
  );
};

const readStoredSession = (): OrgSessionState => {
  const storage = getSafeStorage();
  if (!storage) return emptyState();

  try {
    const parsed = JSON.parse(storage.getItem(SESSION_STORAGE_KEY) || 'null') as Partial<OrgSessionState> | null;
    const user = parsed?.user;
    const organizations = Array.isArray(parsed?.organizations)
      ? parsed.organizations.filter(isOrganization)
      : [];
    const currentOrganizationId = typeof parsed?.currentOrganizationId === 'string'
      ? parsed.currentOrganizationId
      : '';

    if (
      !user
      || typeof user.id !== 'string'
      || typeof user.displayName !== 'string'
    ) {
      return emptyState();
    }

    const email = typeof user.email === 'string' && user.email
      ? normalizeEmail(user.email)
      : `${String(user.phone || 'user')}@firm.local`;
    const phone = typeof user.phone === 'string' && user.phone
      ? user.phone
      : legacyPhoneForEmail(email);

    return {
      user: {
        id: user.id,
        email,
        phone,
        displayName: user.displayName,
        avatarText: typeof user.avatarText === 'string' ? user.avatarText : avatarTextForEmail(email),
        avatarDataUrl: typeof user.avatarDataUrl === 'string' ? user.avatarDataUrl : undefined,
        firmShortName: typeof user.firmShortName === 'string' ? user.firmShortName : undefined,
        bio: typeof user.bio === 'string' ? user.bio : undefined,
        yearsInPractice: typeof user.yearsInPractice === 'string' ? user.yearsInPractice : undefined,
        qualification: typeof user.qualification === 'string' ? user.qualification : undefined,
        expertise: Array.isArray(user.expertise)
          ? user.expertise.filter((item): item is string => typeof item === 'string').slice(0, 5)
          : undefined,
      },
      organizations,
      currentOrganizationId: organizations.some((org) => org.id === currentOrganizationId)
        ? currentOrganizationId
        : '',
    };
  } catch {
    return emptyState();
  }
};

const readSession = (): OrgSessionState => {
  const storedSession = readStoredSession();

  if (AUTH_FLOW_ENABLED) {
    return storedSession;
  }

  if (storedSession.user && storedSession.currentOrganizationId) {
    return storedSession;
  }

  return createPublicDemoState();
};

const state = ref<OrgSessionState>(readSession());

const persistSession = () => {
  const storage = getSafeStorage();
  if (!storage) return;
  if (!state.value.user) {
    storage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state.value));
};

const isValidMockEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidMockCode = (code: string) => code.trim() === MOCK_VERIFY_CODE;

export const getCurrentOrganizationId = () => state.value.currentOrganizationId;

export const getOrganizationScopedStorageKey = (baseKey: string, organizationId = getCurrentOrganizationId()) => {
  return organizationId ? `${baseKey}:${organizationId}` : baseKey;
};

export const useOrgSession = () => {
  const currentUser = computed(() => state.value.user);
  const organizations = computed(() => state.value.organizations);
  const currentOrganizationId = computed(() => state.value.currentOrganizationId);
  const currentOrganization = computed(() =>
    state.value.organizations.find((org) => org.id === state.value.currentOrganizationId) ?? null,
  );
  const isAuthenticated = computed(() => Boolean(state.value.user));
  const hasActiveOrganization = computed(() => Boolean(currentOrganization.value));

  const login = (rawEmail: string, code: string) => {
    const email = normalizeEmail(rawEmail);
    if (!isValidMockEmail(email) || !isValidMockCode(code)) {
      return {
        ok: false,
        message: '邮箱或验证码不正确',
      };
    }

    const previousOrganizationId = state.value.user?.email === email
      ? state.value.currentOrganizationId
      : '';
    const organizationsForUser = createOrganizationsForEmail(email);

    state.value = {
      user: createUser(email),
      organizations: organizationsForUser,
      currentOrganizationId: organizationsForUser.some((org) => org.id === previousOrganizationId)
        ? previousOrganizationId
        : '',
    };
    persistSession();

    return { ok: true };
  };

  const selectOrganization = (organizationId: string) => {
    const nextOrganization = state.value.organizations.find((org) => org.id === organizationId);
    if (!nextOrganization) return false;

    state.value = {
      ...state.value,
      currentOrganizationId: nextOrganization.id,
    };
    persistSession();
    return true;
  };

  const removeOrganization = (organizationId: string) => {
    const nextOrganizations = state.value.organizations.filter((org) => org.id !== organizationId);
    if (nextOrganizations.length === state.value.organizations.length) return false;

    state.value = {
      ...state.value,
      organizations: nextOrganizations,
      currentOrganizationId: state.value.currentOrganizationId === organizationId
        ? nextOrganizations[0]?.id ?? ''
        : state.value.currentOrganizationId,
    };
    persistSession();
    return true;
  };

  const updateOrganizationProfile = (
    organizationId: string,
    profile: {
      name?: string;
      shortName?: string;
      avatarText?: string;
      avatarDataUrl?: string;
      description?: string;
    },
  ) => {
    const targetIndex = state.value.organizations.findIndex((org) => org.id === organizationId);
    if (targetIndex < 0) return false;

    const current = state.value.organizations[targetIndex]!;
    const name = profile.name?.trim() || current.name;
    const shortName = profile.shortName?.trim() || current.shortName;
    const avatarText = profile.avatarText?.trim().slice(0, 1) || name.slice(0, 1) || current.avatarText;
    const avatarDataUrl = profile.avatarDataUrl !== undefined
      ? profile.avatarDataUrl.trim() || undefined
      : current.avatarDataUrl;
    const description = profile.description !== undefined
      ? profile.description.trim()
      : current.description;

    const nextOrganizations = [...state.value.organizations];
    nextOrganizations[targetIndex] = {
      ...current,
      name,
      shortName,
      avatarText,
      avatarDataUrl,
      description: description || undefined,
    };

    state.value = {
      ...state.value,
      organizations: nextOrganizations,
    };
    persistSession();
    return true;
  };

  const updateUserProfile = (profile: {
    displayName: string;
    avatarDataUrl?: string;
    firmShortName?: string;
    bio?: string;
    yearsInPractice?: string;
    qualification?: string;
    expertise?: string[];
  }) => {
    if (!state.value.user) return false;

    const displayName = profile.displayName.trim() || state.value.user.displayName;
    const avatarDataUrl = profile.avatarDataUrl?.trim();
    const firmShortName = profile.firmShortName?.trim();
    const bio = profile.bio?.trim();
    const yearsInPractice = profile.yearsInPractice?.trim();
    const qualification = profile.qualification?.trim();
    const expertise = Array.isArray(profile.expertise)
      ? profile.expertise.map((item) => item.trim()).filter(Boolean).slice(0, 5)
      : undefined;
    state.value = {
      ...state.value,
      user: {
        ...state.value.user,
        displayName,
        avatarText: avatarTextForName(displayName, state.value.user.email),
        avatarDataUrl: avatarDataUrl || undefined,
        firmShortName: firmShortName || undefined,
        bio: bio || undefined,
        yearsInPractice: yearsInPractice || undefined,
        qualification: qualification || undefined,
        expertise: expertise?.length ? expertise : undefined,
      },
    };
    persistSession();
    return true;
  };

  const logout = () => {
    state.value = AUTH_FLOW_ENABLED ? emptyState() : createPublicDemoState();
    persistSession();
  };

  return {
    currentUser,
    organizations,
    currentOrganizationId,
    currentOrganization,
    hasActiveOrganization,
    isAuthenticated,
    login,
    logout,
    normalizeEmail,
    removeOrganization,
    selectOrganization,
    updateUserProfile,
    updateOrganizationProfile,
  };
};
