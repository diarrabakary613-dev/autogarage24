import { z } from "zod";
import { isProfessionalRole, SELF_ASSIGNABLE_ROLES } from "@/lib/auth/roles";

/** Regole password: almeno 10 caratteri, con lettere e numeri. */
export const PASSWORD_MIN_LENGTH = 10;

const email = z
  .string({ error: "Inserisci la tua email." })
  .trim()
  .toLowerCase()
  .min(1, "Inserisci la tua email.")
  .max(254, "Email troppo lunga.")
  .pipe(z.email({ error: "Inserisci un indirizzo email valido." }));

export const passwordSchema = z
  .string({ error: "Inserisci una password." })
  .min(PASSWORD_MIN_LENGTH, `La password deve contenere almeno ${PASSWORD_MIN_LENGTH} caratteri.`)
  .max(72, "La password può contenere al massimo 72 caratteri.")
  .regex(/[A-Za-zÀ-ÿ]/, "La password deve contenere almeno una lettera.")
  .regex(/[0-9]/, "La password deve contenere almeno un numero.");

/** Casella di spunta HTML: presente ("on") se selezionata, assente altrimenti. */
const checkbox = z
  .string()
  .max(10)
  .nullish()
  .transform((v) => v === "on" || v === "true");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Inserisci la password.").max(72),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Inserisci nome e cognome.")
      .max(120, "Nome troppo lungo."),
    email,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(SELF_ASSIGNABLE_ROLES, { error: "Scegli il tipo di account." }),
    businessName: z
      .string()
      .trim()
      .max(120, "Nome attività troppo lungo.")
      .optional()
      .transform((v) => (v ? v : undefined)),
    acceptTerms: checkbox,
    marketingConsent: checkbox,
    // Campo trappola anti-bot: deve restare vuoto.
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Le password non coincidono." });
    }
    if (!data.acceptTerms) {
      ctx.addIssue({
        code: "custom",
        path: ["acceptTerms"],
        message: "Per registrarti devi accettare i Termini e prendere visione della Privacy Policy.",
      });
    }
    if (isProfessionalRole(data.role) && (!data.businessName || data.businessName.length < 2)) {
      ctx.addIssue({
        code: "custom",
        path: ["businessName"],
        message: "Inserisci il nome della tua attività.",
      });
    }
  });

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
