import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as core from './core';
import { useApp } from './store';
import { useNav } from './nav';
import { useTheme } from './theme';
import { Btn, Chips, DateField, Field, Label, Sheet } from './ui/kit';

/** Harcama ekleme ve düzenleme formu. */
export function ExpenseSheet() {
  const { S, update, toast } = useApp(), nav = useNav(), t = useTheme();
  const req = nav.expense, tx = req?.tx;
  const sources = useMemo(() => [...S.cards.map((c) => ['card:' + c.id, c.name] as [string, string]), ...S.accounts.map((a) => ['acc:' + a.id, a.name] as [string, string])], [S]);
  const [amt, setAmt] = useState(''), [cat, setCat] = useState('Market'), [src, setSrc] = useState(''), [inst, setInst] = useState(1);
  const [car, setCar] = useState(''), [sub, setSub] = useState('Yakıt'), [km, setKm] = useState('');
  const [date, setDate] = useState(core.today()), [note, setNote] = useState('');

  useEffect(() => {
    if (!req) return;
    const p = req.preset || {};
    setAmt(tx ? core.nv(tx.amt) : '');
    setCat(tx ? tx.cat : p.cat || 'Market');
    setSrc(tx ? tx.src : p.src || (sources[0] ? sources[0][0] : ''));
    setInst(tx ? tx.inst || 1 : 1);
    setCar(tx ? tx.car || '' : p.car || '');
    setSub(tx ? tx.sub || 'Yakıt' : 'Yakıt');
    setKm(tx && tx.km ? core.nv(tx.km) : '');
    setDate(tx ? tx.date : core.today());
    setNote(tx ? tx.note || '' : '');
  }, [req]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!req) return null;
  if (!sources.length) {
    return (
      <Sheet visible title="Önce bir kaynak ekle" onClose={nav.closeExpense}>
        <Text style={{ color: t.muted, marginBottom: 12 }}>Harcamanın hangi karttan veya hesaptan çıktığını seçebilmek için en az bir kart ya da nakit/hesap gerekir.</Text>
        <Btn kind="pri" title="Kart ekle" onPress={() => { nav.closeExpense(); nav.go('cards'); }} />
        <View style={{ height: 8 }} />
        <Btn title="Nakit / hesap ekle" onPress={() => { nav.closeExpense(); nav.go('acc'); }} />
      </Sheet>
    );
  }
  const amount = core.num(amt), isCard = src.startsWith('card:');
  const prev = core.expensePreview(S, { amt: amount, src, date, inst: isCard ? inst : 1 }, tx);
  const recent = tx ? [] : S.tx.slice().reverse().filter((x, i, a) => !x.rec && a.findIndex((y) => y.note === x.note && y.cat === x.cat && y.src === x.src) === i).slice(0, 5);

  const save = () => {
    if (!(amount > 0)) { toast('Tutarı gir'); return; }
    let msg = 'Kaydedildi';
    update((s) => {
      core.saveExpense(s, {
        id: tx?.id, amt: amount, cat, src, date: date || core.today(), note: note.trim(), inst: isCard ? inst : 1,
        ...(cat === 'Araba' ? { sub, car: car || undefined, km: core.num(km) > 0 ? core.num(km) : undefined } : {}),
        ...(tx?.rec ? { rec: tx.rec } : {}),
      });
      if (src.startsWith('card:')) {
        const c = core.find(s.cards, src.slice(5));
        if (c) { const i = core.cardInfo(s, c); msg = `${c.name}: güncel borç ${core.fmtI(i.currentDebt)}, kalan limit ${core.fmtI(i.avail)}`; }
      }
    });
    nav.closeExpense();
    toast(msg);
  };
  const remove = () => {
    update((s) => { const x = core.find(s.tx, tx!.id); if (x) core.deleteExpense(s, x); });
    nav.closeExpense();
    toast('Silindi');
  };
  const tone = prev.level === 'bad' ? [t.badSoft, t.bad] : prev.level === 'warn' ? [t.warnSoft, t.warn] : [t.accentSoft, t.ink];

  return (
    <Sheet visible title={tx ? 'Harcamayı düzenle' : 'Harcama ekle'} onClose={nav.closeExpense}
      above={prev.text ? <View style={{ backgroundColor: tone[0], borderRadius: 12, padding: 10 }}><Text style={{ color: tone[1], fontSize: 13.5 }}>{prev.text}</Text></View> : null}
      footer={<>{tx ? <Btn kind="danger" title="Sil" onPress={remove} /> : null}<Btn kind="pri" title="Kaydet" full onPress={save} /></>}>
      {recent.length ? (
        <View style={{ marginBottom: 12 }}>
          <Label>Son harcamalar (dokun, doldur)</Label>
          <Chips value="" scroll options={recent.map((r) => [r.id, `${r.note || r.cat} · ${core.fmtI(r.amt)}`] as [string, string])}
            onChange={(id) => { const r = core.find(S.tx, id); if (r) { setAmt(core.nv(r.amt)); setCat(r.cat); setSrc(r.src); setNote(r.note || ''); setInst(r.inst || 1); } }} />
        </View>
      ) : null}
      <Field label="Tutar (₺)" value={amt} onChange={setAmt} num big />
      <View style={{ marginBottom: 12 }}><Label>Kategori</Label><Chips value={cat} onChange={setCat} options={core.CATS.map((c) => [c, c])} /></View>
      <View style={{ marginBottom: 12 }}><Label>Nereden ödendi?</Label><Chips value={src} onChange={setSrc} options={sources} /></View>
      {isCard ? <View style={{ marginBottom: 12 }}><Label>Taksit</Label><Chips scroll value={inst} onChange={setInst} options={core.INST_OPTIONS.map((n) => [n, n === 1 ? 'Peşin' : n + ' taksit'] as [number, string])} /></View> : null}
      {cat === 'Araba' ? (
        <>
          {S.cars.length ? <View style={{ marginBottom: 12 }}><Label>Araba</Label><Chips value={car} onChange={setCar} options={[['', 'Seçilmedi'], ...S.cars.map((c) => [c.id, c.name] as [string, string])]} /></View> : null}
          <View style={{ marginBottom: 12 }}><Label>Araba gideri türü</Label><Chips value={sub} onChange={setSub} options={core.CARSUB.map((c) => [c, c])} /></View>
          {sub === 'Yakıt' && S.cars.length ? <Field label="Kilometre (isteğe bağlı)" value={km} onChange={setKm} num /> : null}
        </>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <DateField label="Tarih" value={date} onChange={setDate} />
        <View style={{ flex: 1 }}><Field label="Not" value={note} onChange={setNote} placeholder="örn. Migros" /></View>
      </View>
    </Sheet>
  );
}
