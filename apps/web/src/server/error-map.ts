import { ERROR_HTTP_STATUS, type AppError, type ErrorCode } from "@fibonaipe/domain";

export function httpStatusFor(code: ErrorCode): number {
  if (code === "LIMIT_EXCEEDED") return 413;
  return ERROR_HTTP_STATUS[code];
}

export function errorResponse(error: AppError, requestId: string): Response {
  const body = {
    error: {
      code: error.code,
      messageKey: error.messageKey,
      ...(error.params ? { params: error.params } : {}),
    },
  };
  return new Response(JSON.stringify(body), {
    status: httpStatusFor(error.code),
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-request-id": requestId,
    },
  });
}
