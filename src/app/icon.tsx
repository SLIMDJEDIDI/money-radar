import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #84e5b4 0%, #4db582 48%, #14362a 100%)', borderRadius: 108 }}>
        <div style={{ width: 382, height: 382, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 95, background: 'rgba(0,0,0,.74)', border: '12px solid rgba(255,255,255,.22)', color: '#9af0c0', fontSize: 228, fontWeight: 900, fontFamily: 'Arial', letterSpacing: -20, boxShadow: '0 30px 60px rgba(0,0,0,.34)' }}>M</div>
      </div>
    ),
    { ...size }
  );
}
