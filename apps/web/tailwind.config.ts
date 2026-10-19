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
          dark: '#0F1115',
        },
        surface: {
          1: {
            light: '#FFFFFF',
            dark: '#17191E',
          },
          2: {
            light: '#F4F4F1',
            dark: '#1F2228',
          },
          3: {
            light: '#EAEAE5',
            dark: '#282C34',
          },
        },
        borderNeutral: {
          subtle: {
            light: '#E2E2DC',
            dark: '#2C3038',
          },
          strong: {
            light: '#C8C8C0',
            dark: '#3E434E',
          },
        },
        brand: {
          teal: {
            50: '#F0FDFA',
            100: '#CCFBF1',
            200: '#99F6E4',
            300: '#5EEAD4',
            400: '#2DD4BF',
            500: '#14B8A6',
            600: '#0D9488',
            700: '#0F766E',
            800: '#115E59',
            900: '#134E4A',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
