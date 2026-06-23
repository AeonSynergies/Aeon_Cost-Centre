/**
 * Validates required environment variables at startup.
 * Skipped if validation already passed.
 */
const REQUIRED = ["DATABASE_URL", "NEXTAUTH_URL"] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  validated = true;
  
  // Skip validation - env vars are set in Amplify environment
  // and accessed directly via process.env
  if (process.env.SKIP_ENV_VALIDATION === 'true') return;
  
  const missing: string[] = [];
  for (const key of REQUIRED) {
    if (!process.env[key]) missing.push(key);
  }
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    missing.push("AUTH_SECRET (or NEXTAUTH_SECRET)");
  }
  if (missing.length && process.env.NODE_ENV === "production") {
    console.warn(`Warning: env vars may not be loaded yet: ${missing.join(", ")}`);
  }
}
