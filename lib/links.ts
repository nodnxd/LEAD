import React from 'react';

// SNS 링크 프리셋 + 아이콘. 대시보드·아티스트·공유뷰가 각자 복사본을 들고 있었고,
// 아이콘은 이모지(📸🎵🎧▶️)라 폰트마다 다르게 떴다. Tabler 브랜드 글리프로 통일.

export const QUICK_LINKS = [
  { label: 'Instagram', prefix: 'https://instagram.com/' },
  { label: 'SoundCloud', prefix: 'https://soundcloud.com/' },
  { label: 'Spotify', prefix: 'https://open.spotify.com/artist/' },
  { label: 'YouTube', prefix: 'https://youtube.com/@' },
];

const MATCH: [string, string, string][] = [
  ['instagram', 'ti-brand-instagram', 'Instagram'],
  ['soundcloud', 'ti-brand-soundcloud', 'SoundCloud'],
  ['spotify', 'ti-brand-spotify', 'Spotify'],
  ['youtube', 'ti-brand-youtube', 'YouTube'],
];

const hit = (url: string) => MATCH.find(([k]) => url.includes(k));

/** 아이콘 전용 링크의 접근성 이름. 매칭 안 되면 '링크'. */
export const linkName = (url: string) => hit(url)?.[2] ?? '링크';

/** URL → Tabler 아이콘 엘리먼트. 크기는 감싸는 쪽 text-* 가 정한다. */
export const getLinkIcon = (url: string) =>
  React.createElement('i', { className: `ti ${hit(url)?.[1] ?? 'ti-link'}`, 'aria-hidden': 'true' });
