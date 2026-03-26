import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Hanson-inspired dark palette for FreteCheck
        dark: {
          900: '#0B1628',  // main background
          800: '#132035',  // cards / elevated
          700: '#1C2E47',  // hover bg / subtle
          600: '#243650',  // borders
          500: '#4E5D70',  // hover borders
        },
        brand: {
          50: '#FFF1EC',
          100: '#FFD6C7',
          200: '#FFB8A0',
          300: '#FF9A78',
          400: '#F87A51',
          500: '#F05A1A',  // primary accent (Hanson orange)
          600: '#C44510',
          700: '#983508',
          800: '#6D2504',
          900: '#411502',
        },
        teal: {
          400: '#00C9A7',
          500: '#009E83',
          600: '#007A64',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#D0D7E2',
          muted: '#8A97AB',
        },
        success: '#00C9A7',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
