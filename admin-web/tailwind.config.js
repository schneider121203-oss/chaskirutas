/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF8C00',
          dark: '#FF5722',
        },
        ink: {
          900: '#0A0F1E',
          800: '#111827',
          700: '#1A2235',
          600: '#253047',
        },
      },
    },
  },
  plugins: [],
};
