/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          800: '#0d1219',
          700: '#131b24',
          600: '#1a2433',
          500: '#1e2a3a',
        },
        accent: {
          cyan: '#00f0ff',
          purple: '#b24bf3',
          green: '#00e676',
          amber: '#ffb020',
          red: '#ff6b7a',
          blue: '#4dabf7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -4px rgba(0, 240, 255, 0.4), 0 0 40px -12px rgba(0, 240, 255, 0.2)',
        'glow-purple': '0 0 20px -4px rgba(178, 75, 243, 0.35)',
        'glow-green': '0 0 20px -4px rgba(0, 230, 118, 0.35)',
        'card': '0 4px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        glowPulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
};
