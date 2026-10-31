import type { z } from "zod";
import type { createInvoiceSchema } from "@/types/schemas";

/** Parsed (defaults applied) body of POST /api/invoices. Derived from the shared Zod schema. */
export type CreateInvoiceInput = z.output<typeof createInvoiceSchema>;
