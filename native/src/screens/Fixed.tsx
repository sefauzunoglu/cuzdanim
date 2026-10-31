import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useTheme } from '../theme';
import { Avatar, Btn, Card, Chips, DateField, Empty, Field, Kpi, Label, Note, Pill, Row, Section, Sheet } from '../ui/kit';
import { Screen } from '../ui/chrome';

const PRE: Record<string, string[]> = { Fatura: ['Elektrik', 'Su', 'Doğalgaz', 'İnternet', 'Cep telefonu', 'Aidat'], Abonelik: ['Netflix', 'Spotify', 'YouTube Premium', 'iCloud', 'Amazon Prime', 'Disney+'], Kira: ['Kira'], Diğer: ['Sigorta', 'Okul / kurs', 'Kredi sigortası'] };
const KINDS = ['Kira', 'Fatura', 'Abonelik', 'Diğer'] as const;

export function Fixed() {
  const { S, update, toast } = useApp(), t = useTheme();
  const [form, setForm] = useState<FormReq | null>(null), [pick, setPick] = useState(false);
  const [pay, setPay] = useState<string | null>(null);
  const cm = core.ymOf(new Date()), rs = S.recurring.filter((r) => r.active !== false);
  const paidSum = core.sum(rs.filter((r) => S.recPaid[r.id + '|' + cm]), (r) => core.find(S.tx, S.recPaid[r.id + '|' + cm])?.amt ?? r.amt);
  const undo = (id: string) => { update((s) => { core.undoRecurring(s, id); }); toast('Ödeme geri alındı'); };
  return (
    <Screen title="Sabit giderler" subtitle="Kira, fatura, abonelik">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Kpi label="Aylık toplam" value={core.fmtI(core.sum(rs, (r) => r.amt))} /><Kpi label="Bu ay ödenen" value={core.fmtI(paidSum)} tone="good" /><Kpi label="Kalan" value={core.fmtI(core.sum(rs.filter((r) => !core.recDone(S, r, cm)), (r) => r.amt))} />
      </View>
      <View style={{ marginTop: 12 }}><Btn kind="pri" title="+ Sabit gider ekle" onPress={() => setPick(true)} /></View>
      {KINDS.map((k) => {
        const l = S.recurring.filter((r) => r.kind === k);
        if (!l.length) return null;
        return (
          <Section key={k} title={`${k === 'Kira' ? 'Kira' : k === 'Fatura' ? 'Faturalar' : k === 'Abonelik' ? 'Abonelikler' : 'Diğer'} · ${core.fmtI(core.sum(l.filter((r) => r.active !== false), (r) => r.amt))}/ay`}>
            <Card>{l.map((r, i) => {
              const paid = S.recPaid[r.id + '|' + cm], skipped = !!(S.recSkip || {})[r.id + '|' + cm], dd = core.daysTo(core.dateAt(cm, r.day));
              return (
                <Row key={r.id} first={i === 0} lead={<Avatar name={r.name} />} title={r.name} sub={`Her ayın ${r.day}. günü${r.src ? ' · ' + core.srcName(S, r.src) : ''}${r.auto ? ' · otomatik' : ''}`}
                  right={core.fmt(r.amt)}
                  rightSub={r.active === false ? <Pill>Pasif</Pill> : skipped ? <Pill onPress={() => { update((s) => core.unskipRecurring(s, r.id, cm)); toast('Atlama geri alındı'); }}>Bu ay atlandı</Pill> : paid ? <Pill tone="good" onPress={() => undo(r.id)}>Ödendi ✓</Pill> : <Pill tone={dd < 0 ? 'bad' : dd <= 3 ? 'warn' : 'acc'} onPress={() => (r.src ? setPay(r.id) : (toast('Önce giderin ödeme kaynağını seç'), setForm({ id: r.id })))}>{dd < 0 ? 'Gecikti · öde' : 'Öde'}</Pill>}
                  onPress={() => setForm({ id: r.id })} />
              );
            })}</Card>
          </Section>
        );
      })}
      {!S.recurring.length ? <Section><Card><Empty title="Sabit gider yok" text='Kira, elektrik, internet, abonelik gibi her ay tekrar eden giderleri ekle. "Öde" dediğinde harcama olarak kartına veya hesabına işlenir.' /></Card></Section> : null}
      <Text style={{ color: t.muted, fontSize: 12.5, margin: 8 }}>Abonelikler kredi kartıyla ödeniyorsa "Öde" harcamayı o kartın ekstresine ekler. Gideri düzenlemek için satıra dokun.</Text>
      <PayRec id={pay} onClose={() => setPay(null)} />
      <RecPick open={pick} onClose={() => setPick(false)} onChoose={(pf) => { setPick(false); setForm({ prefill: pf }); }} onManual={() => { setPick(false); setForm({ manual: true }); }} />
      <RecForm req={form} onClose={() => setForm(null)} />
    </Screen>
  );
}

export function PayRec({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { S, update, toast } = useApp();
  const r = id ? core.find(S.recurring, id) : undefined;
  const cm = core.ymOf(new Date());
  const [amt, setAmt] = useState(''), [date, setDate] = useState(core.today());
  useEffect(() => { if (r) { setAmt(core.nv(r.amt)); const d = core.dateAt(cm, r.day); setDate(core.iso(d > new Date() ? new Date() : d)); } }, [id]); // eslint-disable-line
  if (!r) return null;
  return (
    <Sheet visible title={r.name + ' ödemesi'} onClose={onClose} footer={<Btn kind="pri" full title="Kaydet" onPress={() => {
      const a = core.num(amt); if (!(a > 0)) { toast('Tutarı gir'); return; }
      let msg = 'Ödendi olarak işlendi';
      update((s) => { core.payRecurring(s, r.id, cm, a, date || core.today()); if (r.src.startsWith('card:')) { const c = core.find(s.cards, r.src.slice(5)); if (c) msg = `${c.name} güncel borcu ${core.fmtI(core.cardInfo(s, c).currentDebt)}`; } });
      onClose(); toast(msg);
    }} />}>
      <Field label="Tutar (₺)" value={amt} onChange={setAmt} num big />
      <DateField label="Tarih" value={date} onChange={setDate} />
      <Text style={{ opacity: 0.7, fontSize: 12.5, marginBottom: 12 }}>{core.srcName(S, r.src)} kaynağından harcama olarak işlenir. Faturan değiştiyse tutarı güncelleyebilirsin.</Text>
      <Btn small title="Bu ay yenilenmedi / atla" onPress={() => { update((s) => core.skipRecurring(s, r.id, cm)); onClose(); toast('Bu ay atlandı, borca ve listeye eklenmez'); }} />
    </Sheet>
  );
}

interface Prefill { name: string; key: string; amt: number; day: number; src: string; kind: core.Recurring['kind']; fromTx: string }
type FormReq = { id?: string; prefill?: Prefill; manual?: boolean };

/** Sabit gider ekle: önce kartındaki harcamalardan seç (öneriler, arama); listede yoksa elle ekle. */
function RecPick({ open, onClose, onChoose, onManual }: { open: boolean; onClose: () => void; onChoose: (p: Prefill) => void; onManual: () => void }) {
  const { S } = useApp(), t = useTheme();
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;
  const gs = core.recPickGroups(S), qq = q.trim().toLowerCase();
  const shown = gs.filter((g) => !qq || (g.name + ' ' + g.last.cat).toLowerCase().includes(qq));
  const row = (g: core.RecPickGroup, first: boolean) => (
    <Row key={g.k} first={first} title={core.mNice(g.name)} sub={g.dup ? 'Zaten sabit giderlerde' : `Son: ${core.dshort(core.pd(g.last.date))} · ${g.last.cat}${g.months > 1 ? ' · ' + g.months + ' ay' : ''}`} right={core.fmtI(g.last.amt)} onPress={() => onChoose(core.recPrefill(g))} />
  );
  const sug = shown.filter((g) => g.sug), rest = shown.filter((g) => !g.sug);
  return (
    <Sheet visible title="Sabit gider ekle" onClose={onClose} footer={<Btn full title="Elle ekle" onPress={onManual} />}>
      <Note>Kartındaki harcamalardan seç, bilgileri ben doldururum. Listede yoksa en alttan elle ekle.</Note>
      <Field label="İşyeri ara" value={q} onChange={setQ} placeholder="örn. Netflix, Turkcell" />
      {sug.length ? <><Label>Önerilenler</Label><Card>{sug.map((g, k) => row(g, k === 0))}</Card></> : null}
      {rest.length ? <><Label>Tüm harcamalar</Label><Card>{rest.map((g, k) => row(g, k === 0))}</Card></> : null}
      {!gs.length ? <Text style={{ color: t.muted }}>Henüz kart harcaması yok. Önce Bankadan güncelle ile ekstre yükleyebilir veya elle ekleyebilirsin.</Text> : null}
    </Sheet>
  );
}

function RecForm({ req, onClose }: { req: FormReq | null; onClose: () => void }) {
  const { S, update, toast } = useApp(), t = useTheme();
  const x = req?.id ? core.find(S.recurring, req.id) : undefined, pf = req?.prefill;
  const [kind, setKind] = useState<string>('Fatura'), [name, setName] = useState(''), [key, setKey] = useState(''), [amt, setAmt] = useState(''), [day, setDay] = useState(''), [src, setSrc] = useState(''), [auto, setAuto] = useState('0'), [act, setAct] = useState('1'), [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!req) return;
    setKind(x?.kind || pf?.kind || 'Fatura'); setName(x?.name || pf?.name || ''); setKey(x?.key || pf?.key || '');
    setAmt(x ? core.nv(x.amt) : pf ? core.nv(pf.amt) : ''); setDay(x ? String(x.day) : pf ? String(pf.day) : '');
    setSrc(x ? x.src : pf ? pf.src : (S.cards[0] ? 'card:' + S.cards[0].id : S.accounts[0] ? 'acc:' + S.accounts[0].id : ''));
    setAuto(x?.auto ? '1' : '0'); setAct(x && x.active === false ? '0' : '1'); setConfirm(false);
  }, [req]); // eslint-disable-line
  if (!req) return null;
  const sources: [string, string][] = [['', 'Seçilmedi'], ...S.cards.map((c) => ['card:' + c.id, c.name] as [string, string]), ...S.accounts.map((a) => ['acc:' + a.id, a.name] as [string, string])];
  const save = () => {
    const a = core.num(amt), dy = Math.round(core.num(day)), n = name.trim();
    if (!n || !(dy >= 1 && dy <= 31)) { toast('Ad ve gün gerekli'); return; }
    const isAuto = auto === '1'; if (isAuto && !src) { toast('Otomatik işlemek için ödeme kaynağı seç'); return; }
    update((s) => { core.saveRecurring(s, { id: x?.id, kind: kind as core.Recurring['kind'], name: n, key, amt: a, day: dy, src, auto: isAuto, active: x ? act === '1' : undefined, fromTx: pf?.fromTx }); });
    onClose();
  };
  return (
    <Sheet visible title={x ? 'Sabit gideri düzenle' : 'Sabit gider ekle'} onClose={onClose}
      footer={confirm ? <><Btn title="Vazgeç" onPress={() => setConfirm(false)} /><Btn kind="danger" full title="Evet, sil" onPress={() => { update((s) => { s.recurring = s.recurring.filter((r) => r.id !== x!.id); }); onClose(); }} /></>
        : <>{x ? <Btn kind="danger" title="Sil" onPress={() => setConfirm(true)} /> : null}<Btn kind="pri" full title="Kaydet" onPress={save} /></>}>
      <View style={{ marginBottom: 12 }}><Label>Tür</Label><Chips value={kind} onChange={setKind} options={KINDS.map((k) => [k, k] as [string, string])} /></View>
      <View style={{ marginBottom: 12 }}><Label>Hızlı seç</Label><Chips value="" onChange={setName} options={(PRE[kind] || []).map((n) => [n, n] as [string, string])} /></View>
      <Field label="Ad" value={name} onChange={setName} />
      <Field label="Bankada nasıl yazar? (isteğe bağlı)" value={key} onChange={setKey} placeholder="örn. NETFLIX, TURKCELL" />
      <Text style={{ color: t.muted, fontSize: 12.5, marginTop: -6, marginBottom: 12 }}>Excel/PDF'te bu yazıyı görünce o ayın gideri ödendi sayılır, çift eklenmez. Boş bırakırsan ad kullanılır.</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Aylık tutar (₺)" value={amt} onChange={setAmt} num /></View><View style={{ flex: 1 }}><Field label="Ayın günü" value={day} onChange={setDay} num placeholder="1-31" /></View></View>
      <View style={{ marginBottom: 12 }}><Label>Nereden ödenir?</Label><Chips value={src} onChange={setSrc} options={sources} /></View>
      <View style={{ marginBottom: 12 }}><Label>Ödeme günü gelince</Label><Chips value={auto} onChange={setAuto} options={[['0', 'Elle onaylarım'], ['1', 'Otomatik işle']]} /></View>
      <Text style={{ color: t.muted, fontSize: 12.5, marginBottom: 12 }}>Tutarı sabit olan giderlerde (kira, abonelik) otomatik işlemeyi seç. Tutarı her ay değişen faturalarda elle onaylamak daha doğru olur. Otomatik için ödeme kaynağı seçmelisin.</Text>
      {x ? <View style={{ marginBottom: 12 }}><Label>Durum</Label><Chips value={act} onChange={setAct} options={[['1', 'Aktif'], ['0', 'İptal ettim (durdur)']]} /></View> : null}
    </Sheet>
  );
}
