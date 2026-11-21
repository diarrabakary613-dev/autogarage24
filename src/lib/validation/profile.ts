import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : null));

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Inserisci nome e cognome.").max(120, "Nome troppo lungo."),
  phone: optionalText(30, "Numero troppo lungo.").refine(
    (v) => v === null || /^[+0-9 ()-]{6,30}$/.test(v),
    "Inserisci un numero di telefono valido.",
  ),
  city: optionalText(80, "Nome della città troppo lungo."),
  postalCode: optionalText(10, "CAP non valido.").refine(
    (v) => v === null || /^[0-9A-Za-z -]{3,10}$/.test(v),
    "CAP non valido.",
  ),
  marketingConsent: z
    .string()
    .max(10)
    .nullish()
    .transform((v) => v === "on"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
