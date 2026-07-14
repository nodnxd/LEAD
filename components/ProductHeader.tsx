'use client';

// Unified top identity row for the three products (LEAD / CAST / SPLIT).
// The WORDMARK + [LEAD|CAST|SPLIT] toggle sit dead-center (3-column grid so the
// center block is truly centered regardless of side content). `← hub` sits top-left,
// account/action controls top-right — neither shifts the centered toggle.
// Theme is decoupled — each page passes its own `dark` bool.

import type { ReactNode } from 'react';

export type ProductKey = 'lead' | 'cast' | 'split';

const PRODUCTS: { key: ProductKey; label: string; color: string; href: string }[] = [
  { key: 'lead',  label: 'LEAD',  color: '#6366F1', href: '/dashboard' },
  { key: 'cast',  label: 'CAST',  color: '#E3B24A', href: '/roster/dashboard' },
  { key: 'split', label: 'SPLIT', color: '#2FB6A3', href: '/split' },
];

export const PRODUCT_COLOR: Record<ProductKey, string> = {
  lead: '#6366F1', cast: '#E3B24A', split: '#2FB6A3',
};

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
  const pillWrap = dark ? 'border-white/10 bg-white/5' : 'border-black/[0.08] bg-black/[0.04]';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className={`relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${className}`}>
      {/* left — hub */}
      <div className="justify-self-start">
        {showHub && (
          <a href="/hub" className={`text-[13px] transition-colors ${muted} ${dark ? 'hover:text-white' : 'hover:text-black'}`}>← hub</a>
        )}
      </div>

      {/* center — wordmark + product toggle */}
      <div className="justify-self-center flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-3xl md:text-4xl font-semibold uppercase tracking-tighter leading-none" style={{ color: cur.color }}>{cur.label}</h1>
          <span className={`text-[11px] font-normal tracking-[0.2em] ${muted}`}>by NEN</span>
        </div>
        <div className={`flex gap-1 p-1 rounded-full border ${pillWrap}`}>
          {PRODUCTS.map((p) =>
            p.key === product ? (
              <span key={p.key} className="px-3 py-1 rounded-full text-[11px] font-normal text-white" style={{ background: p.color }}>{p.label}</span>
            ) : (
              <a key={p.key} href={p.href}
                className="px-3 py-1 rounded-full text-[11px] font-normal transition-colors text-zinc-500"
                onMouseEnter={(e) => (e.currentTarget.style.color = p.color)}
                onMouseLeave={(e) => (e.currentTarget.style.color = '')}>{p.label}</a>
            )
          )}
        </div>
      </div>

      {/* right — controls */}
      <div className="justify-self-end flex items-center gap-2">{right}</div>
    </div>
  );
}
