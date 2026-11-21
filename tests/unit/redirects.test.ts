import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirects";

describe("safeNextPath (protezione open redirect)", () => {
  it("accetta percorsi interni", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/auto-usate?marca=bmw")).toBe("/auto-usate?marca=bmw");
  });

  it.each([
    "https://malevolo.example",
    "//malevolo.example",
    "/\\malevolo.example",
    "javascript:alert(1)",
    "dashboard",
    "/accedi",
    "/registrati?x=1",
    "/a\nb",
    "",
  ])("rifiuta %j", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });

  it("usa il valore di ripiego per input non testuali", () => {
    expect(safeNextPath(null, "/")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/dashboard");
  });
});
