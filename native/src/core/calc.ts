import { clock } from './clock';
import { dateAt, daysTo, pd, ymOf } from './dates';
import { fmt, pc, sum } from './format';
import type { Account, Card, Debt, Gun, GoldUnit, Id, State, Tx } from './types';

export const find = <T extends { id: Id }>(arr: T[], id: Id) => arr.find((x) => x.id === id);

export const srcName = (S: State, s?: string) => {
  if (!s) return '—';
  const [k, id] = s.split(':');
  const o = find<any>(k === 'card' ? S.cards : S.accounts, id);
  return o ? o.name : '(silinmiş)';
};

/* ---------- hesaplar ---------- */
export function accBal(S: State, a: Account) {
  let b = +a.opening || 0;
  S.incomes.forEach((i) => { if (i.acc === a.id) b += i.amt; });
  S.tx.forEach((t) => { if (t.src === 'acc:' + a.id) b -= t.amt; });
  S.transfers.forEach((t) => { if (t.from === a.id) b -= t.amt; if (t.to === a.id) b += t.amt; });
  S.cardPay.forEach((p) => { if (p.from === a.id) b -= p.amt; });
  S.debtPay.forEach((p) => { if (p.from === a.id) b -= p.amt; });
  return b;
}
export const cashTotal = (S: State) => sum(S.accounts, (a) => accBal(S, a));

/* ---------- kredi kartı ---------- */
/** Harcamanın hangi ekstreye (ay indeksi) girdiği. */
export const stmtIdx = (c: Card, ds: string) => { const d = pd(ds); return ymOf(d) + (d.getDate() > c.cutoff ? 1 : 0); };
export const stmtRange = (c: Card, idx: number): [Date, Date] =>
  [new Date(dateAt(idx - 1, c.cutoff).getTime() + 864e5), dateAt(idx, c.cutoff)];
export const stmtDue = (c: Card, idx: number) => (c.due > c.cutoff ? dateAt(idx, c.due) : dateAt(idx + 1, c.due));

export interface Charge { idx: number; amt: number; tx: Tx; k: number; n: number }
export function charges(S: State, c: Card): Charge[] {
  const out: Charge[] = [];
  S.tx.forEach((t) => {
    if (t.src !== 'card:' + c.id) return;
    const n = t.inst || 1, b = stmtIdx(c, t.date);
    for (let k = 0; k < n; k++) out.push({ idx: b + k, amt: t.amt / n, tx: t, k, n });
  });
  return out;
}

/** BDDK: limit 100.000 ₺ ve altı %20, üstü %40. */
export const autoMinRate = (l: number) => (l > 100000 ? 40 : 20);
/** TCMB azami akdi faiz: dönem borcu 30 bin altı %3,25, 30-180 bin %3,75, üstü %4,25. */
export const autoRate = (b: number) => (b > 180000 ? 4.25 : b > 30000 ? 3.75 : 3.25);
/** Gecikme faizi akdi faizin üstüne eklenen puan. */
export const LATE = 0.30;

export function cardInfo(S: State, c: Card) {
  const now = clock.now(), cur = ymOf(now) + (now.getDate() > c.cutoff ? 1 : 0), ch = charges(S, c);
  const si = c.since ? stmtIdx(c, c.since) : -1e9;
  const billed = sum(ch.filter((x) => x.idx < cur && x.idx >= si && !x.tx.hist), (x) => x.amt) + (+(c.openDebt || 0));
  const open = sum(ch.filter((x) => x.idx === cur), (x) => x.amt);
  const future = sum(ch.filter((x) => x.idx > cur), (x) => x.amt);
  const paid = sum(S.cardPay.filter((p) => p.card === c.id), (p) => p.amt);
  const closedDebt = Math.max(0, billed - paid), over = Math.max(0, paid - billed), openDebt = Math.max(0, open - over);
  const currentDebt = closedDebt + openDebt, used = currentDebt + future;
  const minRate = c.minAuto === false ? (c.minRate || 20) : autoMinRate(c.limit || 0);
  const min = closedDebt > 0 ? Math.min(closedDebt, Math.max(closedDebt * minRate / 100, Math.min(closedDebt, 100))) : 0;
  const recOnCard = sum(
    S.recurring.filter((r) => r.active !== false && r.src === 'card:' + c.id && !S.recPaid[r.id + '|' + ymOf(now)]),
    (r) => r.amt);
  const nextEst = openDebt + recOnCard;
  const due = stmtDue(c, cur - 1);
  const rate = c.rateAuto === false ? (c.rate || 0) : autoRate(Math.max(closedDebt, currentDebt));
  const carry = Math.max(0, closedDebt - min), carryInt = carry * rate / 100, lateInt = min * (rate + LATE) / 100;
  return {
    rate, carry, carryInt, lateInt, cur, closedDebt, openDebt, currentDebt, future, used,
    avail: (c.limit || 0) - used, util: c.limit ? used / c.limit : 0, min, minRate,
    nextEst, nextMin: nextEst * minRate / 100, due, dueIn: daysTo(due), dueOpen: stmtDue(c, cur), recOnCard, ch,
  };
}
export type CardInfo = ReturnType<typeof cardInfo>;

/* ---------- altın ---------- */
export const GU: [GoldUnit, string][] = [['gram', 'gram'], ['ceyrek', 'çeyrek'], ['yarim', 'yarım'], ['tam', 'tam']];
/** Fiyat girilmemişse gram fiyatından tahmin katsayıları. */
export const GF: Record<GoldUnit, number> = { gram: 1, ceyrek: 1.6065, yarim: 3.213, tam: 6.426 };
export const gp = (S: State, k: GoldUnit) => {
  const g = S.cfg.gold || {};
  return (g[k] || 0) > 0 ? (g[k] as number) : ((g.gram || 0) > 0 ? (g.gram as number) * GF[k] : 0);
};
export const goldVal = (S: State, d: Debt) => sum(GU, ([k]) => ((d.gold || {})[k] || 0) * gp(S, k));
export const goldDesc = (d: { gold?: Debt['gold'] }) =>
  GU.filter(([k]) => ((d.gold || {})[k] || 0) > 0).map(([k, l]) => pc((d.gold as any)[k]) + ' ' + l).join(' + ') || '0';
export const debtBal = (S: State, d: Debt) => (d.type === 'gold' ? goldVal(S, d) : (+(d.remaining || 0)));
export const debtNote = (d: Debt) => ({ loan: 'Kredi', gold: 'Altın borcu', person: 'Şahsi borç', other: 'Diğer borç' }[d.type]);

/** Servisten gelen JSON'dan satış fiyatlarını ayıklar (anahtar adları esnek eşleşir). */
export function parseGold(j: any): Partial<Record<GoldUnit, number>> {
  const out: any = {};
  const nk = (k: string) => k.toLowerCase().replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '');
  const pr = (o: any) => {
    if (!o || typeof o !== 'object') return 0;
    let v = o.Selling ?? o.selling ?? o.Satis ?? o['Satış'] ?? o.sell ?? o.satis;
    if (typeof v === 'number') return v;
    v = String(v ?? '').trim();
    if (v.includes(',')) return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(v) || 0;
  };
  for (const [key, o] of Object.entries(j || {})) {
    const k = nk(key), v = pr(o);
    if (!(v > 0)) continue;
    if (k === 'gra' || k === 'gramaltin') out.gram = v;
    else if (k.includes('ceyrek') && !out.ceyrek) out.ceyrek = v;
    else if (k.includes('yarim') && !out.yarim) out.yarim = v;
    else if ((k === 'tam' || k === 'tamaltin') && !out.tam) out.tam = v;
    else if (k.includes('cumhuriyet') && !out.cum) out.cum = v;
  }
  if (!out.tam && out.cum) out.tam = out.cum;
  delete out.cum;
  return out;
}

/* ---------- altın / para günü ---------- */
export const gunY = (g: Gun, k: number) => ymOf(pd(g.first)) + k;
export const gunDay = (g: Gun) => pd(g.first).getDate();
export const gunC = (S: State, g: Gun) => (g.kind === 'gold' ? (+(g.qty || 0)) * gp(S, g.unit || 'gram') : (+(g.amt || 0)));
export const gunPaid = (S: State, g: Gun, k: number) => {
  const v = (g.paid || {})[k];
  return v === true || !!(v && find(S.tx, v as Id));
};
export const gunLeft = (S: State, g: Gun) => { let c = 0; for (let k = 0; k < g.n; k++) if (!gunPaid(S, g, k)) c++; return c; };
export const gunNext = (S: State, g: Gun) => { for (let k = 0; k < g.n; k++) if (!gunPaid(S, g, k)) return k; return -1; };
export const gunPot = (S: State, g: Gun) => g.n * gunC(S, g);
export const gunDebtTL = (S: State, g: Gun) => (g.recv && g.recv.done ? gunLeft(S, g) * gunC(S, g) : 0);
export const gunDesc = (g: { kind: string; qty?: number; unit?: GoldUnit; amt?: number }) =>
  g.kind === 'gold'
    ? pc(g.qty || 0) + ' ' + (GU.find((u) => u[0] === (g.unit || 'gram')) || GU[0])[1]
    : Math.round(g.amt || 0).toLocaleString('tr-TR') + ' ₺';

/* ---------- özetler ---------- */
export function totals(S: State) {
  const ci = S.cards.map((c) => cardInfo(S, c));
  const cardDebt = sum(ci, (x) => x.currentDebt), inst = sum(ci, (x) => x.future);
  const gunDebt = sum(S.gun, (g) => gunDebtTL(S, g)), other = sum(S.debts, (d) => debtBal(S, d)) + gunDebt;
  return { gunDebt, cardDebt, inst, other, total: cardDebt + other, load: cardDebt + other + inst, cash: cashTotal(S), ci };
}

/** Bir harcamanın aylara dağılan parçaları (taksit ise ay ay). */
export interface Part { tx: Tx; ym: number; amt: number; k: number; n: number }
export function parts(t: Tx): Part[] {
  const n = t.inst || 1, b = ymOf(pd(t.date)), o: Part[] = [];
  for (let k = 0; k < n; k++) o.push({ tx: t, ym: b + k, amt: t.amt / n, k, n });
  return o;
}
export const monthParts = (S: State, ym: number) => S.tx.flatMap(parts).filter((p) => p.ym === ym);
export const monthIncome = (S: State, ym: number) => sum(S.incomes.filter((i) => ymOf(pd(i.date)) === ym), (i) => i.amt);
export const recMonthly = (S: State) => sum(S.recurring.filter((r) => r.active !== false), (r) => r.amt);

export interface Upcoming {
  d: Date; t: string; s: string; amt: number; k: 'card' | 'rec' | 'inc' | 'debt' | 'gun' | 'gunr'; id: Id; m?: number; out: boolean;
}
export function upcoming(S: State, days = 14): Upcoming[] {
  const out: Upcoming[] = [], cm = ymOf(clock.now());
  S.cards.forEach((c) => {
    const i = cardInfo(S, c);
    if (i.closedDebt > 0.5)
      out.push({ d: i.due, t: c.name + ' ekstresi', s: 'Asgari ' + fmt(i.min) + ' · Dönem borcu ' + fmt(i.closedDebt), amt: i.closedDebt, k: 'card', id: c.id, out: true });
  });
  S.recurring.filter((r) => r.active !== false).forEach((r) => {
    let m = cm;
    if (S.recPaid[r.id + '|' + m]) m++;
    if (S.recPaid[r.id + '|' + m]) return;
    out.push({ d: dateAt(m, r.day), t: r.name, s: r.kind + (r.src ? ' · ' + srcName(S, r.src) : ''), amt: r.amt, k: 'rec', id: r.id, m, out: true });
  });
  S.incomeRec.forEach((r) => {
    let m = cm;
    if (S.incPaid[r.id + '|' + m]) m++;
    out.push({ d: dateAt(m, r.day), t: r.name, s: 'Beklenen gelir', amt: r.amt, k: 'inc', id: r.id, m, out: false });
  });
  S.debts.forEach((dt) => {
    if (!((dt.monthly || 0) > 0) || !dt.day) return;
    const paidM = S.debtPay.some((p) => p.debt === dt.id && ymOf(pd(p.date)) === cm && p.amt >= (dt.monthly as number) * 0.99);
    out.push({ d: dateAt(paidM ? cm + 1 : cm, dt.day), t: dt.name, s: debtNote(dt) + ' taksiti', amt: dt.monthly as number, k: 'debt', id: dt.id, out: true });
  });
  S.gun.forEach((g) => {
    const k = gunNext(S, g);
    if (k >= 0)
      out.push({ d: dateAt(gunY(g, k), gunDay(g)), t: g.name + ' (' + (k + 1) + '/' + g.n + ')', s: g.kind === 'gold' ? 'Altın günü · ' + gunDesc(g) : 'Para günü', amt: gunC(S, g), k: 'gun', id: g.id, m: k, out: true });
    if (!(g.recv && g.recv.done))
      out.push({ d: dateAt(gunY(g, g.turn - 1), gunDay(g)), t: g.name + ' alacağı', s: 'Sıra sende · ' + (g.kind === 'gold' ? gunDesc({ kind: 'gold', unit: g.unit, qty: (g.qty || 0) * g.n }) : ''), amt: gunPot(S, g), k: 'gunr', id: g.id, out: false });
  });
  return out.filter((x) => daysTo(x.d) <= days).sort((a, b) => a.d.getTime() - b.d.getTime());
}

export function freeCash(S: State) {
  const cm = ymOf(clock.now());
  let inc = sum(S.incomeRec, (r) => r.amt);
  if (!inc) { const ms = [cm - 1, cm - 2, cm - 3].map((m) => monthIncome(S, m)).filter((x) => x > 0); inc = ms.length ? sum(ms) / ms.length : 0; }
  const fixed = recMonthly(S);
  const ins = sum(S.cards.map((c) => cardInfo(S, c)), (i) => sum(i.ch.filter((x) => x.idx === i.cur + 1 && x.n > 1), (x) => x.amt));
  const debtM = sum(S.debts, (d) => d.monthly || 0) + sum(S.gun.filter((g) => gunLeft(S, g) > 0), (g) => gunC(S, g));
  const vp = [cm - 1, cm - 2, cm - 3].map((m) => sum(monthParts(S, m).filter((p) => p.n === 1 && !p.tx.rec), (p) => p.amt)).filter((x) => x > 0);
  const vari = vp.length ? sum(vp) / vp.length : 0;
  return { inc, fixed, ins, debtM, vari, free: inc - fixed - ins - debtM - vari };
}

/** Önümüzdeki 6 ay kartlara yansıyacak taksit tutarları. */
export function instForecast(S: State) {
  const cm = ymOf(clock.now());
  const cs = S.cards.map((c) => cardInfo(S, c));
  return [1, 2, 3, 4, 5, 6].map((k) => ({
    ym: cm + k,
    amt: sum(cs, (x) => sum(x.ch.filter((z) => z.idx === x.cur + k - 1 && z.n > 1), (z) => z.amt)),
  }));
}
