export type MockSkillAuthor = {
  name: string;
  avatarUrl: string;
};

export const mockSkillAuthors: MockSkillAuthor[] = [
  { name: '顾明远', avatarUrl: '/mock-skill-authors/author-01.webp' },
  { name: '林若澜', avatarUrl: '/mock-skill-authors/author-02.webp' },
  { name: '周知行', avatarUrl: '/mock-skill-authors/author-03.webp' },
  { name: '沈安宁', avatarUrl: '/mock-skill-authors/author-04.webp' },
  { name: '许景川', avatarUrl: '/mock-skill-authors/author-05.webp' },
  { name: '陈清禾', avatarUrl: '/mock-skill-authors/author-06.webp' },
  { name: '赵亦衡', avatarUrl: '/mock-skill-authors/author-07.webp' },
  { name: '梁书妍', avatarUrl: '/mock-skill-authors/author-08.webp' },
  { name: '孙启明', avatarUrl: '/mock-skill-authors/author-09.webp' },
  { name: '唐予安', avatarUrl: '/mock-skill-authors/author-10.webp' },
  { name: '何景初', avatarUrl: '/mock-skill-authors/author-11.webp' },
  { name: '陆明薇', avatarUrl: '/mock-skill-authors/author-12.webp' },
  { name: '高云岚', avatarUrl: '/mock-skill-authors/author-13.webp' },
  { name: '郑嘉言', avatarUrl: '/mock-skill-authors/author-14.webp' },
  { name: '王砚舟', avatarUrl: '/mock-skill-authors/author-15.webp' },
  { name: '叶知夏', avatarUrl: '/mock-skill-authors/author-16.webp' },
  { name: '曹亦辰', avatarUrl: '/mock-skill-authors/author-17.webp' },
  { name: '姚思衡', avatarUrl: '/mock-skill-authors/author-18.webp' },
  { name: '钟语桐', avatarUrl: '/mock-skill-authors/author-19.webp' },
  { name: '方谨行', avatarUrl: '/mock-skill-authors/author-20.webp' },
  { name: '蒋云深', avatarUrl: '/mock-skill-authors/author-21.webp' },
  { name: '宋知夏', avatarUrl: '/mock-skill-authors/author-22.webp' },
  { name: '程予衡', avatarUrl: '/mock-skill-authors/author-23.webp' },
  { name: '罗清越', avatarUrl: '/mock-skill-authors/author-24.webp' },
  { name: '秦承言', avatarUrl: '/mock-skill-authors/author-25.webp' },
];

const getStableHash = (value: string) => {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
};

export const getMockSkillAuthorByIndex = (index: number) =>
  mockSkillAuthors[Math.abs(index) % mockSkillAuthors.length]!;

export const getMockSkillAuthor = (seed: string, offset = 0) =>
  getMockSkillAuthorByIndex(getStableHash(seed) + offset);
