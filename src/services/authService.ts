import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenResponse } from 'expo-auth-session';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  STORAGE_OAUTH_TOKENS,
  STORAGE_USER_EMAIL,
  STORAGE_SWEEP_LOG,
  STORAGE_SHARE_IMPACT,
  STORAGE_STREAK,
  STORAGE_MILESTONES,
} from '../constants/config';

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

const TAG = '[Attenuate/Auth]';

export async function storeTokenResponse(tokenResponse: TokenResponse): Promise<void> {
  const issuedMs  = tokenResponse.issuedAt * 1000;
  const expiresIn = (tokenResponse.expiresIn ?? 3600) * 1000;
  const tokens: StoredTokens = {
    accessToken:  tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken ?? '',
    expiresAt:    issuedMs + expiresIn,
  };
  console.log(TAG, 'storeTokenResponse — hasAccessToken:', !!tokens.accessToken, 'hasRefreshToken:', !!tokens.refreshToken, 'expiresAt:', new Date(tokens.expiresAt).toISOString());
  await AsyncStorage.setItem(STORAGE_OAUTH_TOKENS, JSON.stringify(tokens));
  console.log(TAG, 'tokens written to AsyncStorage');
}

export async function storeUserEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_USER_EMAIL, email);
}

// ── Session history ───────────────────────────────────

export interface SessionRecord {
  id:          string;
  senderEmail: string;
  senderName:  string;
  count:       number;
  timestamp:   number; // ms epoch
}

export async function saveSessionRecord(record: Omit<SessionRecord, 'id'>): Promise<void> {
  const raw      = await AsyncStorage.getItem(STORAGE_SWEEP_LOG);
  const existing: SessionRecord[] = raw ? JSON.parse(raw) : [];
  const entry: SessionRecord = {
    ...record,
    id: `${record.timestamp}-${Math.random().toString(36).slice(2, 7)}`,
  };
  // Prepend so newest is first; cap at 200 entries
  const updated = [entry, ...existing].slice(0, 200);
  await AsyncStorage.setItem(STORAGE_SWEEP_LOG, JSON.stringify(updated));
}

export async function getSessionRecords(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_SWEEP_LOG);
  if (!raw) return [];
  return JSON.parse(raw) as SessionRecord[];
}

export async function getStoredUserEmail(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_USER_EMAIL);
}

export async function getShareImpact(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_SHARE_IMPACT);
  return val === 'true';
}

export async function setShareImpact(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_SHARE_IMPACT, enabled ? 'true' : 'false');
}

// ── Streak ────────────────────────────────────────────

interface StreakState {
  lastCutDate: string; // YYYY-MM-DD
  count: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function getStreak(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_STREAK);
  if (!raw) return 0;
  const state: StreakState = JSON.parse(raw);
  if (state.lastCutDate === todayISO() || state.lastCutDate === yesterdayISO()) return state.count;
  return 0;
}

export async function recordCutToday(): Promise<void> {
  const today = todayISO();
  const raw   = await AsyncStorage.getItem(STORAGE_STREAK);
  if (!raw) {
    await AsyncStorage.setItem(STORAGE_STREAK, JSON.stringify({ lastCutDate: today, count: 1 }));
    return;
  }
  const state: StreakState = JSON.parse(raw);
  if (state.lastCutDate === today) return;
  const newCount = state.lastCutDate === yesterdayISO() ? state.count + 1 : 1;
  await AsyncStorage.setItem(STORAGE_STREAK, JSON.stringify({ lastCutDate: today, count: newCount }));
}

// ── Milestones ────────────────────────────────────────

export const MILESTONE_VALUES = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

export async function getHitMilestones(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(STORAGE_MILESTONES);
  if (!raw) return [];
  return JSON.parse(raw) as number[];
}

export async function markMilestoneHit(value: number): Promise<void> {
  const existing = await getHitMilestones();
  if (existing.includes(value)) return;
  await AsyncStorage.setItem(STORAGE_MILESTONES, JSON.stringify([...existing, value]));
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_OAUTH_TOKENS, STORAGE_USER_EMAIL]);
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
  const params: Record<string, string> = {
    client_id:     GOOGLE_CLIENT_ID,
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
  };
  if (GOOGLE_CLIENT_SECRET !== 'REPLACE_WITH_WEB_CLIENT_SECRET') {
    params.client_secret = GOOGLE_CLIENT_SECRET;
  }
  const body = new URLSearchParams(params);

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
