import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Tx } from './core';

export type View =
  | 'home' | 'spend' | 'cards' | 'cardDetail' | 'debts' | 'more'
  | 'income' | 'fixed' | 'car' | 'gun' | 'scen' | 'acc' | 'set';

export interface ExpenseRequest { tx?: Tx; preset?: Partial<{ src: string; cat: string; car: string }> }

interface Nav {
  view: View;
  cardId: string | null;
  go: (v: View) => void;
  back: () => void;
  openCard: (id: string) => void;
  expense: ExpenseRequest | null;
  openExpense: (r?: ExpenseRequest) => void;
  closeExpense: () => void;
}
const NavCtx = createContext<Nav>(null as unknown as Nav);
export const useNav = () => useContext(NavCtx);
export const MAIN: View[] = ['home', 'spend', 'cards', 'debts'];

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>('home');
  const [cardId, setCardId] = useState<string | null>(null);
  const [expense, setExpense] = useState<ExpenseRequest | null>(null);
  const go = useCallback((v: View) => setView(v), []);
  const back = useCallback(() => setView((v) => (v === 'cardDetail' ? 'cards' : v === 'more' ? 'home' : 'more')), []);
  const openCard = useCallback((id: string) => { setCardId(id); setView('cardDetail'); }, []);
  const openExpense = useCallback((r?: ExpenseRequest) => setExpense(r || {}), []);
  const closeExpense = useCallback(() => setExpense(null), []);
  return <NavCtx.Provider value={{ view, cardId, go, back, openCard, expense, openExpense, closeExpense }}>{children}</NavCtx.Provider>;
}
