import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme, FONT_NUM } from '../theme';
import { Avatar, Bar, Btn, BtnRow, Card, Empty, Kpi, Pill, Row, Section, Sheet, Tip, utilTone } from '../ui/kit';
import { Screen } from '../ui/chrome';
import { demoData } from '../core';
import { PaySheet } from './Cards';
import { PayRec } from './Fixed';
import { GotSheet } from './Income';
import { DebtPay } from './Debts';

export function Home() {
  const { S, replace, toast } = useApp(), nav = useNav(), t = useTheme();
  const [allTips, setAllTips] = useState(false);
  const [pay, setPay] = useState<{ k: string; id: string; m?: number } | null>(null);
  const empty = !S.cards.length && !S.accounts.length && !S.debts.length && !S.tx.length;
  if (empty) {
    return (
      <Screen title="Özet">
        <Card>
          <Empty title="Hoş geldin" text="Önce bir hesap veya kart ekle, sonra harcamalarını gir. İstersen önce örnek verilerle uygulamayı gezebilirsin." />
          <BtnRow><Btn kind="pri" title="Kart ekle" full onPress={() => nav.go('cards')} /><Btn title="Nakit / hesap ekle" full onPress={() => nav.go('acc')} /></BtnRow>
          <BtnRow><Btn title="Örnek veriyle dene" full onPress={() => { replace(demoData()); toast('Örnek veri yüklendi'); }} /></BtnRow>
        </Card>
      </Screen>
    );
  }
  const tot = core.totals(S), cm = core.ymOf(new Date());
  const inc = core.monthIncome(S, cm), exp = core.sum(core.monthParts(S, cm), (p) => p.amt);
  const up = core.upcoming(S, 14), tips = core.advice(S);
  const mt = S.meta || {};
  const ago = mt.lastBackup ? Math.round((core.midnight(new Date()).getTime() - core.pd(mt.lastBackup).getTime()) / 864e5) : null;
  const fc = core.instForecast(S);
  const mx = Math.max(1, ...fc.map((f) => f.amt));
  return (
    <Screen title="Özet">
      {mt.demo ? (
        <Tip level="warn" title="Örnek veriyle geziyorsun" text="Buradaki kartlar ve rakamlar sana ait değil. Kendi verini girmek için örnekleri sil."
          onPress={() => { replace(core.emptyData()); toast('Temizlendi. Önce bir kart veya hesap ekle'); }} />
      ) : (S.tx.length >= 3 || S.cards.length) && (ago === null || ago >= 7) ? (
        <Tip level="warn" title="Yedek zamanı" text={`${ago === null ? 'Henüz yedek almadın.' : ago + ' gündür yedek almadın.'} Telefon verisi silinirse geri dönüş yok. Yedeği Dosyalar veya iCloud'a kaydet.`} onPress={() => nav.go('set')} />
      ) : null}
      <View style={{ backgroundColor: t.heroBg, borderRadius: 22, padding: 18 }}>
        <Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Toplam borç</Text>
        <Text style={[{ color: t.heroInk, fontSize: 36, fontWeight: '800', letterSpacing: -1, marginVertical: 2, marginBottom: 10 }, FONT_NUM]}>{core.fmtI(tot.total)}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[core.fmtI(tot.cardDebt), 'Kart borcu'], [core.fmtI(tot.other), 'Kredi / altın / diğer'], [core.fmtI(tot.inst), 'Kalan taksitler']].map(([v, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: 'rgba(127,127,127,0.2)', borderRadius: 12, padding: 8, minWidth: 0 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[{ color: t.heroInk, fontWeight: '700', fontSize: 15 }, FONT_NUM]}>{v}</Text>
              <Text style={{ color: t.heroInk, opacity: 0.7, fontSize: 11 }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
      <Section>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Kpi label="Nakit varlık" value={core.fmtI(tot.cash)} />
          <Kpi label={`${core.MS[cm % 12]} gelir`} value={core.fmtI(inc)} tone="good" />
          <Kpi label={`${core.MS[cm % 12]} gider`} value={core.fmtI(exp)} />
        </View>
      </Section>
      {tips.length ? (
        <Section title="Öneriler">
          {tips.slice(0, 5).map((x, i) => <Tip key={i} level={x.l} title={x.t} text={x.s} onPress={() => x.go && nav.go(x.go as any)} />)}
          {tips.length > 5 ? <Pressable onPress={() => setAllTips(true)}><Text style={{ color: t.accent, fontWeight: '600', margin: 2 }}>{tips.length - 5} öneri daha: hepsini gör</Text></Pressable> : null}
        </Section>
      ) : null}
      <Section title="Yaklaşan (14 gün)">
        <Card>
          {up.length ? up.map((u, i) => {
            const dd = core.daysTo(u.d), lab = dd < 0 ? (u.out ? `${-dd} gün gecikti` : 'Bekleniyor') : dd === 0 ? 'Bugün' : dd === 1 ? 'Yarın' : dd + ' gün';
            const tone = dd < 0 && u.out ? 'bad' : dd <= 3 && u.out ? 'warn' : 'neutral';
            return <Row key={i} first={i === 0} lead={<Avatar name={u.t} />} title={u.t} sub={`${core.dshort(u.d)} · ${u.s}`} right={(u.out ? '' : '+') + core.fmtI(u.amt)} rightSub={<Pill tone={tone as any}>{lab}</Pill>} onPress={() => { if (u.k === 'gun' || u.k === 'gunr') nav.go('gun'); else setPay({ k: u.k, id: u.id, m: u.m }); }} />;
          }) : <Empty title="Önümüzdeki 14 gün sakin" text="Yaklaşan ödeme veya gelir yok." />}
        </Card>
      </Section>
      <Section title="Kartlar" action="Tümü" onAction={() => nav.go('cards')}>
        {S.cards.length ? S.cards.map((c, i) => {
          const x = tot.ci[i];
          return (
            <Card key={c.id} onPress={() => nav.openCard(c.id)}>
              <Row first lead={<Avatar name={c.name} />} title={c.name} sub={`Kalan limit ${core.fmtI(x.avail)}`} right={core.fmtI(x.currentDebt)} rightSub="güncel borç" />
              <Bar value={x.util} tone={utilTone(x.util)} />
            </Card>
          );
        }) : <Card><Empty title="Kart yok" text="Kredi kartlarını ekleyince limit ve ekstre tahminlerini burada görürsün." /></Card>}
      </Section>
      <Section title="Gelecek taksit yükü">
        <Card>
          {fc.some((f) => f.amt > 0) ? (
            <>
              <Svg width="100%" height={150} viewBox="0 0 320 142">
                {fc.map((f, i) => {
                  const h = (f.amt / mx) * 98, x = i * (320 / 6) + 8, w = 320 / 6 - 16;
                  return (
                    <React.Fragment key={i}>
                      <Rect x={x} y={120 - h} width={w} height={Math.max(h, 1)} rx={5} fill={t.accent} opacity={i ? 0.75 : 1} />
                      <SvgText x={x + w / 2} y={116 - h} fontSize={10} fill={t.muted} textAnchor="middle">{f.amt ? Math.round(f.amt).toLocaleString('tr-TR') : ''}</SvgText>
                      <SvgText x={x + w / 2} y={136} fontSize={10} fill={t.muted} textAnchor="middle">{core.MS[f.ym % 12]}</SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
              <Text style={{ color: t.muted, fontSize: 12.5 }}>Gelecek aylarda kartlarına yansıyacak taksit tutarları (₺).</Text>
            </>
          ) : <Empty title="Taksit yok" text="Taksitli bir harcama girince gelecek aylara etkisi burada görünür." />}
        </Card>
      </Section>
      <PaySheet open={pay?.k === 'card'} cardId={pay?.id || ''} onClose={() => setPay(null)} />
      <PayRec id={pay?.k === 'rec' ? pay.id : null} onClose={() => setPay(null)} />
      <GotSheet id={pay?.k === 'inc' ? pay.id : null} onClose={() => setPay(null)} />
      <DebtPay id={pay?.k === 'debt' ? pay.id : null} onClose={() => setPay(null)} />
      <Sheet visible={allTips} title="Tüm öneriler" onClose={() => setAllTips(false)}>
        {tips.map((x, i) => <Tip key={i} level={x.l} title={x.t} text={x.s} onPress={() => { setAllTips(false); if (x.go) nav.go(x.go as any); }} />)}
      </Sheet>
    </Screen>
  );
}
