const trNum = (n: number, digits: number) =>
  Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 1.250 ₺ veya 1.250,50 ₺ (küsurat varsa). */
export const fmt = (n: number) => {
  n = +n || 0;
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return (n < -0.004 ? '−' : '') + trNum(n, whole ? 0 : 2) + ' ₺';
};
/** Her zaman tam sayı. */
export const fmtI = (n: number) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('tr-TR') + ' ₺';
/** Yüzde veya adet: 3,75 */
export const pc = (n: number) => String(+(+n).toFixed(2)).replace('.', ',');
/** Girişte virgül ondalık, nokta binlik kabul edilir (1.250,50 veya 1250.5). */
export const num = (v: unknown): number => {
  let s = String(v ?? '').trim().replace(/[₺\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
/** Formda gösterim: 0 ise boş. */
export const nv = (v: number) => (v > 0 ? String(v).replace('.', ',') : '');
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const sum = <T>(a: T[], f: (x: T) => number = (x) => x as unknown as number) =>
  a.reduce((t, x) => t + (+f(x) || 0), 0);
