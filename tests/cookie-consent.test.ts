import { describe, expect, it, beforeEach } from "vitest";
import { getConsent, setConsent, CONSENT_KEY } from "../lib/cookie-consent";

describe("getConsent", () => {
  beforeEach(() => {
    localStorage.clear();
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

  it("uses CONSENT_KEY as storage key", () => {
    setConsent("accepted");
    expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
  });
});
