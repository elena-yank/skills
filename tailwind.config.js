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
          gold: '#E1B12F',
          green: '#1A472A',
          silver: '#5D5D5D',
          blue: '#0F1D3A',
          bronze: '#946B2D',
          black: '#000000',
          parchment: '#F0E6D2',
          ink: '#1A1A1A',
        }
      },
      fontFamily: {
        magical: ['Cinzel', 'serif'],
        harry: ['Ruslan Display', 'cursive'],
        seminaria: ['Lumos', 'serif'],
        body: ['Crimson Text', 'serif'],
        nexa: ['RobotoforLearning-Medium_0', 'sans-serif'],
        century: ['CenturyGothicPaneuropeanRegular', 'sans-serif'],
      },
      backgroundImage: {
        'parchment': "url('https://www.transparenttextures.com/patterns/aged-paper.png')",
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
