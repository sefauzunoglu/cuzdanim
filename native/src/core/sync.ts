import { cardInfo, find, stmtIdx, stmtRange } from './calc';
import { iso, pd, ymOf } from './dates';
import { uid, sum } from './format';
import { mKey, recKey, ruleFor, stmtRoot } from './merchant';
import type { PdfMeta, SyncLine } from './garantiPdf';
import type { Card, Id, Recurring, State, Tx } from './types';

/** open = bankanın "Dönem içi" dökümü (bu ayın harcamaları ve taksit parçaları); last = kesilmiş ekstre. */
export type SyncKind = 'open' | 'last';

/** Excel satırlarından dosya türünü tahmin eder: "Dönemiçi İşlemler" başlığı varsa dönem içi, yoksa kesilmiş ekstre. */
export function detectKind(rows: unknown[][]): SyncKind {
  return rows.slice(0, 80).some((r) => /d[öo]nem\s*i[çc]i/i.test((r || []).map(String).join(' '))) ? 'open' : 'last';
}

/** Son 4 haneye göre ana veya sanal kart bulur. */
export function findByLast4(S: State, l4?: string): { card: Card; vid: Id | '' } | null {
  if (!l4) return null;
  for (const c of S.cards) {
    if (c.last4 === l4) return { card: c, vid: '' };
    const v = (c.vcards || []).find((x) => x.last4 === l4);
    if (v) return { card: c, vid: v.id };
  }
  return null;
}

/**
 * Banka her ay taksit tutarını birkaç kuruş farklı yazar ve açıklamaya şehir ekleyebilir; kayıtlı bir taksitle
 * aynı sayılması için açıklama kökü biri diğerinin başlangıcıysa ve tutar yaklaşık eşitse yeterlidir.
 */
export const stmtDupPred = (card: Card, l: SyncLine) => (t: Tx): boolean => {
  if (t.src !== 'card:' + card.id) return false;
  const per = t.amt / (t.inst || 1);
  if (l.inst && t.inst > 1 && Math.abs(per - l.amt) <= Math.max(0.5, l.amt * 0.002)) {
    const ra = stmtRoot(t.note || ''), rb = stmtRoot(l.desc);
    if (ra === rb || (Math.min(ra.length, rb.length) >= 6 && (ra.startsWith(rb) || rb.startsWith(ra)))) return true;
  }
  return Math.abs(per - l.amt) < 0.01 && (t.date === l.date || !!(l.inst && t.inst > 1));
};
export const stmtDupOf = (card: Card, l: SyncLine, pool: Tx[]) => pool.some(stmtDupPred(card, l));

/** Ekstre satırına karşılık gelen sabit gider (bankadaki yazıya veya ada göre). */
export const recFor = (S: State, card: Card, desc: string): Recurring | undefined => {
  const d = recKey(desc);
  return S.recurring.find((r) => {
    if (r.active === false || (r.src && r.src !== 'card:' + card.id)) return false;
    const k = recKey(r.key || r.name);
    return k.length >= 3 && d.includes(k);
  });
};

export interface SyncPlan {
  drop: Tx[]; add: Tx[]; skip: SyncLine[]; psIso: string; cur: number;
  autoDrop: Tx[]; matches: { o: Tx; r: Recurring; k: string }[]; fixes: Tx[]; cutSd: string;
}

/** Hiçbir şeyi değiştirmeden ne olacağını hesaplar. */
export function syncPlan(S: State, card: Card, vid: Id | '', kind: SyncKind, lines: SyncLine[], meta?: PdfMeta | null): SyncPlan {
  const cur = cardInfo(S, card).cur, key = 'open:' + (vid || 'main'), psIso = iso(stmtRange(card, cur)[0]);
  const drop = kind === 'open' ? S.tx.filter((t) => t.src === 'card:' + card.id && t.imp === key && stmtIdx(card, t.sd || t.date) >= cur) : [];
  /* Ekstre PDF'inde kesim tarihi bellidir: o ekstredeki taksitler bankanın dönemine oturtulur. */
  const cutSd = kind === 'last' && meta && meta.cut ? meta.cut : '';
  const pool = S.tx.filter((t) => !drop.includes(t));
  const add: Tx[] = [], skip: SyncLine[] = [], autoDrop: Tx[] = [], matches: SyncPlan['matches'] = [], fixes: Tx[] = [];
  lines.forEach((l) => {
    if (l.kind !== 'charge') return;
    if ((l.inst || kind === 'last') && stmtDupOf(card, l, pool)) {
      if (l.inst && cutSd) {
        const ex = pool.find(stmtDupPred(card, l));
        if (ex && ex.inst === l.inst.n - l.inst.k + 1 && ex.sd !== cutSd) fixes.push(ex);
      }
      skip.push(l); return;
    }
    let rm: { r: Recurring; k: string } | null = null;
    if (!l.inst) {
      const r = recFor(S, card, l.desc);
      if (r) {
        const k = r.id + '|' + ymOf(pd(l.date)), ex = S.recPaid[k] ? find(S.tx, S.recPaid[k]) : undefined;
        if (ex && !ex.auto && !drop.includes(ex)) { skip.push(l); return; }
        if (ex && ex.auto) autoDrop.push(ex);
        rm = { r, k };
      }
    }
    const o: Tx = { id: uid(), cat: l.cat, src: 'card:' + card.id, note: l.desc, date: l.date, inst: 1, amt: l.amt };
    const f = l.v !== undefined ? (l.v ? findByLast4(S, l.v) : null) : null;
    const lv = l.v !== undefined ? (f && f.card.id === card.id ? f.vid : '') : vid;
    if (lv) o.vc = lv;
    if (l.inst) { const left = l.inst.n - l.inst.k + 1; o.inst = left; o.amt = l.amt * left; o.note = l.desc + ' (kalan taksitler)'; }
    if (l.sub && l.cat === 'Araba') o.sub = l.sub;
    { const ru = ruleFor(S, l.desc); if (ru) { o.cat = ru.cat; if (ru.cat !== 'Araba') delete o.sub; } }
    if (o.cat === 'Araba' && S.cars.length === 1) o.car = S.cars[0].id;
    if (kind === 'open') { o.imp = key; if (l.date < psIso) o.sd = psIso; } else { o.hist = true; if (cutSd && l.inst) o.sd = cutSd; }
    if (rm) { o.rec = rm.r.id; matches.push({ o, r: rm.r, k: rm.k }); }
    add.push(o);
  });
  return { drop, add, skip, psIso, cur, autoDrop, matches, fixes, cutSd };
}

/** Kaydetmeden önce kullanıcıya söylenecek engel (varsa). */
export function syncCheck(card: Card, vid: Id | '', kind: SyncKind, stmt: number): string {
  if (kind === 'last' && !vid && !(stmt > 0) && !(+(card.openDebt || 0) > 0))
    return 'Kesilmiş ekstre için "Son ekstreden kalan borç" kutusunu doldur, yoksa borç eksik kalır';
  return '';
}

export interface SyncResult { plan: SyncPlan; msg: string; avail: number }

/** Planı uygular. stmt > 0 ise kesilmiş ekstre borcu bankanın "son ekstreden kalan borç" tutarına sabitlenir. */
export function syncApply(S: State, card: Card, vid: Id | '', kind: SyncKind, lines: SyncLine[], meta: PdfMeta | null | undefined, opts: { stmt?: number } = {}): SyncResult {
  const p = syncPlan(S, card, vid, kind, lines, meta);
  S.tx = S.tx.filter((t) => !p.drop.includes(t) && !p.autoDrop.includes(t)).concat(p.add);
  [...p.drop, ...p.autoDrop].forEach((t) => Object.keys(S.recPaid).forEach((k) => { if (S.recPaid[k] === t.id) delete S.recPaid[k]; }));
  p.fixes.forEach((t) => { t.sd = p.cutSd; });
  p.matches.forEach((m) => {
    S.recPaid[m.k] = m.o.id;
    if (S.recSkip) delete S.recSkip[m.k];
    if (Math.abs(m.o.amt - m.r.amt) > 0.5) m.r.amt = m.o.amt;
  });
  const eb = opts.stmt || 0;
  if (eb > 0) {
    const paidAll = sum(S.cardPay.filter((x) => x.card === card.id), (x) => x.amt);
    card.openDebt = Math.max(0, eb) + paidAll;
    card.since = p.psIso;
  }
  const avail = cardInfo(S, card).avail;
  const msg = p.add.length + ' satır eklendi'
    + (p.skip.length ? ', ' + p.skip.length + ' kayıtlı satır atlandı' : '')
    + (p.matches.length ? ', ' + p.matches.length + ' sabit gider ödendi sayıldı' : '')
    + (p.fixes.length ? ', ' + p.fixes.length + ' taksit bankanın dönemine oturtuldu' : '');
  void mKey;
  return { plan: p, msg, avail };
}
