import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../client/i18n/index.js";
import { DevLoginPage } from "./DevLoginPage.js";

type SendStatus = "idle" | "sending" | "sent" | "error";

export interface CallbackParams {
  readonly token?: string;
  readonly code?: string;
}

/**
 * Magic-link and Google redirects land here with the credential in the query
 * (`token`, `code`) or in the hash (`access_token`, implicit flow).
 */
export function readCallbackParams(search: string, hash: string): CallbackParams | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const code = query.get("code") ?? undefined;
  if (code) return { code };
  const token = query.get("token") ?? fragment.get("access_token") ?? query.get("access_token") ?? undefined;
  return token ? { token } : null;
}

export function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [callbackFailed, setCallbackFailed] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const [devEnabled, setDevEnabled] = useState(false);
  // StrictMode runs effects twice; a one-time code must be redeemed only once.
  const redeemed = useRef(false);

  useEffect(() => {
    const params = readCallbackParams(window.location.search, window.location.hash);
    if (!params || redeemed.current) return;
    redeemed.current = true;
    // Drop the credential from the address bar so a reload does not replay it.
    window.history.replaceState(null, "", window.location.pathname);
    void fetch("/api/auth/callback", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    })
      .then((response) => {
        if (response.ok) window.location.assign("/teams");
        else setCallbackFailed(true);
      })
      .catch(() => setCallbackFailed(true));
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/dev/auth/status", { credentials: "include" })
      .then((response) => {
        if (active && response.ok) setDevEnabled(true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendStatus("sending");
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSendStatus(response.ok ? "sent" : "error");
    } catch {
      setSendStatus("error");
    }
  }

  async function continueWithGoogle() {
    setGoogleFailed(false);
    try {
      const response = await fetch("/api/auth/google", { credentials: "include" });
      if (!response.ok) throw new Error("google url failed");
      const data = (await response.json()) as { url: string };
      window.location.assign(data.url);
    } catch {
      setGoogleFailed(true);
    }
  }

  return (
    <section className="surface" aria-labelledby="login-title">
      <h1 id="login-title">{t("auth.title")}</h1>
      <p>{t("auth.subtitle")}</p>

      {callbackFailed ? <p role="alert">{t("auth.error")}</p> : null}

      <form onSubmit={(event) => void sendMagicLink(event)}>
        <label>
          {t("auth.emailLabel")}
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button type="submit" disabled={sendStatus === "sending"}>
          {t("auth.sendMagicLink")}
        </button>
      </form>
      {sendStatus === "sent" ? <p role="status">{t("auth.magicLinkSent")}</p> : null}
      {sendStatus === "error" ? <p role="alert">{t("auth.error")}</p> : null}

      <button type="button" onClick={() => void continueWithGoogle()}>
        {t("auth.googleButton")}
      </button>
      {googleFailed ? <p role="alert">{t("auth.error")}</p> : null}

      {devEnabled ? (
        <div>
          <h2>{t("auth.devSimulatorHeading")}</h2>
          <DevLoginPage />
        </div>
      ) : null}
    </section>
  );
}
