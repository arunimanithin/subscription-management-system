import { NextResponse } from "next/server";
import type { ApiErrorBody, ApiList, ApiOk, ListMeta } from "@/types/api";
import type { ApiErrorCode } from "@/types/enums";

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  INVALID_STATE: 409,
  NOT_IMPLEMENTED: 501,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiOk<T>>({ data }, { status });
}

export function list<T>(data: T[], meta: ListMeta) {
  return NextResponse.json<ApiList<T>>({ data, meta });
}

export function fail(code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, details } }, { status: STATUS[code] });
}

/** Placeholder used by every route stub until its owner implements it. */
export function notImplemented(endpoint: string) {
  return fail("NOT_IMPLEMENTED", `${endpoint} is not implemented yet. See CONTRACTS.md.`);
}

/** Map a PostgREST / Postgres error to the API error envelope. */
export function fromSupabaseError(error: { code?: string; message: string }) {
  switch (error.code) {
    case "PGRST116":
      return fail("NOT_FOUND", "Record not found");
    case "42501":
      return fail("FORBIDDEN", "You do not have permission to perform this action");
    case "23505":
      return fail("CONFLICT", "A record with these values already exists", error.message);
    case "23503":
    case "23514":
    case "23502":
      return fail("VALIDATION_ERROR", error.message);
    default:
      return fail("INTERNAL_ERROR", error.message);
  }
}

export function toRange(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}
