// 실패해도 흐름을 멈추지 않는 작업(백필, 스토리지 정리, 초대 클레임)의 로그.
//
// 예전엔 `catch {}`로 통째로 삼켰다. 사용자에겐 아무 일도 안 일어난 것처럼 보이고,
// 콘솔에도 흔적이 없어서 "초대했는데 안 들어와져요" 같은 제보를 재현할 단서가 없었다.
// 흐름을 멈출 필요는 없지만 흔적은 남긴다.
export function warnFail(where: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn(`[${where}] 실패(무시하고 계속): ${msg}`);
}
