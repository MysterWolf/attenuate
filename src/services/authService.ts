import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenResponse } from 'expo-auth-session';
import { GOOGLE_CLIENT_ID_ANDROID, STORAGE_OAUTH_TOKENS } from '../constants/config';

export interface StoredTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number; // ms epoch
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const raw = await AsyncStorage.getItem(STORAGE_OAUTH_TOKENS);
  if (!raw) return null;
  return JSON.parse(raw) as StoredTokens;
}

export async function storeTokenResponse(tokenResponse: TokenResponse): Promise<void> {
  const issuedMs  = tokenResponse.issuedAt * 1000;
  const expiresIn = (tokenResponse.expiresIn ?? 3600) * 1000;
  const tokens: StoredTokens = {
    accessToken:  tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken ?? '',
    expiresAt:    issuedMs + expiresIn,
  };
  await AsyncStorage.setItem(STORAGE_OAUTH_TOKENS, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_OAUTH_TOKENS);
}

// Returns a valid access token, refreshing if within 5 minutes of expiry.
// Returns null if no tokens stored or refresh fails (caller should treat as logged out).
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  const fiveMin = 5 * 60 * 1000;
  if (Date.now() < tokens.expiresAt - fiveMin) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    await clearTokens();
    return null;
  }

  return refreshAccessToken(tokens.refreshToken);
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const body = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID_ANDROID,
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    await clearTokens();
    return null;
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const updated: StoredTokens = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt:    Date.now() + data.expires_in * 1000,
  };
  await AsyncStorage.setItem(STORAGE_OAUTH_TOKENS, JSON.stringify(updated));
  return updated.accessToken;
}
