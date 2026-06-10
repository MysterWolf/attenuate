@AGENTS.md

# Attenuate — Claude Context
**Last updated:** June 2026
**Version:** 1.0.0 (versionCode 1)

## What This Is
An Android email management app. Delete email at scale — your inbox is noise. Connects to Gmail via OAuth, lets users select targets (old unread, newsletters, promotions, by sender, by keyword), previews the blast radius, then executes bulk delete / archive operations. AI tier uses Claude API to suggest smart sweep targets.

**Repo:** github.com/MysterWolf/attenuate (branch: master)
**Package:** `com.mysterwolf.attenuate`

## Tech Stack
| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React Native + Expo bare workflow | SDK 56 |
| Platform | Android-first | iOS deferred |
| Storage | AsyncStorage | No SQLite — sweep log + prefs only |
| Gmail | OAuth2 (expo-auth-session) + Gmail REST API | Wired and live |
| AI | Claude Sonnet 4.6 API | Wired, disabled until key configured |
| IAP | RevenueCat | 3 tiers (see below) |
| Notifications | Placeholder service | Not wired yet |
| Theme | Dark default | Accent #00C2A8 signal teal |

## Feature Tiers
| Tier | Model | Price | Features |
|------|-------|-------|---------|
| Free | No AI | PWYW | Manual sweeps by preset target types, sweep history |
| Attenuate Pro | No AI | $4.99 one-time | Scheduled sweeps, unlimited history, custom queries |
| Attenuate AI | Claude API | $2.99/mo | AI-suggested sweep targets, smart unsubscribe, sender scoring |

RevenueCat entitlements: `attenuate_pro`, `attenuate_ai`

## Directory Structure
```
src/
  screens/
    ConnectScreen.tsx      — OAuth entry point (shown if no token)
    StatsScreen.tsx        — inbox overview (total, unread, top senders)
    HistoryScreen.tsx      — log of past sweeps
    SettingsScreen.tsx     — Gmail connect, theme, plan, Ko-fi, API key
    sweep/
      SweepHomeScreen.tsx    — target selection
      SweepPreviewScreen.tsx — preview + confirm
      SweepProgressScreen.tsx — execution + progress
  navigation/
    AppNavigator.tsx      — 4-tab bottom bar (Stats / Sweep / History / Settings)
    SweepNavigator.tsx    — native-stack inside Sweep tab
  providers/
    ThemeProvider.tsx     — dark/light/auto, persisted via AsyncStorage
    AuthProvider.tsx      — auth state (checking/authenticated/unauthenticated)
  services/
    authService.ts        — token storage, getValidAccessToken, auto-refresh
    gmailService.ts       — Gmail REST API: getProfile, getInboxLabel, getTopSenders
    claudeService.ts      — Claude API (wired, disabled until key set)
    purchaseService.ts    — RevenueCat IAP scaffold
    notificationService.ts — placeholder, not wired
  constants/
    theme.ts              — DARK / LIGHT ThemeTokens
    config.ts             — app-wide constants, storage keys
  components/
    shared/
      MWSSplash.tsx       — MWS reusable splash (3 s, dark bg)
assets/
  brand/
    mws-logo.png          — circular MWS logo for splash
```

## Architecture
```
App.tsx
└── SafeAreaProvider
    └── ThemeProvider
        └── AuthProvider (watches splashDone, checks stored tokens)
            └── AppShell
                ├── MWSSplash  (3 s → splashDone=true → AuthProvider checks tokens)
                ├── ConnectScreen  (authStatus === 'unauthenticated')
                └── NavigationContainer  (authStatus === 'authenticated')
                    └── AppNavigator  (bottom tabs)
                        ├── Stats tab    → StatsScreen
                        ├── Sweep tab    → SweepNavigator
                        │   ├── SweepHomeScreen
                        │   ├── SweepPreviewScreen
                        │   └── SweepProgressScreen
                        ├── History tab  → HistoryScreen
                        └── Settings tab → SettingsScreen
```

## OAuth Setup (one-time, before first build)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → enable **Gmail API**
3. Create OAuth2 credentials: **Application type: Android**
   - Package name: `com.mysterwolf.attenuate`
   - SHA-1 fingerprint: run `keytool -list -v -keystore ~/.android/debug.keystore` for debug
4. Copy the client ID to `src/constants/config.ts` → `GOOGLE_CLIENT_ID_ANDROID`
5. Run `npx expo run:android` — this generates `android/` and applies the intent-filter for `com.mysterwolf.attenuate://` scheme via the `expo-auth-session` plugin in `app.json`

**OAuth scope:** `gmail.modify` (read + delete; no send access)
**Redirect URI:** `com.mysterwolf.attenuate://` (handled by expo-auth-session + Android intent-filter)

## Gmail Service Patterns (src/services/gmailService.ts)
Mirrors the batch/paginate approach from the reference Apps Scripts:

| Method | Gmail API Endpoint | Notes |
|--------|-------------------|-------|
| `getProfile(token)` | `GET /users/me/profile` | email + total messages across all mail |
| `getInboxLabel(token)` | `GET /users/me/labels/INBOX` | exact inbox total + unread count |
| `getTopSenders(token, limit, userEmail)` | `GET /users/me/messages` + `GET /messages/{id}?format=metadata` | paginates up to SENDER_SAMPLE=200, fetches From headers in chunks of 25, aggregates by sender |

The `q` parameter on `messages.list` uses identical syntax to the Apps Script `GmailApp.search()` — `is:unread`, `older_than:Nd`, `from:addr`, `"keyword"` — same query strings will be reused for sweep execution.

`GmailAuthError` is thrown on 401. StatsScreen catches it and calls `useAuth().onAuthRevoked()` which resets the auth gate to ConnectScreen.

## Theme System
Dark default. Accent: `#00C2A8` (signal teal).

| Token | Dark | Light |
|-------|------|-------|
| background | #0E0D16 | #F0F2F5 |
| surface | #16151F | #E2E6ED |
| border | #252334 | #A8B0C0 |
| ink | #E8E6F0 | #0F0E1A |
| muted | #5A5870 | #6A6880 |
| accent | #00C2A8 | #009488 |

ThemeProvider persists via AsyncStorage key `attenuate_theme_mode`. Default: `'dark'`.

## Invariants — Never Change These
- **Dark is the default mode.** Do not change default to 'light' or 'auto'.
- **Accent is #00C2A8 (signal teal).** Do not substitute.
- **ThemeProvider uses AsyncStorage, NOT RNFS.** This app has no native file system dependency.
- **Claude API is wired but DISABLED until a key is stored.** `claudeService.sendMessage()` checks for a key first — never skip this gate.
- **RevenueCat is scaffolded but NOT initialized until `initPurchases()` is called.** Wire in App.tsx when RC dashboard is configured with correct API key.
- **Sweep stack uses `popToTop()` to return home after a sweep** — not `goBack()`.
- **401 from gmailService must call `onAuthRevoked()`** — never silently fail or retry. Token is gone; re-auth is required.
- **`getTopSenders` filters out the signed-in user's own email** — pass `profile.email` as the third argument always.
- **OAuth redirect scheme is `com.mysterwolf.attenuate`** — must match `app.json → scheme` and `config.ts → OAUTH_REDIRECT_SCHEME`. Do not change.

## AsyncStorage Keys (src/constants/config.ts)
| Key | Value |
|-----|-------|
| `attenuate_theme_mode` | `'dark' \| 'light' \| 'auto'` |
| `attenuate_oauth_tokens` | `StoredTokens` JSON (accessToken, refreshToken, expiresAt) |
| `attenuate_claude_api_key` | Claude API key string |
| `attenuate_sweep_log` | JSON array of past sweep records |

## Pending Work (Priority Order)
1. **Google OAuth credentials** — set `GOOGLE_CLIENT_ID_ANDROID` in config.ts; run `npx expo run:android` to generate native project
2. **Sweep execution** — wire Gmail API batch delete/archive using same `q` syntax as reference scripts
3. **Sweep preview counts** — `messages.list` with `resultSizeEstimate` (mirrors `_countThreads` from reference script)
4. **Sweep history persistence** — write/read from AsyncStorage sweep log after each sweep
5. **RevenueCat** — add real API key, wire `initPurchases()` in App.tsx, gate Pro/AI features
6. **Settings → disconnect Gmail** — call `clearTokens()` + `onAuthRevoked()` from SettingsScreen
7. **Claude API** — AI sweep suggestions for AI tier (entitlement gate already in place)
8. **Local notifications** — wire `notificationService.ts` for scheduled sweep reminders
9. **App icon** — design and replace placeholder
10. **Play Store listing** — description, screenshots, privacy policy URL

## Build
```bash
# First time — generates android/ directory and applies intent-filter for OAuth
npx expo run:android

# Subsequent releases
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Session Starter
"I'm working on Attenuate — a React Native email management app at ~/Attenuate. Package: com.mysterwolf.attenuate. Expo SDK 56 bare workflow, Android-only. Read CLAUDE.md in full before making any changes. The Gmail API service is live — reference scripts in ~/Downloads/Attenuate/ show the query patterns used. Confirm you understand the architecture, invariants, and pending work before I give you the next task."

## Available Skills
Skills live at github.com/MysterWolf/skills. Pull that repo and read README.md to see all available skills.

Relevant skills for this repo:
- edit-component — safe editing protocol, context first, invariants respected
- update-context — update this CLAUDE.md after session, commit and push
- audit-repo — read-only snapshot of repo state

---

## Changelog

### v1.0.1 — June 2026
**Gmail OAuth + Stats screen wired**

- `src/services/authService.ts` — token storage (`StoredTokens`), `storeTokenResponse()` (from `expo-auth-session` `TokenResponse`), `getValidAccessToken()` with auto-refresh (checks 5-min window before expiry), `clearTokens()`
- `src/services/gmailService.ts` — `getProfile()`, `getInboxLabel()` (exact counts via INBOX system label), `getTopSenders()` (paginates up to 200 inbox messages, fetches From headers in 25-concurrent chunks, aggregates + sorts — mirrors `_countThreads` batch pattern from reference Apps Script); `GmailAuthError` thrown on 401; `parseFrom()` handles RFC 2822 display-name format
- `src/providers/AuthProvider.tsx` — `AuthProvider` wraps AppShell; checks stored tokens after splash completes; exposes `authStatus`, `onAuthSuccess`, `onAuthRevoked` via `useAuth()`
- `src/screens/ConnectScreen.tsx` — dark full-screen, `⊘` icon ring, "Connect Gmail" CTA, expo-auth-session PKCE flow with `access_type=offline&prompt=consent` for refresh token; graceful "not configured" state when placeholder client ID is present
- `src/screens/StatsScreen.tsx` — rewritten with real Gmail data: account email chip, INBOX / UNREAD count cards (exact via labels API), top 10 senders list with bar chart, pull-to-refresh, per-section loading states, 401 → `onAuthRevoked()`
- `App.tsx` — restructured with `AuthProvider` above `AppShell`; auth gate: splash → checking → unauthenticated (ConnectScreen) or authenticated (NavigationContainer)
- `app.json` — added `"scheme": "com.mysterwolf.attenuate"` and `"expo-auth-session"` plugin for Android intent-filter (applied on first `npx expo run:android`)
- `src/constants/config.ts` — added `GOOGLE_CLIENT_ID_ANDROID`, `OAUTH_REDIRECT_SCHEME`, `GMAIL_BASE`, `GMAIL_SCOPES`, `SENDER_SAMPLE`/`SENDER_CHUNK`/`SENDER_TOP_LIMIT`, `STORAGE_OAUTH_TOKENS`

### v1.0.0 — June 2026
Initial scaffold: Expo bare workflow, dark theme (#00C2A8 accent), ThemeProvider, MWSSplash, 4-tab navigation, Sweep stack, Claude API service (gated), RevenueCat IAP scaffold, local notification placeholder, CLAUDE.md.
