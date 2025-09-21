/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        brand: 'var(--color-brand)',
      },
      textColor: {
        primary: 'var(--color-primary)',
        brand: 'var(--color-brand)',
      },
      accentColor: {
        primary: 'var(--color-primary)',
      },
    },
  },
  plugins: [],
}