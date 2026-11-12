import { useEffect, useState, type FormEvent } from "react";
import { CommitTagField } from "../../client/components/commit-tag/CommitTagField.js";
import { TaskLine } from "../../client/components/task-line/TaskLine.js";
import { beginErrorFlash, showErrorFlash } from "../../client/error-flash.js";
import { useI18n } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { isHttp } from "../planning/model.js";
import { CloseIcon, TeamDialog } from "./TeamDialog.js";
import { readJson, sendAction, type TaskRow, type TeamRow } from "./team-shared.js";
import styles from "./TeamsPage.module.css";

export function TasksModal({
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

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const sprintName = sprint.trim();
    if (sprintName.length === 0) return;
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
    <TeamDialog titleId={titleId} title={t("teams.tasksOf", { name: team.name })} onClose={onClose} grow>
      <input
        aria-label={t("teams.filter")}
        placeholder={t("teams.filter")}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <form className={styles.taskRow} onSubmit={(event) => { void addTask(event); }}>
        <CommitTagField
          value={sprint}
          onChange={setSprint}
          suggestions={sprintNames}
          label={t("teams.sprintHint")}
          placeholder={t("teams.sprintHint")}
          addLabel={(name) => t("teams.addSprint", { name })}
        />
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
          <li key={task.id}>
            <TaskLine sprintName={task.sprintName} title={task.title} href={task.link && isHttp(task.link) ? task.link : undefined}>
              <button type="button" className={styles.iconButton} style={touchTargetStyle} aria-label={t("teams.remove")} onClick={() => { void removeTask(task.id); }}>
                <CloseIcon />
              </button>
            </TaskLine>
          </li>
        ))}
      </ul>
    </TeamDialog>
  );
}

function sameTasks(current: readonly TaskRow[], next: readonly TaskRow[]): boolean {
  if (current.length !== next.length) return false;
  return current.every((task, index) => {
    const other = next[index];
    return other !== undefined && task.id === other.id && task.title === other.title && task.sprintName === other.sprintName && task.link === other.link;
  });
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
