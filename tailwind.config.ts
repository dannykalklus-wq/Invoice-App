import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "Segoe UI", "Arial"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo"]
      },
      colors: {
        line: "#e5e7eb",
        ink: "#111827",
        muted: "#6b7280",
        accent: "#0ea5e9"
      }
    },
  },
  plugins: [],
};
export default config;
