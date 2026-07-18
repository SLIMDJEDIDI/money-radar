import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="512" height="512" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="mint" x1="8" y1="5" x2="57" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#9AF0C0"/><stop offset="1" stopColor="#49B982"/></linearGradient></defs>
        <rect width="64" height="64" rx="20" fill="#050807"/>
        <rect x="2" y="2" width="60" height="60" rx="19" fill="#0A0F0D" stroke="url(#mint)" strokeWidth="2.5"/>
        <path d="M16 45V19.5L32 35.5L48 19.5V45" fill="none" stroke="url(#mint)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="16" cy="18" r="3.5" fill="#9AF0C0"/><circle cx="48" cy="18" r="3.5" fill="#9AF0C0"/>
        <circle cx="32" cy="36" r="3.2" fill="#0A0F0D" stroke="#9AF0C0" strokeWidth="2"/>
        <path d="M26.5 46.5H37.5" stroke="#9AF0C0" strokeWidth="2.5" strokeLinecap="round" opacity=".72"/>
      </svg>
    ),
    { ...size }
  );
}
