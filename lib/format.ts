import { getLang } from './lang';

// 날짜·숫자 표기 단일 출처.
//
// 전에는 화면마다 new Date(x).toLocaleDateString('ko-KR', …) 를 직접 불렀다. 문제 둘:
//  1) 로케일이 'ko-KR'로 박혀 있어 영어 사용자한테도 한국식 날짜가 나갔다.
//  2) 리스트 안에서 매 행마다 Intl 인스턴스를 새로 만든다 — Intl 생성자는 비싸다.
// 여기서 언어를 읽고 포매터를 캐시한다.

const dateCache = new Map<string, Intl.DateTimeFormat>();
const numCache = new Map<string, Intl.NumberFormat>();

function locale() {
  return getLang() === 'ko' ? 'ko-KR' : 'en-US';
}

export function fmtDate(
  value: string | number | Date,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
) {
  const key = locale() + JSON.stringify(opts);
  let f = dateCache.get(key);
  if (!f) { f = new Intl.DateTimeFormat(locale(), opts); dateCache.set(key, f); }
  return f.format(new Date(value));
}

export function fmtNumber(value: number, opts?: Intl.NumberFormatOptions) {
  const key = locale() + JSON.stringify(opts ?? {});
  let f = numCache.get(key);
  if (!f) { f = new Intl.NumberFormat(locale(), opts); numCache.set(key, f); }
  return f.format(value);
}
