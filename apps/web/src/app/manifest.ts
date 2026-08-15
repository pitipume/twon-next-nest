import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Twon — Books & Tarot',
    short_name: 'Twon',
    description: 'Digital ebooks and tarot card decks',
    start_url: '/',
    display: 'standalone',
    background_color: '#022537',
    theme_color: '#022537',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
