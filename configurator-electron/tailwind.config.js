/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        'deck-bg': '#f5f7fa',
        'deck-card': '#ffffff',
        'deck-primary': '#3b82f6',
        'deck-success': '#10b981',
        'deck-warning': '#f59e0b',
        'deck-danger': '#ef4444',
        'deck-purple': '#8b5cf6',
        'deck-pink': '#ec4899',
        'deck-teal': '#14b8a6',
      }
    },
  },
  plugins: [],
}
