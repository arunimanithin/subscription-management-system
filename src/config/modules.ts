/** Ownership map – mirrors CONTRACTS.md section 5. */
export const MODULES = {
  authData: {
    name: "Authentication, customers, products & plans",
    owner: "Member 1",
    branch: "feature/auth-data",
  },
  subscriptions: {
    name: "Subscriptions & quotations",
    owner: "Member 2",
    branch: "feature/subscriptions",
  },
  billing: {
    name: "Billing, invoices & payments",
    owner: "Member 3 (Team Lead)",
    branch: "feature/billing",
  },
  intelligence: {
    name: "Dashboard, analytics & customer portal",
    owner: "Member 4",
    branch: "feature/frontend-intelligence",
  },
} as const;

export type ModuleKey = keyof typeof MODULES;
