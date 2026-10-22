import { elapsedMs, sanitizeCampaign, sanitizePagePath, sanitizeSource } from "../waitlist-intake";

describe("sanitizeCampaign", () => {
  it("keeps valid utm values", () => {
    const params = new URLSearchParams("utm_source=news letter&utm_medium=email&utm_campaign=launch-2.0_a");
    expect(sanitizeCampaign(params)).toEqual({
      utm_source: "news letter",
      utm_medium: "email",
      utm_campaign: "launch-2.0_a",
    });
  });

  it("drops only the invalid keys", () => {
    const params = new URLSearchParams("utm_source=a%2Fb&utm_medium=email&utm_campaign=x:y");
    expect(sanitizeCampaign(params)).toEqual({ utm_medium: "email" });
  });

  it("drops values over 120 characters and trims", () => {
    const params = new URLSearchParams({ utm_source: "a".repeat(121), utm_medium: "  ok  " });
    expect(sanitizeCampaign(params)).toEqual({ utm_medium: "ok" });
  });

  it("ignores other params and returns undefined when nothing remains", () => {
    expect(sanitizeCampaign(new URLSearchParams("ref=abc&utm_source=a+b%2Bc"))).toBeUndefined();
    expect(sanitizeCampaign(new URLSearchParams("utm_source=%20"))).toBeUndefined();
  });
});

describe("sanitizePagePath", () => {
  it("accepts simple paths", () => {
    expect(sanitizePagePath("/")).toBe("/");
    expect(sanitizePagePath("/waitlist")).toBe("/waitlist");
    expect(sanitizePagePath("/a/b_c-d")).toBe("/a/b_c-d");
  });

  it("omits paths with dots, encoding or other characters", () => {
    expect(sanitizePagePath("/index.html")).toBeUndefined();
    expect(sanitizePagePath("/a%20b")).toBeUndefined();
    expect(sanitizePagePath("/café")).toBeUndefined();
  });

  it("omits paths over 200 characters", () => {
    expect(sanitizePagePath(`/${"a".repeat(199)}`)).toBe(`/${"a".repeat(199)}`);
    expect(sanitizePagePath(`/${"a".repeat(200)}`)).toBeUndefined();
  });
});

describe("sanitizeSource", () => {
  it("falls back when the slug is invalid", () => {
    expect(sanitizeSource("waitlist-page", "marketing-site")).toBe("waitlist-page");
    expect(sanitizeSource("Bad Source", "marketing-site")).toBe("marketing-site");
    expect(sanitizeSource("a".repeat(41), "marketing-site")).toBe("marketing-site");
  });
});

describe("elapsedMs", () => {
  it("rounds to whole milliseconds", () => {
    expect(elapsedMs(1000.2, 4500.7)).toBe(3501);
  });

  it("caps at 24 hours", () => {
    expect(elapsedMs(0, 90_000_000)).toBe(86_400_000);
  });

  it("omits negative or non-finite values", () => {
    expect(elapsedMs(5000, 1000)).toBeUndefined();
    expect(elapsedMs(Number.NaN, 1000)).toBeUndefined();
  });
});
