import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import amplifyConfig from "../../../amplify_outputs.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WaitlistRequest = {
  email?: string | null;
  name?: string | null;
  persona?: "business" | "agency" | "marketer" | "creator" | "developer" | "other" | null;
  wantsUpdates?: boolean | null;
  source?: string | null;
  website?: string | null; // honeypot
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isValidEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  if (normalized.length < 6 || normalized.length > 254) return false;
  if (!normalized.includes("@")) return false;
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  return true;
};

export async function POST(request: Request) {
  let body: WaitlistRequest | null = null;
  try {
    body = (await request.json()) as WaitlistRequest;
  } catch {
    body = null;
  }

  const website = body?.website?.trim();
  if (website) {
    return Response.json({ ok: true }, { status: 200 });
  }

  const email = body?.email?.trim();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const wantsUpdates = body?.wantsUpdates ?? true;
  const name = body?.name?.trim() || undefined;
  const persona = body?.persona ?? undefined;
  const source = body?.source?.trim() || "marketing-site";

  try {
    Amplify.configure(amplifyConfig, { ssr: true });
    const client = generateClient<any>({ authMode: "apiKey" });

    const result = await client.models.WaitlistSignup.create({
      email: normalizeEmail(email),
      name,
      persona,
      wantsUpdates: Boolean(wantsUpdates),
      source,
      createdAt: new Date().toISOString(),
    });

    if (result?.errors?.length) {
      return Response.json(
        { error: result.errors.map((e: any) => e.message ?? String(e)).join("\n") },
        { status: 500 },
      );
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message || "Failed to join waitlist." }, { status: 500 });
  }
}

