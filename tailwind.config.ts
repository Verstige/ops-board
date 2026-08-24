import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        glass: "var(--glass-bg)",
        "glass-strong": "var(--glass-bg-strong)",
        ink: {
          DEFAULT: "var(--text-primary)",
          muted:   "var(--text-muted)",
          sub:     "var(--text-secondary)",
        },
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
      },
      borderRadius: {
        glass: "18px",
        "glass-lg": "22px",
      },
      boxShadow: {
        glass: "var(--glass-shadow)",
        "glass-lg": "var(--glass-shadow-lg)",
      },
      backdropBlur: {
        glass: "24px",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;