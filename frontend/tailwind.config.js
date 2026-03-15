import { breakpoints } from './src/shared/constants/breakpoints.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    screens: breakpoints,
    extend: {},
  },
  plugins: [],
};
