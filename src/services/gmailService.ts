import { clearTokens } from './authService';
import {
  GMAIL_BASE,
  SENDER_SAMPLE,
  SENDER_CHUNK,
} from '../constants/config';

// ── Types ──────────────────────────────────────────────

export interface GmailProfile {
  email:         string;
  messagesTotal: number;
  threadsTotal:  number;
}

export interface InboxLabel {
  messagesTotal:  number;
  messagesUnread: number;
}

export interface SenderEntry {
  email: string;
  name:  string;
  count: number;
}

// Thrown on 401 — caller should clear tokens and redirect to ConnectScreen
export class GmailAuthError extends Error {
  constructor() { super('Gmail auth expired'); this.name = 'GmailAuthError'; }
}

// ── Core fetch helper ─────────────────────────────────

async function gFetch<T>(
  token: string,
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${GMAIL_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    await clearTokens();
    throw new GmailAuthError();
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API ${res.status}: ${body.slice(0, 120)}`);
  }

  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────

// Account email + total message count across all mail
export async function getProfile(token: string): Promise<GmailProfile> {
  const data = await gFetch<{ emailAddress: string; messagesTotal: number; threadsTotal: number }>(
    token, '/profile',
  );
  return {
    email:         data.emailAddress,
    messagesTotal: data.messagesTotal,
    threadsTotal:  data.threadsTotal,
  };
}

// Exact inbox message count and unread count via the INBOX system label
export async function getInboxLabel(token: string): Promise<InboxLabel> {
  const data = await gFetch<{ messagesTotal: number; messagesUnread: number }>(
    token, '/labels/INBOX',
  );
  return {
    messagesTotal:  data.messagesTotal,
    messagesUnread: data.messagesUnread,
  };
}

// Top senders by message volume.
// Mirrors the Apps Script batch-sweep pattern: collect IDs in pages of SENDER_SAMPLE,
// then fetch From headers in concurrent chunks of SENDER_CHUNK, aggregate by sender.
export async function getTopSenders(
  token:     string,
  limit:     number,
  userEmail: string,
): Promise<SenderEntry[]> {
  // Step 1: collect up to SENDER_SAMPLE message IDs from inbox
  const msgIds: string[] = [];
  let pageToken: string | undefined;

  while (msgIds.length < SENDER_SAMPLE) {
    const remaining   = SENDER_SAMPLE - msgIds.length;
    const maxResults  = String(Math.min(200, remaining));
    const params: Record<string, string> = { maxResults, q: 'in:inbox' };
    if (pageToken) params.pageToken = pageToken;

    const page = await gFetch<{
      messages?: Array<{ id: string }>;
      nextPageToken?: string;
      resultSizeEstimate?: number;
    }>(token, '/messages', params);

    const batch = page.messages ?? [];
    msgIds.push(...batch.map(m => m.id));

    if (!page.nextPageToken || batch.length === 0) break;
    pageToken = page.nextPageToken;
  }

  if (msgIds.length === 0) return [];

  // Step 2: fetch From headers in concurrent chunks (mirrors script's batchSize loop)
  const senderMap: Record<string, { name: string; count: number }> = {};
  const normalizedUserEmail = userEmail.toLowerCase();

  for (let i = 0; i < msgIds.length; i += SENDER_CHUNK) {
    const chunk = msgIds.slice(i, i + SENDER_CHUNK);
    const results = await Promise.all(
      chunk.map(id =>
        gFetch<{
          payload?: { headers?: Array<{ name: string; value: string }> };
        }>(token, `/messages/${id}`, {
          format: 'metadata',
          metadataHeaders: 'From',
        }),
      ),
    );

    for (const msg of results) {
      const fromHeader = msg.payload?.headers?.find(h => h.name === 'From')?.value ?? '';
      if (!fromHeader) continue;
      const { email, name } = parseFrom(fromHeader);
      if (!email || email.toLowerCase() === normalizedUserEmail) continue;
      if (!senderMap[email]) senderMap[email] = { name, count: 0 };
      senderMap[email].count++;
    }
  }

  // Step 3: sort by count descending, return top N
  return Object.entries(senderMap)
    .map(([email, { name, count }]) => ({ email, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ── Helpers ───────────────────────────────────────────

// Parse RFC 2822 From header into { name, email }
// Handles: "Display Name <addr@example.com>", "addr@example.com", "Name<addr>"
function parseFrom(header: string): { name: string; email: string } {
  const angleMatch = header.match(/^(.*?)\s*<([^>]+)>/);
  if (angleMatch) {
    const name  = angleMatch[1].trim().replace(/^"|"$/g, '');
    const email = angleMatch[2].trim().toLowerCase();
    return { name: name || email, email };
  }
  const email = header.trim().toLowerCase();
  return { name: email, email };
}
