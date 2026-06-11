import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import type { SweepStackParamList } from '../../navigation/SweepNavigator';

type Nav   = NativeStackNavigationProp<SweepStackParamList, 'SweepHome'>;
type Route = RouteProp<SweepStackParamList, 'SweepHome'>;

export function SweepHomeScreen() {
  const { C } = useTheme();
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();

  const { senderEmail, senderName, senderCount } = route.params ?? {};
  const hasSender = !!senderEmail;

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

        {/* Standard target list */}
        <View style={s.targetList}>
          {!hasSender && <Text style={[s.sectionLabel, { color: C.muted }]}>TARGET TYPES</Text>}
          {SWEEP_TARGETS.map(target => (
            <TouchableOpacity
              key={target.id}
              style={[s.targetCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => {
                // TODO: wire up non-sender targets in a future session
              }}
            >
              <Text style={[s.targetTitle, { color: C.ink }]}>{target.label}</Text>
              <Text style={[s.targetDesc, { color: C.muted }]}>{target.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
