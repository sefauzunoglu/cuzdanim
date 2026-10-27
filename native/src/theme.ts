import { useColorScheme } from 'react-native';
import { useApp } from './store';

export interface Theme {
  dark: boolean;
  bg: string; surface: string; surface2: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; accentSoft: string;
  good: string; goodSoft: string; warn: string; warnSoft: string; bad: string; badSoft: string;
  heroBg: string; heroInk: string; cats: string[];
}

const light: Theme = {
  dark: false, bg: '#f1f4f2', surface: '#ffffff', surface2: '#e7ece9', ink: '#14211c', muted: '#5b6a63', line: '#dbe2de',
  accent: '#2347c5', accentInk: '#ffffff', accentSoft: '#e3e9fb',
  good: '#16804a', goodSoft: '#dff3e8', warn: '#a96a0a', warnSoft: '#faedd2', bad: '#c0352b', badSoft: '#fbe3e0',
  heroBg: '#14211c', heroInk: '#f1f4f2',
  cats: ['#2347c5', '#e07a1f', '#16804a', '#b2399a', '#0d8da8', '#c0352b', '#7a5af0', '#8a8f1c', '#d1578a', '#5b6a63'],
};
const dark: Theme = {
  dark: true, bg: '#0c1210', surface: '#151e1a', surface2: '#1f2b25', ink: '#e8efeb', muted: '#92a39a', line: '#27352e',
  accent: '#8aa5ff', accentInk: '#0c1210', accentSoft: '#1c2748',
  good: '#4cd28a', goodSoft: '#14301f', warn: '#f0b84a', warnSoft: '#3a2d10', bad: '#ff7b72', badSoft: '#3b1a18',
  heroBg: '#e8efeb', heroInk: '#0c1210',
  cats: ['#8aa5ff', '#f2a05a', '#4cd28a', '#e07fcc', '#52c4de', '#ff7b72', '#a994ff', '#cfd45a', '#f08fb4', '#92a39a'],
};

/** Ayarlardaki tema seçimi (yoksa sistem) ile aktif renk paleti. */
export function useTheme(): Theme {
  const sys = useColorScheme();
  const { S } = useApp();
  const mode = S.cfg.theme;
  return (mode ? mode === 'dark' : sys === 'dark') ? dark : light;
}
export const FONT_NUM = { fontVariant: ['tabular-nums' as const] };
