import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store';
import { NavProvider, useNav } from './src/nav';
import { useTheme } from './src/theme';
import { TabBar, Toast, Screen } from './src/ui/chrome';
import { Home } from './src/screens/Home';
import { Spend } from './src/screens/Spend';
import { ExpenseSheet } from './src/ExpenseSheet';
import { Card, Empty } from './src/ui/kit';

function Soon({ title }: { title: string }) {
  return <Screen title={title}><Card><Empty title="Bu ekran yakında" text="React Native sürümünde bu ekran henüz hazır değil. Şimdilik web uygulamasını kullanmaya devam et." /></Card></Screen>;
}

function Router() {
  const nav = useNav();
  switch (nav.view) {
    case 'home': return <Home />;
    case 'spend': return <Spend />;
    case 'cards': case 'cardDetail': return <Soon title="Kartlar" />;
    case 'debts': return <Soon title="Borçlar" />;
    default: return <Soon title="Daha fazla" />;
  }
}

function Shell() {
  const { ready } = useApp(), t = useTheme();
  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.accent} /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Router />
      <TabBar />
      <Toast />
      <ExpenseSheet />
    </View>
  );
}

export default function App() {
  return <SafeAreaProvider><AppProvider><NavProvider><Shell /></NavProvider></AppProvider></SafeAreaProvider>;
}
