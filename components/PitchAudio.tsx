'use client';

// pitch-files 재생. 버킷이 비공개라 src는 서명 URL이어야 한다.
// 목록 렌더 때 파일 수백 개를 서명하지 않도록 ▶를 누를 때 받는다(auto면 마운트 즉시 — 이미 펼친 행).
import { useEffect, useState } from 'react';
import { pitchSignedUrl } from '@/lib/pitchAudio';
import { useLang } from '@/lib/lang';
import { warnFail } from '@/lib/log';

export default function PitchAudio({ fileUrl, D, h = 32, auto = false, onEnded }: { fileUrl: string; D: boolean; h?: number; auto?: boolean; onEnded?: () => void }) {
  const { t } = useLang();
  const [src, setSrc] = useState('');
  const [st, setSt] = useState<'idle' | 'loading' | 'err'>(auto ? 'loading' : 'idle');
  const fail = (e: unknown) => { warnFail('음원 서명 URL', e); setSt('err'); };
  useEffect(() => {
    if (auto) pitchSignedUrl(fileUrl).then(setSrc).catch(fail);
  }, [auto, fileUrl]);
  const load = () => { setSt('loading'); pitchSignedUrl(fileUrl).then(setSrc).catch(fail); };

  if (src) return <audio autoPlay controls src={src} className="w-full" style={{ height: `${h}px`, colorScheme: D ? 'dark' : 'light' }} onEnded={onEnded} />;
  const err = st === 'err';
  return (
    <button onClick={load} disabled={st === 'loading'} style={{ height: `${h}px` }}
      className={`w-full rounded-full border flex items-center justify-center gap-1.5 text-mini font-bold transition ${err ? 'border-red-500/25 bg-red-500/10 text-red-400' : D ? 'border-white/10 bg-white/5 text-zinc-400 hover:text-white' : 'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>
      <i className={st === 'loading' ? 'ti ti-loader-2 animate-spin' : err ? 'ti ti-alert-circle' : 'ti ti-player-play'} aria-hidden="true"></i>
      {st === 'loading' ? t('불러오는 중', 'Loading') : err ? t('재생 실패 — 다시 시도', 'Playback failed — retry') : t('재생', 'Play')}
    </button>
  );
}
