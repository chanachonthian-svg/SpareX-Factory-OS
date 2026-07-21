import { createHmac } from "crypto";

/** Shared OTP signing for /api/otp/send + /api/otp/verify.
 *  Stateless: the token is HMAC(email|code|exp) — nothing stored server-side,
 *  so it survives pm2 restarts and needs no database. */
const SECRET = process.env.OTP_SECRET || process.env.SMTP_PASS || "factoryos-demo-otp";

export function signOtp(email: string, code: string, exp: number) {
  return createHmac("sha256", SECRET).update(`${email.toLowerCase()}|${code}|${exp}`).digest("hex");
}
