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
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BRAND, PRODUCTS, PRODUCT_COLOR, type ProductKey } from '@/lib/brand';
import { stepWheel, initialArm } from '@/lib/wheelNav';

export type { ProductKey };
export { PRODUCT_COLOR };

// ── 휠 전환의 2중장치 ────────────────────────────────────────────────────────
//   1단 — 포인터가 토글 위에 있을 때만 반응한다(리스너를 nav에만 건다).
//   2단 — 가로 델타를 누적해 임계값을 넘겨야 넘어간다. 진행률을 눈에 보이게 그려서
//         "지금 넘어가는 중"임을 알린다. 손을 떼면 DECAY_MS 뒤 0으로 풀린다.
// 판정 자체는 lib/wheelNav.ts (임계값·쿨다운·방향반전·끝단 처리 + 테스트).
const DECAY_MS = 320;

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
  const idx = PRODUCTS.findIndex((p) => p.key === product);

  const pillWrap = dark ? 'border-white/10 bg-white/5' : 'border-black/[0.08] bg-black/[0.04]';
  // zinc-500은 다크(4.0)·라이트(4.4) 양쪽에서 소형 텍스트 대비 미달 — 테마별로 갈라준다.
  const muted = dark ? 'text-zinc-400' : 'text-zinc-600';

  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  const armState = useRef(initialArm());
  const decayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // -1..1 — 어느 쪽으로 얼마나 찼는지. 인디케이터를 그리는 데만 쓴다.
  const [arm, setArm] = useState(0);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    // wheel은 기본이 passive라 React onWheel로는 preventDefault를 못 한다.
    // 가로 휠이 브라우저 뒤로가기 제스처를 부르는 걸 막아야 해서 직접 건다.
    const onWheel = (e: WheelEvent) => {
      // 세로 휠은 페이지 스크롤 그대로 두고, 가로 의도만 가로챈다.
      // 세로 휠뿐인 마우스를 위해 Shift+휠도 가로로 인정한다.
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();

      const r = stepWheel(armState.current, dx, Date.now(), idx, PRODUCTS.length);
      armState.current = r.state;
      setArm(r.arm);

      if (decayTimer.current) clearTimeout(decayTimer.current);
      decayTimer.current = setTimeout(() => {
        armState.current = { ...armState.current, accum: 0 };
        setArm(0);
      }, DECAY_MS);

      if (r.move) router.push(PRODUCTS[idx + r.move].href);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (decayTimer.current) clearTimeout(decayTimer.current);
    };
  }, [idx, router]);

  // 끝에서 더 밀면 갈 곳이 없다 — 인디케이터도 그리지 않아 "막혔다"를 알린다.
  const armable = arm > 0 ? idx < PRODUCTS.length - 1 : arm < 0 ? idx > 0 : false;
  const armPct = armable ? Math.abs(arm) * 100 : 0;

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

        <nav
          ref={navRef}
          aria-label="제품 전환"
          title="가로 휠(또는 Shift+휠)로 전환"
          className={`relative flex gap-1 p-1 rounded-full border overscroll-contain ${pillWrap}`}
          style={{ touchAction: 'pan-y' }}
        >
          {/* 2단 장치의 진행률. 미는 쪽 가장자리에서 차오른다. */}
          {armPct > 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 rounded-full"
              style={{
                [arm > 0 ? 'right' : 'left']: 0,
                width: `${armPct}%`,
                background: `linear-gradient(${arm > 0 ? 'to left' : 'to right'},
                  ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)'}, transparent)`,
                transition: 'width .06s linear',
              }}
            />
          )}

          {PRODUCTS.map((p) => {
            const t = BRAND[p.key];
            return p.key === product ? (
              // 골드·틸 배경에 흰 글씨는 대비 2 미만 — 배경색마다 맞는 글자색(t.on)을 쓴다.
              <span
                key={p.key}
                aria-current="page"
                className="relative px-3.5 py-1 rounded-full text-mini font-bold tracking-[0.08em]"
                style={{ background: t.base, color: t.on }}
              >
                {p.label}
              </span>
            ) : (
              <Link
                key={p.key}
                href={p.href}
                className={`relative px-3.5 py-1 rounded-full text-mini font-bold tracking-[0.08em] transition-colors ${muted} hover:text-[var(--pc)] focus-visible:text-[var(--pc)]`}
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
