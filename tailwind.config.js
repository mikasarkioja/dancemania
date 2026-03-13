const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    path.join(__dirname, "src/pages/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "src/components/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "src/features/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "src/app/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  safelist: [
    "min-h-screen", "bg-background", "text-foreground", "antialiased",
    "container", "mx-auto", "max-w-2xl", "px-6", "py-12", "mb-2", "mb-8",
    "text-3xl", "font-bold", "tracking-tight", "text-muted-foreground",
    "flex", "flex-wrap", "gap-x-4", "gap-y-1", "text-sm",
    "text-primary", "underline", "underline-offset-4", "hover:no-underline",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
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
        "brand-rose": "#FDA4AF",
        "brand-champagne": "#FDF2F8",
        "brand-gold": "#EAB308",
        "dance-leader": "#60A5FA",
        "dance-follower": "#C084FC",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "dance-sway": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(-8deg)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "dance-sway": "dance-sway 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
