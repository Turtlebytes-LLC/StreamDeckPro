/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'deck-bg': '#f5f7fa',
        'deck-bg-dark': '#0d0d0d',
        'deck-card': '#ffffff',
        'deck-card-dark': '#1a1a1a',
        'deck-sidebar': '#141414',
        'deck-primary': '#0e7afe',
        'deck-primary-hover': '#0a5fd1',
        'deck-accent': '#0078d4',
        'deck-success': '#10b981',
        'deck-success-hover': '#059669',
        'deck-warning': '#f59e0b',
        'deck-warning-hover': '#d97706',
        'deck-danger': '#ff2a2a',
        'deck-danger-hover': '#e51f1f',
        'deck-purple': '#a855f7',
        'deck-purple-hover': '#9333ea',
        'deck-pink': '#ec4899',
        'deck-pink-hover': '#db2777',
        'deck-teal': '#14b8a6',
        'deck-teal-hover': '#0d9488',
        'deck-border': '#e5e7eb',
        'deck-border-dark': '#2a2a2a',
        'deck-text': '#ffffff',
        'deck-text-muted': '#969696',
        'deck-hover': '#252525',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'glow-blue': '0 0 20px rgba(14, 122, 254, 0.4)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
        'elgato': '0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)',
        'elgato-hover': '0 4px 16px rgba(14, 122, 254, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4)',
        'elgato-active': '0 0 0 3px rgba(14, 122, 254, 0.5), 0 4px 16px rgba(14, 122, 254, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
        'deck-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'deck-gradient-dark': 'linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%)',
      },
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
