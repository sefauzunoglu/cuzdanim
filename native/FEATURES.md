# Özellik kontrol listesi (PWA sürüm 14 → React Native)

Her madde çeviri sonunda tek tek doğrulanır. **Çekirdek** = hesaplama/işlem mantığı (`src/core`), **Ekran** = React Native arayüzü.
Durum: ✅ tamam · ⬜ yapılacak. Ekran ✅ = React Native'de yazıldı ve telefon boyutunda web çıktısında görsel olarak kontrol edildi; gerçek iPhone denemesi ayrı bir adım.

## Genel
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Alt sekmeler: Özet, Harcama, **+**, Kartlar, Borçlar; üstte "Daha fazla" | – | ✅ |
| Açık/koyu tema (sistem, açık, koyu) | – | ✅ |
| Örnek veri yükle, örnekleri sil banner'ı, her şeyi sil | ✅ | ✅ |
| Yedek: Dosyalar/iCloud'a kaydet, metni kopyala, geri yükle (dosya veya yapıştır), son yedek tarihi, 7 gün hatırlatması | ✅ (biçim) | ✅ |
| Veriyi iki yerde saklama ve eksilirse geri yükleme (aynı depoda iki anahtar) | – | ✅ |
| Simgeler açık/kapalı (baş harf daireleri, kategori simgeleri) | – | ✅ |
| Sürüm bilgisi | – | ✅ |

## Özet
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Toplam borç (kart + kredi/altın/diğer + kalan taksit) | ✅ ✅ |
| Nakit varlık, bu ay gelir ve gider | ✅ ✅ |
| Öneri motoru (ekstre günü, limit, boş para, taksit yükü, abonelik, araba tarihleri, altın, gecikme) | ✅ ✅ |
| Yaklaşan 14 gün: kart ekstresi, sabit gider, gelir, borç taksiti, altın günü; dokununca öde | ✅ | ✅ |
| Kart mini kartları (kalan limit, doluluk) | ✅ ✅ |
| Gelecek 6 ay taksit yükü grafiği | ✅ ✅ |

## Harcama
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Hızlı harcama ekleme: tutar, kategori, kaynak, taksit, tarih, not | ✅ ✅ |
| Son harcamalardan tek dokunuşla doldurma | – ✅ |
| Kart etkisi önizlemesi (ekstre ayı, kalan limit, geçmiş taksit ödenmiş sayılır) | ✅ ✅ |
| Araba kategorisi: araba, tür, kilometre | ✅ ✅ |
| Düzenleme ve silme | ✅ ✅ |
| Ay gezgini, kaynak filtresi, güne/karta/kategoriye göre gruplama, kategori çubukları | ✅ ✅ |
| Taksitli harcamanın aylara dağılımı (k/n. taksit) | ✅ ✅ |

## Kartlar
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Kart ekle/düzenle/sil, hızlı banka seçimi | ✅ ✅ |
| Limit, kesim ve son ödeme günü, takibe başlama tarihi, ödenmemiş son ekstre borcu | ✅ ✅ |
| Asgari oran otomatik (BDDK 100.000 ₺ eşiği) veya elle | ✅ ✅ |
| Aylık faiz otomatik (TCMB kademeleri) veya elle | ✅ ✅ |
| Güncel borç, kesilen ekstre, asgari, açık dönem, kalan taksit, sonraki ekstre tahmini | ✅ ✅ |
| "Ekstreyi nasıl ödersen": tamamı / asgari + faiz / asgari altı gecikme | ✅ ✅ |
| Devam eden taksit listesi (kaçıncı, kalan) | ✅ ✅ |
| Dönem kategorileri, ekstre dönemlerine göre hareketler, ödeme geçmişi | ✅ ✅ |
| Kart borcu öde (asgari/ekstre/tümü), hesaptan düşme | ✅ ✅ |

## Borçlar
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Kredi, şahsi, diğer borç: ekle, düzenle, sil, ödeme | ✅ ✅ |
| Altın borcu: gram/çeyrek/yarım/tam, ödeme cinsinden | ✅ ✅ |
| Altın fiyatları: canlı çekme (açılışta 30 dk), elle girme, tahmini katsayılar | ✅ ✅ |
| Toplam borca altın günü kalanı (alacak alındıysa) | ✅ ✅ |
| Son borç ödemeleri | ✅ ✅ |

## Daha fazla
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Gelir ve transfer: tek seferlik gelir, düzenli gelir ("Geldi"), hesaplar arası/dış transfer | ✅ | ✅ |
| Sabit giderler: kira, fatura, abonelik, diğer; hızlı seçim adları | ✅ | ✅ |
| Öde, geri al, otomatik işle, pasif/iptal | ✅ | ✅ |
| Araba: ekleme, muayene/sigorta/kasko tarihleri, aylık ve yıllık toplam, türe göre, km başına maliyet, karttan ödenen | ✅ | ✅ |
| Altın / para günü: ay ay kutular, sıra, alacak, ödeme, geri alma, "Aldım", borç gibi kalan | ✅ | ✅ |
| Borçtan çıkış senaryosu: ekstra ve tek seferlik ödeme, çığ/kartopu, grafik, boş para tahmini | ✅ | ✅ |
| Hesaplar: bakiye, nakit akışı ("para nereye gitti") | ✅ | ✅ |

## Notlar
- Eski veriyi taşıma: PWA'daki yedek metni yeni uygulamaya geri yüklenebilmeli (`migrate` bunu karşılar).
- Çekirdeğin doğruluğu: `npm test` (19 birim testi) ve `tests/parity.ts` (eski uygulamayla 5 farklı tarihte birebir karşılaştırma).

## Gerçek iPhone'da denenmesi gerekenler (web çıktısında doğrulanamayanlar)
- Tarih seçici (iOS yerel seçici), klavye açılınca formların kayması, alt çubuğun ve üst başlığın güvenli alanları
- Yedek: Dosyalar/iCloud'a kaydet menüsü, yedek dosyası seçici, metni kopyalama
- Canlı altın fiyatı çekme (servis erişimi) ve açılışta otomatik yenileme
- Uygulama açılışında sabit giderlerin otomatik işlenmesi
- Koyu tema ve sistem teması geçişi
- Büyük veride (yüzlerce harcama) kaydırma ve açılış hızı
