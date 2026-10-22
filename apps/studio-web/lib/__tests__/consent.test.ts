import { CONSENT_DENIED_BY_DEFAULT_REGIONS, GA_MEASUREMENT_ID } from "../analytics-config";
import { consentBootstrapScript, consentDefaults, consentUpdate } from "../consent";

const EEA_GB_CH = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT",
  "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

type Command = unknown[];

/** Runs the bootstrap script against a fake window and localStorage; returns the gtag commands it queued. */
function runBootstrap(stored: string | null, now = Date.now()) {
  const storage = new Map<string, string>();
  if (stored !== null) storage.set("babulus-consent", stored);
  const fakeWindow: Record<string, any> = {};
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  };
  const fakeDate = class extends Date {
    static now() {
      return now;
    }
  };
  const run = new Function(
    "window",
    "localStorage",
    "Date",
    consentBootstrapScript(),
  );
  run(fakeWindow, localStorage, fakeDate);
  const commands = (fakeWindow.dataLayer as IArguments[]).map((args) => Array.from(args) as Command);
  return { commands, consent: fakeWindow.babulusConsent, storage };
}

describe("consent region defaults", () => {
  it("denies everything in the EEA, GB and CH", () => {
    expect([...CONSENT_DENIED_BY_DEFAULT_REGIONS].sort()).toEqual([...EEA_GB_CH].sort());
    expect(consentDefaults()[0]).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
      region: [...CONSENT_DENIED_BY_DEFAULT_REGIONS],
    });
  });

  it("grants analytics only, everywhere else", () => {
    expect(consentDefaults()[1]).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
      wait_for_update: 500,
    });
  });

  it("updates all four signals together", () => {
    expect(consentUpdate(true)).toEqual({
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });
    expect(Object.values(consentUpdate(false))).toEqual(["denied", "denied", "denied", "denied"]);
  });
});

describe("consentBootstrapScript", () => {
  it("sets both consent defaults before config", () => {
    const { commands } = runBootstrap(null);
    const names = commands.map((command) => command.slice(0, 2).join(" "));
    expect(names).toEqual([
      "consent default",
      "consent default",
      "set ads_data_redaction",
      "set url_passthrough",
      expect.stringMatching(/^js /),
      `config ${GA_MEASUREMENT_ID}`,
    ]);
    expect(commands[0][2]).toEqual(consentDefaults()[0]);
    expect(commands[1][2]).toEqual(consentDefaults()[1]);
  });

  it("re-applies a stored, current choice before config", () => {
    const now = 1_800_000_000_000;
    const stored = JSON.stringify({ version: 1, savedAt: now - 1000, granted: false });
    const { commands } = runBootstrap(stored, now);
    const updateIndex = commands.findIndex((command) => command[1] === "update");
    const configIndex = commands.findIndex((command) => command[0] === "config");
    expect(updateIndex).toBeGreaterThan(1);
    expect(updateIndex).toBeLessThan(configIndex);
    expect(commands[updateIndex][2]).toEqual(consentUpdate(false));
  });

  it("ignores an expired or old-version choice", () => {
    const now = 1_800_000_000_000;
    const expired = JSON.stringify({ version: 1, savedAt: now - 184 * 86_400_000, granted: true });
    const oldVersion = JSON.stringify({ version: 0, savedAt: now - 1000, granted: true });
    for (const stored of [expired, oldVersion, "not json"]) {
      const { commands, consent } = runBootstrap(stored, now);
      expect(commands.some((command) => command[1] === "update")).toBe(false);
      expect(consent.read()).toBeNull();
    }
  });

  it("saves a choice that read() then returns", () => {
    const { consent, storage } = runBootstrap(null);
    consent.save(true);
    expect(JSON.parse(storage.get("babulus-consent") as string)).toMatchObject({ version: 1, granted: true });
    expect(consent.read()).toMatchObject({ granted: true });
  });

  it("escapes markup so the script cannot be closed early", () => {
    expect(consentBootstrapScript("</script><b>")).not.toContain("</script>");
  });
});
