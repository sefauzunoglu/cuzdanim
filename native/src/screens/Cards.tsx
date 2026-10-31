import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme, FONT_NUM } from '../theme';
import { Avatar, Bar, Btn, BtnRow, Card, CatLead, Chips, DateField, Empty, Field, Label, Note, Pill, Row, Section, Sheet, utilTone } from '../ui/kit';
import { SyncSheet } from '../SyncSheet';
import { CategorizeSheet } from '../CategorizeSheet';
import type { CatReq } from '../CategorizeSheet';
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
              {[['Güncel borç', core.fmtI(i.currentDebt)], [i.pastDue ? 'Devreden borç (faiz işliyor)' : i.closedDebt > 0.5 ? 'Ödenecek ekstre · son ödeme ' + core.dshort(i.due) : 'Ödenecek ekstre', core.fmtI(i.closedDebt)], ['Bu dönem harcaması · ' + core.dshort(i.nextCut) + ' kesilir', core.fmtI(i.openDebt)], ['Sonraki ekstre' + (i.closedDebt > 0.5 && !i.pastDue ? ' (ekstreyi tamamen ödersen)' : ' tahmini') + ' · asgari ~' + core.fmtI(i.nextMin), core.fmtI(i.nextEst)]].map(([l, v]) => (
                <View key={l} style={{ width: '50%' }}><Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 11 }}>{l}</Text><Text style={[{ color: t.heroInk, fontWeight: '700', fontSize: 15 }, FONT_NUM]}>{v}</Text></View>
              ))}
            </View>
          </Pressable>
        );
      })}
      <BtnRow><Btn title="+ Kart ekle" full onPress={() => setForm({})} /></BtnRow>
      <Text style={{ color: t.muted, fontSize: 12.5, margin: 8 }}>Tutarlar girdiğin harcamalardan canlı hesaplanır. Banka ile fark çıkarsa kartı aç ve "Bankadan güncelle" ile Excel veya PDF yükle.</Text>
      <CardForm req={form} onClose={() => setForm(null)} />
    </Screen>
  );
}

type Tab = 'ozet' | 'cur' | 'inst' | 'prev';
const TABS: [Tab, string][] = [['ozet', 'Özet'], ['cur', 'Dönem içi'], ['inst', 'Taksitler'], ['prev', 'Önceki']];

export function CardDetail() {
  const { S, update } = useApp(), nav = useNav(), t = useTheme();
  const c = core.find(S.cards, nav.cardId || '');
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const [pay, setPay] = useState(false), [sync, setSync] = useState(false), [catReq, setCatReq] = useState<CatReq | null>(null);
  const [tab, setTab] = useState<Tab>('ozet'), [ccat, setCcat] = useState('');
  useEffect(() => { setTab('ozet'); setCcat(''); }, [nav.cardId]);
  if (!c) return <Cards />;
  const i = core.cardInfo(S, c), ch = i.ch;
  const act = S.tx.filter((x) => x.src === 'card:' + c.id && x.inst > 1).map((x) => { const b = core.stmtIdx(c, x.sd || x.date), paid = Math.max(0, Math.min(x.inst, i.cur - b + 1)); return { t: x, left: x.inst - paid, paid }; }).filter((x) => x.left > 0);
  const [a, b] = core.stmtRange(c, i.cur);
  const row = (x: core.Charge, first: boolean) => (
    <Row key={x.tx.id + x.k} first={first} lead={<CatLead cat={x.tx.cat} />} title={x.tx.note || x.tx.cat}
      sub={`${core.dshort(core.pd(x.tx.date))} · ${x.tx.cat}${x.tx.vc ? ' · ' + ((c.vcards || []).find((v) => v.id === x.tx.vc)?.name || 'sanal kart') : ''}${x.n > 1 ? ` · ${x.k + 1}/${x.n}. taksit` : ''}`} right={core.fmt(x.amt)} onPress={() => nav.openExpense({ tx: x.tx })} />
  );
  const dark = (l: string, v: string) => (<View style={{ width: '50%', marginBottom: 8 }}><Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 11 }}>{l}</Text><Text style={[{ color: t.heroInk, fontWeight: '700', fontSize: 15 }, FONT_NUM]}>{v}</Text></View>);
  const missingDebt = !(+(c.openDebt || 0) > 0) && S.tx.some((x) => x.src === 'card:' + c.id && x.hist);

  /** Kategori düğmeleri: tutarlarıyla, en büyükten küçüğe; dokununca sadece o kategori gösterilir. */
  const catChips = (items: { cat: string; amt: number }[]) => {
    const m: Record<string, number> = {};
    items.forEach((x) => { m[x.cat] = (m[x.cat] || 0) + x.amt; });
    const e = Object.entries(m).sort((x, y) => y[1] - x[1]);
    return e.length > 1 ? <View style={{ marginVertical: 6 }}><Chips scroll value={ccat} onChange={(v) => setCcat(ccat === v ? '' : v)} options={e.map(([n, v]) => [n, `${n} · ${core.fmtI(v)}`] as [string, string])} /></View> : null;
  };
  const listTab = (items: core.Charge[], title: string, range: string, emptyT: string, scope: 'cur' | 'prev') => {
    const tot = core.sum(items, (x) => x.amt), shown = ccat ? items.filter((x) => x.tx.cat === ccat) : items;
    const unc = items.filter((x) => x.tx.cat === 'Diğer'), uncTx = new Set(unc.map((x) => x.tx.id));
    return (
      <Section title={`${title} · ${core.fmtI(tot)}`}>
        <Text style={{ color: t.muted, fontSize: 12.5, marginBottom: 4 }}>{range}</Text>
        {ccat && ccat !== 'Diğer' ? <View style={{ marginVertical: 4 }}><Btn small title={`"${ccat}" işlemlerini başka kategoriye taşı`} onPress={() => setCatReq({ cardId: c.id, scope, cat: ccat })} /></View> : null}
        {unc.length ? <View style={{ marginVertical: 4 }}><Btn small title={`Kategorisi belirsiz: ${uncTx.size} işlem · ${core.fmtI(core.sum(unc, (x) => x.amt))} · düzenle`} onPress={() => setCatReq({ cardId: c.id, scope, cat: 'Diğer' })} /></View> : null}
        {catChips(items.map((x) => ({ cat: x.tx.cat, amt: x.amt })))}
        <Card>{shown.length ? shown.map((x, k) => row(x, k === 0)) : <Empty title={emptyT} />}</Card>
      </Section>
    );
  };
  const byDate = (arr: core.Charge[]) => arr.slice().sort((x, y) => core.pd(y.tx.date).getTime() - core.pd(x.tx.date).getTime());

  let content: React.ReactNode;
  if (tab === 'cur') content = listTab(byDate(ch.filter((x) => x.idx === i.cur)), 'Bu dönem', `${core.dshort(a)} – ${core.dshort(b)} · taksit parçaları dahil`, 'Bu dönem harcama yok', 'cur');
  else if (tab === 'prev') { const [ps, pe] = core.stmtRange(c, i.cur - 1); content = listTab(byDate(ch.filter((x) => x.idx === i.cur - 1)), 'Önceki ekstre', `${core.dshort(ps)} – ${core.dshort(pe)}`, 'Önceki ekstrede harcama yok', 'prev'); }
  else if (tab === 'inst') {
    const items = act.filter((x) => !ccat || x.t.cat === ccat), mon = core.sum(act, (x) => x.t.amt / x.t.inst), left = core.sum(act, (x) => (x.t.amt / x.t.inst) * x.left);
    content = (
      <Section title={`Devam eden taksitler · ${core.fmtI(left)}`}>
        <Text style={{ color: t.muted, fontSize: 12.5, marginBottom: 4 }}>Aylık {core.fmtI(mon)} · toplam kalan {core.fmtI(left)}</Text>
        {catChips(act.map((x) => ({ cat: x.t.cat, amt: (x.t.amt / x.t.inst) * x.left })))}
        <Card>{items.length ? items.map((x, k) => (
          <Row key={x.t.id} first={k === 0} title={x.t.note || x.t.cat} sub={`${x.paid}/${x.t.inst} ödendi · kalan ${x.left} ay · ${x.t.cat}`} right={core.fmtI(x.t.amt / x.t.inst)} rightSub={`kalan ${core.fmtI((x.t.amt / x.t.inst) * x.left)}`} onPress={() => nav.openExpense({ tx: x.t })} />
        )) : <Empty title="Devam eden taksit yok" />}</Card>
      </Section>
    );
  } else {
    const open = i.openDebt + i.recOnCard, rate = i.rate / 100;
    const scen = (carry: number) => { const faiz = carry * rate, next = carry + faiz + open; return { faiz, next, min: (next * i.minRate) / 100 }; };
    let est: React.ReactNode;
    if (i.pastDue) {
      est = (
        <Section title={`Sonraki ekstre · ${core.dshort(i.nextCut)} kesilir`}>
          <Card>
            <Row first title="Devreden borç" sub="Son ödeme tarihi geçti, faiz işliyor" right={core.fmtI(i.devir)} />
            <Row title="Bu dönem harcaması" sub="taksit parçaları dahil" right={core.fmtI(i.openDebt)} />
            <Row title="Tahmini faiz" sub={`Devreden borcun %${pcS(i.rate)}'i`} right={core.fmtI(i.interestNext)} />
            <Row title="Tahmini ekstre borcu" right={core.fmtI(i.nextEst)} />
            <Row title={`Asgari ödeme (%${i.minRate})`} sub={`Son ödeme ${core.dshort(i.dueOpen)}`} right={'~' + core.fmtI(i.nextMin)} />
          </Card>
          <Text style={{ color: t.muted, fontSize: 12.5, margin: 4 }}>Banka asgariyi, devreden borç ve faiz dahil toplam ekstre borcunun yüzdesi olarak hesaplar. Ödeme yaparsan (Kart borcu öde) faiz azalır.</Text>
        </Section>
      );
    } else if (i.closedDebt > 0.5) {
      const A0 = scen(0), A1 = scen(i.carry);
      est = (
        <Section title="Ekstreyi nasıl ödersen?">
          <Text style={{ color: t.muted, fontSize: 12.5, marginBottom: 6 }}>Ödenecek ekstre {core.fmtI(i.closedDebt)} · son ödeme {core.dshort(i.due)}. Seçimine göre {core.dshort(i.nextCut)} ekstren şöyle olur:</Text>
          <Card>
            <Row first title="Tamamını ödersen" sub={`${core.fmtI(i.closedDebt)} · faiz işlemez`} right={core.fmtI(A0.next)} rightSub={`asgari ~${core.fmtI(A0.min)}`} />
            <Row title="Sadece asgariyi ödersen" sub={`${core.fmtI(i.min)} ödenir, ${core.fmtI(i.carry)} devreder · faiz ~${core.fmtI(A1.faiz)}`} right={core.fmtI(A1.next)} rightSub={`asgari ~${core.fmtI(A1.min)}`} />
            <Row title="Asgarinin altında ödersen" sub={`Eksik kısma gecikme faizi (%${pcS(i.rate + core.LATE)}) işler`} right={'+%' + pcS(core.LATE)} rightSub="ek faiz" />
          </Card>
          <Text style={{ color: t.muted, fontSize: 12.5, margin: 4 }}>Sağdaki büyük tutar, o seçimle sonraki ekstrenin tahmini toplamıdır (devreden + faiz + bu dönem harcaması). Faiz tahminidir, bankanın hesabı biraz farklı çıkabilir.</Text>
        </Section>
      );
    } else {
      est = <Section title={`Sonraki ekstre · ${core.dshort(i.nextCut)} kesilir`}><Card><Row first title="Tahmini ekstre borcu" sub="Bu dönem harcaması, taksit parçaları dahil" right={core.fmtI(i.nextEst)} rightSub={`asgari ~${core.fmtI(i.nextMin)}`} /></Card></Section>;
    }
    content = (
      <>
        {est}
        {(c.vcards || []).length ? (
          <Section title="Sanal kartlar">
            <Card>{(c.vcards || []).map((v, k) => {
              const cur = ch.filter((x) => x.idx === i.cur && x.tx.vc === v.id), prev = ch.filter((x) => x.idx === i.cur - 1 && x.tx.vc === v.id);
              return <Row key={v.id} first={k === 0} lead={<Avatar name={v.name} />} title={v.name} sub={`${v.last4 ? '•••• ' + v.last4 + ' · ' : ''}açık dönem ${core.fmtI(core.sum(cur, (x) => x.amt))} · önceki ekstre ${core.fmtI(core.sum(prev, (x) => x.amt))}`} right={core.fmtI(core.sum(ch.filter((x) => x.tx.vc === v.id && x.idx <= i.cur), (x) => x.amt))} rightSub="toplam" />;
            })}</Card>
            <Text style={{ color: t.muted, fontSize: 12.5, margin: 4 }}>Sanal kartların harcamaları bu kartın borcuna ve limitine dahildir; burada ayrıca gruplanır.</Text>
          </Section>
        ) : null}
        {S.cardPay.some((p) => p.card === c.id) ? (
          <Section title="Ödemeler">
            <Card>{S.cardPay.filter((p) => p.card === c.id).slice().reverse().slice(0, 8).map((p, k) => (
              <Row key={p.id} first={k === 0} title="Kart ödemesi" sub={`${core.dshort(core.pd(p.date))}${p.from ? ' · ' + core.srcName(S, 'acc:' + p.from) : ''}`} right={'−' + core.fmtI(p.amt)}
                onPress={() => update((s) => { s.cardPay = s.cardPay.filter((x) => x.id !== p.id); })} />
            ))}</Card>
            <Text style={{ color: t.muted, fontSize: 12.5, margin: 4 }}>Bir ödemeyi silmek için ona dokun.</Text>
          </Section>
        ) : null}
      </>
    );
  }

  return (
    <Screen title={c.name} subtitle={`Kesim ${c.cutoff}. gün · Son ödeme ${c.due}. gün · Asgari %${i.minRate} · Faiz %${pcS(i.rate)}/ay`}
      headerRight={<Pressable onPress={() => setForm({ id: c.id })} accessibilityLabel="Düzenle" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="gear" color={t.ink} /></Pressable>}>
      <View style={{ backgroundColor: t.heroBg, borderRadius: 20, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: t.heroInk, fontWeight: '800', fontSize: 16 }}>Güncel borç</Text><Text style={[{ color: t.heroInk, fontWeight: '800', fontSize: 16 }, FONT_NUM]}>{core.fmtI(i.currentDebt)}</Text></View>
        <View style={{ marginVertical: 10, height: 8, borderRadius: 9, backgroundColor: 'rgba(127,127,127,0.3)', overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.min(100, i.util * 100)}%`, backgroundColor: t.heroInk, borderRadius: 9 }} /></View>
        <Text style={[{ color: t.heroInk, opacity: 0.7, fontSize: 12, marginBottom: 12 }, FONT_NUM]}>Limit {core.fmtI(c.limit)} · Kullanılan {core.fmtI(i.used)} · Kalan {core.fmtI(i.avail)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {dark(i.pastDue ? `Devreden borç (son ödeme ${core.dshort(i.due)} geçti)` : i.closedDebt > 0.5 ? `Ödenecek ekstre (son ödeme ${core.dshort(i.due)})` : 'Ödenecek ekstre', core.fmtI(i.closedDebt))}
          {dark(`Bu dönem harcaması (${core.dshort(i.nextCut)} kesilir)`, core.fmtI(i.openDebt))}
          {dark('Kalan taksitler', core.fmtI(i.future))}
          {dark('Sonraki ekstre' + (i.closedDebt > 0.5 && !i.pastDue ? ' (bu ekstreyi tamamen ödersen)' : ' tahmini'), core.fmtI(i.nextEst))}
        </View>
      </View>
      {missingDebt ? <View style={{ marginTop: 10 }}><Note tone="warn">Kesilmiş ekstre borcunu yazmadın. Kalan limit olduğundan yüksek görünüyor. "Bankadan güncelle" ekranında "Son ekstreden kalan borç" kutusuna bankadaki tutarı yaz.</Note></View> : null}
      <BtnRow><Btn kind="pri" title="Kart borcu öde" full onPress={() => setPay(true)} /><Btn title="Bu karta harcama" full onPress={() => nav.openExpense({ preset: { src: 'card:' + c.id } })} /></BtnRow>
      <BtnRow><Btn title="Bankadan güncelle (Excel / PDF)" full onPress={() => setSync(true)} /></BtnRow>
      <View style={{ marginTop: 14 }}><Chips value={tab} onChange={(v) => { setTab(v); setCcat(''); }} options={TABS} /></View>
      {content}
      <PaySheet open={pay} cardId={c.id} onClose={() => setPay(false)} />
      <CardForm req={form} onClose={() => setForm(null)} onDeleted={() => nav.go('cards')} />
      <SyncSheet cardId={sync ? c.id : null} onClose={() => setSync(false)} />
      <CategorizeSheet req={catReq} onClose={() => setCatReq(null)} />
    </Screen>
  );
}

export function PaySheet({ open, cardId, onClose }: { open: boolean; cardId: string; onClose: () => void }) {
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
      <View style={{ marginBottom: 12 }}><Chips value="" onChange={(v) => setAmt(core.nv(+v))} options={[...(i.min > 0 ? [[i.min.toFixed(2), `Asgari ${core.fmtI(i.min)}`] as [string, string]] : []), [i.closedDebt.toFixed(2), `${i.pastDue ? 'Devreden borç' : 'Ekstre'} ${core.fmtI(i.closedDebt)}`], [i.currentDebt.toFixed(2), `Tüm borç ${core.fmtI(i.currentDebt)}`]]} /></View>
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
  const [minA, setMinA] = useState('1'), [min, setMin] = useState('20'), [rateA, setRateA] = useState('1'), [rate, setRate] = useState('4');
  const [last4, setLast4] = useState(''), [vcs, setVcs] = useState<{ id: string; name: string; last4: string }[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    if (!req) return;
    setName(c?.name || ''); setLimit(c ? core.nv(c.limit) : ''); setCut(c ? String(c.cutoff) : ''); setDue(c ? String(c.due) : '');
    setMinA(c && c.minAuto === false ? '0' : '1'); setMin(String(c?.minRate ?? 20)); setRateA(c && c.rateAuto === false ? '0' : '1'); setRate(String(c?.rate ?? 4));
    setLast4(c?.last4 || ''); setVcs((c?.vcards || []).map((v) => ({ id: v.id, name: v.name, last4: v.last4 || '' }))); setConfirmDel(false);
  }, [req]); // eslint-disable-line
  if (!req) return null;
  const lim = core.num(limit);
  const save = () => {
    const n = name.trim(), cu = Math.round(core.num(cut)), du = Math.round(core.num(due));
    if (!n || !(cu >= 1 && cu <= 31) || !(du >= 1 && du <= 31)) { toast('Ad, kesim ve son ödeme günü gerekli'); return; }
    const vcards = vcs.map((v) => ({ id: v.id, name: v.name.trim(), last4: v.last4.replace(/\D/g, '').slice(-4) })).filter((v) => v.name);
    const o = { name: n, limit: lim, cutoff: cu, due: du, minAuto: minA !== '0', minRate: core.num(min) || 20, rateAuto: rateA !== '0', rate: core.num(rate), last4: last4.replace(/\D/g, '').slice(-4), vcards };
    update((s) => {
      if (c) {
        const x = core.find(s.cards, c.id)!;
        const gone = (x.vcards || []).map((v) => v.id).filter((id) => !vcards.some((v) => v.id === id));
        if (gone.length) s.tx.forEach((tx) => { if (tx.src === 'card:' + c.id && tx.vc && gone.includes(tx.vc)) delete tx.vc; });
        Object.assign(x, o);
      } else s.cards.push({ id: core.uid(), since: core.today(), openDebt: 0, ...o });
    });
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
      <Field label="Kartın son 4 hanesi (isteğe bağlı, Excel/PDF ekstresini eşleştirmek için)" value={last4} onChange={setLast4} placeholder="örn. 5293" />
      <View style={{ marginBottom: 12 }}>
        <Label>Sanal kartlar (bu kartın limitini ve ekstresini paylaşır)</Label>
        {vcs.map((v, k) => (
          <View key={v.id} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 2 }}><Field label="" value={v.name} onChange={(x) => setVcs(vcs.map((y, j) => (j === k ? { ...y, name: x } : y)))} placeholder="Ad (örn. Netflix kartı)" /></View>
            <View style={{ flex: 1 }}><Field label="" value={v.last4} onChange={(x) => setVcs(vcs.map((y, j) => (j === k ? { ...y, last4: x } : y)))} placeholder="Son 4 hane" /></View>
          </View>
        ))}
        <Btn small title="+ Sanal kart ekle" onPress={() => setVcs([...vcs, { id: core.uid(), name: '', last4: '' }])} />
      </View>
      <Text style={{ color: t.muted, fontSize: 12.5, marginBottom: 12 }}>
        Kartın borcunu ve harcamalarını eklemek için kartı kaydettikten sonra kart ayrıntısındaki "Bankadan güncelle" düğmesini kullan.
      </Text>
    </Sheet>
  );
}
