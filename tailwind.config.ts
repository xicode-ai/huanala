import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-soft': '#4361EE',
        'electric-blue': '#0052FF',
        'electric-light': '#E0Eaff',
        'navy-blue': '#1e293b',
        marigold: '#FFAD1F',
        'marigold-light': '#FFE0B2',
        'background-light': '#FAFAFA',
        'background-soft': '#F5F7FA',
        'surface-white': '#FFFFFF',
        'text-main': '#1E293B',
        'text-sub': '#64748B',
        'chart-mint': '#6EE7B7',
        'chart-coral': '#FCA5A5',
        'chart-yellow': '#FDE047',
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        sc: ["'Noto Sans SC'", 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(0, 0, 0, 0.05)',
        glow: '0 8px 20px -4px rgba(37, 99, 235, 0.35)',
        card: '0 4px 20px -4px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
} satisfies Config;
