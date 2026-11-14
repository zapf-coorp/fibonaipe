/** Rooms already linked in this tab, so re-renders do not repeat the request. */
const linkedRooms = new Set<string>();

/**
 * Binds the guest seat in `code` to the signed-in account, once per room per tab.
 * Anonymous visitors and failures are ignored: the room keeps working as a guest.
 */
export async function linkGuestSeatToAccount(code: string): Promise<void> {
  if (!code || linkedRooms.has(code)) return;
  linkedRooms.add(code);
  try {
    const me = await fetch("/api/auth/me", { credentials: "include" });
    if (!me.ok) return;
    const data = (await me.json()) as { user: unknown };
    if (!data.user) return;
    const linked = await fetch(`/api/rooms/${encodeURIComponent(code)}/link-account`, {
      method: "POST",
      credentials: "include",
    });
    if (!linked.ok) linkedRooms.delete(code);
  } catch {
    linkedRooms.delete(code);
  }
}
