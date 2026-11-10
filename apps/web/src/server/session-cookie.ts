import { ANON_ROOM_TTL_MINUTES } from "@fibonaipe/domain";

const ROOM_COOKIE = "fib_session";
const ACCOUNT_COOKIE = "fib_account";
const ACCOUNT_MAX_AGE = 60 * 60 * 24 * 14;

export function guestSessionCookie(token: string): string {
  const maxAge = ANON_ROOM_TTL_MINUTES * 60;
  return cookieLine(ROOM_COOKIE, token, maxAge);
}

export function clearSessionCookie(): string {
  return cookieLine(ROOM_COOKIE, "", 0);
}

export function accountSessionCookie(token: string): string {
  return cookieLine(ACCOUNT_COOKIE, token, ACCOUNT_MAX_AGE);
}

export function clearAccountCookie(): string {
  return cookieLine(ACCOUNT_COOKIE, "", 0);
}

export function readSessionToken(cookieHeader: string | undefined): string | null {
  return readNamedCookie(cookieHeader, ROOM_COOKIE);
}

export function readAccountToken(cookieHeader: string | undefined): string | null {
  return readNamedCookie(cookieHeader, ACCOUNT_COOKIE);
}

function cookieLine(name: string, token: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function readNamedCookie(cookieHeader: string | undefined, expected: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== expected) continue;
    const raw = part.slice(separator + 1).trim().replaceAll('"', "");
    if (raw.length === 0) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function secretsMatch(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    diff |= leftCode ^ rightCode;
  }
  return diff === 0;
}
