import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useTheme, FONT_NUM } from '../theme';
import { Avatar, Btn, Card, Chips, Empty, Field, Label, Row, Section, Sheet } from '../ui/kit';
import { Screen } from '../ui/chrome';

export function Accounts() {
  const { S } = useApp(), t = useTheme();
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const cm = core.ymOf(new Date());
  const flows: Record<string, number> = {};
  const add = (k: string, v: number) => { flows[k] = (flows[k] || 0) + v; };
  S.tx.forEach((x) => { if (x.src.startsWith('acc:') && core.ymOf(core.pd(x.date)) === cm) add(x.rec ? 'Sabit gider: ' + x.note : 'Harcama: ' + x.cat, x.amt); });
  S.cardPay.forEach((p) => { if (p.from && core.ymOf(core.pd(p.date)) === cm) add('Kart ödemesi: ' + (core.find(S.cards, p.card)?.name || '?'), p.amt); });
  S.debtPay.forEach((p) => { if (p.from && core.ymOf(core.pd(p.date)) === cm) add('Borç ödemesi: ' + (core.find(S.debts, p.debt)?.name || '?'), p.amt); });
  S.transfers.forEach((x) => { if (core.ymOf(core.pd(x.date)) === cm) add('Transfer: ' + (x.to ? core.srcName(S, 'acc:' + x.to) : x.toText || 'Dış'), x.amt); });
  const fl = Object.entries(flows).sort((a, b) => b[1] - a[1]), tot = core.sum(fl, (x) => x[1]), inc = core.monthIncome(S, cm);
  return (
    <Screen title="Hesaplar ve nakit akışı">
      <View style={{ backgroundColor: t.heroBg, borderRadius: 22, padding: 18 }}>
        <Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Toplam nakit</Text>
        <Text style={[{ color: t.heroInk, fontSize: 36, fontWeight: '800', letterSpacing: -1 }, FONT_NUM]}>{core.fmtI(core.cashTotal(S))}</Text>
      </View>
      <Section title="Hesaplar" action="+ Ekle" onAction={() => setForm({})}>
        <Card>{S.accounts.length ? S.accounts.map((a, i) => <Row key={a.id} first={i === 0} lead={<Avatar name={a.name} />} title={a.name} sub={a.type === 'cash' ? 'Elde nakit' : 'Banka hesabı'} right={core.fmtI(core.accBal(S, a))} onPress={() => setForm({ id: a.id })} />) : <Empty title="Hesap yok" text="Elindeki nakit ve banka hesaplarını ekle." />}</Card>
      </Section>
      <Section title={`${core.MONTHS[cm % 12]} ayında para nereye gitti · ${core.fmtI(tot)}`}>
        <Card>
          {fl.length ? fl.map(([k, v]) => (
            <View key={k} style={{ marginVertical: 7 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: t.ink, flex: 1, fontSize: 13.5 }}>{k}</Text><Text style={[{ color: t.ink, fontWeight: '700' }, FONT_NUM]}>{core.fmtI(v)} <Text style={{ color: t.muted, fontWeight: '400' }}>%{Math.round((v / tot) * 100)}</Text></Text></View>
              <View style={{ height: 8, borderRadius: 9, backgroundColor: t.surface2, overflow: 'hidden' }}><View style={{ height: '100%', width: `${(v / fl[0][1]) * 100}%`, backgroundColor: t.accent, borderRadius: 9 }} /></View>
            </View>
          )) : <Empty title="Bu ay hesaplardan çıkış yok" text="Hesaptan yapılan harcama, kart ödemesi, borç ödemesi ve transferler burada gruplanır." />}
          {inc > 0 ? <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 6 }}>Bu ay gelen: {core.fmtI(inc)} · Hesaplardan çıkan: {core.fmtI(tot)}</Text> : null}
        </Card>
      </Section>
      <AccountForm req={form} onClose={() => setForm(null)} />
    </Screen>
  );
}

export function AccountForm({ req, onClose }: { req: { id?: string } | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const x = req?.id ? core.find(S.accounts, req.id) : undefined;
  const [type, setType] = useState('cash'), [name, setName] = useState(''), [open, setOpen] = useState(''), [confirm, setConfirm] = useState(false);
  useEffect(() => { if (req) { setType(x?.type || 'cash'); setName(x?.name || ''); setOpen(x ? core.nv(x.opening || 0) : ''); setConfirm(false); } }, [req]); // eslint-disable-line
  if (!req) return null;
  return (
    <Sheet visible title={x ? 'Hesabı düzenle' : 'Hesap ekle'} onClose={onClose}
      footer={confirm ? <><Btn title="Vazgeç" onPress={() => setConfirm(false)} /><Btn kind="danger" full title="Evet, hesabı ve kayıtlarını sil" onPress={() => { update((s) => { s.tx = s.tx.filter((t) => t.src !== 'acc:' + x!.id); s.incomes = s.incomes.filter((i) => i.acc !== x!.id); s.transfers = s.transfers.filter((t) => t.from !== x!.id); s.accounts = s.accounts.filter((a) => a.id !== x!.id); }); onClose(); }} /></>
        : <>{x ? <Btn kind="danger" title="Sil" onPress={() => setConfirm(true)} /> : null}<Btn kind="pri" full title="Kaydet" onPress={() => {
          const n = name.trim(); if (!n) { toast('Ad gir'); return; }
          const o = { type: type as 'cash' | 'bank', name: n, opening: core.num(open) };
          update((s) => { if (x) Object.assign(core.find(s.accounts, x.id)!, o); else s.accounts.push({ id: core.uid(), ...o }); }); onClose();
        }} /></>}>
      <View style={{ marginBottom: 12 }}><Label>Tür</Label><Chips value={type} onChange={setType} options={[['cash', 'Elde nakit'], ['bank', 'Banka hesabı']]} /></View>
      {!x ? <View style={{ marginBottom: 12 }}><Label>Banka (hızlı seç, istersen aşağıya kendin yaz)</Label><Chips scroll value="" onChange={(b) => { setName(b + ' hesabı'); setType('bank'); }} options={core.BANKS.map((b) => [b, b] as [string, string])} /></View> : null}
      <Field label="Ad" value={name} onChange={setName} placeholder="örn. Cüzdan, Maaş hesabı" />
      <Field label="Başlangıç bakiyesi (₺)" value={open} onChange={setOpen} num />
      <Text style={{ opacity: 0.7, fontSize: 12.5 }}>Bakiye; girdiğin gelir, harcama, transfer ve ödemelerle otomatik güncellenir.</Text>
    </Sheet>
  );
}
