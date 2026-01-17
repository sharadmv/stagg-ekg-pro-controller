/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--bg-app)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          border: 'var(--border-subtle)',
        },
        coffee: {
          gold: 'var(--color-primary)',
          dim: 'var(--color-primary-dim)',
        },
        text: {
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
