import { CATS } from './constants';
import { cardInfo, find } from './calc';
import { mKey } from './merchant';
import type { Id, State } from './types';

export interface MerchantGroup { k: string; name: string; n: number; tot: number }

/** Kartın belirli bir dönemindeki (scope: 'cur' = açık dönem, 'prev' = önceki ekstre) belirli kategorideki işlemleri işyerine göre gruplar. */
export function merchantGroups(S: State, cardId: Id, scope: 'cur' | 'prev', cat: string): MerchantGroup[] {
  const c = find(S.cards, cardId);
  if (!c) return [];
  const ci = cardInfo(S, c), idx = scope === 'prev' ? ci.cur - 1 : ci.cur;
  const inScope = new Set(ci.ch.filter((x) => x.idx === idx).map((x) => x.tx.id));
  const g: Record<string, MerchantGroup> = {};
  S.tx.filter((t) => t.src === 'card:' + cardId && t.cat === cat && inScope.has(t.id)).forEach((t) => {
    const k = mKey(t.note || '');
    if (!k) return;
    const x = g[k] || (g[k] = { k, name: (t.note || '').replace(/ ?\(kalan taksitler\)/, ''), n: 0, tot: 0 });
    x.n++; x.tot += t.amt;
  });
  return Object.values(g).sort((a, b) => b.tot - a.tot);
}

/** Yeni kategori açar (aynı ad varsa onu döndürür). */
export function addCategory(S: State, name: string): string {
  const nn = name.trim().slice(0, 20);
  const ex = CATS.find((x) => x.toLocaleLowerCase('tr-TR') === nn.toLocaleLowerCase('tr-TR'));
  if (ex) return ex;
  CATS.push(nn);
  (S.cfg.cats = S.cfg.cats || []).push(nn);
  return nn;
}

/**
 * Seçilen işyerlerinin (anahtarlar) kategorisi `from` olan kart işlemlerini `to` kategorisine taşır.
 * rule=true ise sonraki aktarmalarda otomatik uygulanacak kural da kaydedilir. Taşınan işlem sayısını döndürür.
 */
export function moveCategory(S: State, cardId: Id, from: string, to: string, keys: string[], rule: boolean): number {
  let n = 0;
  S.tx.forEach((t) => {
    if (t.src === 'card:' + cardId && t.cat === from && keys.includes(mKey(t.note || ''))) { t.cat = to; if (to !== 'Araba') delete t.sub; n++; }
  });
  if (rule) {
    S.cfg.rules = S.cfg.rules || [];
    keys.forEach((k) => { const r = S.cfg.rules!.find((x) => x.k === k); if (r) r.cat = to; else S.cfg.rules!.push({ k, cat: to }); });
  }
  return n;
}
