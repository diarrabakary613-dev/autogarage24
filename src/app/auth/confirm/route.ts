import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirects";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Destinazione dei link inviati via email (conferma account, recupero password).
 * Supporta sia il flusso PKCE (?code=...) sia i template con token (?token_hash=...&type=...).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  try {
    const supabase = await createClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    } else if (tokenHash && type && OTP_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      ok = !error;
    }
  } catch {
    ok = false;
  }

  const target = ok ? next : "/auth/errore";
  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}
