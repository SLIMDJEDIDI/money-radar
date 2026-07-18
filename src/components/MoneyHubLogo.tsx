import React from 'react';

type MoneyHubLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  subtitle?: boolean;
};

// Original Money Hub identity: mint M mark + compact financial-control wordmark.
export default function MoneyHubLogo({ size = 42, showWordmark = false, className = '', subtitle = true }: MoneyHubLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        aria-label="Money Hub"
        className="shrink-0 rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-500 text-black flex items-center justify-center font-black shadow-lg shadow-emerald-500/15"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.52) }}
      >M</div>
      {showWordmark && (
        <div className="flex flex-col leading-none min-w-0">
          <span className="text-lg sm:text-xl font-black tracking-[-0.07em] text-white uppercase whitespace-nowrap">Money Hub</span>
          {subtitle && <span className="mt-1 text-[8px] sm:text-[9px] font-black tracking-[0.22em] text-emerald-300/75 uppercase whitespace-nowrap">Sourcing Control</span>}
        </div>
      )}
    </div>
  );
}
