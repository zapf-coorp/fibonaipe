import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  AppErrorBuilder,
  AppErrorCode,
  ERROR_HTTP_STATUS,
  Result,
  andThen,
  createAppError,
  err,
  isErr,
  isOk,
  map,
  mapError,
  ok,
  unwrapOr,
  type ErrorCode,
} from "../../index.js";

const codes = Object.values(AppErrorCode) as ErrorCode[];

describe("Result", () => {
  it("freezes ok and err and short-circuits without throwing", () => {
    const success = ok(2);
    const failure = err(createAppError("VALIDATION"));
    expect(Object.isFrozen(success)).toBe(true);
    expect(Object.isFrozen(failure)).toBe(true);
    expect(map(failure, () => 1).ok).toBe(false);
    expect(andThen(failure, () => ok(1)).ok).toBe(false);
    expect(unwrapOr(failure, 7)).toBe(7);
    expect(unwrapOr(success, 7)).toBe(2);
    expect(isOk(success)).toBe(true);
    expect(isErr(failure)).toBe(true);
  });

  it("chains map, mapError, andThen, and all", () => {
    const chained = andThen(map(ok(2), (n) => n + 1), (n) => ok(n * 2));
    expect(chained).toEqual({ ok: true, value: 6 });
    const mappedError = mapError(err("x"), (message) => createAppError("NOT_FOUND", `errors.${message}`));
    expect(isErr(mappedError) && mappedError.error.code).toBe("NOT_FOUND");
    expect(Result.all([ok(1), ok(2)])).toEqual({ ok: true, value: [1, 2] });
    const firstError = err(createAppError("ROOM_FULL"));
    expect(Result.all([ok(1), firstError, ok(3)])).toBe(firstError);
  });

  it("keeps monadic identity under property checks", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        const left = andThen(ok(n), (value) => ok(value + 1));
        return isOk(left) && left.value === n + 1;
      }),
    );
  });
});

describe("AppError", () => {
  it("lists every code and its http status", () => {
    expect(codes).toHaveLength(12);
    expect(codes).toEqual(
      expect.arrayContaining([
        "VALIDATION",
        "NOT_FOUND",
        "FORBIDDEN",
        "ROOM_FULL",
        "NICKNAME_TAKEN",
        "ROUND_NOT_VOTING",
        "LIMIT_EXCEEDED",
        "RATE_LIMITED",
        "INSUFFICIENT_DATA",
        "LAST_ADMIN",
        "AUTH_LINK_INVALID",
        "ACCOUNT_SUSPENDED",
      ]),
    );
    expect(ERROR_HTTP_STATUS.VALIDATION).toBe(400);
    expect(ERROR_HTTP_STATUS.AUTH_LINK_INVALID).toBe(401);
    expect(ERROR_HTTP_STATUS.RATE_LIMITED).toBe(429);
    expect(ERROR_HTTP_STATUS.LIMIT_EXCEEDED).toBe(422);
  });

  it("builds a frozen error with params", () => {
    const error = AppErrorBuilder.validation("errors.scale.min_cards").withParam("min", 2).build();
    expect(error.code).toBe("VALIDATION");
    expect(error.messageKey).toBe("errors.scale.min_cards");
    expect(Object.isFrozen(error)).toBe(true);
    expect(error.params && Object.isFrozen(error.params)).toBe(true);
    expect(createAppError("ROOM_FULL").messageKey).toBe("errors.ROOM_FULL");
  });
});
