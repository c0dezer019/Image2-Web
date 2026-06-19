import { describe, expect, it, beforeEach } from "vitest";
import { getConsent, setConsent, CONSENT_KEY } from "../lib/cookie-consent";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  });
}

describe("getConsent", () => {
  beforeEach(() => {
    clearCookies();
  });

  it("returns null when no consent recorded", () => {
    expect(getConsent()).toBeNull();
  });

  it("returns accepted after setConsent accepted", () => {
    setConsent("accepted");
    expect(getConsent()).toBe("accepted");
  });

  it("returns rejected after setConsent rejected", () => {
    setConsent("rejected");
    expect(getConsent()).toBe("rejected");
  });

  it("uses CONSENT_KEY as the cookie name", () => {
    setConsent("accepted");
    expect(document.cookie).toContain(`${CONSENT_KEY}=accepted`);
  });

  it("returns null for unrecognized stored value", () => {
    document.cookie = `${CONSENT_KEY}=yes; path=/`;
    expect(getConsent()).toBeNull();
  });
});
