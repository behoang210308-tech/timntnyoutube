const MARKET_LANGUAGE_MAP: Record<string, string> = {
  US: 'English',
  GB: 'English',
  AU: 'English',
  CA: 'English',
  NZ: 'English',
  VN: 'Vietnamese',
  JP: 'Japanese',
  KR: 'Korean',
  SG: 'English',
  HK: 'Chinese',
  DE: 'German',
  NL: 'Dutch',
  BR: 'Portuguese',
  IN: 'Hindi/English',
};

const ANGLES = [
  'sai lầm phổ biến',
  'thói quen giúp tăng tốc',
  'case study thật',
  'template làm nhanh',
  'checklist 5 bước',
  'before/after',
  'đối đầu quan điểm',
  'giải thích cho người mới',
  'bí mật ít người nói',
  'phiên bản nâng cao',
];

export const generateIdeaAngles = (keyword: string, market: string): string[] => {
  if (!keyword.trim()) return [];

  const normalized = keyword.trim();
  const language = MARKET_LANGUAGE_MAP[market] || 'Local language';

  return ANGLES.slice(0, 8).map((angle, index) => {
    if (index % 2 === 0) return `${normalized}: ${angle}`;
    return `${normalized} (${language} market): ${angle}`;
  });
};

export const generateKeywordExpansions = (keyword: string, market: string): string[] => {
  if (!keyword.trim()) return [];

  const root = keyword.trim();
  const variants = [
    `${root} for beginners`,
    `${root} step by step`,
    `${root} shorts`,
    `${root} case study`,
    `${root} mistakes`,
    `${root} explained`,
    `${root} 2026`,
    `${root} ${market.toLowerCase()}`,
    `best ${root} strategy`,
    `${root} without showing face`,
  ];

  return [...new Set(variants)];
};
