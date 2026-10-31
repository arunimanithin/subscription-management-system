import { fail, fromSupabaseError } from "@/lib/api/respond";

/**
 * Maps database errors from record_payment() (see migration 20261031120001) to API errors.
 *   P0002 invoice not found        -> 404 NOT_FOUND
 *   PB001 invoice not payable      -> 409 INVALID_STATE
 *   PB002 amount exceeds balance   -> 422 VALIDATION_ERROR
 *   PB003 idempotency key reused   -> 409 CONFLICT
 * Anything else falls back to the shared mapper.
 */
export function paymentErrorResponse(error: { code?: string; message: string }) {
  switch (error.code) {
    case "P0002":
      return fail("NOT_FOUND", "Invoice not found");
    case "PB001":
      return fail("INVALID_STATE", error.message);
    case "PB002":
      return fail("VALIDATION_ERROR", error.message);
    case "PB003":
      return fail("CONFLICT", error.message);
    default:
      return fromSupabaseError(error);
  }
}
