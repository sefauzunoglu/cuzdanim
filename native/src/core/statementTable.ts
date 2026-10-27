/**
 * Banka ekstresinin Excel/CSV tablosunu (satırlar × hücreler) okur.
 * Tek dosyada birden fazla kartın bölümü olabilir; her bölüm "NNNN **** **** NNNN Numaralı Kart" başlığıyla başlar.
 * Hiçbir şeyi kaydetmez; sonuç kullanıcıya gösterilip onaylanır.
 */
import { guessCategory, instOf, trUp } from './statement';
import type { StmtLine } from './statement';

export interface StmtSection {
  last4: string;
  title: string;
  lines: StmtLine[];
  /** Okunmayan satırlar ve nedeni (ör. bonus hareketleri) */
  skipped: { desc: string; reason: string }[];
}

type Cell = unknown;

const str = (c: Cell): string => (c == null ? '' : c instanceof Date ? '' : String(c).trim());

const pad = (n: number) => String(n).padStart(2, '0');
/** gg/aa/yyyy, gg.aa.yyyy, yyyy-aa-gg, Date nesnesi veya Excel seri numarası → YYYY-AA-GG */
export function toIsoDate(c: Cell): string {
  if (c instanceof Date) {
    // Excel kütüphaneleri yerel gece yarısından birkaç saniye sapabilir; öğlene taşıyıp gün alırız
    const d = new Date(c.getTime() + 12 * 3600 * 1000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (typeof c === 'number' && c > 30000 && c < 80000) {
    const d = new Date(Math.round((c - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = str(c);
  let m = /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/.exec(s);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31 ? `${y}-${pad(+m[2])}-${pad(+m[1])}` : ''; }
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** "-1.182,50", "4.091,63", "+105,00", 1182.5 → sayı (işaretli). Boş veya sayı değilse null. */
export function toAmount(c: Cell): number | null {
  if (typeof c === 'number') return isFinite(c) ? c : null;
  let s = str(c).replace(/[₺\sTL]|TL/gi, '');
  if (!s) return null;
  const neg = /^[-−–]/.test(s) || /[-−–]$/.test(s);
  s = s.replace(/[+\-−–]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : null;
}

/** Garanti "Etiket" sütunundan uygulama kategorisine. Tanınmayan etiket null döner. */
const ETIKET: [RegExp, string, string?][] = [
  [/^MARKET/, 'Market'], [/YEME|ICME|RESTORAN|KAFE/, 'Yemek'], [/AKARYAKIT|PETROL/, 'Araba', 'Yakıt'],
  [/GIYIM|AKSESUAR/, 'Giyim'], [/KURUM|FATURA/, 'Fatura'], [/EGLENCE|HOBI|SINEMA/, 'Eğlence'],
  [/SAGLIK|BAKIM|ECZANE/, 'Sağlık'], [/KISISEL/, 'Kişisel'], [/EV|DEKORASYON|MOBILYA/, 'Ev'],
  [/EGITIM|OKUL|KITAP/, 'Eğitim'], [/ULASIM|TAKSI|OTOYOL/, 'Ulaşım'],
];
export function categoryFromLabel(label: string): { cat: string; sub?: string } | null {
  const u = trUp(label);
  if (!u) return null;
  for (const [re, cat, sub] of ETIKET) if (re.test(u)) return sub ? { cat, sub } : { cat };
  return null;
}

const HEADER_DATE = /^TARIH/, HEADER_DESC = /^(ISLEM|ACIKLAMA|ISLEM ACIKLAMASI)/, HEADER_AMT = /^TUTAR/, HEADER_LABEL = /^ETIKET/, HEADER_BONUS = /^BONUS|^PARACIK|^MAXIPUAN|^PUAN/;
const CARD_TITLE = /(\d{4})\s*[\*xX•\s]{4,}\s*[\*xX•\s]*\s*(\d{4})\s*NUMARALI KART|(\d{4})\s*\*{2,4}\s*\*{2,4}\s*(\d{4})/;

interface Cols { date: number; desc: number; amt: number; label: number; bonus: number }

function detectHeader(row: Cell[]): Cols | null {
  const cells = row.map((c) => trUp(str(c)));
  const date = cells.findIndex((c) => HEADER_DATE.test(c));
  const desc = cells.findIndex((c) => HEADER_DESC.test(c));
  const amt = cells.findIndex((c) => HEADER_AMT.test(c));
  if (date < 0 || desc < 0 || amt < 0) return null;
  return { date, desc, amt, label: cells.findIndex((c) => HEADER_LABEL.test(c)), bonus: cells.findIndex((c) => HEADER_BONUS.test(c)) };
}

/** Tablonun satırlarını bölümlere ayırıp harcama ve ödeme satırlarını çıkarır. */
export function parseTable(rows: Cell[][]): StmtSection[] {
  const sections: StmtSection[] = [];
  let cur: StmtSection | null = null;
  let cols: Cols | null = null;
  const open = (title: string, last4: string) => { cur = { last4, title, lines: [], skipped: [] }; sections.push(cur); cols = null; };

  for (const row of rows) {
    const joined = row.map(str).filter(Boolean).join(' ');
    if (!joined) continue;
    const hdr = detectHeader(row);
    if (hdr) { if (!cur) open('', ''); cols = hdr; continue; }
    const tm = CARD_TITLE.exec(trUp(joined).replace(/\s+/g, ' ')) || CARD_TITLE.exec(joined);
    if (tm && row.filter((c) => str(c)).length <= 2 && !toIsoDate(row[0])) {
      const last4 = tm[2] || tm[4] || '';
      open(joined, last4);
      continue;
    }
    if (!cols || !cur) continue;
    const date = toIsoDate(row[cols.date]);
    if (!date) continue;
    const desc = str(row[cols.desc]).replace(/\s+/g, ' ').trim();
    const amount = toAmount(row[cols.amt]);
    if (amount == null || amount === 0) {
      // Tutarı olmayan satır: bonus hareketi (borca etki etmez)
      (cur as StmtSection).skipped.push({ desc, reason: 'Tutar yok (bonus hareketi)' });
      continue;
    }
    const label = cols.label >= 0 ? str(row[cols.label]) : '';
    const payment = amount > 0 || /KART ODEMESI/.test(trUp(label));
    let cat = 'Diğer', sub: string | undefined;
    const fromLabel = categoryFromLabel(label), fromDesc = guessCategory(desc);
    if (fromLabel) { cat = fromLabel.cat; sub = fromLabel.sub; }
    else if (fromDesc.cat !== 'Diğer') { cat = fromDesc.cat; sub = fromDesc.sub; }
    (cur as StmtSection).lines.push({ date, desc, amt: Math.abs(amount), kind: payment ? 'payment' : 'charge', inst: instOf(desc), cat, sub });
  }
  return sections.filter((s) => s.lines.length || s.skipped.length);
}
