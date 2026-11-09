import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useI18n, type TranslationKey } from "../../client/i18n/index.js";

interface TeamRow {
  readonly teamId: string;
  readonly name: string;
  readonly role: TeamRole;
}

type TeamRole = "teamAdmin" | "pm" | "po" | "dev" | "qa" | "observer";

const ROLE_KEYS: Record<TeamRole, TranslationKey> = {
  teamAdmin: "teams.roles.teamAdmin",
  pm: "teams.roles.pm",
  po: "teams.roles.po",
  dev: "teams.roles.dev",
  qa: "teams.roles.qa",
  observer: "teams.roles.observer",
};

export function TeamsPage() {
  const { t } = useI18n();
  const [teams, setTeams] = useState<readonly TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teams", { credentials: "include" });
      if (response.status === 401 || response.status === 403) {
        setForbidden(true);
        setTeams([]);
        setError(false);
        return;
      }
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as { teams?: readonly TeamRow[] };
      setTeams(data.teams ?? []);
      setForbidden(false);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    setSaving(true);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (response.status === 401 || response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("save failed");
      setName("");
      setError(false);
      await load();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface" aria-labelledby="teams-title" aria-busy={loading}>
      <h1 id="teams-title">{t("teams.title")}</h1>
      <p>{t("teams.subtitle")}</p>
      {forbidden ? <p role="alert">{t("teams.signInRequired")}</p> : null}
      {loading ? <p role="status">{t("teams.loading")}</p> : null}
      {error ? <p role="alert">{t("teams.error")}</p> : null}
      {!loading && !forbidden && !error && teams.length === 0 ? <p>{t("teams.empty")}</p> : null}
      <ul>
        {teams.map((team) => (
          <li key={team.teamId}>
            <a href={`/teams/${encodeURIComponent(team.teamId)}/sprints`} aria-label={t("teams.open", { name: team.name })}>
              {team.name}
            </a>
            {" — "}
            <span>{t("teams.role", { role: t(ROLE_KEYS[team.role] ?? "teams.roles.observer") })}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={(event) => { void submit(event); }} aria-label={t("teams.create")}>
        <label htmlFor="team-name">{t("teams.name")}</label>
        <input
          id="team-name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" disabled={saving}>{t("teams.create")}</button>
      </form>
    </section>
  );
}
