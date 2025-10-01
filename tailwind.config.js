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
        'state-success-bg': 'var(--color-state-success-bg)',
        'state-warning-bg': 'var(--color-state-warning-bg)',
        'state-danger-bg': 'var(--color-state-danger-bg)',
        'state-danger-text': 'var(--color-state-danger-text)',
        'state-danger-strong': 'var(--color-state-danger-strong)',
      },
      borderColor: theme => ({
        ...theme('colors'),
        'state-success-bg': 'var(--color-state-success-bg)',
        'state-warning-bg': 'var(--color-state-warning-bg)',
        'state-danger-bg': 'var(--color-state-danger-bg)',
      }),
      textColor: {
        primary: 'var(--color-primary)',
        brand: 'var(--color-brand)',
        'state-danger-text': 'var(--color-state-danger-text)',
      },
      accentColor: {
        primary: 'var(--color-primary)',
      },
    },
  },
  plugins: [],
}