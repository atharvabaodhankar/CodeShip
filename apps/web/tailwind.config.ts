import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#ffffff',
        border: '#262626', // Stark border gray
        card: {
          DEFAULT: '#0a0a0a', // Dark dashboard card
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#171717',
          foreground: '#a3a3a3', // Muted text gray
        },
        accent: {
          DEFAULT: '#ffffff',
          foreground: '#000000',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
