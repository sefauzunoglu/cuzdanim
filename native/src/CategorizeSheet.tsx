import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as core from './core';
import { useApp } from './store';
import { useTheme } from './theme';
import { Btn, CheckRow, Chips, Field, Label, Note, Sheet } from './ui/kit';

export interface CatReq { cardId: string; scope: 'cur' | 'prev'; cat: string }

/** Belirli bir kategorideki işlemleri işyerine göre gruplayıp başka bir kategoriye taşır (isteğe bağlı kalıcı kural). */
export function CategorizeSheet({ req, onClose }: { req: CatReq | null; onClose: () => void }) {
  const { S, update, toast } = useApp(), t = useTheme();
  const [sel, setSel] = useState<Set<string>>(new Set()), [cat, setCat] = useState(''), [nn, setNn] = useState(''), [rule, setRule] = useState('1');
  useEffect(() => { if (req) { setSel(new Set()); setCat(''); setNn(''); setRule('1'); } }, [req]);
  if (!req) return null;
  const gs = core.merchantGroups(S, req.cardId, req.scope, req.cat);
  const toggle = (k: string) => setSel((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const save = () => {
    const keys = [...sel];
    if (!keys.length) { toast('Önce işyerlerini işaretle'); return; }
    if (!nn.trim() && !cat) { toast('Bir kategori seç veya yeni ad yaz'); return; }
    let msg = '';
    update((s) => {
      const to = nn.trim() ? core.addCategory(s, nn) : cat;
      const n = core.moveCategory(s, req.cardId, req.cat, to, keys, rule === '1');
      msg = `${n} işlem ${to} kategorisine taşındı`;
    });
    onClose(); toast(msg);
  };
  return (
    <Sheet visible title={req.cat === 'Diğer' ? 'Kategorisi belirsiz işlemler' : req.cat + ' işlemlerini taşı'} onClose={onClose} footer={<Btn kind="pri" full title="Kategorile" onPress={save} />}>
      <Note>Önce kategoriyi seç (veya yeni ad yaz), sonra işyerlerini işaretle. Aynı işyerinin diğer dönemlerdeki işlemleri de taşınır.</Note>
      <View style={{ marginBottom: 12 }}><Label>1. Hangi kategori?</Label>
        <Chips scroll value={cat} onChange={(v) => { setCat(v); setNn(''); }} options={core.CATS.filter((n) => n !== 'Diğer' && n !== req.cat).map((n) => [n, n] as [string, string])} /></View>
      <Field label="veya yeni kategori adı" value={nn} onChange={(v) => { setNn(v); if (v) setCat(''); }} placeholder="örn. Kuruyemiş" />
      <View style={{ marginBottom: 12 }}><Label>Bu işyerlerini hep bu kategoriye koy (sonraki aktarmalarda otomatik uygulanır)</Label>
        <Chips value={rule} onChange={setRule} options={[['1', 'Evet'], ['0', 'Hayır']]} /></View>
      <Label>2. Hangi işyerleri?</Label>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        <Btn small title="Tümünü seç" onPress={() => setSel(new Set(gs.map((g) => g.k)))} /><Btn small title="Hiçbirini seçme" onPress={() => setSel(new Set())} />
      </View>
      {gs.length ? gs.map((g) => <CheckRow key={g.k} checked={sel.has(g.k)} onToggle={() => toggle(g.k)} title={g.name} sub={`${g.n} işlem`} right={core.fmtI(g.tot)} />) : <Text style={{ color: t.muted }}>Bu kategoride işlem yok.</Text>}
    </Sheet>
  );
}
