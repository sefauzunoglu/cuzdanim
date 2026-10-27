import assert from 'node:assert/strict';
import { parseStatement, guessCategory, trUp } from '../src/core/statement';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('✓ ' + name); };

const SAMPLE = `
GARANTİ BBVA
Hesap Kesim Tarihi 20/10/2026
Son Ödeme Tarihi 30/10/2026
Kart Limiti 90.000,00 TL
Dönem Borcu 30.240,97 TL
Asgari Ödeme Tutarı 6.048,19 TL
İşlem Tarihi Açıklama Tutar
12/10/2026 MIGROS ISTANBUL 640,00
13/10/2026 SHELL AKARYAKIT 1.850,00
14/10/2026 YEMEKSEPETI 420,50
15/10/2026 SAMSUNG TELEFON 4/12 TAKSİT 3.000,00
16.10.2026 NETFLIX.COM 229,99
17/10/2026 TRENDYOL
ISTANBUL 1.249,90
18/10/2026 MOBİL ÖDEME -5.000,00
19/10/2026 BİM A.Ş. 312,40 15,62
`;

t('sayı ve harf sadeleştirme', () => { assert.equal(trUp('Dönem Borcu İŞ'), 'DONEM BORCU IS'); });

t('ekstre özeti okunur', () => {
  const { summary } = parseStatement(SAMPLE);
  assert.equal(summary.cutoff, '2026-10-20');
  assert.equal(summary.due, '2026-10-30');
  assert.equal(summary.limit, 90000);
  assert.equal(summary.total, 30240.97);
  assert.equal(summary.min, 6048.19);
});

t('harcama satırları, tutarlar ve tarihler', () => {
  const { lines } = parseStatement(SAMPLE);
  const by = (s: string) => lines.find((l) => l.desc.includes(s))!;
  assert.equal(lines.length, 8);
  assert.equal(by('MIGROS').amt, 640);
  assert.equal(by('MIGROS').date, '2026-10-12');
  assert.equal(by('SHELL').amt, 1850);
  assert.equal(by('YEMEKSEPETI').amt, 420.5);
  assert.equal(by('NETFLIX').date, '2026-10-16');
});

t('çok satırlı açıklama birleştirilir', () => {
  const { lines } = parseStatement(SAMPLE);
  const l = lines.find((x) => x.desc.includes('TRENDYOL'))!;
  assert.equal(l.amt, 1249.9);
  assert.ok(l.desc.includes('ISTANBUL'));
});

t('taksit satırı k/n olarak tanınır', () => {
  const { lines } = parseStatement(SAMPLE);
  const l = lines.find((x) => x.desc.includes('SAMSUNG'))!;
  assert.deepEqual(l.inst, { k: 4, n: 12 });
  assert.equal(l.amt, 3000);
});

t('ödeme ve iade harcama sayılmaz', () => {
  const { lines } = parseStatement(SAMPLE);
  const p = lines.find((x) => x.desc.includes('MOBİL'))!;
  assert.equal(p.kind, 'payment');
  assert.equal(p.amt, 5000);
});

t('birden fazla tutar olan satır işaretlenir, ilk tutar alınır', () => {
  const { lines } = parseStatement(SAMPLE);
  const l = lines.find((x) => x.desc.includes('BİM'))!;
  assert.equal(l.amt, 312.4);
  assert.equal(l.multi, true);
});

t('kategori tahmini', () => {
  assert.equal(guessCategory('MIGROS ISTANBUL').cat, 'Market');
  assert.deepEqual(guessCategory('SHELL AKARYAKIT'), { cat: 'Araba', sub: 'Yakıt' });
  assert.equal(guessCategory('NETFLIX.COM').cat, 'Eğlence');
  assert.equal(guessCategory('YEMEKSEPETİ').cat, 'Yemek');
  assert.equal(guessCategory('BİLİNMEYEN DÜKKAN').cat, 'Diğer');
  assert.equal(guessCategory('SAMSUNG TELEFON 4/12 TAKSİT').cat, 'Diğer');
  assert.equal(guessCategory('BITAXI ISTANBUL').cat, 'Ulaşım');
});

t('iki haneli yıl ve nokta ayracı', () => {
  const { lines } = parseStatement('05.11.26 STARBUCKS 185,00');
  assert.equal(lines[0].date, '2026-11-05');
  assert.equal(lines[0].cat, 'Yemek');
});

t('başlık ve özet satırları harcama sayılmaz', () => {
  const { lines } = parseStatement('Hesap Kesim Tarihi 20/10/2026\nDönem Borcu 1.000,00\nSon Ödeme Tarihi 30/10/2026 6.048,19');
  assert.equal(lines.length, 0);
});

console.log(`\n${n} test geçti`);
