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
    },
  },
  plugins: [],
}

