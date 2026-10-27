import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import * as core from '../core';
import { useApp } from '../store';
import { useTheme, FONT_NUM } from '../theme';
import { Btn, Card, Chips, Empty, Field, Row, Section } from '../ui/kit';
import { Screen } from '../ui/chrome';

const mLab = (m: number | null) => (m == null ? 'Bitmiyor' : m < 12 ? m + ' ay' : Math.floor(m / 12) + ' yıl' + (m % 12 ? ' ' + (m % 12) + ' ay' : ''));
const endDate = (m: number | null) => { if (m == null) return '—'; const d = new Date(); d.setMonth(d.getMonth() + m); return core.MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };

export function Scenario() {
  const { S } = useApp(), t = useTheme();
  const [extra, setExtra] = useState(''), [lump, setLump] = useState(''), [strat, setStrat] = useState<core.Strategy>('avalanche');
  const ds = core.simDebts(S);
  if (!ds.length) return <Screen title="Borçtan çıkış" subtitle="Senaryo denemesi"><Card><Empty title="Senaryo için borç gerekli" text="Kart borcu, kredi veya altın borcu eklediğinde burada kapatma planını deneyebilirsin." /></Card></Screen>;
  const fc = core.freeCash(S);
  const ex = core.num(extra), lu = core.num(lump);
  const base = core.simulate(ds, 0, 'avalanche', 0, false), a = core.simulate(ds, ex, 'avalanche', lu, true), s = core.simulate(ds, ex, 'snowball', lu, true);
  const best = strat === 'avalanche' ? a : s;
  const W = 320, H = 130, L = Math.max(base.hist.length, best.hist.length, 2), mx = Math.max(...base.hist, 1);
  const pth = (h: number[]) => h.map((v, i) => (i ? 'L' : 'M') + ((i / Math.max(L - 1, 1)) * W).toFixed(1) + ' ' + (H - (v / mx) * H).toFixed(1)).join('');
  const cell = (l: string, v: string, bg: string, c?: string) => <View style={{ flex: 1, backgroundColor: bg, borderRadius: 14, padding: 10 }}><Text style={{ color: t.muted, fontSize: 11 }}>{l}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[{ color: c || t.ink, fontWeight: '700', fontSize: 16 }, FONT_NUM]}>{v}</Text></View>;
  return (
    <Screen title="Borçtan çıkış" subtitle="Senaryo denemesi">
      <Card><Text style={{ color: t.muted, fontSize: 12 }}>Toplam borç (kartlar + krediler + altın)</Text><Text style={[{ color: t.ink, fontSize: 26, fontWeight: '800' }, FONT_NUM]}>{core.fmtI(core.sum(ds, (x) => x.bal))}</Text></Card>
      <Section title="Dene">
        <Card>
          <Field label="Her ay ekstra ödeme (₺)" value={extra} onChange={setExtra} num />
          <View style={{ marginBottom: 12 }}><Chips scroll value="" onChange={(v) => setExtra(core.nv(+v))} options={[...[500, 1000, 2500, 5000, 10000].map((v) => [String(v), '+' + v.toLocaleString('tr-TR')] as [string, string]), ...(fc.free > 100 ? [[String(Math.floor(fc.free)), 'Boş paranı kullan ' + core.fmtI(fc.free)] as [string, string]] : [])]} /></View>
          <Field label="Şimdi tek seferlik ödeme (₺)" value={lump} onChange={setLump} num />
          <View style={{ marginBottom: 4 }}><Chips value={strat} onChange={setStrat} options={[['avalanche', 'Çığ: en yüksek faiz önce'], ['snowball', 'Kartopu: en küçük borç önce']]} /></View>
        </Card>
      </Section>
      <Section title="Sonuç">
        <Card>
          <View style={{ flexDirection: 'row', gap: 8 }}>{cell('Mevcut gidişat', mLab(base.months), t.surface2)}{cell('Bu plan', mLab(best.months), t.accentSoft)}{cell('Kazanç', base.ok && best.ok ? core.fmtI(base.interest - best.interest) : best.ok ? '∞' : '—', t.goodSoft, t.good)}</View>
          <Row title="Borçsuz olma tarihi" sub={`Mevcut gidişat: ${endDate(base.months)}`} right={endDate(best.months)} />
          <Row title="Ödenecek toplam faiz" sub={`Mevcut gidişat ${core.fmtI(base.interest)}`} right={core.fmtI(best.interest)} />
          <Svg width="100%" height={150} viewBox={`0 0 ${W} ${H + 18}`} style={{ marginTop: 12 }}>
            <Path d={pth(base.hist)} stroke={t.muted} strokeWidth={2} strokeDasharray="4 4" fill="none" />
            <Path d={pth(best.hist)} stroke={t.accent} strokeWidth={2.5} fill="none" />
            <SvgText x={0} y={H + 14} fontSize={10} fill={t.muted}>Bugün</SvgText>
            <SvgText x={W} y={H + 14} fontSize={10} fill={t.muted} textAnchor="end">{mLab(L - 1)}</SvgText>
          </Svg>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}><Text style={{ color: t.muted, fontSize: 12 }}>- - Sadece asgari / taksit</Text><Text style={{ color: t.accent, fontSize: 12 }}>—— Bu plan</Text></View>
        </Card>
      </Section>
      <Section title="Yöntem karşılaştırması">
        <Card>
          <Row first title="Çığ (faiz odaklı)" sub={`${mLab(a.months)} · faiz ${core.fmtI(a.interest)}`} />
          <Row title="Kartopu (küçük borç önce)" sub={`${mLab(s.months)} · faiz ${core.fmtI(s.interest)}`} />
          <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 8 }}>Çığ genellikle daha az faiz öder. Kartopu küçük borçları hızlı kapattığı için motivasyon sağlar.</Text>
        </Card>
      </Section>
      <Section title="Tahmini aylık boş para">
        <Card>
          <Row first title="Gelir" right={core.fmtI(fc.inc)} />
          <Row title="Sabit giderler" right={'−' + core.fmtI(fc.fixed)} />
          <Row title="Gelecek ay taksitleri" right={'−' + core.fmtI(fc.ins)} />
          <Row title="Kredi, borç ve altın günü ödemeleri" right={'−' + core.fmtI(fc.debtM)} />
          <Row title="Ortalama değişken harcama (3 ay)" right={'−' + core.fmtI(fc.vari)} />
          <Row title="Boş para" right={core.fmtI(fc.free)} />
        </Card>
      </Section>
      <Text style={{ color: t.muted, fontSize: 12.5, margin: 8 }}>Hesap; kart borçlarında asgari ödeme ve aylık faiz, diğer borçlarda girdiğin aylık ödeme üzerinden yapılır. Kartlarda gelecek taksitler zaten ödeme planında olduğu için dahil edilmez. Sonuçlar tahmindir.</Text>
    </Screen>
  );
}
