import { describe, expect, it, beforeEach } from "vitest";
import {
  getConsent,
  setConsent,
  CONSENT_KEY,
  getCrashConsent,
  setCrashConsent,
  CRASH_CONSENT_KEY,
} from "../lib/cookie-consent";

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

  it("returns null for unrecognized stored value", () => {
    localStorage.setItem(CONSENT_KEY, "yes");
    expect(getConsent()).toBeNull();
  });
});

describe("getCrashConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to accepted when no consent recorded (opt-out)", () => {
    expect(getCrashConsent()).toBe("accepted");
  });

  it("returns accepted after setCrashConsent accepted", () => {
    setCrashConsent("accepted");
    expect(getCrashConsent()).toBe("accepted");
  });

  it("returns rejected after setCrashConsent rejected", () => {
    setCrashConsent("rejected");
    expect(getCrashConsent()).toBe("rejected");
  });

  it("uses CRASH_CONSENT_KEY as storage key", () => {
    setCrashConsent("rejected");
    expect(localStorage.getItem(CRASH_CONSENT_KEY)).toBe("rejected");
  });

  it("defaults to accepted for unrecognized stored value", () => {
    localStorage.setItem(CRASH_CONSENT_KEY, "yes");
    expect(getCrashConsent()).toBe("accepted");
  });
});
