/**
 * Kredi kartı ekstresi metninden harcama satırlarını ve ekstre özetini ayıklar.
 * Girdi: PDF'ten çıkarılmış veya yapıştırılmış metin (satır satır).
 * Hiçbir şeyi kaydetmez; sonuç kullanıcıya gösterilip onaylanır.
 */

export interface StmtLine {
  date: string;            // YYYY-AA-GG
  desc: string;
  amt: number;             // her zaman pozitif
  kind: 'charge' | 'payment';
  inst?: { k: number; n: number };
  multi?: boolean;         // satırda birden fazla tutar bulundu (ilki alındı)
  cat: string;
  sub?: string;
}
export interface StmtSummary { cutoff?: string; due?: string; total?: number; min?: number; limit?: number }

/** Türkçe harfleri sadeleştirip büyük harfe çevirir (etiket eşleştirme için). */
export const trUp = (s: string) => s.replace(/İ/g, 'I').replace(/ı/g, 'I').toLocaleUpperCase('tr-TR')
  .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');

const AMOUNT = /([+\-−–]?\s?\d{1,3}(?:\.\d{3})+,\d{2}|[+\-−–]?\s?\d+,\d{2})(\s*[-−–])?(?:\s*(?:TL|₺))?/g;
const DATE_START = /^\s*(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/;
const DATE_ANY = /(\d{1,2})[./](\d{1,2})[./](\d{2,4})/;

const iso = (d: string, m: string, y: string) => {
  let yy = +y; if (yy < 100) yy += 2000;
  const mm = +m, dd = +d;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};
const toNum = (s: string) => parseFloat(s.replace(/[+\-−–\s]/g, '').replace(/\./g, '').replace(',', '.'));
const isNeg = (a: string, trail?: string) => /^[\-−–]/.test(a.trim()) || !!(trail && /[-−–]/.test(trail));

const RULES: [RegExp, string, string?][] = [
  [/MIGROS|BIM |^BIM|A101|SOK MARKET|CARREFOUR|MARKET|MANAV|KASAP|FILE MARKET|HAKMAR/, 'Market'],
  [/SHELL|OPET|PETROL OFISI|\bBP\b|TOTAL|AKARYAKIT|ISTASYON|LUKOIL|ALPET|AYTEMIZ/, 'Araba', 'Yakıt'],
  [/OTOYOL|HGS|OGS|KGS|OTOPARK|ISPARK/, 'Araba', 'Otopark / Otoyol'],
  [/NETFLIX|SPOTIFY|YOUTUBE|DISNEY|EXXEN|BLUTV|GAIN|AMAZON PRIME|APPLE.COM|ICLOUD|GOOGLE|STEAM|PLAYSTATION|SINEMA|CINEMAXIMUM|BILET/, 'Eğlence'],
  [/YEMEKSEPETI|GETIR|TRENDYOL YEMEK|RESTORAN|RESTAURANT|CAFE|KAFE|LOKANTA|STARBUCKS|BURGER|PIDE|KEBAP|PASTANE|FIRIN|DONER|SIMIT|COFFEE|KAHVE/, 'Yemek'],
  [/ECZANE|HASTANE|KLINIK|SAGLIK|DOKTOR|LABORATUVAR|DIS /, 'Sağlık'],
  [/IETT|METRO|MARMARAY|UBER|BITAXI|\bTAKSI\b|ISTANBULKART|THY|PEGASUS|AJET|OTOBUS|FLIGHT/, 'Ulaşım'],
  [/ELEKTRIK|DOGALGAZ|IGDAS|ENERJISA|TURKCELL|VODAFONE|TURK TELEKOM|TTNET|SUPERONLINE|SU IDARESI|ISKI|FATURA/, 'Fatura'],
  [/ZARA|LC WAIKIKI|LCW|DEFACTO|H&M|KOTON|MAVI|BOYNER|FLO |DECATHLON|TEKSTIL|GIYIM|MANGO|PULL.?BEAR|BERSHKA/, 'Giyim'],
  [/IKEA|KOCTAS|BAUHAUS|TEKZEN|MOBILYA|EV TEKSTIL|ENGLISH HOME|MADAME COCO/, 'Ev'],
  [/KITAP|KIRTASIYE|OKUL|KURS|UNIVERSITE|DERS|UDEMY/, 'Eğitim'],
  [/KUAFOR|BERBER|GUZELLIK|SEPHORA|GRATIS|WATSONS|ROSSMANN/, 'Kişisel'],
];
export function guessCategory(desc: string): { cat: string; sub?: string } {
  const u = trUp(desc);
  for (const [re, cat, sub] of RULES) if (re.test(u)) return sub ? { cat, sub } : { cat };
  return { cat: 'Diğer' };
}

const PAY = /(^|\s)(ODEME|TAHSILAT|IADE|IPTAL|DEKONT)(\s|$)|ODEMENIZ|ODEME ALINDI|KART ODEMESI/;
const INST1 = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\.?\s*TAKS[IİıÌ]?T?/i;
const INST2 = /TAKS[IİıÌ]T\s*:?\s*(\d{1,2})\s*\/\s*(\d{1,2})/i;
const instOf = (desc: string) => {
  const m = INST1.exec(trUp(desc)) || INST2.exec(trUp(desc));
  if (!m) return undefined;
  const k = +m[1], n = +m[2];
  return k >= 1 && n >= 2 && k <= n && n <= 60 ? { k, n } : undefined;
};

export function parseStatement(text: string): { lines: StmtLine[]; summary: StmtSummary } {
  const rows = text.split(/\r?\n/).map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const lines: StmtLine[] = [];
  const summary: StmtSummary = {};

  // Özet alanları
  rows.forEach((r) => {
    const u = trUp(r), d = DATE_ANY.exec(r), a = [...r.matchAll(AMOUNT)].map((m) => toNum(m[1]));
    if (/HESAP KESIM TARIH/.test(u) && d) summary.cutoff = iso(d[1], d[2], d[3]);
    else if (/SON ODEME TARIH/.test(u) && d) summary.due = iso(d[1], d[2], d[3]);
    else if (/(DONEM BORCU|TOPLAM BORC|DONEM BORCUNUZ|TOPLAM DONEM BORCU)/.test(u) && a.length) summary.total = a[a.length - 1];
    else if (/ASGARI (ODEME|TUTAR)/.test(u) && a.length) summary.min = a[a.length - 1];
    else if (/(KART LIMIT|TOPLAM LIMIT|KART LIMIT)/.test(u) && a.length) summary.limit = a[0];
  });

  // Hareket satırları: tarihle başlar, tutarla biter; açıklama birden çok satıra yayılmış olabilir
  for (let i = 0; i < rows.length; i++) {
    const dm = DATE_START.exec(rows[i]);
    if (!dm) continue;
    const date = iso(dm[1], dm[2], dm[3]);
    if (!date) continue;
    let joined = rows[i].slice(dm[0].length).trim();
    let used = 0;
    while (![...joined.matchAll(AMOUNT)].length && used < 3 && i + 1 + used < rows.length && !DATE_START.test(rows[i + 1 + used])) { joined += ' ' + rows[i + 1 + used]; used++; }
    const ams = [...joined.matchAll(AMOUNT)];
    if (!ams.length) continue;
    const first = ams[0];
    const amt = toNum(first[1]);
    if (!(amt > 0)) continue;
    // Başlıklar ve özet satırlarını ele ("Hesap kesim tarihi 20.10.2026 ..." gibi satırlar tarihle başlamaz, yine de güvence)
    const desc = joined.slice(0, first.index).replace(/\s+/g, ' ').trim() || joined.replace(AMOUNT, '').replace(/\s+/g, ' ').trim();
    if (!desc) continue;
    if (/TARIH|DONEM BORC|ASGARI|LIMIT/.test(trUp(desc)) && !instOf(desc)) continue;
    const neg = isNeg(first[1], first[2]);
    const payment = neg || PAY.test(trUp(desc));
    const g = guessCategory(desc);
    lines.push({ date, desc, amt, kind: payment ? 'payment' : 'charge', inst: instOf(desc), multi: ams.length > 1 || undefined, cat: g.cat, sub: g.sub });
    i += used;
  }
  return { lines, summary };
}
