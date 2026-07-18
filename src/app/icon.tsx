import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #9AF0C0 0%, #49B982 100%)', borderRadius: 108, color: '#050505', fontSize: 300, fontWeight: 900, fontFamily: 'Arial, sans-serif', letterSpacing: -28, boxShadow: 'inset 0 0 0 18px rgba(255,255,255,.16)' }}>M</div>
    ),
    { ...size }
  );
}
