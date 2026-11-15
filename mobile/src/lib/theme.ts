// Web版（Tailwind の stone / pink）に合わせた配色
export const colors = {
  bg: '#FAFAF9', // stone-50
  card: '#FFFFFF',
  border: '#F5F5F4', // stone-100
  borderStrong: '#E7E5E4', // stone-200
  text: '#1C1917', // stone-900
  textSub: '#57534E', // stone-600
  textMuted: '#A8A29E', // stone-400
  textFaint: '#D6D3D1', // stone-300
  chip: '#F5F5F4',
  pink: '#EC4899', // pink-500
  pinkSoft: '#FCE7F3', // pink-100
  danger: '#EF4444',
  warnBg: '#FEF3C7',
  warnText: '#B45309',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, full: 999 } as const;
