// app/api/v1/uploads/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { withApiHandler } from "@/lib/api-handler";
import { env } from "@/lib/env";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const POST = withApiHandler(async (req) => {
  if (env.STORAGE_TYPE !== "local") {
    const err = new Error(`STORAGE_TYPE "${env.STORAGE_TYPE}" is not implemented yet.`) as Error & { status: number };
    err.status = 501;
    throw err;
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    const err = new Error("No file provided.") as Error & { status: number };
    err.status = 422;
    throw err;
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    const err = new Error("Only JPEG, PNG, WEBP, and GIF images are allowed.") as Error & { status: number };
    err.status = 422;
    throw err;
  }
  if (file.size > MAX_SIZE_BYTES) {
    const err = new Error("File exceeds the 10MB limit.") as Error & { status: number };
    err.status = 422;
    throw err;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
});
