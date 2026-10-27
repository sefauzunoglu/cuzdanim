import assert from 'node:assert/strict';
import * as c from '../src/core';

const FIXED = new Date(2026, 9, 27, 12, 0, 0);
c.clock.now = () => new Date(FIXED.getTime());
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('✓ ' + name); };

t('num: Türkçe ve nokta ondalık girişleri okur', () => {
  assert.equal(c.num('1.250,50'), 1250.5);
  assert.equal(c.num('1250.5'), 1250.5);
  assert.equal(c.num('1.250'), 1250);
  assert.equal(c.num('12,5'), 12.5);
  assert.equal(c.num(''), 0);
  assert.equal(c.num('₺ 3.000'), 3000);
});

t('fmt: tam sayı ve küsurat gösterimi', () => {
  assert.equal(c.fmt(1250), '1.250 ₺');
  assert.equal(c.fmt(1250.5), '1.250,50 ₺');
  assert.equal(c.fmtI(-1250.4), '−1.250 ₺');
});

t('otomatik asgari oran ve faiz basamakları', () => {
  assert.equal(c.autoMinRate(100000), 20);
  assert.equal(c.autoMinRate(100001), 40);
  assert.equal(c.autoRate(29999), 3.25);
  assert.equal(c.autoRate(30001), 3.75);
  assert.equal(c.autoRate(180001), 4.25);
});

t('geçmiş taksit: takip başlangıcından önceki taksitler ödenmiş sayılır', () => {
  const S = c.emptyData();
  const card = { id: 'c', name: 'K', limit: 50000, cutoff: 10, due: 20, openDebt: 8000, since: c.today() };
  S.cards.push(card);
  const d = new Date(FIXED); d.setMonth(d.getMonth() - 6);
  S.tx.push({ id: 't', date: c.iso(d), amt: 12000, cat: 'Diğer', src: 'card:c', note: 'Telefon', inst: 12 });
  const i = c.cardInfo(S, card);
  assert.equal(Math.round(i.currentDebt), 9000);   // 8.000 kesilmiş ekstre + bu ayın 1.000 taksiti
  assert.equal(Math.round(i.closedDebt), 8000);
  assert.equal(Math.round(i.future), 5000);        // kalan 5 taksit
  assert.equal(Math.round(i.avail), 36000);
});

t('kart ödemesi borcu düşürür, fazlası açık döneme sayılır', () => {
  const S = c.emptyData();
  const card = { id: 'c', name: 'K', limit: 90000, cutoff: 28, due: 5, openDebt: 10000, since: c.today() };
  S.cards.push(card);
  c.payCard(S, 'c', 4000, '');
  assert.equal(Math.round(c.cardInfo(S, card).closedDebt), 6000);
  c.payCard(S, 'c', 7000, '');
  const i = c.cardInfo(S, card);
  assert.equal(Math.round(i.closedDebt), 0);
  assert.equal(Math.round(i.currentDebt), 0);
});

t('otomatik sabit gider: geçmiş aylar tamamlanır, ikinci çalıştırma eklemez', () => {
  const S = c.emptyData(), cm = c.ymOf(FIXED);
  S.cards.push({ id: 'c', name: 'K', limit: 50000, cutoff: 28, due: 5, openDebt: 0, since: '2020-01-01' });
  S.recurring.push({ id: 'r', kind: 'Abonelik', name: 'Netflix', amt: 200, day: 1, src: 'card:c', active: true, auto: true, autoFrom: cm - 2 });
  assert.equal(c.processAuto(S), 3);
  assert.equal(c.processAuto(S), 0);
  assert.equal(S.tx.length, 3);
  assert.equal(Object.keys(S.recPaid).length, 3);
});

t('geri alınan otomatik ödeme yeniden eklenmez', () => {
  const S = c.emptyData(), cm = c.ymOf(FIXED);
  S.recurring.push({ id: 'r', kind: 'Abonelik', name: 'N', amt: 200, day: 1, src: 'acc:a', active: true, auto: true, autoFrom: cm });
  c.processAuto(S);
  assert.equal(S.tx.length, 1);
  assert.ok(c.undoRecurring(S, 'r'));
  assert.equal(S.tx.length, 0);
  assert.equal(c.processAuto(S), 0);
});

t('harcama silinince otomatik işleme aynı ayı yeniden eklemez', () => {
  const S = c.emptyData(), cm = c.ymOf(FIXED);
  S.recurring.push({ id: 'r', kind: 'Kira', name: 'Kira', amt: 9000, day: 1, src: 'acc:a', active: true, auto: true, autoFrom: cm });
  c.processAuto(S);
  c.deleteExpense(S, S.tx[0]);
  assert.equal(c.processAuto(S), 0);
});

t('pasif gider otomatik işlenmez', () => {
  const S = c.emptyData(), cm = c.ymOf(FIXED);
  S.recurring.push({ id: 'r', kind: 'Abonelik', name: 'N', amt: 100, day: 1, src: 'acc:a', active: false, auto: true, autoFrom: cm });
  assert.equal(c.processAuto(S), 0);
});

t('hesap bakiyesi: gelir, harcama, transfer ve ödemelerle değişir', () => {
  const S = c.emptyData();
  S.accounts.push({ id: 'a', name: 'A', type: 'bank', opening: 1000 }, { id: 'b', name: 'B', type: 'cash', opening: 0 });
  S.incomes.push({ id: 'i', date: c.today(), amt: 500, acc: 'a' });
  c.saveExpense(S, { date: c.today(), amt: 200, cat: 'Market', src: 'acc:a', inst: 1 });
  S.transfers.push({ id: 't', date: c.today(), amt: 100, from: 'a', to: 'b' });
  assert.equal(c.accBal(S, S.accounts[0]), 1200);
  assert.equal(c.accBal(S, S.accounts[1]), 100);
});

t('hesaptan yapılan harcamada taksit yok sayılır', () => {
  const S = c.emptyData();
  const x = c.saveExpense(S, { date: c.today(), amt: 600, cat: 'Market', src: 'acc:a', inst: 6 });
  assert.equal(x.inst, 1);
});

t('altın borcu: çok cinsli bakiye, ödeme ve fiyat tahmini', () => {
  const S = c.emptyData();
  S.cfg.gold = { gram: 4500 };
  S.debts.push({ id: 'g', type: 'gold', name: 'Altın', gold: { gram: 10, ceyrek: 2 }, monthly: 0, day: 0 });
  assert.equal(Math.round(c.gp(S, 'ceyrek')), Math.round(4500 * 1.6065));
  S.cfg.gold = { gram: 4500, ceyrek: 7300 };
  assert.equal(c.goldVal(S, S.debts[0]), 10 * 4500 + 2 * 7300);
  c.payDebt(S, 'g', { gold: { ceyrek: 1 } });
  assert.equal(c.goldDesc(S.debts[0]), '10 gram + 1 çeyrek');
  assert.equal(S.debtPay[0].amt, 7300);
});

t('eski tek-gram altın borcu yeni biçime taşınır', () => {
  const S = c.migrate({ debts: [{ id: 'g', type: 'gold', name: 'A', remGrams: 25 }], cfg: { goldPrice: 4000 } });
  assert.deepEqual(S.debts[0].gold, { gram: 25 });
  assert.equal(S.cfg.gold?.gram, 4000);
});

t('altın fiyat ayrıştırma: farklı biçimler', () => {
  const p = c.parseGold({ GRA: { Buying: '4.400,10', Selling: '4.410,50' }, CEYREKALTIN: { Selling: 7200.5 }, YARIMALTIN: { Selling: '14.400,00' }, TAMALTIN: { Selling: 28800 } });
  assert.deepEqual(p, { gram: 4410.5, ceyrek: 7200.5, yarim: 14400, tam: 28800 });
  assert.deepEqual(c.parseGold({ 'gram-altin': { Selling: 4000 }, 'cumhuriyet-altini': { Selling: 30000 } }), { gram: 4000, tam: 30000 });
  assert.deepEqual(c.parseGold({}), {});
});

t('altın günü: ödeme, geri alma, alacak ve borç gibi kalan', () => {
  const S = c.emptyData();
  S.cfg.gold = { gram: 4500, ceyrek: 7300 };
  const f = new Date(FIXED); f.setMonth(f.getMonth() - 3);
  const g: c.Gun = { id: 'g', name: 'Gün', kind: 'gold', first: c.iso(f), n: 10, turn: 6, unit: 'ceyrek', qty: 1, paid: { 0: true, 1: true, 2: true }, recv: null };
  S.gun.push(g);
  assert.equal(c.gunLeft(S, g), 7);
  assert.equal(c.gunPot(S, g), 73000);
  c.gunPay(S, g, 3, 7300, 'acc:a', c.today());
  assert.equal(c.gunLeft(S, g), 6);
  assert.equal(S.tx.length, 1);
  assert.equal(c.gunDebtTL(S, g), 0);
  c.gunReceive(S, g, 73000, '', c.today());
  assert.equal(c.gunDebtTL(S, g), 6 * 7300);
  assert.equal(c.totals(S).gunDebt, 6 * 7300);
  c.gunUnpay(S, g, 3);
  assert.equal(c.gunLeft(S, g), 7);
  assert.equal(S.tx.length, 0);
});

t('harcamayı düzenlemek ID ve araba kilometresini korur', () => {
  const S = c.emptyData();
  S.cars.push({ id: 'car', name: 'A', km: 1000 });
  const x = c.saveExpense(S, { date: c.today(), amt: 100, cat: 'Araba', src: 'acc:a', inst: 1, sub: 'Yakıt', car: 'car', km: 1500 });
  assert.equal(S.cars[0].km, 1500);
  c.saveExpense(S, { ...x, amt: 150 });
  assert.equal(S.tx.length, 1);
  assert.equal(S.tx[0].amt, 150);
  assert.equal(S.tx[0].id, x.id);
});

t('senaryo: ekstra ödeme borcu daha erken kapatır ve faizi azaltır', () => {
  const ds: c.SimDebt[] = [
    { n: 'A', bal: 30000, rate: 3.75, kind: 'card', pct: 0.2 },
    { n: 'K', bal: 40000, rate: 0, kind: 'fixed', min: 4000 },
  ];
  const base = c.simulate(ds, 0, 'avalanche', 0, false), plan = c.simulate(ds, 3000, 'avalanche', 0, true);
  assert.ok(base.ok && plan.ok);
  assert.ok((plan.months as number) < (base.months as number));
  assert.ok(plan.interest < base.interest);
});

t('demo verisi tutarlı: toplam borç ve öneriler üretilir', () => {
  const S = c.demoData();
  const tot = c.totals(S);
  assert.ok(tot.total > 0 && tot.cash > 0);
  assert.ok(c.advice(S).length >= 5);
  assert.ok(c.upcoming(S, 14).length > 0);
});

t('yedek biçimi: JSON gidiş-dönüş verileri korur', () => {
  const S = c.demoData();
  const back = c.migrate(JSON.parse(JSON.stringify(S)));
  assert.equal(c.totals(back).total, c.totals(S).total);
  assert.ok(c.isBackupLike(back));
  assert.ok(!c.isBackupLike({}));
});

console.log(`\n${n} test geçti`);
