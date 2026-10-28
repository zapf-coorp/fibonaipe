import { setConnectionStatus } from "./status.js";

interface QueuedVote {
  readonly code: string;
  readonly body: string;
}

const queue: QueuedVote[] = [];
let listening = false;

export function enqueueVote(code: string, body: unknown): void {
  queue.push({ code, body: JSON.stringify(body) });
  setConnectionStatus("syncing");
  ensureOnlineFlush();
}

export function nextClientOpId(): string {
  const stamp = queue.length + 1;
  return `01JCLIENTOP${String(stamp).padStart(16, "0")}`;
}

function ensureOnlineFlush(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("online", () => {
    setTimeout(() => {
      void flushVotes();
    }, 0);
  });
}

async function flushVotes(): Promise<void> {
  if (navigator.onLine === false) return;
  while (queue.length > 0) {
    const next = queue[0];
    if (!next) break;
    await fetch(`/api/rooms/${next.code}/votes`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: next.body,
    });
    queue.shift();
  }
  setConnectionStatus("connected");
}
