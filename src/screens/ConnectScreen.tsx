import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../providers/ThemeProvider';
import { storeTokenResponse } from '../services/authService';
import {
  GOOGLE_CLIENT_ID_ANDROID,
  GMAIL_SCOPES,
  OAUTH_REDIRECT_SCHEME,
} from '../constants/config';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
  revocationEndpoint:    'https://oauth2.googleapis.com/revoke',
};

interface Props {
  onSuccess: () => void;
}

export function ConnectScreen({ onSuccess }: Props) {
  const { C } = useTheme();
  const [error,      setError]      = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: OAUTH_REDIRECT_SCHEME });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:     GOOGLE_CLIENT_ID_ANDROID,
      redirectUri,
      scopes:       GMAIL_SCOPES,
      usePKCE:      true,
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        access_type: 'offline',
        prompt:      'consent',
      },
    },
    GOOGLE_DISCOVERY,
  );

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') {
        setError(response.error?.message ?? 'Authorization failed.');
      }
      return;
    }

    setExchanging(true);
    setError(null);

    AuthSession.exchangeCodeAsync(
      {
        clientId:    GOOGLE_CLIENT_ID_ANDROID,
        code:        response.params.code,
        redirectUri,
        extraParams: request?.codeVerifier
          ? { code_verifier: request.codeVerifier }
          : {},
      },
      GOOGLE_DISCOVERY,
    )
      .then(tokenResponse => storeTokenResponse(tokenResponse))
      .then(() => onSuccess())
      .catch(err => {
        setError((err as Error).message ?? 'Failed to connect. Try again.');
        setExchanging(false);
      });
  }, [response]);

  const isConfigured = GOOGLE_CLIENT_ID_ANDROID !== 'REPLACE_WITH_GOOGLE_ANDROID_CLIENT_ID';
  const busy         = !request || exchanging;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <StatusBar backgroundColor={C.background} barStyle="light-content" />

      <View style={s.top}>
        <Text style={[s.wordmark, { color: C.muted }]}>attenuate</Text>
      </View>

      <View style={s.center}>
        <View style={[s.iconRing, { borderColor: C.accentDim }]}>
          <Text style={[s.iconGlyph, { color: C.accent }]}>⊘</Text>
        </View>
        <Text style={[s.headline, { color: C.ink }]}>Delete email at scale.</Text>
        <Text style={[s.tagline, { color: C.muted }]}>
          Your inbox is noise.{'\n'}Attenuate it.
        </Text>
      </View>

      <View style={s.bottom}>
        {!isConfigured && (
          <View style={[s.setupNote, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
            <Text style={[s.setupText, { color: C.warning }]}>
              Google OAuth not configured.{'\n'}
              Set GOOGLE_CLIENT_ID_ANDROID in config.ts.
            </Text>
          </View>
        )}

        {error && (
          <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            s.connectBtn,
            { backgroundColor: C.accent },
            (busy || !isConfigured) && s.btnDisabled,
          ]}
          onPress={() => { setError(null); promptAsync(); }}
          disabled={busy || !isConfigured}
        >
          {(busy && isConfigured) ? (
            <ActivityIndicator color={C.background} />
          ) : (
            <Text style={[s.connectBtnText, { color: C.background }]}>
              Connect Gmail
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: C.muted }]}>
          Requests gmail.modify scope — read and delete only. No access to send mail.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    paddingTop: 24,
    paddingHorizontal: 28,
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconGlyph: {
    fontSize: 40,
    lineHeight: 44,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  setupNote: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  setupText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  connectBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  connectBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
