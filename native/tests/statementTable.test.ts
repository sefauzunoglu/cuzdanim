import assert from 'node:assert/strict';
import { parseTable, toAmount, toIsoDate, categoryFromLabel } from '../src/core/statementTable';
import { instOf } from '../src/core/statement';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('✓ ' + name); };

/** Gerçek bir banka Excel'inin düzenini taklit eden, tamamen uydurma veri. */
const H = ['Tarih', 'İşlem', 'Etiket', 'Bonus', 'Tutar(TL)'];
const ROWS: string[][] = [
  ['', '', '', '', ''],
  ['1111 **** **** 2222 Numaralı Kart TL Ekstre Bilgileri', '', '', '', ''],
  ['', '', '', '', ''],
  H,
  ['28/09/2026', 'ÖRNEK MARKET İSTANBUL', 'Market', '0,01', '-69,90'],
  ['27/09/2026', 'ÖRNEK RESTORAN İSTANBUL', 'Yeme / İçme', '0,00', '-405,00'],
  ['26/09/2026', 'ÖRNEK İSTASYON ANKARA', 'Akaryakıt', '0,00', '-1.500,00'],
  ['25/09/2026', 'ÖRNEK SİGORTA(1/9) İSTANBUL', 'Emeklilik/Sigorta', '1,61', '-358,22'],
  ['24/09/2026', 'ÖRNEK ABONELİK', 'Eğlence / Hobi', '0,00', '-1.182,50'],
  ['23/09/2026', 'ÖRNEK DÜKKAN ANKARA', 'Eğitim', '-107,55', ''],
  ['22/09/2026', 'KAMPANYA BONUS ', 'Diğer', '+105,00', ''],
  ['21/09/2026', 'Cep Şube Ödeme ', 'Kart Ödemesi', '0,00', '4.091,63'],
  ['', '', '', '', ''],
  ['3333 **** **** 4444 Numaralı Kart TL Ekstre Bilgileri', '', '', '', ''],
  H,
  ['20/09/2026', 'ÖRNEK GİYİM(2/3) ANKARA', 'Giyim / Aksesuar', '0,00', '-1.398,33'],
  ['19/09/2026', 'Int. Taksitli Nakit Avans(3/3) IST', 'Nakit Avans', '0,00', '-857,76'],
  ['18/09/2026', 'BİLİNMEYEN YER', 'Diğer', '0,00', '-50,00'],
];

t('tutar ve tarih biçimleri', () => {
  assert.equal(toAmount('-1.182,50'), -1182.5);
  assert.equal(toAmount('4.091,63'), 4091.63);
  assert.equal(toAmount('+105,00'), 105);
  assert.equal(toAmount(''), null);
  assert.equal(toAmount(1182.5), 1182.5);
  assert.equal(toAmount('1182,50-'), -1182.5);
  assert.equal(toIsoDate('28/09/2026'), '2026-09-28');
  assert.equal(toIsoDate('28.09.26'), '2026-09-28');
  assert.equal(toIsoDate('2026-09-28T00:00:00'), '2026-09-28');
  assert.equal(toIsoDate(46293), '2026-09-28');
  assert.equal(toIsoDate(new Date(2026, 8, 28, 0, 0, 0)), '2026-09-28');
  assert.equal(toIsoDate(new Date(2026, 8, 27, 23, 59, 40)), '2026-09-28');
  assert.equal(toIsoDate('Tarih'), '');
});

t('taksit (k/n) açıklamadan okunur', () => {
  assert.deepEqual(instOf('ÖRNEK SİGORTA(1/9) İSTANBUL'), { k: 1, n: 9 });
  assert.deepEqual(instOf('Int. Taksitli Nakit Avans(3/3) IST'), { k: 3, n: 3 });
  assert.equal(instOf('ÖRNEK MARKET İSTANBUL'), undefined);
  assert.equal(instOf('ÖRNEK(5/3) X'), undefined);
});

t('etiket → kategori', () => {
  assert.deepEqual(categoryFromLabel('Akaryakıt'), { cat: 'Araba', sub: 'Yakıt' });
  assert.equal(categoryFromLabel('Yeme / İçme')!.cat, 'Yemek');
  assert.equal(categoryFromLabel('Giyim / Aksesuar')!.cat, 'Giyim');
  assert.equal(categoryFromLabel('Kurum Ödemesi')!.cat, 'Fatura');
  assert.equal(categoryFromLabel('Sağlık / Bakım')!.cat, 'Sağlık');
  assert.equal(categoryFromLabel('Emeklilik/Sigorta'), null);
  assert.equal(categoryFromLabel(''), null);
});

t('iki kartlı dosya iki bölüme ayrılır, son 4 hane okunur', () => {
  const s = parseTable(ROWS);
  assert.equal(s.length, 2);
  assert.equal(s[0].last4, '2222');
  assert.equal(s[1].last4, '4444');
});

t('harcama, ödeme ve atlananlar doğru ayrılır', () => {
  const [a, b] = parseTable(ROWS);
  assert.equal(a.lines.length, 6);
  assert.equal(a.lines.filter((l) => l.kind === 'charge').length, 5);
  const pay = a.lines.find((l) => l.kind === 'payment')!;
  assert.equal(pay.amt, 4091.63);
  assert.equal(a.skipped.length, 2); // tutarsız iki bonus satırı
  assert.equal(b.lines.length, 3);
});

t('tutar, tarih, kategori ve taksit satır satır doğru', () => {
  const [a, b] = parseTable(ROWS);
  const by = (arr: typeof a.lines, s: string) => arr.find((l) => l.desc.includes(s))!;
  assert.equal(by(a.lines, 'MARKET').amt, 69.9);
  assert.equal(by(a.lines, 'MARKET').date, '2026-09-28');
  assert.equal(by(a.lines, 'MARKET').cat, 'Market');
  assert.equal(by(a.lines, 'RESTORAN').cat, 'Yemek');
  assert.deepEqual([by(a.lines, 'İSTASYON').cat, by(a.lines, 'İSTASYON').sub], ['Araba', 'Yakıt']);
  assert.deepEqual(by(a.lines, 'SİGORTA').inst, { k: 1, n: 9 });
  assert.equal(by(a.lines, 'SİGORTA').amt, 358.22);
  assert.equal(by(b.lines, 'GİYİM').cat, 'Giyim');
  assert.deepEqual(by(b.lines, 'Nakit Avans').inst, { k: 3, n: 3 });
  assert.equal(by(b.lines, 'BİLİNMEYEN').cat, 'Diğer');
});

t('başlıksız veya bölüm başlığı olmayan tablo da okunur', () => {
  const s = parseTable([H, ['01/10/2026', 'X MARKET', 'Market', '0,00', '-10,00']]);
  assert.equal(s.length, 1);
  assert.equal(s[0].last4, '');
  assert.equal(s[0].lines[0].amt, 10);
});

t('farklı sütun sırası başlık adından bulunur', () => {
  const s = parseTable([['Tutar', 'Tarih', 'Açıklama'], ['-12,50', '02/10/2026', 'KAHVE']]);
  assert.equal(s[0].lines[0].amt, 12.5);
  assert.equal(s[0].lines[0].date, '2026-10-02');
});

console.log(`\n${n} test geçti`);
