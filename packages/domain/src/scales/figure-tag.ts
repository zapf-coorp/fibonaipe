import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";

export const FIGURE_TAGS = Object.freeze(["A", "K", "Q", "J"] as const);

export type FigureTag = (typeof FIGURE_TAGS)[number];

export function parseFigureTag(value: string): Result<FigureTag, AppError> {
  for (const tag of FIGURE_TAGS) {
    if (tag === value) return ok(tag);
  }
  return err(createAppError("VALIDATION"));
}
