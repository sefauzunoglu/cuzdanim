import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme, FONT_NUM } from '../theme';
import { Avatar, Bar, Btn, BtnRow, Card, CatLead, Chips, DateField, Empty, Field, Label, Pill, Row, Section, Sheet, utilTone } from '../ui/kit';
import { Screen } from '../ui/chrome';
import { Icon } from '../ui/icons';

const pcS = (n: number) => core.pc(n);

export function Cards() {
  const { S } = useApp(), nav = useNav(), t = useTheme();
  const [form, setForm] = useState<{ id?: string } | null>(null);
  if (!S.cards.length) {
    return (
      <Screen title="Kartlar">
        <Card><Empty title="Henüz kart yok" text="Limit, hesap kesim ve son ödeme günlerini girince dönem borcu ve asgari tutar otomatik hesaplanır." /><BtnRow><Btn kind="pri" title="Kart ekle" full onPress={() => setForm({})} /></BtnRow></Card>
        <CardForm req={form} onClose={() => setForm(null)} />
      </Screen>
    );
  }
  return (
    <Screen title="Kartlar">
      {S.cards.map((c) => {
        const i = core.cardInfo(S, c);
        return (
          <Pressable key={c.id} onPress={() => nav.openCard(c.id)} style={{ backgroundColor: t.heroBg, borderRadius: 20, padding: 16, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: t.heroInk, fontWeight: '800', fontSize: 16 }}>{c.name}</Text>
              <Text style={[{ color: t.heroInk, fontWeight: '700' }, FONT_NUM]}>{Math.round(i.util * 100)}%</Text>
            </View>
            <View style={{ marginVertical: 10, height: 8, borderRadius: 9, backgroundColor: 'rgba(127,127,127,0.3)', overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.min(100, i.util * 100)}%`, backgroundColor: t.heroInk, borderRadius: 9 }} /></View>
            <Text style={[{ color: t.heroInk, opacity: 0.7, fontSize: 12 }, FONT_NUM]}>Limit {core.fmtI(c.limit)} · Kalan {core.fmtI(i.avail)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 8 }}>
              {[['Güncel borç', core.fmtI(i.currentDebt)], ['Kesilen ekstre' + (i.closedDebt > 0 ? ' · ' + core.dshort(i.due) : ''), core.fmtI(i.closedDebt)], ['Tahmini asgari', core.fmtI(i.min)], ['Sonraki ekstre tahmini', core.fmtI(i.nextEst)]].map(([l, v]) => (
                <View key={l} style={{ width: '50%' }}><Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 11 }}>{l}</Text><Text style={[{ color: t.heroInk, fontWeight: '700', fontSize: 15 }, FONT_NUM]}>{v}</Text></View>
              ))}
            </View>
          </Pressable>
        );
      })}
      <BtnRow><Btn title="+ Kart ekle" full onPress={() => setForm({})} /></BtnRow>
      <Text style={{ color: t.muted, fontSize: 12.5, margin: 8 }}>Tutarlar girdiğin harcamalardan canlı hesaplanır. Banka ekstresiyle fark çıkarsa kartı düzenleyip "ödenmemiş kalan borç"u ayarla.</Text>
      <CardForm req={form} onClose={() => setForm(null)} />
    </Screen>
  );
}

export function CardDetail() {
  const { S, update, toast } = useApp(), nav = useNav(), t = useTheme();
  const c = core.find(S.cards, nav.cardId || '');
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const [pay, setPay] = useState(false);
  if (!c) return <Cards />;
  const i = core.cardInfo(S, c), ch = i.ch;
  const grp = [i.cur, i.cur - 1, i.cur - 2].map((idx) => ({ idx, items: ch.filter((x) => x.idx === idx).sort((a, b) => core.pd(b.tx.date).getTime() - core.pd(a.tx.date).getTime()) }));
  const act = S.tx.filter((x) => x.src === 'card:' + c.id && x.inst > 1).map((x) => { const b = core.stmtIdx(c, x.date), paid = Math.max(0, Math.min(x.inst, i.cur - b + 1)); return { t: x, left: x.inst - paid, paid }; }).filter((x) => x.left > 0);
  const catSum: Record<string, number> = {};
  ch.filter((x) => x.idx === i.cur).forEach((x) => { catSum[x.tx.cat] = (catSum[x.tx.cat] || 0) + x.amt; });
  const [a, b] = core.stmtRange(c, i.cur);
  const cmax = Math.max(1, ...Object.values(catSum));
  const row = (x: core.Charge, first: boolean) => (
    <Row key={x.tx.id + x.k} first={first} lead={<CatLead cat={x.tx.cat} />} title={x.tx.note || x.tx.cat}
      sub={`${core.dshort(core.pd(x.tx.date))} · ${x.tx.cat}${x.n > 1 ? ` · ${x.k + 1}/${x.n}. taksit` : ''}`} right={core.fmt(x.amt)} onPress={() => nav.openExpense({ tx: x.tx })} />
  );
  const dark = (l: string, v: string) => (<View style={{ width: '50%', marginBottom: 8 }}><Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 11 }}>{l}</Text><Text style={[{ color: t.heroInk, fontWeight: '700', fontSize: 15 }, FONT_NUM]}>{v}</Text></View>);
  return (
    <Screen title={c.name} subtitle={`Kesim ${c.cutoff}. gün · Son ödeme ${c.due}. gün · Asgari %${i.minRate} · Faiz %${pcS(i.rate)}/ay`}
      headerRight={<Pressable onPress={() => setForm({ id: c.id })} accessibilityLabel="Düzenle" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="gear" color={t.ink} /></Pressable>}>
      <View style={{ backgroundColor: t.heroBg, borderRadius: 20, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: t.heroInk, fontWeight: '800', fontSize: 16 }}>Güncel borç</Text><Text style={[{ color: t.heroInk, fontWeight: '800', fontSize: 16 }, FONT_NUM]}>{core.fmtI(i.currentDebt)}</Text></View>
        <View style={{ marginVertical: 10, height: 8, borderRadius: 9, backgroundColor: 'rgba(127,127,127,0.3)', overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.min(100, i.util * 100)}%`, backgroundColor: t.heroInk, borderRadius: 9 }} /></View>
        <Text style={[{ color: t.heroInk, opacity: 0.7, fontSize: 12, marginBottom: 12 }, FONT_NUM]}>Limit {core.fmtI(c.limit)} · Kullanılan {core.fmtI(i.used)} · Kalan {core.fmtI(i.avail)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {dark(`Kesilen ekstre (son ödeme ${core.dshort(i.due)})`, core.fmtI(i.closedDebt))}{dark(`Tahmini asgari (%${i.minRate})`, core.fmtI(i.min))}
          {dark('Açık dönem harcaması', core.fmtI(i.openDebt))}{dark('Kalan taksitler', core.fmtI(i.future))}
        </View>
      </View>
      <BtnRow><Btn kind="pri" title="Kart borcu öde" full onPress={() => setPay(true)} /><Btn title="Bu karta harcama" full onPress={() => nav.openExpense({ preset: { src: 'card:' + c.id } })} /></BtnRow>
      <Section title="Tahminler">
        <Card>
          <Row first title="Sonraki ekstre tahmini" sub={`Açık dönem ${core.fmtI(i.openDebt)}${i.recOnCard ? ` + ödenmemiş sabit gider ${core.fmtI(i.recOnCard)}` : ''}`} right={core.fmtI(i.nextEst)} rightSub={`asgari ~${core.fmtI(i.nextMin)}`} />
          <Row title="Dönem içi harcama" sub={`${core.dshort(a)} – ${core.dshort(b)}`} right={core.fmtI(core.sum(ch.filter((x) => x.idx === i.cur), (x) => x.amt))} />
        </Card>
      </Section>
      {i.closedDebt > 0.5 ? (
        <Section title="Ekstreyi nasıl ödersen">
          <Card>
            <Row first title="Tamamını ödersen" sub="Faiz işlemez" right={core.fmtI(i.closedDebt)} rightSub={<Text style={{ color: t.good, fontSize: 12 }}>kalan 0 ₺</Text>} />
            <Row title="Sadece asgariyi ödersen" sub={`${core.fmtI(i.min)} ödenir, ${core.fmtI(i.carry)} sonraki aya taşınır`} right={'+' + core.fmtI(i.carryInt)} rightSub={`aylık faiz %${pcS(i.rate)}`} />
            <Row title="Asgarinin altında ödersen" sub={`Eksik kısma gecikme faizi (%${pcS(i.rate + core.LATE)}) işler`} right={`%${pcS(i.rate + core.LATE)}`} rightSub={`${core.fmtI(i.lateInt)} / ay (asgari üzerinden)`} />
          </Card>
          <Text style={{ color: t.muted, fontSize: 12.5, margin: 4 }}>Oranlar yasal azami tavanlara göre tahmin edilir; bankan daha düşük uyguluyorsa kartı düzenleyip faizi "Elle gir" yap. Faiz tutarları basit aylık tahmindir.</Text>
        </Section>
      ) : null}
      {Object.keys(catSum).length ? (
        <Section title="Bu dönem kategoriler">
          <Card>{Object.entries(catSum).sort((x, y) => y[1] - x[1]).map(([n, v]) => (
            <View key={n} style={{ marginVertical: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: t.ink }}>{n}</Text><Text style={{ color: t.ink, fontWeight: '700' }}>{core.fmtI(v)}</Text></View>
              <View style={{ height: 8, borderRadius: 9, backgroundColor: t.surface2, overflow: 'hidden' }}><View style={{ height: '100%', width: `${(v / cmax) * 100}%`, backgroundColor: t.cats[core.catIndex(n)], borderRadius: 9 }} /></View>
            </View>))}</Card>
        </Section>
      ) : null}
      {act.length ? (
        <Section title="Devam eden taksitler">
          <Card>{act.map((x, k) => (
            <Row key={x.t.id} first={k === 0} title={x.t.note || x.t.cat} sub={`${x.paid}/${x.t.inst} ödendi · kalan ${x.left} ay`} right={core.fmtI(x.t.amt / x.t.inst)} rightSub={`kalan ${core.fmtI((x.t.amt / x.t.inst) * x.left)}`} onPress={() => nav.openExpense({ tx: x.t })} />
          ))}</Card>
        </Section>
      ) : null}
      {grp.map((g, gi) => {
        if (!g.items.length && gi) return null;
        const [s0, e0] = core.stmtRange(c, g.idx);
        return (
          <Section key={g.idx} title={`${gi === 0 ? 'Açık dönem' : gi === 1 ? 'Önceki ekstre' : 'Daha önceki'} · ${core.dshort(s0)} – ${core.dshort(e0)} · ${core.fmtI(core.sum(g.items, (x) => x.amt))}`}>
            <Card>{g.items.length ? g.items.map((x, k) => row(x, k === 0)) : <Empty title="Harcama yok" />}</Card>
          </Section>
        );
      })}
      {S.cardPay.some((p) => p.card === c.id) ? (
        <Section title="Ödemeler">
          <Card>{S.cardPay.filter((p) => p.card === c.id).slice().reverse().slice(0, 8).map((p, k) => (
            <Row key={p.id} first={k === 0} title="Kart ödemesi" sub={`${core.dshort(core.pd(p.date))}${p.from ? ' · ' + core.srcName(S, 'acc:' + p.from) : ''}`} right={'−' + core.fmtI(p.amt)}
              onPress={() => update((s) => { s.cardPay = s.cardPay.filter((x) => x.id !== p.id); })} />
          ))}</Card>
          <Text style={{ color: t.muted, fontSize: 12.5, margin: 4 }}>Bir ödemeyi silmek için ona dokun.</Text>
        </Section>
      ) : null}
      <PaySheet open={pay} cardId={c.id} onClose={() => setPay(false)} />
      <CardForm req={form} onClose={() => setForm(null)} onDeleted={() => nav.go('cards')} />
    </Screen>
  );
}

function PaySheet({ open, cardId, onClose }: { open: boolean; cardId: string; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const c = core.find(S.cards, cardId);
  const [amt, setAmt] = useState(''), [from, setFrom] = useState(''), [date, setDate] = useState(core.today());
  useEffect(() => { if (open && c) { const i = core.cardInfo(S, c); setAmt(core.nv(+i.closedDebt.toFixed(2))); setFrom(S.accounts[0]?.id || ''); setDate(core.today()); } }, [open]); // eslint-disable-line
  if (!c) return null;
  const i = core.cardInfo(S, c);
  return (
    <Sheet visible={open} title={c.name + ' borcu öde'} onClose={onClose} footer={<Btn kind="pri" full title="Kaydet" onPress={() => {
      const v = core.num(amt); if (!(v > 0)) { toast('Tutarı gir'); return; }
      update((s) => { core.payCard(s, cardId, v, from, date || core.today()); }); onClose(); toast('Ödeme kaydedildi');
    }} />}>
      <View style={{ marginBottom: 12 }}><Chips value="" onChange={(v) => setAmt(core.nv(+v))} options={[[i.min.toFixed(2), `Asgari ${core.fmtI(i.min)}`], [i.closedDebt.toFixed(2), `Ekstre ${core.fmtI(i.closedDebt)}`], [i.currentDebt.toFixed(2), `Tüm borç ${core.fmtI(i.currentDebt)}`]]} /></View>
      <Field label="Ödenen tutar (₺)" value={amt} onChange={setAmt} num big />
      {S.accounts.length ? <View style={{ marginBottom: 12 }}><Label>Hangi hesaptan?</Label><Chips value={from} onChange={setFrom} options={[['', 'Hesaptan düşme'], ...S.accounts.map((a) => [a.id, `${a.name} (${core.fmtI(core.accBal(S, a))})`] as [string, string])]} /></View> : null}
      <DateField label="Tarih" value={date} onChange={setDate} />
    </Sheet>
  );
}

/** Kart ekleme ve düzenleme. */
export function CardForm({ req, onClose, onDeleted }: { req: { id?: string } | null; onClose: () => void; onDeleted?: () => void }) {
  const { S, update, toast } = useApp(), t = useTheme();
  const c = req?.id ? core.find(S.cards, req.id) : undefined;
  const [name, setName] = useState(''), [limit, setLimit] = useState(''), [cut, setCut] = useState(''), [due, setDue] = useState('');
  const [minA, setMinA] = useState('1'), [min, setMin] = useState('20'), [rateA, setRateA] = useState('1'), [rate, setRate] = useState('4'), [open, setOpen] = useState(''), [since, setSince] = useState(core.today());
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    if (!req) return;
    setName(c?.name || ''); setLimit(c ? core.nv(c.limit) : ''); setCut(c ? String(c.cutoff) : ''); setDue(c ? String(c.due) : '');
    setMinA(c && c.minAuto === false ? '0' : '1'); setMin(String(c?.minRate ?? 20)); setRateA(c && c.rateAuto === false ? '0' : '1'); setRate(String(c?.rate ?? 4));
    setOpen(c ? core.nv(c.openDebt || 0) : ''); setSince(c?.since || core.today()); setConfirmDel(false);
  }, [req]); // eslint-disable-line
  if (!req) return null;
  const lim = core.num(limit);
  const save = () => {
    const n = name.trim(), cu = Math.round(core.num(cut)), du = Math.round(core.num(due));
    if (!n || !(cu >= 1 && cu <= 31) || !(du >= 1 && du <= 31)) { toast('Ad, kesim ve son ödeme günü gerekli'); return; }
    const o = { name: n, limit: lim, cutoff: cu, due: du, since: since || core.today(), minAuto: minA !== '0', minRate: core.num(min) || 20, rateAuto: rateA !== '0', rate: core.num(rate), openDebt: core.num(open) };
    update((s) => { if (c) Object.assign(core.find(s.cards, c.id)!, o); else s.cards.push({ id: core.uid(), ...o }); });
    onClose();
  };
  const del = () => { update((s) => { s.tx = s.tx.filter((x) => x.src !== 'card:' + c!.id); s.cardPay = s.cardPay.filter((p) => p.card !== c!.id); s.cards = s.cards.filter((x) => x.id !== c!.id); }); onClose(); onDeleted?.(); };
  return (
    <Sheet visible title={c ? 'Kartı düzenle' : 'Kart ekle'} onClose={onClose}
      footer={confirmDel ? <><Btn title="Vazgeç" onPress={() => setConfirmDel(false)} /><Btn kind="danger" full title="Evet, kartı ve harcamalarını sil" onPress={del} /></>
        : <>{c ? <Btn kind="danger" title="Sil" onPress={() => setConfirmDel(true)} /> : null}<Btn kind="pri" full title="Kaydet" onPress={save} /></>}>
      {!c ? <View style={{ marginBottom: 12 }}><Label>Banka (hızlı seç, istersen aşağıya kendin yaz)</Label><Chips scroll value="" onChange={(b) => setName(b + ' kartı')} options={core.BANKS.map((b) => [b, b] as [string, string])} /></View> : null}
      <Field label="Kart adı" value={name} onChange={setName} placeholder="örn. Garanti Bonus" />
      <Field label="Limit (₺)" value={limit} onChange={setLimit} num />
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Hesap kesim günü" value={cut} onChange={setCut} num placeholder="1-31" /></View><View style={{ flex: 1 }}><Field label="Son ödeme günü" value={due} onChange={setDue} num placeholder="1-31" /></View></View>
      <View style={{ marginBottom: 12 }}><Label>Asgari ödeme oranı</Label><Chips value={minA} onChange={setMinA} options={[['1', 'Otomatik (BDDK)'], ['0', 'Elle gir']]} /></View>
      {minA === '0' ? <Field label="Asgari oran (%)" value={min} onChange={setMin} num /> : null}
      <View style={{ marginBottom: 12 }}><Label>Aylık faiz</Label><Chips value={rateA} onChange={setRateA} options={[['1', 'Otomatik (TCMB azami)'], ['0', 'Elle gir']]} /></View>
      {rateA === '0' ? <Field label="Aylık faiz (%)" value={rate} onChange={setRate} num /> : null}
      <Text style={{ color: t.muted, fontSize: 12.5, marginBottom: 12 }}>
        {minA === '1' ? `Asgari oran limitine göre %${core.autoMinRate(lim)} (limit 100.000 ₺ ve altı %20, üstü %40). ` : ''}
        {rateA === '1' ? 'Aylık faiz dönem borcuna göre otomatik: 30 bin ₺ altı %3,25, 30-180 bin ₺ %3,75, üstü %4,25. Bunlar yasal azami oranlardır; bankan daha düşük uyguluyorsa Elle gir seç.' : ''}
      </Text>
      <Field label="Son ekstreden ödenmemiş kalan borç (₺)" value={open} onChange={setOpen} num placeholder="Ödediysen 0" />
      <DateField label="Bu uygulamayı bu karta ne zaman kullanmaya başladın?" value={since} onChange={setSince} />
      <Text style={{ color: t.muted, fontSize: 12.5, marginBottom: 12 }}>
        Ödenmemiş kalan borç: bankada son kesilen ekstreden hâlâ ödemen gereken tutar (ekstre eksi ödediklerin). Tamamen ödediysen 0 yaz. Henüz kesilmemiş harcamaları buraya yazma, + ile ekle.{'\n\n'}
        Başlama tarihi: çoğu zaman bugün. Bu tarihten önceki ekstreler bitmiş sayılır, eski harcamaları girmen gerekmez. Eski taksitli alışverişleri gerçek tarihleriyle girebilirsin; geçmiş taksitler borca eklenmez, kalanlar eklenir.
      </Text>
    </Sheet>
  );
}
