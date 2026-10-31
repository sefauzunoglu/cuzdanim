import assert from 'node:assert/strict';
import * as c from '../src/core';

/* Sahte veriyle (gerçek ekstre değil) bankadan güncelleme akışı: PDF + dönem içi Excel + sabit gider + kategori kuralı. */
const FIXED = new Date(2026, 10, 1, 12, 0, 0);
c.clock.now = () => new Date(FIXED.getTime());
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('✓ ' + name); };

const PDF = `
Bonus Test Bilgileriniz                         Son Ödeme Tarihi: 09 Kasım 2026
Kart Numarası                         4043 08** **** 1111
Hesap Kesim Tarihi                         30 Ekim 2026
Dönem Borcunuz                            20.000,00 TL
Min. Ödeme Tutarı                         8.000,00 TL
ÖNCEKİ DÖNEMDEN DEVİR EDİLEN TUTAR                         10.000,00
01 Ekim 2026   ÖDEMENİZ İÇİN TEŞEKKÜR EDERİZ                  2.000,00+
bosluk
03 Ekim 2026   SHELL TEST                       0,12     400,00
05 Ekim 2026   MANGO TEST      874,97x2=1.749,94 1.Taksit   1,57   874,97
29 Eylül 2026  ECZANE TEST     337,54x3=1.012,62 1.Taksit        337,54
bosluk
Giyim Kadın, Erkek ve Aile
12 Ekim 2026   BURAK TEST                                  230,70
14 Ekim 2026   NETFLIX.COM 389,99 TL                                 390,00
BONUS SANAL KART BİLGİLERİNİZ: AD SOYAD / 5440 78** **** 2222
10 Ekim 2026   AXA TEST        2.575,25x6=15.451,53 2.Taksit  2.575,25
02 Ekim 2026   UBER TEST YEMEK                              393,90
`;
const OPEN_ROWS: any[][] = [[], ['Dönemiçi İşlemler - TL'], ['Tarih', 'İşlem', 'Etiket', 'Bonus', 'Tutar(TL)'],
  ['20/11/2026', 'MANGO TEST (2/2) İSTANBUL', 'Giyim', '', '-874,97'], ['29/10/2026', 'ECZANE TEST (2/3) ANKARA', 'Sağlık', '', '-337,54'],
  ['10/11/2026', 'AXA TEST (3/6) İSTANBUL', 'Sigorta', '', '-2.575,25'], ['01/11/2026', 'YENI MARKET ANKARA', 'Market', '', '-100,00']];

const mkState = (): c.State => {
  const S = c.emptyData();
  S.cards.push({ id: 'A', name: 'Test kartı', limit: 100000, cutoff: 30, due: 9, since: '2026-11-01', last4: '1111', vcards: [{ id: 'V', name: 'Sanal', last4: '2222' }] });
  return S;
};
const card = (S: c.State) => S.cards[0];

t('PDF ayrıştırma: özet, ana/sanal ayrımı, taksit, ödeme atlanır, tutar eki temizlenir', () => {
  const r = c.parseGarantiPdf(PDF);
  assert.equal(r.meta.cut, '2026-10-30'); assert.equal(r.meta.due, '2026-11-09'); assert.equal(r.meta.debt, 20000); assert.equal(r.meta.min, 8000);
  assert.equal(r.meta.last4, '1111'); assert.equal(r.meta.devir, 10000);
  assert.equal(r.lines.length, 7);                              // ödeme satırı yok
  assert.equal(r.lines.filter((l) => l.v === '2222').length, 2);
  const mango = r.lines.find((l) => l.desc === 'MANGO TEST')!;
  assert.deepEqual(mango.inst, { k: 1, n: 2 }); assert.equal(mango.amt, 874.97);
  assert.equal(r.lines.find((l) => l.desc.startsWith('BURAK'))!.cat, 'Giyim');   // başlıktan kategori
});

t('PDF akışı: kesilmiş borç dönem borcuna sabitlenir, taksitler bankanın dönemine oturur', () => {
  const S = mkState(), r = c.parseGarantiPdf(PDF);
  assert.equal(c.syncCheck(card(S), '', 'last', 0).length > 0, true);          // borç kutusu boşsa engel
  const res = c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: r.meta.debt });
  assert.equal(res.plan.add.length, 7);
  const i = c.cardInfo(S, card(S));
  assert.equal(Math.round(i.closedDebt), 20000);
  // Kasım açık dönem: MANGO 2/2 (874,97) + ECZANE 2/3 (337,54) + AXA 3/6 (2575,25); sanal harcama sayılmaz
  assert.equal(Math.round(i.openDebt * 100) / 100, 874.97 + 337.54 + 2575.25);
  // Gelecek: ECZANE 3/3 + AXA 4,5,6/6
  assert.equal(Math.round(i.future * 100) / 100, Math.round((337.54 + 3 * 2575.25) * 100) / 100);
  assert.equal(S.tx.filter((x) => x.vc === 'V').length, 2);
});

t('kesim günü kayması: 29 Eylül taksiti bankanın dönemine oturur, yeniden yüklemede eski kayıt düzelir', () => {
  const S = mkState(), r = c.parseGarantiPdf(PDF);
  c.syncApply(S, card(S), '', 'last', r.lines, undefined, { stmt: 20000 });       // PDF kesim tarihi olmadan (eski davranış)
  const before = c.cardInfo(S, card(S)).future;
  const res = c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: 20000 });
  assert.ok(res.plan.fixes.length >= 1);
  assert.ok(c.cardInfo(S, card(S)).future > before);                                 // eksik son taksit geri geldi
  const again = c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: 20000 });
  assert.equal(again.plan.fixes.length, 0); assert.equal(again.plan.add.length, 0);
});

t('dönem içi Excel: kayıtlı taksitler atlanır, yeni harcama eklenir, yeniden yükleme çift saymaz', () => {
  const S = mkState(), r = c.parseGarantiPdf(PDF);
  c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: 20000 });
  const lines = c.parseTable(OPEN_ROWS)[0].lines;
  assert.equal(c.detectKind(OPEN_ROWS), 'open');
  const a = c.syncApply(S, card(S), '', 'open', lines, null);
  assert.equal(a.plan.add.length, 1); assert.equal(a.plan.skip.length, 3);
  const open1 = c.cardInfo(S, card(S)).openDebt;
  const b = c.syncApply(S, card(S), '', 'open', lines, null);                        // aynı dosya yeniden
  assert.equal(b.plan.drop.length, 1); assert.equal(c.cardInfo(S, card(S)).openDebt, open1);
});

t('devreden borç: son ödeme geçince asgari istenmez, faiz tahmini sonraki ekstreye eklenir', () => {
  const S = mkState();
  S.cards[0].openDebt = 50000;
  c.clock.now = () => new Date(2026, 10, 15, 12, 0, 0);   // 15 Kasım: ekstrenin son ödeme günü (9 Kasım) geçti
  const i = c.cardInfo(S, card(S));
  assert.equal(i.pastDue, true); assert.equal(i.min, 0); assert.equal(i.devir, 50000);
  assert.ok(Math.abs(i.interestNext - 50000 * i.rate / 100) < 0.01);
  assert.ok(Math.abs(i.nextEst - (50000 + i.interestNext)) < 0.01);
  const tip = c.advice(S).find((x) => x.t.includes('devreden borç'));
  assert.ok(tip && !tip.t.includes('gecikti'));
  const up = c.upcoming(S, 40).find((u) => u.k === 'card');
  assert.ok(up && up.amt === i.nextEst);
  c.clock.now = () => new Date(FIXED.getTime());
  assert.equal(c.cardInfo(S, card(S)).pastDue, false);        // 1 Kasım: henüz ödenecek ekstre
});

t('sabit gider: bankadaki yazıyla eşleşir, otomatik kayıt yerine gerçek kayıt kalır, çift sayılmaz', () => {
  const S = mkState();
  c.clock.now = () => new Date(2026, 9, 20, 12, 0, 0);    // 20 Ekim: 14 Ekim abonelik günü geçti, otomatik işlenir
  c.saveRecurring(S, { kind: 'Abonelik', name: 'Netflix', key: 'NETFLIX', amt: 300, day: 14, src: 'card:A', auto: true });
  const r0 = S.recurring[0];
  assert.equal(S.tx.filter((x) => x.rec === r0.id).length, 1);                        // otomatik işlendi
  const lines = c.parseGarantiPdf(PDF).lines;
  const res = c.syncApply(S, card(S), '', 'last', lines, undefined, { stmt: 1 });
  assert.equal(res.plan.matches.length, 1); assert.equal(S.tx.filter((x) => x.rec === r0.id).length, 1);
  assert.equal(S.tx.find((x) => x.rec === r0.id)!.auto, undefined);
  assert.equal(r0.amt, 390);                                                         // tutar bankadakine güncellendi
  c.clock.now = () => new Date(FIXED.getTime());
});

t('sabit gider: bu ay atla ve durdurulmuşu yeniden açınca geçmiş aylar işlenmez', () => {
  const S = mkState();
  c.clock.now = () => new Date(2026, 10, 20, 12, 0, 0);
  c.saveRecurring(S, { kind: 'Fatura', name: 'Elektrik', amt: 500, day: 5, src: 'card:A', auto: false });
  const r = S.recurring[0], cm = c.ymOf(c.clock.now());
  assert.ok(c.upcoming(S, 40).some((u) => u.k === 'rec'));
  c.skipRecurring(S, r.id, cm);
  assert.equal(c.recDone(S, r, cm) !== undefined, true);
  c.unskipRecurring(S, r.id, cm);
  assert.equal(!!c.recDone(S, r, cm), false);
  c.saveRecurring(S, { id: r.id, kind: 'Fatura', name: 'Elektrik', amt: 500, day: 5, src: 'card:A', auto: true, active: false });
  S.tx.length = 0;
  c.saveRecurring(S, { id: r.id, kind: 'Fatura', name: 'Elektrik', amt: 500, day: 5, src: 'card:A', auto: true, active: true });
  assert.equal(S.tx.length, 1);                                                       // yalnızca bu ay
  c.clock.now = () => new Date(FIXED.getTime());
});

t('kart harcamasından sabit gider: öneri, otomatik doldurma, o ayın gideri ödendi sayılır', () => {
  const S = mkState(), r = c.parseGarantiPdf(PDF);
  c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: 20000 });
  const gs = c.recPickGroups(S), nf = gs.find((g) => g.name.toUpperCase().startsWith('NETFLIX'))!;
  assert.ok(nf.sug); assert.equal(nf.name.includes('389'), false);                    // tutar eki temizlendi
  const pf = c.recPrefill(nf);
  assert.equal(pf.kind, 'Abonelik'); assert.equal(pf.day, 14); assert.equal(pf.src, 'card:A');
  const rec = c.saveRecurring(S, { ...pf, auto: false });
  assert.equal(S.recPaid[rec.id + '|' + c.ymOf(new Date(2026, 9, 14))], pf.fromTx);
  assert.equal(c.recPickGroups(S).some((g) => g.k === nf.k), false);                  // eklenen artık listede görünmez
});

t('toplu kategori: yeni kategori, taşıma, kural sonraki aktarmada uygulanır; arabaya bağlama', () => {
  const S = mkState(), r = c.parseGarantiPdf(PDF);
  c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: 20000 });
  const gs = c.merchantGroups(S, 'A', 'prev', 'Diğer');
  assert.ok(gs.length >= 1);
  const cat = c.addCategory(S, 'Kuruyemiş');
  assert.ok(c.CATS.includes('Kuruyemiş')); assert.deepEqual(S.cfg.cats, ['Kuruyemiş']);
  assert.equal(c.addCategory(S, 'kuruyemiş'), 'Kuruyemiş');                         // aynı ad tekrar açılmaz
  const moved = c.moveCategory(S, 'A', 'Diğer', cat, [gs[0].k], true);
  assert.ok(moved >= 1); assert.equal(S.cfg.rules!.length, 1);
  S.tx = [];
  c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: 20000 });
  assert.ok(S.tx.some((x) => x.cat === 'Kuruyemiş'));                                 // kural uygulandı
  // araba
  S.cars.push({ id: 'C', name: 'Araba' });
  const unl = c.unlinkedCarTx(S).length;
  assert.equal(c.linkCarTx(S, 'C'), unl); assert.equal(c.unlinkedCarTx(S).length, 0);
});

t('tek araba varsa içe aktarılan araba harcamaları otomatik bağlanır', () => {
  const S = mkState(); S.cars.push({ id: 'C', name: 'Araba' });
  const r = c.parseGarantiPdf(PDF);
  c.syncApply(S, card(S), '', 'last', r.lines, r.meta, { stmt: 20000 });
  assert.ok(S.tx.filter((x) => x.cat === 'Araba').every((x) => x.car === 'C'));
  assert.ok(S.tx.some((x) => x.cat === 'Araba'));
});

console.log(n + ' test geçti');
