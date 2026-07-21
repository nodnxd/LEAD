// 확정일(월 + 일 배열) → 종일 일정 .ics 생성/다운로드
export function buildDaysIcs(title: string, month: string, days: number[], uidSeed: string) {
  const [y, m] = month.split('-').map(Number);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const events = days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => {
      const end = new Date(y, m - 1, d + 1);
      return [
        'BEGIN:VEVENT',
        `UID:${uidSeed}-${d}@castbynen`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${y}${p2(m)}${p2(d)}`,
        `DTEND;VALUE=DATE:${end.getFullYear()}${p2(end.getMonth() + 1)}${p2(end.getDate())}`,
        `SUMMARY:${esc(title)}`,
        'END:VEVENT',
      ].join('\r\n');
    })
    .join('\r\n');
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CAST by NEN//availability//EN\r\n${events}\r\nEND:VCALENDAR`;
}

export function downloadIcs(filename: string, ics: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
