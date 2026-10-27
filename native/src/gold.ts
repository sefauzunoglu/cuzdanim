import * as core from './core';
import type { State } from './core';

const URLS = ['https://finans.truncgil.com/v4/today.json', 'https://finans.truncgil.com/today.json'];

/** Canlı altın satış fiyatlarını çeker. Başarılıysa fiyatları döndürür, olmazsa null. */
export async function fetchGoldPrices(): Promise<Partial<Record<core.GoldUnit, number>> | null> {
  for (const u of URLS) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) continue;
      const p = core.parseGold(await r.json());
      if ((p.gram || 0) > 0) return p;
    } catch { /* sonraki adresi dene */ }
  }
  return null;
}

export const applyGoldPrices = (S: State, p: Partial<Record<core.GoldUnit, number>>) => {
  S.cfg.gold = Object.assign({}, S.cfg.gold, p, { updated: Date.now(), live: true });
};
/** Fiyat 30 dakikadan eskiyse yenilenmeli mi? */
export const goldStale = (S: State) => !(S.cfg.gold && S.cfg.gold.updated) || Date.now() - (S.cfg.gold.updated as number) > 30 * 60 * 1000;
