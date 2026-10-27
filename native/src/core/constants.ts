export const CATS = ['Market', 'Yemek', 'Ulaşım', 'Fatura', 'Sağlık', 'Giyim', 'Eğlence', 'Ev', 'Eğitim', 'Araba', 'Kişisel', 'Diğer'];
export const CARSUB = ['Yakıt', 'Bakım', 'Sigorta', 'Kasko', 'Muayene', 'Lastik', 'Vergi (MTV)', 'Otopark / Otoyol', 'Diğer'];
/** Kategori → simge adı */
export const CATICO: Record<string, string> = {
  Market: 'cart', Yemek: 'food', Ulaşım: 'bus', Fatura: 'bolt', Sağlık: 'heart', Giyim: 'shirt', Eğlence: 'film',
  Ev: 'home', Eğitim: 'book', Araba: 'car', Kişisel: 'user', 'Altın günü': 'debt', Diğer: 'dots',
};
export const BANKS = ['Garanti BBVA', 'Akbank', 'İş Bankası', 'Yapı Kredi', 'Ziraat', 'QNB', 'Halkbank', 'VakıfBank', 'Denizbank', 'Enpara'];
export const INST_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 24];
/** Kategori renk sırası (0-9 arası tema paletinden). */
export const catIndex = (c: string) => { const i = CATS.indexOf(c); return (i < 0 ? 11 : i) % 10; };
