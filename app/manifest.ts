import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LEAD by NEN',
    short_name: 'LEAD',
    description: '음악 리드 · 피칭 관리',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
