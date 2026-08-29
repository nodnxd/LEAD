import type { KeyboardEvent } from 'react';

// 클릭만 달려 있던 <div>에 키보드 접근을 붙인다.
//
//   <div {...pressable(() => setOpen(v => !v))} className="...">
//
// 원래는 <button>이 맞다. 다만 이 앱의 해당 위치들은 flex/grid 컨테이너라
// button으로 바꾸면 preflight의 display·text-align 기본값 때문에 레이아웃이
// 같이 흔들린다. 화면을 하나씩 눈으로 확인하며 바꿀 수 있을 때 button으로 승격하고,
// 그전까지는 이 헬퍼로 키보드·스크린리더 접근을 먼저 회복시킨다.
// ponytail: role=button 폴백. 화면 확인 가능해지면 실제 <button>으로 교체.
export function pressable(onActivate: () => void, opts?: { label?: string; expanded?: boolean; disabled?: boolean }) {
  return {
    role: 'button' as const,
    tabIndex: opts?.disabled ? -1 : 0,
    'aria-label': opts?.label,
    'aria-expanded': opts?.expanded,
    'aria-disabled': opts?.disabled || undefined,
    onClick: () => { if (!opts?.disabled) onActivate(); },
    onKeyDown: (e: KeyboardEvent) => {
      if (opts?.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); }
    },
  };
}

/** 모달 패널에 붙이는 표준 속성. 배경(backdrop) 말고 패널 쪽에 쓴다. */
export function dialogProps(label: string) {
  return { role: 'dialog' as const, 'aria-modal': true, 'aria-label': label };
}
