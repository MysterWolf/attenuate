import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import {
  clearTokens,
  getStoredUserEmail,
  getShareImpact,
  setShareImpact,
  getSessionRecords,
} from '../services/authService';

const KOFI_URL = 'https://ko-fi.com/mysterwolf';

export function SettingsScreen() {
  const { C, mode, setMode }        = useTheme();
  const { onAuthRevoked }           = useAuth();
  const [email, setEmail]           = useState<string | null>(null);
  const [shareImpact, setShareState] = useState(false);
  const [personalTotal, setTotal]   = useState(0);

  useEffect(() => {
    getStoredUserEmail().then(setEmail).catch(() => {});
    getShareImpact().then(setShareState).catch(() => {});
    getSessionRecords()
      .then(records => setTotal(records.reduce((sum, r) => sum + r.count, 0)))
      .catch(() => {});
  }, []);

  const handleDisconnect = async () => {
    await clearTokens();
    onAuthRevoked();
  };

  const handleToggleImpact = async (val: boolean) => {
    setShareState(val);
    await setShareImpact(val);
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={[s.title, { color: C.ink }]}>Settings</Text>
        </View>

        {/* Gmail account */}
        <Text style={[s.sectionLabel, { color: C.muted }]}>GMAIL ACCOUNT</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.connectedRow}>
            <View style={[s.dot, { backgroundColor: C.accent }]} />
            <Text style={[s.cardRow, { color: C.inkMid, flex: 1 }]} numberOfLines={1}>
              {email ?? 'Connected'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.surfaceAlt, borderColor: C.border, borderWidth: 1 }]}
            onPress={handleDisconnect}
          >
            <Text style={[s.btnText, { color: C.muted }]}>Disconnect Gmail</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <Text style={[s.sectionLabel, { color: C.muted }]}>APPEARANCE</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {(['dark', 'light', 'auto'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={s.themeRow}
              onPress={() => setMode(m)}
            >
              <Text style={[s.themeLabel, { color: mode === m ? C.accent : C.inkMid }]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
              {mode === m && <View style={[s.dot, { backgroundColor: C.accent }]} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Community impact */}
        <Text style={[s.sectionLabel, { color: C.muted }]}>COMMUNITY</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.toggleRow}>
            <View style={s.toggleInfo}>
              <Text style={[s.cardRow, { color: C.ink }]}>Contribute to community impact</Text>
              <Text style={[s.cardSub, { color: C.muted }]}>Share anonymous deletion counts</Text>
            </View>
            <Switch
              value={shareImpact}
              onValueChange={handleToggleImpact}
              trackColor={{ false: C.border, true: C.accentDim }}
              thumbColor={shareImpact ? C.accent : C.muted}
            />
          </View>
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <View style={s.totalRow}>
            <Text style={[s.cardSub, { color: C.muted }]}>Your total eliminated</Text>
            <Text style={[s.totalCount, { color: C.accent }]}>{personalTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Tier management placeholder */}
        <Text style={[s.sectionLabel, { color: C.muted }]}>PLAN</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardRow, { color: C.inkMid }]}>Free</Text>
          <Text style={[s.cardSub, { color: C.muted }]}>Upgrade to Pro or AI coming soon</Text>
        </View>

        {/* Ko-fi */}
        <Text style={[s.sectionLabel, { color: C.muted }]}>SUPPORT</Text>
        <TouchableOpacity
          style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => Linking.openURL(KOFI_URL)}
        >
          <Text style={[s.cardRow, { color: C.accent }]}>Support on Ko-fi ↗</Text>
          <Text style={[s.cardSub, { color: C.muted }]}>Buy me a coffee if Attenuate saves you time</Text>
        </TouchableOpacity>

        {/* API key placeholder */}
        <Text style={[s.sectionLabel, { color: C.muted }]}>AI (PRO)</Text>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardRow, { color: C.muted }]}>Claude API key — not configured</Text>
          <Text style={[s.cardSub, { color: C.muted }]}>Required for Attenuate AI tier</Text>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardRow: {
    fontSize: 15,
    fontWeight: '500',
  },
  cardSub: {
    fontSize: 13,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  themeLabel: {
    fontSize: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCount: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
