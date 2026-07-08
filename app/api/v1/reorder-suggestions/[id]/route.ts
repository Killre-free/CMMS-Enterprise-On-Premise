// app/api/v1/reorder-suggestions/[id]/route.ts
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/permissions";
import { reorderSuggestionUpdateSchema, parseOrThrow } from "@/lib/validators";
import { problem } from "@/lib/utils";
import { writeAuditLog, requestMeta } from "@/lib/audit";

export const PATCH = withApiHandler(async (req, { user, params }) => {
  await assertPermission(user.id, "sparePart", "edit");
  const body = parseOrThrow(reorderSuggestionUpdateSchema, await req.json());
  const instance = `/api/v1/reorder-suggestions/${params.id}`;

  const existing = await prisma.reorderSuggestion.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json(problem(404, "Not Found", "Reorder suggestion not found", instance), { status: 404 });
  }

  const updated = await prisma.reorderSuggestion.update({
    where: { id: params.id },
    data: { status: body.status },
    include: { sparePart: true },
  });

  await writeAuditLog({
    userId: user.id,
    username: user.username,
    action: "Edit",
    module: "sparePart",
    recordId: updated.id,
    recordType: "ReorderSuggestion",
    oldValue: { status: existing.status },
    newValue: { status: updated.status },
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
});
