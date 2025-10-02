/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'border-pending',
    'border-confirmed',
    'border-cancelled',
    'border-l-4',
    'border-l-pending',
    'border-l-confirmed',
    'border-l-cancelled',
    'text-pending',
    'text-confirmed',
    'text-cancelled',
    'border',
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
        // Colores de estado fijos para bordes
        pending: '#FFD700',    // Amarillo
        confirmed: '#32CD32',  // Verde lima
        cancelled: '#FF4500',  // Rojo naranja
        completed: '#1E90FF',  // Azul (opcional, para completados)
      },
      borderColor: theme => ({
        ...theme('colors'),
        pending: theme('colors.pending'),
        confirmed: theme('colors.confirmed'),
        cancelled: theme('colors.cancelled'),
        completed: theme('colors.completed'),
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