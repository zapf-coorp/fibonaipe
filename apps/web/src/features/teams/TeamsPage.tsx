import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { MembersModal } from "./MembersModal.js";
import { TasksModal } from "./TasksModal.js";
import { readJson, ROLE_KEYS, sendAction, type TeamRow } from "./team-shared.js";
import styles from "./TeamsPage.module.css";

type OpenPanel = "members" | "tasks" | null;

export function TeamsPage() {
  const { t } = useI18n();
  const [teams, setTeams] = useState<readonly TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const reportError = useCallback(() => setError(true), []);

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
      const data = await readJson<{ teams?: readonly TeamRow[] }>(response);
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
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (!invite) {
      void load();
      return;
    }
    void fetch("/api/invites/accept", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: invite }),
    }).finally(() => {
      window.history.replaceState(null, "", "/teams");
      void load();
    });
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    setSaving(true);
    try {
      const response = await sendAction("/api/teams", {
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
    <section className={styles.page} aria-labelledby="teams-title" aria-busy={loading}>
      <h1 id="teams-title">{t("teams.title")}</h1>
      <p>{t("teams.subtitle")}</p>
      {forbidden ? (
        <p role="alert">
          {t("teams.signInRequired")}{" "}
          <a href="/dev/login">{t("teams.devLogin")}</a>
        </p>
      ) : (
        <form className={styles.bar} onSubmit={(event) => { void submit(event); }} aria-label={t("teams.create")}>
          <label htmlFor="team-name">{t("teams.name")}</label>
          <input id="team-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" style={touchTargetStyle} disabled={saving}>{t("teams.create")}</button>
        </form>
      )}
      {loading ? <p role="status">{t("teams.loading")}</p> : null}
      {error ? <p role="alert">{t("teams.error")}</p> : null}
      {!loading && !forbidden && !error && teams.length === 0 ? <p>{t("teams.empty")}</p> : null}
      <ul className={styles.list}>
        {teams.map((team) => (
          <TeamLine key={team.teamId} team={team} onChanged={() => { void load(); }} onError={reportError} />
        ))}
      </ul>
    </section>
  );
}

function TeamLine({
  team,
  onChanged,
  onError,
}: {
  readonly team: TeamRow;
  readonly onChanged: () => void;
  readonly onError: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const [panel, setPanel] = useState<OpenPanel>(null);
  const skipBlur = useRef(false);
  const role = t(ROLE_KEYS[team.role] ?? "teams.roles.observer");

  useEffect(() => {
    setDraft(team.name);
  }, [team.name]);

  async function save() {
    const next = draft.trim();
    setEditing(false);
    if (next.length === 0 || next === team.name) {
      setDraft(team.name);
      return;
    }
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (!response.ok) onError();
    else onChanged();
  }

  return (
    <li className={styles.row}>
      <div className={styles.nameGroup}>
        {editing ? (
          <input
            aria-label={t("teams.rename")}
            maxLength={80}
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              void save();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                skipBlur.current = true;
                setDraft(team.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span className={styles.name}>{team.name}</span>
        )}
        <button
          type="button"
          className={styles.iconButton}
          style={touchTargetStyle}
          aria-label={editing ? t("teams.save") : t("teams.rename")}
          onMouseDown={() => {
            if (editing) skipBlur.current = true;
          }}
          onClick={() => {
            if (editing) void save();
            else {
              setDraft(team.name);
              setEditing(true);
            }
          }}
        >
          {editing ? <CheckIcon /> : <PencilIcon />}
        </button>
        <span className={styles.role}>{role}</span>
      </div>
      <div className={styles.actions}>
        <button type="button" style={touchTargetStyle} onClick={() => setPanel("members")}>{t("teams.members")}</button>
        <button type="button" style={touchTargetStyle} onClick={() => setPanel("tasks")}>{t("teams.tasks")}</button>
      </div>
      {panel === "members" ? (
        <MembersModal team={team} roleLabel={role} onClose={() => setPanel(null)} onChanged={onChanged} onError={onError} />
      ) : null}
      {panel === "tasks" ? (
        <TasksModal team={team} onClose={() => setPanel(null)} onError={onError} />
      ) : null}
    </li>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 12.5 10 17l9-10" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
