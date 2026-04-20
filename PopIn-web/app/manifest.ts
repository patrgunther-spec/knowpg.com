import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pop In',
    short_name: 'Pop In',
    description: 'pop in on your friends',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait',
    icons: [
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
