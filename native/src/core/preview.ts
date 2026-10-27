import { cardInfo, accBal, find, stmtIdx } from './calc';
import { pd } from './dates';
import { ymLabel, today } from './dates';
import { fmt, fmtI } from './format';
import type { State, Tx } from './types';

export interface ExpenseDraft { amt: number; src: string; date: string; inst: number }

/** Harcama formundaki "bu harcama ne yapar" özeti. */
export function expensePreview(S: State, d: ExpenseDraft, editing?: Tx): { text: string; level: 'ok' | 'warn' | 'bad' } {
  const { amt, src } = d;
  const inst = d.inst || 1;
  if (src.startsWith('card:')) {
    const c = find(S.cards, src.slice(5));
    if (!c) return { text: '', level: 'ok' };
    const i = cardInfo(S, c);
    const si = c.since ? stmtIdx(c, c.since) : -1e9;
    const base = stmtIdx(c, d.date || today());
    const settledOf = (date: string, n: number) => { const b = stmtIdx(c, date); let k0 = 0; for (let k = 0; k < n; k++) if (b + k < si) k0++; return k0; };
    const settled = settledOf(d.date || today(), inst);
    const eff = (amt / inst) * (inst - settled);
    const oldEff = editing && editing.src === src ? (editing.amt / (editing.inst || 1)) * ((editing.inst || 1) - settledOf(editing.date, editing.inst || 1)) : 0;
    if (!(amt > 0)) return { text: 'Tutarı yaz; ekstreye etkisini burada göreceksin.', level: 'ok' };
    let t = `${inst > 1 ? `${inst} × ${fmt(amt / inst)} · ` : ''}Bu harcama ${c.name} kartının ${ymLabel(base)} ekstresinden itibaren yansır.`;
    if (settled > 0) t += `\n${settled} taksit takip başlangıcından önce olduğu için ödenmiş sayılır. Borca ve limite ${inst - settled} taksit (${fmtI(eff)}) yansır.`;
    const after = i.avail + oldEff - eff;
    t += `\nKalan limit: ${fmtI(i.avail)} → ${fmtI(after)}`;
    return { text: t, level: after < 0 && !editing ? 'bad' : 'ok' };
  }
  const a = find(S.accounts, src.slice(4));
  if (!a) return { text: '', level: 'ok' };
  const b = accBal(S, a);
  if (!(amt > 0)) return { text: `${a.name} bakiyesi: ${fmtI(b)}`, level: 'ok' };
  const after = b - amt + (editing && editing.src === src ? editing.amt : 0);
  return { text: `${a.name} bakiyesi: ${fmtI(b)} → ${fmtI(after)}`, level: after < 0 ? 'warn' : 'ok' };
}
void pd;
