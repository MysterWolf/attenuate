import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { getValidAccessToken } from '../../services/authService';
import { GmailAuthError, getMessageIdsByQuery } from '../../services/gmailService';
import type { SweepStackParamList } from '../../navigation/SweepNavigator';

type Nav   = NativeStackNavigationProp<SweepStackParamList, 'SweepHome'>;
type Route = RouteProp<SweepStackParamList, 'SweepHome'>;

interface Category {
  id:    string;
  label: string;
  query: string;
  desc:  string;
}

const CATEGORIES: Category[] = [
  { id: 'promotions', label: 'Promotions', query: 'category:promotions', desc: 'Shopping, deals, offers' },
  { id: 'social',     label: 'Social',     query: 'category:social',     desc: 'Notifications, friend activity' },
  { id: 'updates',    label: 'Updates',    query: 'category:updates',    desc: 'Receipts, confirmations, bills' },
  { id: 'forums',     label: 'Forums',     query: 'category:forums',     desc: 'Mailing lists, group discussions' },
];

const PRO_TARGETS = [
  { id: 'unread_old', label: 'Old Unread',  desc: 'Unread messages older than 30 days' },
  { id: 'by_keyword', label: 'By Keyword',  desc: 'Delete all messages matching a search query' },
];

export function SweepHomeScreen() {
  const { C }          = useTheme();
  const nav            = useNavigation<Nav>();
  const route          = useRoute<Route>();
  const { onAuthRevoked } = useAuth();

  const { senderEmail, senderName, senderCount } = route.params ?? {};
  const hasSender = !!senderEmail;

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCategoryPress = async (cat: Category) => {
    if (loadingId) return;
    setLoadingId(cat.id);
    try {
      const token = await getValidAccessToken();
      if (!token) { onAuthRevoked(); return; }
      const ids = await getMessageIdsByQuery(token, cat.query);
      nav.navigate('SweepPreview', {
        senderEmail: cat.query,
        senderName:  cat.label,
        senderCount: ids.length,
        gmailQuery:  cat.query,
      });
    } catch (err) {
      if (err instanceof GmailAuthError) { onAuthRevoked(); return; }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={[s.title, { color: C.ink }]}>Cut</Text>
          <Text style={[s.subtitle, { color: C.muted }]}>Select a target to cut at scale</Text>
        </View>

        {/* Pre-populated sender card — shown when arriving from Stats */}
        {hasSender && (
          <View style={s.selectedSection}>
            <Text style={[s.sectionLabel, { color: C.muted }]}>SELECTED SENDER</Text>
            <View style={[s.senderCard, { backgroundColor: C.surface, borderColor: C.accent }]}>
              <View style={s.senderCardTop}>
                <View style={s.senderCardInfo}>
                  <Text style={[s.senderCardName, { color: C.ink }]} numberOfLines={1}>
                    {senderName}
                  </Text>
                  <Text style={[s.senderCardEmail, { color: C.muted }]} numberOfLines={1}>
                    {senderEmail}
                  </Text>
                </View>
                <View style={[s.countBadge, { backgroundColor: C.accentDim }]}>
                  <Text style={[s.countBadgeText, { color: C.accent }]}>{senderCount}</Text>
                  <Text style={[s.countBadgeLabel, { color: C.accent }]}>msgs</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[s.previewBtn, { backgroundColor: C.accent }]}
              onPress={() => nav.navigate('SweepPreview', {
                senderEmail: senderEmail!,
                senderName:  senderName!,
                senderCount: senderCount!,
              })}
            >
              <Text style={[s.previewBtnText, { color: C.background }]}>Preview Cut</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Gmail native categories */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: C.muted }]}>CATEGORIES</Text>
          {CATEGORIES.map(cat => {
            const isLoading = loadingId === cat.id;
            const isDisabled = loadingId !== null && !isLoading;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  s.targetCard,
                  { backgroundColor: C.surface, borderColor: isLoading ? C.accent : C.border },
                  isDisabled && s.cardDisabled,
                ]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.6}
                disabled={isDisabled}
              >
                <View style={s.targetCardRow}>
                  <View style={s.targetCardInfo}>
                    <Text style={[s.targetTitle, { color: C.ink }]}>{cat.label}</Text>
                    <Text style={[s.targetDesc, { color: C.muted }]}>{cat.desc}</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={C.accent} />
                  ) : (
                    <Text style={[s.chevron, { color: C.muted }]}>›</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Pro-gated targets */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: C.muted }]}>MORE TARGETS</Text>
          {PRO_TARGETS.map(target => (
            <View
              key={target.id}
              style={[s.targetCard, s.targetCardPro, { backgroundColor: C.surface, borderColor: C.border }]}
            >
              <View style={s.targetCardRow}>
                <View style={s.targetCardInfo}>
                  <Text style={[s.targetTitle, { color: C.muted }]}>{target.label}</Text>
                  <Text style={[s.targetDesc, { color: C.muted }]}>{target.desc}</Text>
                </View>
                <View style={[s.proBadge, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                  <Text style={[s.proBadgeText, { color: C.warning }]}>🔒 PRO</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
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
  selectedSection: {
    marginBottom: 28,
    gap: 10,
  },
  section: {
    marginBottom: 28,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  senderCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
  },
  senderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderCardInfo: {
    flex: 1,
    gap: 2,
  },
  senderCardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  senderCardEmail: {
    fontSize: 12,
  },
  countBadge: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  countBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  previewBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  previewBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  targetCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  targetCardPro: {
    opacity: 0.6,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  targetCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetCardInfo: {
    flex: 1,
    gap: 3,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
  },
  proBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
