export const APP_NAME    = 'Attenuate';
export const APP_TAGLINE = 'Your inbox is noise. Attenuate it.';
export const APP_VERSION = '1.0.0';

// Claude API — wired, disabled until key is configured
export const CLAUDE_MODEL   = 'claude-sonnet-4-6';
export const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// RevenueCat
export const RC_API_KEY_ANDROID = 'REPLACE_WITH_RC_ANDROID_KEY';

export const ENTITLEMENT_PRO = 'attenuate_pro';
export const ENTITLEMENT_AI  = 'attenuate_ai';

// Google OAuth2 — Android credential (package: com.mysterwolf.attenuate)
// Uses PKCE browser flow via expo-auth-session; no client secret required.
export const GOOGLE_CLIENT_ID_ANDROID = '985734610646-onbdl5dsd3nnocqmioqbp80jghmj4336.apps.googleusercontent.com';
export const GOOGLE_CLIENT_ID         = GOOGLE_CLIENT_ID_ANDROID;
// Client secret only needed for Web application credentials; leave as placeholder for Android.
export const GOOGLE_CLIENT_SECRET = 'REPLACE_WITH_WEB_CLIENT_SECRET';

// OAuth redirect scheme — must match the intent-filter in AndroidManifest.xml
// Generated automatically by expo-auth-session when you run `npx expo run:android`
export const OAUTH_REDIRECT_SCHEME = 'com.mysterwolf.attenuate';

// Gmail API
export const GMAIL_BASE   = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const GMAIL_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/gmail.modify'];

// Sender aggregation — number of messages to sample for top-senders
export const SENDER_SAMPLE    = 200;
export const SENDER_CHUNK     = 25;  // concurrent metadata fetches per round
export const SENDER_TOP_LIMIT = 10;

// AsyncStorage keys
export const STORAGE_THEME        = 'attenuate_theme_mode';
export const STORAGE_OAUTH_TOKENS = 'attenuate_oauth_tokens';
export const STORAGE_USER_EMAIL   = 'attenuate_user_email';
export const STORAGE_API_KEY      = 'attenuate_claude_api_key';
export const STORAGE_SWEEP_LOG    = 'attenuate_sweep_log';

export const STORAGE_SHARE_IMPACT = 'attenuate_share_impact';
export const STORAGE_STREAK      = 'attenuate_streak';
export const STORAGE_MILESTONES  = 'attenuate_milestones';

// Legacy key — kept for migration only, replaced by STORAGE_OAUTH_TOKENS
export const STORAGE_GMAIL_TOKEN  = 'attenuate_gmail_token';

// Telemetry endpoint (community impact)
export const IMPACT_ENDPOINT = 'https://api.attenuate.app/impact';
