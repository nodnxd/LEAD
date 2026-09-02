// 헤더 제품 토글의 가로 휠 전환 판정. 순수 함수로 빼둔 이유는 조용히 틀리기 때문이다 —
// 임계값이 낮으면 스크롤하다 제품이 바뀌고, 쿨다운이 없으면 관성 스크롤이 두 칸을 넘긴다.
// 둘 다 화면엔 에러가 안 뜨고 "왜 갑자기 넘어갔지"로만 나타난다.

/** 넘어가기까지 필요한 가로 누적 픽셀 (2단 장치의 2단) */
export const ARM_PX = 140;
/** 전환 직후 잠그는 시간 — 관성 스크롤이 연달아 넘기는 걸 막는다 */
export const COOLDOWN_MS = 650;

export type ArmState = { accum: number; lockUntil: number };

export type WheelResult = {
  state: ArmState;
  /** -1..1 — 인디케이터가 어느 쪽으로 얼마나 찼는지 */
  arm: number;
  /** 이번 입력으로 실제 이동할 방향. 0이면 이동 없음 */
  move: -1 | 0 | 1;
};

export const initialArm = (): ArmState => ({ accum: 0, lockUntil: 0 });

export function stepWheel(
  s: ArmState,
  dx: number,
  now: number,
  idx: number,
  count: number,
): WheelResult {
  if (now < s.lockUntil) return { state: s, arm: 0, move: 0 };

  // 방향을 바꾸면 누적을 버린다 — 좌우로 흔들어서 채우는 걸 막는다.
  const accum = (s.accum !== 0 && Math.sign(dx) !== Math.sign(s.accum) ? 0 : s.accum) + dx;

  if (Math.abs(accum) < ARM_PX) {
    return {
      state: { ...s, accum },
      arm: Math.max(-1, Math.min(1, accum / ARM_PX)),
      move: 0,
    };
  }

  const dir: -1 | 1 = accum > 0 ? 1 : -1;
  const next = idx + dir;
  // 끝에서 더 밀면 갈 곳이 없다. 누적만 비우고 잠그지는 않는다 —
  // 반대로 되돌릴 땐 바로 반응해야 하므로.
  if (next < 0 || next >= count) return { state: { ...s, accum: 0 }, arm: 0, move: 0 };

  return { state: { accum: 0, lockUntil: now + COOLDOWN_MS }, arm: 0, move: dir };
}
