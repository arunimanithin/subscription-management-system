"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { USER_ROLES } from "@/types/enums";
import type { UserRole } from "@/types/enums";
import type { Profile } from "@/types/entities";

const PAGE_SIZE = 20;
const ROLE_VARIANT = { admin: "danger", staff: "info", customer: "muted" } as const;

interface ListBody {
  data?: Profile[];
  meta?: { total: number };
  error?: { message: string };
}

/** Admin screen: find users and change their role. Talks to GET /api/users and PATCH /api/users/:id. */
export function UsersManager() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    try {
      const res = await fetch(`/api/users?${params}`);
      const body = (await res.json()) as ListBody;
      if (!res.ok) throw new Error(body.error?.message ?? "Could not load users");
      setRows(body.data ?? []);
      setTotal(body.meta?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(user: Profile, role: UserRole) {
    if (role === user.role) return;
    setSavingId(user.id);
    setError("");
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = (await res.json()) as { data?: Profile; error?: { message: string } };
      if (!res.ok || !body.data) throw new Error(body.error?.message ?? "Could not change the role");
      setRows((current) => current.map((r) => (r.id === user.id ? body.data! : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the role");
    } finally {
      setSavingId(null);
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search users"
          className="h-9 w-64 rounded-md border bg-card px-3 text-sm"
        />
        <Button type="submit" size="sm" variant="outline">
          Search
        </Button>
        <select
          value={roleFilter}
          onChange={(e) => {
            setPage(1);
            setRoleFilter(e.target.value as "" | UserRole);
          }}
          aria-label="Filter by role"
          className="h-9 rounded-md border bg-card px-2 text-sm"
        >
          <option value="">All roles</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                    <td className="px-4 py-3">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                        <select
                          value={u.role}
                          disabled={savingId === u.id}
                          onChange={(e) => void changeRole(u, e.target.value as UserRole)}
                          aria-label={`Change role for ${u.email ?? u.full_name ?? "user"}`}
                          className="h-8 rounded-md border bg-card px-2 text-xs"
                        >
                          {USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} user{total === 1 ? "" : "s"} · page {Math.min(page, lastPage)} of {lastPage}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={page >= lastPage || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
