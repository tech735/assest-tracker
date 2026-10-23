import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const tone = (name: string) => ({
  DEFAULT: `hsl(var(--${name}))`,
  soft: `hsl(var(--${name}-soft))`,
  strong: `hsl(var(--${name}-strong))`,
});

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Breakpoints follow 🎨 Foundations → Responsive spec:
      // phone < 768 · tablet portrait md (768) · tablet landscape lg (1024) · laptop xl (1200) · desktop 2xl (1440)
      screens: {
        xl: "1200px",
        "2xl": "1440px",
      },
      aria: {
        invalid: 'invalid="true"',
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
      },
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        subtle: "hsl(var(--subtle))",
        faint: "hsl(var(--faint-foreground))",
        link: "hsl(var(--link))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          soft: "hsl(var(--primary-soft))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          ...tone("destructive"),
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: { ...tone("success"), foreground: "hsl(var(--success-foreground))" },
        warning: { ...tone("warning"), foreground: "hsl(var(--warning-foreground))" },
        info: { ...tone("info"), foreground: "hsl(var(--info-foreground))" },
        special: tone("special"),
        quiet: tone("quiet"),
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        "brand-blue": "#02019b",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(18 21 27 / 0.05)",
        card: "0 1px 3px 0 rgb(18 21 27 / 0.08), 0 1px 2px 0 rgb(18 21 27 / 0.04)",
        "card-hover": "0 4px 8px -2px rgb(18 21 27 / 0.08), 0 2px 4px -2px rgb(18 21 27 / 0.04)",
        popover: "0 12px 16px -4px rgb(18 21 27 / 0.10), 0 4px 6px -2px rgb(18 21 27 / 0.05)",
        elevated: "0 24px 48px -12px rgb(18 21 27 / 0.18)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.2,0,0,1)",
        enter: "cubic-bezier(.16,1,.3,1)",
        exit: "cubic-bezier(.4,0,1,1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Page / route change: fade + 4px rise (180ms)
        "page-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Bulk action bar: slide up 24px
        "bar-in": {
          from: { opacity: "0", transform: "translate(-50%, 24px)" },
          to: { opacity: "1", transform: "translate(-50%, 0)" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scan-line": {
          "0%, 100%": { transform: "translateY(-90px)" },
          "50%": { transform: "translateY(90px)" },
        },
        // kept for older components
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "page-in": "page-in 180ms cubic-bezier(.16,1,.3,1)",
        "bar-in": "bar-in 220ms cubic-bezier(.16,1,.3,1)",
        "sheet-up": "sheet-up 240ms cubic-bezier(.16,1,.3,1)",
        shimmer: "shimmer 1.2s linear infinite",
        "scan-line": "scan-line 2.4s ease-in-out infinite",
        "fade-in": "fade-in 180ms cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
