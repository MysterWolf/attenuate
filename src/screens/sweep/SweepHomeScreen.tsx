import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../providers/ThemeProvider';
import type { SweepStackParamList } from '../../navigation/SweepNavigator';

type Nav = NativeStackNavigationProp<SweepStackParamList, 'SweepHome'>;

export function SweepHomeScreen() {
  const { C } = useTheme();
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: C.ink }]}>Sweep</Text>
        <Text style={[s.subtitle, { color: C.muted }]}>Select a target to delete at scale</Text>
      </View>

      <View style={s.targetList}>
        {SWEEP_TARGETS.map(target => (
          <TouchableOpacity
            key={target.id}
            style={[s.targetCard, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => nav.navigate('SweepPreview', { targetId: target.id })}
          >
            <Text style={[s.targetTitle, { color: C.ink }]}>{target.label}</Text>
            <Text style={[s.targetDesc, { color: C.muted }]}>{target.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const SWEEP_TARGETS = [
  { id: 'unread_old',   label: 'Old unread',      description: 'Unread messages older than 30 days' },
  { id: 'newsletters',  label: 'Newsletters',      description: 'Detected newsletter / mailing list senders' },
  { id: 'promotions',   label: 'Promotions',       description: 'Google Promotions tab — all of it' },
  { id: 'by_sender',    label: 'By sender',        description: 'Choose a sender and delete all their mail' },
  { id: 'by_keyword',   label: 'By keyword',       description: 'Delete all messages matching a search query' },
];

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
  targetList: {
    gap: 10,
  },
  targetCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  targetDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
