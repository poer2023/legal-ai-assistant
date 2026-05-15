import skillAvatarSpriteUrl from '../assets/skill-avatar-sprite.webp';
import type { SkillCatalogItem } from './skillCatalog';

const avatarColumns = 6;
const avatarRows = 6;
const avatarCount = avatarColumns * avatarRows;

const getStableHash = (value: string) => {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
};

export const getSkillAvatarStyle = (
  skill: Pick<SkillCatalogItem, 'id' | 'name' | 'category' | 'iconDataUrl'>,
) => {
  if (skill.iconDataUrl) {
    return {
      backgroundImage: `url("${skill.iconDataUrl}")`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  }

  const seed = `${skill.id}|${skill.category}|${skill.name}`;
  const avatarIndex = getStableHash(seed) % avatarCount;
  const column = avatarIndex % avatarColumns;
  const row = Math.floor(avatarIndex / avatarColumns);
  const x = column === 0 ? 0 : (column / (avatarColumns - 1)) * 100;
  const y = row === 0 ? 0 : (row / (avatarRows - 1)) * 100;

  return {
    backgroundImage: `url(${skillAvatarSpriteUrl})`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${avatarColumns * 100}% ${avatarRows * 100}%`,
  };
};
