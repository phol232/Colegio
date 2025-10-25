/** @type {import('tailwindcss').Config} */
export default {
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
        // Neutros
        background: {
          DEFAULT: '#F5F7FA',
          white: '#FFFFFF',
        },
        text: {
          DEFAULT: '#1F2937',
          secondary: '#6B7280',
        },
        border: {
          DEFAULT: '#E5E7EB',
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
  plugins: [],
}
