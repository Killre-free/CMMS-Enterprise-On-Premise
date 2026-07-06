// lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // This is an on-premise app reached via a LAN hostname or bare server IP
  // (http://cmms, http://192.168.x.x) rather than a fixed public domain, so
  // Auth.js can't validate the request Host against a single known value.
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: env.SESSION_TIMEOUT_HOURS * 60 * 60,
  },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { username },
          include: { role: true },
        });

        if (!user || user.deletedAt || !user.isActive) return null;

        if (user.isLocked || (user.lockedUntil && user.lockedUntil > new Date())) {
          logger.warn({ username }, "login attempt on locked account");
          throw new Error("ACCOUNT_LOCKED");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              isLocked: shouldLock,
              lockedUntil: shouldLock
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                : undefined,
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            username: user.username,
            action: "Login",
            module: "auth",
          },
        });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email ?? undefined,
          username: user.username,
          roleId: user.roleId,
          roleName: user.role.name,
          isSuperAdmin: user.isSuperAdmin,
          forcePasswordChange: user.forcePasswordChange,
          plantId: user.plantId ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.username = (user as any).username;
        token.roleId = (user as any).roleId;
        token.roleName = (user as any).roleName;
        token.isSuperAdmin = (user as any).isSuperAdmin;
        token.forcePasswordChange = (user as any).forcePasswordChange;
        token.plantId = (user as any).plantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).roleId = token.roleId;
        (session.user as any).roleName = token.roleName;
        (session.user as any).isSuperAdmin = token.isSuperAdmin;
        (session.user as any).forcePasswordChange = token.forcePasswordChange;
        (session.user as any).plantId = token.plantId;
      }
      return session;
    },
  },
});
