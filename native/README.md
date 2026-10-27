# Cüzdanım, React Native (çalışma dalı)

Bu dal, web uygulamasının (PWA) React Native sürümünü içerir. Yayındaki PWA `main` dalındadır.

- `src/core`: ekrandan bağımsız hesaplama ve işlem mantığı (TypeScript)
- `tests`: birim testleri ve eski uygulamayla karşılaştırma testi
- `FEATURES.md`: bugüne kadarki her özelliğin kontrol listesi

```
cd native
npm install
npm test            # birim testleri
npm run typecheck   # tür denetimi
PWA_HTML=/yol/index.html npx tsx tests/parity.ts   # eski uygulamayla karşılaştırma (Playwright gerekir)
```
