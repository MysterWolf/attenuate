@AGENTS.md

# Attenuate — Claude Context
**Last updated:** June 2026
**Version:** 1.1.2

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
    gmailService.ts       — Gmail REST API: getProfile, getInboxLabel, getTopSenders, getPreviewData, streamDeleteByQuery, getSampleSubjects
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
| `getPreviewData(token, q)` | `GET /users/me/messages` | single call, `maxResults:500`; returns `{ estimatedCount, sampleIds, capped }` — `estimatedCount` from `resultSizeEstimate`, `sampleIds` = first 5 IDs for subject preview, `capped = true` when full page returned (display "500+") |
| `streamDeleteByQuery(token, q, onProgress, onPageError)` | `GET /users/me/messages` + `POST batchModify` | streaming pipeline: fetch 500 IDs via `nextPageToken` → trash immediately → repeat; O(500) memory; per-page errors non-fatal; returns `totalDeleted` |
| `getSampleSubjects(token, ids, limit)` | `GET /messages/{id}?format=metadata` | parallel Subject header fetch for preview card |

**Removed (replaced by streaming pipeline):** `fetchAllMessageIds`, `getSenderMessageIds`, `getMessageIdsByQuery`, `batchDeleteMessages`

The `q` parameter on `messages.list` uses identical syntax to the Apps Script `GmailApp.search()` — `is:unread`, `older_than:Nd`, `from:addr`, `from:@domain.com`, `category:promotions`, `"keyword"` — all route through the same Preview → Progress flow via the `gmailQuery` param.

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

## Icon Invariants (MWS Standard)

Source: measured from Mission Control `ebike-icon.png` (canonical MWS reference).

| Property | Value |
|---|---|
| Canvas | 1024×1024 px |
| Content bounding box | max 783×783 px (76.5% of 1024) |
| Uniform padding | **120 px on all four sides** |
| Content center | (512, 512) — canvas center |
| Background | #0E1A1A (Attenuate dark teal) |
| No circular crop | Android launcher applies shape mask |

For Attenuate's horizontal waveform (aspect ≈ 1.9:1): target 783px wide → ~412px tall, paste at (120, 306). Top/bottom padding ≈ 306px — correct per spec (more padding when content is not square).

After any icon change: delete `android/app/build` and rebuild — Gradle caches mipmaps.

Mipmap sizes: mdpi=48, hdpi=72, xhdpi=96, xxhdpi=144, xxxhdpi=192 (`.webp` extension, PNG format).

---

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
| `attenuate_share_impact` | `'true' \| 'false'` (community telemetry opt-in) |

## Pending Work (Priority Order)
1. **RevenueCat** — add real API key, wire `initPurchases()` in App.tsx, gate Pro/AI features
2. **Settings → disconnect Gmail** — call `clearTokens()` + `onAuthRevoked()` from SettingsScreen
3. **Claude API** — AI sweep suggestions for AI tier (entitlement gate already in place)
4. **Local notifications** — wire `notificationService.ts` for scheduled sweep reminders
5. **App icon** — design and replace placeholder
6. **Play Store listing** — description, screenshots, privacy policy URL

## Build
```bash
# First time — generates android/ directory and applies intent-filter for OAuth
npx expo run:android

# Every subsequent build — bundle JS first, then assemble (no Metro needed)
cd ~/Attenuate
npx expo export:embed \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
cd android && ./gradlew assembleDebug
adb -s 22081JEGR00391 install -r app/build/outputs/apk/debug/app-debug.apk

# Release
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

**Important:** Debug APKs without an embedded bundle show "unable to load script" on launch. Always run `expo export:embed` before `assembleDebug`.

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

### v1.1.2 — June 2026
**Fix: Preview shows "500+" instead of misleading "501" for large target counts**

- `src/services/gmailService.ts` — `getPreviewData` return type gains `capped: boolean`; `capped = allIds.length >= 500` (a full page means there are likely more messages than Gmail can precisely estimate)
- `src/screens/sweep/SweepPreviewScreen.tsx` — added `countCapped` state; on `getPreviewData` response, calls `setCountCapped(capped)`; count display and count note both render `'500+'` when `countCapped` is true; Attenuate button disabled condition updated: `loading || (!countCapped && realCount === 0)` — capped counts always enable the button

**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.1.1 — June 2026
**Fix: Preview always showed 201 for domain cuts**

- `src/services/gmailService.ts` — `getPreviewData` now uses `maxResults: '500'` instead of `'5'`; Gmail's `resultSizeEstimate` is computed from the page size context and consistently returned ~201 when only 5 results were requested (the server caps its estimate near the page size for `from:@domain` queries); with a 500-result page the estimate reflects the true mailbox count; only the first 5 of the returned IDs are passed to `getSampleSubjects` — the rest are discarded immediately; no ID is stored across pages

**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.1.0 — June 2026
**Streaming delete pipeline — fixes large-target (40K+) Cut sessions**

Root cause: `fetchAllMessageIds` loaded the entire ID set into memory (up to 40K+ strings) before starting any deletes. For large targets this OOM'd or hit pagination limits.

- `src/services/gmailService.ts` — replaced `fetchAllMessageIds` / `getSenderMessageIds` / `getMessageIdsByQuery` with two new exports:
  - `getPreviewData(token, q)` — single `messages.list` call with `maxResults:5`; returns `{ estimatedCount, sampleIds }` using `resultSizeEstimate` from the API; never fetches more than one page regardless of inbox size; used by both SweepPreviewScreen and SweepHomeScreen
  - `streamDeleteByQuery(token, q, onProgress, onPageError)` — streaming pipeline: fetches 500 IDs via `nextPageToken`, immediately trashes them via `batchModify`, then advances to next page; never holds more than 500 IDs in memory; per-page batchModify errors are logged + passed to `onPageError` and skipped (non-fatal); 401s always throw `GmailAuthError`; returns actual trashed count
- `src/screens/sweep/SweepPreviewScreen.tsx` — replaced ID fetch with `getPreviewData`; shows `estimatedCount` as the preview count; sample subjects use `sampleIds` (first 5 from the list call); no full paginated fetch
- `src/screens/sweep/SweepProgressScreen.tsx` — replaced ID fetch + `batchDeleteMessages` with `streamDeleteByQuery`; `total` starts as `senderCount` estimate from Preview params (denominator for progress bar); `deleted` updates live via `onProgress`; denominator bumps up if actual exceeds estimate; session record writes `actualDeleted` (not the estimate); telemetry also uses `actualDeleted`; `activateKeepAwake()` fires before the stream starts (confirmed in place from v1.0.9)
- `src/screens/sweep/SweepHomeScreen.tsx` — replaced `getMessageIdsByQuery` with `getPreviewData` for category count before navigating to SweepPreview; same single-page approach

**Memory profile per session:** was O(N) where N = total messages; now O(500) constant.
**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.0.9 — June 2026
**Wake lock during Cut session prevents screen-sleep interruption**

- `src/screens/sweep/SweepProgressScreen.tsx` — imports `activateKeepAwake` / `deactivateKeepAwake` from `expo-keep-awake` (already in package.json at ~56.0.3); calls `activateKeepAwake()` immediately before the batch async block; calls `deactivateKeepAwake()` in the `finally` clause — guaranteed release on completion, error, or auth revocation; uses `FLAG_KEEP_SCREEN_ON` window flag under the hood (no `WAKE_LOCK` manifest permission required for this approach — that permission is for `WakeLock.PARTIAL_WAKE_LOCK` which keeps CPU alive with screen off, not needed here)

**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.0.8 — June 2026
**SweepHome: two distinct sections with clear visual separation**

- `src/screens/sweep/SweepHomeScreen.tsx` — restructured into three sections separated by hairline dividers: (1) CUT BY SENDER — pre-populated sender card (when arriving from Stats) + manual TextInput search field with `›` submit button; typing an email + submitting navigates directly to SweepPreview; (2) CUT BY CATEGORY — subtitle explaining Gmail sorts, then Promotions/Social/Updates/Forums buttons unchanged; (3) MORE TARGETS — Pro-gated Old Unread + By Keyword; screen title subtitle removed (sections are self-describing); `keyboardShouldPersistTaps="handled"` on ScrollView so tapping submit doesn't dismiss keyboard unexpectedly

**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.0.7 — June 2026
**Gmail category sweeps wired to SweepHome**

- `src/services/gmailService.ts` — extracted `fetchAllMessageIds(token, q)` internal helper; refactored `getSenderMessageIds` to call it; added `getMessageIdsByQuery(token, query)` export that fetches all IDs for an arbitrary Gmail query (`${query} -in:trash`)
- `src/navigation/SweepNavigator.tsx` — added optional `gmailQuery?: string` to both `SweepPreview` and `SweepProgress` param types
- `src/screens/sweep/SweepHomeScreen.tsx` — replaced static SWEEP_TARGETS list: now shows CATEGORIES section (Promotions/Social/Updates/Forums, each live-wired to `category:X` Gmail query); tapping fetches count + navigates to SweepPreview with `gmailQuery`; per-button spinner while loading; OTHER TARGETS section shows Old Unread + By Keyword as Pro-badged (🔒 PRO, not tappable); removed "By sender" (covered by Stats) and "Newsletters" (no Gmail native category)
- `src/screens/sweep/SweepPreviewScreen.tsx` — uses `getMessageIdsByQuery(token, gmailQuery)` when `gmailQuery` param is present, else `getSenderMessageIds`; count note updated to "This will cut X emails from {senderName}."; passes `gmailQuery` through to SweepProgress
- `src/screens/sweep/SweepProgressScreen.tsx` — uses `getMessageIdsByQuery(token, gmailQuery)` when `gmailQuery` param is present, else `getSenderMessageIds`

**Gmail query convention:** `category:X` maps to Gmail's native inbox categories (Promotions, Social, Updates, Forums); `from:email` for sender sweeps; `from:@domain.com` for domain sweeps. All pass through the same Preview → Progress flow unchanged.
**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.0.6 — June 2026
**Stats: domain grouping for top senders**

- `src/screens/StatsScreen.tsx` — senders list now grouped by domain (`extractDomain` + `groupBySenderDomain`); each `DomainRow` shows domain, address count, total email count, and a volume bar; single-address domains tap to navigate directly to SweepHome with that sender; multi-address domains tap to expand accordion showing individual senders + "Cut all from @domain" action; domain-level cut passes `senderEmail: "@domain.com"` which routes through the existing `from:${senderEmail}` Gmail query as `from:@domain.com`, matching all addresses at that domain; no changes to gmailService, SweepPreviewScreen, or SweepProgressScreen

**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.0.5 — June 2026
**Stats gamification: elimination counter, inbox health waveform, milestones, cut streaks**

- `src/constants/config.ts` — added `STORAGE_STREAK = 'attenuate_streak'`, `STORAGE_MILESTONES = 'attenuate_milestones'`
- `src/services/authService.ts` — added `getStreak()`, `recordCutToday()`, `MILESTONE_VALUES`, `getHitMilestones()`, `markMilestoneHit()`; streak persisted as `{ lastCutDate: YYYY-MM-DD, count }` — resets if no Cut in 24h after last cut day
- `src/components/shared/InboxHealthWave.tsx` — new component; maps unread count to HealthLevel (pure_signal/mastered/mixed/unmastered/noisy/distorted); renders 36 animated bars (setInterval 20fps, phase ref) or flat line + null dot for Pure Signal; amplitude/freq/noise/speed params per level
- `src/components/shared/MilestoneOverlay.tsx` — new component; full-screen Modal (dark 93% overlay), spring scale + opacity entrance, short milestone copy, tap to dismiss
- `src/screens/StatsScreen.tsx` — added `loadLocalStats()` (reads session records, streak, checks milestones); title row now shows 🔥 streak badge; elimination counter below count cards; InboxHealthWave between all-mail note and TOP SENDERS; MilestoneOverlay rendered at root; `handleMilestoneDismiss` marks milestone as hit in AsyncStorage
- `src/screens/sweep/SweepProgressScreen.tsx` — calls `recordCutToday()` after successful Cut; community impact POST now includes `streak` field alongside `count`

**AsyncStorage keys added:** `attenuate_streak`, `attenuate_milestones`
**Invariants still holding:** dark default, #00C2A8 accent, popToTop() for sweep return, 401 → onAuthRevoked(), Claude API gated.

### v1.0.4 — June 2026
**Cut branding + community impact telemetry**

- `src/navigation/AppNavigator.tsx` — Sweep tab `tabBarLabel` changed to `'Cut'`
- `src/screens/sweep/SweepHomeScreen.tsx` — screen title "Sweep" → "Cut"; subtitle updated; "Preview Delete" CTA → "Preview Cut"
- `src/screens/sweep/SweepPreviewScreen.tsx` — count card label "MESSAGES TO DELETE" → "MESSAGES TO CUT"
- `src/constants/config.ts` — added `STORAGE_SHARE_IMPACT = 'attenuate_share_impact'` and `IMPACT_ENDPOINT = 'https://api.attenuate.app/impact'`
- `src/services/authService.ts` — added `getShareImpact()` and `setShareImpact(enabled)` helpers (AsyncStorage key `attenuate_share_impact`)
- `src/screens/sweep/SweepProgressScreen.tsx` — on completion, checks `getShareImpact()`; if opted in, silently POSTs `{ count: N }` to `IMPACT_ENDPOINT` (failure swallowed)
- `src/screens/SettingsScreen.tsx` — added COMMUNITY section: "Contribute to community impact" toggle (off by default) + personal total emails eliminated (summed from session records); wrapped layout in ScrollView; imports `getShareImpact`, `setShareImpact`, `getSessionRecords`

### v1.0.3 — June 2026
**Session history wired + Attenuate branding**

- `src/services/authService.ts` — added `SessionRecord` type + `saveSessionRecord` (prepend-newest, 200-entry cap) + `getSessionRecords`; imports `STORAGE_SWEEP_LOG`
- `src/screens/sweep/SweepProgressScreen.tsx` — writes `SessionRecord` to AsyncStorage on successful completion; "Deleting…" → "Attenuating…"; circle label "deleted" → "attenuated"; done status updated to match
- `src/screens/sweep/SweepPreviewScreen.tsx` — confirm button "Delete" → "Attenuate"
- `src/screens/HistoryScreen.tsx` — full rewrite: reads `SessionRecord[]` from AsyncStorage via `getSessionRecords`; displays card list with sender name/email, date/time, attenuated count; pull-to-refresh; title "History" → "Sessions", empty state updated
- `src/navigation/AppNavigator.tsx` — History tab `tabBarLabel: 'Sessions'`; screen name unchanged so navigation refs stay stable

### v1.0.2 — June 2026
**Sender sweep flow wired + Metro DevTools disabled**

- `metro.config.js` — stubs `DefaultToolLauncher` via `require.cache` before `@react-native/dev-middleware` loads it; prevents Chromium DevTools window from auto-launching (and disconnect popups) on every `npx expo start`
- `src/navigation/SweepNavigator.tsx` — `SweepStackParamList` updated: `SweepHome` accepts optional `{ senderEmail, senderName, senderCount }`, `SweepPreview` + `SweepProgress` require those three fields
- `src/screens/StatsScreen.tsx` — `SenderRow` is now a `TouchableOpacity`; tapping navigates to Sweep tab → `SweepHome` with sender pre-populated; chevron indicator added; `useIsFocused` + `pendingRefresh` ref triggers a data refresh when returning from Sweep after a delete
- `src/screens/sweep/SweepHomeScreen.tsx` — shows pre-populated sender card (name, email, count badge) + "Preview Delete" CTA when `senderEmail` param is present; standard target list retained below
- `src/screens/sweep/SweepPreviewScreen.tsx` — fetches real message count via `getSenderMessageIds` + 5 sample subjects via `getSampleSubjects`; shows count card + subject list; Delete button (accent danger) navigates to Progress; Cancel goes back
- `src/screens/sweep/SweepProgressScreen.tsx` — re-fetches message IDs then calls `batchDeleteMessages` in 1,000-message batches; live counter + progress bar while running; done state shows total deleted + sender name; Done → `popToTop()`; error state with message
- `src/services/gmailService.ts` — added `getSenderMessageIds` (`from:email` paginated query), `getSampleSubjects` (parallel metadata fetch for Subject header), `batchDeleteMessages` (POST `/messages/batchDelete` in 1k chunks with progress callback)

**Invariants still holding:** dark default, #00C2A8 accent, `popToTop()` for sweep return, 401 → `onAuthRevoked()`, Claude API gated.

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
