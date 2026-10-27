import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useTheme, FONT_NUM } from '../theme';
import { Bar, Btn, BtnRow, Card, Chips, DateField, Empty, Field, Kpi, Label, Section, Sheet } from '../ui/kit';
import { Screen } from '../ui/chrome';
import { Icon } from '../ui/icons';

export function Gun() {
  const { S, update, toast } = useApp(), t = useTheme();
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const [month, setMonth] = useState<{ id: string; k: number } | null>(null);
  const [pay, setPay] = useState<{ id: string; k: number } | null>(null);
  const [recv, setRecv] = useState<string | null>(null);
  if (!S.gun.length) return <Screen title="Altın / para günü" subtitle="Ay ay ödeme ve alacak"><Card><Empty title="Gün ekle" text="Altın günü veya para günündeki aylık ödemelerini, sıranı ve alacağını buradan takip edersin." /><BtnRow><Btn kind="pri" full title="Gün ekle" onPress={() => setForm({})} /></BtnRow></Card><GunForm req={form} onClose={() => setForm(null)} /></Screen>;
  const tl = core.sum(S.gun.filter((g) => core.gunLeft(S, g) > 0), (g) => core.gunC(S, g));
  const rec = core.sum(S.gun.filter((g) => !(g.recv && g.recv.done)), (g) => core.gunPot(S, g));
  const dg = core.sum(S.gun, (g) => core.gunDebtTL(S, g));
  return (
    <Screen title="Altın / para günü" subtitle="Ay ay ödeme ve alacak">
      <View style={{ flexDirection: 'row', gap: 8 }}><Kpi label="Aylık ödeme" value={core.fmtI(tl)} /><Kpi label="Alacağın" value={core.fmtI(rec)} tone="good" /><Kpi label="Borç gibi kalan" value={core.fmtI(dg)} tone={dg > 0 ? 'bad' : undefined} /></View>
      {S.gun.map((g) => {
        const left = core.gunLeft(S, g), done = g.n - left, nx = core.gunNext(S, g), got = g.recv && g.recv.done, ty = core.gunY(g, g.turn - 1);
        return (
          <Section key={g.id}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontSize: 17, fontWeight: '800' }}>{g.name}</Text><Text style={{ color: t.muted, fontSize: 12.5 }}>{g.kind === 'gold' ? 'Altın günü' : 'Para günü'} · her ay {core.gunDesc(g)}{g.kind === 'gold' ? ` (${core.fmtI(core.gunC(S, g))})` : ''} · ayın {core.gunDay(g)}. günü</Text></View>
                <Pressable onPress={() => setForm({ id: g.id })} accessibilityLabel="Düzenle" style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}><Icon name="gear" size={20} color={t.ink} /></Pressable>
              </View>
              <View style={{ marginTop: 10 }}><Bar value={done / g.n} tone="good" /></View>
              <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 4 }}>{done}/{g.n} ay ödendi · {left} ay kaldı</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: t.line, marginTop: 8 }}>
                <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontWeight: '600' }}>{got ? 'Alacağını aldın ✓' : `Alacağın · ${core.MONTHS[ty % 12]} ${Math.floor(ty / 12)}`}</Text><Text style={{ color: t.muted, fontSize: 12.5 }}>{g.kind === 'gold' ? core.gunDesc({ kind: 'gold', unit: g.unit, qty: (g.qty || 0) * g.n }) + ' · ' : ''}şu an {core.fmtI(core.gunPot(S, g))}{got ? ' · ' + core.dshort(core.pd(g.recv!.date)) : ''}</Text></View>
                {got ? null : <Btn small title="Aldım" onPress={() => setRecv(g.id)} />}
              </View>
              {got && left > 0 ? <View style={{ backgroundColor: t.warnSoft, borderRadius: 12, padding: 10, marginBottom: 8 }}><Text style={{ color: t.warn }}>Alacağını aldığın için kalan {left} ay ({core.fmtI(core.gunDebtTL(S, g))}) artık borç sayılır.</Text></View> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {Array.from({ length: g.n }, (_, k) => {
                  const y = core.gunY(g, k), p = core.gunPaid(S, g, k), turn = k === g.turn - 1;
                  return (
                    <Pressable key={k} onPress={() => setMonth({ id: g.id, k })} style={{ width: '18.4%', minHeight: 50, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: p ? t.goodSoft : t.surface2, borderWidth: 1.5, borderColor: turn ? t.accent : 'transparent' }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: p ? t.good : t.ink }}>{core.MS[y % 12]}</Text>
                      <Text style={{ fontSize: 11, color: p ? t.good : t.muted }}>{String(Math.floor(y / 12)).slice(2)}{p ? ' ✓' : ''}</Text>
                      {turn ? <Text style={{ fontSize: 9, fontWeight: '800', color: t.accent }}>SIRA</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
              {nx >= 0 ? <BtnRow><Btn kind="pri" full title={`${core.MS[core.gunY(g, nx) % 12]} ödemesini yap · ${core.fmtI(core.gunC(S, g))}`} onPress={() => setPay({ id: g.id, k: nx })} /></BtnRow> : null}
            </Card>
          </Section>
        );
      })}
      <BtnRow><Btn full title="+ Gün ekle" onPress={() => setForm({})} /></BtnRow>
      <Text style={{ color: t.muted, fontSize: 12.5, margin: 8 }}>Altın günlerinde ödeme tutarı güncel altın satış fiyatından hesaplanır. Fiyatı Borçlar sayfasından güncelleyebilirsin.</Text>
      {month ? (() => {
        const g = core.find(S.gun, month.id)!;
        const paid = core.gunPaid(S, g, month.k);
        return paid ? (
          <Sheet visible title="Ödemeyi geri al" onClose={() => setMonth(null)} footer={<><Btn title="Vazgeç" onPress={() => setMonth(null)} /><Btn kind="danger" full title="Geri al" onPress={() => { update((s) => core.gunUnpay(s, core.find(s.gun, g.id)!, month.k)); setMonth(null); }} /></>}>
            <Text style={{ color: t.ink }}>{core.MONTHS[core.gunY(g, month.k) % 12]} ayı ödemesi geri alınsın mı? Bağlı harcama kaydı da silinir.</Text>
          </Sheet>
        ) : <PayGun target={month} onClose={() => setMonth(null)} />;
      })() : null}
      <PayGun target={pay} onClose={() => setPay(null)} />
      <RecvGun id={recv} onClose={() => setRecv(null)} />
      <GunForm req={form} onClose={() => setForm(null)} />
    </Screen>
  );
}

function PayGun({ target, onClose }: { target: { id: string; k: number } | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const g = target ? core.find(S.gun, target.id) : undefined;
  const [amt, setAmt] = useState(''), [src, setSrc] = useState(''), [date, setDate] = useState(core.today());
  useEffect(() => { if (g) { setAmt(core.nv(+core.gunC(S, g).toFixed(2))); setSrc(''); setDate(core.today()); } }, [target]); // eslint-disable-line
  if (!g || !target) return null;
  const sources: [string, string][] = [['', 'Harcama kaydı oluşturma'], ...S.cards.map((c) => ['card:' + c.id, c.name] as [string, string]), ...S.accounts.map((a) => ['acc:' + a.id, a.name] as [string, string])];
  return (
    <Sheet visible title={`${g.name} · ${core.MONTHS[core.gunY(g, target.k) % 12]} ödemesi`} onClose={onClose} footer={<Btn kind="pri" full title="Kaydet" onPress={() => { const a = core.num(amt); if (!(a > 0)) { toast('Tutarı gir'); return; } update((s) => core.gunPay(s, core.find(s.gun, g.id)!, target.k, a, src, date || core.today())); onClose(); toast('Ödeme işlendi'); }} />}>
      <Field label="Ödenen tutar (₺)" value={amt} onChange={setAmt} num big />
      <Text style={{ opacity: 0.7, fontSize: 12.5, marginTop: -6, marginBottom: 12 }}>{g.kind === 'gold' ? core.gunDesc(g) + ' karşılığı, güncel satış fiyatıyla. Altını fiilen verdiysen ve hesaptan para çıkmadıysa kaynağı "Kaydetme" bırak.' : 'Aylık para günü ödemesi.'}</Text>
      <View style={{ marginBottom: 12 }}><Label>Hangi kaynaktan?</Label><Chips value={src} onChange={setSrc} options={sources} /></View>
      <DateField label="Tarih" value={date} onChange={setDate} />
    </Sheet>
  );
}

function RecvGun({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const g = id ? core.find(S.gun, id) : undefined;
  const [amt, setAmt] = useState(''), [acc, setAcc] = useState(''), [date, setDate] = useState(core.today());
  useEffect(() => { if (g) { setAmt(core.nv(+core.gunPot(S, g).toFixed(2))); setAcc(''); setDate(core.today()); } }, [id]); // eslint-disable-line
  if (!g) return null;
  return (
    <Sheet visible title={g.name + ' alacağı'} onClose={onClose} footer={<Btn kind="pri" full title="Kaydet" onPress={() => { const a = core.num(amt); if (!(a > 0)) { toast('Tutarı gir'); return; } update((s) => core.gunReceive(s, core.find(s.gun, g.id)!, a, acc, date || core.today())); onClose(); toast('Alacak işlendi. Kalan ödemeler artık borç sayılıyor'); }} />}>
      <Field label="Aldığın tutar (₺)" value={amt} onChange={setAmt} num big />
      {g.kind === 'gold' ? <Text style={{ opacity: 0.7, fontSize: 12.5, marginTop: -6, marginBottom: 12 }}>Altın olarak aldıysan TL karşılığını yaz ve hesabı boş bırak. Bozdurduysan para giren hesabı seç.</Text> : null}
      {S.accounts.length ? <View style={{ marginBottom: 12 }}><Label>Hangi hesaba girdi?</Label><Chips value={acc} onChange={setAcc} options={[['', 'Hesaba işleme'], ...S.accounts.map((a) => [a.id, a.name] as [string, string])]} /></View> : null}
      <DateField label="Tarih" value={date} onChange={setDate} />
    </Sheet>
  );
}

function GunForm({ req, onClose }: { req: { id?: string } | null; onClose: () => void }) {
  const { S, update, toast } = useApp(), t = useTheme();
  const g = req?.id ? core.find(S.gun, req.id) : undefined;
  const [name, setName] = useState(''), [kind, setKind] = useState('gold'), [unit, setUnit] = useState('ceyrek'), [qty, setQty] = useState('1'), [amt, setAmt] = useState(''), [first, setFirst] = useState(core.today()), [n, setN] = useState(''), [turn, setTurn] = useState(''), [confirm, setConfirm] = useState(false);
  useEffect(() => { if (req) { setName(g?.name || ''); setKind(g?.kind || 'gold'); setUnit(g?.unit || 'ceyrek'); setQty(g ? core.nv(g.qty || 0) : '1'); setAmt(g ? core.nv(g.amt || 0) : ''); setFirst(g?.first || core.today()); setN(g ? String(g.n) : ''); setTurn(g ? String(g.turn) : ''); setConfirm(false); } }, [req]); // eslint-disable-line
  if (!req) return null;
  const nn = Math.round(core.num(n)), tt = Math.round(core.num(turn)), gold = kind === 'gold';
  let prev = 'Toplam ay ve sıranı girince başlangıç, bitiş ve alacağın burada görünür.';
  if (nn > 0 && tt >= 1 && tt <= nn && first) {
    const y0 = core.ymOf(core.pd(first)), c = gold ? core.num(qty) * core.gp(S, unit as core.GoldUnit) : core.num(amt);
    prev = `Başlangıç ${core.ymLabel(y0)} · son ödeme ${core.ymLabel(y0 + nn - 1)}\nSıran: ${core.ymLabel(y0 + tt - 1)} · Alacağın: ${gold ? core.pc(core.num(qty) * nn) + ' ' + (core.GU.find((u) => u[0] === unit) || core.GU[0])[1] + ' (' + core.fmtI(c * nn) + ')' : core.fmtI(c * nn)}`;
  }
  return (
    <Sheet visible title={g ? 'Günü düzenle' : 'Gün ekle'} onClose={onClose}
      above={<View style={{ backgroundColor: t.accentSoft, borderRadius: 12, padding: 10 }}><Text style={{ color: t.ink, fontSize: 13.5 }}>{prev}</Text></View>}
      footer={confirm ? <><Btn title="Vazgeç" onPress={() => setConfirm(false)} /><Btn kind="danger" full title="Evet, sil" onPress={() => { update((s) => { s.gun = s.gun.filter((x) => x.id !== g!.id); }); onClose(); }} /></>
        : <>{g ? <Btn kind="danger" title="Sil" onPress={() => setConfirm(true)} /> : null}<Btn kind="pri" full title="Kaydet" onPress={() => {
          if (!name.trim() || !(nn >= 2) || !(tt >= 1 && tt <= nn) || !first || !(gold ? core.num(qty) > 0 : core.num(amt) > 0)) { toast('Ad, tutar, ay sayısı ve sıra gerekli'); return; }
          const o = { name: name.trim(), kind: kind as 'gold' | 'cash', first, n: nn, turn: tt, unit: unit as core.GoldUnit, qty: core.num(qty), amt: core.num(amt) };
          update((s) => { if (g) Object.assign(core.find(s.gun, g.id)!, o); else s.gun.push({ id: core.uid(), paid: {}, recv: null, ...o }); }); onClose();
        }} /></>}>
      <Field label="Gün adı" value={name} onChange={setName} placeholder="örn. Ayşe teyze altın günü" />
      <View style={{ marginBottom: 12 }}><Label>Tür</Label><Chips value={kind} onChange={setKind} options={[['gold', 'Altın günü'], ['cash', 'Para günü']]} /></View>
      {gold ? (<><View style={{ marginBottom: 12 }}><Label>Her ay verilen altın</Label><Chips value={unit} onChange={setUnit} options={core.GU.map(([k, l]) => [k, l] as [string, string])} /></View><Field label="Adet / gram" value={qty} onChange={setQty} num /></>) : <Field label="Aylık tutar (₺)" value={amt} onChange={setAmt} num />}
      <DateField label="İlk ödeme tarihi (başladığı ay ve gün)" value={first} onChange={setFirst} />
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Toplam ay (kişi sayısı)" value={n} onChange={setN} num placeholder="örn. 10" /></View><View style={{ flex: 1 }}><Field label="Sıra kaçıncı ayda sende" value={turn} onChange={setTurn} num placeholder="1-n" /></View></View>
    </Sheet>
  );
}
