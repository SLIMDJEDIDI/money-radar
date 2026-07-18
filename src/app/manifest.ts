import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Money Hub',
    short_name: 'Money Hub',
    description: 'Private financial command center.',
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#050505',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    categories: ['finance', 'business', 'productivity'],
    icons: [
      { src: '/icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon?size=180', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
