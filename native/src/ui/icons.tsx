import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Çizgi simgeleri (24x24). PWA'daki simgelerle aynı yollar. */
const ICO: Record<string, string> = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6 15h4"/>',
  debt: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v1.5M12 16.5V18"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  cart: '<circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M3 4h2l2.4 10h10l2-7H6.5"/>',
  food: '<path d="M7 3v7a2 2 0 01-4 0V3M5 3v18M17 3c-2.5 2-3 5-3 8h3v10"/>',
  bus: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 20v-3M16 20v-3M8.5 14h.01M15.5 14h.01"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  shirt: '<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 01-8 0z"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19a2 2 0 012-2h13"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  income: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  fixed: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18M7 16v3M17 16v3M7 12h.01M17 12h.01"/>',
  scen: '<path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-7"/>',
  wallet: '<path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM4 7l12-3v3M16 13.5h.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};

type El = { tag: 'path' | 'circle' | 'rect'; props: Record<string, string> };
const cache: Record<string, El[]> = {};
function parse(name: string): El[] {
  if (cache[name]) return cache[name];
  const out: El[] = [];
  const re = /<(path|circle|rect)\s+([^/>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ICO[name] || ICO.dots))) {
    const props: Record<string, string> = {};
    m[2].replace(/([a-z]+)="([^"]*)"/g, (_, k, v) => { props[k] = v; return ''; });
    out.push({ tag: m[1] as El['tag'], props });
  }
  return (cache[name] = out);
}

export function Icon({ name, size = 22, color, width = 1.8 }: { name: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {parse(name).map((e, i) => (e.tag === 'path' ? <Path key={i} d={e.props.d} /> : e.tag === 'circle'
        ? <Circle key={i} cx={+e.props.cx} cy={+e.props.cy} r={+e.props.r} />
        : <Rect key={i} x={+e.props.x} y={+e.props.y} width={+e.props.width} height={+e.props.height} rx={+(e.props.rx || 0)} />))}
    </Svg>
  );
}
