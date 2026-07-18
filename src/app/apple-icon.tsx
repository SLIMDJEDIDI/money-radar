import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #84e5b4 0%, #4db582 48%, #14362a 100%)', borderRadius: 40 }}>
        <div style={{ width: 136, height: 136, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 34, background: 'rgba(0,0,0,.74)', border: '4px solid rgba(255,255,255,.24)', color: '#9af0c0', fontSize: 82, fontWeight: 900, fontFamily: 'Arial', letterSpacing: -8 }}>M</div>
      </div>
    ),
    { ...size }
  );
}
