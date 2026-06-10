import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

export function StatsScreen() {
  const { C } = useTheme();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: C.ink }]}>Stats</Text>
        <Text style={[s.subtitle, { color: C.muted }]}>Inbox overview</Text>
      </View>

      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.cardLabel, { color: C.muted }]}>TOTAL MESSAGES</Text>
        <Text style={[s.cardValue, { color: C.ink }]}>—</Text>
      </View>

      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.cardLabel, { color: C.muted }]}>UNREAD</Text>
        <Text style={[s.cardValue, { color: C.ink }]}>—</Text>
      </View>

      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.cardLabel, { color: C.muted }]}>TOP SENDERS</Text>
        <Text style={[s.placeholder, { color: C.muted }]}>Connect Gmail to see top senders by volume</Text>
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
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 20,
  },
});
