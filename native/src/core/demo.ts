import { addDays, dateAt, iso, ymOf } from './dates';
import { clock } from './clock';
import { emptyData } from './state';
import { uid } from './format';
import type { State, Tx } from './types';

/** Uygulamayı denemek için örnek veri. Rakamlar kurgusaldır. */
export function demoData(): State {
  const D = emptyData(), dt = addDays, id = uid;
  const a1 = { id: id(), name: 'Cüzdan (nakit)', type: 'cash' as const, opening: 2400 };
  const a2 = { id: id(), name: 'Maaş hesabı', type: 'bank' as const, opening: 21500 };
  D.accounts = [a1, a2];
  const c1 = { id: id(), name: 'Ana kart', limit: 90000, cutoff: Math.min(28, Math.max(1, clock.now().getDate() - 6) || 15), due: 0, minRate: 20, rate: 4.25, openDebt: 9800, since: '' };
  c1.due = ((c1.cutoff + 9) % 28) + 1;
  const c2 = { id: id(), name: 'Market kartı', limit: 25000, cutoff: 20, due: 2, minRate: 20, rate: 4.25, openDebt: 0, since: '' };
  c1.since = dt(-80); c2.since = dt(-60);
  D.cards = [c1, c2];
  const T = (n: number, amt: number, cat: string, src: string, note: string, inst = 1, x: Partial<Tx> = {}) =>
    D.tx.push(Object.assign({ id: id(), date: dt(-n), amt, cat, src, note, inst }, x) as Tx);
  const k1 = 'card:' + c1.id, k2 = 'card:' + c2.id, n1 = 'acc:' + a1.id, n2 = 'acc:' + a2.id;
  T(75, 36000, 'Diğer', k1, 'Telefon', 12); T(40, 14400, 'Ev', k2, 'Çamaşır makinesi', 6);
  T(2, 640, 'Market', k2, 'Migros'); T(5, 1180, 'Market', k2, 'Haftalık market'); T(9, 920, 'Market', k2, 'Market'); T(14, 860, 'Market', k2, 'Market');
  T(1, 420, 'Yemek', k1, 'Akşam yemeği'); T(4, 260, 'Yemek', k1, 'Kahve + öğle'); T(8, 780, 'Yemek', k1, 'Arkadaşlarla'); T(12, 310, 'Eğlence', k1, 'Sinema'); T(7, 1900, 'Giyim', k1, 'Mont');
  T(3, 1850, 'Araba', k1, 'Benzin', 1, { sub: 'Yakıt' }); T(16, 1700, 'Araba', k1, 'Benzin', 1, { sub: 'Yakıt' }); T(33, 6400, 'Araba', k1, 'Servis bakımı', 1, { sub: 'Bakım' });
  T(6, 200, 'Ulaşım', n1, 'İstanbulkart'); T(10, 350, 'Sağlık', n1, 'Eczane'); T(20, 500, 'Kişisel', n1, 'Berber');
  const car = { id: id(), name: 'Fiat Egea', plate: '34 ABC 123', km: 82400, inspect: dt(24), insurance: dt(160), kasko: dt(160) };
  D.cars = [car];
  D.tx.filter((t) => t.sub === 'Yakıt' || t.sub === 'Bakım').forEach((t) => { t.car = car.id; });
  D.incomeRec = [{ id: id(), name: 'Maaş', amt: 42000, day: 5, acc: a2.id }];
  D.recurring = [
    { id: id(), kind: 'Kira', name: 'Kira', amt: 15000, day: 1, src: n2, active: true },
    { id: id(), kind: 'Fatura', name: 'Elektrik', amt: 850, day: 18, src: k2, active: true },
    { id: id(), kind: 'Fatura', name: 'İnternet', amt: 399, day: 12, src: k2, active: true },
    { id: id(), kind: 'Fatura', name: 'Doğalgaz', amt: 700, day: 22, src: n2, active: true },
    { id: id(), kind: 'Abonelik', name: 'Netflix', amt: 229.99, day: 9, src: k1, active: true },
    { id: id(), kind: 'Abonelik', name: 'Spotify', amt: 79.99, day: 14, src: k1, active: true },
    { id: id(), kind: 'Abonelik', name: 'iCloud', amt: 39.99, day: 3, src: k1, active: true },
  ];
  D.debts = [
    { id: id(), type: 'loan', name: 'İhtiyaç kredisi', remaining: 84000, monthly: 7000, day: 15, rate: 0 },
    { id: id(), type: 'gold', name: 'Altın borcu', gold: { gram: 15, ceyrek: 4 }, monthly: 0, day: 0, rate: 0 },
    { id: id(), type: 'person', name: 'Arkadaş borcu', remaining: 5000, monthly: 1000, day: 25, rate: 0 },
  ];
  const f = clock.now(); f.setMonth(f.getMonth() - 3);
  D.gun = [{ id: id(), name: 'Mahalle altın günü', kind: 'gold', first: iso(f), n: 10, turn: 6, unit: 'ceyrek', qty: 1, amt: 0, paid: { 0: true, 1: true, 2: true }, recv: null }];
  const nd = clock.now(), cm0 = ymOf(nd);
  D.recurring.forEach((r) => {
    if (r.day < nd.getDate()) {
      const t: Tx = { id: id(), amt: r.amt, cat: r.kind === 'Abonelik' ? 'Eğlence' : r.kind === 'Kira' ? 'Ev' : 'Fatura', src: r.src, date: iso(dateAt(cm0, r.day)), note: r.name, inst: 1, rec: r.id };
      D.tx.push(t); D.recPaid[r.id + '|' + cm0] = t.id;
    }
  });
  D.incomeRec.forEach((r) => {
    [2, 1].forEach((k) => D.incomes.push({ id: id(), amt: r.amt, note: r.name, acc: r.acc, date: iso(dateAt(cm0 - k, r.day)), rec: r.id }));
    if (r.day <= nd.getDate()) {
      const i = { id: id(), amt: r.amt, note: r.name, acc: r.acc, date: iso(dateAt(cm0, r.day)), rec: r.id };
      D.incomes.push(i); D.incPaid[r.id + '|' + cm0] = i.id;
    }
  });
  D.debts.forEach((d) => { if ((d.monthly || 0) > 0 && (d.day || 0) < nd.getDate()) D.debtPay.push({ id: id(), debt: d.id, amt: d.monthly as number, from: a2.id, date: iso(dateAt(cm0, d.day as number)) }); });
  D.cfg.gold = { gram: 4500, ceyrek: 7300, yarim: 14500, tam: 29000, updated: clock.now().getTime(), live: false };
  D.transfers = [
    { id: id(), amt: 3000, from: a2.id, to: a1.id, toText: '', note: 'Nakit çekim', date: dt(-6) },
    { id: id(), amt: 2000, from: a2.id, to: '', toText: 'Anneme', note: '', date: dt(-11) },
  ];
  D.meta = { demo: true };
  return D;
}
