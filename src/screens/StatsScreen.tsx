import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
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
import {
  getSessionRecords,
  getStreak,
  getHitMilestones,
  markMilestoneHit,
  MILESTONE_VALUES,
} from '../services/authService';
import { InboxHealthWave } from '../components/shared/InboxHealthWave';
import { MilestoneOverlay } from '../components/shared/MilestoneOverlay';
import type { TabParamList } from '../navigation/AppNavigator';

type StatsNav = BottomTabNavigationProp<TabParamList, 'Stats'>;

// ── Types ──────────────────────────────────────────────

interface StatsData {
  profile:    GmailProfile | null;
  inbox:      InboxLabel   | null;
  senders:    SenderEntry[];
}

type LoadState = 'idle' | 'loading' | 'refreshing';

interface DomainGroup {
  domain:     string;
  totalCount: number;
  senders:    SenderEntry[];
}

const INITIAL: StatsData = { profile: null, inbox: null, senders: [] };

// ── Domain grouping ───────────────────────────────────

function extractDomain(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : email.toLowerCase();
}

function groupBySenderDomain(senders: SenderEntry[]): DomainGroup[] {
  const map = new Map<string, DomainGroup>();
  for (const s of senders) {
    const domain = extractDomain(s.email);
    const existing = map.get(domain);
    if (existing) {
      existing.totalCount += s.count;
      existing.senders.push(s);
    } else {
      map.set(domain, { domain, totalCount: s.count, senders: [s] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
}

// ── Component ─────────────────────────────────────────

export function StatsScreen() {
  const { C }            = useTheme();
  const { onAuthRevoked} = useAuth();
  const insets           = useSafeAreaInsets();
  const nav              = useNavigation<StatsNav>();
  const isFocused        = useIsFocused();
  const pendingRefresh   = useRef(false);

  const [data,             setData]             = useState<StatsData>(INITIAL);
  const [loadState,        setLoadState]        = useState<LoadState>('idle');
  const [sendersLoading,   setSendersLoading]   = useState(false);
  const [stale,            setStale]            = useState(false);
  const [totalEliminated,  setTotalEliminated]  = useState(0);
  const [streak,           setStreak]           = useState(0);
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    setLoadState(isRefresh ? 'refreshing' : 'loading');

    const token = await getValidAccessToken();
    if (!token) {
      onAuthRevoked();
      return;
    }

    try {
      const [profile, inbox] = await Promise.all([
        getProfile(token),
        getInboxLabel(token),
      ]);
      setData(prev => ({ ...prev, profile, inbox }));
      setStale(false);
      setLoadState('idle');

      setSendersLoading(true);
      const senders = await getTopSenders(token, SENDER_TOP_LIMIT, profile.email);
      setData(prev => ({ ...prev, senders }));
    } catch (err) {
      if (err instanceof GmailAuthError) {
        onAuthRevoked();
        return;
      }
      console.log('[StatsScreen] fetch error:', err);
      setStale(true);
      setLoadState('idle');
    } finally {
      setSendersLoading(false);
    }
  }, [onAuthRevoked]);

  const loadLocalStats = useCallback(async () => {
    const [records, streakCount] = await Promise.all([getSessionRecords(), getStreak()]);
    const total = records.reduce((sum, r) => sum + r.count, 0);
    setTotalEliminated(total);
    setStreak(streakCount);
    const hit  = await getHitMilestones();
    const next = MILESTONE_VALUES.find(m => total >= m && !hit.includes(m));
    if (next != null) setPendingMilestone(next);
  }, []);

  useEffect(() => { load(); loadLocalStats(); }, [load, loadLocalStats]);

  // 3s delay gives the Gmail API time to settle after a mailbox mutation
  useEffect(() => {
    if (isFocused && pendingRefresh.current) {
      pendingRefresh.current = false;
      const t = setTimeout(() => { load(true); loadLocalStats(); }, 3000);
      return () => clearTimeout(t);
    }
  }, [isFocused, load, loadLocalStats]);

  const handleMilestoneDismiss = useCallback(async () => {
    if (pendingMilestone != null) await markMilestoneHit(pendingMilestone);
    setPendingMilestone(null);
  }, [pendingMilestone]);

  const navigateToSweep = (senderEmail: string, senderName: string, senderCount: number) => {
    pendingRefresh.current = true;
    nav.navigate('Sweep', {
      screen: 'SweepHome',
      params: { senderEmail, senderName, senderCount },
    });
  };

  const formatCount = (n: number | null | undefined): string => {
    if (n == null) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  };

  // ── Render helpers ────────────────────────────────

  const isInitialLoad = loadState === 'loading';
  const isRefreshing  = loadState === 'refreshing';

  const domainGroups = groupBySenderDomain(data.senders);
  const maxDomainCount = domainGroups[0]?.totalCount ?? 1;

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

      <View style={s.titleRow}>
        <Text style={[s.title, { color: C.ink }]}>Stats</Text>
        {streak > 0 && (
          <Text style={[s.streakBadge, { color: C.warning }]}>🔥 {streak} day streak</Text>
        )}
      </View>

      {stale && (
        <View style={[s.staleBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.staleText, { color: C.muted }]}>Couldn't refresh. Pull down to try again.</Text>
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

      {data.profile && (
        <Text style={[s.allMailNote, { color: C.muted }]}>
          {formatCount(data.profile.messagesTotal)} total messages across all mail
        </Text>
      )}

      {/* Elimination counter */}
      {totalEliminated > 0 && (
        <Text style={[s.eliminatedText, { color: C.inkMid }]}>
          {'You\'ve eliminated '}
          <Text style={{ color: C.accent, fontWeight: '700' }}>{formatCount(totalEliminated)}</Text>
          {' emails.'}
        </Text>
      )}

      {/* Inbox health */}
      {data.inbox != null && (
        <InboxHealthWave
          unreadCount={data.inbox.messagesUnread ?? 0}
          accent={C.accent}
          muted={C.muted}
        />
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
    <>
    <FlatList
      style={[s.root, { backgroundColor: C.background }]}
      data={domainGroups}
      keyExtractor={item => item.domain}
      renderItem={({ item, index }) => (
        <DomainRow
          group={item}
          rank={index + 1}
          max={maxDomainCount}
          C={C}
          formatCount={formatCount}
          onDomainPress={() => navigateToSweep(
            `@${item.domain}`,
            item.domain,
            item.totalCount,
          )}
          onSenderPress={(sender) => navigateToSweep(
            sender.email,
            sender.name,
            sender.count,
          )}
        />
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
    <MilestoneOverlay value={pendingMilestone} onDismiss={handleMilestoneDismiss} />
    </>
  );
}

// ── DomainRow ─────────────────────────────────────────

interface DomainRowProps {
  group:        DomainGroup;
  rank:         number;
  max:          number;
  C:            ReturnType<typeof useTheme>['C'];
  formatCount:  (n: number) => string;
  onDomainPress: () => void;
  onSenderPress: (sender: SenderEntry) => void;
}

function DomainRow({ group, rank, max, C, formatCount, onDomainPress, onSenderPress }: DomainRowProps) {
  const [expanded, setExpanded] = useState(false);
  const barWidth = max > 0 ? (group.totalCount / max) * 100 : 0;
  const multiSender = group.senders.length > 1;

  const subtitle = multiSender
    ? `${group.senders.length} addresses · ${formatCount(group.totalCount)} emails`
    : `${group.senders[0]?.email ?? ''} · ${formatCount(group.totalCount)} emails`;

  return (
    <View>
      {/* Domain header row */}
      <TouchableOpacity
        style={[s.senderRow, { borderBottomColor: C.border }]}
        onPress={multiSender ? () => setExpanded(e => !e) : onDomainPress}
        activeOpacity={0.6}
      >
        <Text style={[s.rank, { color: C.muted }]}>{rank}</Text>
        <View style={s.senderInfo}>
          <Text style={[s.senderName, { color: C.ink }]} numberOfLines={1}>{group.domain}</Text>
          <Text style={[s.senderEmail, { color: C.muted }]} numberOfLines={1}>{subtitle}</Text>
          <View style={[s.barTrack, { backgroundColor: C.border }]}>
            <View style={[s.barFill, { width: `${barWidth}%`, backgroundColor: C.accent }]} />
          </View>
        </View>
        {multiSender ? (
          <TouchableOpacity onPress={() => setExpanded(e => !e)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.senderChevron, { color: C.muted }]}>{expanded ? '∨' : '›'}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[s.senderChevron, { color: C.muted }]}>›</Text>
        )}
      </TouchableOpacity>

      {/* Expanded individual senders */}
      {expanded && multiSender && (
        <View style={[s.expandedSection, { borderBottomColor: C.border, backgroundColor: C.surface }]}>
          {/* Domain-level cut action */}
          <TouchableOpacity
            style={[s.domainCutRow, { borderBottomColor: C.border }]}
            onPress={onDomainPress}
            activeOpacity={0.6}
          >
            <Text style={[s.domainCutText, { color: C.accent }]}>
              Cut all from @{group.domain}
            </Text>
            <Text style={[s.senderChevron, { color: C.accent }]}>›</Text>
          </TouchableOpacity>

          {/* Individual sender rows */}
          {group.senders.map(sender => (
            <TouchableOpacity
              key={sender.email}
              style={[s.subSenderRow, { borderBottomColor: C.border }]}
              onPress={() => onSenderPress(sender)}
              activeOpacity={0.6}
            >
              <View style={s.senderInfo}>
                <Text style={[s.senderName, { color: C.inkMid, fontSize: 13 }]} numberOfLines={1}>
                  {sender.name}
                </Text>
                <Text style={[s.senderEmail, { color: C.muted }]} numberOfLines={1}>
                  {sender.email}
                </Text>
              </View>
              <Text style={[s.senderCount, { color: C.inkMid, fontSize: 14 }]}>{sender.count}</Text>
              <Text style={[s.senderChevron, { color: C.muted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  streakBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  eliminatedText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  staleBanner: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  staleText: {
    fontSize: 12,
    lineHeight: 17,
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
  senderChevron: {
    fontSize: 20,
    marginLeft: 6,
  },
  expandedSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  domainCutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  domainCutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
});
