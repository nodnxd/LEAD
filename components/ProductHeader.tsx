'use client';

// Unified top identity row for the three products (LEAD / CAST / SPLIT).
// Shape: [← hub]  [WORDMARK by NEN]  [LEAD|CAST|SPLIT toggle]  (subtitle)  ...  [right]
// Theme is decoupled — each page passes its own `dark` bool (dashboard/roster/split
// each track theme differently), so this component never reads a theme store itself.

import type { ReactNode } from 'react';

export type ProductKey = 'lead' | 'cast' | 'split';

const PRODUCTS: { key: ProductKey; label: string; color: string; href: string }[] = [
  { key: 'lead',  label: 'LEAD',  color: '#3E78DB', href: '/dashboard' },
  { key: 'cast',  label: 'CAST',  color: '#E3B24A', href: '/roster/dashboard' },
  { key: 'split', label: 'SPLIT', color: '#2FB6A3', href: '/split' },
];

export const PRODUCT_COLOR: Record<ProductKey, string> = {
  lead: '#3E78DB', cast: '#E3B24A', split: '#2FB6A3',
};

export default function ProductHeader({
  product,
  dark,
  subtitle,
  right,
  className = '',
}: {
  product: ProductKey;
  dark: boolean;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  const cur = PRODUCTS.find((p) => p.key === product)!;
  const pillWrap = dark ? 'border-white/10 bg-white/5' : 'border-black/[0.08] bg-black/[0.04]';
  const muted = dark ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className={`relative z-10 flex items-center gap-x-3 gap-y-2 flex-wrap ${className}`}>
      <a href="/hub" className={`text-[13px] shrink-0 transition-colors ${muted} ${dark ? 'hover:text-white' : 'hover:text-black'}`}>← hub</a>

      <div className="flex items-baseline gap-2.5 shrink-0">
        <h1 className="text-3xl md:text-4xl font-semibold uppercase tracking-tighter leading-none" style={{ color: cur.color }}>{cur.label}</h1>
        <span className={`text-[11px] font-normal tracking-[0.2em] ${muted}`}>by NEN</span>
      </div>

      <div className={`flex gap-1 p-1 rounded-full border shrink-0 ${pillWrap}`}>
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

      {subtitle && <span className={`text-xs ${dark ? 'text-white/30' : 'text-black/40'} hidden sm:inline`}>{subtitle}</span>}

      {right && <div className="ml-auto flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}
