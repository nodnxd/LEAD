'use client';

// Unified top identity row for the three products (LEAD / CAST / SPLIT).
// The WORDMARK + [LEAD|CAST|SPLIT] toggle sit dead-center (3-column grid so the
// center block is truly centered regardless of side content). `← hub` sits top-left,
// account/action controls top-right — neither shifts the centered toggle.
// Theme is decoupled — each page passes its own `dark` bool.
//
// 워드마크는 <h1>이 아니라 <div>다. 페이지마다 뜨는 브랜드 마크라서 h1으로 두면
// 화면당 h1이 둘씩 생긴다 (제목은 각 페이지가 자기 h1으로 갖는다).

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND, PRODUCTS, PRODUCT_COLOR, type ProductKey } from '@/lib/brand';

export type { ProductKey };
export { PRODUCT_COLOR };

export default function ProductHeader({
  product,
  dark,
  right,
  showHub = true,
  className = '',
}: {
  product: ProductKey;
  dark: boolean;
  right?: ReactNode;
  showHub?: boolean;
  className?: string;
}) {
  const cur = PRODUCTS.find((p) => p.key === product)!;
  const tone = BRAND[product];
  const pillWrap = dark ? 'border-white/10 bg-white/5' : 'border-black/[0.08] bg-black/[0.04]';
  // zinc-500은 다크(4.0)·라이트(4.4) 양쪽에서 소형 텍스트 대비 미달 — 테마별로 갈라준다.
  const muted = dark ? 'text-zinc-400' : 'text-zinc-600';

  return (
    <div className={`relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${className}`}>
      {/* left — hub */}
      <div className="justify-self-start">
        {showHub && (
          <Link
            href="/hub"
            className={`text-body rounded-lg transition-colors ${muted} ${dark ? 'hover:text-white' : 'hover:text-black'}`}
          >
            ← hub
          </Link>
        )}
      </div>

      {/* center — wordmark + product toggle */}
      <div className="justify-self-center flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-baseline gap-2.5">
          <div
            className="font-display text-display uppercase leading-none"
            style={{ color: dark ? tone.onDark : tone.base }}
          >
            {cur.label}
          </div>
          <span className={`text-mini font-normal tracking-[0.2em] ${muted}`} translate="no">by NEN</span>
        </div>
        <nav aria-label="제품 전환" className={`flex gap-1 p-1 rounded-full border ${pillWrap}`}>
          {PRODUCTS.map((p) => {
            const t = BRAND[p.key];
            return p.key === product ? (
              // 골드·틸 배경에 흰 글씨는 대비 2 미만 — 배경색마다 맞는 글자색(t.on)을 쓴다.
              <span
                key={p.key}
                aria-current="page"
                className="px-3 py-1 rounded-full text-mini font-normal"
                style={{ background: t.base, color: t.on }}
              >
                {p.label}
              </span>
            ) : (
              <Link
                key={p.key}
                href={p.href}
                className={`px-3 py-1 rounded-full text-mini font-normal transition-colors ${muted} hover:text-[var(--pc)] focus-visible:text-[var(--pc)]`}
                style={{ ['--pc' as string]: dark ? t.onDark : t.base }}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* right — controls */}
      <div className="justify-self-end flex items-center gap-2">{right}</div>
    </div>
  );
}
