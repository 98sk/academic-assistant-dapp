import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        display: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      fontWeight: {
        medium: "500",
        semibold: "600",
        bold: "700"
      },
      letterSpacing: {
        display: "-0.025em",
        tight: "-0.015em",
        wide: "0.04em"
      },
      colors: {
        navy: {
          950: "hsl(var(--navy-950) / <alpha-value>)",
          900: "hsl(var(--navy-900) / <alpha-value>)",
          800: "hsl(var(--navy-800) / <alpha-value>)",
          700: "hsl(var(--navy-700) / <alpha-value>)",
          600: "hsl(var(--navy-600) / <alpha-value>)"
        },
        sky: {
          300: "hsl(var(--sky-300) / <alpha-value>)",
          400: "hsl(var(--sky-400) / <alpha-value>)",
          500: "hsl(var(--sky-500) / <alpha-value>)"
        },
        green: {
          950: "hsl(var(--green-950) / <alpha-value>)",
          900: "hsl(var(--green-900) / <alpha-value>)",
          800: "hsl(var(--green-800) / <alpha-value>)",
          700: "hsl(var(--green-700) / <alpha-value>)",
          600: "hsl(var(--green-600) / <alpha-value>)",
          500: "hsl(var(--green-500) / <alpha-value>)",
          400: "hsl(var(--green-400) / <alpha-value>)",
          glow: "hsl(var(--green-glow) / <alpha-value>)"
        },
        app: "hsl(var(--bg-app) / <alpha-value>)",
        surface: {
          DEFAULT: "hsl(var(--bg-surface) / <alpha-value>)",
          hover: "hsl(var(--bg-surface-hover) / <alpha-value>)"
        },
        primary: "hsl(var(--text-primary) / <alpha-value>)",
        muted: "hsl(var(--text-muted) / <alpha-value>)",
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          glow: "hsl(var(--accent-glow) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)"
        },
        border: {
          subtle: "hsl(var(--border-subtle) / <alpha-value>)"
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 8px 32px rgba(5, 15, 35, 0.35)",
        card: "0 1px 0 rgba(255,255,255,0.1) inset, 0 8px 32px rgba(5, 15, 35, 0.35)",
        glow: "0 0 32px hsl(var(--green-glow) / 0.4)",
        "glow-green":
          "0 0 24px hsl(var(--green-glow) / 0.45), 0 4px 14px hsl(var(--green-900) / 0.5)",
        "glow-sky": "0 0 28px hsl(var(--sky-400) / 0.35)",
        glass: "0 8px 32px rgba(5, 15, 35, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        sidebar: "4px 0 32px rgba(5, 15, 35, 0.4)"
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.25rem"
      },
      backgroundImage: {
        "gradient-accent": "var(--gradient-accent)",
        "gradient-primary": "var(--gradient-btn-primary)",
        "gradient-success": "var(--gradient-btn-success)",
        "gradient-mesh":
          "radial-gradient(ellipse 80% 60% at 10% -10%, hsl(var(--sky-400) / 0.14), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 10%, hsl(var(--green-glow) / 0.1), transparent 50%), radial-gradient(ellipse 50% 40% at 50% 100%, hsl(var(--sky-300) / 0.1), transparent 60%)",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "slide-in-left": "slide-in-left 0.35s ease-out forwards",
        shimmer: "shimmer 2.5s infinite linear",
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "scale-in": "scale-in 0.3s ease-out forwards"
      }
    }
  },
  plugins: []
} satisfies Config;
