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
      { src: '/brand-icon', sizes: '512x512', type: 'image/jpeg', purpose: 'any' },
      { src: '/brand-icon', sizes: '512x512', type: 'image/jpeg', purpose: 'maskable' },
      { src: '/brand-icon', sizes: '180x180', type: 'image/jpeg', purpose: 'any' },
    ],
  };
}
