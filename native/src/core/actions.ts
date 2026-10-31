import { clock } from './clock';
import { dateAt, iso, pd, today, ymOf } from './dates';
import { mClean, mKey, mNice, stmtRoot } from './merchant';
import { recFor } from './sync';
import { cardInfo, find, gp, gunC, gunPot, recDone } from './calc';
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

/* ---------- sabit gider: atla, yeniden aç, kaydet ---------- */
/** O ayı atlar (yenilenmedi, iptal ettim): borca ve listeye eklenmez, otomatik işleme de eklemez. */
export function skipRecurring(S: State, recId: Id, month: number) { (S.recSkip = S.recSkip || {})[recId + '|' + month] = 1; }
export function unskipRecurring(S: State, recId: Id, month: number) { if (S.recSkip) delete S.recSkip[recId + '|' + month]; }

export interface RecInput {
  id?: Id; kind: Recurring['kind']; name: string; key?: string; amt: number; day: number; src: string; auto: boolean; active?: boolean;
  /** Kart harcamasından seçilerek eklendiyse o harcama: o ayın gideri ödendi sayılır, çift eklenmez */
  fromTx?: Id;
}
/** Sabit gideri ekler veya günceller. Otomatik işlemeyi açınca veya durdurulmuş gideri yeniden açınca geçmiş aylar işlenmez. */
export function saveRecurring(S: State, input: RecInput): Recurring {
  const o: Partial<Recurring> = { kind: input.kind, name: input.name, key: (input.key || '').trim(), amt: input.amt, day: input.day, src: input.src, auto: input.auto };
  const x = input.id ? find(S.recurring, input.id) : undefined;
  if (x) {
    if (input.auto && !x.auto) o.autoFrom = ymOf(clock.now());
    const was = x.active !== false;
    Object.assign(x, o);
    if (input.active !== undefined) {
      x.active = input.active;
      if (x.active && !was) x.autoFrom = ymOf(clock.now());
    }
    processAuto(S);
    return x;
  }
  const r: Recurring = { ...(o as Omit<Recurring, 'id'>), id: uid(), active: true, ...(input.auto ? { autoFrom: ymOf(clock.now()) } : {}) };
  S.recurring.push(r);
  if (input.fromTx) {
    const tx = find(S.tx, input.fromTx);
    if (tx) { tx.rec = r.id; S.recPaid[r.id + '|' + ymOf(pd(tx.date))] = tx.id; }
  }
  processAuto(S);
  return r;
}

const SUBRE = /NETFLIX|SPOTIFY|YOUTUBE|DISNEY|APPLE\.COM|ICLOUD|AMAZON|EXXEN|BLUTV|GAIN|TURKCELL|VODAFONE|TURK TELEKOM|TTNET|SUPERONLINE|IGDAS|ENERJISA|SU IDARE|ISKI|FATURA|AIDAT|SIGORTA|CLAUDE|ANTHROPIC|OPENAI|CHATGPT|GOOGLE|MICROSOFT/;
export interface RecPickGroup { k: string; name: string; last: Tx; n: number; months: number; amts: number[]; dup: boolean; sug: boolean }

/** Kart harcamalarını işyerine göre gruplar: sabit gider ekleme ekranında "kartından seç" listesi. Önerilenler başta. */
export function recPickGroups(S: State): RecPickGroup[] {
  const g: Record<string, RecPickGroup & { ms: Set<number> }> = {};
  S.tx.filter((t) => String(t.src).startsWith('card:') && !(t.inst > 1) && !t.rec).forEach((t) => {
    const k = mKey(t.note || '');
    if (!k) return;
    const x = g[k] || (g[k] = { k, name: mClean(t.note || ''), last: t, n: 0, months: 0, amts: [], dup: false, sug: false, ms: new Set() });
    x.n++; x.amts.push(t.amt); x.ms.add(ymOf(pd(t.date)));
    if (pd(t.date) > pd(x.last.date)) x.last = t;
  });
  return Object.values(g).map((x) => {
    const card = find(S.cards, x.last.src.slice(5)), dup = !!card && !!recFor(S, card, x.name), u = x.name.toUpperCase();
    const months = x.ms.size;
    const sug = !dup && (x.last.cat === 'Fatura' || SUBRE.test(u) || (months > 1 && Math.max(...x.amts) <= Math.min(...x.amts) * 1.1));
    const { ms, ...rest } = x; void ms;
    return { ...rest, months, dup, sug };
  }).sort((a, b) => (+b.sug - +a.sug) || (b.months - a.months) || (b.last.amt - a.last.amt));
}

/** Seçilen kart harcamasından sabit gider formu için başlangıç değerleri. */
export function recPrefill(g: RecPickGroup) {
  const t = g.last, u = g.name.toUpperCase();
  const toks = stmtRoot(g.name).replace(/İ/g, 'I').split(' ').filter((w) => w && !/^\d+$/.test(w));
  const kind: Recurring['kind'] = /FATURA|TURKCELL|VODAFONE|TELEKOM|TTNET|SUPERONLINE|IGDAS|ENERJISA|ISKI|SU IDARE/.test(u) || t.cat === 'Fatura' ? 'Fatura'
    : (t.cat === 'Eğlence' || SUBRE.test(u) ? 'Abonelik' : 'Diğer');
  return { name: mNice(toks.slice(0, 3).join(' ')), key: toks.slice(0, 2).join(' '), amt: t.amt, day: pd(t.date).getDate(), src: t.src, kind, fromTx: t.id };
}

/* ---------- araba ---------- */
/** Kategorisi "Araba" olup arabaya bağlı olmayan harcamalar (örneğin bankadan aktarılan yakıt). */
export const unlinkedCarTx = (S: State) => S.tx.filter((t) => t.cat === 'Araba' && !t.car);
/** Bunların hepsini verilen arabaya bağlar; bağlanan sayıyı döndürür. */
export function linkCarTx(S: State, carId: Id): number {
  let n = 0;
  S.tx.forEach((t) => { if (t.cat === 'Araba' && !t.car) { t.car = carId; n++; } });
  return n;
}
