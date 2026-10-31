import { z } from "zod";
import { listQuerySchema } from "@/types/schemas";
import { USER_ROLES } from "@/types/enums";

/** GET /api/users query: the shared list query plus an optional role filter. */
export const usersQuerySchema = listQuerySchema.extend({
  role: z.enum(USER_ROLES).optional(),
});

/** Makes a search term safe to place inside a PostgREST `or=(...)` filter. */
export function sanitizeSearch(term: string): string {
  return term.replace(/[%_,()*\\"']/g, " ").replace(/\s+/g, " ").trim();
}

/** Admins may not change their own role (stops the last admin from locking everyone out). */
export function isSelfRoleChange(actorId: string, targetId: string, newRole: string | undefined, currentRole: string): boolean {
  return actorId === targetId && newRole !== undefined && newRole !== currentRole;
}
