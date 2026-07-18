import React from 'react';

type MoneyHubLogoProps = {
  size?: number;
  className?: string;
};

// Final brand asset supplied by the platform owner.
const FINAL_LOGO_URL = 'https://sc04.alicdn.com/kf/A9ef0a259136546bf9e7eb4a1fb7e235fU.jpg';

export default function MoneyHubLogo({ size = 64, className = '' }: MoneyHubLogoProps) {
  return (
    <img
      src={FINAL_LOGO_URL}
      alt="Money Hub"
      width={size}
      height={size}
      draggable={false}
      className={`block rounded-[18%] object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
