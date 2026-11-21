import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema, updatePasswordSchema } from "@/lib/validation/auth";
import { profileUpdateSchema } from "@/lib/validation/profile";
import { safeValues, toFieldErrors } from "@/lib/validation/form-state";

const validSignUp = {
  fullName: "Giulia Bianchi",
  email: "  Giulia@Example.IT ",
  password: "Sicura2026x",
  confirmPassword: "Sicura2026x",
  role: "cliente",
  acceptTerms: "on",
  website: "",
};

describe("registrazione", () => {
  it("accetta dati validi e normalizza l'email", () => {
    const r = signUpSchema.safeParse(validSignUp);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("giulia@example.it");
      expect(r.data.acceptTerms).toBe(true);
      expect(r.data.marketingConsent).toBe(false);
    }
  });

  it("rifiuta il ruolo admin", () => {
    const r = signUpSchema.safeParse({ ...validSignUp, role: "admin" });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).role).toBeTruthy();
  });

  it("richiede l'accettazione dei termini", () => {
    const r = signUpSchema.safeParse({ ...validSignUp, acceptTerms: undefined });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).acceptTerms).toMatch(/Termini/);
  });

  it("richiede password robuste e coincidenti", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, password: "corta1", confirmPassword: "corta1" }).success).toBe(false);
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: "solamentelettere", confirmPassword: "solamentelettere" }).success,
    ).toBe(false);
    const mismatch = signUpSchema.safeParse({ ...validSignUp, confirmPassword: "Diversa2026x" });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) expect(toFieldErrors(mismatch.error).confirmPassword).toBeTruthy();
  });

  it("richiede il nome attività per i professionisti", () => {
    const r = signUpSchema.safeParse({ ...validSignUp, role: "officina" });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).businessName).toBeTruthy();
    expect(signUpSchema.safeParse({ ...validSignUp, role: "officina", businessName: "Officina Rossi" }).success).toBe(true);
  });

  it("blocca i bot che compilano il campo trappola", () => {
    const r = signUpSchema.safeParse({ ...validSignUp, website: "http://spam.example" });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).website).toBeTruthy();
  });
});

describe("accesso e password", () => {
  it("valida l'accesso", () => {
    expect(signInSchema.safeParse({ email: "a@b.it", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "non-email", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.it", password: "" }).success).toBe(false);
  });

  it("valida la nuova password", () => {
    expect(updatePasswordSchema.safeParse({ password: "Nuova2026pass", confirmPassword: "Nuova2026pass" }).success).toBe(true);
    expect(updatePasswordSchema.safeParse({ password: "Nuova2026pass", confirmPassword: "altro" }).success).toBe(false);
  });
});

describe("profilo", () => {
  it("trasforma i campi vuoti in null", () => {
    const r = profileUpdateSchema.safeParse({ fullName: "Mario Rossi", phone: "", city: "", postalCode: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ phone: null, city: null, postalCode: null, marketingConsent: false });
  });

  it("valida telefono e CAP", () => {
    expect(profileUpdateSchema.safeParse({ fullName: "Mario Rossi", phone: "+39 02 1234567", postalCode: "20121" }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ fullName: "Mario Rossi", phone: "chiamami" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ fullName: "Mario Rossi", postalCode: "<script>" }).success).toBe(false);
  });
});

describe("safeValues", () => {
  it("non restituisce mai le password", () => {
    const fd = new FormData();
    fd.set("email", "a@b.it");
    fd.set("password", "segreta");
    fd.set("confirmPassword", "segreta");
    expect(safeValues(fd)).toEqual({ email: "a@b.it" });
  });
});
