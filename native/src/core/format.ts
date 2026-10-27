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

/**
 * Tutar yazılırken canlı biçimlendirme: binlik ayracı nokta, ondalık ayracı virgül.
 * Virgül her zaman ondalıktır. Nokta için:
 *  - biçimlendirici binlik noktaları kendisi eklediyse (wasAuto) sonradan yazılan nokta ondalıktır ("1250.5" → "1.250,5");
 *  - kullanıcı noktaları kendisi yazdıysa ("1.234.567") binlik sayılır;
 *  - 4+ haneden sonra gelen nokta ondalıktır;
 *  - kısa sayıdan sonra gelen nokta ("12.5") belirsizdir: yazarken olduğu gibi bırakılır,
 *    alandan çıkılırken (final=true) ondalık kabul edilir ("12,5").
 * Dönen auto: metindeki binlik noktaları biçimlendirici ekledi mi (sonraki çağrıya wasAuto olarak verilir).
 * İmleç konumu, öncesindeki rakam sayısına göre korunur.
 */
export function formatAmountInput(raw: string, caret: number = raw.length, maxDec = 2, final = false, wasAuto = false): { text: string; caret: number; auto: boolean } {
  const s = raw.replace(/[^\d.,]/g, '');
  const keep = { text: s, caret: Math.min(caret, s.length), auto: false };
  const grouped = /^\d{1,3}(\.\d{3})+$/;
  let int = '', dec: string | null = null, typedDots = false;
  if (s.includes(',')) {
    const i = s.indexOf(',');
    int = s.slice(0, i).replace(/\D/g, '');
    dec = s.slice(i + 1).replace(/\D/g, '').slice(0, maxDec);
  } else if (s.includes('.')) {
    if (s.endsWith('.')) {
      const rest = s.slice(0, -1);
      if (/^\d{4,}$/.test(rest)) { int = rest; dec = ''; }
      else if (grouped.test(rest)) {
        if (wasAuto) { int = rest.replace(/\./g, ''); dec = ''; }
        else { return keep; }   // kullanıcı binlik yazıyor olabilir: bekle
      } else if (/^\d{1,3}$/.test(rest)) { if (!final) return keep; int = rest; dec = ''; }
      else { int = s.replace(/\D/g, ''); }
    } else if (grouped.test(s)) {
      int = s.replace(/\./g, ''); typedDots = !wasAuto;
    } else if (/^\d+\.\d{1,2}$/.test(s)) {
      const i = s.indexOf('.');
      if (i <= 3 && !final) return keep;
      int = s.slice(0, i); dec = s.slice(i + 1).slice(0, maxDec);
    } else if (!final && /^\d{1,3}(\.\d{1,3})*$/.test(s) && !wasAuto) {
      return keep;              // "1.234.5": binlik yazılıyor olabilir, bekle
    } else {
      int = s.replace(/\D/g, '');
    }
  } else int = s;
  int = int.replace(/^0+(?=\d)/, '');
  const groupedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const lead = int === '' && dec !== null ? '0' : groupedInt;
  const text = lead + (dec !== null ? ',' + dec : '');
  const auto = dec === null && groupedInt.includes('.') && !typedDots;
  const before = raw.slice(0, caret);
  const dBefore = (before.match(/\d/g) || []).length;
  const decBefore = dec !== null && /[.,]/.test(before);
  let pos = 0, seen = 0;
  if (dBefore > 0) {
    for (; pos < text.length; pos++) { if (/\d/.test(text[pos])) seen++; if (seen === dBefore) { pos++; break; } }
  }
  if (decBefore && text[pos] === ',') pos++;
  return { text, caret: Math.min(pos, text.length), auto };
}
