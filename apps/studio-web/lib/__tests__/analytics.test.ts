import { contactUrl, ctaClickParameters, linkUrlOf, signUpParameters, visibleLabelOf } from "../analytics";

const BASE = "https://babulus.anth.us/some/page?email=someone%40example.com#top";

describe("linkUrlOf", () => {
  it("keeps only host and path", () => {
    expect(linkUrlOf("https://anth.us/engage/?solution=Babulus&cta=footer#form", BASE)).toBe("anth.us/engage/");
    expect(linkUrlOf("https://user:pw@example.com:8443/a/b?q=1", BASE)).toBe("example.com/a/b");
  });

  it("resolves relative links against the page and drops the page's own query and fragment", () => {
    expect(linkUrlOf("/waitlist", BASE)).toBe("babulus.anth.us/waitlist");
    expect(linkUrlOf("/waitlist?email=someone%40example.com#x", BASE)).toBe("babulus.anth.us/waitlist");
  });

  it("rejects non-web links", () => {
    expect(linkUrlOf("mailto:someone@example.com", BASE)).toBeNull();
    expect(linkUrlOf("javascript:void(0)", BASE)).toBeNull();
  });
});

describe("visibleLabelOf", () => {
  it("collapses whitespace, drops a trailing arrow and caps length", () => {
    expect(visibleLabelOf("  Join\n   waitlist  → ")).toBe("Join waitlist");
    expect(visibleLabelOf("x".repeat(150))).toHaveLength(100);
  });
});

describe("ctaClickParameters", () => {
  it("reports a marked CTA with its location and host+path only", () => {
    expect(
      ctaClickParameters({ href: "https://babulus.anth.us/waitlist?ref=x", text: "Join waitlist", ctaLocation: "header" }, BASE),
    ).toEqual({ cta_text: "Join waitlist", cta_location: "header", link_url: "babulus.anth.us/waitlist", transport_type: "beacon" });
  });

  it("reports anth.us/engage links with the cta query value as the location", () => {
    expect(ctaClickParameters({ href: contactUrl("footer"), text: "Contact us", ctaLocation: null }, BASE)).toEqual({
      cta_text: "Contact us",
      cta_location: "footer",
      link_url: "anth.us/engage/",
      transport_type: "beacon",
    });
  });

  it("ignores unmarked links that are not engage links", () => {
    expect(ctaClickParameters({ href: "/docs", text: "Docs", ctaLocation: null }, BASE)).toBeNull();
    expect(ctaClickParameters({ href: "https://anth.us/about/", text: "About", ctaLocation: null }, BASE)).toBeNull();
  });

  it("falls back to 'page' for an unsafe location", () => {
    const parameters = ctaClickParameters({ href: "/waitlist", text: "Join", ctaLocation: "someone@example.com" }, BASE);
    expect(parameters?.cta_location).toBe("page");
  });

  it("never carries a query string, fragment or scheme", () => {
    const parameters = ctaClickParameters(
      { href: "https://anth.us/engage/?solution=Babulus&cta=hero&email=someone%40example.com#x", text: "Talk", ctaLocation: null },
      BASE,
    );
    expect(JSON.stringify(parameters)).not.toMatch(/[?#@]|https?:|email/);
  });
});

describe("contactUrl", () => {
  it("points at anth.us/engage with the solution and location", () => {
    expect(contactUrl("home-closing")).toBe("https://anth.us/engage/?solution=Babulus&cta=home-closing");
  });

  it("refuses an unsafe location slug", () => {
    expect(() => contactUrl("Home Closing")).toThrow();
  });
});

describe("signUpParameters", () => {
  it("fires only for 202", () => {
    expect(signUpParameters(202, "waitlist-page")).toEqual({
      method: "waitlist",
      form_id: "babulus-waitlist-v1",
      lead_source: "waitlist-page",
    });
    for (const status of [200, 201, 204, 400, 409, 429, 500, 503]) {
      expect(signUpParameters(status, "waitlist-page")).toBeNull();
    }
  });
});
