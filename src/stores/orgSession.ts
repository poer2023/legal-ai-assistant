import { computed, ref } from 'vue';

const SESSION_STORAGE_KEY = 'legal-demo-org-session-v1';
const MOCK_VERIFY_CODE = '112233';
export const NO_ORGANIZATION_DEMO_PHONE = '19900000000';

export type MockOrganization = {
  id: string;
  name: string;
  shortName: string;
  avatarText: string;
  role: string;
  memberCount: number;
  planName: string;
  storageUsage: string;
  questionUsage: string;
};

export type MockUser = {
  id: string;
  phone: string;
  displayName: string;
  avatarText: string;
  avatarDataUrl?: string;
  firmShortName?: string;
  bio?: string;
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

const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 11);

const maskPhone = (phone: string) => {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
};

const avatarTextForPhone = (phone: string) => phone.slice(-2) || '用';

const avatarTextForName = (displayName: string, phone: string) =>
  displayName.trim().slice(0, 1).toUpperCase() || avatarTextForPhone(phone);

const createUser = (phone: string): MockUser => ({
  id: `user-${phone}`,
  phone,
  displayName: maskPhone(phone),
  avatarText: avatarTextForPhone(phone),
});

const createOrganizationsForPhone = (phone: string): MockOrganization[] => {
  if (phone === NO_ORGANIZATION_DEMO_PHONE) return [];

  const suffix = phone.slice(-4);
  const lastDigit = Number(phone.slice(-1)) || 0;

  return [
    {
      id: 'org-yongjian-law',
      name: '涌见律所演示组织',
      shortName: '涌见律所',
      avatarText: '涌',
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

const readSession = (): OrgSessionState => {
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
      || typeof user.phone !== 'string'
      || typeof user.displayName !== 'string'
    ) {
      return emptyState();
    }

    return {
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        avatarText: typeof user.avatarText === 'string' ? user.avatarText : avatarTextForPhone(user.phone),
        avatarDataUrl: typeof user.avatarDataUrl === 'string' ? user.avatarDataUrl : undefined,
        firmShortName: typeof user.firmShortName === 'string' ? user.firmShortName : undefined,
        bio: typeof user.bio === 'string' ? user.bio : undefined,
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

const isValidMockPhone = (phone: string) => /^\d{11}$/.test(phone);

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

  const login = (rawPhone: string, code: string) => {
    const phone = normalizePhone(rawPhone);
    if (!isValidMockPhone(phone) || code.trim() !== MOCK_VERIFY_CODE) {
      return {
        ok: false,
        message: '手机号或验证码不正确',
      };
    }

    const previousOrganizationId = state.value.user?.phone === phone
      ? state.value.currentOrganizationId
      : '';
    const organizationsForUser = createOrganizationsForPhone(phone);

    state.value = {
      user: createUser(phone),
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

  const updateUserProfile = (profile: {
    displayName: string;
    avatarDataUrl?: string;
    firmShortName?: string;
    bio?: string;
  }) => {
    if (!state.value.user) return false;

    const displayName = profile.displayName.trim() || state.value.user.displayName;
    const avatarDataUrl = profile.avatarDataUrl?.trim();
    const firmShortName = profile.firmShortName?.trim();
    const bio = profile.bio?.trim();
    state.value = {
      ...state.value,
      user: {
        ...state.value.user,
        displayName,
        avatarText: avatarTextForName(displayName, state.value.user.phone),
        avatarDataUrl: avatarDataUrl || undefined,
        firmShortName: firmShortName || undefined,
        bio: bio || undefined,
      },
    };
    persistSession();
    return true;
  };

  const logout = () => {
    state.value = emptyState();
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
    normalizePhone,
    removeOrganization,
    selectOrganization,
    updateUserProfile,
  };
};
