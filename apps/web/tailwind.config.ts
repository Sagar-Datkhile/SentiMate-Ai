import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#FBFBFA',
          dark: '#000000',
        },
        surface: {
          1: {
            light: '#FFFFFF',
            dark: '#0D0E11',
          },
          2: {
            light: '#F4F4F1',
            dark: '#18191C',
          },
          3: {
            light: '#EAEAE5',
            dark: '#222327',
          },
        },
        borderNeutral: {
          subtle: {
            light: '#E2E2DC',
            dark: '#1F2024',
          },
          strong: {
            light: '#C8C8C0',
            dark: '#2E3036',
          },
        },
        brand: {
          primary: {
            DEFAULT: '#4F648C',
            hover: '#405374',
            light: '#4F648C',
            hoverLight: '#405374',
            dark: '#91A7D0',
            hoverDark: '#A6B9DC',
          },
          accent: {
            light: '#EEF2F8',
            dark: '#242E40',
          },
          slate: {
            50: '#F5F7FA',
            100: '#EEF2F8',
            200: '#D5DFEE',
            300: '#B8C9E2',
            400: '#91A7D0',
            500: '#6C83AB',
            600: '#4F648C',
            700: '#405374',
            800: '#303E57',
            900: '#242E40',
            950: '#151B26',
          },
          teal: {
            50: '#EEF2F8',
            100: '#D5DFEE',
            200: '#B8C9E2',
            300: '#91A7D0',
            400: '#91A7D0',
            500: '#6C83AB',
            600: '#4F648C',
            700: '#405374',
            800: '#303E57',
            900: '#242E40',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        instrument: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
