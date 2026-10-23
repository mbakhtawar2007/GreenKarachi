/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          forest: '#1B5E20',
          light: '#A5D6A7',
          medium: '#66BB6A',
        },
        neutral: {
          dark: '#4A4A4A',
          medium: '#757575',
          light: '#E0E0E0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(20, 83, 45, 0.08)',
        lift: '0 16px 40px rgba(20, 83, 45, 0.14)',
      },
    },
  },
  plugins: [],
}
