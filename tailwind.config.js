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
        // Primary color and its variations
        'primary': 'var(--sdk-primary-color)',
        'primary-light': 'var(--sdk-primary-light)',
        'primary-dark': 'var(--sdk-primary-dark)',

        // Secondary color and its variations
        'secondary': 'var(--sdk-secondary-color)',
        'secondary-light': 'var(--sdk-secondary-light)',
        'secondary-dark': 'var(--sdk-secondary-dark)',

        // Accent/danger color
        'accent': 'var(--sdk-accent-color)',
        'danger': 'var(--sdk-danger-color)',

        // Text colors
        'text-primary': 'var(--sdk-text-primary-color)',
        'text-secondary': 'var(--sdk-text-secondary-color)',

        // Background colors
        'bg-primary': 'var(--sdk-bg-primary-color)',
        'bg-secondary': 'var(--sdk-bg-secondary-color)',
      }
    },
  },
  plugins: [],
}

