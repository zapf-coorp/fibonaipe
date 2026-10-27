export const errorMessageKeys = [
  "errors.VALIDATION",
  "errors.NOT_FOUND",
  "errors.FORBIDDEN",
  "errors.ROOM_FULL",
  "errors.NICKNAME_TAKEN",
  "errors.ROUND_NOT_VOTING",
  "errors.LIMIT_EXCEEDED",
  "errors.RATE_LIMITED",
  "errors.INSUFFICIENT_DATA",
  "errors.LAST_ADMIN",
  "errors.AUTH_LINK_INVALID",
  "errors.ACCOUNT_SUSPENDED",
  "errors.SERVICE_UNAVAILABLE",
] as const;

export type ErrorMessageKey = (typeof errorMessageKeys)[number];

export function messageKeyFor(code: string): ErrorMessageKey {
  const key = `errors.${code}`;
  if ((errorMessageKeys as readonly string[]).includes(key)) return key as ErrorMessageKey;
  return "errors.VALIDATION";
}
