import { beginErrorFlash, showErrorFlash } from "../../client/error-flash.js";
import type { TranslationKey } from "../../client/i18n/index.js";

export interface TeamRow {
  readonly teamId: string;
  readonly name: string;
  readonly role: TeamRole;
}

export interface MemberRow {
  readonly id: string;
  readonly name: string;
  readonly role: TeamRole;
}

export interface TaskRow {
  readonly id: string;
  readonly title: string;
  readonly sprintName: string;
  readonly link: string;
}

export type TeamRole = "teamAdmin" | "pm" | "po" | "dev" | "qa" | "observer";

export const ROLE_KEYS: Record<TeamRole, TranslationKey> = {
  teamAdmin: "teams.roles.teamAdmin",
  pm: "teams.roles.pm",
  po: "teams.roles.po",
  dev: "teams.roles.dev",
  qa: "teams.roles.qa",
  observer: "teams.roles.observer",
};

export async function sendAction(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
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

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
