import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme, FONT_NUM } from '../theme';
import { Avatar, Btn, BtnRow, Card, Chips, DateField, Empty, Field, Label, Row, Section, Sheet } from '../ui/kit';
import { Screen } from '../ui/chrome';
import { applyGoldPrices, fetchGoldPrices } from '../gold';

const typeOpts: [string, string][] = [['loan', 'Kredi'], ['gold', 'Altın borcu'], ['person', 'Şahsi borç'], ['other', 'Diğer']];

export function Debts() {
  const { S, update, toast } = useApp(), nav = useNav(), t = useTheme();
  const tot = core.totals(S), gd = S.cfg.gold || {};
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const [pay, setPay] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [prices, setPrices] = useState(false);
  const live = async () => {
    toast('Fiyatlar alınıyor…');
    const p = await fetchGoldPrices();
    if (p) { update((s) => applyGoldPrices(s, p)); toast('Altın fiyatları güncellendi'); } else toast('Canlı fiyat alınamadı. Fiyatları elle girebilirsin.');
  };
  const gRows = S.gun.filter((g) => core.gunDebtTL(S, g) > 0);
  return (
    <Screen title="Borçlar">
      <View style={{ backgroundColor: t.heroBg, borderRadius: 22, padding: 18 }}>
        <Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Toplam borç</Text>
        <Text style={[{ color: t.heroInk, fontSize: 36, fontWeight: '800', letterSpacing: -1, marginVertical: 2, marginBottom: 10 }, FONT_NUM]}>{core.fmtI(tot.total)}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[core.fmtI(tot.cardDebt), 'Kart'], [core.fmtI(tot.other), 'Diğer'], [core.fmtI(tot.inst), 'Gelecek taksit']].map(([v, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: 'rgba(127,127,127,0.2)', borderRadius: 12, padding: 8, minWidth: 0 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[{ color: t.heroInk, fontWeight: '700', fontSize: 15 }, FONT_NUM]}>{v}</Text>
              <Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 11 }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
      <Section title="Borç listesi" action="+ Borç ekle" onAction={() => setForm({})}>
        <Card>
          {S.cards.length + S.debts.length + gRows.length === 0 ? <Empty title="Borç yok" text="Kredi, altın borcu, şahsi borç ekleyebilirsin. Kartlar otomatik gelir." /> : null}
          {S.cards.map((c, i) => <Row key={c.id} first={i === 0} lead={<Avatar name={c.name} />} title={c.name} sub={`Kredi kartı · limit %${Math.round(tot.ci[i].util * 100)} dolu${tot.ci[i].future > 0 ? ' · taksit ' + core.fmtI(tot.ci[i].future) : ''}`} right={core.fmtI(tot.ci[i].currentDebt)} onPress={() => nav.openCard(c.id)} />)}
          {S.debts.map((d, i) => (
            <Row key={d.id} first={!S.cards.length && i === 0} lead={<Avatar name={d.name} />} title={d.name}
              sub={`${core.debtNote(d)}${d.type === 'gold' ? ' · ' + core.goldDesc(d) : ''}${d.monthly ? ` · aylık ${core.fmtI(d.monthly)}` : ''}${d.type === 'loan' && (d.monthly || 0) > 0 ? ` · ~${Math.ceil((d.remaining || 0) / (d.monthly as number))} ay` : ''}`}
              right={core.fmtI(core.debtBal(S, d))} onPress={() => setMenu(d.id)} />
          ))}
          {gRows.map((g) => <Row key={g.id} lead={<Avatar name={g.name} />} title={g.name} sub={`Altın günü · alacağını aldın, kalan ${core.gunLeft(S, g)} ay ödeme`} right={core.fmtI(core.gunDebtTL(S, g))} onPress={() => nav.go('gun')} />)}
        </Card>
      </Section>
      <Section title="Altın fiyatları (satış)" action="Güncelle" onAction={live}>
        <Card>
          <View style={{ flexDirection: 'row' }}>
            {core.GU.map(([k, l]) => (
              <View key={k} style={{ flex: 1 }}><Text style={{ color: t.muted, fontSize: 11 }}>{l[0].toUpperCase() + l.slice(1)}</Text><Text style={[{ color: t.ink, fontWeight: '700', fontSize: 14 }, FONT_NUM]}>{core.gp(S, k) ? core.fmtI(core.gp(S, k)) : '—'}</Text></View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text style={{ color: t.muted, fontSize: 12.5, flex: 1 }}>{gd.updated ? (gd.live ? 'Canlı' : 'Elle girildi') + ' · ' + new Date(gd.updated).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Fiyat girilmedi'}</Text>
            <Btn small title="Elle gir" onPress={() => setPrices(true)} />
          </View>
        </Card>
      </Section>
      {S.debtPay.length ? (
        <Section title="Son borç ödemeleri">
          <Card>{S.debtPay.slice().reverse().slice(0, 6).map((p, i) => {
            const d = core.find(S.debts, p.debt);
            return <Row key={p.id} first={i === 0} title={d ? d.name : '(silinmiş)'} sub={core.dshort(core.pd(p.date)) + (p.gold ? ' · ' + core.GU.filter(([k]) => p.gold![k]).map(([k, l]) => core.pc(p.gold![k] as number) + ' ' + l).join(' + ') : '')} right={'−' + core.fmtI(p.amt)} />;
          })}</Card>
        </Section>
      ) : null}
      <DebtForm req={form} onClose={() => setForm(null)} />
      <DebtPay id={pay} onClose={() => setPay(null)} />
      <PriceForm open={prices} onClose={() => setPrices(false)} onLive={live} />
      {menu ? (
        <Sheet visible title={core.find(S.debts, menu)?.name || ''} onClose={() => setMenu(null)}>
          <Card><Row first title="Kalan borç" sub={core.debtNote(core.find(S.debts, menu)!)} right={core.fmt(core.debtBal(S, core.find(S.debts, menu)!))} /></Card>
          <BtnRow><Btn kind="pri" full title="Ödeme yap" onPress={() => { const id = menu; setMenu(null); setPay(id); }} /><Btn full title="Düzenle" onPress={() => { const id = menu; setMenu(null); setForm({ id }); }} /></BtnRow>
        </Sheet>
      ) : null}
    </Screen>
  );
}

function PriceForm({ open, onClose, onLive }: { open: boolean; onClose: () => void; onLive: () => void }) {
  const { S, update, toast } = useApp();
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => { if (open) { const o: Record<string, string> = {}; core.GU.forEach(([k]) => { o[k] = core.gp(S, k) ? core.nv(+core.gp(S, k).toFixed(2)) : ''; }); setV(o); } }, [open]); // eslint-disable-line
  return (
    <Sheet visible={open} title="Altın fiyatları (₺)" onClose={onClose} footer={<Btn kind="pri" full title="Kaydet" onPress={() => {
      const g: core.GoldPrices = { updated: Date.now(), live: false };
      core.GU.forEach(([k]) => { const n = core.num(v[k]); if (n > 0) g[k] = n; });
      if (!((g.gram || 0) > 0)) { toast('En az gram fiyatını gir'); return; }
      update((s) => { s.cfg.gold = g; }); onClose();
    }} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {core.GU.map(([k, l]) => <View key={k} style={{ width: '47%' }}><Field label={l[0].toUpperCase() + l.slice(1)} value={v[k] || ''} onChange={(x) => setV({ ...v, [k]: x })} num /></View>)}
      </View>
      <Text style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 12 }}>Borcu altın alarak ödeyeceğin için satış fiyatı kullanılır. Çeyrek, yarım veya tam boş bırakılırsa gram fiyatından tahmin edilir.</Text>
      <Btn title="Canlı fiyatı çek" onPress={() => { onClose(); onLive(); }} />
    </Sheet>
  );
}

function DebtPay({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const d = id ? core.find(S.debts, id) : undefined;
  const [amt, setAmt] = useState(''), [gold, setGold] = useState<Record<string, string>>({}), [from, setFrom] = useState(''), [date, setDate] = useState(core.today());
  useEffect(() => { if (d) { setAmt(core.nv(d.monthly || 0)); setGold({}); setFrom(S.accounts[0]?.id || ''); setDate(core.today()); } }, [id]); // eslint-disable-line
  if (!d) return null;
  const g = d.type === 'gold';
  return (
    <Sheet visible title={d.name + ' ödemesi'} onClose={onClose} footer={<Btn kind="pri" full title="Kaydet" onPress={() => {
      if (g) {
        const paid: core.GoldHold = {}; core.GU.forEach(([k]) => { const n = core.num(gold[k]); if (n > 0) paid[k] = n; });
        if (!Object.keys(paid).length) { toast('Ödenen altını gir'); return; }
        update((s) => core.payDebt(s, d.id, { gold: paid, from, date }));
      } else {
        const n = core.num(amt); if (!(n > 0)) { toast('Tutarı gir'); return; }
        update((s) => core.payDebt(s, d.id, { amt: n, from, date }));
      }
      onClose(); toast('Ödeme kaydedildi');
    }} />}>
      {g ? (
        <>
          <Text style={{ fontSize: 13.5, opacity: 0.7, marginBottom: 10 }}>Ödediğin altını yaz. Kalan borçtan düşülür.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {core.GU.map(([k, l]) => <View key={k} style={{ width: '47%' }}><Field label={`${l[0].toUpperCase() + l.slice(1)} (${core.pc((d.gold || {})[k] || 0)})`} value={gold[k] || ''} onChange={(x) => setGold({ ...gold, [k]: x })} num /></View>)}
          </View>
        </>
      ) : <Field label="Ödenen tutar (₺)" value={amt} onChange={setAmt} num big />}
      {S.accounts.length ? <View style={{ marginBottom: 12 }}><Label>{g ? 'Altın alımı hangi hesaptan? (isteğe bağlı)' : 'Hangi hesaptan?'}</Label><Chips value={from} onChange={setFrom} options={[['', 'Hesaptan düşme'], ...S.accounts.map((a) => [a.id, `${a.name} (${core.fmtI(core.accBal(S, a))})`] as [string, string])]} /></View> : null}
      <DateField label="Tarih" value={date} onChange={setDate} />
    </Sheet>
  );
}

function DebtForm({ req, onClose }: { req: { id?: string } | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const x = req?.id ? core.find(S.debts, req.id) : undefined;
  const [type, setType] = useState('loan'), [name, setName] = useState(''), [rem, setRem] = useState(''), [gold, setGold] = useState<Record<string, string>>({});
  const [mon, setMon] = useState(''), [day, setDay] = useState(''), [rate, setRate] = useState(''), [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!req) return;
    setType(x?.type || 'loan'); setName(x?.name || ''); setRem(x ? core.nv(x.remaining || 0) : '');
    const g: Record<string, string> = {}; core.GU.forEach(([k]) => { g[k] = x?.gold ? core.nv(x.gold[k] || 0) : ''; }); setGold(g);
    setMon(x ? core.nv(x.monthly || 0) : ''); setDay(x?.day ? String(x.day) : ''); setRate(x ? core.nv(x.rate || 0) : ''); setConfirm(false);
  }, [req]); // eslint-disable-line
  if (!req) return null;
  const save = () => {
    const n = name.trim(); if (!n) { toast('Ad gir'); return; }
    const o: any = { type, name: n, monthly: core.num(mon), day: Math.round(core.num(day)) || 0, rate: core.num(rate) };
    if (type === 'gold') { o.gold = {}; core.GU.forEach(([k]) => { const v = core.num(gold[k]); if (v > 0) o.gold[k] = v; }); } else o.remaining = core.num(rem);
    update((s) => { if (x) { const t = core.find(s.debts, x.id)!; Object.assign(t, o); if (type !== 'gold') delete t.gold; } else s.debts.push({ id: core.uid(), ...o }); });
    onClose();
  };
  return (
    <Sheet visible title={x ? 'Borcu düzenle' : 'Borç ekle'} onClose={onClose}
      footer={confirm ? <><Btn title="Vazgeç" onPress={() => setConfirm(false)} /><Btn kind="danger" full title="Evet, sil" onPress={() => { update((s) => { s.debts = s.debts.filter((d) => d.id !== x!.id); s.debtPay = s.debtPay.filter((p) => p.debt !== x!.id); }); onClose(); }} /></>
        : <>{x ? <Btn kind="danger" title="Sil" onPress={() => setConfirm(true)} /> : null}<Btn kind="pri" full title="Kaydet" onPress={save} /></>}>
      <View style={{ marginBottom: 12 }}><Label>Tür</Label><Chips value={type} onChange={setType} options={typeOpts} /></View>
      <Field label="Ad" value={name} onChange={setName} placeholder="örn. İhtiyaç kredisi" />
      {type === 'gold' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{core.GU.map(([k, l]) => <View key={k} style={{ width: '47%' }}><Field label={'Kalan ' + l} value={gold[k] || ''} onChange={(v) => setGold({ ...gold, [k]: v })} num /></View>)}</View>
          <Text style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 12 }}>Borcun cinsini yaz: örneğin 2 çeyrek + 10 gram. TL karşılığı güncel satış fiyatından hesaplanır.</Text>
        </>
      ) : <Field label="Kalan borç (₺)" value={rem} onChange={setRem} num />}
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Aylık ödeme (₺)" value={mon} onChange={setMon} num /></View><View style={{ flex: 1 }}><Field label="Ödeme günü" value={day} onChange={setDay} num placeholder="1-31" /></View></View>
      <Field label="Aylık faiz % (yoksa boş)" value={rate} onChange={setRate} num />
    </Sheet>
  );
}
