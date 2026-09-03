// 헤더 제품 토글의 가로 휠 전환 판정. 순수 함수로 빼둔 이유는 조용히 틀리기 때문이다 —
// 임계값이 낮으면 스크롤하다 제품이 바뀌고, 쿨다운이 없으면 관성 스크롤이 두 칸을 넘긴다.
// 둘 다 화면엔 에러가 안 뜨고 "왜 갑자기 넘어갔지"로만 나타난다.

/** 넘어가기까지 필요한 가로 누적 픽셀 (2단 장치의 2단).
 *  화면 아무 데서나 받으므로 오발 여지가 크다. 140 → 220 → 340으로 계속 뻑뻑해졌다. */
export const ARM_PX = 340;
/** 전환 직후 잠그는 시간 */
export const COOLDOWN_MS = 900;
/** 이만큼 휠이 조용하면 누적을 버린다 — 찔끔찔끔 밀어서 채우는 걸 막는다.
 *  한 번의 이어진 손짓으로만 채워진다는 뜻이다. */
export const IDLE_RESET_MS = 220;
/** 전환 뒤 다시 무장하기까지 필요한 '정적' 시간.
 *  쿨다운만으로는 두 칸 넘어가는 걸 못 막는다 — 트랙패드 관성은 900ms보다 오래 가고,
 *  쿨다운이 풀린 뒤 남은 관성이 다시 340px를 채워버린다. 그래서 시간이 아니라
 *  '입력이 실제로 끊겼는가'로 판정한다. 손을 떼야 다음 한 칸이 열린다. */
export const RELEASE_MS = 180;

export type ArmState = {
  accum: number;
  lockUntil: number;
  /** 마지막 휠 입력 시각 — 관성이 아직 흐르는지 판단한다 */
  last: number;
  /** 무장 상태. 전환 직후 false가 되고, 입력이 RELEASE_MS 동안 끊겨야 다시 true */
  armed: boolean;
};

export type WheelResult = {
  state: ArmState;
  /** -1..1 — 인디케이터가 어느 쪽으로 얼마나 찼는지 */
  arm: number;
  /** 이번 입력으로 실제 이동할 방향. 0이면 이동 없음 */
  move: -1 | 0 | 1;
};

export const initialArm = (): ArmState => ({ accum: 0, lockUntil: 0, last: 0, armed: true });

export function stepWheel(
  s: ArmState,
  dx: number,
  now: number,
  idx: number,
  count: number,
): WheelResult {
  const quiet = now - s.last;

  // 전환 직후엔 손을 뗄 때까지 아무것도 안 받는다. 관성이 계속 들어오는 동안은
  // last가 계속 갱신되므로 영영 무장되지 않고, 진짜로 멈춰야 열린다.
  if (!s.armed) {
    if (quiet < RELEASE_MS) return { state: { ...s, accum: 0, last: now }, arm: 0, move: 0 };
    s = { ...s, armed: true, accum: 0 };
  }

  if (now < s.lockUntil) return { state: { ...s, accum: 0, last: now }, arm: 0, move: 0 };

  // 방향을 바꾸거나, 한동안 쉬었으면 누적을 버린다.
  // (좌우로 흔들어 채우기 / 찔끔찔끔 밀어 채우기 둘 다 막는다)
  const stale = quiet > IDLE_RESET_MS;
  const flipped = s.accum !== 0 && Math.sign(dx) !== Math.sign(s.accum);
  const accum = (stale || flipped ? 0 : s.accum) + dx;

  if (Math.abs(accum) < ARM_PX) {
    return {
      state: { ...s, accum, last: now },
      arm: Math.max(-1, Math.min(1, accum / ARM_PX)),
      move: 0,
    };
  }

  const dir: -1 | 1 = accum > 0 ? 1 : -1;
  const next = idx + dir;
  // 끝에서 더 밀면 갈 곳이 없다. 누적만 비우고 잠그지는 않는다 —
  // 반대로 되돌릴 땐 바로 반응해야 하므로.
  if (next < 0 || next >= count) return { state: { ...s, accum: 0, last: now }, arm: 0, move: 0 };

  return { state: { accum: 0, lockUntil: now + COOLDOWN_MS, last: now, armed: false }, arm: 0, move: dir };
}


// ── 1단 장치: "이 휠은 제품 전환용이 아니다"를 걸러내는 조건들 ────────────────
// 창 전체에서 휠을 받으므로, 가로로 스크롤할 것이 있는 자리에서는 손을 떼야 한다.
// 로스터 풀·파일 표처럼 가로 스크롤 영역이 실제로 있고, 거기서 제품이 바뀌면 최악이다.

/** el에서 위로 훑어 dx 방향으로 더 스크롤할 수 있는 조상이 있으면 true */
export function insideHorizontalScroller(
  start: Element | null,
  dx: number,
  root: Element | null = null,
): boolean {
  for (let el = start; el && el !== root; el = el.parentElement) {
    const { scrollWidth, clientWidth, scrollLeft } = el as HTMLElement;
    if (scrollWidth - clientWidth <= 1) continue;
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    const ox = style?.overflowX;
    if (ox !== 'auto' && ox !== 'scroll') continue;
    // 그 방향으로 아직 갈 데가 남았으면 스크롤이 우선이다.
    if (dx > 0 ? scrollLeft < scrollWidth - clientWidth - 1 : scrollLeft > 1) return true;
  }
  return false;
}

/** 모달·시트가 떠 있으면 뒤 화면을 갈아치우지 않는다 */
export const modalOpen = (doc: Document) =>
  !!doc.querySelector('[role="dialog"][aria-modal="true"]');
