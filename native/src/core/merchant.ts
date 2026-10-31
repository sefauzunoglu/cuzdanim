import type { State } from './types';

/** Ekstre açıklamasından taksit ibaresini ve "(kalan taksitler)" ekini atar, boşlukları toplar, büyük harfe çevirir. */
export const stmtRoot = (x: string) => String(x || '').toUpperCase().replace(/\(KALAN TAKS[^)]*\)/g, ' ').replace(/\(\d+\/\d+\)/g, ' ').replace(/\s+/g, ' ').trim();

/** Bankanın açıklamaya eklediği tutar (200,00 TL, 24,00 USD) gibi parçaları atar. */
export const mClean = (d: string) => String(d || '').replace(/ ?\(kalan taksitler\)/, '')
  .replace(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g, ' ').replace(/\b(TL|USD|EUR|GBP)\b/gi, ' ').replace(/\s+/g, ' ').trim();

/** İşyeri anahtarı: temiz açıklamanın ilk üç sözcüğü. Kural ve gruplama bununla yapılır. */
export const mKey = (d: string) => stmtRoot(mClean(d)).replace(/İ/g, 'I').split(' ').filter(Boolean).slice(0, 3).join(' ');

/** Gösterim için "Netflix.Com" gibi baş harfleri büyük ad. */
export const mNice = (d: string) => mClean(d).replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase()
  .replace(/(^|[\s\-/.*(])(\S)/g, (_m, a: string, b: string) => a + b.toLocaleUpperCase('tr-TR'));

/** Eşleştirme anahtarı: Türkçe harfler sadeleşir, harf ve rakam dışı her şey atılır. */
export const recKey = (x: string) => String(x || '').toUpperCase().replace(/İ/g, 'I')
  .replace(/[ÇĞÖŞÜ]/g, (m) => ({ Ç: 'C', Ğ: 'G', Ö: 'O', Ş: 'S', Ü: 'U' } as Record<string, string>)[m]).replace(/[^A-Z0-9]/g, '');

/** Kayıtlı kategori kuralı (işyeri → kategori). */
export const ruleFor = (S: State, desc: string) => { const k = mKey(desc); return (S.cfg.rules || []).find((r) => r.k === k); };
