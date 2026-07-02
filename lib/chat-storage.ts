// Best-effort conversation persistence in localStorage, keyed per user.
// Guards every storage touch: quota errors, private-mode restrictions, and
// non-browser environments must never break the chat itself.

import type { ChatMessage } from "./types";

const key = (userId: string) => `askdocs:chat:v1:${userId}`;

export function loadChat(userId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChat(userId: string, messages: ChatMessage[]): void {
  try {
    const completed = messages.filter((m) => !m.pending);
    if (completed.length === 0) {
      localStorage.removeItem(key(userId));
      return;
    }
    localStorage.setItem(key(userId), JSON.stringify(completed));
  } catch {
    // best-effort
  }
}

export function clearChat(userId: string): void {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // best-effort
  }
}
