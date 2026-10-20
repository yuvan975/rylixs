/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './context/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0b0a08',
        charcoal: '#141210',
        ivory: '#f7f4ee',
        parchment: '#efe9dd',
        gold: {
          50: '#fbf4e0',
          100: '#f3e2ab',
          200: '#e9cf7f',
          300: '#dcb75a',
          400: '#c9a227',
          500: '#b8860b',
          600: '#9a6f0c',
          700: '#785408',
        },
        bronze: '#8b6914',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.28em',
      },
      backgroundImage: {
        'gold-foil': 'linear-gradient(120deg, #785408 0%, #e9cf7f 22%, #fbf4e0 40%, #c9a227 55%, #785408 75%, #dcb75a 100%)',
        'gold-line': 'linear-gradient(90deg, transparent, #c9a227, transparent)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        drawLine: {
          '0%': { strokeDashoffset: 1000 },
          '100%': { strokeDashoffset: 0 },
        },
      },
      animation: {
        shimmer: 'shimmer 3.5s linear infinite',
        fadeUp: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
      },
    },
  },
  plugins: [],
};
