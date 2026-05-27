import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        primary:        "#8B2020",
        "primary-dark": "#6B1515",
        "primary-light":"#fdf0f0",
        secondary:      "#fbbf24",
        cream: {
          50:  '#fefdf8',
          100: '#fdf9ef',
          200: '#ede8df',
          300: '#dfd6c5',
          400: '#c9b88a',
        },
        wood: {
          50:  '#ece2d8',
          100: '#d7c1ad',
          200: '#bc987d',
          300: '#9c7356',
          400: '#7b523d',
          500: '#633b2d',
          600: '#482a22',
          700: '#2d1b16',
        },
        gold: {
          400: '#f59e0b',
          500: '#d97706',
        },
        gray: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
    },
  },
  plugins: [],
};
export default config;
