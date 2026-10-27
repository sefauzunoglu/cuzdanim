import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNav, View as ViewName } from '../nav';
import { useTheme } from '../theme';
import { Screen } from '../ui/chrome';
import { Icon } from '../ui/icons';

const ITEMS: [ViewName, string, string, string][] = [
  ['income', 'income', 'Gelir ve transfer', 'Maaş, havale, para transferleri'],
  ['fixed', 'fixed', 'Sabit giderler', 'Kira, fatura, abonelik'],
  ['car', 'car', 'Araba', 'Yakıt, bakım, sigorta, kart bağlantısı'],
  ['gun', 'wallet', 'Altın / para günü', 'Aylık ödeme ve alacak takibi'],
  ['scen', 'scen', 'Borçtan çıkış', 'Senaryoları dene'],
  ['acc', 'wallet', 'Hesaplar', 'Nakit nereye gidiyor'],
  ['set', 'gear', 'Ayarlar', 'Yedekle, geri yükle'],
];

export function More() {
  const nav = useNav(), t = useTheme();
  return (
    <Screen title="Daha fazla">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ITEMS.map(([v, i, title, sub]) => (
          <Pressable key={v} onPress={() => nav.go(v)} style={{ width: '48.5%', minHeight: 92, backgroundColor: t.surface, borderRadius: 16, padding: 14, gap: 6 }}>
            <Icon name={i} size={26} color={t.accent} />
            <Text style={{ color: t.ink, fontWeight: '700', fontSize: 15 }}>{title}</Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>{sub}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
