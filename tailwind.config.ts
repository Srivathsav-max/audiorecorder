/** @type {import('tailwindcss').Config} */
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'wave-slow': 'wave 8s ease-in-out infinite',
        'wave-medium': 'wave 6s ease-in-out infinite',
        'wave-fast': 'wave 4s ease-in-out infinite',
        'radiant-glow': 'radiant 2s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(-50%) scale(1)' },
          '50%': { transform: 'translateY(-50%) scale(1.2)' },
        },
        radiant: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.1)' },
        }
      },
    },
  },
  plugins: [],
}

export default config
