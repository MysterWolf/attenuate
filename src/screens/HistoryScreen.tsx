import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';
import { getSessionRecords, type SessionRecord } from '../services/authService';

export function HistoryScreen() {
  const { C } = useTheme();
  const [records,     setRecords]     = useState<SessionRecord[]>([]);
  const [refreshing,  setRefreshing]  = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const data = await getSessionRecords().catch(() => []);
    setRecords(data);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <SessionRow item={item} C={C} formatDate={formatDate} formatTime={formatTime} />
        )}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={[s.title, { color: C.ink }]}>Sessions</Text>
            <Text style={[s.subtitle, { color: C.muted }]}>Past sessions</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={[s.emptyTitle, { color: C.inkMid }]}>No sessions yet</Text>
            <Text style={[s.emptyBody, { color: C.muted }]}>
              Each time you attenuate a sender, the session is logged here.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        contentContainerStyle={s.listContent}
      />
    </SafeAreaView>
  );
}

interface SessionRowProps {
  item:       SessionRecord;
  C:          ReturnType<typeof useTheme>['C'];
  formatDate: (ts: number) => string;
  formatTime: (ts: number) => string;
}

function SessionRow({ item, C, formatDate, formatTime }: SessionRowProps) {
  return (
    <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={s.rowLeft}>
        <Text style={[s.rowName, { color: C.ink }]} numberOfLines={1}>{item.senderName}</Text>
        <Text style={[s.rowEmail, { color: C.muted }]} numberOfLines={1}>{item.senderEmail}</Text>
        <Text style={[s.rowMeta, { color: C.muted }]}>
          {formatDate(item.timestamp)} · {formatTime(item.timestamp)}
        </Text>
      </View>
      <View style={s.rowRight}>
        <Text style={[s.rowCount, { color: C.accent }]}>{item.count}</Text>
        <Text style={[s.rowCountLabel, { color: C.muted }]}>attenuated</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowEmail: {
    fontSize: 12,
  },
  rowMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  rowRight: {
    alignItems: 'center',
  },
  rowCount: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  rowCountLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 1,
  },
});
