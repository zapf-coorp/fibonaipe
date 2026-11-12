import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { beginErrorFlash, showErrorFlash } from "../../client/error-flash.js";
import { useI18n, type TranslationKey } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useAccount } from "../auth/account.js";
import { isHttp } from "../planning/model.js";
import styles from "./TeamsPage.module.css";

interface TeamRow {
  readonly teamId: string;
  readonly name: string;
  readonly role: TeamRole;
}

interface MemberRow {
  readonly id: string;
  readonly name: string;
  readonly role: TeamRole;
}

interface TaskRow {
  readonly id: string;
  readonly title: string;
  readonly sprintName: string;
  readonly link: string;
}

type TeamRole = "teamAdmin" | "pm" | "po" | "dev" | "qa" | "observer";
type OpenPanel = "members" | "tasks" | null;

const ROLE_KEYS: Record<TeamRole, TranslationKey> = {
  teamAdmin: "teams.roles.teamAdmin",
  pm: "teams.roles.pm",
  po: "teams.roles.po",
  dev: "teams.roles.dev",
  qa: "teams.roles.qa",
  observer: "teams.roles.observer",
};

async function sendAction(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const flash = beginErrorFlash();
  try {
    const response = await fetch(input, init);
    if (!response.ok) showErrorFlash(flash);
    return response;
  } catch (error) {
    showErrorFlash(flash);
    throw error;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function sameTasks(current: readonly TaskRow[], next: readonly TaskRow[]): boolean {
  if (current.length !== next.length) return false;
  return current.every((task, index) => {
    const other = next[index];
    return other !== undefined && task.id === other.id && task.title === other.title && task.sprintName === other.sprintName && task.link === other.link;
  });
}

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

function MembersModal({
  team,
  roleLabel,
  onClose,
  onChanged,
  onError,
}: {
  readonly team: TeamRow;
  readonly roleLabel: string;
  readonly onClose: () => void;
  readonly onChanged: () => void;
  readonly onError: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAccount();
  const [members, setMembers] = useState<readonly MemberRow[]>([]);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const owner = team.role === "teamAdmin";
  const titleId = `members-${team.teamId}`;

  useEffect(() => {
    let active = true;
    void fetch(`/api/teams/${encodeURIComponent(team.teamId)}/members`, { credentials: "include" }).then(async (response) => {
      if (!active) return;
      if (!response.ok) {
        onError();
        return;
      }
      const data = await readJson<{ members?: readonly MemberRow[] }>(response);
      setMembers(data.members ?? []);
    });
    return () => {
      active = false;
    };
  }, [onError, team.teamId, version]);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/members`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) onError();
    else {
      setEmail("");
      setVersion((current) => current + 1);
    }
  }

  async function copyLink() {
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/invites`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      onError();
      return;
    }
    const data = await readJson<{ link?: string }>(response);
    if (data.link) {
      try { await navigator.clipboard.writeText(data.link); } catch { /* the notice still shows the link */ }
    }
    setNotice(data.link ? `${t("teams.invited")}: ${data.link}` : t("teams.invited"));
  }

  async function remove(userId: string) {
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/members/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) onError();
    else setVersion((current) => current + 1);
  }

  async function removeTeam() {
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) onError();
    else {
      onClose();
      onChanged();
    }
  }

  return (
    <Modal titleId={titleId} title={t("teams.membersOf", { name: team.name })} onClose={onClose}>
      <p className={styles.subhead}>{user?.displayName ?? team.name} — {roleLabel}</p>
      <form className={styles.inviteRow} onSubmit={(event) => { void addMember(event); }}>
        <input
          type="email"
          required
          aria-label={t("teams.email")}
          placeholder={t("teams.email")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className={styles.iconButton} style={touchTargetStyle} aria-label={t("teams.send")}>
          <ChevronIcon />
        </button>
        <button type="button" className={styles.linkButton} onClick={() => { void copyLink(); }}>{t("teams.copyLink")}</button>
      </form>
      {notice ? <p role="status">{notice}</p> : null}
      <ul className={styles.plainList}>
        {members.map((member) => (
          <li key={member.id} className={styles.memberRow}>
            <span>{member.name}</span>
            <span className={styles.role}>{t(ROLE_KEYS[member.role] ?? "teams.roles.observer")}</span>
            {owner && member.id !== user?.userId ? (
              <button type="button" style={touchTargetStyle} onClick={() => { void remove(member.id); }}>{t("teams.remove")}</button>
            ) : null}
          </li>
        ))}
      </ul>
      {owner ? (
        <button type="button" className={styles.textButton} onClick={() => { void removeTeam(); }}>{t("teams.delete")}</button>
      ) : null}
    </Modal>
  );
}

function TasksModal({
  team,
  onClose,
  onError,
}: {
  readonly team: TeamRow;
  readonly onClose: () => void;
  readonly onError: () => void;
}) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<readonly TaskRow[]>([]);
  const [sprint, setSprint] = useState("");
  const [sprintQuery, setSprintQuery] = useState("");
  const [sprintOpen, setSprintOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [filter, setFilter] = useState("");
  const [version, setVersion] = useState(0);
  const titleId = `tasks-${team.teamId}`;
  const query = filter.trim().toLowerCase();
  const visible = tasks.filter((task) => {
    if (query.length === 0) return true;
    return task.sprintName.toLowerCase().includes(query) || task.title.toLowerCase().includes(query);
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/teams/${encodeURIComponent(team.teamId)}/tasks`, { credentials: "include" });
        if (!active || !response.ok) return;
        const data = await readJson<{ tasks?: readonly TaskRow[] }>(response);
        const next = (data.tasks ?? []).map((task) => ({ ...task, link: task.link ?? "" }));
        setTasks((current) => (sameTasks(current, next) ? current : next));
      } catch {
        // The next poll retries. A missed beat must not clear the list.
      }
    }
    void load();
    const poll = window.setInterval(() => {
      void load();
    }, 1_500);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [team.teamId, version]);

  const sprintNames = [...new Set(tasks.map((task) => task.sprintName).filter((name) => name.length > 0))];
  const typed = sprintQuery.trim();
  const folded = typed.toLowerCase();
  const matches = sprintNames.filter((name) => folded.length === 0 || name.toLowerCase().includes(folded));
  const exact = sprintNames.find((name) => name.toLowerCase() === folded);

  function chooseSprint(name: string) {
    setSprint(name);
    setSprintQuery("");
    setSprintOpen(false);
  }

  function sprintForTask(): string | null {
    if (typed.length === 0) return sprint;
    if (exact) return exact;
    if (matches.length === 1) return matches[0] ?? typed;
    if (matches.length === 0) return typed;
    return null;
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const sprintName = sprintForTask();
    if (sprintName === null) {
      setSprintOpen(true);
      return;
    }
    const nextLink = link.trim();
    if (nextLink && !isHttp(nextLink)) {
      showErrorFlash(beginErrorFlash());
      onError();
      return;
    }
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/tasks`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, sprintName, link: nextLink }),
    });
    if (!response.ok) onError();
    else {
      setTitle("");
      setLink("");
      setSprintQuery("");
      setSprint(sprintName);
      setVersion((current) => current + 1);
    }
  }

  async function removeTask(taskId: string) {
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) onError();
    else setVersion((current) => current + 1);
  }

  return (
    <Modal titleId={titleId} title={t("teams.tasksOf", { name: team.name })} onClose={onClose}>
      <input
        aria-label={t("teams.filter")}
        placeholder={t("teams.filter")}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <form className={styles.taskRow} onSubmit={(event) => { void addTask(event); }}>
        <div className={styles.sprintField}>
          {sprint ? (
            <button type="button" className={styles.tag} onClick={() => setSprint("")}>
              {sprint}
            </button>
          ) : null}
          <input
            aria-label={t("teams.sprintHint")}
            placeholder={sprint || t("teams.sprintHint")}
            maxLength={80}
            value={sprintQuery}
            onFocus={() => setSprintOpen(true)}
            onBlur={() => setSprintOpen(false)}
            onChange={(event) => {
              setSprint("");
              setSprintQuery(event.target.value);
              setSprintOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || typed.length === 0) return;
              const chosen = sprintForTask();
              if (chosen === null) return;
              event.preventDefault();
              chooseSprint(chosen);
            }}
          />
          {sprintOpen && typed.length > 0 && (matches.length > 0 || !exact) ? (
            <ul className={styles.suggestions}>
              {matches.map((name) => (
                <li key={name}>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSprint(name)}>
                    {name}
                  </button>
                </li>
              ))}
              {!exact && matches.length === 0 ? (
                <li>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSprint(typed)}>
                    {t("teams.addSprint", { name: typed })}
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <span aria-hidden="true">-</span>
        <input
          aria-label={t("teams.taskHint")}
          placeholder={t("teams.taskHint")}
          required
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          aria-label={t("teams.link")}
          placeholder={t("teams.link")}
          maxLength={2000}
          value={link}
          onChange={(event) => setLink(event.target.value)}
        />
        <button type="submit" className={styles.iconButton} style={touchTargetStyle} aria-label={t("teams.include")}>
          <PlusIcon />
        </button>
      </form>
      <ul className={styles.plainList}>
        {visible.map((task) => (
          <li key={task.id} className={styles.taskLine}>
            {task.link && isHttp(task.link) ? (
              <a href={task.link} rel="noopener noreferrer" target="_blank">
                {task.sprintName.length > 0 ? `${task.sprintName} - ${task.title}` : task.title}
              </a>
            ) : (
              <span>{task.sprintName.length > 0 ? `${task.sprintName} - ${task.title}` : task.title}</span>
            )}
            <button type="button" className={styles.iconButton} style={touchTargetStyle} aria-label={t("teams.remove")} onClick={() => { void removeTask(task.id); }}>
              <CloseIcon />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function Modal({
  titleId,
  title,
  onClose,
  children,
}: {
  readonly titleId: string;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const { t } = useI18n();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.dialogHead}>
          <h2 id={titleId}>{title}</h2>
          <button type="button" className={styles.iconButton} style={touchTargetStyle} aria-label={t("teams.close")} onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </div>
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

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
