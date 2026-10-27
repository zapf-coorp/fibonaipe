import { createAppError, type AppError } from "../shared/app-error.js";
import { MAX_ITEM_DESC_LENGTH, MAX_ITEM_TITLE_LENGTH } from "../shared/constants.js";
import { err, ok, type Result } from "../shared/result.js";
import type { Card } from "../scales/card.js";
import { parseFigureTag } from "../scales/figure-tag.js";

export type ItemStatus = "pending" | "current" | "estimated" | "skipped" | "deferred";

const ITEM_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "current",
  "estimated",
  "skipped",
  "deferred",
]);

export interface ItemProps {
  readonly id: string;
  readonly roomId: string;
  readonly teamId: string | null;
  readonly title: string;
  readonly description: string;
  readonly externalUrl: string | null;
  readonly externalKey: string | null;
  readonly position: number;
  readonly status: ItemStatus;
  readonly figureTag: string | null;
  readonly finalEstimate: Card | null;
  readonly finalSuit: string | null;
}

function isHttpUrl(value: string): boolean {
  const schemeEnd = value.indexOf(":");
  if (schemeEnd <= 0) return false;
  const scheme = value.slice(0, schemeEnd).toLowerCase();
  if (scheme !== "http" && scheme !== "https") return false;
  const rest = value.slice(schemeEnd + 1);
  return rest.startsWith("//") && rest.length > 2 && !/\s/.test(value);
}

function isItemStatus(value: string): value is ItemStatus {
  return ITEM_STATUSES.has(value);
}

export class Item {
  readonly id: string;
  readonly roomId: string;
  readonly teamId: string | null;
  readonly title: string;
  readonly description: string;
  readonly externalUrl: string | null;
  readonly externalKey: string | null;
  readonly position: number;
  readonly status: ItemStatus;
  readonly figureTag: string | null;
  readonly finalEstimate: Card | null;
  readonly finalSuit: string | null;

  private constructor(props: ItemProps) {
    this.id = props.id;
    this.roomId = props.roomId;
    this.teamId = props.teamId;
    this.title = props.title;
    this.description = props.description;
    this.externalUrl = props.externalUrl;
    this.externalKey = props.externalKey;
    this.position = props.position;
    this.status = props.status;
    this.figureTag = props.figureTag;
    this.finalEstimate = props.finalEstimate;
    this.finalSuit = props.finalSuit;
    Object.freeze(this);
  }

  static create(props: ItemProps): Item {
    return new Item(props);
  }

  withStatus(status: ItemStatus): Item {
    return new Item({ ...this.toProps(), status });
  }

  withPosition(position: number): Item {
    return new Item({ ...this.toProps(), position });
  }

  withEstimate(finalEstimate: Card, finalSuit: string | null): Item {
    return new Item({ ...this.toProps(), status: "estimated", finalEstimate, finalSuit });
  }

  private toProps(): ItemProps {
    return {
      id: this.id,
      roomId: this.roomId,
      teamId: this.teamId,
      title: this.title,
      description: this.description,
      externalUrl: this.externalUrl,
      externalKey: this.externalKey,
      position: this.position,
      status: this.status,
      figureTag: this.figureTag,
      finalEstimate: this.finalEstimate,
      finalSuit: this.finalSuit,
    };
  }
}

export class ItemBuilder {
  private id = "";
  private roomId = "";
  private teamId: string | null = null;
  private title = "";
  private description = "";
  private externalUrl: string | null = null;
  private externalKey: string | null = null;
  private position = 0;
  private status: ItemStatus = "pending";
  private figureTag: string | null = null;

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withRoomId(id: string): this {
    this.roomId = id;
    return this;
  }

  withTeamId(id: string | null): this {
    this.teamId = id;
    return this;
  }

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  withExternalUrl(url: string | null): this {
    this.externalUrl = url;
    return this;
  }

  withExternalKey(key: string | null): this {
    this.externalKey = key;
    return this;
  }

  withPosition(position: number): this {
    this.position = position;
    return this;
  }

  withFigureTag(tag: string | null): this {
    this.figureTag = tag;
    return this;
  }

  withStatus(status: ItemStatus): this {
    this.status = status;
    return this;
  }

  build(): Result<Item, AppError> {
    if (this.id.length === 0 || this.roomId.length === 0) return err(createAppError("VALIDATION"));
    if (this.title.length < 1 || this.title.length > MAX_ITEM_TITLE_LENGTH) return err(createAppError("VALIDATION"));
    if (this.description.length > MAX_ITEM_DESC_LENGTH) return err(createAppError("VALIDATION"));
    if (this.externalUrl !== null && !isHttpUrl(this.externalUrl)) return err(createAppError("VALIDATION"));
    if (!Number.isInteger(this.position) || this.position < 0) return err(createAppError("VALIDATION"));
    if (!isItemStatus(this.status)) return err(createAppError("VALIDATION"));
    let figureTag: string | null = null;
    if (this.figureTag !== null) {
      const parsed = parseFigureTag(this.figureTag);
      if (!parsed.ok) return parsed;
      figureTag = parsed.value;
    }
    return ok(
      Item.create({
        id: this.id,
        roomId: this.roomId,
        teamId: this.teamId,
        title: this.title,
        description: this.description,
        externalUrl: this.externalUrl,
        externalKey: this.externalKey,
        position: this.position,
        status: this.status,
        figureTag,
        finalEstimate: null,
        finalSuit: null,
      }),
    );
  }
}
