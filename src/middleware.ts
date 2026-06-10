import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe auth instance (no Credentials provider / Node modules).
export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // Route protection is handled by the `authorized` callback in authConfig.
  void req;
});

export const config = {
  // Run on everything except next internals, static assets and the auth API.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
