import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand — AWS-inspired but more vivid for gamified feel
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        // Category color-coding (per chapter)
        category: {
          compute: "#f97316",   // orange
          storage:  "#22c55e",  // green
          network:  "#a855f7",  // purple
          security: "#ef4444",  // red
          database: "#3b82f6",  // blue
          billing:  "#eab308",  // yellow
          foundation: "#06b6d4", // cyan
        },
        // Semantic
        success: "#22c55e",
        danger:  "#ef4444",
        warning: "#eab308",
        info:    "#3b82f6",
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'press': '0 4px 0 0 rgb(0 0 0 / 0.15)',
        'press-active': '0 1px 0 0 rgb(0 0 0 / 0.15)',
      },
      animation: {
        'shake': 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
        'pop': 'pop 0.3s ease',
        'fade-up': 'fade-up 0.3s ease',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
