import { NextResponse } from "next/server";
import { cleanupOrphanedUploads } from "@/domain/media/media-cleanup";

/**
 * Daily Vercel Cron job (see vercel.json) — deletes stored files a browser
 * uploaded but never recorded (see domain/media/media-cleanup.ts). Vercel
 * sends `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set, or
 * with any other caller, this does nothing.
 */
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scanned, orphaned } = await cleanupOrphanedUploads();
  return NextResponse.json({ scanned, deleted: orphaned.length });
}
