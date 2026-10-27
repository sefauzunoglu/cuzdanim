import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Avatar, Btn, BtnRow, Card, Chips, DateField, Empty, Field, Kpi, Label, Pill, Row, Section, Sheet } from '../ui/kit';
import { Screen } from '../ui/chrome';

type Form = { kind: 'inc' | 'tr' | 'rec'; id?: string } | null;

export function Income() {
  const { S } = useApp(), nav = useNav(), t = useTheme();
  const [form, setForm] = useState<Form>(null);
  const [got, setGot] = useState<string | null>(null);
  const cm = core.ymOf(new Date());
  const inc = S.incomes.filter((i) => core.ymOf(core.pd(i.date)) === cm).sort((a, b) => core.pd(b.date).getTime() - core.pd(a.date).getTime());
  const tr = S.transfers.filter((x) => core.ymOf(core.pd(x.date)) === cm).sort((a, b) => core.pd(b.date).getTime() - core.pd(a.date).getTime());
  const open = (f: NonNullable<Form>) => { if (!S.accounts.length) { setForm({ kind: 'inc', id: '__noacc' }); return; } setForm(f); };
  return (
    <Screen title="Gelir ve transfer">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Kpi label="Bu ay gelir" value={core.fmtI(core.sum(inc, (i) => i.amt))} tone="good" /><Kpi label="Beklenen maaş vb." value={core.fmtI(core.sum(S.incomeRec, (r) => r.amt))} /><Kpi label="Transfer" value={core.fmtI(core.sum(tr, (x) => x.amt))} />
      </View>
      <BtnRow><Btn kind="pri" full title="+ Gelir ekle" onPress={() => open({ kind: 'inc' })} /><Btn full title="+ Transfer" onPress={() => open({ kind: 'tr' })} /></BtnRow>
      <Section title="Düzenli gelirler" action="+ Ekle" onAction={() => open({ kind: 'rec' })}>
        <Card>{S.incomeRec.length ? S.incomeRec.map((r, i) => {
          const gotIt = S.incPaid[r.id + '|' + cm];
          return <Row key={r.id} first={i === 0} lead={<Avatar name={r.name} />} title={r.name} sub={`Her ayın ${r.day}. günü · ${core.srcName(S, 'acc:' + r.acc)}`} right={core.fmtI(r.amt)} rightSub={gotIt ? <Pill tone="good">Alındı</Pill> : <Pill tone="acc" onPress={() => setGot(r.id)}>Geldi</Pill>} onPress={() => open({ kind: 'rec', id: r.id })} />;
        }) : <Empty title="Maaşını ekle" text="Düzenli gelirin geldiğinde tek dokunuşla hesaba işlersin." />}</Card>
      </Section>
      <Section title="Bu ayki gelirler"><Card>{inc.length ? inc.map((i, k) => <Row key={i.id} first={k === 0} title={i.note || 'Gelir'} sub={`${core.dshort(core.pd(i.date))} · ${core.srcName(S, 'acc:' + i.acc)}`} right={'+' + core.fmtI(i.amt)} onPress={() => open({ kind: 'inc', id: i.id })} />) : <Empty title="Gelir kaydı yok" />}</Card></Section>
      <Section title="Bu ayki transferler"><Card>{tr.length ? tr.map((x, k) => <Row key={x.id} first={k === 0} title={`${core.srcName(S, 'acc:' + x.from)} → ${x.to ? core.srcName(S, 'acc:' + x.to) : x.toText || 'Dış'}`} sub={core.dshort(core.pd(x.date)) + (x.note ? ' · ' + x.note : '')} right={core.fmtI(x.amt)} onPress={() => open({ kind: 'tr', id: x.id })} />) : <Empty title="Transfer yok" text="Hesaplar arası veya dışarıya yaptığın para transferleri." />}</Card></Section>
      {form && form.id === '__noacc' ? (
        <Sheet visible title="Hesap gerekli" onClose={() => setForm(null)}><Text style={{ color: t.muted, marginBottom: 12 }}>Gelir ve transferleri bir nakit/banka hesabına işlemek için önce hesap ekle.</Text><Btn kind="pri" title="Hesap ekle" onPress={() => { setForm(null); nav.go('acc'); }} /></Sheet>
      ) : <IncForm form={form} onClose={() => setForm(null)} />}
      <GotSheet id={got} onClose={() => setGot(null)} />
    </Screen>
  );
}

function accOpts(S: core.State, none?: string): [string, string][] { return [...(none ? [['', none] as [string, string]] : []), ...S.accounts.map((a) => [a.id, a.name] as [string, string])]; }

export function GotSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const r = id ? core.find(S.incomeRec, id) : undefined, cm = core.ymOf(new Date());
  const [amt, setAmt] = useState(''), [date, setDate] = useState(core.today());
  useEffect(() => { if (r) { setAmt(core.nv(r.amt)); setDate(core.iso(core.dateAt(cm, r.day))); } }, [id]); // eslint-disable-line
  if (!r) return null;
  return <Sheet visible title={r.name + ' geldi'} onClose={onClose} footer={<Btn kind="pri" full title="Kaydet" onPress={() => { const a = core.num(amt); if (!(a > 0)) return; update((s) => core.receiveIncome(s, r.id, cm, a, date || core.today())); onClose(); toast('Hesaba işlendi'); }} />}><Field label="Gelen tutar (₺)" value={amt} onChange={setAmt} num big /><DateField label="Tarih" value={date} onChange={setDate} /></Sheet>;
}

function IncForm({ form, onClose }: { form: Form; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const kind = form?.kind;
  const inc = kind === 'inc' && form?.id ? core.find(S.incomes, form.id) : undefined;
  const tr = kind === 'tr' && form?.id ? core.find(S.transfers, form.id) : undefined;
  const rec = kind === 'rec' && form?.id ? core.find(S.incomeRec, form.id) : undefined;
  const [amt, setAmt] = useState(''), [note, setNote] = useState(''), [acc, setAcc] = useState(''), [to, setTo] = useState(''), [toText, setToText] = useState(''), [date, setDate] = useState(core.today()), [day, setDay] = useState('');
  useEffect(() => {
    if (!form) return;
    const first = S.accounts[0]?.id || '';
    if (kind === 'inc') { setAmt(inc ? core.nv(inc.amt) : ''); setNote(inc?.note || ''); setAcc(inc?.acc || first); setDate(inc?.date || core.today()); }
    if (kind === 'tr') { setAmt(tr ? core.nv(tr.amt) : ''); setNote(tr?.note || ''); setAcc(tr?.from || first); setTo(tr?.to || ''); setToText(tr?.toText || ''); setDate(tr?.date || core.today()); }
    if (kind === 'rec') { setAmt(rec ? core.nv(rec.amt) : ''); setNote(rec?.name || 'Maaş'); setAcc(rec?.acc || first); setDay(rec ? String(rec.day) : ''); }
  }, [form]); // eslint-disable-line
  if (!form || !kind) return null;
  const existing = inc || tr || rec;
  const title = kind === 'inc' ? (inc ? 'Geliri düzenle' : 'Gelir ekle') : kind === 'tr' ? (tr ? 'Transferi düzenle' : 'Para transferi') : rec ? 'Düzenli geliri düzenle' : 'Düzenli gelir';
  const save = () => {
    const a = core.num(amt); if (!(a > 0)) { toast('Tutarı gir'); return; }
    if (kind === 'inc') update((s) => { const o = { amt: a, note: note.trim(), acc, date: date || core.today() }; if (inc) Object.assign(core.find(s.incomes, inc.id)!, o); else s.incomes.push({ id: core.uid(), ...o }); });
    if (kind === 'tr') { if (to === acc) { toast('Aynı hesap seçildi'); return; } update((s) => { const o = { amt: a, from: acc, to, toText: toText.trim(), note: note.trim(), date: date || core.today() }; if (tr) Object.assign(core.find(s.transfers, tr.id)!, o); else s.transfers.push({ id: core.uid(), ...o }); }); }
    if (kind === 'rec') { const dy = Math.round(core.num(day)); if (!(dy >= 1 && dy <= 31)) { toast('Gün gerekli'); return; } update((s) => { const o = { name: note.trim() || 'Gelir', amt: a, day: dy, acc }; if (rec) Object.assign(core.find(s.incomeRec, rec.id)!, o); else s.incomeRec.push({ id: core.uid(), ...o }); }); }
    onClose();
  };
  const del = () => {
    update((s) => {
      if (inc) { s.incomes = s.incomes.filter((i) => i.id !== inc.id); Object.keys(s.incPaid).forEach((k) => { if (s.incPaid[k] === inc.id) delete s.incPaid[k]; }); }
      if (tr) s.transfers = s.transfers.filter((x) => x.id !== tr.id);
      if (rec) s.incomeRec = s.incomeRec.filter((r) => r.id !== rec.id);
    });
    onClose();
  };
  return (
    <Sheet visible title={title} onClose={onClose} footer={<>{existing ? <Btn kind="danger" title="Sil" onPress={del} /> : null}<Btn kind="pri" full title="Kaydet" onPress={save} /></>}>
      <Field label="Tutar (₺)" value={amt} onChange={setAmt} num big />
      {kind === 'rec' ? <Field label="Ad" value={note} onChange={setNote} /> : <Field label={kind === 'inc' ? 'Açıklama' : 'Not'} value={note} onChange={setNote} placeholder={kind === 'inc' ? 'örn. Maaş, kira geliri' : ''} />}
      <View style={{ marginBottom: 12 }}><Label>{kind === 'tr' ? 'Gönderen hesap' : 'Hesap'}</Label><Chips value={acc} onChange={setAcc} options={accOpts(S)} /></View>
      {kind === 'tr' ? (
        <>
          <View style={{ marginBottom: 12 }}><Label>Nereye?</Label><Chips value={to} onChange={setTo} options={accOpts(S, 'Dış hesap / kişi')} /></View>
          <Field label="Alıcı adı" value={toText} onChange={setToText} placeholder="örn. Anneme, Yatırım, Kira" />
        </>
      ) : null}
      {kind === 'rec' ? <Field label="Ayın kaçıncı günü" value={day} onChange={setDay} num placeholder="1-31" /> : <DateField label="Tarih" value={date} onChange={setDate} />}
    </Sheet>
  );
}
