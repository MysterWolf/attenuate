import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../providers/ThemeProvider';
import { storeTokenResponse, storeUserEmail } from '../services/authService';
import { getProfile } from '../services/gmailService';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GMAIL_SCOPES,
  OAUTH_REDIRECT_SCHEME,
} from '../constants/config';

WebBrowser.maybeCompleteAuthSession();

const TAG = '[Attenuate/Auth]';

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
  console.log(TAG, 'redirectUri:', redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:     GOOGLE_CLIENT_ID,
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

  const exchangeCode = (code: string, codeVerifier: string | undefined) => {
    setExchanging(true);
    setError(null);
    const extraParams: Record<string, string> = {};
    if (codeVerifier) extraParams.code_verifier = codeVerifier;
    if (GOOGLE_CLIENT_SECRET !== 'REPLACE_WITH_WEB_CLIENT_SECRET') {
      extraParams.client_secret = GOOGLE_CLIENT_SECRET;
    }
    console.log(TAG, 'exchange params — clientId:', GOOGLE_CLIENT_ID, 'redirectUri:', redirectUri, 'hasPKCE:', !!codeVerifier);
    AuthSession.exchangeCodeAsync(
      { clientId: GOOGLE_CLIENT_ID, code, redirectUri, extraParams },
      GOOGLE_DISCOVERY,
    )
      .then(tokenResponse => {
        console.log(TAG, 'token exchange success — storing tokens');
        return storeTokenResponse(tokenResponse).then(() => tokenResponse.accessToken);
      })
      .then(async accessToken => {
        console.log(TAG, 'tokens stored — fetching profile email');
        try {
          const profile = await getProfile(accessToken);
          await storeUserEmail(profile.email);
          console.log(TAG, 'user email stored:', profile.email);
        } catch (_) {
          // Non-fatal — Settings will just show "Connected" without email
        }
        console.log(TAG, 'calling onSuccess');
        onSuccess();
      })
      .catch(err => {
        console.log(TAG, 'token exchange failed:', (err as Error).message, JSON.stringify(err));
        setError((err as Error).message ?? 'Failed to connect. Try again.');
        setExchanging(false);
      });
  };

  useEffect(() => {
    console.log(TAG, 'response changed:', response?.type, JSON.stringify(response));

    if (response?.type === 'success') {
      console.log(TAG, 'auth success — code received, starting token exchange');
      exchangeCode(response.params.code, request?.codeVerifier);
      return;
    }

    if (response?.type === 'error') {
      const msg = response.error?.message ?? 'Authorization failed.';
      console.log(TAG, 'auth error:', response.error?.code, msg, JSON.stringify(response.error));
      setError(msg);
      return;
    }

    // Android race condition: CCT fires 'dismiss' before Linking delivers the redirect URL.
    // Check getInitialURL() for a code whose state matches the current request.
    if (response?.type === 'dismiss' && request) {
      Linking.getInitialURL().then(url => {
        if (!url) return;
        console.log(TAG, '[dismiss workaround] checking initialURL:', url);
        const qs = url.split('?')[1] ?? '';
        const params: Record<string, string> = {};
        for (const pair of qs.split('&')) {
          const [k, v] = pair.split('=');
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
        }
        if (params.state !== request.state || !params.code) {
          console.log(TAG, '[dismiss workaround] state mismatch or no code — ignoring');
          return;
        }
        console.log(TAG, '[dismiss workaround] state matches — recovering auth code');
        exchangeCode(params.code, request.codeVerifier);
      });
    }
  }, [response]);

  useEffect(() => {
    if (request) {
      console.log(TAG, 'auth request ready — url:', request.url);
    }
  }, [request]);

  // Low-level Linking listener — fires if the redirect URI lands on this app at all.
  // If this logs but response never updates, expo-auth-session is dropping the URL.
  // If this never logs, the OS isn't routing the redirect to this app (manifest/credential issue).
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      console.log(TAG, '[Linking] incoming url:', url);
    });
    Linking.getInitialURL().then(url => {
      if (url) console.log(TAG, '[Linking] initial url:', url);
    });
    return () => sub.remove();
  }, []);

  const isConfigured = GOOGLE_CLIENT_ID !== '' && !GOOGLE_CLIENT_ID.startsWith('REPLACE');
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
