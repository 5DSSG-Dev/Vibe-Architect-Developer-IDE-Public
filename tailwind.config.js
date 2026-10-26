/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#080b10',
        'obsidian-light': '#0d131e',
        'neon-cyan': '#00f3ff',
        'neon-emerald': '#00ff9d',
        'neon-amber': '#ffb000',
        'neon-crimson': '#ff2a6d',
        'neon-violet': '#a855f7',
        'neon-blue': '#00a2ff',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'glow-pulse': 'glowPulse 2s infinite ease-in-out',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0, 243, 255, 0.4), inset 0 0 15px rgba(0, 243, 255, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 243, 255, 0.8), inset 0 0 25px rgba(0, 243, 255, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
