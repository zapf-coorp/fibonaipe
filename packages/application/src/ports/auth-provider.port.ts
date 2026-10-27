import type { AppError, Result, UserId } from "@fibonaipe/domain";

export interface AuthenticatedIdentity {
  readonly userId: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly emailVerifiedAt: Date;
}

export interface AuthProvider {
  sendMagicLink(email: string, redirectUrl: string): Promise<Result<{ challengeId: string }, AppError>>;
  verifyMagicLink(token: string): Promise<Result<AuthenticatedIdentity, AppError>>;
  getGoogleAuthUrl(state: string, redirectUrl: string): Result<{ url: string }, AppError>;
  exchangeGoogleCode(code: string, redirectUrl: string): Promise<Result<AuthenticatedIdentity, AppError>>;
  verifySessionToken(token: string): Promise<Result<AuthenticatedIdentity, AppError>>;
  revokeUserSessions(userId: UserId): Promise<Result<void, AppError>>;
}
