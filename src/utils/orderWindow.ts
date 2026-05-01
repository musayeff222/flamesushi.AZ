/** Sürahlı saat üçün dəqiqə (günorta = 12*60+) */
export function hhmmToMinutes(s: unknown): number | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  const parts = s.trim().split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1] ?? 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return Math.min(23, Math.max(0, hh)) * 60 + Math.min(59, Math.max(0, mm));
}

/** 00:00 son bitiş kimi günün sonunu ifadə edə bilər (24*60 dəqiqə) */
export function hhmmWindowEndExclusive(s: unknown): number | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  const raw = s.trim();
  if (raw === '00:00' || raw === '24:00')
    return 24 * 60;
  const m = hhmmToMinutes(raw);
  return m;
}

/** İndi `start` ilə `end` aralığındadır? Gecə növbəsində (bitiş≤başlanğıc) uyğunlaşdırılır */
export function isWithinOrderWindow(
  date: Date,
  startHm: unknown,
  endHm: unknown,
): boolean {
  const cur = date.getHours() * 60 + date.getMinutes();
  const sm = hhmmToMinutes(startHm);
  let em = hhmmWindowEndExclusive(endHm);
  if (sm === null || em === null) return true;
  if (em <= 0 || em >= 24 * 60) em = 24 * 60;

  /* Eyni gün içi: başlanğıc < bitiş məs 9:30 – 23:00 */
  if (sm < em) return cur >= sm && cur < em;

  /* Gecə çoxluğu məs 22:00 – 06:00 */
  return cur >= sm || cur < em;
}

export function formatOrderWindowMessage(start: unknown, end: unknown): string {
  const ss = typeof start === 'string' ? start.trim() : '';
  const ee = typeof end === 'string' ? end.trim() : '';
  if (!ss && !ee) return '';
  return `Bu məhsul yalnız ${ss || '?'} – ${ee || '?'} arası sifariş edilə bilər`;
}
