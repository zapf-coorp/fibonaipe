import { useEffect, useState } from "react";

export interface AccountUser {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
}

export interface AccountTeam {
  readonly teamId: string;
  readonly name: string;
}

let current: AccountUser | null | undefined;
const listeners = new Set<() => void>();

function publish(next: AccountUser | null): void {
  current = next;
  for (const listener of listeners) listener();
}

export async function refreshAccount(): Promise<AccountUser | null> {
  try {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (!response.ok) {
      publish(null);
      return null;
    }
    const body = (await response.json()) as { user?: AccountUser | null };
    const user = body.user?.displayName ? body.user : null;
    publish(user);
    return user;
  } catch {
    publish(null);
    return null;
  }
}

export function useAccount(): { readonly user: AccountUser | null; readonly ready: boolean } {
  const [user, setUser] = useState<AccountUser | null>(current ?? null);
  const [ready, setReady] = useState(current !== undefined);
  useEffect(() => {
    const listener = () => {
      setUser(current ?? null);
      setReady(true);
    };
    listeners.add(listener);
    if (current === undefined) void refreshAccount().finally(() => setReady(true));
    else listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return { user, ready };
}

export async function loadTeams(): Promise<readonly AccountTeam[]> {
  const response = await fetch("/api/teams", { credentials: "include" });
  if (!response.ok) return [];
  const body = (await response.json()) as { teams?: readonly AccountTeam[] };
  return body.teams ?? [];
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  publish(null);
}
