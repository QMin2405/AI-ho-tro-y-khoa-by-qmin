/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'medical-blue': {
          'light': '#3b82f6',
          'dark': '#60a5fa',
        },
        'tip-yellow': {
          'light': '#fef9c3',
          'dark': '#423d1d'
        },
        'warning-red': {
          'light': '#fee2e2',
          'dark': '#4c2020'
        },
        'brand-primary': '#1d4ed8',
        'brand-secondary': '#3b82f6'
      },
      keyframes: {
        'shine': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
         'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'heartbeat': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        }
      },
      animation: {
        'shine': 'shine 1s ease-in-out',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      }
    }
  },
  plugins: [],
}
