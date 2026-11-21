import { describe, expect, it } from "vitest";
import {
  APP_ROLES,
  isProfessionalRole,
  isSelfAssignableRole,
  primaryRole,
  ROLE_LABELS,
  SELF_ASSIGNABLE_ROLES,
} from "@/lib/auth/roles";

describe("ruoli", () => {
  it("il ruolo admin non è mai auto-assegnabile", () => {
    expect(isSelfAssignableRole("admin")).toBe(false);
    expect(SELF_ASSIGNABLE_ROLES).not.toContain("admin");
  });

  it("riconosce i ruoli professionali", () => {
    expect(isProfessionalRole("officina")).toBe(true);
    expect(isProfessionalRole("meccanico")).toBe(true);
    expect(isProfessionalRole("cliente")).toBe(false);
    expect(isProfessionalRole("admin")).toBe(false);
    expect(isProfessionalRole("qualsiasi")).toBe(false);
  });

  it("ogni ruolo ha un'etichetta italiana", () => {
    for (const r of APP_ROLES) expect(ROLE_LABELS[r]).toBeTruthy();
  });

  it("calcola il ruolo principale con priorità admin > professionista > cliente", () => {
    expect(primaryRole(["cliente"])).toBe("cliente");
    expect(primaryRole(["cliente", "officina"])).toBe("officina");
    expect(primaryRole(["officina", "admin"])).toBe("admin");
    expect(primaryRole([])).toBe("cliente");
  });
});
