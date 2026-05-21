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
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        primary: "#8B2020",
        "primary-dark": "#6B1515",
        "primary-light": "#fdf0f0",
        secondary: "#fbbf24",
        cream: {
          50:  '#fefdf8',
          100: '#fdf9ef',
          200: '#f0e8d5',
          300: '#e2d4b2',
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
        // Override gray with zinc values (no blue tint)
        gray: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
    },
  },
  plugins: [],
};
export default config;
