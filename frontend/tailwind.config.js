/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12151C",
        paper: "#EEF0EC",
        panel: "#FFFFFF",
        line: "#D7DAD2",
        moss: {
          DEFAULT: "#1F5C4C",
          50: "#EAF3F0",
          100: "#D3E7E0",
          400: "#2E7D64",
          500: "#1F5C4C",
          600: "#184A3D",
          700: "#123A30",
        },
        signal: "#B4472A",
        gold: {
          DEFAULT: "#B08A2E",
          400: "#C9A23F",
          500: "#B08A2E",
        },
        muted: "#5B5F58",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(31, 92, 76, 0.15), 0 8px 24px -8px rgba(18, 21, 28, 0.25)",
        card: "0 1px 2px rgba(18,21,28,0.04), 0 12px 32px -16px rgba(18,21,28,0.18)",
        "card-hover": "0 4px 10px rgba(18,21,28,0.06), 0 24px 48px -20px rgba(31,92,76,0.28)",
        soft: "0 2px 8px -2px rgba(18,21,28,0.08)",
        "inner-line": "inset 0 0 0 1px rgba(215,218,210,0.7)",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "14px",
        xl2: "20px",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 1px 1px, rgba(18,21,28,0.06) 1px, transparent 0)",
        "mesh-moss":
          "radial-gradient(40% 60% at 15% 10%, rgba(31,92,76,0.16), transparent 60%), radial-gradient(35% 45% at 85% 20%, rgba(176,138,46,0.14), transparent 60%), radial-gradient(50% 50% at 50% 100%, rgba(180,71,42,0.08), transparent 60%)",
      },
      keyframes: {
        fadein: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: 0, transform: "translateY(14px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: 0, transform: "scale(0.96)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-16px) rotate(3deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(31,92,76,0.4)" },
          "70%": { boxShadow: "0 0 0 10px rgba(31,92,76,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(31,92,76,0)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-1.5deg)" },
          "50%": { transform: "rotate(1.5deg)" },
        },
      },
      animation: {
        fadein: "fadein 0.4s ease both",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
        float: "float 5s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        "spin-slow": "spin-slow 12s linear infinite",
        wiggle: "wiggle 4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
