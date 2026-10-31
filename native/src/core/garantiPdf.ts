import { pad } from './dates';
import { guessCategory } from './statement';
import type { StmtLine } from './statement';

/** Ekstre satırı; sanal kart bölümünden geliyorsa `v` sanal kartın son 4 hanesidir (ana kartta boş). */
export interface SyncLine extends StmtLine { v?: string }
export interface PdfMeta { cut?: string; due?: string; debt?: number; min?: number; last4?: string; devir?: number }

const TRMON: Record<string, number> = { ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12 };
const num = (x: string) => parseFloat(String(x).replace(/\./g, '').replace(',', '.'));
const dIso = (d: string, m: string, y: string) => { const mm = TRMON[String(m).toLocaleLowerCase('tr-TR')]; return mm ? y + '-' + pad(mm) + '-' + pad(+d) : ''; };

const headCat = (h: string): { cat: string; sub?: string } | null => {
  const u = String(h).toLocaleLowerCase('tr-TR');
  if (/akaryak/.test(u)) return { cat: 'Araba', sub: 'Yakıt' };
  if (/giyim/.test(u)) return { cat: 'Giyim' };
  if (/cafe|restaurant|fast food|pastane/.test(u)) return { cat: 'Yemek' };
  if (/süpermarket|supermarket/.test(u)) return { cat: 'Market' };
  if (/kitap|kırtasiye/.test(u)) return { cat: 'Eğitim' };
  if (/rentacar|ulaşım/.test(u)) return { cat: 'Ulaşım' };
  if (/eczane|sağlık/.test(u)) return { cat: 'Sağlık' };
  if (/güzellik|kuaför/.test(u)) return { cat: 'Kişisel' };
  return null;
};

/** Garanti kredi kartı ekstresi PDF'inden çıkarılmış metin: özet, ana kart ve sanal kart satırları. */
export function parseGarantiPdf(text: string): { meta: PdfMeta; lines: SyncLine[] } {
  const rows = text.split(/\r?\n/).map((r) => r.replace(/\bbosluk\w*/gi, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const meta: PdfMeta = {}, lines: SyncLine[] = [];
  let sec = '', head = '';
  rows.forEach((r) => {
    let m: RegExpExecArray | null;
    if ((m = /Hesap Kesim Tarihi\s+(\d{1,2}) (\S+) (\d{4})/i.exec(r))) meta.cut = dIso(m[1], m[2], m[3]);
    else if (!meta.due && (m = /Son Ödeme Tarihi:?\s+(\d{1,2}) (\S+) (\d{4})/i.exec(r))) meta.due = dIso(m[1], m[2], m[3]);
    else if (!meta.debt && (m = /Dönem Borcunuz\s+([\d.]+,\d{2})/i.exec(r))) meta.debt = num(m[1]);
    else if (!meta.min && (m = /Min\.? Ödeme Tutarı\s+([\d.]+,\d{2})/i.exec(r))) meta.min = num(m[1]);
    else if (!meta.last4 && (m = /Kart Numarası\s+\d{4} \d{2}\*+ \*+ (\d{4})/i.exec(r))) meta.last4 = m[1];
    else if ((m = /SANAL KART BİLGİLERİN[İI]Z.*?(\d{4})\s*$/i.exec(r))) { sec = m[1]; head = ''; }
    else if (!meta.devir && (m = /ÖNCEKİ DÖNEMDEN DEVİR EDİLEN TUTAR\s+([\d.]+,\d{2})/i.exec(r))) meta.devir = num(m[1]);
    else if ((m = /^(\d{1,2}) ([A-Za-zÇĞİÖŞÜçğıöşü]+) (\d{4}) (.+)$/.exec(r))) {
      const date = dIso(m[1], m[2], m[3]);
      if (!date) return;
      let rest = m[4];
      const am = /([\d.]+,\d{2})(\+)?$/.exec(rest);
      if (!am || am[2]) return;                      // ödemeler (+) borca zaten yansımış
      const amt = num(am[1]);
      rest = rest.slice(0, am.index).trim();
      let inst: { k: number; n: number } | undefined;
      const im = /([\d.]+,\d{2})x(\d+)=([\d.]+,\d{2}) (\d+)\.Taksit/.exec(rest);
      if (im) { inst = { k: +im[4], n: +im[2] }; rest = (rest.slice(0, im.index) + ' ' + rest.slice(im.index + im[0].length)).trim(); }
      rest = rest.replace(/\s\d{1,3},\d{2}$/, '').trim();   // bonus sütunu
      if (!rest || !(amt > 0)) return;
      const g = guessCategory(rest), h = g.cat === 'Diğer' ? headCat(head) : null, c = h || g;
      const o: SyncLine = { date, desc: rest, amt, kind: 'charge', cat: c.cat, v: sec };
      if (c.sub) o.sub = c.sub;
      if (inst) o.inst = inst;
      lines.push(o);
    } else if (!/\d/.test(r) && r.length < 45) head = r;
  });
  return { meta, lines };
}
