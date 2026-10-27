/**
 * Eski web uygulamasıyla (PWA, sürüm 14) yeni TypeScript çekirdeğinin aynı veriyle aynı sonuçları verdiğini doğrular.
 * Eski uygulama gerçek tarayıcıda, saat sabitlenerek çalıştırılır; aynı durum (State) TS tarafına verilir.
 * Kullanım: PWA_HTML=/yol/index.html npx tsx tests/parity.ts
 */
import { createRequire } from 'node:module';
import * as core from '../src/core';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HTML = process.env.PWA_HTML || '/home/user/cuzdanim/index.html';

const r2 = (n: number) => Math.round(n * 100) / 100;
const dates: [number, number, number][] = [[2026, 9, 27], [2026, 10, 3], [2026, 11, 31], [2027, 0, 15], [2027, 1, 28]];

/** Sayfada (eski uygulama) çalışan özet çıkarıcı. */
const OLD_FN = `(() => {
  const r2=n=>Math.round(n*100)/100, t=totals(), cm=ymOf(new Date());
  const sd=simDebts(), base=simulate(sd,0,'avalanche',0,false), pl=simulate(sd,3000,'avalanche',5000,true), sn=simulate(sd,3000,'snowball',0,true);
  const fc=freeCash();
  return {
    totals:{cardDebt:r2(t.cardDebt),inst:r2(t.inst),other:r2(t.other),total:r2(t.total),cash:r2(t.cash),gunDebt:r2(t.gunDebt)},
    cards:S.cards.map(c=>{const i=cardInfo(c);return {name:c.name,currentDebt:r2(i.currentDebt),closedDebt:r2(i.closedDebt),openDebt:r2(i.openDebt),future:r2(i.future),avail:r2(i.avail),min:r2(i.min),nextEst:r2(i.nextEst),rate:i.rate,minRate:i.minRate,carryInt:r2(i.carryInt),dueIn:i.dueIn,util:r2(i.util*100)}}),
    acc:S.accounts.map(a=>[a.name,r2(accBal(a))]),
    up:upcoming(30).map(u=>[u.t,r2(u.amt),u.k,daysTo(u.d),u.out]),
    fc:{inc:r2(fc.inc),fixed:r2(fc.fixed),ins:r2(fc.ins),debtM:r2(fc.debtM),vari:r2(fc.vari),free:r2(fc.free)},
    advice:advice().map(a=>[a.l,a.t,a.s]),
    months:[cm-2,cm-1,cm,cm+1].map(m=>[r2(sum(monthParts(m),p=>p.amt)),r2(monthIncome(m))]),
    sim:[base,pl,sn].map(x=>[x.months,r2(x.interest),r2(x.hist[x.hist.length-1]),x.hist.length]),
    gun:S.gun.map(g=>[r2(gunC(g)),gunLeft(g),r2(gunPot(g)),gunNext(g),r2(gunDebtTL(g))]),
    gold:S.debts.filter(d=>d.type==='gold').map(d=>[goldDesc(d),r2(goldVal(d))]),
  };
})()`;

function newSummary(S: core.State) {
  const t = core.totals(S), cm = core.ymOf(core.clock.now());
  const sd = core.simDebts(S);
  const base = core.simulate(sd, 0, 'avalanche', 0, false), pl = core.simulate(sd, 3000, 'avalanche', 5000, true), sn = core.simulate(sd, 3000, 'snowball', 0, true);
  const fc = core.freeCash(S);
  return {
    totals: { cardDebt: r2(t.cardDebt), inst: r2(t.inst), other: r2(t.other), total: r2(t.total), cash: r2(t.cash), gunDebt: r2(t.gunDebt) },
    cards: S.cards.map((c) => { const i = core.cardInfo(S, c); return { name: c.name, currentDebt: r2(i.currentDebt), closedDebt: r2(i.closedDebt), openDebt: r2(i.openDebt), future: r2(i.future), avail: r2(i.avail), min: r2(i.min), nextEst: r2(i.nextEst), rate: i.rate, minRate: i.minRate, carryInt: r2(i.carryInt), dueIn: i.dueIn, util: r2(i.util * 100) }; }),
    acc: S.accounts.map((a) => [a.name, r2(core.accBal(S, a))]),
    up: core.upcoming(S, 30).map((u) => [u.t, r2(u.amt), u.k, core.daysTo(u.d), u.out]),
    fc: { inc: r2(fc.inc), fixed: r2(fc.fixed), ins: r2(fc.ins), debtM: r2(fc.debtM), vari: r2(fc.vari), free: r2(fc.free) },
    advice: core.advice(S).map((a) => [a.l, a.t, a.s]),
    months: [cm - 2, cm - 1, cm, cm + 1].map((m) => [r2(core.sum(core.monthParts(S, m), (p) => p.amt)), r2(core.monthIncome(S, m))]),
    sim: [base, pl, sn].map((x) => [x.months, r2(x.interest), r2(x.hist[x.hist.length - 1]), x.hist.length]),
    gun: S.gun.map((g) => [r2(core.gunC(S, g)), core.gunLeft(S, g), r2(core.gunPot(S, g)), core.gunNext(S, g), r2(core.gunDebtTL(S, g))]),
    gold: S.debts.filter((d) => d.type === 'gold').map((d) => [core.goldDesc(d), r2(core.goldVal(S, d))]),
  };
}

function diff(a: any, b: any, path = ''): string[] {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.011 ? [] : [`${path}: eski=${a} yeni=${b}`];
  if (Array.isArray(a) && Array.isArray(b)) {
    const out: string[] = [];
    if (a.length !== b.length) out.push(`${path}: uzunluk eski=${a.length} yeni=${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) out.push(...diff(a[i], b[i], `${path}[${i}]`));
    return out;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return Object.keys({ ...a, ...b }).flatMap((k) => diff(a[k], b[k], path + '.' + k));
  }
  return a === b ? [] : [`${path}: eski=${JSON.stringify(a)} yeni=${JSON.stringify(b)}`];
}

const browser = await chromium.launch();
let failed = 0;
for (const [y, m, d] of dates) {
  const fixed = new Date(y, m, d, 12, 0, 0);
  const page = await browser.newPage();
  await page.clock.install({ time: fixed });
  await page.goto('file://' + HTML);
  await page.evaluate('A.demo()');
  const state = await page.evaluate('JSON.parse(JSON.stringify(S))');
  const oldRes = await page.evaluate(OLD_FN);
  core.clock.now = () => new Date(fixed.getTime());
  const S = core.migrate(state);
  const newRes = newSummary(S);
  const errs = diff(oldRes, newRes);
  const label = fixed.toISOString().slice(0, 10);
  if (errs.length) { failed++; console.log(`FARK ${label}: ${errs.length} fark`); errs.slice(0, 15).forEach((e) => console.log('  ' + e)); }
  else console.log(`AYNI ${label}: kart=${newRes.cards.length} öneri=${newRes.advice.length} yaklaşan=${newRes.up.length} toplam borç=${newRes.totals.total}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
