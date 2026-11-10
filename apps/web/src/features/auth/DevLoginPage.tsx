import { useEffect, useState } from "react";
import { useI18n, type TranslationKey } from "../../client/i18n/index.js";

type DevRole = "teamAdmin" | "pm" | "dev" | "qa";
type DevMethod = "email" | "google";

interface DevUser {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: DevRole;
}

const ROLE_KEYS: Record<DevRole, TranslationKey> = {
  teamAdmin: "teams.roles.teamAdmin",
  pm: "teams.roles.pm",
  dev: "teams.roles.dev",
  qa: "teams.roles.qa",
};

export function DevLoginPage({ onSignedIn }: { readonly onSignedIn?: () => void }) {
  const { t } = useI18n();
  const [users, setUsers] = useState<readonly DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/dev/auth/status", { credentials: "include" })
      .then(async (response) => {
        if (response.status === 404) {
          if (active) setDisabled(true);
          return;
        }
        if (!response.ok) throw new Error("status failed");
        const data = (await response.json()) as { users?: readonly DevUser[] };
        if (active) setUsers(data.users ?? []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function signIn(user: DevUser, method: DevMethod) {
    setBusy(`${user.email}:${method}`);
    setError(false);
    try {
      const response = await fetch("/api/dev/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: user.email, method }),
      });
      if (!response.ok) throw new Error("login failed");
      if (onSignedIn) onSignedIn();
      else window.location.assign("/teams");
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="surface" aria-labelledby="dev-login-title" aria-busy={loading}>
      <nav aria-label={t("devAuth.title")}>
        <a href="/teams">{t("devAuth.back")}</a>
      </nav>
      <h1 id="dev-login-title">{t("devAuth.title")}</h1>
      <p>{t("devAuth.subtitle")}</p>
      <p>{t("devAuth.note")}</p>
      {loading ? <p role="status">{t("devAuth.loading")}</p> : null}
      {disabled ? <p role="alert">{t("devAuth.disabled")}</p> : null}
      {error ? <p role="alert">{t("devAuth.error")}</p> : null}
      {!loading && !disabled ? (
        <ul>
          {users.map((user) => (
            <li key={user.userId}>
              <strong>{user.displayName}</strong>
              {" — "}
              <span>{user.email}</span>
              {" — "}
              <span>{t(ROLE_KEYS[user.role] ?? "teams.roles.dev")}</span>
              <div>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    void signIn(user, "email");
                  }}
                >
                  {busy === `${user.email}:email` ? t("devAuth.signingIn") : t("devAuth.email")}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    void signIn(user, "google");
                  }}
                >
                  {busy === `${user.email}:google` ? t("devAuth.signingIn") : t("devAuth.google")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
