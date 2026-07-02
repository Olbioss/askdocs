import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearChat, loadChat, saveChat } from "@/lib/chat-storage";
import type { ChatMessage } from "@/lib/types";

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "m1",
  role: "user",
  content: "hello",
  createdAt: "2026-07-02T10:00:00.000Z",
  ...over,
});

function fakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeStorage());
});
afterEach(() => vi.unstubAllGlobals());

describe("chat storage", () => {
  it("round-trips completed messages per user", () => {
    const messages = [msg(), msg({ id: "m2", role: "assistant", content: "hi" })];
    saveChat("u1", messages);
    expect(loadChat("u1")).toEqual(messages);
    expect(loadChat("u2")).toEqual([]);
  });

  it("filters out pending messages on save", () => {
    saveChat("u1", [msg(), msg({ id: "m2", pending: true })]);
    expect(loadChat("u1")).toEqual([msg()]);
  });

  it("clears the key when nothing completed remains", () => {
    saveChat("u1", [msg()]);
    saveChat("u1", [msg({ pending: true })]);
    expect(loadChat("u1")).toEqual([]);
  });

  it("returns [] for malformed stored JSON", () => {
    localStorage.setItem("askdocs:chat:v1:u1", "{nope");
    expect(loadChat("u1")).toEqual([]);
  });

  it("clearChat removes the conversation", () => {
    saveChat("u1", [msg()]);
    clearChat("u1");
    expect(loadChat("u1")).toEqual([]);
  });

  it("tolerates a missing/unavailable localStorage", () => {
    vi.unstubAllGlobals();
    expect(() => saveChat("u1", [msg()])).not.toThrow();
    expect(loadChat("u1")).toEqual([]);
    expect(() => clearChat("u1")).not.toThrow();
  });
});
