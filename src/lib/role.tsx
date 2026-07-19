import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "exporter" | "importer" | "buyer" | "supplier";

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full platform access" },
  { value: "exporter", label: "Exporter", description: "Manage outbound trade" },
  { value: "importer", label: "Importer", description: "Manage inbound trade" },
  { value: "buyer", label: "Buyer", description: "Sourcing & procurement" },
  { value: "supplier", label: "Supplier", description: "Catalog & fulfillment" },
];

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  can: (perm: Permission) => boolean;
};

export type Permission =
  | "view:analytics"
  | "view:reports"
  | "manage:suppliers"
  | "manage:buyers"
  | "manage:orders"
  | "manage:invoices"
  | "manage:shipments"
  | "manage:settings"
  | "view:marketplace";

const MATRIX: Record<Role, Permission[]> = {
  admin: [
    "view:analytics", "view:reports", "manage:suppliers", "manage:buyers",
    "manage:orders", "manage:invoices", "manage:shipments", "manage:settings", "view:marketplace",
  ],
  exporter: ["view:analytics", "view:reports", "manage:buyers", "manage:orders", "manage:invoices", "manage:shipments", "manage:settings", "view:marketplace"],
  importer: ["view:analytics", "view:reports", "manage:suppliers", "manage:orders", "manage:invoices", "manage:shipments", "manage:settings", "view:marketplace"],
  buyer: ["view:marketplace", "manage:orders", "manage:invoices", "manage:settings"],
  supplier: ["view:marketplace", "manage:orders", "manage:shipments", "manage:invoices", "manage:settings"],
};

const RoleContext = createContext<Ctx>({ role: "admin", setRole: () => {}, can: () => true });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("admin");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("nova-role") as Role | null) : null;
    if (stored && MATRIX[stored]) setRoleState(stored);
  }, []);
  useEffect(() => {
    try { localStorage.setItem("nova-role", role); } catch {}
  }, [role]);
  const can = (p: Permission) => MATRIX[role].includes(p);
  return <RoleContext.Provider value={{ role, setRole: setRoleState, can }}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);
