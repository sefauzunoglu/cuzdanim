import { iso } from './dates';
import { clock } from './clock';
import type { State } from './types';

export const emptyData = (): State => ({
  v: 1, accounts: [], cards: [], tx: [], incomes: [], transfers: [], cardPay: [], debts: [], debtPay: [],
  recurring: [], recPaid: {}, incomeRec: [], incPaid: {}, cars: [], gun: [], cfg: {}, meta: {},
});

/** Eski sürümlerden gelen veriyi yeni biçime taşır; eksik alanları tamamlar. */
export function migrate(raw: unknown): State {
  const S: State = Object.assign(emptyData(), raw as object);
  S.cards.forEach((c) => {
    if (!c.since) {
      const ds = S.tx.filter((t) => t.src === 'card:' + c.id).map((t) => t.date).sort();
      c.since = ds[0] || iso(clock.now());
    }
  });
  S.debts.forEach((d: any) => {
    if (d.type === 'gold' && !d.gold) { d.gold = { gram: +d.remGrams || 0 }; delete d.remGrams; }
  });
  if (S.cfg.goldPrice && !S.cfg.gold) { S.cfg.gold = { gram: S.cfg.goldPrice }; delete S.cfg.goldPrice; }
  return S;
}

export function isBackupLike(o: any): boolean {
  return !!o && Array.isArray(o.tx);
}
