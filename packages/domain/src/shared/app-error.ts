export const AppErrorCode = Object.freeze({
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  ROOM_FULL: "ROOM_FULL",
  NICKNAME_TAKEN: "NICKNAME_TAKEN",
  ROUND_NOT_VOTING: "ROUND_NOT_VOTING",
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  LAST_ADMIN: "LAST_ADMIN",
  AUTH_LINK_INVALID: "AUTH_LINK_INVALID",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
} as const);

export type ErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

export const ERROR_HTTP_STATUS: Readonly<Record<ErrorCode, number>> = Object.freeze({
  VALIDATION: 400,
  AUTH_LINK_INVALID: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  NOT_FOUND: 404,
  ROOM_FULL: 409,
  NICKNAME_TAKEN: 409,
  ROUND_NOT_VOTING: 409,
  LAST_ADMIN: 409,
  INSUFFICIENT_DATA: 409,
  LIMIT_EXCEEDED: 422,
  RATE_LIMITED: 429,
});

export interface AppError {
  readonly code: ErrorCode;
  readonly messageKey: string;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
}

export function createAppError(
  code: ErrorCode,
  messageKey?: string,
  params?: Record<string, string | number | boolean>,
): AppError {
  const error: AppError = {
    code,
    messageKey: messageKey && messageKey.length > 0 ? messageKey : `errors.${code}`,
  };
  if (params) {
    return Object.freeze({ ...error, params: Object.freeze({ ...params }) });
  }
  return Object.freeze(error);
}

export class AppErrorBuilder {
  private code: ErrorCode;
  private messageKey: string;
  private params: Record<string, string | number | boolean> = {};

  private constructor(code: ErrorCode) {
    this.code = code;
    this.messageKey = `errors.${code}`;
  }

  static fromCode(code: ErrorCode): AppErrorBuilder {
    return new AppErrorBuilder(code);
  }

  static validation(messageKey?: string): AppErrorBuilder {
    return AppErrorBuilder.fromCode(AppErrorCode.VALIDATION).withOptionalKey(messageKey);
  }

  static notFound(messageKey?: string): AppErrorBuilder {
    return AppErrorBuilder.fromCode(AppErrorCode.NOT_FOUND).withOptionalKey(messageKey);
  }

  static forbidden(messageKey?: string): AppErrorBuilder {
    return AppErrorBuilder.fromCode(AppErrorCode.FORBIDDEN).withOptionalKey(messageKey);
  }

  withMessageKey(key: string): this {
    this.messageKey = key;
    return this;
  }

  withParam(key: string, value: string | number | boolean): this {
    this.params[key] = value;
    return this;
  }

  withParams(record: Record<string, string | number | boolean>): this {
    this.params = { ...this.params, ...record };
    return this;
  }

  build(): AppError {
    return createAppError(this.code, this.messageKey, { ...this.params });
  }

  private withOptionalKey(messageKey?: string): this {
    if (messageKey) this.messageKey = messageKey;
    return this;
  }
}
