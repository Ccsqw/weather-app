/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sky-from': '#4E9FE6',
        'sky-to': '#6FB8F0',
        good: '#34C759',
      },
      fontSize: {
        temp: ['96px', { lineHeight: '1', fontWeight: '200' }],
        city: ['34px', { lineHeight: '1.2', fontWeight: '600' }],
        metric: ['30px', { lineHeight: '1.2', fontWeight: '400' }],
      },
      borderRadius: { card: '16px' },
      backdropBlur: { card: '20px' },
    },
  },
  plugins: [],
};