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
        // Theme-aware surface colors (swap via CSS vars)
        dark: {
          900: 'rgb(var(--c-dark-900) / <alpha-value>)',
          800: 'rgb(var(--c-dark-800) / <alpha-value>)',
          700: 'rgb(var(--c-dark-700) / <alpha-value>)',
          600: 'rgb(var(--c-dark-600) / <alpha-value>)',
          500: 'rgb(var(--c-dark-500) / <alpha-value>)',
        },
        // Theme-aware text colors
        text: {
          primary: 'rgb(var(--c-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--c-text-muted) / <alpha-value>)',
        },
        // Static brand colors (same on both themes)
        brand: {
          50: '#FFF1EC',
          100: '#FFD6C7',
          200: '#FFB8A0',
          300: '#FF9A78',
          400: '#F87A51',
          500: '#F05A1A',
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
