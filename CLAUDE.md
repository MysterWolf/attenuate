@AGENTS.md

# Attenuate — Claude Context
**Last updated:** June 2026
**Version:** 1.0.0 (versionCode 1)

## What This Is
An Android email management app. Delete email at scale — your inbox is noise. Connects to Gmail via OAuth, lets users select targets (old unread, newsletters, promotions, by sender, by keyword), previews the blast radius, then executes bulk delete / archive operations. AI tier uses Claude API to suggest smart sweep targets.

**Repo:** github.com/MysterWolf/attenuate (branch: main)  
**Package:** `com.mysterwolf.attenuate`

## Tech Stack
| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React Native + Expo bare workflow | SDK 56 |
| Platform | Android-first | iOS deferred |
| Storage | AsyncStorage | No SQLite — sweep log + prefs only |
| Gmail | OAuth2 + Gmail API | Not wired yet — next phase |
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
    StatsScreen.tsx       — inbox overview (total, unread, top senders)
    HistoryScreen.tsx     — log of past sweeps
    SettingsScreen.tsx    — Gmail connect, theme, plan, Ko-fi, API key
    sweep/
      SweepHomeScreen.tsx    — target selection
      SweepPreviewScreen.tsx — preview + confirm
      SweepProgressScreen.tsx — execution + progress
  navigation/
    AppNavigator.tsx      — 4-tab bottom bar (Stats / Sweep / History / Settings)
    SweepNavigator.tsx    — native-stack inside Sweep tab
  providers/
    ThemeProvider.tsx     — dark/light/auto, persisted via AsyncStorage
  services/
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
        └── AppContent (splash gate)
            ├── MWSSplash  (3 s, then dismissed)
            └── NavigationContainer
                └── AppNavigator  (bottom tabs)
                    ├── Stats tab    → StatsScreen
                    ├── Sweep tab    → SweepNavigator
                    │   ├── SweepHomeScreen
                    │   ├── SweepPreviewScreen
                    │   └── SweepProgressScreen
                    ├── History tab  → HistoryScreen
                    └── Settings tab → SettingsScreen
```

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

## AsyncStorage Keys (src/constants/config.ts)
| Key | Value |
|-----|-------|
| `attenuate_theme_mode` | `'dark' \| 'light' \| 'auto'` |
| `attenuate_gmail_token` | OAuth token (not yet implemented) |
| `attenuate_claude_api_key` | Claude API key string |
| `attenuate_sweep_log` | JSON array of past sweep records |

## Pending Work (Priority Order)
1. Gmail OAuth2 integration — connect account, store token, call Gmail API
2. Stats screen — real inbox counts from Gmail API
3. Sweep execution — actually call Gmail API batch delete/archive
4. Sweep history persistence — write/read from AsyncStorage sweep log
5. RevenueCat — add real API key, wire `initPurchases()` in App.tsx, gate Pro/AI features
6. Claude API — AI sweep suggestions for AI tier (entitlement gate already in place)
7. Local notifications — wire `notificationService.ts` for scheduled sweep reminders
8. App icon + adaptive icon — design and replace placeholder
9. Play Store listing — description, screenshots, privacy policy URL

## Build
```bash
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```
*(Android project not yet run — run `npx expo run:android` first to generate the android/ dir)*

## Session Starter
"I'm working on Attenuate — a React Native email management app at ~/Attenuate. Package: com.mysterwolf.attenuate. Expo SDK 56 bare workflow, Android-only. Read CLAUDE.md in full before making any changes. Confirm you understand the architecture, invariants, and pending work before I give you the next task."

## Available Skills
Skills live at github.com/MysterWolf/skills. Pull that repo and read README.md to see all available skills.

Relevant skills for this repo:
- edit-component — safe editing protocol, context first, invariants respected
- update-context — update this CLAUDE.md after session, commit and push
- audit-repo — read-only snapshot of repo state
