import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as core from './core';
import { useApp } from './store';
import { useTheme } from './theme';
import { Btn, Chips, Field, Label, Note, PickButton, Sheet } from './ui/kit';
import { PdfText } from './PdfText';
import { pickSyncFile, readExcel, readPdfText } from './syncFile';
import type { PickedFile, ReadResult } from './syncFile';

/** Bankadan güncelle: ekstre PDF'i veya Dönem içi / Ekstre Excel'i; aynı dönemi yeniden yüklemek çift saymaz. */
export function SyncSheet({ cardId, onClose }: { cardId: string | null; onClose: () => void }) {
  const { S, update, toast } = useApp(), t = useTheme();
  const card = cardId ? core.find(S.cards, cardId) : undefined;
  const [file, setFile] = useState<PickedFile | null>(null), [pdfBusy, setPdfBusy] = useState(false);
  const [res, setRes] = useState<ReadResult | null>(null);
  const [sel, setSel] = useState(''), [kind, setKind] = useState<core.SyncKind>('open'), [stmt, setStmt] = useState(''), [avail, setAvail] = useState('');
  useEffect(() => { if (cardId) { setFile(null); setRes(null); setPdfBusy(false); setSel(cardId); setKind('open'); setStmt(''); setAvail(''); } }, [cardId]);
  if (!card) return null;

  const apply = (r: ReadResult) => {
    setRes(r); setKind(r.kind);
    const m = core.findByLast4(S, r.last4);
    if (m && m.card.id === card.id) setSel(m.vid ? card.id + ':vc:' + m.vid : card.id);
    if (r.meta?.debt) setStmt(r.meta.debt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };
  const choose = async () => {
    try {
      const f = await pickSyncFile();
      if (!f) return;
      setFile(f); setRes(null);
      if (f.ext === 'pdf') { setPdfBusy(true); return; }
      if (f.ext === 'other') { toast('Excel (.xls, .xlsx, .csv) veya PDF dosyası seç'); return; }
      const r = readExcel(f.bytes);
      if (!r) { toast('Dosyada harcama satırı bulunamadı'); return; }
      apply(r);
    } catch { toast('Dosya okunamadı'); }
  };

  const [cid, vid0] = sel.split(':vc:'), vid = vid0 || '';
  const opts: [string, string][] = [[card.id, `${card.name} (ana kart)${card.last4 ? ' •••• ' + card.last4 : ''}`], ...(card.vcards || []).map((v) => [card.id + ':vc:' + v.id, `${v.name} (sanal kart)${v.last4 ? ' •••• ' + v.last4 : ''}`] as [string, string])];
  const plan = res ? core.syncPlan(S, card, vid, kind, res.lines, res.meta) : null;
  const total = res ? core.sum(res.lines.filter((l) => l.kind === 'charge'), (l) => l.amt) : 0;
  const stmtN = core.num(stmt);
  const nm = vid ? `${(card.vcards || []).find((v) => v.id === vid)?.name} (sanal kart)` : `${card.name} (ana kart)`;

  const save = () => {
    if (!res) { toast('Önce dosyayı seç'); return; }
    const err = core.syncCheck(card, vid, kind, stmtN);
    if (err) { toast(err); return; }
    let msg = '';
    update((s) => {
      const c = core.find(s.cards, card.id)!;
      const r = core.syncApply(s, c, vid, kind, res.lines, res.meta, { stmt: vid ? 0 : stmtN });
      msg = r.msg;
      const av = core.num(avail);
      if (av !== 0 && c.limit > 0) msg += `. Kalan limit: uygulama ${core.fmtI(r.avail)}, banka ${core.fmtI(av)}`;
    });
    onClose(); toast(msg);
  };

  return (
    <Sheet visible title={card.name + ' · bankadan güncelle'} onClose={onClose}
      footer={<Btn kind="pri" full title="Güncelle" onPress={save} />}>
      <Note>Bankanın internet şubesinden indirdiğin <Text style={{ fontWeight: '800' }}>ekstre PDF'i</Text> veya <Text style={{ fontWeight: '800' }}>Dönem içi / Ekstre Excel'i</Text> yeterli. Dosya telefondan çıkmaz. Aynı dönemi tekrar yüklersen çift sayılmaz.</Note>
      <PickButton title={file ? 'Dosya seçildi' : 'Dosya seç'} sub={file ? file.name : 'PDF veya Excel (.xls, .xlsx)'} done={!!file} onPress={choose} />
      {pdfBusy && file ? <>
        <Text style={{ color: t.muted, marginBottom: 8 }}>PDF okunuyor…</Text>
        <PdfText bytes={file.bytes}
          onText={(tx) => { setPdfBusy(false); const r = readPdfText(tx); if (!r) { toast('PDF\'ten harcama satırı okunamadı. Excel dosyasını dene'); return; } apply(r); }}
          onError={(m) => { setPdfBusy(false); toast(m); }} />
      </> : null}
      {res && plan ? (
        <>
          {res.meta ? <Note>PDF: dönem borcu <Text style={{ fontWeight: '800' }}>{core.fmt(res.meta.debt || 0)}</Text> · asgari {core.fmt(res.meta.min || 0)}{res.meta.cut ? ' · kesim ' + core.dshort(core.pd(res.meta.cut)) : ''}{res.meta.due ? ' · son ödeme ' + core.dshort(core.pd(res.meta.due)) : ''}. Kutuya dönem borcu yazıldı; ekstre kesildikten sonra ödeme yaptıysan düşerek düzelt.</Note> : null}
          <View style={{ backgroundColor: t.accentSoft, borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: t.ink, fontSize: 13.5 }}>
              <Text style={{ fontWeight: '800' }}>{res.lines.length} satır okundu</Text> ({core.fmt(total)}). Aktarılacak kart: <Text style={{ fontWeight: '800' }}>{nm}</Text>.{'\n'}
              Eklenecek: <Text style={{ fontWeight: '800' }}>{plan.add.length}</Text> satır{plan.skip.length ? ` · zaten kayıtlı olduğu için atlanacak: ${plan.skip.length}` : ''}{plan.drop.length ? ` · bu dönemden önce aktarılan ${plan.drop.length} satır yenisiyle değiştirilecek` : ''}.
            </Text>
          </View>
          {kind === 'last' && !vid && !res.meta ? <Note tone="warn">Kesilmiş ekstre: aşağıdaki "Son ekstreden kalan borç" kutusunu doldurman gerekiyor. Excel'de ekstre borcu yazmaz; devreden borç ve faiz bankadan gelir.</Note> : null}
          <View style={{ marginBottom: 12 }}><Label>Hangi karta ait? (ana kart ve sanal kartın dosyaları ayrıdır)</Label><Chips value={sel} onChange={setSel} options={opts} /></View>
          <View style={{ marginBottom: 12 }}><Label>Dosya ne?</Label><Chips value={kind} onChange={setKind} options={[['open', 'Dönem içi (bu ay)'], ['last', 'Kesilmiş ekstre']]} /></View>
          {!vid ? <>
            <Field label="Son ekstreden kalan borç (₺)" value={stmt} onChange={setStmt} num />
            <Text style={{ color: t.muted, fontSize: 12.5, marginTop: -6, marginBottom: 12 }}>Bankada ana kartın Dönem İçi sekmesindeki "Son Ekstreden Kalan Borç". PDF'te kendiliğinden dolar.</Text>
          </> : null}
          <Field label="Bankadaki kullanılabilir limit (₺, isteğe bağlı kontrol)" value={avail} onChange={setAvail} num />
        </>
      ) : null}
    </Sheet>
  );
}
