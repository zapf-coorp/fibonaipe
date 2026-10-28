import type { ErrorCode } from "@fibonaipe/domain";
import { httpStatusFor } from "./error-map.js";

export interface HttpErrorBody {
  readonly error: {
    readonly code: ErrorCode;
    readonly messageKey: string;
    readonly params?: Readonly<Record<string, string | number | boolean>>;
  };
}

export function httpErrorBody(
  code: ErrorCode,
  messageKey?: string,
  params?: Readonly<Record<string, string | number | boolean>>,
): { readonly status: number; readonly body: HttpErrorBody } {
  const error: HttpErrorBody["error"] = {
    code,
    messageKey: messageKey && messageKey.length > 0 ? messageKey : `errors.${code}`,
  };
  const body: HttpErrorBody = params ? { error: { ...error, params } } : { error };
  return { status: httpStatusFor(code), body };
}

export function jsonResponse(body: unknown, status: number, requestId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-request-id": requestId,
    },
  });
}
