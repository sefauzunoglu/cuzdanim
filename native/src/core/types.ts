export type Id = string;
/** "card:ID" veya "acc:ID" */
export type SrcRef = string;

export interface Account { id: Id; name: string; type: 'cash' | 'bank'; opening: number }
export interface Card {
  id: Id; name: string; limit: number; cutoff: number; due: number;
  minAuto?: boolean; minRate?: number; rateAuto?: boolean; rate?: number;
  openDebt?: number; since?: string;
  /** Kartın son 4 hanesi: Excel ekstresindeki bölümü kartla eşleştirmek için */
  last4?: string;
  /** Sanal kartlar: ana kartın limitini ve ekstresini paylaşır, harcamalar ayrıca gruplanır */
  vcards?: { id: Id; name: string; last4?: string }[];
}
export interface Tx {
  id: Id; date: string; amt: number; cat: string; src: SrcRef; note?: string; inst: number;
  sub?: string; car?: Id; km?: number; rec?: string; auto?: boolean;
  /** Harcamanın yapıldığı sanal kart (ana kartın vcards listesindeki id) */
  vc?: Id;
  /** Geçmiş kayıt: kesilmiş ekstre borcuna sayılmaz (borç zaten elle girildi veya ekstre ödendi). Açık dönem ve gelecek taksitler yine sayılır. */
  hist?: boolean;
}
export interface Income { id: Id; date: string; amt: number; note?: string; acc: Id; rec?: Id }
export interface Transfer { id: Id; date: string; amt: number; from: Id; to: Id; toText?: string; note?: string }
export interface CardPay { id: Id; date: string; amt: number; card: Id; from: Id | '' }
export type GoldUnit = 'gram' | 'ceyrek' | 'yarim' | 'tam';
export type GoldHold = Partial<Record<GoldUnit, number>>;
export interface Debt {
  id: Id; type: 'loan' | 'gold' | 'person' | 'other'; name: string;
  remaining?: number; gold?: GoldHold; monthly?: number; day?: number; rate?: number;
}
export interface DebtPay { id: Id; debt: Id; date: string; amt: number; gold?: GoldHold; from: Id | '' }
export interface Recurring {
  id: Id; kind: 'Kira' | 'Fatura' | 'Abonelik' | 'Diğer'; name: string; amt: number; day: number;
  src: SrcRef | ''; active?: boolean; auto?: boolean; autoFrom?: number;
}
export interface IncomeRec { id: Id; name: string; amt: number; day: number; acc: Id }
export interface Car { id: Id; name: string; plate?: string; km?: number; inspect?: string; insurance?: string; kasko?: string }
export interface Gun {
  id: Id; name: string; kind: 'gold' | 'cash'; first: string; n: number; turn: number;
  unit?: GoldUnit; qty?: number; amt?: number;
  paid: Record<number, true | Id>; recv: { done: boolean; date: string; amt: number } | null;
}
export interface GoldPrices { gram?: number; ceyrek?: number; yarim?: number; tam?: number; updated?: number; live?: boolean }

export interface State {
  v: number;
  accounts: Account[]; cards: Card[]; tx: Tx[]; incomes: Income[]; transfers: Transfer[];
  cardPay: CardPay[]; debts: Debt[]; debtPay: DebtPay[]; recurring: Recurring[];
  recPaid: Record<string, Id>; recSkip?: Record<string, 1>;
  incomeRec: IncomeRec[]; incPaid: Record<string, Id>; cars: Car[]; gun: Gun[];
  cfg: { gold?: GoldPrices; noIcons?: boolean; goldPrice?: number; theme?: 'light' | 'dark' };
  meta: { demo?: boolean; lastBackup?: string };
}
