import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import type { SweepStackParamList } from '../../navigation/SweepNavigator';

type Nav   = NativeStackNavigationProp<SweepStackParamList, 'SweepPreview'>;
type Route = RouteProp<SweepStackParamList, 'SweepPreview'>;

export function SweepPreviewScreen() {
  const { C } = useTheme();
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { targetId } = route.params;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: C.ink }]}>Preview</Text>
        <Text style={[s.subtitle, { color: C.muted }]}>Target: {targetId}</Text>
      </View>

      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.label, { color: C.muted }]}>MESSAGES TO DELETE</Text>
        <Text style={[s.count, { color: C.ink }]}>—</Text>
        <Text style={[s.note, { color: C.muted }]}>Connect Gmail to see a preview</Text>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.btnSecondary, { borderColor: C.border }]}
          onPress={() => nav.goBack()}
        >
          <Text style={[s.btnSecondaryText, { color: C.inkMid }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnPrimary, { backgroundColor: C.accent }]}
          onPress={() => nav.navigate('SweepProgress', { targetId })}
        >
          <Text style={[s.btnPrimaryText, { color: C.background }]}>Confirm Sweep</Text>
        </TouchableOpacity>
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
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  count: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
  },
  note: {
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
