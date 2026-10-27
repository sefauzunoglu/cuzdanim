import { cardInfo, debtBal } from './calc';
import { sum } from './format';
import type { State } from './types';

export interface SimDebt { n: string; bal: number; rate: number; kind: 'card' | 'fixed'; pct?: number; min?: number }
export type Strategy = 'avalanche' | 'snowball';

/** Senaryoya giren borçlar: kartlar (güncel borç) ve diğer borçlar. */
export function simDebts(S: State): SimDebt[] {
  const o: SimDebt[] = [];
  S.cards.forEach((c) => {
    const i = cardInfo(S, c);
    if (i.currentDebt > 1) o.push({ n: c.name, bal: i.currentDebt, rate: i.rate, kind: 'card', pct: i.minRate / 100 });
  });
  S.debts.forEach((d) => {
    const b = debtBal(S, d);
    if (b > 1) o.push({ n: d.name, bal: b, rate: d.rate || 0, kind: 'fixed', min: d.monthly || 0 });
  });
  return o;
}

export function simulate(ds: SimDebt[], extra: number, strat: Strategy, lump: number, roll: boolean) {
  const d = ds.map((x) => ({ ...x }));
  let months = 0, interest = 0;
  const hist = [sum(d, (x) => x.bal)];
  const ord = () => d.filter((x) => x.bal > 0.5).sort(strat === 'avalanche' ? (a, b) => b.rate - a.rate || a.bal - b.bal : (a, b) => a.bal - b.bal);
  const minOf = (x: SimDebt) => (x.kind === 'card' ? Math.min(x.bal, Math.max(x.bal * (x.pct as number), Math.min(x.bal, 100))) : Math.min(x.bal, x.min as number));
  const apply = (amt: number) => { for (const x of ord()) { if (amt <= 0) break; const p = Math.min(x.bal, amt); x.bal -= p; amt -= p; } };
  if (lump > 0) apply(lump);
  hist[0] = sum(d, (x) => x.bal);
  const m0: Record<string, number> = {};
  d.forEach((x) => { m0[x.n] = x.kind === 'card' ? x.bal * (x.pct as number) : (x.min as number); });
  while (sum(d, (x) => x.bal) > 0.5 && months < 600) {
    months++;
    d.forEach((x) => { if (x.bal > 0) { const i = x.bal * x.rate / 100; x.bal += i; interest += i; } });
    let freed = 0;
    d.forEach((x) => { if (x.bal <= 0.5) freed += roll ? m0[x.n] || 0 : 0; });
    d.forEach((x) => { if (x.bal > 0.5) x.bal -= minOf(x); });
    if (roll) apply(extra + freed);
    hist.push(sum(d, (x) => x.bal));
    if (months >= 12 && hist[months] >= hist[months - 12] * 0.999 && hist[months] > 0 && months >= 24) break;
  }
  const ok = sum(d, (x) => x.bal) <= 0.5;
  return { months: ok ? months : null, interest, hist, ok };
}
