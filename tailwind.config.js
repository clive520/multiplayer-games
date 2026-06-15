/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // IMPROVEMENTS #18：啟用 class-based dark mode
  // 預設 html 有 class="dark"（保持向後相容）
  // 切換 light mode 時移除 dark class
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
