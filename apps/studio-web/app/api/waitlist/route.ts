import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { createHash } from "crypto";
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
const hashId = (value: string) => createHash("sha256").update(value).digest("hex");

const DEFAULT_PROGRAM_KEY = "waitlist";
const DEFAULT_PROGRAM_NAME = "Waitlist Onboarding";
const DEFAULT_EVENT_TYPE = "waitlist_signup";

type ProgramTrigger = {
  id: string;
  type: "event" | "time" | "attribute";
  eventType?: string;
  delaySeconds?: number;
  attributeKey?: string;
  operator?: "eq" | "neq" | "contains" | "exists" | "not_exists";
  attributeValue?: string;
};

type ProgramRule = {
  id: string;
  fromStepKey?: string;
  toStepKey: string;
  name: string;
  order?: number;
  isActive?: boolean;
  triggers: ProgramTrigger[];
};

const defaultProgramSteps = [
  {
    key: "updates_opt_in",
    name: "Updates Opt-In",
    order: 1,
  },
  {
    key: "updates_opt_out",
    name: "Updates Opt-Out",
    order: 2,
  },
];

const defaultProgramRules: ProgramRule[] = [
  {
    id: "opt_in_rule",
    toStepKey: "updates_opt_in",
    name: "Waitlist signup opted-in",
    order: 1,
    isActive: true,
    triggers: [
      {
        id: "opt_in_event",
        type: "event",
        eventType: DEFAULT_EVENT_TYPE,
      },
      {
        id: "opt_in_attr",
        type: "attribute",
        attributeKey: "wantsUpdates",
        operator: "eq",
        attributeValue: "true",
      },
      {
        id: "opt_in_time",
        type: "time",
        delaySeconds: 7 * 24 * 60 * 60,
      },
    ],
  },
  {
    id: "opt_out_rule",
    toStepKey: "updates_opt_out",
    name: "Waitlist signup opted-out",
    order: 2,
    isActive: true,
    triggers: [
      {
        id: "opt_out_event",
        type: "event",
        eventType: DEFAULT_EVENT_TYPE,
      },
      {
        id: "opt_out_attr",
        type: "attribute",
        attributeKey: "wantsUpdates",
        operator: "neq",
        attributeValue: "true",
      },
    ],
  },
];

const isValidEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  if (normalized.length < 6 || normalized.length > 254) return false;
  if (!normalized.includes("@")) return false;
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  return true;
};

const isConflictError = (message: string) =>
  message.includes("ConditionalCheckFailedException") ||
  message.toLowerCase().includes("already exists") ||
  message.toLowerCase().includes("duplicate");

const safeCreate = async (result: Promise<{ errors?: Array<{ message?: string }> }>) => {
  const response = await result;
  if (!response?.errors?.length) return;
  const message = response.errors.map((e) => e.message ?? "").join(" ");
  if (isConflictError(message)) return;
  throw new Error(message);
};

const evaluateAttributeTrigger = (
  trigger: ProgramTrigger,
  lead: { wantsUpdates?: boolean; persona?: string; source?: string },
) => {
  const value = (lead as Record<string, unknown>)[trigger.attributeKey ?? ""];
  const operator = trigger.operator ?? "eq";

  if (operator === "exists") return value !== undefined && value !== null;
  if (operator === "not_exists") return value === undefined || value === null;
  if (value === undefined || value === null) return false;

  const valueString = typeof value === "boolean" ? String(value).toLowerCase() : String(value);
  const target = trigger.attributeValue ?? "";

  if (operator === "eq") return valueString === target;
  if (operator === "neq") return valueString !== target;
  if (operator === "contains") return valueString.includes(target);
  return false;
};

const ruleMatchesEvent = (
  rule: ProgramRule,
  eventType: string,
  lead: { wantsUpdates?: boolean; persona?: string; source?: string },
) => {
  const eventTriggers = rule.triggers.filter((trigger) => trigger.type === "event");
  if (!eventTriggers.length) return false;
  if (!eventTriggers.some((trigger) => trigger.eventType === eventType)) return false;

  const attributeTriggers = rule.triggers.filter((trigger) => trigger.type === "attribute");
  return attributeTriggers.every((trigger) => evaluateAttributeTrigger(trigger, lead));
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
  const normalizedEmail = normalizeEmail(email);
  const leadId = `lead_${hashId(normalizedEmail)}`;
  const programId = `program_${DEFAULT_PROGRAM_KEY}`;
  const enrollmentId = `enrollment_${programId}_${leadId}`;

  try {
    Amplify.configure(amplifyConfig, { ssr: true });
    const client = generateClient<any>({ authMode: "apiKey" });

    const result = await client.models.WaitlistSignup.create({
      email: normalizedEmail,
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

    await safeCreate(
      client.models.MarketingLead.create({
        id: leadId,
        email: normalizedEmail,
        name,
        persona,
        wantsUpdates: Boolean(wantsUpdates),
        source,
        createdAt: new Date().toISOString(),
        lastSignupAt: new Date().toISOString(),
      }),
    );

    await safeCreate(
      client.models.MarketingProgram.create({
        id: programId,
        key: DEFAULT_PROGRAM_KEY,
        name: DEFAULT_PROGRAM_NAME,
        status: "active",
        createdAt: new Date().toISOString(),
      }),
    );

    for (const step of defaultProgramSteps) {
      await safeCreate(
        client.models.MarketingProgramStep.create({
          id: `step_${programId}_${step.key}`,
          programId,
          key: step.key,
          name: step.name,
          order: step.order,
        }),
      );
    }

    for (const rule of defaultProgramRules) {
      const ruleId = `rule_${programId}_${rule.id}`;
      await safeCreate(
        client.models.MarketingProgramRule.create({
          id: ruleId,
          programId,
          fromStepKey: rule.fromStepKey,
          toStepKey: rule.toStepKey,
          isActive: rule.isActive ?? true,
          order: rule.order,
          name: rule.name,
        }),
      );

      for (const trigger of rule.triggers) {
        await safeCreate(
          client.models.MarketingProgramTrigger.create({
            id: `trigger_${ruleId}_${trigger.id}`,
            ruleId,
            type: trigger.type,
            eventType: trigger.eventType,
            delaySeconds: trigger.delaySeconds,
            attributeKey: trigger.attributeKey,
            operator: trigger.operator,
            attributeValue: trigger.attributeValue,
          }),
        );
      }
    }

    const leadForRule = {
      wantsUpdates: Boolean(wantsUpdates),
      persona,
      source,
    };
    const matchedRule =
      defaultProgramRules.find((rule) => ruleMatchesEvent(rule, DEFAULT_EVENT_TYPE, leadForRule)) ??
      defaultProgramRules[0];

    await safeCreate(
      client.models.MarketingEnrollment.create({
        id: enrollmentId,
        leadId,
        programId,
        status: "active",
        currentStepKey: matchedRule?.toStepKey,
        enrolledAt: new Date().toISOString(),
        lastStepAt: new Date().toISOString(),
        source,
      }),
    );

    const enrolledEventId = `event_${enrollmentId}_enrolled_${matchedRule?.toStepKey ?? "none"}`;
    const enteredEventId = `event_${enrollmentId}_entered_${matchedRule?.toStepKey ?? "none"}`;

    await safeCreate(
      client.models.MarketingEnrollmentEvent.create({
        id: enrolledEventId,
        enrollmentId,
        eventType: "enrolled",
        toStepKey: matchedRule?.toStepKey,
        occurredAt: new Date().toISOString(),
        metadata: {
          eventType: DEFAULT_EVENT_TYPE,
        },
      }),
    );

    await safeCreate(
      client.models.MarketingEnrollmentEvent.create({
        id: enteredEventId,
        enrollmentId,
        eventType: "entered_step",
        toStepKey: matchedRule?.toStepKey,
        occurredAt: new Date().toISOString(),
        metadata: {
          eventType: DEFAULT_EVENT_TYPE,
        },
      }),
    );

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message || "Failed to join waitlist." }, { status: 500 });
  }
}

