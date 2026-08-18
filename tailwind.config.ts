import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1F4E2C',
          light: '#2F6B3F',
          pale: '#EAF1EB',
        },
        gold: '#8A6D3A',
      },
    },
  },
  plugins: [],
};
export default config;
