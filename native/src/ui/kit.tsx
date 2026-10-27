import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, ViewStyle, TextStyle } from 'react-native';
import { useTheme, FONT_NUM } from '../theme';
import { Icon } from './icons';
import { CATICO, catIndex, formatAmountInput } from '../core';
import { useApp } from '../store';

export const SP = { gutter: 16 };

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const s = [{ backgroundColor: t.surface, borderRadius: 18, padding: 14, marginBottom: 10, shadowColor: '#14211c', shadowOpacity: t.dark ? 0 : 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: t.dark ? 0 : 2 }, style];
  return onPress ? <Pressable onPress={onPress} style={s}>{children}</Pressable> : <View style={s}>{children}</View>;
}

export function Section({ title, action, onAction, children }: { title?: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 18 }}>
      {title ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: t.muted }}>{title}</Text>
          {action ? <Pressable onPress={onAction} hitSlop={10}><Text style={{ fontSize: 13, fontWeight: '600', color: t.accent }}>{action}</Text></Pressable> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Txt({ children, style, num, bold, muted, small, color }: { children: React.ReactNode; style?: TextStyle; num?: boolean; bold?: boolean; muted?: boolean; small?: boolean; color?: string }) {
  const t = useTheme();
  return <Text style={[{ color: color || (muted ? t.muted : t.ink), fontSize: small ? 12.5 : 15, fontWeight: bold ? '700' : '400' }, num ? FONT_NUM : null, style]}>{children}</Text>;
}

export function Pill({ children, tone = 'neutral', onPress }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'acc'; onPress?: () => void }) {
  const t = useTheme();
  const m = { neutral: [t.surface2, t.muted], good: [t.goodSoft, t.good], warn: [t.warnSoft, t.warn], bad: [t.badSoft, t.bad], acc: [t.accentSoft, t.accent] }[tone];
  const v = <View style={{ backgroundColor: m[0], borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: m[1], fontSize: 11.5, fontWeight: '700' }}>{children}</Text></View>;
  return onPress ? <Pressable onPress={onPress} hitSlop={6}>{v}</Pressable> : v;
}

export function Bar({ value, tone }: { value: number; tone?: 'good' | 'warn' | 'bad' | 'acc' }) {
  const t = useTheme();
  const c = tone === 'good' ? t.good : tone === 'warn' ? t.warn : tone === 'bad' ? t.bad : t.accent;
  return <View style={{ height: 8, borderRadius: 9, backgroundColor: t.surface2, overflow: 'hidden' }}><View style={{ height: '100%', width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: c, borderRadius: 9 }} /></View>;
}
export const utilTone = (u: number) => (u > 0.85 ? 'bad' : u > 0.6 ? 'warn' : 'good') as 'bad' | 'warn' | 'good';

export function Btn({ title, onPress, kind = 'plain', small, full }: { title: string; onPress: () => void; kind?: 'plain' | 'pri' | 'danger'; small?: boolean; full?: boolean }) {
  const t = useTheme();
  const bg = kind === 'pri' ? t.accent : kind === 'danger' ? t.badSoft : t.surface2;
  const fg = kind === 'pri' ? t.accentInk : kind === 'danger' ? t.bad : t.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: bg, borderRadius: small ? 10 : 13, minHeight: small ? 34 : 46, paddingHorizontal: small ? 12 : 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1, flexGrow: full ? 1 : 0, flex: full ? 1 : undefined })}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  );
}
export const BtnRow = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>{children}</View>;

export function Chips<T extends string | number>({ value, options, onChange, scroll }: { value: T; options: [T, string][]; onChange: (v: T) => void; scroll?: boolean }) {
  const t = useTheme();
  const items = options.map(([v, l]) => (
    <Pressable key={String(v)} onPress={() => onChange(v)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: v === value ? t.accentSoft : t.surface2, borderWidth: 1.5, borderColor: v === value ? t.accent : 'transparent', marginRight: 6, marginBottom: 6 }}>
      <Text style={{ color: v === value ? t.accent : t.ink, fontWeight: '600', fontSize: 13.5 }}>{l}</Text>
    </Pressable>
  ));
  return scroll
    ? <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">{items}</ScrollView>
    : <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{items}</View>;
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  const t = useTheme();
  return <View style={{ alignItems: 'center', paddingVertical: 18, paddingHorizontal: 10 }}><Text style={{ color: t.ink, fontWeight: '700', fontSize: 16, marginBottom: 4, textAlign: 'center' }}>{title}</Text>{text ? <Text style={{ color: t.muted, textAlign: 'center' }}>{text}</Text> : null}{children}</View>;
}

export function Row({ lead, title, sub, right, rightSub, onPress, first }: { lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; rightSub?: React.ReactNode; onPress?: () => void; first?: boolean }) {
  const t = useTheme();
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: t.line }}>
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: t.ink, fontWeight: '600', fontSize: 15 }}>{title}</Text>
        {sub ? <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12.5 }}>{sub}</Text> : null}
      </View>
      {right !== undefined || rightSub !== undefined ? (
        <View style={{ alignItems: 'flex-end' }}>
          {right !== undefined ? <Text style={[{ color: t.ink, fontWeight: '700', fontSize: 15 }, FONT_NUM]}>{right}</Text> : null}
          {rightSub ? <View style={{ marginTop: 2 }}>{typeof rightSub === 'string' ? <Text style={{ color: t.muted, fontSize: 12 }}>{rightSub}</Text> : rightSub}</View> : null}
        </View>
      ) : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

const hue = (n: string) => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
/** Ada göre renkli baş harf dairesi (Ayarlar'dan kapatılabilir). */
export function Avatar({ name }: { name: string }) {
  const { S } = useApp();
  if (S.cfg.noIcons) return null;
  return <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: `hsl(${hue(name)}, 45%, 42%)` }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{(name.trim()[0] || '?').toLocaleUpperCase('tr-TR')}</Text></View>;
}
/** Kategoriye göre simge dairesi; simgeler kapalıysa renkli nokta. */
export function CatLead({ cat }: { cat: string }) {
  const t = useTheme(), { S } = useApp();
  const color = t.cats[catIndex(cat)];
  if (S.cfg.noIcons) return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
  return <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '2e' }}><Icon name={CATICO[cat] || 'dots'} size={20} color={color} /></View>;
}

export function Tip({ level, title, text, onPress }: { level: 'bad' | 'warn' | 'good' | 'info'; title: string; text: string; onPress?: () => void }) {
  const t = useTheme();
  const c = level === 'bad' ? t.bad : level === 'warn' ? t.warn : level === 'good' ? t.good : t.accent;
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: t.surface, marginBottom: 8 }}>
      <View style={{ width: 4, borderRadius: 4, backgroundColor: c }} />
      <View style={{ flex: 1 }}><Text style={{ color: c, fontWeight: '700', marginBottom: 2 }}>{title}</Text><Text style={{ color: t.muted, fontSize: 13.5 }}>{text}</Text></View>
    </Pressable>
  );
}

export function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.surface, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, minWidth: 0 }}><Text style={{ color: t.muted, fontSize: 11 }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[{ fontSize: 16, fontWeight: '700', color: tone === 'good' ? t.good : tone === 'bad' ? t.bad : t.ink }, FONT_NUM]}>{value}</Text></View>;
}

/** Etiketli yazı kutusu. num=true ise ondalık klavye ve yazarken canlı tutar biçimi (1.250,5). */
export function Field({ label, value, onChange, num, big, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; num?: boolean; big?: boolean; placeholder?: string; multiline?: boolean }) {
  const t = useTheme();
  const auto = useRef(false);
  const change = (v: string) => {
    if (!num) return onChange(v);
    const r = formatAmountInput(v, v.length, 3, false, auto.current);
    auto.current = r.auto;
    onChange(r.text);
  };
  const blur = () => { if (num) { const r = formatAmountInput(value, value.length, 3, true, auto.current); auto.current = r.auto; if (r.text !== value) onChange(r.text); } };
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
      <TextInput value={value} onChangeText={change} onBlur={blur} placeholder={placeholder ?? (num ? '0' : undefined)} placeholderTextColor={t.muted + '99'} keyboardType={num ? 'decimal-pad' : 'default'} multiline={multiline}
        style={{ minHeight: big ? 64 : 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, color: t.ink, fontSize: big ? 32 : 16, fontWeight: big ? '800' : '400' }} />
    </View>
  );
}

/** Tarih alanı: YYYY-AA-GG biçiminde yazılır (iPhone'da seçici açılır). */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 12, flex: 1 }}>
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
        {React.createElement('input', { type: 'date', value, onChange: (e: any) => onChange(e.target.value), style: { height: 46, borderRadius: 12, border: `1.5px solid ${t.line}`, padding: '0 12px', fontSize: 16, background: t.surface, color: t.ink } })}
      </View>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  const [y, m, d] = value.split('-').map(Number);
  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
      <View style={{ alignItems: 'flex-start' }}>
        <DateTimePicker value={new Date(y, m - 1, d)} mode="date" display="compact" locale="tr-TR" themeVariant={t.dark ? 'dark' : 'light'}
          onChange={(_: unknown, dt?: Date) => { if (dt) onChange(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`); }} />
      </View>
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', marginBottom: 5 }}>{children}</Text>;
}

/** Alttan açılan form. */
export function Sheet({ visible, title, onClose, children, footer, above }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; above?: React.ReactNode }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 }}>
              <Text style={{ color: t.ink, fontSize: 19, fontWeight: '800', flex: 1 }}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={18} color={t.ink} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>{children}</ScrollView>
            {above ? <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>{above}</View> : null}
            {footer ? <View style={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8, flexDirection: 'row', gap: 8 }}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
