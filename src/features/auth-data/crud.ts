import type { NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { authorize, parseBody, parseQuery } from "@/lib/api/guard";
import { fail, fromSupabaseError, list, ok, toRange } from "@/lib/api/respond";
import { sanitizeSearch } from "@/features/auth-data/users";
import { listQuerySchema } from "@/types/schemas";
import type { UserRole } from "@/types/enums";

/**
 * One small factory builds the list / create / read / update / delete handlers for
 * customers, products and plans, so the three resources behave the same way.
 * Every handler starts with authorize(); Postgres Row Level Security still has the last word.
 */
export interface CrudConfig {
  table: string;
  /** PostgREST select string (plans also pull in their product's name). */
  select: string;
  label: string;
  createSchema: ZodType;
  updateSchema: ZodType;
  searchColumns: string[];
  /** How the shared `?status=` query maps onto the table. */
  status?: { column: string; kind: "text" | "boolean" };
  /** Allow `?product_id=` filtering (plans). */
  filterByProduct?: boolean;
  /** Store who created the row in created_by. */
  stampCreatedBy?: boolean;
  readRoles?: UserRole[]; // undefined = any signed-in user (RLS hides inactive rows from customers)
  writeRoles?: UserRole[];
  deleteRoles?: UserRole[];
}

const idSchema = z.string().uuid();
const listSchema = listQuerySchema.extend({ product_id: z.string().uuid().optional() });

export function statusFilter(kind: "text" | "boolean", status: string): string | boolean | null {
  if (kind === "text") return status;
  if (status === "active") return true;
  if (status === "inactive") return false;
  return null; // unknown value: ignore the filter
}

export function buildCrud(cfg: CrudConfig) {
  const writeRoles = cfg.writeRoles ?? (["admin", "staff"] as UserRole[]);
  const deleteRoles = cfg.deleteRoles ?? (["admin"] as UserRole[]);

  async function GET_LIST(request: NextRequest) {
    const auth = await authorize(cfg.readRoles);
    if (!auth.ok) return auth.response;
    const query = parseQuery(request, listSchema);
    if (!query.ok) return query.response;
    const { page, page_size, search, status, product_id } = query.data;
    const [from, to] = toRange(page, page_size);

    let q = auth.ctx.supabase.from(cfg.table).select(cfg.select, { count: "exact" });
    if (status && cfg.status) {
      const value = statusFilter(cfg.status.kind, status);
      if (value !== null) q = q.eq(cfg.status.column, value);
    }
    if (product_id && cfg.filterByProduct) q = q.eq("product_id", product_id);
    const term = search ? sanitizeSearch(search) : "";
    if (term) q = q.or(cfg.searchColumns.map((c) => `${c}.ilike.%${term}%`).join(","));

    const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
    if (error) return fromSupabaseError(error);
    return list((data ?? []) as unknown[], { page, page_size, total: count ?? 0 });
  }

  async function POST(request: NextRequest) {
    const auth = await authorize(writeRoles);
    if (!auth.ok) return auth.response;
    const body = await parseBody(request, cfg.createSchema);
    if (!body.ok) return body.response;
    const row: Record<string, unknown> = { ...(body.data as Record<string, unknown>) };
    if (cfg.stampCreatedBy) row.created_by = auth.ctx.profile.id;

    const { data, error } = await auth.ctx.supabase.from(cfg.table).insert(row).select(cfg.select).single();
    if (error) return fromSupabaseError(error);
    return ok(data, 201);
  }

  async function GET_ONE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorize(cfg.readRoles);
    if (!auth.ok) return auth.response;
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", `${cfg.label} not found`);
    const { data, error } = await auth.ctx.supabase.from(cfg.table).select(cfg.select).eq("id", id.data).maybeSingle();
    if (error) return fromSupabaseError(error);
    if (!data) return fail("NOT_FOUND", `${cfg.label} not found`);
    return ok(data);
  }

  async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorize(writeRoles);
    if (!auth.ok) return auth.response;
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", `${cfg.label} not found`);
    const body = await parseBody(request, cfg.updateSchema);
    if (!body.ok) return body.response;
    const changes = body.data as Record<string, unknown>;
    if (Object.keys(changes).length === 0) return fail("VALIDATION_ERROR", "Send at least one field to update");

    const { data, error } = await auth.ctx.supabase
      .from(cfg.table)
      .update(changes)
      .eq("id", id.data)
      .select(cfg.select)
      .maybeSingle();
    if (error) return fromSupabaseError(error);
    if (!data) return fail("NOT_FOUND", `${cfg.label} not found`);
    return ok(data);
  }

  async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorize(deleteRoles);
    if (!auth.ok) return auth.response;
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("NOT_FOUND", `${cfg.label} not found`);
    const { data, error } = await auth.ctx.supabase.from(cfg.table).delete().eq("id", id.data).select("id");
    if (error) {
      if (error.code === "23503") {
        return fail("CONFLICT", `This ${cfg.label.toLowerCase()} is used by other records and cannot be deleted. Mark it inactive instead.`);
      }
      return fromSupabaseError(error);
    }
    if (!data || data.length === 0) return fail("NOT_FOUND", `${cfg.label} not found`);
    return ok({ id: id.data });
  }

  return { GET_LIST, POST, GET_ONE, PATCH, DELETE };
}
