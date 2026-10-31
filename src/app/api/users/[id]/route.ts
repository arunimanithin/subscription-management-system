import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorize, parseBody } from "@/lib/api/guard";
import { fail, fromSupabaseError, ok } from "@/lib/api/respond";
import { isSelfRoleChange } from "@/features/auth-data/users";
import { updateUserSchema } from "@/types/schemas";
import type { Profile } from "@/types/entities";

type Ctx = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

/** GET /api/users/:id – admin only. */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const auth = await authorize(["admin"]);
  if (!auth.ok) return auth.response;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return fail("NOT_FOUND", "User not found");

  const { data, error } = await auth.ctx.supabase.from("profiles").select("*").eq("id", id.data).maybeSingle();
  if (error) return fromSupabaseError(error);
  if (!data) return fail("NOT_FOUND", "User not found");
  return ok(data as Profile);
}

/** PATCH /api/users/:id – admin only. Change full_name and/or role. Admins cannot change their own role. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await authorize(["admin"]);
  if (!auth.ok) return auth.response;
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return fail("NOT_FOUND", "User not found");

  const body = await parseBody(request, updateUserSchema);
  if (!body.ok) return body.response;
  if (body.data.full_name === undefined && body.data.role === undefined) {
    return fail("VALIDATION_ERROR", "Send full_name and/or role to update");
  }

  const { data: current, error: readError } = await auth.ctx.supabase
    .from("profiles")
    .select("id, role")
    .eq("id", id.data)
    .maybeSingle();
  if (readError) return fromSupabaseError(readError);
  if (!current) return fail("NOT_FOUND", "User not found");

  if (isSelfRoleChange(auth.ctx.profile.id, id.data, body.data.role, (current as { role: string }).role)) {
    return fail("INVALID_STATE", "You cannot change your own role. Ask another admin.");
  }

  const { data, error } = await auth.ctx.supabase
    .from("profiles")
    .update(body.data)
    .eq("id", id.data)
    .select("*")
    .maybeSingle();
  if (error) return fromSupabaseError(error);
  if (!data) return fail("FORBIDDEN", "You do not have permission to update this user");
  return ok(data as Profile);
}
