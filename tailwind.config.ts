import type { Config } from "tailwindcss";

// Colors driven dynamically at runtime (text-${style}-400, ring-${style}-500/50, ...).
// Tailwind cannot see these as literals, so they MUST be safelisted or they get
// purged from the production bundle — which silently breaks all stat/detail colors.
const dynamicColors = ["blue", "emerald", "rose", "amber", "neutral"];
const safelist = dynamicColors.flatMap((c) => [
  `text-${c}-300`,
  `text-${c}-400`,
  `text-${c}-500`,
  `border-${c}-500/20`,
  `border-${c}-500/30`,
  `border-${c}-500/40`,
  `border-${c}-500/50`,
  `hover:border-${c}-500/30`,
  `hover:border-${c}-500/40`,
  `ring-${c}-500/50`,
  `bg-${c}-500/5`,
  `bg-${c}-500/10`,
  `group-hover:text-${c}-400`,
]);

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist,
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
