import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyData, migrate, processAuto } from './core';
import type { State } from './core';
import { applyGoldPrices, fetchGoldPrices, goldStale } from './gold';

const KEY = 'cuzdanim_v1';
/** İkinci kopya: ana kayıt bozulursa buradan okunur. */
const KEY2 = 'cuzdanim_v1_kopya';

interface Ctx {
  S: State;
  ready: boolean;
  /** Durumu değiştirir, kaydeder, ekranı yeniler. */
  update: (fn: (S: State) => void) => void;
  /** Durumu tamamen değiştirir (geri yükleme, örnek veri, sıfırlama). */
  replace: (S: State) => void;
  toast: (m: string) => void;
  message: string | null;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

async function readState(): Promise<State | null> {
  for (const k of [KEY, KEY2]) {
    try {
      const raw = await AsyncStorage.getItem(k);
      if (raw) return migrate(JSON.parse(raw));
    } catch { /* bir sonraki kopyayı dene */ }
  }
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [S, setS] = useState<State>(emptyData());
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef(S);
  ref.current = S;

  const toast = useCallback((m: string) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2800);
  }, []);

  const persist = useCallback((s: State) => {
    const j = JSON.stringify(s);
    AsyncStorage.setItem(KEY, j).catch(() => {});
    AsyncStorage.setItem(KEY2, j).catch(() => {});
  }, []);

  const update = useCallback((fn: (S: State) => void) => {
    const next = ref.current;
    fn(next);
    const copy = { ...next };
    ref.current = copy;
    setS(copy);
    persist(copy);
  }, [persist]);

  const replace = useCallback((s: State) => { ref.current = s; setS(s); persist(s); }, [persist]);

  useEffect(() => {
    (async () => {
      const s = (await readState()) || emptyData();
      const n = processAuto(s);
      ref.current = s;
      setS({ ...s });
      if (n) { persist(s); toast(`${n} sabit gider otomatik işlendi`); }
      setReady(true);
      if (s.debts.some((d) => d.type === 'gold') && goldStale(s)) {
        const p = await fetchGoldPrices();
        if (p) { applyGoldPrices(ref.current, p); const c = { ...ref.current }; ref.current = c; setS(c); persist(c); }
      }
    })();
  }, [persist, toast]);

  return <AppCtx.Provider value={{ S, ready, update, replace, toast, message }}>{children}</AppCtx.Provider>;
}
