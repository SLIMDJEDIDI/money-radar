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
    // Icône = la pièce dorée (public/coin-icon.jpg, source 1920x1920, redimensionnée par le
    // navigateur). Les anciennes entrées pointaient sur les routes générées /icon?size=…
    // qui n'existent plus depuis le passage à un fichier image statique.
    icons: [
      { src: '/coin-icon.jpg', sizes: '192x192', type: 'image/jpeg', purpose: 'any' },
      { src: '/coin-icon.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any' },
      { src: '/coin-icon.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'maskable' },
    ],
  };
}
