'use client';

// 화면마다 토스트 마크업을 따로 들고 있었다(6곳). 모양 결정이 바뀔 때마다 6번 고쳐야 했고,
// 전부 role/aria-live가 없어 스크린리더엔 아무 말도 안 했다. 한 곳으로 모은다.
//
// 모양: 알약 + 상태 아이콘. 성공/실패는 문구로 판별한다 — 호출부가 문자열 하나만
// 넘기는 구조라 플래그를 새로 받으려면 6곳을 다 고쳐야 해서, 문구를 읽는 쪽을 택했다.
// ponytail: 문자열 매칭. 호출부가 상태를 넘기게 되면 그때 prop으로 바꾼다.

const BAD = /실패|오류|에러|없습니다|Failed|Error|Invalid/i;

export default function Toast({ msg, z = 'z-[60]' }: { msg: string; z?: string }) {
  if (!msg) return null;
  const bad = BAD.test(msg);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-6 left-1/2 -translate-x-1/2 ${z} flex items-center gap-2
 bg-white/10 backdrop-blur-md border border-white/20 text-white
        text-mini font-bold px-5 py-3 rounded-full shadow-lg font-ui`}
    >
      <i
        className={`ti ${bad ? 'ti-alert-circle' : 'ti-circle-check'} ${bad ? 'text-[#E0575F]' : 'text-[#77B18E]'}`}
        aria-hidden="true"
      />
      {msg}
    </div>
  );
}
