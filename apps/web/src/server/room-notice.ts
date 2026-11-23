const notices = new Map<string, string>();

export function setRoomNotice(code: string, messageKey: string | null): void {
  if (messageKey === null) notices.delete(code);
  else notices.set(code, messageKey);
}

export function roomNotice(code: string): { readonly messageKey: string } | null {
  const messageKey = notices.get(code);
  return messageKey === undefined ? null : { messageKey };
}
