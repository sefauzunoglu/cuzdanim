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
import { Cards, CardDetail } from './src/screens/Cards';
import { Debts } from './src/screens/Debts';
import { More } from './src/screens/More';
import { Settings } from './src/screens/Settings';
import { Accounts } from './src/screens/Accounts';
import { Fixed } from './src/screens/Fixed';
import { Income } from './src/screens/Income';
import { Car } from './src/screens/Car';
import { Gun } from './src/screens/Gun';
import { Scenario } from './src/screens/Scenario';
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
    case 'cards': return <Cards />;
    case 'cardDetail': return <CardDetail />;
    case 'debts': return <Debts />;
    case 'more': return <More />;
    case 'set': return <Settings />;
    case 'acc': return <Accounts />;
    case 'fixed': return <Fixed />;
    case 'income': return <Income />;
    case 'car': return <Car />;
    case 'gun': return <Gun />;
    case 'scen': return <Scenario />;
    default: return <Soon title="Bu ekran" />;
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
