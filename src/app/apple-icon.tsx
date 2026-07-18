import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #9AF0C0 0%, #49B982 100%)', borderRadius: 40, color: '#050505', fontSize: 108, fontWeight: 900, fontFamily: 'Arial, sans-serif', letterSpacing: -10, boxShadow: 'inset 0 0 0 6px rgba(255,255,255,.16)' }}>M</div>
    ),
    { ...size }
  );
}
