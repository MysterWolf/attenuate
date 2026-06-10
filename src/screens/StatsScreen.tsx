import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { getValidAccessToken } from '../services/authService';
import {
  GmailAuthError,
  getProfile,
  getInboxLabel,
  getTopSenders,
  type GmailProfile,
  type InboxLabel,
  type SenderEntry,
} from '../services/gmailService';
import { SENDER_TOP_LIMIT } from '../constants/config';

// ── Types ──────────────────────────────────────────────

interface StatsData {
  profile:    GmailProfile | null;
  inbox:      InboxLabel   | null;
  senders:    SenderEntry[];
}

type LoadState = 'idle' | 'loading' | 'refreshing' | 'error';

const INITIAL: StatsData = { profile: null, inbox: null, senders: [] };

// ── Component ─────────────────────────────────────────

export function StatsScreen() {
  const { C }            = useTheme();
  const { onAuthRevoked} = useAuth();
  const insets           = useSafeAreaInsets();

  const [data,       setData]       = useState<StatsData>(INITIAL);
  const [loadState,  setLoadState]  = useState<LoadState>('idle');
  const [sendersLoading, setSendersLoading] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    setLoadState(isRefresh ? 'refreshing' : 'loading');
    setError(null);

    const token = await getValidAccessToken();
    if (!token) {
      onAuthRevoked();
      return;
    }

    try {
      // Profile and inbox label fetch concurrently — fast
      const [profile, inbox] = await Promise.all([
        getProfile(token),
        getInboxLabel(token),
      ]);
      setData(prev => ({ ...prev, profile, inbox }));
      setLoadState('idle');

      // Top senders is slower (200 message metadata fetches) — show separately
      setSendersLoading(true);
      const senders = await getTopSenders(token, SENDER_TOP_LIMIT, profile.email);
      setData(prev => ({ ...prev, senders }));
    } catch (err) {
      if (err instanceof GmailAuthError) {
        onAuthRevoked();
        return;
      }
      setError((err as Error).message ?? 'Failed to load inbox data.');
      setLoadState('error');
    } finally {
      setSendersLoading(false);
    }
  }, [onAuthRevoked]);

  useEffect(() => { load(); }, [load]);

  const formatCount = (n: number | null | undefined): string => {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  };

  // ── Render helpers ────────────────────────────────

  const isInitialLoad = loadState === 'loading';
  const isRefreshing  = loadState === 'refreshing';

  const ListHeader = () => (
    <View style={[s.headerWrap, { paddingTop: insets.top + 16 }]}>
      {/* Account chip */}
      <View style={s.accountRow}>
        <View style={[s.accountChip, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
          <View style={[s.dot, { backgroundColor: data.profile ? C.accent : C.muted }]} />
          <Text style={[s.accountEmail, { color: data.profile ? C.inkMid : C.muted }]} numberOfLines={1}>
            {data.profile?.email ?? (isInitialLoad ? 'Loading…' : 'Not connected')}
          </Text>
        </View>
      </View>

      <Text style={[s.title, { color: C.ink }]}>Stats</Text>

      {error && (
        <View style={[s.errorBanner, { backgroundColor: C.surfaceAlt, borderColor: C.danger }]}>
          <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
        </View>
      )}

      {/* Count cards */}
      <View style={s.cards}>
        <CountCard
          label="INBOX"
          value={isInitialLoad ? null : data.inbox?.messagesTotal ?? null}
          formatFn={formatCount}
          C={C}
        />
        <CountCard
          label="UNREAD"
          value={isInitialLoad ? null : data.inbox?.messagesUnread ?? null}
          formatFn={formatCount}
          accent={C.accent}
          C={C}
        />
      </View>

      {/* All-mail total as a smaller note */}
      {data.profile && (
        <Text style={[s.allMailNote, { color: C.muted }]}>
          {formatCount(data.profile.messagesTotal)} total messages across all mail
        </Text>
      )}

      {/* Senders heading */}
      <View style={s.senderHeading}>
        <Text style={[s.sectionLabel, { color: C.muted }]}>TOP SENDERS</Text>
        {sendersLoading && (
          <ActivityIndicator size="small" color={C.muted} style={s.senderSpinner} />
        )}
        {!sendersLoading && data.senders.length > 0 && (
          <Text style={[s.sampleNote, { color: C.muted }]}>last 200 inbox msgs</Text>
        )}
      </View>
    </View>
  );

  const ListEmpty = () => {
    if (sendersLoading) return null;
    return (
      <View style={s.emptyWrap}>
        <Text style={[s.emptyText, { color: C.muted }]}>
          {isInitialLoad ? '' : 'No sender data yet.'}
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      style={[s.root, { backgroundColor: C.background }]}
      data={data.senders}
      keyExtractor={item => item.email}
      renderItem={({ item, index }) => (
        <SenderRow item={item} rank={index + 1} max={data.senders[0]?.count ?? 1} C={C} />
      )}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={ListEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => load(true)}
          tintColor={C.accent}
          colors={[C.accent]}
        />
      }
      contentContainerStyle={s.listContent}
    />
  );
}

// ── Sub-components ────────────────────────────────────

interface CountCardProps {
  label:    string;
  value:    number | null;
  formatFn: (n: number) => string;
  accent?:  string;
  C:        ReturnType<typeof useTheme>['C'];
}

function CountCard({ label, value, formatFn, accent, C }: CountCardProps) {
  return (
    <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, flex: 1 }]}>
      <Text style={[s.cardLabel, { color: C.muted }]}>{label}</Text>
      {value == null ? (
        <ActivityIndicator size="small" color={C.muted} style={s.cardSpinner} />
      ) : (
        <Text style={[s.cardValue, { color: accent ?? C.ink }]}>{formatFn(value)}</Text>
      )}
    </View>
  );
}

interface SenderRowProps {
  item: SenderEntry;
  rank: number;
  max:  number;
  C:    ReturnType<typeof useTheme>['C'];
}

function SenderRow({ item, rank, max, C }: SenderRowProps) {
  const barWidth = max > 0 ? (item.count / max) * 100 : 0;

  return (
    <View style={[s.senderRow, { borderBottomColor: C.border }]}>
      <Text style={[s.rank, { color: C.muted }]}>{rank}</Text>
      <View style={s.senderInfo}>
        <Text style={[s.senderName, { color: C.ink }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.senderEmail, { color: C.muted }]} numberOfLines={1}>{item.email}</Text>
        {/* bar mirrors the script's volume feedback */}
        <View style={[s.barTrack, { backgroundColor: C.border }]}>
          <View style={[s.barFill, { width: `${barWidth}%`, backgroundColor: C.accent }]} />
        </View>
      </View>
      <Text style={[s.senderCount, { color: C.inkMid }]}>{item.count}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  accountRow: {
    marginBottom: 20,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
    maxWidth: '85%',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  accountEmail: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  errorBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minHeight: 90,
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  cardValue: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -1.5,
    marginTop: 4,
  },
  cardSpinner: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  allMailNote: {
    fontSize: 12,
    marginBottom: 28,
    marginTop: 4,
  },
  senderHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    flex: 1,
  },
  senderSpinner: {
    marginLeft: 8,
  },
  sampleNote: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rank: {
    fontSize: 13,
    fontWeight: '600',
    width: 20,
    textAlign: 'right',
  },
  senderInfo: {
    flex: 1,
    gap: 2,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  senderEmail: {
    fontSize: 12,
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
  senderCount: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
});
