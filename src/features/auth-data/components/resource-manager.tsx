"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Row = Record<string, unknown> & { id: string };

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "email" | "number" | "select" | "checkbox" | "textarea";
  required?: boolean;
  step?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  /** Load select options from an API list (for example products for a plan). */
  optionsFrom?: { endpoint: string; labelKey: string };
  default?: string | number | boolean;
  /** Shown only when creating (not editable later). */
  createOnly?: boolean;
}

export interface ColumnDef {
  header: string;
  render: (row: Row) => ReactNode;
}

interface Props {
  endpoint: string; // e.g. "/api/customers"
  singular: string; // e.g. "customer"
  fields: FieldDef[];
  columns: ColumnDef[];
  statusOptions: { value: string; label: string }[];
  searchPlaceholder: string;
}

const PAGE_SIZE = 20;

function errorText(body: { error?: { message?: string; details?: unknown } } | null, fallback: string) {
  const fieldErrors = (body?.error?.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
  if (fieldErrors) {
    const parts = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`);
    if (parts.length) return parts.join(" · ");
  }
  return body?.error?.message ?? fallback;
}

/** Generic list + search + create/edit form + delete screen used by Customers, Products and Plans. */
export function ResourceManager({ endpoint, singular, fields, columns, statusOptions, searchPlaceholder }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [lookups, setLookups] = useState<Record<string, { value: string; label: string }[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    try {
      const res = await fetch(`${endpoint}?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(errorText(body, `Could not load ${singular}s`));
      setRows(body.data ?? []);
      setTotal(body.meta?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not load ${singular}s`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, search, status, singular]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setIsAdmin(b?.data?.role === "admin"))
      .catch(() => {});
    fields.forEach((f) => {
      if (!f.optionsFrom) return;
      const { endpoint: ep, labelKey } = f.optionsFrom;
      fetch(`${ep}?page_size=100`)
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          const options = ((b?.data ?? []) as Row[]).map((row) => ({ value: row.id, label: String(row[labelKey] ?? row.id) }));
          setLookups((current) => ({ ...current, [f.key]: options }));
        })
        .catch(() => {});
    });
  }, [fields]);

  function open(target: Row | "new") {
    const next: Record<string, string | boolean> = {};
    for (const f of fields) {
      const existing = target === "new" ? undefined : target[f.key];
      if (f.type === "checkbox") next[f.key] = existing === undefined ? Boolean(f.default ?? true) : Boolean(existing);
      else next[f.key] = existing === undefined || existing === null ? String(f.default ?? "") : String(existing);
    }
    setForm(next);
    setFormError("");
    setEditing(target);
  }

  function buildPayload(isNew: boolean) {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.createOnly && !isNew) continue;
      const v = form[f.key];
      if (f.type === "checkbox") payload[f.key] = Boolean(v);
      else if (f.type === "number") {
        if (v === "" || v === undefined) {
          if (f.required) payload[f.key] = NaN;
        } else payload[f.key] = Number(v);
      } else {
        const text = String(v ?? "").trim();
        payload[f.key] = text === "" ? (f.required ? "" : isNew ? undefined : null) : text;
      }
    }
    return payload;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const isNew = editing === "new";
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(isNew ? endpoint : `${endpoint}/${editing.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(isNew)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(errorText(body, "Could not save"));
      setEditing(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`Delete this ${singular}? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(`${endpoint}/${row.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(errorText(body, "Could not delete"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`Search ${singular}s`}
            className="h-9 w-64 rounded-md border bg-card px-3 text-sm"
          />
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          aria-label="Filter by status"
          className="h-9 rounded-md border bg-card px-2 text-sm"
        >
          <option value="">All</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button size="sm" className="ml-auto" onClick={() => open("new")}>
          New {singular}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {editing ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={save} className="space-y-4">
              <h2 className="text-base font-semibold">{editing === "new" ? `New ${singular}` : `Edit ${singular}`}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields
                  .filter((f) => !(f.createOnly && editing !== "new"))
                  .map((f) => {
                    const id = `f-${f.key}`;
                    const options = f.options ?? lookups[f.key] ?? [];
                    return (
                      <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : undefined}>
                        {f.type === "checkbox" ? (
                          <label className="flex items-center gap-2 pt-6 text-sm font-medium">
                            <input
                              type="checkbox"
                              checked={Boolean(form[f.key])}
                              onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                            />
                            {f.label}
                          </label>
                        ) : (
                          <>
                            <label htmlFor={id} className="mb-1 block text-sm font-medium">
                              {f.label}
                              {f.required ? " *" : ""}
                            </label>
                            {f.type === "select" ? (
                              <select
                                id={id}
                                required={f.required}
                                value={String(form[f.key] ?? "")}
                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                              >
                                <option value="">{f.required ? "Select..." : "None"}</option>
                                {options.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : f.type === "textarea" ? (
                              <textarea
                                id={id}
                                rows={3}
                                value={String(form[f.key] ?? "")}
                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                className="w-full rounded-md border bg-card p-2 text-sm"
                              />
                            ) : (
                              <input
                                id={id}
                                type={f.type}
                                required={f.required}
                                step={f.step}
                                min={f.min}
                                max={f.max}
                                value={String(form[f.key] ?? "")}
                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                className="h-9 w-full rounded-md border bg-card px-3 text-sm"
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
              {formError ? (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} className="px-4 py-3 font-medium">
                    {c.header}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-muted-foreground">
                    No {singular}s found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    {columns.map((c) => (
                      <td key={c.header} className="px-4 py-3">
                        {c.render(row)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => open(row)}>
                          Edit
                        </Button>
                        {isAdmin ? (
                          <Button size="sm" variant="ghost" onClick={() => void remove(row)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} {singular}
          {total === 1 ? "" : "s"} · page {Math.min(page, lastPage)} of {lastPage}
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

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "muted"}>{active ? "active" : "inactive"}</Badge>;
}
