/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'inst-bg': '#05080E',
        'inst-panel': '#081019',
        'inst-grid': '#172536',
        'inst-border': '#1E3147',
        'inst-text-primary': '#D9E6F2',
        'inst-text-secondary': '#A0B5C8',
        'inst-bull': '#00E676',
        'inst-bear': '#FF4D57',
        'inst-neutral': '#90A4AE',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        'xxs': '0.65rem',
      }
    },
  },
  plugins: [],
}
