import type { NextAuthConfig } from "next-auth";

const PUBLIC_PREFIXES = ["/login"];

/**
 * Edge-safe auth config. Contains NO providers that import Node-only modules
 * (bcrypt, Prisma), so it can run inside middleware. Route protection lives in
 * the `authorized` callback; the full provider list is added in src/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

      if (isPublic) {
        // Bounce logged-in users away from the login page.
        if (isLoggedIn && pathname.startsWith("/login")) {
          return Response.redirect(new URL("/dashboard", request.nextUrl.origin));
        }
        return true;
      }
      // Everything else requires a session.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.departmentId = (user as { departmentId?: string | null }).departmentId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "VIEWER";
        session.user.departmentId = (token.departmentId as string | null) ?? null;
      }
      return session;
    },
  },
};
