import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import * as core from './core';

export interface PickedFile { name: string; ext: 'xls' | 'xlsx' | 'csv' | 'pdf' | 'other'; bytes: Uint8Array }

/** Excel veya PDF dosyası seçtirir. Dosya cihazdan çıkmaz. */
export async function pickSyncFile(): Promise<PickedFile | null> {
  const r = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', '*/*'],
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const buf: ArrayBuffer = Platform.OS === 'web' ? await (a.file as any).arrayBuffer() : await new File(a.uri).arrayBuffer();
  const m = /\.([a-z0-9]+)$/i.exec(a.name || '');
  const e = m ? m[1].toLowerCase() : '';
  const ext = (['xls', 'xlsx', 'csv', 'pdf'] as const).find((x) => x === e) || 'other';
  return { name: a.name || 'dosya', ext, bytes: new Uint8Array(buf) };
}

export interface ReadResult { lines: core.SyncLine[]; kind: core.SyncKind; meta: core.PdfMeta | null; last4?: string }

/** Excel dosyasını satırlara çevirir (kart bölümü, tür ve son 4 hane dahil). */
export function readExcel(bytes: Uint8Array): ReadResult | null {
  const wb = XLSX.read(bytes, { type: 'array', cellDates: true });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
  const secs = core.parseTable(rows as any);
  const lines = ([] as core.SyncLine[]).concat(...secs.map((x) => x.lines));
  if (!lines.length) return null;
  return { lines, kind: core.detectKind(rows), meta: null, last4: (secs.find((x) => x.last4) || {}).last4 };
}

/** PDF'ten çıkarılmış metni özet ve satırlara çevirir. */
export function readPdfText(text: string): ReadResult | null {
  const r = core.parseGarantiPdf(text);
  if (!r.lines.length) return null;
  return { lines: r.lines, kind: 'last', meta: r.meta, last4: r.meta.last4 };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function toBase64(u: Uint8Array): string {
  let o = '';
  for (let i = 0; i < u.length; i += 3) {
    const a = u[i], b = u[i + 1], c = u[i + 2], n = (a << 16) | ((b || 0) << 8) | (c || 0);
    o += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < u.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < u.length ? B64[n & 63] : '=');
  }
  return o;
}
