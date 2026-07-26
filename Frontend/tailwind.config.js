/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores principales del colegio
        primary: {
          DEFAULT: '#C62828',
          hover: '#B71C1C',
          disabled: '#EAB0B0',
        },
        secondary: {
          DEFAULT: '#0E2B5C',
          light: '#123766',
          hover: '#163B73',
        },
        info: {
          DEFAULT: '#17A2E5',
        },
        accent: {
          DEFAULT: '#F4C20D',
        },
        // Estados
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#DC2626',
        // Neutros (responden al tema vía CSS variables)
        background: {
          DEFAULT: 'rgb(var(--app-bg) / <alpha-value>)',
          white: 'rgb(var(--app-surface) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--app-text) / <alpha-value>)',
          secondary: 'rgb(var(--app-text-muted) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--app-border) / <alpha-value>)',
        },
        // Sidebar
        sidebar: {
          bg: '#0E2B5C',
          item: '#E5E7EB',
          active: '#123766',
          hover: '#163B73',
        },
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
}
