# Özellik kontrol listesi (PWA sürüm 51 ile eşit → React Native)

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

## Bankadan güncelle (PWA sürüm 51 ile eşit)
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Tek giriş: kart ayrıntısında **Bankadan güncelle**; Excel (.xls/.xlsx/.csv) veya Garanti ekstre PDF'i seç, büyük "Dosya seç" alanı | ✅ | ✅ (Excel web çıktısında denendi; PDF yalnızca iPhone'da) |
| Dönem içi dosyası: bu ayın harcamaları ve taksit parçaları; aynı dönemi yeniden yükleyince eski satırlar değiştirilir, çift sayım yok (`src/core/sync.ts`) | ✅ | ✅ |
| Kesilmiş ekstre: satırlar geçmiş kaydı; borç "Son ekstreden kalan borç" kutusuyla sabitlenir, boşsa uyarı | ✅ | ✅ |
| Garanti ekstre PDF'i: dönem borcu, asgari, kesim/son ödeme, ana ve sanal kart satırları, taksitler (`garantiPdf.ts`); dönem borcu kutuya otomatik yazılır | ✅ | ⬜ iPhone'da denenecek (pdf.js internetten yüklenir, görünmez WebView) |
| PDF'teki kesim tarihiyle taksitler bankanın dönemine oturur; mevcut kayıtlar yeniden yüklemede düzelir (`Tx.sd`) | ✅ | ✅ |
| Taksit eşleştirme: banka kuruş farkı ve şehir eki toleransı, açıklama kökü kısmi eşleşme | ✅ | ✅ |
| Ana/sanal kart satırlarını son 4 haneyle eşleme, sanal kart seçimi | ✅ | ✅ |
| Bankadaki kullanılabilir limitle isteğe bağlı kontrol mesajı | ✅ | ✅ |
| Kart formu sadeleşti: takip başlangıcı ve kalan borç soruları kalktı; son 4 hane ve sanal kart ekleme | – | ✅ |

## Kart ayrıntısı ve borç mantığı (PWA sürüm 51 ile eşit)
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Devreden borç: son ödeme geçince "gecikti" yok, asgari yok, faiz işliyor; sonraki ekstre = devreden + dönem içi + tahmini faiz | ✅ | ✅ |
| "Ekstreyi nasıl ödersen?": tamamı / sadece asgari (sonraki ekstre ve asgarisi) / asgari altı | ✅ | ✅ |
| Dört sekme: Özet, Dönem içi, Taksitler, Önceki; her listede kategori düğmeleri ve filtre | – | ✅ |
| Özet ve Yaklaşan'da devreden borç / tahmini ekstre metinleri | ✅ | ✅ |
| Harcamalar: ana kart filtresi sanalı içermez, sanal kart ayrı seçenek; harcama formunda sanal kart kaynağı | ✅ | ✅ |

## Toplu kategorileme (PWA sürüm 51 ile eşit)
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Kategorisi belirsiz işlemleri işyerine göre grupla, işaretle, kategori seç | ✅ | ✅ |
| Herhangi bir kategorideki işyerlerini başka kategoriye taşı | ✅ | ✅ |
| Yeni kategori: sadece ad, renk otomatik | ✅ | ✅ |
| "Bu işyerlerini hep bu kategoriye koy": kural sonraki aktarmalarda uygulanır | ✅ | ✅ |

## Sabit giderler ve araba (PWA sürüm 51 ile eşit)
| Özellik | Çekirdek | Ekran |
|---|---|---|
| Sabit gider ekle: kart harcamalarından seç (öneriler, arama, otomatik doldurma, o ayın gideri ödendi sayılır) veya elle | ✅ | ✅ |
| "Bankada nasıl yazar?": ekstrede bu yazıyı görünce o ay ödendi sayılır, otomatik kayıt gerçek kayıtla değişir | ✅ | ✅ |
| Bu ay yenilenmedi / atla, atlamayı geri al | ✅ | ✅ |
| Durdurulmuş gideri yeniden açınca geçmiş aylar işlenmez | ✅ | ✅ |
| Araba: bankadan aktarılan araba harcamalarını arabaya bağla; tek araba varsa aktarmada otomatik | ✅ | ✅ |

## Notlar
- Eski veriyi taşıma: PWA'daki yedek metni yeni uygulamaya geri yüklenebilmeli (`migrate` bunu karşılar).
- Çekirdeğin doğruluğu: `npm test` (çekirdek, ekstre, Excel ve bankadan güncelle testleri; sahte veriyle) ve `tests/parity.ts` (PWA'nın son sürümüyle 5 farklı tarihte birebir karşılaştırma, ayrıca PDF ayrıştırma ve işyeri yardımcıları).

## Gerçek iPhone'da denenmesi gerekenler (web çıktısında doğrulanamayanlar)
- **PDF okuma**: Bankadan güncelle → PDF seç. `src/PdfText.tsx` görünmez bir WebView'de pdf.js (cdnjs) çalıştırır; internet gerekir, 40 sn içinde cevap gelmezse Excel'e yönlendirir. Çalışmazsa Excel yolu eşdeğerdir (kesilmiş ekstre için Son ekstreden kalan borç kutusunu elle doldur).
- Dosya seçici (Excel/PDF) iOS Dosyalar penceresi
- Tarih seçici (iOS yerel seçici), klavye açılınca formların kayması, alt çubuğun ve üst başlığın güvenli alanları
- Yedek: Dosyalar/iCloud'a kaydet menüsü, yedek dosyası seçici, metni kopyalama
- Canlı altın fiyatı çekme (servis erişimi) ve açılışta otomatik yenileme
- Uygulama açılışında sabit giderlerin otomatik işlenmesi
- Koyu tema ve sistem teması geçişi
- Büyük veride (yüzlerce harcama) kaydırma ve açılış hızı
