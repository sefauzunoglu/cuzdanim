import { clock } from './clock';
import { dateAt, iso, today, ymOf } from './dates';
import { cardInfo, find, gp, gunC, gunPot } from './calc';
import { sum, uid } from './format';
import type { Car, Gun, GoldHold, GoldUnit, Id, Recurring, State, Tx } from './types';

/* Bu dosyadaki fonksiyonlar durumu (State) değiştirir; kaydetme ve ekranı yenileme çağıranın işidir. */

const recCat = (r: Recurring) => (r.kind === 'Abonelik' ? 'Eğlence' : r.kind === 'Kira' ? 'Ev' : 'Fatura');

/** Harcama ekler veya (id varsa) günceller. Araba kilometresi arabaya yansıtılır. */
export function saveExpense(S: State, input: Omit<Tx, 'id'> & { id?: Id }): Tx {
  const o: Tx = { ...input, id: input.id || uid(), inst: input.src.startsWith('card:') ? (input.inst || 1) : 1 };
  if (o.cat !== 'Araba') { delete o.sub; delete o.car; delete o.km; }
  if (o.km && o.km > 0) { const c = find<Car>(S.cars, o.car as Id); if (c && o.km > (c.km || 0)) c.km = o.km; }
  const ex = find(S.tx, o.id);
  if (ex) { Object.keys(ex).forEach((k) => delete (ex as any)[k]); Object.assign(ex, o); return ex; }
  S.tx.push(o);
  return o;
}

/** Harcamayı siler; ona bağlı sabit gider "ödendi" işaretini de kaldırır ve otomatik yeniden eklenmesini engeller. */
export function deleteExpense(S: State, tx: Tx) {
  S.tx.splice(S.tx.indexOf(tx), 1);
  Object.keys(S.recPaid).forEach((k) => {
    if (S.recPaid[k] === tx.id) { delete S.recPaid[k]; (S.recSkip = S.recSkip || {})[k] = 1; }
  });
}

export function payCard(S: State, cardId: Id, amt: number, from: Id | '', date = today()) {
  S.cardPay.push({ id: uid(), card: cardId, amt, from, date });
  return cardInfo(S, find(S.cards, cardId)!);
}

export function payDebt(S: State, debtId: Id, p: { amt?: number; gold?: GoldHold; from?: Id | ''; date?: string }) {
  const d = find(S.debts, debtId)!;
  let amt: number;
  const paid: GoldHold = {};
  if (d.type === 'gold') {
    (['gram', 'ceyrek', 'yarim', 'tam'] as GoldUnit[]).forEach((k) => { const v = p.gold?.[k] || 0; if (v > 0) paid[k] = v; });
    amt = sum(Object.entries(paid), ([k, v]) => (v as number) * gp(S, k as GoldUnit));
    d.gold = d.gold || {};
    Object.entries(paid).forEach(([k, v]) => { (d.gold as any)[k] = Math.max(0, ((d.gold as any)[k] || 0) - (v as number)); });
  } else {
    amt = p.amt || 0;
    d.remaining = Math.max(0, (+(d.remaining || 0)) - amt);
  }
  S.debtPay.push({ id: uid(), debt: debtId, amt, gold: d.type === 'gold' ? paid : undefined, from: p.from || '', date: p.date || today() });
}

/* ---------- gelir ---------- */
export function receiveIncome(S: State, recId: Id, month: number, amt: number, date: string) {
  const r = find(S.incomeRec, recId)!;
  const inc = { id: uid(), amt, note: r.name, acc: r.acc, date, rec: r.id };
  S.incomes.push(inc);
  S.incPaid[r.id + '|' + month] = inc.id;
}

/* ---------- sabit giderler ---------- */
export function payRecurring(S: State, recId: Id, month: number, amt: number, date: string) {
  const r = find(S.recurring, recId)!;
  const t: Tx = { id: uid(), amt, cat: recCat(r), src: r.src, date, note: r.name, inst: 1, rec: r.id };
  S.tx.push(t);
  S.recPaid[r.id + '|' + month] = t.id;
  if (Math.abs(amt - r.amt) > 0.01) r.amt = amt;
  return t;
}

/** Bu ayın ödemesini geri alır; otomatik işleme aynı ayı yeniden eklemesin diye atlama işareti bırakır. */
export function undoRecurring(S: State, recId: Id) {
  const cm = ymOf(clock.now());
  const k = Object.keys(S.recPaid).find((k) => k.startsWith(recId + '|') && k.endsWith('|' + cm));
  if (!k) return false;
  const tid = S.recPaid[k];
  S.tx = S.tx.filter((t) => t.id !== tid);
  delete S.recPaid[k];
  (S.recSkip = S.recSkip || {})[k] = 1;
  return true;
}

/** Otomatik işleme açık giderleri, günü gelmiş aylar için harcama olarak ekler. Eklenen sayıyı döndürür. */
export function processAuto(S: State): number {
  let n = 0;
  const now = clock.now(), cm = ymOf(now);
  const skip = (S.recSkip = S.recSkip || {});
  S.recurring.forEach((r) => {
    if (!r.auto || !r.src || r.active === false) return;
    for (let m = (r.autoFrom == null ? cm : r.autoFrom); m <= cm; m++) {
      const k = r.id + '|' + m;
      if (S.recPaid[k] || skip[k]) continue;
      const d = dateAt(m, r.day);
      if (d > now) continue;
      const t: Tx = { id: uid(), amt: r.amt, cat: recCat(r), src: r.src, date: iso(d), note: r.name, inst: 1, rec: r.id, auto: true };
      S.tx.push(t);
      S.recPaid[k] = t.id;
      n++;
    }
  });
  return n;
}

/* ---------- altın / para günü ---------- */
export function gunPay(S: State, g: Gun, k: number, amt: number, src: string, date: string) {
  g.paid = g.paid || {};
  if (src) {
    const t: Tx = { id: uid(), amt, cat: 'Altın günü', src, date, note: `${g.name} ${k + 1}/${g.n}`, inst: 1, rec: 'gun:' + g.id };
    S.tx.push(t);
    g.paid[k] = t.id;
  } else g.paid[k] = true;
}
export function gunUnpay(S: State, g: Gun, k: number) {
  const v = g.paid[k];
  if (v && v !== true) S.tx = S.tx.filter((t) => t.id !== v);
  delete g.paid[k];
}
export function gunReceive(S: State, g: Gun, amt: number, acc: Id | '', date: string) {
  g.recv = { done: true, date, amt };
  if (acc) S.incomes.push({ id: uid(), amt, note: g.name + ' alacağı', acc, date });
}
export const gunSuggestedPay = gunC;
export const gunSuggestedPot = gunPot;

export function markBackup(S: State) { S.meta = S.meta || {}; S.meta.lastBackup = today(); }
