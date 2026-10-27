import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { today } from './core';
import type { State } from './core';

export const backupText = (S: State) => JSON.stringify(S);

/** Yedeği dosya olarak paylaşma menüsüne verir (Dosyalar / iCloud Drive'a kaydedilebilir). */
export async function shareBackup(S: State): Promise<'ok' | 'iptal' | 'desteklenmiyor'> {
  try {
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([backupText(S)], { type: 'application/json' }));
      a.download = `cuzdanim-yedek-${today()}.json`;
      a.click();
      return 'ok';
    }
    if (!(await Sharing.isAvailableAsync())) return 'desteklenmiyor';
    const f = new File(Paths.cache, `cuzdanim-yedek-${today()}.json`);
    if (f.exists) f.delete();
    f.create();
    f.write(backupText(S));
    await Sharing.shareAsync(f.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Cüzdanım yedek' });
    return 'ok';
  } catch (e: any) {
    return /cancel|dismiss/i.test(String(e?.message)) ? 'iptal' : 'desteklenmiyor';
  }
}

export async function copyBackup(S: State) { await Clipboard.setStringAsync(backupText(S)); }

/** Yedek dosyası seçtirir ve metnini döndürür. */
export async function pickBackupFile(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  if (Platform.OS === 'web') return await (a.file as any).text();
  return await new File(a.uri).text();
}
