/**
 * Validates required environment variables. Imported by lib/prisma and lib/auth
 * so a misconfiguration fails fast with a clear message rather than obscurely.
 */
const REQUIRED = ["DATABASE_URL", "NEXTAUTH_URL"] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  const missing: string[] = [];
  for (const key of REQUIRED) {
    if (!process.env[key]) missing.push(key);
  }
  // AUTH_SECRET or NEXTAUTH_SECRET must be present.
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    missing.push("AUTH_SECRET (or NEXTAUTH_SECRET)");
  }
  if (missing.length && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  validated = true;
}
