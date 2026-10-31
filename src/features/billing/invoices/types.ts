import type { z } from "zod";
import type { createInvoiceSchema, updateInvoiceSchema } from "@/types/schemas";

/** Parsed (defaults applied) body of POST /api/invoices. Derived from the shared Zod schema. */
export type CreateInvoiceInput = z.output<typeof createInvoiceSchema>;

/** Parsed body of PATCH /api/invoices/:id (every field optional; draft invoices only). */
export type UpdateInvoiceInput = z.output<typeof updateInvoiceSchema>;
