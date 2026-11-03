import type { NextRequest } from "next/server";
import { handleAccountMediaGet } from "@/lib/account-media-route";
import { presignAccountDownload } from "@/lib/account-media";
import { idTokenFromCookies } from "@/lib/account-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleAccountMediaGet(request, { presign: presignAccountDownload, tokenFromCookies: idTokenFromCookies });
}
