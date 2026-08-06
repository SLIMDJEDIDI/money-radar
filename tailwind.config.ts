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

// Per-bank-account distinctive colors (see BANK_PALETTES in MoneyHubApp). These are chosen
// at runtime from the account id, so every class variant must be safelisted explicitly.
const bankColors = ["teal", "sky", "violet", "amber", "fuchsia", "lime", "orange", "cyan"];
const bankSafelist = bankColors.flatMap((c) => [
  `ring-${c}-400`,
  `border-${c}-500/60`,
  `border-${c}-500/25`,
  `text-${c}-300`,
  `bg-${c}-500/15`,
  `from-${c}-500/20`,
  `bg-${c}-400`,
  `bg-${c}-500`,
]);
safelist.push(...bankSafelist);
// Arbitrary hero gradient starts per account palette.
safelist.push(
  "from-[#062925]", "from-[#082234]", "from-[#1e1633]", "from-[#2a2109]",
  "from-[#2a0f28]", "from-[#1a2408]", "from-[#2a1608]", "from-[#06272b]",
);

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
