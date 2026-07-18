const FINAL_LOGO_URL = 'https://sc04.alicdn.com/kf/A9ef0a259136546bf9e7eb4a1fb7e235fU.jpg';

// Same-origin proxy for the owner-approved final brand asset.
// Used by Android/iOS/PWA metadata so installed users receive the exact final logo.
export async function GET() {
  const response = await fetch(FINAL_LOGO_URL, { next: { revalidate: 86400 } });
  if (!response.ok) return new Response('Logo unavailable', { status: 502 });
  const body = await response.arrayBuffer();
  return new Response(body, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
