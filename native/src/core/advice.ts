import { clock } from './clock';
import { daysTo, pd, ymOf } from './dates';
import { debtBal, freeCash, goldDesc, goldVal, monthParts, totals, upcoming } from './calc';
import { fmt, fmtI, pc, sum } from './format';
import type { State } from './types';

export type TipLevel = 'bad' | 'warn' | 'good' | 'info';
export interface Tip { l: TipLevel; t: string; s: string; go?: string }

/** Özet ekranındaki öneriler; önem sırasına göre dizilir. */
export function advice(S: State): Tip[] {
  const o: Tip[] = [], t = totals(S), cm = ymOf(clock.now()), up = upcoming(S, 30), fc = freeCash(S);
  S.cards.forEach((c, i) => {
    const x = t.ci[i];
    if (x.closedDebt > 0.5) {
      const lb = x.dueIn < 0 ? `${-x.dueIn} gün gecikti` : x.dueIn === 0 ? 'son ödeme bugün' : x.dueIn + ' gün kaldı';
      o.push({ l: x.dueIn <= 3 ? 'bad' : 'warn', t: `${c.name}: ekstre ${lb}`,
        s: `Dönem borcu ${fmt(x.closedDebt)}, asgari ${fmt(x.min)}. Tamamını ödersen faiz işlemez; yalnızca asgariyi ödersen kalan ${fmt(x.carry)} için aylık yaklaşık ${fmt(x.carryInt)} faiz (%${pc(x.rate)}) işler.`, go: 'cards' });
    }
    if (x.util > 0.8)
      o.push({ l: 'bad', t: `${c.name} limiti %${Math.round(x.util * 100)} dolu`, s: `Kalan limit ${fmt(x.avail)}. Yeni harcamaları nakit veya banka hesabıyla yapmayı dene.`, go: 'cards' });
    if (x.nextEst > 0)
      o.push({ l: 'info', t: `${c.name}: sonraki ekstre tahmini ${fmt(x.nextEst)}`,
        s: `Asgari yaklaşık ${fmt(x.nextMin)}. İçinde ${fmt(sum(x.ch.filter((z) => z.idx === x.cur && z.n > 1), (z) => z.amt))} taksit var.`, go: 'cards' });
  });
  const need = sum(up.filter((u) => u.out && u.k !== 'card'), (u) => u.amt) + sum(t.ci, (x) => x.min);
  const surplus = t.cash - need;
  const targets = [
    ...S.cards.map((c, i) => ({ n: c.name, b: t.ci[i].currentDebt, r: t.ci[i].rate })),
    ...S.debts.map((d) => ({ n: d.name, b: debtBal(S, d), r: d.rate || 0 })),
  ].filter((x) => x.b > 1).sort((a, b) => b.r - a.r || b.b - a.b);
  if (targets.length && surplus > 500) {
    const g = targets[0], pay = Math.min(surplus, g.b);
    o.push({ l: 'good', t: `${fmtI(pay)} ile ${g.n} borcunu azalt`,
      s: `30 günlük zorunlu ödemelerin (${fmtI(need)}) ayrıldıktan sonra nakitte ${fmtI(surplus)} fazla var. ${g.r ? `Bu borç ayda %${g.r} faizle işliyor.` : 'Önce en pahalı borçtan kapatmak toplam faizi düşürür.'}`, go: 'scen' });
  } else if (targets.length && t.cash > 0 && surplus <= 0)
    o.push({ l: 'warn', t: 'Nakit önümüzdeki 30 günün ödemelerine yetmiyor', s: `Gereken ${fmtI(need)}, eldeki ${fmtI(t.cash)}. Harcamaları kıs veya taksitli yeni harcama yapma.`, go: 'acc' });
  const inc = fc.inc;
  if (inc > 0 && fc.ins / inc > 0.35)
    o.push({ l: 'warn', t: `Gelecek ay taksit yükü gelirinin %${Math.round(fc.ins / inc * 100)}'i`, s: `${fmtI(fc.ins)} taksit ödenecek. Yeni taksitli alışverişten önce iki kez düşün.`, go: 'cards' });
  if (inc > 0)
    o.push({ l: fc.free > 0 ? 'info' : 'bad', t: fc.free > 0 ? `Aylık tahmini boş paran ${fmtI(fc.free)}` : `Aylık gider gelirini ${fmtI(-fc.free)} aşıyor`,
      s: `Gelir ${fmtI(inc)} − sabit gider ${fmtI(fc.fixed)} − taksit ${fmtI(fc.ins)} − kredi/borç taksiti ${fmtI(fc.debtM)} − ortalama değişken harcama ${fmtI(fc.vari)}.`, go: 'scen' });
  const dis = ['Yemek', 'Eğlence', 'Giyim', 'Kişisel'], pm = monthParts(S, cm).filter((p) => !p.tx.rec);
  const dsp = dis.map((c) => [c, sum(pm.filter((p) => p.tx.cat === c), (p) => p.amt)] as [string, number]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1])[0];
  if (dsp && targets.length)
    o.push({ l: 'info', t: `${dsp[0]} harcaması bu ay ${fmtI(dsp[1])}`, s: `%20 kısarsan ayda ${fmtI(dsp[1] * 0.2)}, yılda ${fmtI(dsp[1] * 0.2 * 12)} borç ödemesine kalır.`, go: 'scen' });
  const subs = sum(S.recurring.filter((r) => r.kind === 'Abonelik' && r.active !== false), (r) => r.amt);
  if (subs > 0)
    o.push({ l: 'info', t: `Abonelikler ayda ${fmtI(subs)}, yılda ${fmtI(subs * 12)}`, s: 'Kullanmadıklarını iptal etmeyi düşün.', go: 'fixed' });
  S.cars.forEach((c) => ([['inspect', 'Muayene'], ['insurance', 'Trafik sigortası'], ['kasko', 'Kasko']] as const).forEach(([k, l]) => {
    const v = (c as any)[k];
    if (v) {
      const dd = daysTo(pd(v));
      if (dd <= 30) o.push({ l: dd < 0 ? 'bad' : 'warn', t: `${c.name}: ${l} ${dd < 0 ? `${-dd} gün geçti` : dd + ' gün sonra'}`, s: 'Araba sayfasından tarihi güncelleyebilirsin.', go: 'car' });
    }
  }));
  S.debts.filter((d) => d.type === 'gold' && goldVal(S, d) > 0).forEach((d) => {
    const v = goldVal(S, d);
    o.push({ l: 'info', t: `${d.name}: ${goldDesc(d)} borcun şu an ${fmtI(v)}`, s: `Altın fiyatı %5 artarsa borcun ${fmtI(v * 0.05)} büyür. Altın borçları fiyatla birlikte yükselir, mümkünse önce kapat.`, go: 'debts' });
  });
  const od = up.filter((u) => u.out && daysTo(u.d) < 0 && u.k !== 'card');
  if (od.length) o.unshift({ l: 'bad', t: `${od.length} gecikmiş ödeme var`, s: od.map((u) => u.t).join(', '), go: 'fixed' });
  const rank: Record<TipLevel, number> = { bad: 0, warn: 1, good: 2, info: 3 };
  return o.sort((a, b) => rank[a.l] - rank[b.l]);
}
