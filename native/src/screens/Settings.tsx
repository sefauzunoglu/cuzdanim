import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Btn, BtnRow, Card, Chips, Row, Section, Sheet } from '../ui/kit';
import { Screen } from '../ui/chrome';
import { copyBackup, pickBackupFile, shareBackup } from '../backup';

export const APP_VERSION = 'RN 0.1';

export function Settings() {
  const { S, update, replace, toast } = useApp(), nav = useNav(), t = useTheme();
  const [sheet, setSheet] = useState<'export' | 'import' | 'wipe' | null>(null);
  const [text, setText] = useState('');
  const last = S.meta?.lastBackup;
  const marked = () => update((s) => core.markBackup(s));
  return (
    <Screen title="Ayarlar" subtitle="Yedek ve veri">
      <Card>
        <Row first title="Yedek al" sub={`${last ? 'Son yedek: ' + core.dshort(core.pd(last)) : 'Henüz yedek alınmadı'} · Dosyalar / iCloud'a kaydet`} right="" rightSub={<Btn small title="Yedekle" onPress={() => setSheet('export')} />} />
        <Row title="Yedekten geri yükle" sub="Yedek dosyasını seç veya metni yapıştır" right="" rightSub={<Btn small title="Geri yükle" onPress={() => { setText(''); setSheet('import'); }} />} />
      </Card>
      <Section title="Simgeler">
        <Chips value={S.cfg.noIcons ? '0' : '1'} onChange={(v) => update((s) => { s.cfg.noIcons = v === '0'; })} options={[['1', 'Açık (harf ve kategori simgeleri)'], ['0', 'Kapalı (eski görünüm)']]} />
      </Section>
      <Section title="Tema">
        <Chips value={S.cfg.theme || ''} onChange={(v) => update((s) => { if (v) s.cfg.theme = v as 'light' | 'dark'; else delete s.cfg.theme; })} options={[['', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']]} />
      </Section>
      <Section title="Veri">
        <Card>
          <Row first title="Örnek veri yükle" sub="Uygulamayı denemek için. Mevcut verinin yerine geçer." right="" rightSub={<Btn small title="Yükle" onPress={() => { replace(core.demoData()); nav.go('home'); toast('Örnek veri yüklendi'); }} />} />
          <Row title="Her şeyi sil" sub="Bu cihazdaki tüm kayıtlar silinir" right="" rightSub={<Btn small kind="danger" title="Sil" onPress={() => setSheet('wipe')} />} />
        </Card>
      </Section>
      <Section title="Uygulama"><Card><Row first title={`Sürüm ${APP_VERSION}`} sub="React Native sürümü" /></Card></Section>
      <Text style={{ color: t.muted, fontSize: 12.5, margin: 8 }}>Verilerin yalnızca bu telefonda durur, hiçbir yere gönderilmez. Uygulama her kayıtta verini iki ayrı yerde saklar, ama telefon sıfırlanır veya uygulama silinirse ikisi de gider. Haftada bir yedek al; uygulama 7 günde bir hatırlatır.</Text>

      <Sheet visible={sheet === 'export'} title="Yedek al" onClose={() => setSheet(null)}>
        <Text style={{ color: t.muted, marginBottom: 12 }}>Yedeği Dosyalar uygulamasına veya iCloud Drive'a kaydet. Açılan menüden "Dosyalara Kaydet"i seç.</Text>
        <Btn kind="pri" title="Dosyaya kaydet / paylaş" onPress={async () => { const r = await shareBackup(S); if (r === 'ok') { setSheet(null); marked(); } else if (r === 'desteklenmiyor') toast('Paylaşım desteklenmiyor, metni kopyala'); }} />
        <View style={{ height: 8 }} />
        <Btn title="Metni kopyala (Notlar'a yapıştır)" onPress={async () => { await copyBackup(S); setSheet(null); marked(); }} />
      </Sheet>
      <Sheet visible={sheet === 'import'} title="Geri yükle" onClose={() => setSheet(null)}
        footer={<Btn kind="pri" full title="Geri yükle" onPress={() => {
          try { const o = JSON.parse(text); if (!core.isBackupLike(o)) throw 0; const s = core.migrate(o); s.meta = s.meta || {}; replace(s); setSheet(null); nav.go('home'); toast('Geri yüklendi'); }
          catch { toast('Önce dosya seç veya metni yapıştır'); }
        }} />}>
        <Btn title="Yedek dosyasını seç" onPress={async () => { try { const x = await pickBackupFile(); if (x) { setText(x); toast("Dosya okundu, Geri yükle'ye bas"); } } catch { toast('Dosya okunamadı'); } }} />
        <Text style={{ color: t.muted, fontSize: 12, marginVertical: 8 }}>veya yedek metnini yapıştır</Text>
        <TextInput value={text} onChangeText={setText} multiline placeholder="Yedek metni" placeholderTextColor={t.muted} style={{ minHeight: 120, borderRadius: 12, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, color: t.ink, padding: 10, fontSize: 16, textAlignVertical: 'top' }} />
        <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 8 }}>Mevcut verinin yerine geçer. Web uygulamasından aldığın yedek de çalışır.</Text>
      </Sheet>
      <Sheet visible={sheet === 'wipe'} title="Her şeyi sil" onClose={() => setSheet(null)}
        footer={<><Btn title="Vazgeç" onPress={() => setSheet(null)} /><Btn kind="danger" full title="Evet, sil" onPress={() => { replace(core.emptyData()); setSheet(null); nav.go('home'); }} /></>}>
        <Text style={{ color: t.ink }}>Tüm kartlar, harcamalar ve borçlar silinecek. Bu geri alınamaz. Yedek aldın mı?</Text>
      </Sheet>
    </Screen>
  );
}
