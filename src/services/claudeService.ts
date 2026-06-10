import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLAUDE_API_URL, CLAUDE_MODEL, STORAGE_API_KEY } from '../constants/config';

export interface ClaudeMessage {
  role:    'user' | 'assistant';
  content: string;
}

export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_API_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_API_KEY, key);
}

export async function clearApiKey(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_API_KEY);
}

export async function isApiKeyConfigured(): Promise<boolean> {
  const key = await getApiKey();
  return key != null && key.length > 0;
}

// Disabled until API key is configured — wired for AI tier features
export async function sendMessage(
  messages: ClaudeMessage[],
  systemPrompt: string,
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('Claude API key not configured');

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: 1024,
      system:     systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text ?? '';
}
