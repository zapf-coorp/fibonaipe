import { createAppError, type AppError } from "../shared/app-error.js";
import type { UserId } from "../shared/ids.js";
import { err, ok, type Result } from "../shared/result.js";

export type UserStatus = "active" | "suspended";
export type UserTheme = "light" | "dark" | "system";

const STATUSES: ReadonlySet<string> = new Set(["active", "suspended"]);
const THEMES: ReadonlySet<string> = new Set(["light", "dark", "system"]);

export interface UserProps {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly status: UserStatus;
  readonly isSuperAdmin: boolean;
  readonly locale: string;
  readonly theme: UserTheme;
}

export function normalizeUserEmail(raw: string): Result<string, AppError> {
  const email = raw.trim().toLowerCase();
  const at = email.indexOf("@");
  const domain = at > 0 ? email.slice(at + 1) : "";
  if (at <= 0 || email.indexOf("@", at + 1) !== -1 || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return err(createAppError("VALIDATION"));
  }
  if (email.slice(0, at).length === 0 || /\s/.test(email)) return err(createAppError("VALIDATION"));
  return ok(email);
}

export class User {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly status: UserStatus;
  readonly isSuperAdmin: boolean;
  readonly locale: string;
  readonly theme: UserTheme;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.displayName = props.displayName;
    this.status = props.status;
    this.isSuperAdmin = props.isSuperAdmin;
    this.locale = props.locale;
    this.theme = props.theme;
    Object.freeze(this);
  }

  static create(props: UserProps): User {
    return new User(props);
  }
}

export class UserBuilder {
  private id: UserId | undefined;
  private email: string | undefined;
  private displayName: string | undefined;
  private status: UserStatus | undefined;
  private superAdmin: boolean | undefined;
  private locale: string | undefined;
  private theme: UserTheme | undefined;

  withId(id: UserId): this {
    this.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withDisplayName(displayName: string): this {
    this.displayName = displayName;
    return this;
  }

  withStatus(status: UserStatus): this {
    this.status = status;
    return this;
  }

  withSuperAdmin(isSuperAdmin: boolean): this {
    this.superAdmin = isSuperAdmin;
    return this;
  }

  withLocale(locale: string): this {
    this.locale = locale;
    return this;
  }

  withTheme(theme: UserTheme): this {
    this.theme = theme;
    return this;
  }

  build(): Result<User, AppError> {
    if (!this.id || this.email === undefined || this.displayName === undefined || !this.status || this.superAdmin === undefined || !this.locale || !this.theme) {
      return err(createAppError("VALIDATION"));
    }
    if (!STATUSES.has(this.status) || !THEMES.has(this.theme)) return err(createAppError("VALIDATION"));
    const email = normalizeUserEmail(this.email);
    if (!email.ok) return email;
    const displayName = this.displayName.trim();
    const locale = this.locale.trim();
    if (displayName.length === 0 || locale.length === 0) return err(createAppError("VALIDATION"));
    return ok(
      User.create({
        id: this.id,
        email: email.value,
        displayName,
        status: this.status,
        isSuperAdmin: this.superAdmin,
        locale,
        theme: this.theme,
      }),
    );
  }
}
