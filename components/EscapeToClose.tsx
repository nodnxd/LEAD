'use client';

// Esc로 모달 닫기 + 열릴 때 포커스 옮기기 — 앱 전체에 한 번만 건다.
//
// 이 앱의 모달은 전부 같은 구조다:
//   <div class="fixed inset-0 …" onClick={close}>      ← 배경(닫기 핸들러가 여기 있다)
//     <div role="dialog" onClick={stopPropagation}>…   ← 패널
// 그래서 패널의 부모(=배경)를 클릭시키면 그 모달의 close가 그대로 돈다.
// 모달마다 useEffect를 심는 대신 최상단 다이얼로그 하나만 찾아 처리한다.
// ponytail: 배경 클릭 재사용. 모달을 공용 <Modal> 컴포넌트로 묶게 되면 그때 옮긴다.

import { useEffect } from 'react';

export default function EscapeToClose() {
  useEffect(() => {
    const topDialog = () => {
      const all = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      return all.length ? all[all.length - 1] : null;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const panel = topDialog();
      const backdrop = panel?.parentElement;
      if (!panel || !backdrop) return;
      e.stopPropagation();
      backdrop.click();
    };

    // 모달이 뜨면 포커스를 패널 안으로 — 안 그러면 탭이 뒤 페이지를 계속 돈다
    let last: HTMLElement | null = null;
    const observer = new MutationObserver(() => {
      const panel = topDialog();
      if (panel && panel !== last) {
        last = panel;
        if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
      } else if (!panel) {
        last = null;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); observer.disconnect(); };
  }, []);

  return null;
}
