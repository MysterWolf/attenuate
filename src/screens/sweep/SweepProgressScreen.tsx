import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import type { SweepStackParamList } from '../../navigation/SweepNavigator';

type Nav   = NativeStackNavigationProp<SweepStackParamList, 'SweepProgress'>;
type Route = RouteProp<SweepStackParamList, 'SweepProgress'>;

export function SweepProgressScreen() {
  const { C }  = useTheme();
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { targetId } = route.params;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <View style={s.content}>
        <View style={[s.circle, { borderColor: C.accent }]}>
          <Text style={[s.circleText, { color: C.accent }]}>0</Text>
          <Text style={[s.circleLabel, { color: C.muted }]}>deleted</Text>
        </View>

        <Text style={[s.status, { color: C.inkMid }]}>
          Ready to sweep: {targetId}
        </Text>
        <Text style={[s.note, { color: C.muted }]}>
          Sweep execution will run here. Gmail API integration pending.
        </Text>
      </View>

      <TouchableOpacity
        style={[s.done, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => nav.popToTop()}
      >
        <Text style={[s.doneText, { color: C.inkMid }]}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
  },
  circleLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  status: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  note: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  done: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
