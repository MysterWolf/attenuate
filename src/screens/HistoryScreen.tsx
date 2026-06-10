import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

export function HistoryScreen() {
  const { C } = useTheme();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: C.ink }]}>History</Text>
        <Text style={[s.subtitle, { color: C.muted }]}>Past sweeps</Text>
      </View>

      <FlatList
        data={[]}
        keyExtractor={item => item}
        renderItem={() => null}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={[s.emptyTitle, { color: C.inkMid }]}>No sweeps yet</Text>
            <Text style={[s.emptyBody, { color: C.muted }]}>
              Each sweep you run will be logged here with a count of messages deleted or archived.
            </Text>
          </View>
        }
      />
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
  empty: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
