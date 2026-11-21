import { describe, expect, it } from "vitest";
import { sanitizeCms } from "@/config/cms";

describe("CMS: solo testo semplice", () => {
  it("rimuove HTML e script", () => {
    expect(sanitizeCms("home.hero", { title: "<script>alert(1)</script>Ciao <b>mondo</b>" }).title).toBe("alert(1)Ciao mondo");
  });
  it("ignora campi non previsti e non stringa", () => {
    expect(sanitizeCms("home.hero", { title: "Ok", evil: "x", subtitle: 5 })).toEqual({ title: "Ok" });
  });
  it("accetta solo collegamenti interni", () => {
    expect(sanitizeCms("home.announcement", { text: "A", link: "javascript:alert(1)" })).toEqual({ text: "A" });
    expect(sanitizeCms("home.announcement", { text: "A", link: "https://evil.example" }).link).toBeUndefined();
    expect(sanitizeCms("home.announcement", { text: "A", link: "/auto-usate" }).link).toBe("/auto-usate");
  });
});
