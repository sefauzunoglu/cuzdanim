import { clock } from './clock';

export const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
export const MS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const pd = (s: string) => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c); };
export const today = () => iso(clock.now());
/** Yıl*12+ay: aylar arası hesaplarda tek sayı. */
export const ymOf = (d: Date) => d.getFullYear() * 12 + d.getMonth();
export const ymLabel = (y: number) => MONTHS[y % 12] + ' ' + Math.floor(y / 12);
export const dim = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const dateAt = (ym: number, day: number) => {
  const y = Math.floor(ym / 12), m = ym % 12;
  return new Date(y, m, Math.min(day, dim(y, m)));
};
export const dshort = (d: Date) => pad(d.getDate()) + ' ' + MS[d.getMonth()];
export const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysTo = (d: Date) => Math.round((midnight(d).getTime() - midnight(clock.now()).getTime()) / 864e5);
export const addDays = (n: number) => { const d = clock.now(); d.setDate(d.getDate() + n); return iso(d); };
