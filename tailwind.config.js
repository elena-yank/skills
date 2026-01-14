/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hogwarts: {
          red: '#740001',
          gold: '#D3A625',
          green: '#1A472A',
          silver: '#5D5D5D',
          blue: '#0E1A40',
          bronze: '#946B2D',
          black: '#000000',
          parchment: '#F0E6D2',
          ink: '#1A1A1A',
        }
      },
      fontFamily: {
        magical: ['Cinzel', 'serif'],
        harry: ['Ruslan Display', 'cursive'],
        seminaria: ['ProjectSeminaria', 'serif'],
        body: ['Crimson Text', 'serif'],
      },
      backgroundImage: {
        'parchment': "url('https://www.transparenttextures.com/patterns/aged-paper.png')",
      }
    },
  },
  plugins: [],
}
