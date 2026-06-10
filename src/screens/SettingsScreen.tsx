import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

const KOFI_URL = 'https://ko-fi.com/mysterwolf';

export function SettingsScreen() {
  const { C, mode, setMode } = useTheme();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: C.ink }]}>Settings</Text>
      </View>

      {/* Gmail account */}
      <Text style={[s.sectionLabel, { color: C.muted }]}>GMAIL ACCOUNT</Text>
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.cardRow, { color: C.inkMid }]}>Not connected</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: C.accent }]}>
          <Text style={[s.btnText, { color: C.background }]}>Connect Gmail</Text>
        </TouchableOpacity>
      </View>

      {/* Theme */}
      <Text style={[s.sectionLabel, { color: C.muted }]}>APPEARANCE</Text>
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        {(['dark', 'light', 'auto'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={s.themeRow}
            onPress={() => setMode(m)}
          >
            <Text style={[s.themeLabel, { color: mode === m ? C.accent : C.inkMid }]}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
            {mode === m && <View style={[s.dot, { backgroundColor: C.accent }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tier management placeholder */}
      <Text style={[s.sectionLabel, { color: C.muted }]}>PLAN</Text>
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.cardRow, { color: C.inkMid }]}>Free</Text>
        <Text style={[s.cardSub, { color: C.muted }]}>Upgrade to Pro or AI coming soon</Text>
      </View>

      {/* Ko-fi */}
      <Text style={[s.sectionLabel, { color: C.muted }]}>SUPPORT</Text>
      <TouchableOpacity
        style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => Linking.openURL(KOFI_URL)}
      >
        <Text style={[s.cardRow, { color: C.accent }]}>Support on Ko-fi ↗</Text>
        <Text style={[s.cardSub, { color: C.muted }]}>Buy me a coffee if Attenuate saves you time</Text>
      </TouchableOpacity>

      {/* API key placeholder */}
      <Text style={[s.sectionLabel, { color: C.muted }]}>AI (PRO)</Text>
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.cardRow, { color: C.muted }]}>Claude API key — not configured</Text>
        <Text style={[s.cardSub, { color: C.muted }]}>Required for Attenuate AI tier</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardRow: {
    fontSize: 15,
    fontWeight: '500',
  },
  cardSub: {
    fontSize: 13,
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  themeLabel: {
    fontSize: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
