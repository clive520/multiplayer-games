/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // IMPROVEMENTS #18：啟用 class-based dark mode
  // 預設 html 有 class="dark"（保持向後相容）
  // 切換 light mode 時移除 dark class
  darkMode: 'class',
  theme: {
    extend: {
      // 淺咖啡色系（IMPROVEMENTS #18 淺色模式預設）
      // - 50：最淺，body 主背景
      // - 100：稍深，card 背景
      // - 200：邊框、hover
      // - 300：強調用
      colors: {
        coffee: {
          50: '#f9f1de',
          100: '#f5ebd6',
          200: '#e5d9bf',
          300: '#c8b89c',
        },
        // 森林綠色系（主題 2，IMPROVEMENTS #18 補強）
        green: {
          50: '#d8e8d5',
          100: '#b8d8b8',
          200: '#9cc9a0',
          300: '#82b58c',
          400: '#4d7a5a',
        },
        // 應用程式語義色（IMPROVEMENTS #18 多主題）
        // 值由 CSS 變數決定，class name 不變
        // 預設淺咖啡主題（:root），.theme-green 覆寫
        'app-bg': 'var(--app-bg)',
        'app-card': 'var(--app-card)',
        'app-hover': 'var(--app-hover)',
        'app-border': 'var(--app-border)',
        'app-border-strong': 'var(--app-border-strong)',
      },
    },
  },
  plugins: [],
};
