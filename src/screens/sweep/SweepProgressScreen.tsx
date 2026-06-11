import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import type { SweepStackParamList } from '../../navigation/SweepNavigator';
import { getValidAccessToken, saveSessionRecord, getShareImpact, recordCutToday, getStreak } from '../../services/authService';
import { IMPACT_ENDPOINT } from '../../constants/config';
import {
  GmailAuthError,
  streamDeleteByQuery,
} from '../../services/gmailService';
import { useAuth } from '../../providers/AuthProvider';

type Nav   = NativeStackNavigationProp<SweepStackParamList, 'SweepProgress'>;
type Route = RouteProp<SweepStackParamList, 'SweepProgress'>;

type Phase = 'running' | 'done' | 'error';

export function SweepProgressScreen() {
  const { C }          = useTheme();
  const nav            = useNavigation<Nav>();
  const route          = useRoute<Route>();
  const { onAuthRevoked } = useAuth();

  const { senderEmail, senderName, senderCount, gmailQuery } = route.params;

  const [phase,   setPhase]   = useState<Phase>('running');
  const [deleted, setDeleted] = useState(0);
  const [total,   setTotal]   = useState(senderCount);
  const [error,   setError]   = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      activateKeepAwake();
      try {
        const token = await getValidAccessToken();
        if (!token) { onAuthRevoked(); return; }

        const q = gmailQuery
          ? `${gmailQuery} -in:trash`
          : `from:${senderEmail} -in:trash`;

        // Stream: fetch 500 IDs → trash them → fetch next page → repeat.
        // total stays as the estimate from Preview; deleted counter updates live.
        const actualDeleted = await streamDeleteByQuery(
          token,
          q,
          (del) => {
            setDeleted(del);
            // Bump the denominator if we exceed the initial estimate
            setTotal(t => Math.max(t, del));
          },
          (pageNum, err) => {
            console.warn(`[SweepProgress] page ${pageNum} skipped:`, err);
          },
        );

        if (actualDeleted === 0) {
          setPhase('done');
          return;
        }

        await saveSessionRecord({
          senderEmail: senderEmail,
          senderName:  senderName,
          count:       actualDeleted,   // actual count, not the estimate
          timestamp:   Date.now(),
        });

        await recordCutToday();

        const [shareImpact, currentStreak] = await Promise.all([getShareImpact(), getStreak()]);
        if (shareImpact) {
          fetch(IMPACT_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ count: actualDeleted, streak: currentStreak }),
          }).catch(() => {});
        }

        setPhase('done');
      } catch (err) {
        if (err instanceof GmailAuthError) { onAuthRevoked(); return; }
        setError((err as Error).message ?? 'Sweep failed.');
        setPhase('error');
      } finally {
        deactivateKeepAwake();
      }
    })();
  }, []);

  const progress   = total > 0 ? deleted / total : 0;
  const pctDisplay = Math.round(progress * 100);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <View style={s.content}>
        {/* Circle counter */}
        <View style={[
          s.circle,
          { borderColor: phase === 'done' ? C.accent : phase === 'error' ? (C.danger) : C.accentDim },
        ]}>
          <Text style={[s.circleText, { color: phase === 'error' ? (C.danger) : C.accent }]}>
            {phase === 'error' ? '!' : deleted}
          </Text>
          <Text style={[s.circleLabel, { color: C.muted }]}>
            {phase === 'error' ? 'error' : 'attenuated'}
          </Text>
        </View>

        {/* Progress bar — shown while running */}
        {phase === 'running' && (
          <View style={[s.barTrack, { backgroundColor: C.border }]}>
            <View style={[s.barFill, { width: `${pctDisplay}%`, backgroundColor: C.accent }]} />
          </View>
        )}

        <Text style={[s.status, { color: C.inkMid }]}>
          {phase === 'running' && `Attenuating… ${pctDisplay}%`}
          {phase === 'done'    && `Done — attenuated ${deleted} messages from ${senderName}`}
          {phase === 'error'   && 'Attenuation failed'}
        </Text>

        {error && (
          <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
        )}
      </View>

      {/* Done button — only shown when finished */}
      {(phase === 'done' || phase === 'error') && (
        <TouchableOpacity
          style={[s.doneBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => nav.popToTop()}
        >
          <Text style={[s.doneBtnText, { color: C.inkMid }]}>Done</Text>
        </TouchableOpacity>
      )}
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
    gap: 24,
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
  barTrack: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  status: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  doneBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
