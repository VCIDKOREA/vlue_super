/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EBF3FF",
          100: "#D6E8FF",
          200: "#ADCFFF",
          300: "#74AAFF",
          400: "#4D8EFF",
          500: "#3182F6",
          600: "#1B6EF3",
          700: "#1558D4",
          800: "#1045A8",
          900: "#0B307A",
        },
        blue: {
          light: "#EBF3FF",
          grid: "#DBEAFE",
          tint: "#F5F9FF",
        },
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          "Pretendard",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        inter: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
        tight: "-0.02em",
        snug: "-0.01em",
      },
      boxShadow: {
        soft: "0 2px 15px rgba(49, 130, 246, 0.08)",
        card: "0 2px 16px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 8px 40px rgba(49, 130, 246, 0.14)",
        "inner-sm": "inset 0 1px 2px rgba(0, 0, 0, 0.04)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
