import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { requireTeamAction } from "./access.js";

export interface TeamTaskSummary {
  readonly id: string;
  readonly title: string;
  readonly sprintName: string;
  readonly link: string;
  readonly key: string;
}

export interface CreateTeamTaskInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly title: string;
  readonly sprintName: string;
  readonly link: string;
}

function httpLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function taskKey(sprintName: string, number: number): string {
  return sprintName.length > 0 ? `${sprintName}-task${number}` : `task${number}`;
}

export class ListTeamTasks {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: { readonly teamId: string; readonly actorUserId: string }): Promise<Result<readonly TeamTaskSummary[], AppError>> {
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "viewDashboard");
    if (!allowed.ok) return allowed;
    return this.deps.persistence.transaction({}, async (repos) => {
      const tasks = await repos.teamTasks.listByTeam(allowed.value.teamId);
      return ok(tasks.map((task) => ({
        id: task.id,
        title: task.title,
        sprintName: task.sprintName,
        link: task.link,
        key: taskKey(task.sprintName, task.number),
      })));
    });
  }
}

export class CreateTeamTask {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: CreateTeamTaskInput): Promise<Result<TeamTaskSummary, AppError>> {
    const title = input.title.trim();
    if (title.length === 0 || title.length > 120) return err(createAppError("VALIDATION"));
    const link = input.link.trim();
    if (link.length > 2000 || (link.length > 0 && !httpLink(link))) return err(createAppError("VALIDATION"));
    const requested = input.sprintName.trim();
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "viewDashboard");
    if (!allowed.ok) return allowed;
    return this.deps.persistence.transaction({}, async (repos) => {
      const tasks = await repos.teamTasks.listByTeam(allowed.value.teamId);
      const canonical = tasks.find((task) => task.sprintName.toLowerCase() === requested.toLowerCase())?.sprintName ?? requested;
      const number = tasks.filter((task) => task.sprintName === canonical).reduce((max, task) => Math.max(max, task.number), 0) + 1;
      const id = this.deps.ids.newId();
      const task = { id, teamId: allowed.value.teamId, title, sprintName: canonical, link, number };
      await repos.teamTasks.save(task);
      return ok({ id, title, sprintName: canonical, link, key: taskKey(canonical, number) });
    });
  }
}

export class DeleteTeamTask {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: { readonly teamId: string; readonly actorUserId: string; readonly taskId: string }): Promise<Result<{ readonly deleted: true }, AppError>> {
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "viewDashboard");
    if (!allowed.ok) return allowed;
    return this.deps.persistence.transaction({}, async (repos) => {
      const tasks = await repos.teamTasks.listByTeam(allowed.value.teamId);
      const task = tasks.find((item) => item.id === input.taskId);
      if (!task) return err(createAppError("NOT_FOUND"));
      await repos.teamTasks.delete(task.id);
      return ok({ deleted: true as const });
    });
  }
}
