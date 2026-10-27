import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme, FONT_NUM } from '../theme';
import { Btn, BtnRow, Card, Chips, DateField, Empty, Field, Label, Pill, Row, Sheet } from '../ui/kit';
import { Screen } from '../ui/chrome';
import { Icon } from '../ui/icons';

export function Car() {
  const { S } = useApp(), nav = useNav(), t = useTheme();
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const cm = core.ymOf(new Date());
  const mini = (l: string, v: string) => <View style={{ flex: 1, backgroundColor: t.surface2, borderRadius: 14, padding: 10 }}><Text style={{ color: t.muted, fontSize: 11 }}>{l}</Text><Text style={[{ color: t.ink, fontWeight: '700', fontSize: 16 }, FONT_NUM]}>{v}</Text></View>;
  return (
    <Screen title="Araba">
      {!S.cars.length ? <Card><Empty title="Araba ekle" text="Yakıt, bakım, sigorta ve vergi harcamalarını arabanla eşleştir. Kartla ödediklerin kart ekstresine de işlenir." /><BtnRow><Btn kind="pri" full title="Araba ekle" onPress={() => setForm({})} /></BtnRow></Card> : (
        <>
          {S.cars.map((c) => {
            const tx = S.tx.filter((x) => x.car === c.id), yr = tx.filter((x) => core.pd(x.date).getTime() > Date.now() - 365 * 864e5), mo = tx.filter((x) => core.ymOf(core.pd(x.date)) === cm);
            const by: Record<string, number> = {}; yr.forEach((x) => { by[x.sub || 'Diğer'] = (by[x.sub || 'Diğer'] || 0) + x.amt; });
            const kms = tx.map((x) => x.km).filter(Boolean) as number[], span = kms.length > 1 ? Math.max(...kms) - Math.min(...kms) : 0;
            const onCard = core.sum(tx.filter((x) => x.src.startsWith('card:')), (x) => x.amt);
            const rem = ([['inspect', 'Muayene'], ['insurance', 'Trafik sigortası'], ['kasko', 'Kasko']] as const).filter(([k]) => (c as any)[k]).map(([k, l]) => { const dd = core.daysTo(core.pd((c as any)[k])); return <Pill key={k} tone={dd < 0 ? 'bad' : dd < 30 ? 'warn' : 'neutral'}>{`${l}: ${core.dshort(core.pd((c as any)[k]))}${dd < 0 ? ' (geçti)' : ' · ' + dd + ' gün'}`}</Pill>; });
            return (
              <Card key={c.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 17, fontWeight: '800' }}>{c.name}</Text><Text style={{ color: t.muted, fontSize: 12.5 }}>{c.plate || ''}{c.km ? ' · ' + Number(c.km).toLocaleString('tr-TR') + ' km' : ''}</Text></View>
                  <Pressable onPress={() => setForm({ id: c.id })} accessibilityLabel="Düzenle" style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}><Icon name="gear" size={20} color={t.ink} /></Pressable>
                </View>
                {rem.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>{rem}</View> : null}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>{mini('Bu ay', core.fmtI(core.sum(mo, (x) => x.amt)))}{mini('Son 12 ay', core.fmtI(core.sum(yr, (x) => x.amt)))}{mini(span ? '₺/km' : 'Karttan', span ? core.fmt(core.sum(tx, (x) => x.amt) / span) : core.fmtI(onCard))}</View>
                {Object.keys(by).length ? <View style={{ marginTop: 10 }}>{Object.entries(by).sort((a, b) => b[1] - a[1]).map(([n, v]) => <View key={n} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}><Text style={{ color: t.ink, fontSize: 13.5 }}>{n}</Text><Text style={[{ color: t.ink, fontWeight: '700' }, FONT_NUM]}>{core.fmtI(v)}</Text></View>)}</View> : null}
                <BtnRow><Btn kind="pri" full title="+ Araba gideri" onPress={() => nav.openExpense({ preset: { cat: 'Araba', car: c.id } })} /></BtnRow>
                {tx.length ? <View style={{ marginTop: 6 }}>{tx.slice().sort((a, b) => core.pd(b.date).getTime() - core.pd(a.date).getTime()).slice(0, 5).map((x, i) => <Row key={x.id} first={i === 0} title={`${x.sub || 'Gider'}${x.note ? ' · ' + x.note : ''}`} sub={`${core.dshort(core.pd(x.date))} · ${core.srcName(S, x.src)}${x.inst > 1 ? ' · ' + x.inst + ' taksit' : ''}`} right={core.fmtI(x.amt)} onPress={() => nav.openExpense({ tx: x })} />)}</View> : null}
              </Card>
            );
          })}
          <BtnRow><Btn full title="+ Araba ekle" onPress={() => setForm({})} /></BtnRow>
        </>
      )}
      <CarForm req={form} onClose={() => setForm(null)} />
    </Screen>
  );
}

function CarForm({ req, onClose }: { req: { id?: string } | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const x = req?.id ? core.find(S.cars, req.id) : undefined;
  const [name, setName] = useState(''), [plate, setPlate] = useState(''), [km, setKm] = useState(''), [ins, setIns] = useState(''), [sig, setSig] = useState(''), [kas, setKas] = useState(''), [confirm, setConfirm] = useState(false);
  useEffect(() => { if (req) { setName(x?.name || ''); setPlate(x?.plate || ''); setKm(x ? core.nv(x.km || 0) : ''); setIns(x?.inspect || ''); setSig(x?.insurance || ''); setKas(x?.kasko || ''); setConfirm(false); } }, [req]); // eslint-disable-line
  if (!req) return null;
  const optDate = (label: string, v: string, set: (s: string) => void) => (
    <View style={{ marginBottom: 4 }}>{v ? <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}><DateField label={label} value={v} onChange={set} /><View style={{ marginBottom: 12 }}><Btn small title="Temizle" onPress={() => set('')} /></View></View> : <View style={{ marginBottom: 12 }}><Label>{label}</Label><Btn small title="Tarih seç" onPress={() => set(core.today())} /></View>}</View>
  );
  return (
    <Sheet visible title={x ? 'Arabayı düzenle' : 'Araba ekle'} onClose={onClose}
      footer={confirm ? <><Btn title="Vazgeç" onPress={() => setConfirm(false)} /><Btn kind="danger" full title="Evet, sil" onPress={() => { update((s) => { s.tx.forEach((t) => { if (t.car === x!.id) delete t.car; }); s.cars = s.cars.filter((c) => c.id !== x!.id); }); onClose(); }} /></>
        : <>{x ? <Btn kind="danger" title="Sil" onPress={() => setConfirm(true)} /> : null}<Btn kind="pri" full title="Kaydet" onPress={() => {
          const n = name.trim(); if (!n) { toast('Ad gir'); return; }
          const o = { name: n, plate: plate.trim(), km: core.num(km), inspect: ins, insurance: sig, kasko: kas };
          update((s) => { if (x) Object.assign(core.find(s.cars, x.id)!, o); else s.cars.push({ id: core.uid(), ...o }); }); onClose();
        }} /></>}>
      <Field label="Araba" value={name} onChange={setName} placeholder="örn. Fiat Egea" />
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Plaka" value={plate} onChange={setPlate} /></View><View style={{ flex: 1 }}><Field label="Kilometre" value={km} onChange={setKm} num /></View></View>
      {optDate('Muayene tarihi', ins, setIns)}{optDate('Trafik sigortası bitişi', sig, setSig)}{optDate('Kasko bitişi', kas, setKas)}
    </Sheet>
  );
}
