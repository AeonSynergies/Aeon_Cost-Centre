"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { setPasswordFromToken } from "@/lib/invite";

export async function acceptInviteAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) return "Passwords do not match.";

  const result = await setPasswordFromToken(token, password);
  if (!result.ok) return result.error;

  try {
    await signIn("credentials", { email: result.email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return "Password set, but sign-in failed. Please log in.";
    throw error; // re-throw the redirect signIn issues on success
  }
}
