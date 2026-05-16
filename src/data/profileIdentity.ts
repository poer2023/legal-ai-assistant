import type { SkillCatalogItem } from './skillCatalog';

type ProfileIdentity = {
  displayName?: string;
  avatarText?: string;
  avatarDataUrl?: string;
  firmShortName?: string;
  bio?: string;
} | null | undefined;

type SkillAuthorIdentity = Pick<
  SkillCatalogItem,
  'publisherName' | 'publisherAvatarUrl' | 'useProfileIdentity'
>;

export const shouldUseProfileIdentity = (skill: Pick<SkillCatalogItem, 'useProfileIdentity'>) =>
  skill.useProfileIdentity !== false;

export const getProfileDisplayName = (profile: ProfileIdentity) =>
  profile?.displayName?.trim() || '李律师';

export const getProfileAvatarText = (profile: ProfileIdentity) => {
  const displayName = getProfileDisplayName(profile);
  return profile?.avatarText?.trim() || displayName.slice(0, 1).toUpperCase() || '李';
};

export const getProfileAvatarStyle = (profile: ProfileIdentity) => {
  if (!profile?.avatarDataUrl) return {};
  return {
    backgroundImage: `url("${profile.avatarDataUrl}")`,
  };
};

export const getSkillAuthorName = (skill: SkillAuthorIdentity, profile: ProfileIdentity) =>
  shouldUseProfileIdentity(skill) ? getProfileDisplayName(profile) : skill.publisherName?.trim() || '';

export const getSkillAuthorAvatarText = (skill: SkillAuthorIdentity, profile: ProfileIdentity) => {
  const displayName = getSkillAuthorName(skill, profile);
  if (shouldUseProfileIdentity(skill)) {
    return getProfileAvatarText(profile);
  }
  return displayName.slice(0, 1).toUpperCase();
};

export const getSkillAuthorAvatarStyle = (skill: SkillAuthorIdentity, profile: ProfileIdentity) => {
  if (shouldUseProfileIdentity(skill)) {
    return getProfileAvatarStyle(profile);
  }
  if (!skill.publisherAvatarUrl) return {};
  return {
    backgroundImage: `url("${skill.publisherAvatarUrl}")`,
  };
};

export const hasSkillAuthorAvatarImage = (skill: SkillAuthorIdentity, profile: ProfileIdentity) =>
  shouldUseProfileIdentity(skill) ? Boolean(profile?.avatarDataUrl) : Boolean(skill.publisherAvatarUrl);

export const shouldShowSkillAuthor = (skill: SkillAuthorIdentity, profile: ProfileIdentity) =>
  Boolean(getSkillAuthorName(skill, profile));
