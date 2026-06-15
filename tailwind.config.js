/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // IMPROVEMENTS #18：啟用 class-based dark mode
  // 預設 html 有 class="dark"（保持向後相容）
  // 切換 light mode 時移除 dark class
  darkMode: 'class',
  theme: {
    extend: {
      // 淺咖啡色系（IMPROVEMENTS #18 淺色模式背景）
      // - 50：最淺，body 主背景
      // - 100：稍深，card 背景
      // - 200：邊框
      // - 300：強調用
      colors: {
        coffee: {
          50: '#f9f1de',
          100: '#f5ebd6',
          200: '#e5d9bf',
          300: '#c8b89c',
        },
      },
    },
  },
  plugins: [],
};
