import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#15161a',
        panel: '#1f2127',
        tile: '#2a2d35',
        edge: '#383c46',
      },
    },
  },
  plugins: [],
} satisfies Config;
