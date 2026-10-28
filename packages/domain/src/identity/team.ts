import { createAppError, type AppError } from "../shared/app-error.js";
import type { OrganizationId, TeamId } from "../shared/ids.js";
import { err, ok, type Result } from "../shared/result.js";

export interface TeamProps {
  readonly id: TeamId;
  readonly organizationId: OrganizationId;
  readonly name: string;
}

export class Team {
  readonly id: TeamId;
  readonly organizationId: OrganizationId;
  readonly name: string;

  private constructor(props: TeamProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.name = props.name;
    Object.freeze(this);
  }

  static create(props: TeamProps): Team {
    return new Team(props);
  }
}

export class TeamBuilder {
  private id: TeamId | undefined;
  private organizationId: OrganizationId | undefined;
  private name: string | undefined;

  withId(id: TeamId): this {
    this.id = id;
    return this;
  }

  withOrganizationId(organizationId: OrganizationId): this {
    this.organizationId = organizationId;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  build(): Result<Team, AppError> {
    if (!this.id || !this.organizationId || this.name === undefined) return err(createAppError("VALIDATION"));
    const name = this.name.trim();
    if (name.length === 0) return err(createAppError("VALIDATION"));
    return ok(Team.create({ id: this.id, organizationId: this.organizationId, name }));
  }
}
