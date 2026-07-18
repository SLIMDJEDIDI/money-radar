import React from 'react';

type MoneyHubLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  subtitle?: boolean;
};

/** Original Money Hub identity: protected, traceable capital flow forming an M. */
export default function MoneyHubLogo({ size = 44, showWordmark = false, className = '', subtitle = true }: MoneyHubLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Money Hub" className="shrink-0 drop-shadow-[0_8px_12px_rgba(83,207,150,0.16)]">
        <defs>
          <linearGradient id="moneyHubMint" x1="10" y1="8" x2="54" y2="57" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9AF0C0" />
            <stop offset="1" stopColor="#49B982" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="19" fill="#0A0F0D" stroke="url(#moneyHubMint)" strokeWidth="2.5" />
        <path d="M16 45V19.5L32 35.5L48 19.5V45" fill="none" stroke="url(#moneyHubMint)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="18" r="3.5" fill="#9AF0C0" />
        <circle cx="48" cy="18" r="3.5" fill="#9AF0C0" />
        <circle cx="32" cy="36" r="3.2" fill="#0A0F0D" stroke="#9AF0C0" strokeWidth="2" />
        <path d="M26.5 46.5H37.5" stroke="#9AF0C0" strokeWidth="2.5" strokeLinecap="round" opacity=".72" />
      </svg>
      {showWordmark && (
        <div className="flex flex-col leading-none min-w-0">
          <span className="text-lg sm:text-xl font-black tracking-[-0.07em] text-white uppercase whitespace-nowrap">Money Hub</span>
          {subtitle && <span className="mt-1 text-[8px] sm:text-[9px] font-black tracking-[0.22em] text-emerald-300/75 uppercase whitespace-nowrap">Sourcing Control</span>}
        </div>
      )}
    </div>
  );
}
