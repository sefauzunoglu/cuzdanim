import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as core from '../core';
import { useApp } from '../store';
import { useNav } from '../nav';
import { useTheme } from '../theme';
import { Card, CatLead, Chips, Empty, Kpi, Row, Section } from '../ui/kit';
import { Screen } from '../ui/chrome';
import { Icon } from '../ui/icons';

type Group = 'day' | 'card' | 'cat';

export function Spend() {
  const { S } = useApp(), nav = useNav(), t = useTheme();
  const [month, setMonth] = useState(core.ymOf(new Date()));
  const [filter, setFilter] = useState('all');
  const [group, setGroup] = useState<Group>('day');
  const ps = core.monthParts(S, month).sort((a, b) => core.pd(b.tx.date).getTime() - core.pd(a.tx.date).getTime());
  const list = filter === 'all' ? ps : ps.filter((p) => p.tx.src === filter);
  const tot = core.sum(list, (p) => p.amt), inc = core.monthIncome(S, month);
  const cat: Record<string, number> = {};
  list.forEach((p) => { cat[p.tx.cat] = (cat[p.tx.cat] || 0) + p.amt; });
  const cats = Object.entries(cat).sort((a, b) => b[1] - a[1]);
  const sources: [string, string][] = [['all', 'Tümü'], ...S.cards.map((c) => ['card:' + c.id, c.name] as [string, string]), ...S.accounts.map((a) => ['acc:' + a.id, a.name] as [string, string])];

  const row = (p: core.Part, first: boolean) => (
    <Row key={p.tx.id + ':' + p.k} first={first} lead={<CatLead cat={p.tx.cat} />}
      title={`${p.tx.note || p.tx.cat}${p.tx.sub ? ' · ' + p.tx.sub : ''}`}
      sub={`${p.tx.cat} · ${core.dshort(core.pd(p.tx.date))} · ${core.srcName(S, p.tx.src)}${p.n > 1 ? ` · ${p.k + 1}/${p.n}. taksit` : ''}`}
      right={core.fmt(p.amt)} rightSub={p.n > 1 ? `toplam ${core.fmtI(p.tx.amt)}` : undefined}
      onPress={() => nav.openExpense({ tx: p.tx })} />
  );
  const groupCard = (title: string, sub: string | undefined, total: number, items: core.Part[], lead?: React.ReactNode) => (
    <Card key={title}>
      <Row first lead={lead} title={title} sub={sub} right={core.fmtI(total)} />
      {items.map((p, i) => row(p, false))}
    </Card>
  );

  let body: React.ReactNode;
  if (!list.length) body = <Card><Empty title="Bu ay harcama yok" text="Alttaki + düğmesiyle bir harcama ekle." /></Card>;
  else if (group === 'card') {
    const keys = [...new Set(list.map((p) => p.tx.src))].sort();
    body = keys.map((k) => {
      const g = list.filter((p) => p.tx.src === k), c: Record<string, number> = {};
      g.forEach((p) => { c[p.tx.cat] = (c[p.tx.cat] || 0) + p.amt; });
      return groupCard(core.srcName(S, k), Object.entries(c).sort((a, b) => b[1] - a[1]).map(([n, v]) => n + ' ' + core.fmtI(v)).join(' · '), core.sum(g, (p) => p.amt), g);
    });
  } else if (group === 'cat') body = cats.map(([n]) => { const g = list.filter((p) => p.tx.cat === n); return groupCard(n, undefined, core.sum(g, (p) => p.amt), g, <CatLead cat={n} />); });
  else body = <Card>{list.map((p, i) => row(p, i === 0))}</Card>;

  return (
    <Screen title="Harcamalar">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable onPress={() => setMonth(month - 1)} accessibilityLabel="Önceki ay" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="back" color={t.ink} /></Pressable>
        <Text style={{ color: t.ink, fontSize: 16, fontWeight: '700' }}>{core.ymLabel(month)}</Text>
        <Pressable onPress={() => setMonth(month + 1)} accessibilityLabel="Sonraki ay" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="chev" color={t.ink} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Kpi label="Harcama" value={core.fmtI(tot)} /><Kpi label="Gelir" value={core.fmtI(inc)} tone="good" /><Kpi label="Fark" value={core.fmtI(inc - tot)} tone={inc - tot < 0 ? 'bad' : 'good'} />
      </View>
      <Section>
        <Chips scroll value={filter} onChange={setFilter} options={sources} />
        <View style={{ height: 6 }} />
        <Chips value={group} onChange={setGroup} options={[['day', 'Güne göre'], ['card', 'Karta göre'], ['cat', 'Kategoriye göre']]} />
      </Section>
      {cats.length ? (
        <Section title="Kategoriler">
          <Card>
            {cats.slice(0, 6).map(([n, v]) => (
              <View key={n} style={{ marginVertical: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: t.ink, fontSize: 13.5 }}>{n}</Text><Text style={{ color: t.ink, fontWeight: '700' }}>{core.fmtI(v)}</Text></View>
                <View style={{ height: 8, borderRadius: 9, backgroundColor: t.surface2, overflow: 'hidden' }}><View style={{ height: '100%', width: `${(v / cats[0][1]) * 100}%`, backgroundColor: t.cats[core.catIndex(n)], borderRadius: 9 }} /></View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}
      <Section title="Hareketler">{body}</Section>
    </Screen>
  );
}
