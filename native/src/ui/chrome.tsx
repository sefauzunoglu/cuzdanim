import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { MAIN, useNav, View as ViewName } from '../nav';
import { useApp } from '../store';
import { Icon } from './icons';

export const TAB_H = 64;

/** Sayfa başlığı: ana sekmelerde sağda "Daha fazla", alt sayfalarda sol üstte geri düğmesi. */
export function Screen({ title, subtitle, children, headerRight }: { title: string; subtitle?: string; children: React.ReactNode; headerRight?: React.ReactNode }) {
  const t = useTheme(), nav = useNav(), ins = useSafeAreaInsets();
  const main = MAIN.includes(nav.view);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: ins.top + 8, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.bg }}>
        {!main ? <Pressable onPress={nav.back} accessibilityLabel="Geri" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="back" color={t.ink} /></Pressable> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
          {subtitle ? <Text style={{ color: t.muted, fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
        {headerRight}
        {main ? <Pressable onPress={() => nav.go('more')} accessibilityLabel="Daha fazla" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="grid" color={t.ink} /></Pressable> : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_H + ins.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const TABS: [ViewName | '', string, string][] = [['home', 'Özet', 'home'], ['spend', 'Harcama', 'list'], ['', '', 'plus'], ['cards', 'Kartlar', 'card'], ['debts', 'Borçlar', 'debt']];

export function TabBar() {
  const t = useTheme(), nav = useNav(), ins = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.line, paddingBottom: ins.bottom, flexDirection: 'row', height: TAB_H + ins.bottom }}>
      {TABS.map(([k, l, i]) => {
        if (k === '') return (
          <View key="fab" style={{ flex: 1, alignItems: 'center' }}>
            <Pressable onPress={() => nav.openExpense()} accessibilityLabel="Harcama ekle" style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginTop: -22, shadowColor: t.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
              <Icon name="plus" size={28} color={t.accentInk} width={2.4} />
            </Pressable>
          </View>
        );
        const on = nav.view === k || (k === 'cards' && nav.view === 'cardDetail');
        return (
          <Pressable key={k} onPress={() => nav.go(k as ViewName)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Icon name={i} size={23} color={on ? t.accent : t.muted} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: on ? t.accent : t.muted }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toast() {
  const { message } = useApp(), t = useTheme(), ins = useSafeAreaInsets();
  if (!message) return null;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: TAB_H + ins.bottom + 16, alignItems: 'center' }}><View style={{ backgroundColor: t.ink, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 10 }}><Text style={{ color: t.bg, fontWeight: '600', textAlign: 'center' }}>{message}</Text></View></View>;
}
