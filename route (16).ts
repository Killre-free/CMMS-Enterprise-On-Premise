// app/api/v1/auth/change-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, parseOrThrow } from "@/lib/validators";
import { writeAuditLog, requestMeta } from "@/lib/audit";
import { problem } from "@/lib/utils";

export const POST = withApiHandler(async (req, { user }) => {
  const body = parseOrThrow(changePasswordSchema, await req.json());

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json(
      problem(404, "Not Found", "User not found.", "/api/v1/auth/change-password"),
      { status: 404 }
    );
  }

  const valid = await bcrypt.compare(body.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json(
      problem(400, "Invalid Password", "Current password is incorrect.", "/api/v1/auth/change-password"),
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(body.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, forcePasswordChange: false },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "PasswordChange",
    module: "auth",
    recordId: user.id,
    recordType: "User",
    ...requestMeta(req),
  });

  return NextResponse.json({ success: true });
});
