import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import type { SweepStackParamList } from '../../navigation/SweepNavigator';
import { getValidAccessToken } from '../../services/authService';
import {
  GmailAuthError,
  getPreviewData,
  getSampleSubjects,
} from '../../services/gmailService';
import { useAuth } from '../../providers/AuthProvider';

type Nav   = NativeStackNavigationProp<SweepStackParamList, 'SweepPreview'>;
type Route = RouteProp<SweepStackParamList, 'SweepPreview'>;

export function SweepPreviewScreen() {
  const { C }          = useTheme();
  const nav            = useNavigation<Nav>();
  const route          = useRoute<Route>();
  const { onAuthRevoked } = useAuth();

  const { senderEmail, senderName, senderCount, gmailQuery } = route.params;

  const [realCount,   setRealCount]   = useState(senderCount);
  const [countCapped, setCountCapped] = useState(false);
  const [subjects,    setSubjects]    = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) { onAuthRevoked(); return; }

        const q = gmailQuery
          ? `${gmailQuery} -in:trash`
          : `from:${senderEmail} -in:trash`;

        const { estimatedCount, sampleIds, capped } = await getPreviewData(token, q);
        if (cancelled) return;
        setRealCount(estimatedCount);
        setCountCapped(capped);

        const subs = await getSampleSubjects(token, sampleIds, 5);
        if (cancelled) return;
        setSubjects(subs);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof GmailAuthError) { onAuthRevoked(); return; }
        setError((err as Error).message ?? 'Failed to load preview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [senderEmail, gmailQuery]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={[s.title, { color: C.ink }]}>Preview</Text>
          <Text style={[s.senderLabel, { color: C.muted }]} numberOfLines={1}>
            {senderName}
          </Text>
        </View>

        {/* Count card */}
        <View style={[s.countCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.countLabel, { color: C.muted }]}>MESSAGES TO CUT</Text>
          {loading ? (
            <ActivityIndicator size="large" color={C.accent} style={s.spinner} />
          ) : (
            <Text style={[s.countValue, { color: C.ink }]}>{countCapped ? '500+' : realCount}</Text>
          )}
          {!loading && (
            <Text style={[s.countNote, { color: C.muted }]}>
              This will cut {countCapped ? '500+' : realCount} emails from {senderName}.
            </Text>
          )}
        </View>

        {/* Sample subjects */}
        {subjects.length > 0 && (
          <View style={s.subjectsSection}>
            <Text style={[s.subjectsLabel, { color: C.muted }]}>SAMPLE SUBJECTS</Text>
            {subjects.map((sub, i) => (
              <View key={i} style={[s.subjectRow, { borderBottomColor: C.border }]}>
                <Text style={[s.subjectText, { color: C.inkMid }]} numberOfLines={2}>
                  {sub}
                </Text>
              </View>
            ))}
          </View>
        )}

        {error && (
          <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={[s.actions, { borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[s.btnSecondary, { borderColor: C.border }]}
          onPress={() => nav.goBack()}
        >
          <Text style={[s.btnSecondaryText, { color: C.inkMid }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btnPrimary, { backgroundColor: C.danger }, (loading || (!countCapped && realCount === 0)) && s.btnDisabled]}
          disabled={loading || (!countCapped && realCount === 0)}
          onPress={() => nav.navigate('SweepProgress', { senderEmail, senderName, senderCount: realCount, gmailQuery })}
        >
          <Text style={[s.btnPrimaryText, { color: '#fff' }]}>Attenuate</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
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
  senderLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  countCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  spinner: {
    marginVertical: 12,
  },
  countValue: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
  },
  countNote: {
    fontSize: 13,
    textAlign: 'center',
  },
  subjectsSection: {
    marginBottom: 24,
  },
  subjectsLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  subjectRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subjectText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
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
  btnDisabled: {
    opacity: 0.4,
  },
});
