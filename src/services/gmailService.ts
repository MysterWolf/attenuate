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

const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function gFetch<T>(
  token:   string,
  path:    string,
  params?: Record<string, string>,
  attempt = 0,
  tag     = '',
): Promise<T> {
  const url = new URL(`${GMAIL_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  if (tag) console.log(`[gmail] calling ${tag}`, path, params ?? '');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (tag) console.log(`[gmail] ${tag} response:`, res.status);

  if (res.status === 401) {
    await clearTokens();
    throw new GmailAuthError();
  }

  if (!res.ok) {
    const body = await res.text();
    console.error('[Attenuate/Gmail]', `${res.status} on ${path} (attempt ${attempt + 1})`, body);

    // Retry transient backend errors (5xx) with exponential backoff
    if (res.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      return gFetch(token, path, params, attempt + 1, tag);
    }

    throw new Error(`Gmail API ${res.status} (${path}): ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────

// Account email + total message count across all mail
export async function getProfile(token: string): Promise<GmailProfile> {
  console.log('[gmail] calling getProfile');
  const data = await gFetch<{ emailAddress: string; messagesTotal: number; threadsTotal: number }>(
    token, '/profile', undefined, 0, 'getProfile',
  );
  console.log('[gmail] getProfile response: 200', data.emailAddress, data.messagesTotal);
  return {
    email:         data.emailAddress,
    messagesTotal: data.messagesTotal,
    threadsTotal:  data.threadsTotal,
  };
}

// Exact inbox message count and unread count via the INBOX system label
export async function getInboxLabel(token: string): Promise<InboxLabel> {
  console.log('[gmail] calling getInboxLabel');
  const data = await gFetch<{ messagesTotal: number; messagesUnread: number }>(
    token, '/labels/INBOX', undefined, 0, 'getInboxLabel',
  );
  console.log('[gmail] getInboxLabel response: 200', data);
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
  console.log('[gmail] calling getTopSenders');

  // Step 1: collect up to SENDER_SAMPLE message IDs from inbox
  const msgIds: string[] = [];
  let pageToken: string | undefined;
  let listPage = 0;

  while (msgIds.length < SENDER_SAMPLE) {
    const remaining   = SENDER_SAMPLE - msgIds.length;
    const maxResults  = String(Math.min(200, remaining));
    const params: Record<string, string> = { maxResults, q: 'in:inbox' };
    if (pageToken) params.pageToken = pageToken;

    const page = await gFetch<{
      messages?: Array<{ id: string }>;
      nextPageToken?: string;
      resultSizeEstimate?: number;
    }>(token, '/messages', params, 0, `getTopSenders/list[${listPage}]`);
    listPage++;

    const batch = page.messages ?? [];
    msgIds.push(...batch.map(m => m.id));

    if (!page.nextPageToken || batch.length === 0) break;
    pageToken = page.nextPageToken;
  }

  console.log('[gmail] getTopSenders/list done, msgIds:', msgIds.length);

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

  console.log('[gmail] getTopSenders/msg done, unique senders:', Object.keys(senderMap).length);

  // Step 3: sort by count descending, return top N
  return Object.entries(senderMap)
    .map(([email, { name, count }]) => ({ email, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ── Sweep helpers ─────────────────────────────────────

// Single list call: returns an estimated total count + a handful of sample IDs
// for subject preview. Never fetches more than one page — safe for any inbox size.
export async function getPreviewData(
  token: string,
  q:     string,
): Promise<{ estimatedCount: number; sampleIds: string[] }> {
  const result = await gFetch<{
    messages?:           Array<{ id: string }>;
    resultSizeEstimate?: number;
  }>(token, '/messages', { maxResults: '5', q }, 0, 'getPreviewData');

  const sampleIds     = (result.messages ?? []).map(m => m.id);
  const estimatedCount = result.resultSizeEstimate ?? sampleIds.length;
  console.log('[gmail] getPreviewData estimate:', estimatedCount, 'sampleIds:', sampleIds.length);
  return { estimatedCount, sampleIds };
}

// Streaming delete: fetches 500 IDs per page and immediately trashes them,
// then advances via nextPageToken. Never holds more than 500 IDs in memory.
//
// Per-page batchModify failures are logged and skipped (non-fatal) — the
// nextPageToken still advances to the next block of IDs. 401s are always fatal.
//
// Returns the actual count of messages successfully trashed.
export async function streamDeleteByQuery(
  token:       string,
  q:           string,
  onProgress:  (deleted: number) => void,
  onPageError: (pageNum: number, err: unknown) => void,
): Promise<number> {
  let pageToken: string | undefined;
  let pageNum      = 0;
  let totalDeleted = 0;

  console.log('[gmail] streamDeleteByQuery start:', q);

  while (true) {
    // ── 1. Fetch next page of IDs ──────────────────────
    const params: Record<string, string> = { maxResults: '500', q };
    if (pageToken) params.pageToken = pageToken;

    const listResult = await gFetch<{
      messages?:      Array<{ id: string }>;
      nextPageToken?: string;
    }>(token, '/messages', params, 0, `streamDelete/list[${pageNum}]`);

    const ids = (listResult.messages ?? []).map(m => m.id);
    if (ids.length === 0) break;

    // ── 2. Trash this page ────────────────────────────
    try {
      const res = await fetch(`${GMAIL_BASE}/messages/batchModify`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids,
          addLabelIds:    ['TRASH'],
          removeLabelIds: ['INBOX', 'UNREAD'],
        }),
      });

      if (res.status === 401) {
        await clearTokens();
        throw new GmailAuthError();
      }

      if (!res.ok) {
        const body = await res.text();
        const err  = new Error(`batchModify ${res.status}: ${body}`);
        console.warn('[gmail] streamDelete page', pageNum, 'skip —', err.message);
        onPageError(pageNum, err);
        // Continue — nextPageToken still valid; these IDs are left in inbox
      } else {
        totalDeleted += ids.length;
        onProgress(totalDeleted);
      }
    } catch (err) {
      if (err instanceof GmailAuthError) throw err;
      console.warn('[gmail] streamDelete page', pageNum, 'skip —', err);
      onPageError(pageNum, err);
    }

    if (!listResult.nextPageToken) break;
    pageToken = listResult.nextPageToken;
    pageNum++;
  }

  console.log('[gmail] streamDeleteByQuery done, totalDeleted:', totalDeleted);
  return totalDeleted;
}

// Fetch up to `limit` subject lines from a list of message IDs.
export async function getSampleSubjects(
  token:  string,
  msgIds: string[],
  limit = 5,
): Promise<string[]> {
  console.log('[gmail] calling getSampleSubjects, sample size:', Math.min(msgIds.length, limit));
  const sample = msgIds.slice(0, limit);
  const results = await Promise.all(
    sample.map((id, i) =>
      gFetch<{
        payload?: { headers?: Array<{ name: string; value: string }> };
      }>(token, `/messages/${id}`, { format: 'metadata', metadataHeaders: 'Subject' }, 0, `getSampleSubjects[${i}]`),
    ),
  );
  console.log('[gmail] getSampleSubjects done');
  return results.map(msg => {
    const subject = msg.payload?.headers?.find(h => h.name === 'Subject')?.value ?? '(no subject)';
    return subject.length > 80 ? subject.slice(0, 77) + '…' : subject;
  });
}

// Move messages to Trash in batches of 1,000 using batchModify.
// batchDelete requires the mail.google.com scope; batchModify works with gmail.modify.
// Messages are auto-purged from Trash after 30 days.
// Calls onProgress(trashed, total) after each batch.
export async function batchDeleteMessages(
  token:      string,
  msgIds:     string[],
  onProgress: (deleted: number, total: number) => void,
): Promise<number> {
  const BATCH = 1000;
  let deleted = 0;
  const total = msgIds.length;

  console.log('[gmail] calling batchDeleteMessages, total:', total);

  for (let i = 0; i < msgIds.length; i += BATCH) {
    const chunk = msgIds.slice(i, i + BATCH);
    const url   = `${GMAIL_BASE}/messages/batchModify`;

    console.log(`[gmail] batchModify batch ${i}–${i + chunk.length}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids:              chunk,
        addLabelIds:      ['TRASH'],
        removeLabelIds:   ['INBOX', 'UNREAD'],
      }),
    });

    console.log(`[gmail] batchModify response:`, res.status);

    if (res.status === 401) {
      await clearTokens();
      throw new GmailAuthError();
    }
    if (!res.ok) {
      const body = await res.text();
      console.error('[Attenuate/Gmail]', `batchModify ${res.status} batch starting at ${i}`, body);
      throw new Error(`Gmail batchModify ${res.status}: ${body}`);
    }

    deleted += chunk.length;
    onProgress(deleted, total);
  }

  console.log('[gmail] batchDeleteMessages done, deleted:', deleted);
  return deleted;
}

// ── Helpers ───────────────────────────────────────────

// Parse RFC 2822 From header into { name, email }.
// Returns empty strings if no valid email address can be extracted —
// callers filter on !email to discard unparseable headers.
function parseFrom(header: string): { name: string; email: string } {
  const angleMatch = header.match(/^(.*?)\s*<([^>]+)>/);
  if (angleMatch) {
    const name  = angleMatch[1].trim().replace(/^"|"$/g, '');
    const email = angleMatch[2].trim().toLowerCase();
    if (!email.includes('@')) return { name: '', email: '' };
    return { name: name || email, email };
  }
  const email = header.trim().toLowerCase();
  if (!email.includes('@')) return { name: '', email: '' };
  return { name: email, email };
}
