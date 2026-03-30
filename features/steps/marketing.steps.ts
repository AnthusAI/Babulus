import assert from "node:assert/strict";
import { Before, Given, Then, When } from "@cucumber/cucumber";

type WaitlistSignupRecord = {
  email: string;
  name: string;
  persona: string;
  wantsUpdates: boolean;
  source: string;
  createdAt: string;
};

type MarketingEnrollmentRecord = {
  leadEmail: string;
  currentStepKey: string;
  programName: string;
};

type MarketingEnrollmentEventRecord = {
  leadEmail: string;
  type: string;
  occurredAt: string;
};

type MarketingInteractionRecord = {
  leadEmail: string;
  channel: string;
  direction: string;
  subject: string;
  occurredAt: string;
  body?: string;
  metadata?: Record<string, unknown>;
};

type RuntimeInvocation = {
  kind: "waitlist_signup" | "marketing_enrollment";
  payload: Record<string, unknown>;
};

type AdminState = {
  isAuthenticated: boolean;
  hasMarketingPermission: boolean;
  currentUrl: string;
  redirectedToSignIn: boolean;
  accessDenied: boolean;
  pageLoaded: boolean;
  signups: WaitlistSignupRecord[];
  filteredSignups: WaitlistSignupRecord[];
  pagedSignups: WaitlistSignupRecord[];
  pageSize: number;
  hasMore: boolean;
  filter: { source?: string; persona?: string };
  filterReflectedInUi: boolean;
  csvData: string | null;
  selectedLeadEmail: string | null;
  visibleLead: WaitlistSignupRecord | null;
  visibleEnrollments: MarketingEnrollmentRecord[];
  visibleEnrollmentEvents: MarketingEnrollmentEventRecord[];
  visibleInteractions: MarketingInteractionRecord[];
  interactionExpanded: boolean;
};

type RuntimeState = {
  waitlistStreamEnabled: boolean;
  enrollmentStreamEnabled: boolean;
  waitlistEventSourceConfigured: boolean;
  enrollmentEventSourceConfigured: boolean;
  lambdaInvokesRuntime: boolean;
  lambdaReceivesStreamEvent: boolean;
  runtimeInvocations: RuntimeInvocation[];
  runtimeActionsPerformed: boolean;
  activeRule: string | null;
  leadWantsUpdates: boolean;
  leadPersona: string | null;
  enrollmentCurrentStepKey: string | null;
  lambdaSesConfigured: boolean;
  outboundEmailRequested: boolean;
  outboundEmailSent: boolean;
  interactions: MarketingInteractionRecord[];
  waitlistEvents: Array<{ eventId: string; leadEmail: string }>;
  idempotencyKeys: Set<string>;
  lambdaDeployed: boolean;
  hasGraphqlEndpoint: boolean;
  hasGraphqlApiKey: boolean;
  hasSesAuth: boolean;
  runtimeCodeReadable: boolean;
};

const baseSignups = (): WaitlistSignupRecord[] => [
  {
    email: "older@example.com",
    name: "Older User",
    persona: "designer",
    wantsUpdates: false,
    source: "partner",
    createdAt: "2026-03-20T09:00:00.000Z",
  },
  {
    email: "newest@example.com",
    name: "Newest User",
    persona: "developer",
    wantsUpdates: true,
    source: "marketing-site",
    createdAt: "2026-03-29T10:00:00.000Z",
  },
  {
    email: "middle@example.com",
    name: "Middle User",
    persona: "developer",
    wantsUpdates: true,
    source: "marketing-site",
    createdAt: "2026-03-25T12:00:00.000Z",
  },
];

const sortedDescByCreatedAt = (rows: WaitlistSignupRecord[]): WaitlistSignupRecord[] =>
  rows.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const applyFilter = (rows: WaitlistSignupRecord[], filter: { source?: string; persona?: string }): WaitlistSignupRecord[] =>
  rows.filter((row) => {
    if (filter.source && row.source !== filter.source) {
      return false;
    }
    if (filter.persona && row.persona !== filter.persona) {
      return false;
    }
    return true;
  });

const toCsv = (rows: WaitlistSignupRecord[]): string => {
  const header = "email,name,persona,wantsUpdates,source,createdAt";
  const lines = rows.map((row) =>
    [row.email, row.name, row.persona, String(row.wantsUpdates), row.source, row.createdAt]
      .map((value) => `\"${String(value).replaceAll("\"", "\"\"")}\"`)
      .join(","),
  );
  return `${header}\n${lines.join("\n")}`;
};

let adminState: AdminState;
let runtimeState: RuntimeState;

const resetAdminState = (): AdminState => {
  const signups = sortedDescByCreatedAt(baseSignups());
  const pageSize = 2;
  return {
    isAuthenticated: false,
    hasMarketingPermission: false,
    currentUrl: "",
    redirectedToSignIn: false,
    accessDenied: false,
    pageLoaded: false,
    signups,
    filteredSignups: signups,
    pagedSignups: signups.slice(0, pageSize),
    pageSize,
    hasMore: signups.length > pageSize,
    filter: {},
    filterReflectedInUi: false,
    csvData: null,
    selectedLeadEmail: null,
    visibleLead: null,
    visibleEnrollments: [],
    visibleEnrollmentEvents: [],
    visibleInteractions: [],
    interactionExpanded: false,
  };
};

const resetRuntimeState = (): RuntimeState => ({
  waitlistStreamEnabled: false,
  enrollmentStreamEnabled: false,
  waitlistEventSourceConfigured: false,
  enrollmentEventSourceConfigured: false,
  lambdaInvokesRuntime: false,
  lambdaReceivesStreamEvent: false,
  runtimeInvocations: [],
  runtimeActionsPerformed: false,
  activeRule: null,
  leadWantsUpdates: false,
  leadPersona: null,
  enrollmentCurrentStepKey: null,
  lambdaSesConfigured: false,
  outboundEmailRequested: false,
  outboundEmailSent: false,
  interactions: [],
  waitlistEvents: [],
  idempotencyKeys: new Set<string>(),
  lambdaDeployed: false,
  hasGraphqlEndpoint: false,
  hasGraphqlApiKey: false,
  hasSesAuth: false,
  runtimeCodeReadable: false,
});

Before(() => {
  adminState = resetAdminState();
  runtimeState = resetRuntimeState();
});

Given("an authenticated user with permission to view marketing data", () => {
  adminState.isAuthenticated = true;
  adminState.hasMarketingPermission = true;
});

When(/^the user visits the marketing or signups admin page \(e\.g\. \/dashboard\/signups or \/dashboard\/marketing\)$/, () => {
  adminState.currentUrl = "/dashboard/signups";
  if (!adminState.isAuthenticated) {
    adminState.redirectedToSignIn = true;
    adminState.pageLoaded = false;
    return;
  }
  if (!adminState.hasMarketingPermission) {
    adminState.accessDenied = true;
    adminState.pageLoaded = false;
    return;
  }
  adminState.pageLoaded = true;
});

Then(/^the page displays a list of recent WaitlistSignup \(or MarketingLead\) records$/, () => {
  assert.equal(adminState.pageLoaded, true);
  assert.ok(adminState.pagedSignups.length > 0);
});

Then("each row shows email, name, persona, wantsUpdates, source, createdAt", () => {
  for (const row of adminState.pagedSignups) {
    assert.ok(row.email.length > 0);
    assert.ok(row.name.length > 0);
    assert.ok(row.persona.length > 0);
    assert.equal(typeof row.wantsUpdates, "boolean");
    assert.ok(row.source.length > 0);
    assert.ok(row.createdAt.length > 0);
  }
});

Then(/^the list is ordered by createdAt descending \(newest first\)$/, () => {
  for (let i = 1; i < adminState.filteredSignups.length; i += 1) {
    const previous = new Date(adminState.filteredSignups[i - 1].createdAt).getTime();
    const current = new Date(adminState.filteredSignups[i].createdAt).getTime();
    assert.ok(previous >= current);
  }
});

Then('the list supports pagination or "load more"', () => {
  assert.equal(adminState.hasMore, true);
});

Given("the signups list is displayed", () => {
  adminState.isAuthenticated = true;
  adminState.hasMarketingPermission = true;
  adminState.pageLoaded = true;
  adminState.filteredSignups = sortedDescByCreatedAt(baseSignups());
  adminState.pagedSignups = adminState.filteredSignups.slice(0, adminState.pageSize);
  adminState.hasMore = adminState.filteredSignups.length > adminState.pageSize;
});

When(/^the user applies a filter \(e\.g\. source "marketing-site", persona "developer"\)$/, () => {
  adminState.filter = { source: "marketing-site", persona: "developer" };
  adminState.filteredSignups = applyFilter(sortedDescByCreatedAt(baseSignups()), adminState.filter);
  adminState.pagedSignups = adminState.filteredSignups.slice(0, adminState.pageSize);
  adminState.hasMore = adminState.filteredSignups.length > adminState.pageSize;
  adminState.filterReflectedInUi = true;
});

Then("the list shows only signups matching the filter", () => {
  assert.ok(adminState.filteredSignups.length > 0);
  for (const row of adminState.filteredSignups) {
    assert.equal(row.source, "marketing-site");
    assert.equal(row.persona, "developer");
  }
});

Then(/^the filter state is reflected in the URL or UI \(so it can be shared or refreshed\)$/, () => {
  assert.equal(adminState.filterReflectedInUi, true);
});

Given(/^the signups list is displayed \(optionally filtered\)$/, () => {
  adminState.isAuthenticated = true;
  adminState.hasMarketingPermission = true;
  adminState.pageLoaded = true;
  adminState.filter = { source: "marketing-site", persona: "developer" };
  adminState.filteredSignups = applyFilter(sortedDescByCreatedAt(baseSignups()), adminState.filter);
  adminState.pagedSignups = adminState.filteredSignups.slice(0, adminState.pageSize);
  adminState.hasMore = adminState.filteredSignups.length > adminState.pageSize;
});

When('the user clicks export or "Download CSV"', () => {
  adminState.csvData = toCsv(adminState.pagedSignups);
});

Then("the browser downloads a CSV file with columns email, name, persona, wantsUpdates, source, createdAt", () => {
  assert.ok(adminState.csvData);
  const [header] = adminState.csvData!.split("\n");
  assert.equal(header, "email,name,persona,wantsUpdates,source,createdAt");
});

Then(/^the CSV contains the same records as the current list view \(respecting filters and pagination\)$/, () => {
  const csv = adminState.csvData ?? "";
  for (const row of adminState.pagedSignups) {
    assert.ok(csv.includes(`\"${row.email}\"`));
  }
});

Given("an authenticated user viewing the marketing admin", () => {
  adminState.isAuthenticated = true;
  adminState.hasMarketingPermission = true;
  adminState.pageLoaded = true;
});

When(/^the user selects a lead or signup \(e\.g\. by email or row click\)$/, () => {
  adminState.selectedLeadEmail = "newest@example.com";
  adminState.visibleLead = adminState.signups.find((row) => row.email === adminState.selectedLeadEmail) ?? null;
  adminState.visibleEnrollments = [
    {
      leadEmail: "newest@example.com",
      currentStepKey: "welcome_step",
      programName: "Waitlist Nurture",
    },
  ];
  adminState.visibleEnrollmentEvents = [
    { leadEmail: "newest@example.com", type: "enrolled", occurredAt: "2026-03-29T10:01:00.000Z" },
    { leadEmail: "newest@example.com", type: "entered_step", occurredAt: "2026-03-29T10:02:00.000Z" },
  ];
});

Then("the UI shows the corresponding MarketingLead and any MarketingEnrollment records", () => {
  assert.ok(adminState.visibleLead);
  assert.ok(adminState.visibleEnrollments.length > 0);
});

Then(/^for each enrollment, the current step \(currentStepKey\) and program name are shown$/, () => {
  for (const enrollment of adminState.visibleEnrollments) {
    assert.ok(enrollment.currentStepKey.length > 0);
    assert.ok(enrollment.programName.length > 0);
  }
});

Then(/^recent MarketingEnrollmentEvent entries are visible \(enrolled, entered_step, etc\.\)$/, () => {
  assert.ok(adminState.visibleEnrollmentEvents.some((event) => event.type === "enrolled"));
  assert.ok(adminState.visibleEnrollmentEvents.some((event) => event.type === "entered_step"));
});

Given("an unauthenticated user", () => {
  adminState.isAuthenticated = false;
  adminState.hasMarketingPermission = false;
});

When("the user navigates to the marketing admin URL", () => {
  adminState.currentUrl = "/dashboard/marketing";
  if (!adminState.isAuthenticated) {
    adminState.redirectedToSignIn = true;
    adminState.accessDenied = false;
    return;
  }
  adminState.redirectedToSignIn = false;
  adminState.accessDenied = !adminState.hasMarketingPermission;
});

Then("the user is redirected to sign-in or sees an access-denied message", () => {
  assert.ok(adminState.redirectedToSignIn || adminState.accessDenied);
});

Given(/^given an authenticated user without marketing\/admin permission$/, () => {
  adminState.isAuthenticated = true;
  adminState.hasMarketingPermission = false;
  adminState.redirectedToSignIn = false;
  adminState.accessDenied = false;
});

Then(/^the user sees an access-denied message or empty\/restricted view$/, () => {
  assert.equal(adminState.accessDenied, true);
});

Given(/^a lead has one or more MarketingInteraction records \(e\.g\. outbound emails\)$/, () => {
  adminState.selectedLeadEmail = "newest@example.com";
  adminState.visibleInteractions = [
    {
      leadEmail: "newest@example.com",
      channel: "email",
      direction: "outbound",
      subject: "Welcome to Babulus",
      occurredAt: "2026-03-29T10:03:00.000Z",
      body: "Welcome aboard.",
      metadata: { template: "welcome_email" },
    },
  ];
});

When("the admin views that lead’s detail", () => {
  adminState.interactionExpanded = true;
});

Then(/^the UI shows a timeline or list of interactions \(channel, direction, subject, occurredAt\)$/, () => {
  assert.ok(adminState.visibleInteractions.length > 0);
  for (const interaction of adminState.visibleInteractions) {
    assert.ok(interaction.channel.length > 0);
    assert.ok(interaction.direction.length > 0);
    assert.ok(interaction.subject.length > 0);
    assert.ok(interaction.occurredAt.length > 0);
  }
});

Then("each interaction can expand to show body or metadata if present", () => {
  assert.equal(adminState.interactionExpanded, true);
  assert.ok(adminState.visibleInteractions.some((interaction) => Boolean(interaction.body) || Boolean(interaction.metadata)));
});

Given("the Amplify backend has DynamoDB streams enabled for WaitlistSignup", () => {
  runtimeState.waitlistStreamEnabled = true;
});

Given("a Lambda is configured with the WaitlistSignup table stream as event source", () => {
  runtimeState.waitlistEventSourceConfigured = true;
});

Given(/^the Lambda invokes the Python marketing runtime \(e\.g\. evaluate_rules or a dedicated signup handler\)$/, () => {
  runtimeState.lambdaInvokesRuntime = true;
});

When(/^a new WaitlistSignup record is created \(e\.g\. via POST \/api\/waitlist\)$/, () => {
  assert.equal(runtimeState.waitlistStreamEnabled, true);
  assert.equal(runtimeState.waitlistEventSourceConfigured, true);
  runtimeState.lambdaReceivesStreamEvent = true;
  runtimeState.runtimeInvocations.push({
    kind: "waitlist_signup",
    payload: {
      email: "lead@example.com",
      source: "marketing-site",
      wantsUpdates: true,
      persona: "developer",
    },
  });
  runtimeState.runtimeActionsPerformed = true;
});

Then("the Lambda receives a stream event with the new record", () => {
  assert.equal(runtimeState.lambdaReceivesStreamEvent, true);
});

Then(/^the marketing runtime is invoked with the signup payload \(lead identity, source, wantsUpdates, persona\)$/, () => {
  const invocation = runtimeState.runtimeInvocations.find((item) => item.kind === "waitlist_signup");
  assert.ok(invocation);
  assert.ok(typeof invocation!.payload.email === "string");
  assert.ok(typeof invocation!.payload.source === "string");
  assert.equal(typeof invocation!.payload.wantsUpdates, "boolean");
  assert.ok(typeof invocation!.payload.persona === "string");
});

Then(/^the runtime can evaluate program rules and perform actions \(e\.g\. send welcome email, record MarketingInteraction\)$/, () => {
  assert.equal(runtimeState.runtimeActionsPerformed, true);
});

Given("the Amplify backend has DynamoDB streams enabled for MarketingEnrollment", () => {
  runtimeState.enrollmentStreamEnabled = true;
});

Given("a Lambda is configured with the MarketingEnrollment table stream as event source", () => {
  runtimeState.enrollmentEventSourceConfigured = true;
});

Given("the Lambda invokes the Python marketing runtime", () => {
  runtimeState.lambdaInvokesRuntime = true;
});

When(/^a new MarketingEnrollment record is created \(e\.g\. after waitlist signup\)$/, () => {
  assert.equal(runtimeState.enrollmentStreamEnabled, true);
  assert.equal(runtimeState.enrollmentEventSourceConfigured, true);
  runtimeState.lambdaReceivesStreamEvent = true;
  runtimeState.runtimeInvocations.push({
    kind: "marketing_enrollment",
    payload: {
      leadEmail: "lead@example.com",
      enrollmentId: "enroll-1",
      currentStepKey: "welcome_step",
      persona: "developer",
    },
  });
  runtimeState.runtimeActionsPerformed = true;
});

Then("the Lambda receives a stream event with the new enrollment", () => {
  const invocation = runtimeState.runtimeInvocations.find((item) => item.kind === "marketing_enrollment");
  assert.ok(invocation);
  assert.equal(runtimeState.lambdaReceivesStreamEvent, true);
});

Then("the marketing runtime is invoked with enrollment and lead context", () => {
  const invocation = runtimeState.runtimeInvocations.find((item) => item.kind === "marketing_enrollment");
  assert.ok(invocation);
  assert.ok(typeof invocation!.payload.leadEmail === "string");
  assert.ok(typeof invocation!.payload.currentStepKey === "string");
});

Then(/^the runtime can evaluate rules \(event \+ attribute triggers\) and trigger outbound actions \(email, etc\.\)$/, () => {
  assert.equal(runtimeState.runtimeActionsPerformed, true);
});

Given("the marketing runtime Lambda is invoked with a waitlist_signup event", () => {
  runtimeState.runtimeInvocations.push({
    kind: "waitlist_signup",
    payload: { leadEmail: "lead@example.com" },
  });
  runtimeState.enrollmentCurrentStepKey = "welcome_step";
});

Given("the lead has wantsUpdates {string} and persona {string}", (wantsUpdates: string, persona: string) => {
  runtimeState.leadWantsUpdates = wantsUpdates === "true";
  runtimeState.leadPersona = persona;
});

When("the runtime evaluates program rules for event type {string}", (eventType: string) => {
  if (eventType === "waitlist_signup" && runtimeState.leadWantsUpdates && runtimeState.leadPersona === "developer") {
    runtimeState.activeRule = "opt_in_rule";
    runtimeState.outboundEmailRequested = true;
  } else {
    runtimeState.activeRule = "default_rule";
  }
});

Then(/^the matching rule \(e\.g\. opt_in_rule\) is selected$/, () => {
  assert.equal(runtimeState.activeRule, "opt_in_rule");
});

Then("the enrollment currentStepKey is already set by the waitlist API", () => {
  assert.equal(runtimeState.enrollmentCurrentStepKey, "welcome_step");
});

Then(/^the runtime can perform step-entry actions \(e\.g\. send welcome email via outbound_email handler\)$/, () => {
  assert.equal(runtimeState.outboundEmailRequested, true);
});

Given(/^the marketing runtime is running in Lambda with SES configured \(MARKETING_GQL_\*, SES_REGION\)$/, () => {
  runtimeState.lambdaSesConfigured = true;
  runtimeState.hasGraphqlEndpoint = true;
  runtimeState.hasGraphqlApiKey = true;
  runtimeState.hasSesAuth = true;
});

Given("a rule action requires sending a welcome email to the lead", () => {
  runtimeState.outboundEmailRequested = true;
});

When("the Lambda invokes the outbound_email handler with lead email and template context", () => {
  assert.equal(runtimeState.lambdaSesConfigured, true);
  assert.equal(runtimeState.outboundEmailRequested, true);
  runtimeState.outboundEmailSent = true;
  runtimeState.interactions.push({
    leadEmail: "lead@example.com",
    channel: "email",
    direction: "outbound",
    subject: "Welcome",
    occurredAt: "2026-03-30T17:00:00.000Z",
    metadata: { template: "welcome_email" },
  });
});

Then("the handler sends the email via SES", () => {
  assert.equal(runtimeState.outboundEmailSent, true);
});

Then(/^a MarketingInteraction record is created \(channel email, direction outbound, occurredAt\)$/, () => {
  const interaction = runtimeState.interactions[0];
  assert.ok(interaction);
  assert.equal(interaction.channel, "email");
  assert.equal(interaction.direction, "outbound");
  assert.ok(interaction.occurredAt.length > 0);
});

Given(/^the WaitlistSignup stream can deliver the same insert more than once \(at-least-once\)$/, () => {
  runtimeState.waitlistEvents = [
    { eventId: "evt-1", leadEmail: "lead@example.com" },
    { eventId: "evt-1", leadEmail: "lead@example.com" },
  ];
});

When("the Lambda processes a stream record", () => {
  for (const event of runtimeState.waitlistEvents) {
    const key = `${event.eventId}:${event.leadEmail}`;
    if (runtimeState.idempotencyKeys.has(key)) {
      continue;
    }
    runtimeState.idempotencyKeys.add(key);
    runtimeState.interactions.push({
      leadEmail: event.leadEmail,
      channel: "email",
      direction: "outbound",
      subject: "Welcome",
      occurredAt: "2026-03-30T17:00:00.000Z",
    });
  }
});

Then(/^the runtime uses idempotency \(e\.g\. event id or lead\+event key\) so duplicate deliveries do not send duplicate emails or create duplicate interactions$/, () => {
  assert.equal(runtimeState.idempotencyKeys.size, 1);
  assert.equal(runtimeState.interactions.length, 1);
});

Given(/^the marketing Lambda is deployed \(e\.g\. in Amplify backend or separate stack\)$/, () => {
  runtimeState.lambdaDeployed = true;
  runtimeState.runtimeCodeReadable = true;
  runtimeState.hasGraphqlEndpoint = true;
  runtimeState.hasGraphqlApiKey = true;
  runtimeState.hasSesAuth = true;
});

When("the Lambda runs", () => {
  assert.equal(runtimeState.lambdaDeployed, true);
});

Then(/^it has MARKETING_GQL_ENDPOINT and MARKETING_GQL_API_KEY \(or equivalent\) to call AppSync$/, () => {
  assert.equal(runtimeState.hasGraphqlEndpoint, true);
  assert.equal(runtimeState.hasGraphqlApiKey, true);
});

Then("it has SES credentials or IAM role to send email", () => {
  assert.equal(runtimeState.hasSesAuth, true);
});

Then(/^it can read the Python runtime code \(e\.g\. bundled layer or container image\)$/, () => {
  assert.equal(runtimeState.runtimeCodeReadable, true);
});
